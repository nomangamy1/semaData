from flask import Blueprint, request, jsonify, url_for
from werkzeug.security import check_password_hash
from utils.tokens import generate_verification_token
from utils.mailer import send_approval_email as send_mail
from models import User, Domain, DomainOwner
from models.JobApplication import JobApplication
from models.Job import Job
from flask_jwt_extended import create_access_token
import logging

logger = logging.getLogger(__name__)
login_bp = Blueprint("login", __name__)

@login_bp.route('/login', methods=['POST'])
def login():
    try:
        data       = request.get_json()
        email      = data.get('email', '').strip()
        password   = data.get('password', '')
        ref_number = data.get('reference_number', '').strip()
        req_role   = data.get('role', '').strip().lower()

        if not email or not password:
            return jsonify({"error": "Email and password are required"}), 400

        def _reject_invalid_role(msg="Invalid account type or credentials provided"):
            return jsonify({"error": msg}), 401

        print(f"DEBUG AUTH TRACE -> Email: {email} | Parsed Role: '{req_role}' | Ref: '{ref_number}'")

        # ── 1. GLOBAL PRODUCTION ADMIN INTERCEPT ─────────────────────
        admin = User.query.filter_by(email=email).first()
        if admin and admin.is_admin_user():
            if not check_password_hash(admin.password_hash, password):
                return jsonify({"error": "Invalid admin credentials"}), 401
           
            token = create_access_token(
                identity=str(admin.id),
                additional_claims={"role": "admin", "is_admin": True}
            )
            return jsonify({
                "token": token,
                "role": "admin",
                "userId": admin.id,
                "email": admin.email,
            }), 200

        # ── 2. DOMAIN OWNER ──────────────────────────────────────────
        if req_role in {'domainowner', 'domain_owner'} or not req_role:
            owner = DomainOwner.query.filter_by(email=email).first()
            if owner:
                if req_role and req_role not in {'domainowner', 'domain_owner'}:
                    return _reject_invalid_role("This account is registered as a domain owner")
                if not check_password_hash(owner.password_hash, password):
                    return jsonify({"error": "Invalid email or password"}), 401
                if not owner.is_verified:
                    return jsonify({"error": "Email not verified. Please check your inbox."}), 403
                token = create_access_token(
                    identity=str(owner.id),
                    additional_claims={"role": "domain_owner"}
                )
                return jsonify({
                    "token": token,
                    "role": "domain_owner",
                    "userId": owner.id,
                    "email": owner.email,
                    "username": getattr(owner, 'username', ''),
                    "fullName": f"{owner.first_name} {owner.last_name or ''}".strip(),
                }), 200

        # ── 3. COMMUNITY ─────────────────────────────────────────────
        if req_role in {'community'} or (not req_role and not ref_number):
            community = User.query.filter_by(email=email, user_type='community').first()
            if community:
                if req_role and req_role != 'community':
                    return _reject_invalid_role("This account is registered as a community member")
                if not check_password_hash(community.password_hash, password):
                    return jsonify({"error": "Invalid email or password"}), 401
                if not community.is_verified:
                    try:
                        verify_token = generate_verification_token(community.email)
                        confirm_url = url_for('register.email_verification', token=verify_token, _external=True)
                        send_mail(community.email, "Verify your semaData community account",
                            f"<p>Please verify: <a href='{confirm_url}'>{confirm_url}</a></p>")
                    except Exception:
                        pass
                    return jsonify({"error": "Email not verified. A new link has been sent."}), 403
                token = create_access_token(
                    identity=str(community.id),
                    additional_claims={"role": "community"}
                )
                return jsonify({
                    "token": token,
                    "role": "community",
                    "userId": community.id,
                    "email": community.email,
                    "fullName": f"{community.first_name} {community.second_name or ''}".strip(),
                    "area_of_interest": getattr(community, 'area_of_interest', ''),
                }), 200

        # ── 4. COLLECTOR ('user') ─────────────────────────────────────
        if req_role in {'user', 'collector'} or (not req_role and ref_number):
            if not ref_number:
                return jsonify({
                    "error": "No account found. Collectors must provide their reference number."
                }), 401

            collector = User.query.filter_by(
                email=email,
                reference_number=ref_number
            ).first()
            if not collector:
                return jsonify({"error": "Invalid credentials or reference number"}), 401
            if collector.user_type not in {'User', 'collector'} and collector.role not in {'user', 'collector'}:
                return _reject_invalid_role("This account is not a collector profile")
            if not check_password_hash(collector.password_hash, password):
                return jsonify({"error": "Invalid credentials"}), 401
            if not collector.is_verified:
                try:
                    verify_token = generate_verification_token(collector.email)
                    confirm_url = url_for('register.email_verification', token=verify_token, _external=True)
                    send_mail(collector.email, "Please verify your account",
                        f"<p>Please verify: <a href='{confirm_url}'>{confirm_url}</a></p>")
                except Exception:
                    pass
                return jsonify({"error": "Email not verified. A new link has been sent."}), 403

            application = JobApplication.query.filter_by(
                reference_number_assigned=ref_number,
                status='approved'
            ).first()
            domain_name = collector.domain_name
            domain_id = None

            if application:
                job = Job.query.get(application.job_id)
                if job:
                    domain = Domain.query.get(job.domain_id)
                    if domain:
                        domain_name = domain.domain_name
                        domain_id = domain.id

            token = create_access_token(
                identity=str(collector.id),
                additional_claims={"role": "user"}
            )
            return jsonify({
                "token": token,
                "role": "user",
                "userId": collector.id,
                "email": collector.email,
                "domain": domain_name,
                "domainId": domain_id,
                "referenceNumber": collector.reference_number,
                "fullName": f"{collector.first_name} {collector.second_name or ''}".strip(),
            }), 200

        # Fallback if no explicit role scopes matched
        return jsonify({"error": "Invalid account type or credentials provided"}), 401

    except Exception as e:
        logger.exception("Login failed for email: %s", email)
        return jsonify({"error": "An unexpected error occurred. Please try again."}), 500
