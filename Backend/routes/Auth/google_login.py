from google.oauth2 import id_token
from google.auth.transport import requests as google_requests
from flask import Blueprint, jsonify, request
from flask_jwt_extended import create_access_token
from models import User, DomainOwner
from extensions import db
from Config import config

google_login_bp = Blueprint("google_login", __name__)


@google_login_bp.route("/google_login", methods=["POST"])
def google_login():
    try:
        data = request.get_json()
        token = data.get("token")
        role_type = data.get("role")

        if not token or not role_type:
            return jsonify({"error": "Token and role are required"}), 400

        idinfo = id_token.verify_oauth2_token(
            token, google_requests.Request(), config["default"].GOOGLE_CLIENT_ID
        )
        email = idinfo["email"]

        # ───────────────────────────────────────────
        # ROLE: COMMUNITY
        # ───────────────────────────────────────────
        if role_type == "community":
            user = User.query.filter_by(email=email, user_type="community").first()
            if not user:
                return jsonify({"error": "No community account found. Please sign up first."}), 404

            access_token = create_access_token(
                identity=str(user.id),
                additional_claims={"role": "community"}
            )
            return jsonify({
                "token":  access_token,
                "role":   "community",
                "userId": user.id,
                "email":  user.email,
                "fullName": f"{user.first_name} {user.second_name or ' '}".strip(),
            }), 200

        # ───────────────────────────────────────────
        # ROLE: COLLECTOR (User)
        # ───────────────────────────────────────────
        elif role_type == "user":
            reference_number = data.get("reference_number")
            if not reference_number:
                return jsonify({"error": "Reference number is required for collector login"}), 400

            user = User.query.filter_by(email=email, reference_number=reference_number).first()
            if not user:
                return jsonify({"error": "User not found or not registered with this email and reference number"}), 404

            access_token = create_access_token(
                identity=str(user.id),
                additional_claims={"role": "user"}
            )
            return jsonify({
                "token":  access_token,
                "role":   "user",
                "userId": user.id,
                "email":  user.email,
            }), 200

        # ───────────────────────────────────────────
        # ROLE: DOMAIN OWNER
        # ───────────────────────────────────────────
        elif role_type == "domain_owner":
            domain_owner = DomainOwner.query.filter_by(email=email).first()
            if not domain_owner:
                return jsonify({"error": "Domain Owner not found"}), 404

            access_token = create_access_token(
                identity=str(domain_owner.id),
                additional_claims={"role": "domain_owner"}
            )
            return jsonify({
                "token":  access_token,
                "role":   "domain_owner",
                "ownerId": domain_owner.id,
                "email":  domain_owner.email,
            }), 200

        else:
            return jsonify({"error": "Invalid role type"}), 400

    except ValueError:
        return jsonify({"error": "Invalid Google token"}), 400
    except Exception as e:
        return jsonify({"error": str(e)}), 500
