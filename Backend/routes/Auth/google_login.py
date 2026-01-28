from google.oauth2 import id_token
from google.auth.transport import requests as google_requests
from flask import Blueprint, jsonify, request
from flask_jwt_extended import create_access_token
from models import User, DomainOwner
from extensions import db
from Config import config

google_login_bp = Blueprint("google_login", __name__)

@google_login_bp.route('/google_login', methods=['POST'])
def google_login():
    try:
        data = request.get_json()
        token = data.get('token')
        role_type = data.get('role')  # 'user' or 'domain_owner'

        if not token or not role_type:
            return {"error": "Token and role are required"}, 400

        idinfo = id_token.verify_oauth2_token(token, google_requests.Request(), config['default'].GOOGLE_CLIENT_ID)
        email = idinfo['email']

        if role_type == 'user':
            # For users, require reference_number to identify the domain
            reference_number = data.get('reference_number')
            if not reference_number:
                return {"error": "Reference number is required for user login"}, 400

            user = User.query.filter_by(email=email, reference_number=reference_number).first()
            if not user:
                return {"error": "User not found or not registered with this email and reference number"}, 404

            # Generate JWT token
            access_token = create_access_token(identity=user.id)
            return {
                "message": "User login successful via Google",
                "access_token": access_token,
                "role": "user",
                "user_id": user.id
            }, 200

        elif role_type == 'domain_owner':
            domain_owner = DomainOwner.query.filter_by(email=email).first()
            if not domain_owner:
                return {"error": "Domain Owner not found"}, 404

            # Generate JWT token
            access_token = create_access_token(identity=domain_owner.id)
            return {
                "message": "Domain Owner login successful via Google",
                "access_token": access_token,
                "role": "domain_owner",
                "user_id": domain_owner.id
            }, 200

        else:
            return {"error": "Invalid role type"}, 400

    except ValueError:
        return {"error": "Invalid token"}, 400
    except Exception as e:
        return {"error": str(e)}, 500