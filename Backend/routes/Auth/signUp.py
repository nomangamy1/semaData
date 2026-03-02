from flask import Flask, Blueprint, request, jsonify
from werkzeug.security import generate_password_hash
from models import User, Domain, DomainOwner, Dataset
from extensions import db
from utils.tokens import generate_verification_token, confirm_token_verification
from utils.email import send_email
from flask import url_for, redirect, current_app
from itsdangerous import SignatureExpired, BadTimeSignature
from models.JobApplication import JobApplication
from flask_jwt_extended import create_access_token
import traceback

register_bp = Blueprint("register", __name__)


@register_bp.route('/signup', methods=['POST'])  # ✅ Remove 'GET' — GET has no body
def signUp():
    try:
        data = request.get_json()
        role = data.get('role', '').lower()
        email = data.get('email', '').strip()

        # ─────────────────────────────────────────────────────
        # DUPLICATE CHECK — must happen BEFORE any db.session.add()
        # This is what prevents the UniqueViolation crash
        # ─────────────────────────────────────────────────────
        existing_user = User.query.filter_by(email=email).first()
        existing_owner = DomainOwner.query.filter_by(email=email).first()

        if existing_user or existing_owner:
            return jsonify({"error": "An account with this email already exists"}), 400

        if role == 'domainowner':
            username = data.get('username', '').strip()
            if DomainOwner.query.filter_by(username=username).first():
                return jsonify({"error": "Username already taken"}), 400

        # ─────────────────────────────────────────────────────
        # CREATE USER BASED ON ROLE
        # ─────────────────────────────────────────────────────
        if role == 'user':
            ref_number = data.get('reference_number')
            domain = Domain.query.filter_by(reference_number=ref_number).first()
            if not domain:
                return jsonify({"error": "Invalid domain reference number"}), 400

            application = JobApplication.query.filter_by(
                email=email,
                reference_number_assigned=ref_number,
                status='approved'
            ).first()
            if not application:
                return jsonify({"error": "Application not approved or does not exist"}), 400

            new_user = User(
                first_name=data.get('first_name'),
                second_name=data.get('second_name'),
                email=email,
                password_hash=generate_password_hash(data['password']),
                role=role,
                reference_number=ref_number
            )
            db.session.add(new_user)
            db.session.commit()  # ✅ Commit before using new_user.id

            application.assigned_user_id = new_user.id
            db.session.commit()

            subject_obj = new_user

        else:
            new_owner = DomainOwner(
                first_name=data.get('first_name'),
                last_name=data.get('last_name'),
                username=data.get('username'),
                email=email,
                password_hash=generate_password_hash(data['password']),
                domain_field=data.get('domain_field')
            )
            db.session.add(new_owner)
            db.session.commit()  # ✅ Single commit — no double insert possible

            subject_obj = new_owner

        # ─────────────────────────────────────────────────────
        # GENERATE JWT TOKEN
        # ─────────────────────────────────────────────────────
        access_token = create_access_token(identity=str(subject_obj.id))

        # ─────────────────────────────────────────────────────
        # SEND VERIFICATION EMAIL
        # ─────────────────────────────────────────────────────
        token = generate_verification_token(subject_obj.email)
        confirm_url = url_for('register.email_verification', token=token, _external=True)

        if role == 'domainowner':
            subject = "Please confirm your domain owner email"
            html = f"""<h3>Welcome, {subject_obj.first_name}</h3>
                       <p>Thanks for signing up as a Domain Owner.</p>
                       <p>Please verify your email: <a href="{confirm_url}">{confirm_url}</a></p>"""
        else:
            subject = "You've been added to the team"
            html = f"""<h3>Welcome, {subject_obj.first_name}</h3>
                       <p>Please verify your email: <a href="{confirm_url}">{confirm_url}</a></p>"""

        send_email(subject_obj.email, subject, html)

        # ─────────────────────────────────────────────────────
        # RESPONSE
        # ─────────────────────────────────────────────────────
        if role == 'domainowner':
            return jsonify({
                "status": "success",
                "message": "Account created! Please verify your email, then log in to continue.",
                "token": access_token,       # ✅ Return token immediately
                "ownerId": subject_obj.id,   # ✅ Consistent key
                "requires_verification": True,
            }), 201

        return jsonify({
            "message": "Registered! Please check your email to verify your account.",
            "token": access_token,
            "userId": subject_obj.id
        }), 201

    except Exception as e:
        db.session.rollback()
        traceback.print_exc()
        return jsonify({"error": str(e)}), 500


@register_bp.route('/confirm/<token>', methods=['GET'])
def email_verification(token):
    frontend_base = current_app.config['FRONTEND_URL']

    try:
        email = confirm_token_verification(token)
        if not email:
            return redirect(f"{frontend_base}/login?error=invalid_token")
    except (SignatureExpired, BadTimeSignature):
        return redirect(f"{frontend_base}/login?error=expired")

    owner = DomainOwner.query.filter_by(email=email).first()
    user = User.query.filter_by(email=email).first()

    if not owner and not user:
        return redirect(f"{frontend_base}/signup?error=not_found")

    subject_obj = owner if owner else user
    was_verified = subject_obj.is_verified

    if not was_verified:
        subject_obj.is_verified = True
        db.session.commit()

    if owner:
        # ✅ Redirect to login with ?verified=true&next=/DomainDefinition
        # Frontend reads ?next= and navigates there after successful login
        return redirect(f"{frontend_base}/login?verified=true&next=/DomainDefinition")
    else:
        return redirect(f"{frontend_base}/login?verified=true&next=/userDashboard")