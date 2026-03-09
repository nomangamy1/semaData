from flask import Blueprint, request, jsonify, url_for
from werkzeug.security import check_password_hash
from utils.tokens import generate_verification_token
from utils.email import send_email
from models import User, Domain, DomainOwner
from flask_jwt_extended import create_access_token
import logging

logger = logging.getLogger(__name__)
login_bp = Blueprint("login", __name__)


@login_bp.route('/login', methods=['POST'])
def login():
    """
    Four login types, checked in this exact order:

    1. ADMIN        → role='admin' in Users table,  email + password
    2. DOMAIN OWNER → DomainOwner table,             email + password
    3. COMMUNITY    → user_type='community',         email + password only
                      ↑ checked BEFORE collector so they never hit the
                        "please provide a reference number" error
    4. COLLECTOR    → user_type='User',              email + password + reference_number
    """
    try:
        data       = request.get_json()
        email      = data.get('email', '').strip()
        password   = data.get('password', '')
        ref_number = data.get('reference_number', '').strip()

        if not email or not password:
            return jsonify({"error": "Email and password are required"}), 400

        # ── 1. ADMIN ─────────────────────────────────────────────────
        admin = User.query.filter_by(email=email, role='admin').first()
        if admin:
            if not check_password_hash(admin.password_hash, password):
                return jsonify({"error": "Invalid admin credentials"}), 401

            token = create_access_token(
                identity=str(admin.id),
                additional_claims={"role": "admin"}
            )
            return jsonify({
                "token":  token,
                "role":   "admin",
                "userId": admin.id,
                "email":  admin.email,
            }), 200

        # ── 2. DOMAIN OWNER ──────────────────────────────────────────
        owner = DomainOwner.query.filter_by(email=email).first()
        if owner:
            if not check_password_hash(owner.password_hash, password):
                return jsonify({"error": "Invalid email or password"}), 401

            if not owner.is_verified:
                return jsonify({
                    "error": "Email not verified. Please check your inbox."
                }), 403

            token = create_access_token(
                identity=str(owner.id),
                additional_claims={"role": "domain_owner"}
            )
            return jsonify({
                "token":    token,
                "role":     "domain_owner",
                "userId":   owner.id,
                "email":    owner.email,
                "username": getattr(owner, 'username', ''),
                "fullName": f"{owner.first_name} {owner.last_name or ''}".strip(),
            }), 200

        # ── 3. COMMUNITY MEMBER ──────────────────────────────────────
        # Must come BEFORE the collector branch — community members have
        # no reference_number, so they'd otherwise get a confusing error.
        community = User.query.filter_by(email=email, user_type='community').first()
        if community:
            if not check_password_hash(community.password_hash, password):
                return jsonify({"error": "Invalid email or password"}), 401

            if not community.is_verified:
                # Resend verification link
                try:
                    verify_token = generate_verification_token(community.email)
                    confirm_url  = url_for('register.email_verification',
                                          token=verify_token, _external=True)
                    send_email(
                        community.email,
                        "Verify your semaData community account",
                        f"<p>Please verify your email: "
                        f"<a href='{confirm_url}'>{confirm_url}</a></p>"
                    )
                except Exception:
                    pass  # Don't crash login if email fails
                return jsonify({
                    "error": "Email not verified. A new verification link has been sent."
                }), 403

            token = create_access_token(
                identity=str(community.id),
                additional_claims={"role": "community"}
            )
            return jsonify({
                "token":           token,
                "role":            "community",
                "userId":          community.id,
                "email":           community.email,
                "fullName":        f"{community.first_name} {community.second_name or ''}".strip(),
                "area_of_interest": getattr(community, 'area_of_interest', ''),
            }), 200

        # ── 4. COLLECTOR ─────────────────────────────────────────────
        # At this point we know: not admin, not owner, not community.
        # Collectors MUST provide a reference_number — it is their
        # domain invite code and the only way to identify which domain
        # they belong to.
        if not ref_number:
            return jsonify({
                "error": "No account found. "
                         "Collectors must provide their domain reference number."
            }), 401

        domain = Domain.query.filter_by(reference_number=ref_number).first()
        if not domain:
            return jsonify({"error": "Invalid reference number"}), 401

        collector = User.query.filter_by(
            email=email,
            reference_number=ref_number
        ).first()
        if not collector:
            return jsonify({"error": "Invalid credentials or reference number"}), 401

        if not check_password_hash(collector.password_hash, password):
            return jsonify({"error": "Invalid credentials"}), 401

        if not collector.is_verified:
            try:
                verify_token = generate_verification_token(collector.email)
                confirm_url  = url_for('register.email_verification',
                                      token=verify_token, _external=True)
                send_email(
                    collector.email,
                    "Please verify your account",
                    f"<p>Please verify your email: "
                    f"<a href='{confirm_url}'>{confirm_url}</a></p>"
                )
            except Exception:
                pass
            return jsonify({
                "error": "Email not verified. A new verification link has been sent."
            }), 403

        token = create_access_token(
            identity=str(collector.id),
            additional_claims={"role": "user"}
        )
        return jsonify({
            "token":    token,
            "role":     "user",
            "userId":   collector.id,
            "email":    collector.email,
            "domain":   domain.domain_name,
            "domainId": domain.id,
            "fullName": f"{collector.first_name} {collector.second_name or ''}".strip(),
        }), 200

    except Exception as e:
        logger.exception("Login failed for email: %s", email)
        return jsonify({
            "error": "An unexpected error occurred. Please try again later."
        }), 500