from flask import Blueprint, request, jsonify
from flask_login import login_user
from werkzeug.security import check_password_hash

from semaData import semaData
from Backend.models import User, Domain, DomainOwner

login_bp = Blueprint("login",__name__)

@login_bp.route('/login', methods=['POST'])
def login():
    try:
        data = request.get_json()

        email = data.get('email')
        password = data.get('password')
        reference_number = data.get('reference_number')

        # genaral validation of credentials provided
        if not email or not password or not reference_number:
            return {
                "error": "email, password and reference_number are required"
            }, 400

        # domain validation
        domain = Domain.query.filter_by(
            reference_number=reference_number
        ).first()

        if not domain:
            return {
                "error": "Invalid reference number"
            }, 401

        #Domain owner to login

        domain_owner = DomainOwner.query.filter_by(
            email=email,
            referenceNumber=reference_number
        ).first()

        if domain_owner and check_password_hash(
            domain_owner.hash_password, password
        ):
            login_user(domain_owner)

            return {
                "message": "Domain Owner login successful",
                "role": "domain_owner",
                "domain": domain.domain_name
            }, 200

        # user to login
        user = User.query.filter_by(
            email=email,
            ReferenceNumber=reference_number
        ).first()

        if not user:
            return {
                "error": "Invalid credentials"
            }, 401

        if not user.isVerified:
            return {
                "error": "Email not verified"
            }, 403

        if check_password_hash(user.password_hash, password):
            login_user(user)

            return {
                "message": "User login successful",
                "role": user.role,
                "domain": domain.domain_name
            }, 200

        # incase of invalid details
        return {
            "error": "Invalid credentials"
        }, 401

    except Exception as e:
        return {
            "error": "Login failed",
            "details": str(e)
        }, 500
