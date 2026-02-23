from flask import jsonify, request,Blueprint
from flask_jwt_extended import jwt_required, get_jwt_identity

from models.domain import Domain
from models.user import User
from models.Job import Job
from models.domainowner import DomainOwner
from models.JobApplication import JobApplication

admin_bp = Blueprint('admin', __name__)
@admin_bp.route('/admin/dashboard-stats', methods=['GET'])
@jwt_required()
def get_dashboard_stats():
    """
    ADMIN ONLY: Get key statistics for the admin dashboard
    """
    admin_id = get_jwt_identity()
    admin = User.query.get(admin_id)
    if not admin:
        return jsonify({"error": "Unauthorized access"}), 403
    
    pending_apps = JobApplication.query.filter_by(status='submitted').count()
    active_jobs = Job.query.filter_by(status='published').count()
    total_users = User.query.count()
    total_domains = Domain.query.count()
    total_collectors = User.query.filter(User.reference_number != None).count()
    return jsonify({
        "stats": {
            "pending_applications": pending_apps,
            "active_jobs": active_jobs,
            "total_collectors": total_collectors,
        }
    }), 200

@admin_bp.route('/admin/domain-owners', methods=['GET'])
@jwt_required()
def get_all_domain_owners():
    # Verify Admin Identity here
    owners = DomainOwner.query.all()
    # We return basic info plus the count of domains they own
    return jsonify({
        "domain_owners": [
            {
                "id": o.id,
                "name": f"{o.first_name} {o.second_name}",
                "organization": o.organization_name,
                "email": o.email,
                "domain_count": len(o.domains) 
            } for o in owners
        ]
    }), 200