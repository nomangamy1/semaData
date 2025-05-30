from flask import Blueprint, jsonify, request
from flask_jwt_extended import jwt_required, get_jwt_identity
from models import Domain, User, Dataset
from models.Job import Job
from models.JobApplication import JobApplication
from extensions import db

UserDashboard_bp = Blueprint("User_Dashboard", __name__)


def _verify_collector(user_id):
    current_user_id = get_jwt_identity()
    if str(current_user_id) != str(user_id):
        return None, None, (jsonify({"error": "Unauthorized access"}), 403)
    user = User.query.get(user_id)
    if not user:
        return None, None, (jsonify({"error": "User not found"}), 404)
    if user.user_type != "User":
        return None, None, (jsonify({"error": "Only collectors can access this endpoint"}), 403)
    application = JobApplication.query.filter_by(
        reference_number_assigned=user.reference_number,
        status="approved"
    ).first()
    if not application:
        return user, None, None
    job = Job.query.get(application.job_id)
    domain = Domain.query.get(job.domain_id) if job else None
    return user, domain, None


def _get_collector_domain(user):
    application = JobApplication.query.filter_by(
        reference_number_assigned=user.reference_number,
        status="approved"
    ).first()
    if not application:
        return None, None, None
    job = Job.query.get(application.job_id)
    domain = Domain.query.get(job.domain_id) if job else None
    return application, job, domain


def _count_assigned_collectors(domain_id):
    job_ids = [j.id for j in Job.query.filter_by(domain_id=domain_id).all()]
    if not job_ids:
        return 1
    count = JobApplication.query.filter(
        JobApplication.job_id.in_(job_ids),
        JobApplication.status == "approved",
        JobApplication.assigned_user_id.isnot(None)
    ).count()
    return count or 1


def _get_progress(user_id, domain):
    total_collectors = _count_assigned_collectors(domain.id)
    per_collector_quota = (domain.target_goal or 0) // total_collectors
    my_submissions = Dataset.query.filter_by(
        domain_id=domain.id, collector_id=user_id
    ).count()
    my_remaining = max(per_collector_quota - my_submissions, 0)
    my_percent = round((my_submissions / per_collector_quota) * 100, 1) if per_collector_quota else 0
    total_domain = Dataset.query.filter_by(domain_id=domain.id).count()
    target = domain.target_goal or 1
    domain_percent = round((total_domain / target) * 100, 1)
    return {
        "my_quota": {
            "target": per_collector_quota,
            "submitted": my_submissions,
            "remaining": my_remaining,
            "percent": my_percent
        },
        "domain_progress": {
            "target": target,
            "submitted": total_domain,
            "percent": domain_percent,
            "total_collectors": total_collectors
        }
    }


@UserDashboard_bp.route("/UserDashboard", methods=["POST"])
def UserDashboard():
    return jsonify({"message": "User dashboard endpoint"})


@UserDashboard_bp.route("/collector/task", methods=["GET"])
@jwt_required()
def get_collector_task():
    current_user_id = get_jwt_identity()
    domain_id_param = request.args.get("domain_id")
    user = User.query.get(int(current_user_id))
    if not user or user.user_type != "User":
        return jsonify({"error": "Collector not found"}), 404
    application, job, domain = _get_collector_domain(user)
    if not application:
        return jsonify({"error": "No approved application found"}), 404
    if not job:
        return jsonify({"error": "Assigned job not found"}), 404
    if not domain:
        return jsonify({"error": "Associated domain not found"}), 404
    if domain_id_param and int(domain_id_param) != domain.id:
        return jsonify({"error": "Domain mismatch"}), 403
    if not domain.is_active:
        return jsonify({"error": "Domain is no longer active"}), 403
    features = [f.name for f in domain.domain_features] if hasattr(domain, "domain_features") else []
    progress = _get_progress(user.id, domain)
    return jsonify({
        "task_description": job.description or domain.domain_name,
        "job_title":        job.title,
        "domain_name":      domain.domain_name,
        "domain_id":        domain.id,
        "features":         features,
        "requirements":     domain.requirements,
        "compensation":     job.compensation,
        "my_quota":         progress["my_quota"],
        "domain_progress":  progress["domain_progress"]
    }), 200


@UserDashboard_bp.route("/collector-stats/<int:user_id>", methods=["GET"])
@jwt_required()
def get_collector_stats(user_id):
    user, domain, err = _verify_collector(user_id)
    if err:
        return err
    if not domain:
        return jsonify({"error": "No domain assigned yet"}), 404
    if not domain.is_active:
        return jsonify({"error": "Domain is inactive"}), 403
    progress = _get_progress(user.id, domain)
    individual_valid = Dataset.query.filter(
        Dataset.domain_id == domain.id,
        Dataset.collector_id == user.id,
        Dataset.status.in_(["AI_Passed", "Verified"])
    ).count()
    return jsonify({
        "sessionData": {
            "name":   f"{user.first_name} {user.second_name}",
            "refNum": user.reference_number,
            "domain": domain.domain_name
        },
        "activeTask": {
            "title":        domain.domain_name,
            "targetCount":  progress["my_quota"]["target"],
            "currentCount": individual_valid,
            "remaining":    progress["my_quota"]["remaining"],
            "description":  "You are 1 of " + str(progress["domain_progress"]["total_collectors"]) + " collectors."
        },
        "my_quota":        progress["my_quota"],
        "domain_progress": progress["domain_progress"]
    }), 200


@UserDashboard_bp.route("/collector-assigned-job/<int:user_id>", methods=["GET"])
@jwt_required()
def get_assigned_job(user_id):
    user, domain, err = _verify_collector(user_id)
    if err:
        return err
    approved_app = JobApplication.query.filter_by(
        assigned_user_id=user_id, status="approved"
    ).first()
    if not approved_app:
        return jsonify({"error": "No approved job assignment found"}), 404
    job = approved_app.job
    return jsonify({
        "job": {
            "id":                      job.id,
            "title":                   job.title,
            "description":             job.description,
            "field":                   job.field,
            "specialization_required": job.specialization_required,
            "required_skills":         job.required_skills,
            "location":                job.location,
            "compensation":            job.compensation,
            "duration":                job.duration,
            "domain_name":             domain.domain_name if domain else None,
            "starts_at":               approved_app.reviewed_at.isoformat() if approved_app.reviewed_at else None
        },
        "assignment": {
            "reference_number": approved_app.reference_number_assigned,
            "status":           "active",
            "assigned_on":      approved_app.reviewed_at.isoformat() if approved_app.reviewed_at else None,
            "message":          "You are authorized to collect data for this domain"
        }
    }), 200


@UserDashboard_bp.route("/collector-job-history/<int:user_id>", methods=["GET"])
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
                "status":           app.status,
                "applied_on":       app.applied_at.isoformat() if app.applied_at else None,
                "reviewed_on":      app.reviewed_at.isoformat() if app.reviewed_at else None,
                "rejection_reason": app.rejection_reason if app.status == "rejected" else None,
                "reference_number": app.reference_number_assigned if app.status == "approved" else None
            }
            for app in applications
        ]
    }), 200
