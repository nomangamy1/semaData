from flask import Flask, Blueprint, request, jsonify
from werkzeug.security import generate_password_hash
from models import User, Domain, DomainOwner, Dataset
from extensions import db
from utils.tokens import generate_verification_token, confirm_token_verification
from utils.mailer import send_approval_email as send_mail
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

        # ── Duplicate check ──
        existing_user  = User.query.filter_by(email=email).first()
        existing_owner = DomainOwner.query.filter_by(email=email).first()
        if existing_user or existing_owner:
            return jsonify({"error": "An account with this email already exists"}), 400

        if role == 'domainowner':
            username = data.get('username', '').strip()
            if DomainOwner.query.filter_by(username=username).first():
                return jsonify({"error": "Username already taken"}), 400

        # ─────────────────────────────────────────────────────
        # ROLE: COMMUNITY
        # ─────────────────────────────────────────────────────
        if role == 'community':
            # ✅ V1 Community limit — 500 founding members
            COMMUNITY_LIMIT = 500
            community_count = User.query.filter_by(role='community').count()
            if community_count >= COMMUNITY_LIMIT:
                return jsonify({
                    "error": "founding_limit_reached",
                    "message": "SemaData V1 community is at capacity. Join the waitlist for V2.",
                    "limit": COMMUNITY_LIMIT,
                    "waitlist_url": "/waitlist"
                }), 403

            area_of_interest = data.get('area_of_interest', '').strip()
            headline = data.get('headline', '').strip()
            bio = data.get('bio', '').strip()
            expertise = data.get('expertise') or []
            research_interests = data.get('research_interests') or []
            skills = data.get('skills') or []
            social_links = data.get('social_links') or {}
            first_name = data.get('first_name', '').strip()
            last_name  = data.get('last_name', '').strip()

            if not first_name or not email or not data.get('password'):
                return jsonify({"error": "First name, email and password are required"}), 400

            new_member = User(
                first_name=first_name,
                second_name=last_name,
                email=email,
                password_hash=generate_password_hash(data['password']),
                role='community',
                user_type='community',
                area_of_interest=area_of_interest or None,
                headline=headline or None,
                bio=bio or None,
                expertise=expertise,
                research_interests=research_interests,
                skills=skills,
                social_links=social_links or None,
                reference_number=None,
                is_verified=False,
            )
            db.session.add(new_member)
            db.session.commit()

            token = generate_verification_token(new_member.email)
            confirm_url = url_for('register.email_verification', token=token, _external=True)
            send_mail(
                new_member.email,
                "Welcome to semaData — please verify your email",
                f"""<h3>Welcome, {new_member.first_name}!</h3>
                    <p>You've joined the semaData community. Please verify your email to start posting:</p>
                    <p><a href="{confirm_url}">{confirm_url}</a></p>"""
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
        # ref_number here is the APPLICATION reference number
        # e.g. 'AGRI--DNFOHBKV' — NOT the domain reference number
        # ─────────────────────────────────────────────────────
        elif role == 'user':
            ref_number = data.get('reference_number', '').strip()

            # ✅ Step 1: Find the approved application by email + ref number
            application = JobApplication.query.filter_by(
                email=email,
                reference_number_assigned=ref_number,
                status='approved'
            ).first()

            if not application:
                return jsonify({
                    "error": "No approved application found for this email and reference number"
                }), 400

            # ✅ Step 2: Get domain via the job linked to this application
            from models.Job import Job  # local import avoids circular
            job = Job.query.get(application.job_id)
            if not job:
                return jsonify({"error": "Associated job not found"}), 400

            domain = Domain.query.get(job.domain_id)
            if not domain:
                return jsonify({"error": "Associated domain not found"}), 400

            # ✅ Step 3: Create the collector User
            new_user = User(
                first_name=data.get('first_name', '').strip(),
                second_name=data.get('second_name', '').strip(),
                email=email,
                password_hash=generate_password_hash(data['password']),
                role='user',
                user_type='User',
                reference_number=ref_number,       # store the APPLICATION ref
                domain_name=domain.domain_name,    # resolved from the job → domain
            )
            db.session.add(new_user)
            db.session.commit()

            # Link application to the new user
            application.assigned_user_id = new_user.id
            db.session.commit()

            token = generate_verification_token(new_user.email)
            confirm_url = url_for('register.email_verification', token=token, _external=True)
            send_mail(
                new_user.email,
                "You've been added to the team",
                f"""<h3>Welcome, {new_user.first_name}!</h3>
                    <p>You've been approved as a data collector for <strong>{domain.domain_name}</strong>.</p>
                    <p>Please verify your email: <a href="{confirm_url}">{confirm_url}</a></p>"""
            )

            access_token = create_access_token(identity=str(new_user.id))
            return jsonify({
                "message": "Registered! Please check your email to verify your account.",
                "token": access_token,
                "userId": new_user.id,
                "domain": domain.domain_name,
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
            send_mail(
                new_owner.email,
                "Please confirm your domain owner email",
                f"""<h3>Welcome, {new_owner.first_name}!</h3>
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
    user  = User.query.filter_by(email=email).first()

    if not owner and not user:
        return redirect(f"{frontend_base}/signup?error=not_found")

    subject_obj = owner if owner else user
    if not subject_obj.is_verified:
        subject_obj.is_verified = True
        db.session.commit()

    if owner:
        return redirect(f"{frontend_base}/login?verified=true&next=/DomainDefinition")
    elif user and getattr(user, 'user_type', '') == 'community':
        return redirect(f"{frontend_base}/login?verified=true&next=/community")
    else:
        return redirect(f"{frontend_base}/login?verified=true&next=/userDashboard")

@register_bp.route('/community-spots', methods=['GET'])
def community_spots():
    COMMUNITY_LIMIT = 500
    current_count   = User.query.filter_by(role='community').count()
    spots_remaining = max(COMMUNITY_LIMIT - current_count, 0)
    return jsonify({
        "limit":           COMMUNITY_LIMIT,
        "current":         current_count,
        "spots_remaining": spots_remaining,
        "is_full":         spots_remaining == 0
    }), 200
