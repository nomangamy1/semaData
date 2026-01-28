from extensions import db
from datetime import datetime 

class Dataset(db.Model):
    __tablename__ = 'datasets'
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    domain_id = db.Column(db.Integer, db.ForeignKey('Domain.id'), nullable=False)
    ref_number = db.Column(db.Integer, db.ForeignKey('DomainOwner.reference_number'), nullable=False)
    description = db.Column(db.Text, nullable=True)
    created_at = db.Column(db.DateTime, nullable=False, default=db.func.current_timestamp())
    updated_at = db.Column(db.DateTime, nullable=False, default=db.func.current_timestamp(), onupdate=db.func.current_timestamp())




    contributions = db.relationship('Transcription', backref='dataset', lazy=True)