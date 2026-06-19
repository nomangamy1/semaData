from flask import jsonify, request, Blueprint
from flask_jwt_extended import jwt_required, get_jwt_identity
from models.domain import Domain
from models.user import User
from models.Job import Job
from models.domainowner import DomainOwner
from models.JobApplication import JobApplication
import string
import secrets
from flask import Blueprint, request, jsonify, current_app
from flask_jwt_extended import jwt_required, get_jwt_identity
from models.user import User
from extensions import db

admin_bp = Blueprint("admin", __name__)

def require_admin(identity):
    user = User.query.filter(User.id == int(identity)).first()
    if user and user.role == "admin":
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
            "active_jobs":           Job.query.filter_by(status="published").count(),
            "total_collectors":      total_collectors,
            "total_domains":         Domain.query.count(),
        }
    }), 200

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
                "id":           o.id,
                "name":         f"{o.first_name} {getattr(o, 'last_name', '') or ''}".strip(),
                "email":        o.email,
                "domain_count": len(o.domains) if hasattr(o, "domains") else 0,
            }
            for o in owners
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
        "id":                d.id,
        "name":              d.domain_name,
        "status":            d.payment_status,
        "is_active":         d.is_active,
        "owner_id":          d.owner_id,
        "target":            d.target_goal,
        "reference_number":  d.reference_number or "Pending payment",
    } for d in domains]), 200
# ─── DISBURSEMENT ADMINISTRATION SYSTEM (MANUAL CASH OUTS) ───

@admin_bp.route("/payouts/pending", methods=["GET"])
@jwt_required()
def get_pending_payouts():
    """
    Lists all collector withdrawal intents waiting for manual 
    mobile money (M-Pesa) or PayPal transfers.
    """
    admin_id = get_jwt_identity()
    if not require_admin(admin_id):
        return jsonify({"error": "Unauthorized"}), 403

    from models.payments import AdminDisbursement
    
    pending_list = AdminDisbursement.query.filter_by(status="PENDING").all()
    
    output = []
    for req in pending_list:
        # Match target coordinates dynamically depending on setting selection
        target_coordinate = req.collector.mpesa_number if req.collector.preferred_gateway == "MPESA" else req.collector.paypal_email
        
        output.append({
            "id": req.id,
            "collector_id": req.collector_id,
            "username": req.collector.username,
            "amount": req.amount,
            "initiated_at": req.initiated_at.strftime('%Y-%m-%d %H:%M:%S'),
            "preferred_gateway": req.collector.preferred_gateway or "MPESA",
            "target_coordinate": target_coordinate or "Not configured"
        })
        
    return jsonify(output), 200


@admin_bp.route("/payouts/approve/<int:request_id>", methods=["POST"])
@jwt_required()
def approve_payout(request_id):
    """
    Flags a payout request as 'DISBURSED' after the administrator 
    manually handles the real-world transaction.
    """
    admin_id = get_jwt_identity()
    if not require_admin(admin_id):
        return jsonify({"error": "Unauthorized"}), 403

    from models.payments import AdminDisbursement
    
    data = request.get_json(silent=True) or {}
    txn_note = data.get("transaction_note", "").strip()  # e.g., M-Pesa Ref: RFI9182HU3

    payout_record = AdminDisbursement.query.get(request_id)
    if not payout_record:
        return jsonify({"error": "Disbursement log record matching target ID not found."}), 404
        
    if payout_record.status == "DISBURSED":
        return jsonify({"message": "This layout instance has already been processed."}), 400

    try:
        payout_record.status = "DISBURSED"
        payout_record.processed_at = datetime.utcnow()
        payout_record.transaction_note = txn_note
        
        db.session.commit()
        return jsonify({
            "status": "success", 
            "message": f"Successfully updated request {request_id} to DISBURSED."
        }), 200
        
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": f"Database mutation crash tracking block: {str(e)}"}), 500



@admin_bp.route("/manage-team/invite", methods=["POST"])
@jwt_required()
def invite_reviewer():
    """
    Allows an existing administrator to instantly provision a new secure account
    for a reviewer without accessing the database command line.
    """
    admin_id = get_jwt_identity()
    if not require_admin(admin_id):
        return jsonify({"error": "Unauthorized. Higher administrative clearance required."}), 403

    data = request.get_json() or {}
    email = data.get("email", "").strip().lower()
    first_name = data.get("first_name", "").strip()
    second_name = data.get("second_name", "").strip()

    if not email or not first_name or not second_name:
        return jsonify({"error": "Missing required fields: email, first_name, and second_name are mandatory."}), 400

    # Prevent duplicates
    if User.find_by_email(email):
        return jsonify({"error": f"An account with the email {email} already exists in the system."}), 400

    try:
        # 1. Generate a secure, random temporary password
        alphabet = string.ascii_letters + string.digits + "!@#$%^&*"
        temp_password = ''.join(secrets.choice(alphabet) for _ in range(12))

        # 2. Create the user object with admin permissions for the verification pipeline
        new_reviewer = User(
            email=email,
            first_name=first_name,
            second_name=second_name,
            user_type='admin',  # Maps to your admin panel logic
            role='admin',       # Mirrors user_type for JWT verification
            is_verified=True    # Pre-vetted by the super-admin
        )
        new_reviewer.set_password(temp_password)
        new_reviewer.create()

        # 3. Dynamic Notification Log 
        # In production, hook this up to your SendGrid/Mailgun service to email the credentials.
        current_app.logger.info(f"SUCCESS: Created reviewer account for {email} with temp password: {temp_password}")

        return jsonify({
            "status": "success",
            "message": f"Account for {first_name} successfully created!",
            "credentials": {
                "email": email,
                "temporary_password": temp_password
            }
        }), 201

    except Exception as e:
        db.session.rollback()
        return jsonify({"error": f"Internal system fault provisioning reviewer account: {str(e)}"}), 500
