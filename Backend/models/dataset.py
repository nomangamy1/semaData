from extensions import db
from datetime import datetime 


status = ['Initial','pending','rejected']

class Dataset(db.Model):
    __tablename__ = 'datasets'
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    domain_id = db.Column(db.Integer, db.ForeignKey('domain.id'), nullable=False, index=True)
    collector_id = db.Column(db.Integer, nullable=False)
    ref_number = db.Column(db.String(64), nullable=False)
    description = db.Column(db.Text, nullable=True)
    combined_text = db.Column(db.Text, nullable=True)
    segmented_text = db.Column(db.JSON, nullable=True)
    status = db.Column(db.String(50), nullable=False, default='Initial')
    record_count = db.Column(db.Integer, default=0)
    Ai_confidence = db.Column(db.Float)
    audio_file_path = db.Column(db.String(255), nullable=True)
    created_at = db.Column(db.DateTime, nullable=False, index=True, default=db.func.current_timestamp())
    updated_at = db.Column(db.DateTime, nullable=False, default=db.func.current_timestamp(), onupdate=db.func.current_timestamp())


    contributions = db.relationship('Transcription', backref='dataset', lazy=True)