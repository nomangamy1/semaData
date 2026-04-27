from flask import Blueprint, jsonify, request
from flask_jwt_extended import jwt_required, get_jwt_identity
from models import Domain, User, Dataset
from models.Job import Job
from models.JobApplication import JobApplication
from models.Feature import Feature
from extensions import db

UserDashboard_bp = Blueprint('User_Dashboard', __name__)


def _verify_collector(user_id):
    current_user_id = get_jwt_identity()
    if str(current_user_id) != str(user_id):
        return None, None, (jsonify({"error": "Unauthorized access"}), 403)
    user = User.query.get(user_id)
    if not user:
        return None, None, (jsonify({"error": "User not found"}), 404)
    if user.user_type != 'User':
        return None, None, (jsonify({"error": "Only collectors can access this endpoint"}), 403)
    # ✅ Resolve domain via application → job → domain
    application = JobApplication.query.filter_by(
        reference_number_assigned=user.reference_number,
        status='approved'
    ).first()
    if not application:
        return user, None, None  # user found but no domain yet
    job    = Job.query.get(application.job_id)
    domain = Domain.query.get(job.domain_id) if job else None
    return user, domain, None


@UserDashboard_bp.route('/UserDashboard', methods=['POST'])
def UserDashboard():
    return jsonify({"message": "This is the user dashboard endpoint"})


# ── COLLECTOR TASK ────────────────────────────────────────────
# Called by collectorHome.jsx on mount
# Returns: task description, features to capture, domain progress
@UserDashboard_bp.route('/collector/task', methods=['GET'])
@jwt_required()
def get_collector_task():
    current_user_id = get_jwt_identity()
    domain_id = request.args.get('domain_id')

    user = User.query.get(int(current_user_id))
    if not user or user.user_type != 'User':
        return jsonify({"error": "Collector not found"}), 404

    # Resolve domain via application chain
    application = JobApplication.query.filter_by(
        reference_number_assigned=user.reference_number,
        status='approved'
    ).first()
    if not application:
        return jsonify({"error": "No approved application found"}), 404

    job = Job.query.get(application.job_id)
    if not job:
        return jsonify({"error": "Assigned job not found"}), 404

    domain = Domain.query.get(job.domain_id)
    if not domain:
        return jsonify({"error": "Associated domain not found"}), 404

    # Validate domain_id matches if provided
    if domain_id and int(domain_id) != domain.id:
        return jsonify({"error": "Domain mismatch"}), 403

    if not domain.is_active:
        return jsonify({"error": "This domain is no longer active"}), 403

    # Get domain features
    features = [f.name for f in domain.domain_features] if hasattr(domain, 'domain_features') else []

    # Progress
    total_submissions = Dataset.query.filter_by(domain_id=domain.id).count()
    target_goal       = domain.target_goal or 1
    progress_percent  = round((total_submissions / target_goal) * 100, 1)

    # Collector's personal count
    my_submissions = Dataset.query.filter_by(
        domain_id=domain.id,
        collector_id=user.id
    ).count()

    return jsonify({
        "task_description": job.description or domain.domain_name,
        "job_title":        job.title,
        "domain_name":      domain.domain_name,
        "domain_id":        domain.id,
        "features":         features,
        "requirements":     domain.requirements,
        "compensation":     job.compensation,
        "progress": {
            "submitted": total_submissions,
            "target":    target_goal,
            "percent":   progress_percent,
            "my_submissions": my_submissions
        }
    }), 200


# ── COLLECTOR STATS ───────────────────────────────────────────
@UserDashboard_bp.route('/collector-stats/<int:user_id>', methods=['GET'])
@jwt_required()
def get_collector_stats(user_id):
    user, domain, err = _verify_collector(user_id)
    if err:
        return err
    if not domain:
        return jsonify({"error": "No domain assigned yet"}), 404
    if not domain.is_active:
        return jsonify({"error": "Assigned domain is inactive"}), 403

    total_team_collected  = Dataset.query.filter_by(domain_id=domain.id).count()
    buffered_target_goal  = domain.target_goal or 1
    remaining_goal        = max(buffered_target_goal - total_team_collected, 0)
    agent_count           = Dataset.query.filter_by(
        domain_id=domain.id
    ).distinct(Dataset.collector_id).count() or 1

    collector_currentDone     = Dataset.query.filter_by(
        domain_id=domain.id, collector_id=user.id
    ).count()
    collector_share_remaining = remaining_goal // agent_count
    calculated_goal           = collector_currentDone + collector_share_remaining

    individual_valid_contribution = Dataset.query.filter(
        Dataset.domain_id == domain.id,
        Dataset.collector_id == user.id,
        Dataset.status.in_(['AI_Passed', 'Verified'])
    ).count()

    return jsonify({
        "sessionData": {
            "name":   f"{user.first_name} {user.second_name}",
            "refNum": user.reference_number,
            "domain": domain.domain_name
        },
        "activeTask": {
            "title":       domain.domain_name,
            "targetCount": calculated_goal,
            "currentCount": individual_valid_contribution,
            "description": f"You are one of {agent_count} agent{'s' if agent_count != 1 else ''} assigned to this domain."
        },
        "progress": {
            "submitted": total_team_collected,
            "target":    buffered_target_goal,
            "percent":   round((total_team_collected / buffered_target_goal) * 100, 1)
        }
    }), 200


# ── ASSIGNED JOB ──────────────────────────────────────────────
@UserDashboard_bp.route('/collector-assigned-job/<int:user_id>', methods=['GET'])
@jwt_required()
def get_assigned_job(user_id):
    user, domain, err = _verify_collector(user_id)
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
            "id":                     job.id,
            "title":                  job.title,
            "description":            job.description,
            "field":                  job.field,
            "specialization_required": job.specialization_required,
            "required_skills":        job.required_skills,
            "location":               job.location,
            "estimated_submissions":  job.estimated_submissions,
            "compensation":           job.compensation,
            "duration":               job.duration,
            "domain_name":            domain.domain_name if domain else None,
            "starts_at":              approved_app.reviewed_at.isoformat() if approved_app.reviewed_at else None
        },
        "assignment": {
            "reference_number": approved_app.reference_number_assigned,
            "status":           "active",
            "assigned_on":      approved_app.reviewed_at.isoformat() if approved_app.reviewed_at else None,
            "approval_notes":   approved_app.approval_notes,
            "message":          "You are now authorized to collect data for this domain"
        }
    }), 200


# ── JOB HISTORY ───────────────────────────────────────────────
@UserDashboard_bp.route('/collector-job-history/<int:user_id>', methods=['GET'])
@jwt_required()
def get_collector_job_history(user_id):
    user, domain, err = _verify_collector(user_id)
    if err:
        return err

    applications = JobApplication.query.filter_by(applicant_id=user_id).all()
    return jsonify({
        "total_applications": len(applications),
        "applications": [
            {
                "id":               app.id,
                "job_title":        app.job.title,
                "job_field":        app.job.field,
                "specialization":   app.job.specialization_required,
                "status":           app.status,
                "applied_on":       app.applied_at.isoformat() if app.applied_at else None,
                "reviewed_on":      app.reviewed_at.isoformat() if app.reviewed_at else None,
                "rejection_reason": app.rejection_reason if app.status == 'rejected' else None,
                "reference_number": app.reference_number_assigned if app.status == 'approved' else None
            }
            for app in applications
        ]
    }), 200
