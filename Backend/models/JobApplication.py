from extensions import db
from datetime import datetime

class JobApplication(db.Model):
    __tablename__ = 'job_applications'
    
    id = db.Column(db.Integer, primary_key=True)
    job_id = db.Column(db.Integer, db.ForeignKey('jobs.id'), nullable=False)
    email = db.Column(db.String(120), nullable=False)
    first_name = db.Column(db.String(100), nullable=True)
    second_name = db.Column(db.String(100), nullable=True)
    applicant_id = db.Column(db.Integer, db.ForeignKey('Users.id'), nullable=True)
    cover_letter = db.Column(db.Text)
    cv_file_path = db.Column(db.String(500))  # Path to uploaded CV
    relevant_experience = db.Column(db.Text)  # Description of experience
    self_assessment_skills = db.Column(db.JSON)  # Skills they claim to have
    status = db.Column(db.String(50), default='submitted')  # 'submitted', 'under_review', 'approved', 'rejected'
    applied_at = db.Column(db.DateTime, default=datetime.now)
    reviewed_at = db.Column(db.DateTime, nullable=True)
    
    # Admin Review
    reviewed_by_id = db.Column(db.Integer, db.ForeignKey('DomainOwner.id'), nullable=True)
    reviewed_by_user_id = db.Column(db.Integer, db.ForeignKey('Users.id'), nullable=True)
    rejection_reason = db.Column(db.Text)
    approval_notes = db.Column(db.Text)
    
    # After Approval
    reference_number_assigned = db.Column(db.String(255), nullable=True)  # Generated on approval
    assigned_user_id = db.Column(db.Integer, db.ForeignKey('Users.id'), nullable=True)  # User who will collect data
    
    # Relationships
    applicant = db.relationship('User', foreign_keys=[applicant_id])
    reviewed_by = db.relationship('DomainOwner', foreign_keys=[reviewed_by_id])
    reviewed_by_user = db.relationship('User', foreign_keys=[reviewed_by_user_id])
    
    def to_dict(self):
        return {
            'id': self.id,
            'job_id': self.job_id,
            'job_title': self.job.title,
            'applicant_name': f"{self.applicant.first_name if self.applicant else 'Guest'} {self.applicant.second_name if self.applicant else 'Guest'}".strip(),
            'applicant_email': self.applicant.email if self.applicant else self.email,
            'status': self.status,
            'applied_at': self.applied_at.isoformat() if self.applied_at else None,
            'reviewed_at': self.reviewed_at.isoformat() if self.reviewed_at else None,
            'approval_notes': self.approval_notes,
            'rejection_reason': self.rejection_reason,
            'reference_number': self.reference_number_assigned,
            'reviewed_by_domain_owner': self.reviewed_by.id if self.reviewed_by else None,
            'reviewed_by_user': self.reviewed_by_user.id if self.reviewed_by_user else None
        }
