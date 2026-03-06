from flask import Blueprint, request, jsonify
from utils.mailer import send_approval_email
from flask_jwt_extended import jwt_required, get_jwt_identity
from models.Job import Job
from models.JobApplication  import JobApplication
from models.user import User
from models.domain import Domain
from models.domainowner import DomainOwner
from extensions import db
from datetime import datetime, timedelta
import secrets
import string

AdminCareers_bp = Blueprint('adminCareers', __name__)


@AdminCareers_bp.route('/jobs', methods=['POST'])
@jwt_required()
def create_job():
    admin_id = get_jwt_identity()
    user = User.query.get(admin_id)
    if not user or user.role != 'admin':
        return jsonify({"error": "Only admins can create jobs"}), 403
    data = request.get_json()
    required = ['title', 'description', 'field']
    missing = [f for f in required if f not in data or not data[f]]
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
            domain_id=data.get('domain_id'), 
            domain_owner_id=domain_owner_id,
            domain_name=data.get('domain_name'),       # custom name if no domain_id
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



@AdminCareers_bp.route('/jobs', methods=['GET'])
@jwt_required()
def list_admin_jobs():
    """
    ADMIN ONLY: View all jobs (for management)
    """
    admin_id = get_jwt_identity()
    domain_owner = DomainOwner.query.get(admin_id)
    user_admin = None
    if not domain_owner:
        user_admin = User.query.get(admin_id)
        if not user_admin or getattr(user_admin, 'role', None) != 'admin':
            return jsonify({"error": "Only admins can view jobs"}), 403
    
    jobs = Job.query.all()
    return jsonify({
        "total_jobs": len(jobs),
        "jobs": [job.to_dict() for job in jobs]
    }), 200


@AdminCareers_bp.route('/admin/applications', methods=['GET'])
@jwt_required()
def list_applications_for_review():
    """
    ADMIN ONLY: View all applications pending review
    """
    admin_id = get_jwt_identity()
    domain_owner = DomainOwner.query.get(admin_id)
    user_admin = None
    if not domain_owner:
        user_admin = User.query.get(admin_id)
        if not user_admin or getattr(user_admin, 'role', None) != 'admin':
            return jsonify({"error": "Only admins can view applications"}), 403

    results = db.session.query(
        JobApplication,
        Job.title.label('job_title'),
        Domain.domain_name.label('domain_name')
    
    ).join(Job, JobApplication.job_id ==Job.id)\
    .join(Domain,Job.domain_id ==Domain.id)\
    .filter(JobApplication.status == 'submitted').all()
    applications_data = []

    for app,job_title,domain_name in results:
        data = app.to_dict()
        data['job_title'] = job_title
        data['domain_name'] = domain_name 
        applications_data.append(data)


    
    return jsonify({
        "applications": applications_data
    }), 200


@AdminCareers_bp.route('/applications/<int:app_id>/approve', methods=['POST'])
@jwt_required()
def approve_application(app_id):
    """
    ADMIN ONLY: Approve a collector application and assign reference number
    """
    admin_id = get_jwt_identity()
    domain_owner = DomainOwner.query.get(admin_id)
    user_admin = None
    if not domain_owner:
        user_admin = User.query.get(admin_id)
        if not user_admin or getattr(user_admin, 'role', None) != 'admin':
            return jsonify({"error": "Only admins can approve applications"}), 403

    application = JobApplication.query.get_or_404(app_id)
    field_prefix = application.job.field[:4].upper()  if application.job.field else "SEMA"
    random_code = ''.join(secrets.choice(string.ascii_uppercase + string.digits) for _ in range(8))
    reference_number = f"{field_prefix}--{random_code}"
    
    
    application.status = 'approved'
    if domain_owner:
        application.reviewed_by_id = domain_owner.id
        application.reviewed_by_user_id = None
    else:
        application.reviewed_by_user_id = user_admin.id
        application.reviewed_by_id = None
    application.reviewed_at = datetime.now()
    application.reference_number_assigned = reference_number
    
    # If there's a domain linked to this job, create the assignment
    collector = User.query.filter_by(email = application.email).first()
    if collector:
        collector.reference_number = reference_number
        collector.is_verified =True 
    
    email_was_sent = send_approval_email(
        recipient_email=application.email,
        first_name=application.first_name,
        job_title = application.Job.title,
        ref_number = reference_number
    )

    db.session.commit()
    
    
    return jsonify({
        "message": "Application approved successfully",
        "collector_name": f"{collector.first_name} {collector.second_name}",
        "reference_number": reference_number,
        "job_title": application.job.title,
        "email_sent": email_was_sent
    }), 200


@AdminCareers_bp.route('/applications/<int:app_id>/reject', methods=['POST'])
@jwt_required()
def reject_application(app_id):
    admin_id = get_jwt_identity()
    domain_owner = DomainOwner.query.get(admin_id)
    user_admin = None
    if not domain_owner:
        user_admin = User.query.get(admin_id)
        if not user_admin or getattr(user_admin, 'role', None) != 'admin':
            return jsonify({"error": "Only admins can reject applications"}), 403

    application = JobApplication.query.get_or_404(app_id)
    data = request.json

    application.status = 'rejected'
    application.rejection_reason = data.get('rejection_reason', 'Application does not meet requirements')
    
    db.session.commit()
    
    # TODO: Send email to applicant with rejection reason
    
    return jsonify({
        "message": "Application rejected",
    }), 200



@AdminCareers_bp.route('/jobs', methods=['OPTIONS'])
@AdminCareers_bp.route('/applications', methods=['OPTIONS'])
def admin_careers_options():
    return '', 204  








