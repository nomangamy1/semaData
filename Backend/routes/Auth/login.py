from flask import Blueprint, request, jsonify, url_for
from werkzeug.security import check_password_hash
from utils.tokens import generate_verification_token
from utils.email import send_email
from models import User, Domain, DomainOwner
from flask_login import login_user
from flask_jwt_extended import create_access_token

login_bp = Blueprint("login", __name__)


@login_bp.route('/login', methods=['POST'])
def login():
    """
    THREE types of users login here:

    1. ADMIN        → email + password only
    2. DOMAIN OWNER → email + password only
                      (reference_number is generated AFTER payment, not needed for login)
    3. COLLECTOR    → email + password + reference_number
                      (reference_number is their INVITE CODE to join a domain)
    """
    try:
        data = request.get_json()
        email = data.get('email', '').strip()
        password = data.get('password', '')
        reference_number = data.get('reference_number', '').strip()

        if not email or not password:
            return jsonify({"error": "Email and password are required"}), 400

        # ─────────────────────────────────────────────────────
        # STEP 1: ADMIN
        # ─────────────────────────────────────────────────────
        admin_user = User.query.filter_by(email=email, role='admin').first()
        if admin_user:
            if not check_password_hash(admin_user.password_hash, password):
                return jsonify({"error": "Invalid admin credentials"}), 401

            token = create_access_token(
                identity=str(admin_user.id),
                additional_claims={"role": "admin"}
            )
            return jsonify({
                "token": token,
                "role": "admin",
                "ownerId": admin_user.id,
                "email": admin_user.email,
            }), 200

        # ─────────────────────────────────────────────────────
        # STEP 2: DOMAIN OWNER
        # They log in with email + password ONLY.
        # Their reference_number is a domain token generated
        # after payment — it is NOT a login credential.
        # ─────────────────────────────────────────────────────
        domain_owner = DomainOwner.query.filter_by(email=email).first()
        if domain_owner:
            if not check_password_hash(domain_owner.password_hash, password):
                return jsonify({"error": "Invalid email or password"}), 401

            if not domain_owner.is_verified:
                return jsonify({
                    "error": "Please verify your email before logging in. Check your inbox."
                }), 403

            login_user(domain_owner)

            token = create_access_token(
                identity=str(domain_owner.id),     # ✅ string — avoids int/str mismatch in /my-domains
                additional_claims={"role": "domain_owner"}
            )
            return jsonify({
                "token": token,                     # ✅ 'token' key — matches frontend
                "role": "domain_owner",
                "ownerId": domain_owner.id,         # ✅ 'ownerId' key — matches frontend
                "email": domain_owner.email,
                "username": getattr(domain_owner, 'username', ''),
                "message": "Login successful"
            }), 200

        # ─────────────────────────────────────────────────────
        # STEP 3: COLLECTOR (User)
        # They MUST provide reference_number — it's their
        # invite code that links them to a domain.
        # Without it we can't know which domain they belong to.
        # ─────────────────────────────────────────────────────
        if not reference_number:
            # No reference_number AND no DomainOwner found = wrong account or missing field
            return jsonify({
                "error": "No account found. If you are a collector, please include your reference number."
            }), 401

        domain = Domain.query.filter_by(reference_number=reference_number).first()
        if not domain:
            return jsonify({"error": "Invalid reference number"}), 401

        user = User.query.filter_by(
            email=email,
            reference_number=reference_number
        ).first()

        if not user:
            return jsonify({"error": "Invalid credentials or reference number"}), 401

        if not check_password_hash(user.password_hash, password):
            return jsonify({"error": "Invalid credentials"}), 401

        if not user.is_verified:
            try:
                verify_token = generate_verification_token(user.email)
                confirm_url = url_for('register.email_verification', token=verify_token, _external=True)
                send_email(
                    user.email,
                    "Please verify your account",
                    f"<p>Please verify your email: <a href='{confirm_url}'>{confirm_url}</a></p>"
                )
            except Exception:
                pass  # Don't crash login if email fails
            return jsonify({
                "error": "Email not verified. A new verification link has been sent to your inbox."
            }), 403

        login_user(user)

        token = create_access_token(
            identity=str(user.id),
            additional_claims={"role": "user"}
        )
        return jsonify({
            "token": token,
            "role": "user",
            "userId": user.id,
            "email": user.email,
            "domain": domain.domain_name,
            "domainId": domain.id,
            "message": "Login successful"
        }), 200

    except Exception as e:
        print(f"Login error: {str(e)}")
        return jsonify({"error": str(e)}), 500