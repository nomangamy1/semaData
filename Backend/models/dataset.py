from extensions import db
from datetime import datetime 


status = ['Initial','pending','rejected']

class Dataset(db.Model):
    __tablename__ = 'datasets'
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    owner_id = db.Column(db.Integer, db.ForeignKey('DomainOwner.id'), nullable=True, index=True)
    domain_id = db.Column(db.Integer, db.ForeignKey('domain.id'), nullable=False, index=True)
    collector_id = db.Column(db.Integer, nullable=False)
    ref_number = db.Column(db.String(64), nullable=False)
    description = db.Column(db.Text, nullable=True)
    combined_text = db.Column(db.Text, nullable=True)
    segmented_text = db.Column(db.JSON, nullable=True)
    
    # Matching your statuses dynamically ('Initial', 'pending', 'Verified', 'Rejected')
    status = db.Column(db.String(50), nullable=False, default='pending')
    
    # ─── NEW QUALITY ASSURANCE AUDIT COLUMNS ───
    rejection_reason = db.Column(db.String(64), nullable=True) # e.g., 'HIGH_NULL_VALUES', 'POOR_AUDIO_QUALITY'
    reviewer_notes = db.Column(db.Text, nullable=True)

    record_count = db.Column(db.Integer, default=0)
    Ai_confidence = db.Column(db.Float) # Matching your capital 'A' layout case exactly
    audio_file_path = db.Column(db.String(255), nullable=True)
    created_at = db.Column(db.DateTime, nullable=False, index=True, default=db.func.current_timestamp())
    updated_at = db.Column(db.DateTime, nullable=False, default=db.func.current_timestamp(), onupdate=db.func.current_timestamp())

    __table_args__ = (
        db.Index('ix_dataset_owner_domain', 'owner_id', 'domain_id'),
    )

    contributions = db.relationship('Transcription', backref='dataset', lazy=True)
