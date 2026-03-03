from flask import Blueprint, request, jsonify
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
    Supported login types:
    1. ADMIN          → email + password only
    2. DOMAIN OWNER   → email + password only
    3. COLLECTOR      → email + password + reference_number (invite code)
    """
    try:
        data = request.get_json()
        email = data.get('email', '').strip()
        password = data.get('password', '')
        ref_number = data.get('reference_number', '').strip()

        if not email or not password:
            return jsonify({"error": "Email and password are required"}), 400

        # ─── 1. ADMIN ────────────────────────────────────────────────
        admin = User.query.filter_by(email=email, role='admin').first()
        if admin:
            if not check_password_hash(admin.password_hash, password):
                return jsonify({"error": "Invalid admin credentials"}), 401

            token = create_access_token(
                identity=str(admin.id),
                additional_claims={"role": "admin"}
            )
            return jsonify({
                "token": token,
                "role": "admin",
                "userId": admin.id,
                "email": admin.email,
            }), 200

        # ─── 2. DOMAIN OWNER ─────────────────────────────────────────
        owner = DomainOwner.query.filter_by(email=email).first()
        if owner:
            if not check_password_hash(owner.password_hash, password):
                return jsonify({"error": "Invalid email or password"}), 401

            if not owner.is_verified:
                return jsonify({
                    "error": "Email not verified. Please check your inbox for the verification link."
                }), 403

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
                "message": "Login successful"
            }), 200

        # ─── 3. COLLECTOR (User) ─────────────────────────────────────
        if not ref_number:
            return jsonify({
                "error": "Collectors must provide a reference number (invite code)."
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
            return jsonify({
                "error": "Email not verified. Please check your inbox for the verification link."
            }), 403

        token = create_access_token(
            identity=str(collector.id),
            additional_claims={"role": "user"}
        )
        return jsonify({
            "token": token,
            "role": "user",
            "userId": collector.id,
            "email": collector.email,
            "domain": domain.domain_name,
            "domainId": domain.id,
            "message": "Login successful"
        }), 200

    except Exception as e:
        logger.exception("Login failed for email: %s", email)
        return jsonify({
            "error": "An unexpected error occurred. Please try again later."
        }), 500