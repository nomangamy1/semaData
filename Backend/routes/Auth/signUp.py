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


@register_bp.route('/signup', methods=['POST'])
def signUp():
    try:
        data = request.get_json()
        role = data.get('role', '').lower()
        email = data.get('email', '').strip()

        # ─────────────────────────────────────────────────────
        # DUPLICATE CHECK — before any db.session.add()
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
        # ROLE: COMMUNITY MEMBER
        # Free signup — email + password + area_of_interest
        # No reference_number, no vetting, no payment
        # ─────────────────────────────────────────────────────
        if role == 'community':
            area_of_interest = data.get('area_of_interest', '').strip()
            first_name = data.get('first_name', '').strip()
            last_name = data.get('last_name', '').strip()

            if not first_name or not email or not data.get('password'):
                return jsonify({"error": "First name, email and password are required"}), 400

            new_member = User(
                first_name=first_name,
                second_name=last_name,
                email=email,
                password_hash=generate_password_hash(data['password']),
                role='community',
                user_type='community',
                area_of_interest=area_of_interest,   # store their ML/AI/research interest
                reference_number=None,                # community members have no domain link
                is_verified=False,
            )
            db.session.add(new_member)
            db.session.commit()

            # Send verification email
            token = generate_verification_token(new_member.email)
            confirm_url = url_for('register.email_verification', token=token, _external=True)
            send_email(
                new_member.email,
                "Welcome to semaData — please verify your email",
                f"""<h3>Welcome, {new_member.first_name}!</h3>
                    <p>You've joined the semaData community. Please verify your email to start posting:</p>
                    <p><a href="{confirm_url}">{confirm_url}</a></p>
                    <p>Once verified you can post discussions, comment on datasets, and ask questions about African language AI.</p>"""
            )

            access_token = create_access_token(
                identity=str(new_member.id),
                additional_claims={"role": "community"}
            )
            return jsonify({
                "status": "success",
                "message": "Welcome! Please verify your email to unlock posting.",
                "token": access_token,
                "userId": new_member.id,
                "role": "community",
                "requires_verification": True,
            }), 201

        # ─────────────────────────────────────────────────────
        # ROLE: COLLECTOR (User)
        # Vetted — requires approved JobApplication + reference_number
        # ─────────────────────────────────────────────────────
        elif role == 'user':
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
                role='user',
                user_type='User',
                reference_number=ref_number
            )
            db.session.add(new_user)
            db.session.commit()

            application.assigned_user_id = new_user.id
            db.session.commit()

            token = generate_verification_token(new_user.email)
            confirm_url = url_for('register.email_verification', token=token, _external=True)
            send_email(
                new_user.email,
                "You've been added to the team",
                f"""<h3>Welcome, {new_user.first_name}</h3>
                    <p>Please verify your email: <a href="{confirm_url}">{confirm_url}</a></p>"""
            )

            access_token = create_access_token(identity=str(new_user.id))
            return jsonify({
                "message": "Registered! Please check your email to verify your account.",
                "token": access_token,
                "userId": new_user.id
            }), 201

        # ─────────────────────────────────────────────────────
        # ROLE: DOMAIN OWNER
        # ─────────────────────────────────────────────────────
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
            db.session.commit()

            token = generate_verification_token(new_owner.email)
            confirm_url = url_for('register.email_verification', token=token, _external=True)
            send_email(
                new_owner.email,
                "Please confirm your domain owner email",
                f"""<h3>Welcome, {new_owner.first_name}</h3>
                    <p>Thanks for signing up as a Domain Owner.</p>
                    <p>Please verify your email: <a href="{confirm_url}">{confirm_url}</a></p>"""
            )

            access_token = create_access_token(identity=str(new_owner.id))
            return jsonify({
                "status": "success",
                "message": "Account created! Please verify your email, then log in to continue.",
                "token": access_token,
                "ownerId": new_owner.id,
                "requires_verification": True,
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
    if not subject_obj.is_verified:
        subject_obj.is_verified = True
        db.session.commit()

    if owner:
        return redirect(f"{frontend_base}/login?verified=true&next=/DomainDefinition")
    elif user and getattr(user, 'user_type', '') == 'community':
        # Community members go straight to the feed after verification
        return redirect(f"{frontend_base}/login?verified=true&next=/community")
    else:
        return redirect(f"{frontend_base}/login?verified=true&next=/userDashboard")