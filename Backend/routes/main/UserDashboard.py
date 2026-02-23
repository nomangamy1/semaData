from flask import Blueprint,jsonify,request
from flask_jwt_extended import jwt_required, get_jwt_identity
from models import Domain,User,Dataset
from models.Job import  Job
from models.JobApplication import JobApplication
from extensions import db 



UserDashboard_bp = Blueprint('User_Dashboard',__name__)

@UserDashboard_bp.route('/UserDashboard',methods=['POST'])
def UserDashboard():
    return jsonify({"message":"This is the user dashboard endpoint"})




    
@UserDashboard_bp.route('/collector-stats/<int:user_id>',methods=['GET'])
@jwt_required()
def get_collector_stats(user_id):
    """
    Retrieve collector stats with strict authorization verification.
    SECURITY: Ensures the authenticated user can only access their own stats.
    """
    # SECURITY: Get the authenticated user from JWT
    current_user_id = get_jwt_identity()
    
    # SECURITY: Verify the requesting user is accessing their own stats
    if current_user_id != user_id:
        return jsonify({"error": "Unauthorized access to collector stats"}), 403
    
    # Fetch the collector
    user = User.query.get_or_404(user_id)
    
    # SECURITY: Ensure this is a collector/user (not a domain owner trying to impersonate)
    if user.user_type != 'User':
        return jsonify({"error": "Only collectors can access this endpoint"}), 403

    # Get the domain assigned via reference_number
    assigned_domain = Domain.query.filter_by(reference_number=user.reference_number).first()

    if not assigned_domain:
        return jsonify({"error":"No domain assigned!!"}),404
    
    # SECURITY: Verify domain is active and accepts collectors
    if not assigned_domain.is_active:
        return jsonify({"error": "Assigned domain is inactive"}), 403
    
    buffered_target_goal = assigned_domain.target_goal

    total_team_collected = Dataset.query.filter_by(domain_id=assigned_domain.id).count()
    remaining_goal = max(buffered_target_goal - total_team_collected, 0)  # Ensure it doesn't go negative
    agent_count = Dataset.query.filter_by(domain_id=assigned_domain.id).distinct(Dataset.collector_id).count()
    
    collector_currentDone = Dataset.query.filter_by(domain_id=assigned_domain.id, collector_id=user.id).count()
    collectorShareRemaining = remaining_goal // max(agent_count,1)
    calculated_goal =collector_currentDone + collectorShareRemaining # Avoid division by zero
    


    individual_valid_contribution = Dataset.query.filter(
        Dataset.domain_id == assigned_domain.id,
        Dataset.collector_id == user.id,
        Dataset.status.in_(['AI_Passed', 'Verified'])
    ).count()

    return jsonify({
        "sessionData":{
            "name": f"{user.first_name} {user.second_name}",
            "refNum": user.reference_number,
            "domain": assigned_domain.domain_name
        },
        "activeTask": {
            "title": assigned_domain.domain_name,
            "targetCount": calculated_goal, 
            "currentCount": individual_valid_contribution,
            "description": f"You are one of {agent_count} agents assigned to this domain."
        }

    })


@UserDashboard_bp.route('/collector-assigned-job/<int:user_id>', methods=['GET'])
@jwt_required()
def get_assigned_job(user_id):
    """
    Get the approved job assignment for a collector.
    Shows job details and assignment status.
    """
    current_user_id = get_jwt_identity()
    
    if current_user_id != user_id:
        return jsonify({"error": "Unauthorized access"}), 403
    
    collector = User.query.get_or_404(user_id)
    
    if collector.user_type != 'User':
        return jsonify({"error": "Only collectors can access this endpoint"}), 403
    
    # Get the approved job application for this collector
    approved_app = JobApplication.query.filter_by(
        assigned_user_id=user_id,
        status='approved'
    ).first()
    
    if not approved_app:
        return jsonify({"error": "No approved job assignment found"}), 404
    
    job = approved_app.job
    
    return jsonify({
        "job": {
            "id": job.id,
            "title": job.title,
            "description": job.description,
            "field": job.field,
            "specialization_required": job.specialization_required,
            "required_skills": job.required_skills,
            "location": job.location,
            "estimated_submissions": job.estimated_submissions,
            "compensation": job.compensation,
            "duration": job.duration,
            "starts_at": approved_app.reviewed_at.isoformat() if approved_app.reviewed_at else None
        },
        "assignment": {
            "reference_number": approved_app.reference_number_assigned,
            "status": "active",
            "assigned_on": approved_app.reviewed_at.isoformat() if approved_app.reviewed_at else None,
            "approval_notes": approved_app.approval_notes,
            "message": "You are now authorized to collect data for this domain"
        }
    }), 200


@UserDashboard_bp.route('/collector-job-history/<int:user_id>', methods=['GET'])
@jwt_required()
def get_collector_job_history(user_id):
    """
    Get all job applications (past and current) for a collector
    """
    current_user_id = get_jwt_identity()
    
    if current_user_id != user_id:
        return jsonify({"error": "Unauthorized access"}), 403
    
    collector = User.query.get_or_404(user_id)
    
    applications = JobApplication.query.filter_by(applicant_id=user_id).all()
    
    return jsonify({
        "total_applications": len(applications),
        "applications": [
            {
                "id": app.id,
                "job_title": app.job.title,
                "job_field": app.job.field,
                "specialization": app.job.specialization_required,
                "status": app.status,
                "applied_on": app.applied_at.isoformat() if app.applied_at else None,
                "reviewed_on": app.reviewed_at.isoformat() if app.reviewed_at else None,
                "rejection_reason": app.rejection_reason if app.status == 'rejected' else None,
                "reference_number": app.reference_number_assigned if app.status == 'approved' else None
            }
            for app in applications
        ]
    }), 200
