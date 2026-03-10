from flask import Blueprint, request, jsonify
from utils.mailer import send_approval_email
from flask_jwt_extended import jwt_required, get_jwt_identity
from models.Job import Job
from models.JobApplication import JobApplication
from models.user import User
from models.domain import Domain
from models.domainowner import DomainOwner
from extensions import db
from datetime import datetime
import secrets
import string

AdminCareers_bp = Blueprint('adminCareers', __name__)


def is_admin(identity):
    """Returns (user_admin, domain_owner) — at least one must be truthy."""
    domain_owner = DomainOwner.query.filter_by(id=identity).first()
    if domain_owner:
        return None, domain_owner
    user = User.query.filter_by(id=identity).first()
    if user and getattr(user, 'role', None) == 'admin':
        return user, None
    return None, None


# ── CREATE JOB ───────────────────────────────────────────────────────────────
@AdminCareers_bp.route('/jobs', methods=['POST'])
@jwt_required()
def create_job():
    admin_id = get_jwt_identity()
    user_admin, domain_owner = is_admin(admin_id)
    if not user_admin and not domain_owner:
        return jsonify({"error": "Only admins can create jobs"}), 403

    data = request.get_json()
    missing = [f for f in ['title', 'description', 'field'] if not data.get(f)]
    if missing:
        return jsonify({"error": f"Missing fields: {', '.join(missing)}"}), 400

    domain_id = data.get('domain_id')
    domain_owner_id = None
    if domain_id:
        domain = Domain.query.get(domain_id)
        if not domain:
            return jsonify({"error": "Domain not found"}), 404
        domain_owner_id = domain.owner_id

    try:
        job = Job(
            title=data['title'],
            domain_id=domain_id,
            domain_owner_id=domain_owner_id,
            domain_name=data.get('domain_name'),
            description=data['description'],
            field=data['field'],
            specialization_required=data.get('specialization_required'),
            required_skills=data.get('required_skills', []),
            min_experience_years=data.get('min_experience_years', 0),
            languages=data.get('languages', ['Swahili', 'English']),
            location=data.get('location'),
            estimated_submissions=data.get('estimated_submissions'),
            compensation=data.get('compensation'),
            duration=data.get('duration'),
            status='published',
            posted_at=datetime.utcnow(),
        )
        db.session.add(job)
        db.session.commit()
        return jsonify({
            "message": "Job deployed successfully",
            "job_id": job.id,
            "title": job.title
        }), 201
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": str(e)}), 400


# ── LIST JOBS ────────────────────────────────────────────────────────────────
@AdminCareers_bp.route('/jobs', methods=['GET'])
@jwt_required()
def list_admin_jobs():
    admin_id = get_jwt_identity()
    user_admin, domain_owner = is_admin(admin_id)
    if not user_admin and not domain_owner:
        return jsonify({"error": "Only admins can view jobs"}), 403

    jobs = Job.query.all()
    return jsonify({
        "total_jobs": len(jobs),
        "jobs": [job.to_dict() for job in jobs]
    }), 200


# ── LIST APPLICATIONS ────────────────────────────────────────────────────────
@AdminCareers_bp.route('/applications', methods=['GET'])
@jwt_required()
def list_applications_for_review():
    admin_id = get_jwt_identity()
    user_admin, domain_owner = is_admin(admin_id)
    if not user_admin and not domain_owner:
        return jsonify({"error": "Only admins can view applications"}), 403

    results = db.session.query(
        JobApplication,
        Job.title.label('job_title'),
        Domain.domain_name.label('domain_name')
    ).join(Job, JobApplication.job_id == Job.id)\
     .join(Domain, Job.domain_id == Domain.id)\
     .filter(JobApplication.status == 'submitted').all()

    applications_data = []
    for app, job_title, domain_name in results:
        data = app.to_dict()
        data['job_title']    = job_title
        data['domain_name']  = domain_name
        applications_data.append(data)

    return jsonify({"applications": applications_data}), 200


# ── APPROVE APPLICATION ──────────────────────────────────────────────────────
@AdminCareers_bp.route('/applications/<int:app_id>/approve', methods=['POST'])
@jwt_required()
def approve_application(app_id):
    admin_id = get_jwt_identity()
    user_admin, domain_owner = is_admin(admin_id)
    if not user_admin and not domain_owner:
        return jsonify({"error": "Only admins can approve applications"}), 403

    application = JobApplication.query.get_or_404(app_id)

    if application.status == 'approved':
        return jsonify({
            "message": "Already approved",
            "reference_number": application.reference_number_assigned
        }), 200

    # Generate application reference number — links applicant to this job
    field_prefix     = (application.job.field[:4].upper() if application.job and application.job.field else "SEMA")
    random_code      = ''.join(secrets.choice(string.ascii_uppercase + string.digits) for _ in range(8))
    reference_number = f"{field_prefix}--{random_code}"

    job       = Job.query.get(application.job_id)
    job_title = job.title if job else "Unknown Job"

    # ✅ Resolve domain for the welcome email
    domain      = Domain.query.get(job.domain_id) if job else None
    domain_name = domain.domain_name if domain else "SemaData"

    # Update application
    application.status                    = 'approved'
    application.reviewed_at               = datetime.utcnow()
    application.reference_number_assigned = reference_number

    if domain_owner:
        application.reviewed_by_id      = domain_owner.id
        application.reviewed_by_user_id = None
    else:
        application.reviewed_by_user_id = user_admin.id
        application.reviewed_by_id      = None

    # Resolve applicant name
    if application.first_name:
        collector_name = f"{application.first_name} {application.second_name or ''}".strip()
    else:
        collector_name = application.email

    # ✅ Send approval email with reference number + direct signup link
    frontend_url = "http://localhost:5173"  # swap for production URL
    signup_link  = f"{frontend_url}/signup?role=collector&ref={reference_number}"

    email_was_sent = send_approval_email(
        recipient_email=application.email,
        first_name=application.first_name or collector_name,
        job_title=job_title,
        ref_number=reference_number,
        domain_name=domain_name,
        signup_link=signup_link,
    )

    db.session.commit()

    return jsonify({
        "message":          "Application approved successfully",
        "collector_name":   collector_name,
        "reference_number": reference_number,
        "job_title":        job_title,
        "domain_name":      domain_name,
        "signup_link":      signup_link,
        "email_sent":       email_was_sent
    }), 200


# ── REJECT APPLICATION ───────────────────────────────────────────────────────
@AdminCareers_bp.route('/applications/<int:app_id>/reject', methods=['POST'])
@jwt_required()
def reject_application(app_id):
    admin_id = get_jwt_identity()
    user_admin, domain_owner = is_admin(admin_id)
    if not user_admin and not domain_owner:
        return jsonify({"error": "Only admins can reject applications"}), 403

    application = JobApplication.query.get_or_404(app_id)
    data = request.get_json() or {}

    application.status           = 'rejected'
    application.rejection_reason = data.get('rejection_reason', 'Application does not meet requirements')
    application.reviewed_at      = datetime.utcnow()

    db.session.commit()
    return jsonify({"message": "Application rejected"}), 200


# ── OPTIONS ──────────────────────────────────────────────────────────────────
@AdminCareers_bp.route('/jobs', methods=['OPTIONS'])
@AdminCareers_bp.route('/applications', methods=['OPTIONS'])
def admin_careers_options():
    return '', 204