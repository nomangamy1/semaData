from flask import Blueprint, request, jsonify,url_for
from werkzeug.security import check_password_hash
from utils.tokens import generate_verification_token
from utils.email import send_email
from models import User, Domain, DomainOwner
from flask_login import login_user
from werkzeug.security import check_password_hash,generate_password_hash
from models import User, Domain, DomainOwner

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
            reference_number=reference_number 
        ).first()

        if domain_owner and check_password_hash(
            domain_owner.password_hash, password
        ):
            stored_hash = getattr(domain_owner, 'password_hash', None)
            if stored_hash and check_password_hash(stored_hash, password):
                login_user(domain_owner)
                return {
                "message": "Domain Owner login successful",
                "role": "domain_owner",
                "domain": domain.domain_name,
                "domainId": domain.id,
                "userId": domain_owner.id,

                
            }, 200

        # user to login
        user = User.query.filter_by(
            email=email,
            reference_number=reference_number
        ).first()

        if not user:
            return {
                "error": "Invalid credentials"
            }, 401
        
        user_hash = getattr(user, 'password_hash', None)
        if not user_hash or not check_password_hash(user_hash, password):
            return {
                "error": "Invalid credentials"
            }, 401
        
        # SECURITY: Verify user is actually a collector (user_type check)
        if user.user_type != 'User':
            return {
                "error": "Invalid user type for collector login"
            }, 401

        if not user.is_verified:
            token = generate_verification_token(user.email)
            confirm_url = url_for('register.email_verification', token=token, _external=True)
            subject = "Please verify your account"
            html = f"<p>It looks like you haven't verified your email yet. Please click here: <a href='{confirm_url}'>{confirm_url}</a></p>"
            try:
                send_email(user.email, subject, html)
                return {
                    "error": "Email not verified",
                    "message": "A new verification link has been sent to your inbox."
                }, 403
            except Exception as mail_err:
                return {
                    "error": "Email not verified and mailer failed.",
                    "details": str(mail_err)
                }, 403

        # If verified, proceed with login_user(user)
        login_user(user)
        return {"message": "Login successful",
                "role" : user.role,
                "userId": user.id,
                "email" : user.email,
                "domain": domain.domain_name,
                "domainId": domain.id
                
                
                }, 200

    except Exception as e:
        print(f"Login error: {str(e)}")
        return {"error": str(e)}, 500

     