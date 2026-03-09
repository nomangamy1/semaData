from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from models.Job import Job
from models.JobApplication import JobApplication
from models.user import User
from models.domain import Domain
from models.domainowner import DomainOwner
from extensions import db
from datetime import datetime, timedelta
import secrets
import string

# ============================================
# PUBLIC ENDPOINTS (Careers Page)
# ============================================
careers_bp = Blueprint('careers', __name__)

@careers_bp.route('/careers', methods=['GET'])
def get_available_jobs():
    """
    PUBLIC: Get all published job opportunities
    Optional filtering by field, location, etc.
    """
    field = request.args.get('field')
    location = request.args.get('location')
    
    query = Job.query.filter_by(status='published')
    
    if field:
        query = query.filter_by(field=field)
    if location:
        query = query.filter_by(location=location)
    
    jobs = query.all()
    
    return jsonify({
        "total_available": len(jobs),
        "jobs": [job.to_dict() for job in jobs]
    }), 200


@careers_bp.route('/careers/<int:job_id>', methods=['GET'])
def get_job_detail(job_id):
    """
    PUBLIC: Get detailed information about a specific job
    """
    job = Job.query.get(job_id)
    if not job or job.status != 'published':
        return jsonify({"error": "Job not found"}), 404
    
    return jsonify(job.to_dict()), 200


@careers_bp.route('/careers/fields', methods=['GET'])
def get_job_fields():
    """
    PUBLIC: Get all available job fields for filtering
    """
    fields = db.session.query(Job.field).filter_by(status='published').distinct().all()
    field_list = [f[0] for f in fields]
    
    return jsonify({
        "available_fields": field_list
    }), 200


# ============================================
# COLLECTOR ENDPOINTS (Apply for Jobs)
# ============================================@careers_bp.route('/apply/<int:job_id>', methods=['POST'])
@careers_bp.route('/apply/<int:job_id>', methods=['POST'])
def apply_for_job(job_id):
    job = Job.query.get(job_id)
    if not job or job.status != 'published':
        return jsonify({"error": "Job not found or no longer available"}), 404

    # Get ALL data from form (text fields) and files (CV)
    first_name = request.form.get('first_name')
    second_name = request.form.get('second_name')
    email = request.form.get('email')
    relevant_experience = request.form.get('relevant_experience')
    cover_letter = request.form.get('cover_letter')  # optional

    cv_file = request.files.get('cv_file_path')  # matches frontend key

    # Validation
    if not all([first_name, second_name, email]):
        return jsonify({"error": "First name, last name, and email are required"}), 400

    # Prevent duplicate
    existing_app = JobApplication.query.filter_by(job_id=job_id, email=email).first()
    if existing_app:
        return jsonify({"error": "You have already applied for this job"}), 400

    # Save CV file
    cv_path = None
    if cv_file and cv_file.filename:
        import os
        upload_dir = 'uploads/cvs'
        os.makedirs(upload_dir, exist_ok=True)
        safe_email = email.replace('@', '_').replace('.', '_')
        filename = f"cv_{safe_email}_{job_id}_{cv_file.filename}"
        cv_path = os.path.join(upload_dir, filename)
        cv_file.save(cv_path)

    try:
        application = JobApplication(
            job_id=job_id,
            email=email,
            first_name=first_name,
            second_name=second_name,
            cover_letter=cover_letter,
            relevant_experience=relevant_experience,
            self_assessment_skills=[],  # add parsing later if needed
            cv_file_path=cv_path,
            status='submitted',
            applied_at=datetime.utcnow()
        )

        db.session.add(application)
        db.session.commit()

        return jsonify({
            "message": "Application submitted successfully",
            "application_id": application.id,
            "job_title": job.title,
            "status": "submitted",
            "next_step": "Admin will review your application and contact you within 48 hours"
        }), 201

    except Exception as e:
        db.session.rollback()
        print(f"Apply error: {str(e)}")
        return jsonify({"error": str(e)}), 500

@careers_bp.route('/my-application/<int:app_id>', methods=['GET'])
def get_application_status(app_id):
    """
    COLLECTOR: Check status of specific application
    """
    data = request.json
    email = data.get('email')
    
    application = JobApplication.query.get(app_id)
    if not application or application.email != email:
        return jsonify({"error": "Application not found or unauthorized access"}), 404
    
    response = {
        "application": application.to_dict(),
        "job": application.job.to_dict()
    }
    
    # If approved, show onboarding info
    if application.status == 'approved':
        response['onboarding'] = {
            "status": "approved",
            "reference_number": application.reference_number_assigned,
            "next_step": "You can now log in and start collecting data",
            "login_url": "https://semadata.app/login"
        }
    
    return jsonify(response), 200
