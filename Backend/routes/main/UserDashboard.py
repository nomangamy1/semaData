from flask import Blueprint, jsonify, request
from flask_jwt_extended import jwt_required, get_jwt_identity
from models import Domain, User, Dataset
from models.Job import Job
from models.JobApplication import JobApplication
from extensions import db

UserDashboard_bp = Blueprint('User_Dashboard', __name__)


def _verify_collector(user_id):
    """
    Helper: verifies JWT identity matches the requested user_id,
    and that the user is a collector.
    Returns (user, error_response) — if error_response is not None, return it.
    """
    current_user_id = get_jwt_identity()  # always a string

    # ✅ Compare as strings — JWT identity is always a string
    if str(current_user_id) != str(user_id):
        return None, (jsonify({"error": "Unauthorized access"}), 403)

    user = User.query.get(user_id)
    if not user:
        return None, (jsonify({"error": "User not found"}), 404)

    if user.user_type != 'User':
        return None, (jsonify({"error": "Only collectors can access this endpoint"}), 403)

    return user, None


@UserDashboard_bp.route('/UserDashboard', methods=['POST'])
def UserDashboard():
    return jsonify({"message": "This is the user dashboard endpoint"})


@UserDashboard_bp.route('/collector-stats/<int:user_id>', methods=['GET'])
@jwt_required()
def get_collector_stats(user_id):
    user, err = _verify_collector(user_id)
    if err:
        return err

    assigned_domain = Domain.query.filter_by(reference_number=user.reference_number).first()
    if not assigned_domain:
        return jsonify({"error": "No domain assigned"}), 404

    if not assigned_domain.is_active:
        return jsonify({"error": "Assigned domain is inactive"}), 403

    buffered_target_goal = assigned_domain.target_goal
    total_team_collected = Dataset.query.filter_by(domain_id=assigned_domain.id).count()
    remaining_goal = max(buffered_target_goal - total_team_collected, 0)

    # ✅ Count distinct collectors — avoid division by zero
    agent_count = Dataset.query.filter_by(
        domain_id=assigned_domain.id
    ).distinct(Dataset.collector_id).count() or 1

    collector_currentDone = Dataset.query.filter_by(
        domain_id=assigned_domain.id, collector_id=user.id
    ).count()

    collector_share_remaining = remaining_goal // agent_count
    calculated_goal = collector_currentDone + collector_share_remaining

    individual_valid_contribution = Dataset.query.filter(
        Dataset.domain_id == assigned_domain.id,
        Dataset.collector_id == user.id,
        Dataset.status.in_(['AI_Passed', 'Verified'])
    ).count()

    return jsonify({
        "sessionData": {
            "name": f"{user.first_name} {user.second_name}",
            "refNum": user.reference_number,
            "domain": assigned_domain.domain_name
        },
        "activeTask": {
            "title": assigned_domain.domain_name,
            "targetCount": calculated_goal,
            "currentCount": individual_valid_contribution,
            "description": f"You are one of {agent_count} agent{'s' if agent_count != 1 else ''} assigned to this domain."
        }
    }), 200


@UserDashboard_bp.route('/collector-assigned-job/<int:user_id>', methods=['GET'])
@jwt_required()
def get_assigned_job(user_id):
    user, err = _verify_collector(user_id)
    if err:
        return err

    approved_app = JobApplication.query.filter_by(
        assigned_user_id=user_id, status='approved'
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
    user, err = _verify_collector(user_id)
    if err:
        return err

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