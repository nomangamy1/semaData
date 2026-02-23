"""
Data Collection Job Model
Represents available data collection opportunities posted by semaData admin
"""
from extensions import db
from datetime import datetime

class Job(db.Model):
    __tablename__ = 'jobs'
    
    id = db.Column(db.Integer, primary_key=True)
    
    # Job Basics
    title = db.Column(db.String(255), nullable=False)  # e.g., "Agrovet Sellers - Farm Input Study"
    description = db.Column(db.Text, nullable=False)
    field = db.Column(db.String(100), nullable=False)  # e.g., "Agriculture", "Health", "Education"
    
    # Domain Association
    domain_id = db.Column(db.Integer, db.ForeignKey('domain.id'), nullable=True)  # Link to domain if pre-created
    domain_owner_id = db.Column(db.Integer, db.ForeignKey('DomainOwner.id'), nullable=True)
    
    # Requirements & Specialization
    specialization_required = db.Column(db.String(255), nullable=False)  # e.g., "Agrovet Seller", "Veterinarian"
    required_skills = db.Column(db.JSON)  # e.g., ["Agricultural knowledge", "Customer interaction"]
    min_experience_years = db.Column(db.Integer, default=0)
    languages = db.Column(db.JSON)  # e.g., ["Swahili", "English"]
    
    # Job Details
    location = db.Column(db.String(255), nullable=False)  # Geographic scope
    estimated_submissions = db.Column(db.Integer)  # Target data points
    compensation = db.Column(db.String(255))  # Payment structure
    duration = db.Column(db.String(100))  # e.g., "2 weeks", "ongoing"
    
    # Status
    status = db.Column(db.String(50), default='draft')  # 'draft', 'published', 'closed', 'archived'
    posted_at = db.Column(db.DateTime, default=datetime.now)
    closes_at = db.Column(db.DateTime, nullable=True)
    
    # Relationships
    applications = db.relationship('JobApplication', backref='job', lazy=True, cascade='all, delete-orphan')
    
    def to_dict(self):
        return {
            'id': self.id,
            'title': self.title,
            'description': self.description,
            'field': self.field,
            'specialization_required': self.specialization_required,
            'required_skills': self.required_skills,
            'min_experience_years': self.min_experience_years,
            'languages': self.languages,
            'location': self.location,
            'estimated_submissions': self.estimated_submissions,
            'compensation': self.compensation,
            'duration': self.duration,
            'status': self.status,
            'posted_at': self.posted_at.isoformat() if self.posted_at else None,
            'closes_at': self.closes_at.isoformat() if self.closes_at else None,
            'applications_count': len(self.applications)
        }

