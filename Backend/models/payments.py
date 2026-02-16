from extensions import db 
from datetime import datetime

class Payment(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    domain_id = db.Column(db.Integer, db.ForeignKey('domain.id'))
    transaction_ref = db.Column(db.String(100), unique=True) # From Flutterwave/Stripe
    amount = db.Column(db.Float)
    currency = db.Column(db.String(10), default='USD') # Track if they paid in KES or USD
    payment_type = db.Column(db.String(20)) # 'Downpayment' or 'Final'
    status = db.Column(db.String(20)) # 'Success', 'Failed', 'Pending'
    created_at = db.Column(db.DateTime, default=datetime.utcnow)