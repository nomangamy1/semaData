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

#THIS IS THE ADMIN DASHBOARD AND JOB MANAGEMENT ENDPOINTS FOR THE CAREERS PAGE. IT INCLUDES:

@AdminCareers_bp.route('/admin/jobs', methods=['POST'])
@jwt_required()
def create_job():
    """
    ADMIN ONLY: Create a new data collection job posting
    """
    admin_id = get_jwt_identity()
    
    # Verify admin is a DomainOwner (simplified check - you might want stricter admin role)
    admin = DomainOwner.query.get(admin_id)
    if not admin:
        return jsonify({"error": "Only admins can create jobs"}), 403
    
    data = request.json
    
    try:
        job = Job(
            title=data.get('title'),
            description=data.get('description'),
            field=data.get('field'),  # e.g., 'Agriculture', 'Health'
            specialization_required=data.get('specialization_required'),  # e.g., 'Agrovet Seller'
            required_skills=data.get('required_skills', []),  # List of skills
            min_experience_years=data.get('min_experience_years', 0),
            languages=data.get('languages', ['Swahili', 'English']),
            location=data.get('location'),
            estimated_submissions=data.get('estimated_submissions'),
            compensation=data.get('compensation'),
            duration=data.get('duration'),
            status='published',
            posted_at=datetime.now(),
        )
        
        db.session.add(job)
        db.session.commit()
        
        return jsonify({
            "message": "Job Deployed successfully",
            "job_id": job.id,
        }), 201
    
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": str(e)}), 400




@AdminCareers_bp.route('/admin/jobs', methods=['GET'])
@jwt_required()
def list_admin_jobs():
    """
    ADMIN ONLY: View all jobs (for management)
    """
    admin_id = get_jwt_identity()
    admin = DomainOwner.query.get(admin_id)
    if not admin:
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


@AdminCareers_bp.route('/admin/applications/<int:app_id>/approve', methods=['POST'])
@jwt_required()
def approve_application(app_id):
    """
    ADMIN ONLY: Approve a collector application and assign reference number
    """
    admin_id = get_jwt_identity()
    application = JobApplication.query.get_or_404(app_id)
    field_prefix = application.job.field[:4].upper()  if application.job.field else "SEMA"
    random_code = ''.join(secrets.choice(string.ascii_uppercase + string.digits) for _ in range(8))
    reference_number = f"{field_prefix}--{random_code}"
    
    # Update collector's reference_number in Users table
     # Auto-verify since they passed screening
    
    # Update application status
    application.status = 'approved'
    application.reviewed_by_id = admin_id
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


@AdminCareers_bp.route('/admin/applications/<int:app_id>/reject', methods=['POST'])
@jwt_required()
def reject_application(app_id):
    application = JobApplication.query.get_or_404(app_id)
    data = request.json

    application.status = 'rejected'
    application.rejection_reason = data.get('rejection_reason', 'Application does not meet requirements')
    
    db.session.commit()
    
    # TODO: Send email to applicant with rejection reason
    
    return jsonify({
        "message": "Application rejected",
    }), 200

