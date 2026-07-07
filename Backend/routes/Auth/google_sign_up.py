from google.oauth2 import id_token
from google.auth.transport import requests as google_requests
from flask_jwt_extended import create_access_token
from flask import Blueprint, jsonify, request
from models import User, DomainOwner, Domain
from models.JobApplication import JobApplication
from extensions import db
from Config import config

auth_bp = Blueprint("auth", __name__)


@auth_bp.route("/google_sign_up", methods=["POST"])
def google_sign_up():
    try:
        data = request.get_json()
        token = data.get("token")
        role_type = data.get("role")

        idinfo = id_token.verify_oauth2_token(
            token, google_requests.Request(), config["default"].GOOGLE_CLIENT_ID
        )
        email = idinfo["email"]
        full_name = idinfo.get("name", email.split("@")[0])
        name_parts = full_name.split(" ", 1)
        first_name = name_parts[0]
        last_name = name_parts[1] if len(name_parts) > 1 else ""

        # ───────────────────────────────────────────
        # ROLE: COMMUNITY
        # ───────────────────────────────────────────
        if role_type == "community":
            existing = User.query.filter_by(email=email).first()
            if existing:
                token_out = create_access_token(
                    identity=str(existing.id),
                    additional_claims={"role": "community"}
                )
                return jsonify({
                    "message": "Welcome back",
                    "token": token_out,
                    "role": "community",
                    "userId": existing.id,
                    "fullName": f"{existing.first_name} {existing.second_name or ' '}".strip(),
                }), 200

            new_member = User(
                first_name=first_name,
                second_name=last_name,
                email=email,
                password_hash="",  # Google-authenticated — no password
                role="community",
                user_type="community",
                area_of_interest=data.get("area_of_interest", ""),
                reference_number=None,
                is_verified=True,  # Google email is already verified
            )
            db.session.add(new_member)
            db.session.commit()

            token_out = create_access_token(
                identity=str(new_member.id),
                additional_claims={"role": "community"}
            )
            return jsonify({
                "message": "Welcome to semaData!",
                "token": token_out,
                "role": "community",
                "userId": new_member.id,
                "fullName": full_name,
            }), 201

        # ───────────────────────────────────────────
        # ROLE: COLLECTOR (User)
        # ✅ Now correctly checks JobApplication approval — not just domain existence
        # ───────────────────────────────────────────
        elif role_type == "user":
            ref_number = data.get("reference_number", "").strip()

            application = JobApplication.query.filter_by(
                email=email,
                reference_number_assigned=ref_number,
                status="approved"
            ).first()
            if not application:
                return jsonify({
                    "error": "No approved application found for this email and reference number"
                }), 400

            from models.Job import Job
            job = Job.query.get(application.job_id)
            if not job:
                return jsonify({"error": "Associated job not found"}), 400
            domain = Domain.query.get(job.domain_id)
            if not domain:
                return jsonify({"error": "Associated domain not found"}), 400

            existing_user = User.query.filter_by(email=email).first()
            if existing_user:
                return jsonify({"message": "User already registered"}), 200

            user = User(
                first_name=first_name,
                second_name=last_name,
                email=email,
                password_hash="",
                role="user",
                user_type="User",
                reference_number=ref_number,
                domain_name=domain.domain_name,
                is_verified=True,
            )
            db.session.add(user)
            db.session.commit()

            application.assigned_user_id = user.id
            db.session.commit()

            token_out = create_access_token(
                identity=str(user.id),
                additional_claims={"role": "user"}
            )
            return jsonify({
                "message": "Registered via Google!",
                "token": token_out,
                "role": "user",
                "userId": user.id,
                "domain": domain.domain_name,
            }), 201

        # ───────────────────────────────────────────
        # ROLE: DOMAIN OWNER
        # ───────────────────────────────────────────
        else:
            existing_owner = DomainOwner.query.filter_by(email=email).first()
            if existing_owner:
                token_out = create_access_token(
                    identity=str(existing_owner.id),
                    additional_claims={"role": "domain_owner"}
                )
                return jsonify({
                    "message": "Welcome back",
                    "token": token_out,
                    "role": "domain_owner",
                    "ownerId": existing_owner.id,
                }), 200

            domain_owner = DomainOwner(
                first_name=first_name,
                last_name=last_name,
                username=email.split("@")[0],
                email=email,
                password_hash="",
                domain_field=data.get("domain_field", "Health"),
                is_verified=True,
            )
            db.session.add(domain_owner)
            db.session.commit()

            token_out = create_access_token(
                identity=str(domain_owner.id),
                additional_claims={"role": "domain_owner"}
            )
            return jsonify({
                "message": "You are now a domain owner via Google!",
                "token": token_out,
                "role": "domain_owner",
                "ownerId": domain_owner.id,
            }), 201

    except Exception as e:
        print(f"DEBUG:Verification Failed: {e}")
        return jsonify({"error": "Invalid token format"}), 400
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": str(e)}), 500
