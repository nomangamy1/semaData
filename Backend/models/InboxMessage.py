from extensions import db
from datetime import datetime

class InboxMessage(db.Model):
    __tablename__ = 'inbox_message'
    
    id = db.Column(db.Integer, primary_key=True)
    receiver_id = db.Column(db.Integer, nullable=False)
    sender_name = db.Column(db.String(100), nullable=False)
    snippet = db.Column(db.String(300), nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
