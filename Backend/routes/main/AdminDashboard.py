from flask import jsonify, request, Blueprint, current_app
from flask_jwt_extended import jwt_required, get_jwt_identity
from models.domain import Domain
from models.user import User
from models.Job import Job
from models.domainowner import DomainOwner
from models.JobApplication import JobApplication
from extensions import db
from utils.audit import audit_action, record_audit
from utils.permissions import requires_admin
import string
import secrets
from datetime import datetime  # <-- Crucial Missing Import

admin_bp = Blueprint("admin", __name__)

def require_admin(identity):
    try:
        user = User.query.filter(User.id == int(identity)).first()
    except (TypeError, ValueError):
        return None
    if not user:
        return None

    role_name = (getattr(user, 'role', '') or '').strip().lower()
    user_type = (getattr(user, 'user_type', '') or '').strip().lower()
    if user.is_super_admin or role_name == 'admin' or user_type == 'admin':
        return user
    return None


@admin_bp.route("/dashboard-stats", methods=["GET"])
@jwt_required()
def get_dashboard_stats():
    admin_id = get_jwt_identity()
    if not require_admin(admin_id):
        return jsonify({"error": "Unauthorized"}), 403
    total_collectors = JobApplication.query.filter(
        JobApplication.status == "approved",
        JobApplication.assigned_user_id.isnot(None)
    ).count()
    return jsonify({
        "stats": {
            "pending_applications": JobApplication.query.filter_by(status="submitted").count(),
            "active_jobs":             Job.query.filter_by(status="published").count(),
            "total_collectors":      total_collectors,
            "total_domains":           Domain.query.count(),
        }
    }), 200

# ─── COLLECTOR APPLICATION MANAGEMENT FOR FRONTEND ───

@admin_bp.route("/applications", methods=["GET"])
@jwt_required()
def get_pending_applications():
    """ Fetches all pending field collector registrations for TeamCollectors.jsx """
    admin_id = get_jwt_identity()
    if not require_admin(admin_id):
        return jsonify({"error": "Unauthorized"}), 403
    
    apps = JobApplication.query.filter_by(status="submitted").all()
    return jsonify([
        {
            "id": a.id,
            "first_name": a.user.first_name if a.user else "Anonymous",
            "second_name": a.user.second_name if a.user else "Collector",
            "email": a.user.email if a.user else "N/A",
            "job_title": a.job.title if a.job else "Field Data Collector",
            "domain_name": a.job.domain.domain_name if (a.job and a.job.domain) else "General Operations"
        } for a in apps
    ]), 200

@admin_bp.route("/applications/<int:app_id>/approve", methods=["POST"])
@jwt_required()
@requires_admin
@audit_action(action="approve_application", target_table="JobApplication", get_target_id=lambda app_id: app_id)
def approve_collector_application(app_id):
    """ Approves collector application and maps their operational tracking routes """
    admin_id = get_jwt_identity()
    if not require_admin(admin_id):
        return jsonify({"error": "Unauthorized"}), 403

    application = JobApplication.query.get_or_404(app_id)
    try:
        application.status = "approved"
        if application.user:
            application.user.role = "collector"
        db.session.commit()
        # record a rich audit entry
        try:
            actor = get_jwt_identity()
            record_audit(actor_id=actor, action='approve_application', target_table='JobApplication', target_id=application.id, after={'status': application.status, 'assigned_user_id': application.assigned_user_id})
        except Exception:
            pass
        return jsonify({"status": "success", "message": "Collector approved successfully."}), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": str(e)}), 500

@admin_bp.route("/applications/<int:app_id>/reject", methods=["POST"])
@jwt_required()
@requires_admin
@audit_action(action="reject_application", target_table="JobApplication", get_target_id=lambda app_id: app_id)
def reject_collector_application(app_id):
    admin_id = get_jwt_identity()
    if not require_admin(admin_id):
        return jsonify({"error": "Unauthorized"}), 403

    application = JobApplication.query.get_or_404(app_id)
    try:
        application.status = "rejected"
        # optional reason from payload
        payload = request.get_json(silent=True) or {}
        reason = payload.get('reason')
        db.session.commit()
        try:
            actor = get_jwt_identity()
            record_audit(actor_id=actor, action='reject_application', target_table='JobApplication', target_id=application.id, after={'status': application.status}, reason=reason)
        except Exception:
            pass
        return jsonify({"status": "success", "message": "Collector application rejected."}), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": str(e)}), 500

# ─── DISBURSEMENT ADMINISTRATION SYSTEM (MANUAL CASH OUTS) ───

@admin_bp.route("/payouts/pending", methods=["GET"])
@jwt_required()
def get_pending_payouts():
    admin_id = get_jwt_identity()
    if not require_admin(admin_id):
        return jsonify({"error": "Unauthorized"}), 403

    from models.payments import AdminDisbursement
    pending_list = AdminDisbursement.query.filter_by(status="PENDING").all()
    
    output = []
    for req in pending_list:
        target_coordinate = req.collector.mpesa_number if req.collector.preferred_gateway == "MPESA" else req.collector.paypal_email
        output.append({
            "id": req.id,
            "collector_id": req.collector_id,
            "username": f"{req.collector.first_name} {req.collector.second_name}",
            "amount": req.amount,
            "initiated_at": req.initiated_at.strftime('%Y-%m-%d %H:%M:%S'),
            "preferred_gateway": req.collector.preferred_gateway or "MPESA",
            "target_coordinate": target_coordinate or "Not configured"
        })
    return jsonify(output), 200

@admin_bp.route("/payouts/approve/<int:request_id>", methods=["POST"])
@jwt_required()
@requires_admin
@audit_action(action="approve_payout", target_table="admin_disbursement", get_target_id=lambda request_id: request_id)
def approve_payout(request_id):
    admin_id = get_jwt_identity()
    if not require_admin(admin_id):
        return jsonify({"error": "Unauthorized"}), 403

    from models.payments import AdminDisbursement
    data = request.get_json(silent=True) or {}
    txn_note = data.get("transaction_note", "").strip()

    payout_record = AdminDisbursement.query.get(request_id)
    if not payout_record:
        return jsonify({"error": "Disbursement log record matching target ID not found."}), 404
    if payout_record.status == "DISBURSED":
        return jsonify({"message": "This payout instance has already been processed."}), 400

    try:
        payout_record.status = "DISBURSED"
        payout_record.processed_at = datetime.utcnow()
        payout_record.transaction_note = txn_note
        db.session.commit()
        try:
            actor = get_jwt_identity()
            record_audit(actor_id=actor, action='approve_payout', target_table='admin_disbursement', target_id=payout_record.id, after={'status': payout_record.status, 'transaction_note': txn_note})
        except Exception:
            pass
        return jsonify({"status": "success", "message": f"Successfully updated request {request_id} to DISBURSED."}), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": f"Database mutation crash: {str(e)}"}), 500

@admin_bp.route("/payouts/reject/<int:request_id>", methods=["POST"])
@jwt_required()
@requires_admin
@audit_action(action="reject_payout", target_table="admin_disbursement", get_target_id=lambda request_id: request_id)
def reject_payout(request_id):
    admin_id = get_jwt_identity()
    if not require_admin(admin_id):
        return jsonify({"error": "Unauthorized"}), 403

    from models.payments import AdminDisbursement
    payout_record = AdminDisbursement.query.get(request_id)
    if not payout_record or payout_record.status != "PENDING":
        return jsonify({"error": "Active pending transaction matching ID not found."}), 404

    try:
        payout_record.status = "REJECTED"
        payout_record.processed_at = datetime.utcnow()
        db.session.commit()
        try:
            actor = get_jwt_identity()
            record_audit(actor_id=actor, action='reject_payout', target_table='admin_disbursement', target_id=payout_record.id, after={'status': payout_record.status})
        except Exception:
            pass
        return jsonify({"status": "success", "message": "Payout instruction rejected safely."}), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": str(e)}), 500

@admin_bp.route("/domain-owners", methods=["GET"])
@jwt_required()
def get_all_domain_owners():
    admin_id = get_jwt_identity()
    if not require_admin(admin_id):
        return jsonify({"error": "Unauthorized"}), 403
    owners = DomainOwner.query.all()
    return jsonify({
        "domain_owners": [
            {
                "id":         o.id,
                "name":       f"{o.first_name} {getattr(o, 'last_name', '') or ''}".strip(),
                "email":      o.email,
                "domain_count": len(o.domains) if hasattr(o, "domains") else 0,
            } for o in owners
        ]
    }), 200

@admin_bp.route("/all-domains", methods=["GET"])
@jwt_required()
def get_all_domains():
    admin_id = get_jwt_identity()
    if not require_admin(admin_id):
        return jsonify({"error": "Unauthorized"}), 403
    domains = Domain.query.all()
    return jsonify([{
        "id":                  d.id,
        "name":                d.domain_name,
        "status":              d.payment_status,
        "is_active":           d.is_active,
        "owner_id":            d.owner_id,
        "target":              d.target_goal,
        "reference_number":    d.reference_number or "Pending payment",
    } for d in domains]), 200

@admin_bp.route("/manage-team/invite", methods=["POST"])
@jwt_required()
def invite_reviewer():
    admin_id = get_jwt_identity()
    if not require_admin(admin_id):
        return jsonify({"error": "Unauthorized. Higher administrative clearance required."}), 403

    data = request.get_json() or {}
    email = data.get("email", "").strip().lower()
    first_name = data.get("first_name", "").strip()
    second_name = data.get("second_name", "").strip()

    if not email or not first_name or not second_name:
        return jsonify({"error": "Missing required fields."}), 400

    if User.query.filter_by(email=email).first():
        return jsonify({"error": f"An account with email {email} already exists."}), 400

    try:
        from werkzeug.security import generate_password_hash
        alphabet = string.ascii_letters + string.digits + "!@#$%^&*"
        temp_password = ''.join(secrets.choice(alphabet) for _ in range(12))

        new_reviewer = User(
            email=email,
            first_name=first_name,
            second_name=second_name,
            password_hash=generate_password_hash(temp_password),
            user_type='admin',
            role='admin',
            is_verified=True
        )
        db.session.add(new_reviewer)
        db.session.commit()

        try:
            from utils.email import send_email
            send_email(
                email,
                "Your SemaData Reviewer Account",
                f"""<h3>Welcome to SemaData Review Team</h3>
                    <p>Your reviewer account has been created.</p>
                    <p><strong>Email:</strong> {email}</p>
                    <p><strong>Temporary Password:</strong> {temp_password}</p>
                    <p>Login at: http://localhost:5173/login</p>
                    <p>Please change your password after first login.</p>"""
            )
        except Exception as mail_err:
            current_app.logger.warning(f"Reviewer email failed: {mail_err}")

        return jsonify({
            "status": "success",
            "message": f"Account for {first_name} successfully created!",
            "credentials": {"email": email, "temporary_password": temp_password}
        }), 201
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": f"System fault: {str(e)}"}), 500

@admin_bp.route("/post-job", methods=["POST"])
@jwt_required()
def post_job():
    admin_id = get_jwt_identity()
    if not require_admin(admin_id):
        return jsonify({"error": "Unauthorized"}), 403

    data = request.get_json()
    
    try:
        new_job = Job(
            title=data.get('title'),
            domain_id=data.get('domain_id'),
            domain_name=data.get('domain_name'),
            location=data.get('location'),
            compensation=data.get('compensation'),
            duration=data.get('duration'),
            description=data.get('description'),
            required_skills=str(data.get('required_skills')),
            field=data.get('field'),
            status='published',
            posted_at=datetime.utcnow()
        )
        db.session.add(new_job)
        db.session.commit()
        return jsonify({"status": "success", "message": "Job posted successfully"}), 201
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": str(e)}), 500

@admin_bp.route("/jobs", methods=["GET"])
@jwt_required()
def get_all_admin_jobs():
    """Fetches all jobs for the admin management table with applicant counts."""
    admin_id = get_jwt_identity()
    if not require_admin(admin_id):
        return jsonify({"error": "Unauthorized access"}), 403

    try:
        jobs = Job.query.order_by(Job.posted_at.desc()).all()
        job_list = []
        
        for job in jobs:
            job_list.append({
                "id": job.id,
                "title": job.title,
                "field": job.field,
                "location": job.location,
                "status": job.status,
                "posted_at": job.posted_at.strftime('%Y-%m-%d') if job.posted_at else None,
                "applicant_count": len(job.applications) if job.applications else 0,
                "applications": [{
                    "id": app.id,
                    "status": app.status,
                    "applicant_name": f"{app.user.first_name} {app.user.second_name}" if app.user else "Unknown",
                    "email": app.user.email if app.user else ""
                } for app in job.applications]
            })
            
        return jsonify(job_list), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@admin_bp.route("/jobs/<int:job_id>", methods=["DELETE"])
@jwt_required()
def delete_admin_job(job_id):
    """Deletes a job posting and its associated references."""
    admin_id = get_jwt_identity()
    if not require_admin(admin_id):
        return jsonify({"error": "Unauthorized access"}), 403

    try:
        job = Job.query.get_or_404(job_id)
        db.session.delete(job)
        db.session.commit()
        return jsonify({"status": "success", "message": "Job deleted successfully"}), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": str(e)}), 500
