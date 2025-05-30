from flask import jsonify, request, Blueprint
from flask_jwt_extended import jwt_required, get_jwt_identity
from models.domain import Domain
from models.user import User
from models.Job import Job
from models.domainowner import DomainOwner
from models.JobApplication import JobApplication

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
