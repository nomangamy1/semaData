from extensions import db 
from datetime import datetime

class Payment(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    domain_id = db.Column(db.Integer, db.ForeignKey('domain.id'))
    provider_id = db.Column(db.String(100)) # ID from payment provider (e.g., Flutterwave, Stripe)

    transaction_ref = db.Column(db.String(100), unique=True, index=True) # From Flutterwave/Stripe
    checkout_request_id = db.Column(db.String(255), nullable=True, unique=True, index=True) # Daraja CheckoutRequestID
    amount = db.Column(db.Float)
    currency = db.Column(db.String(10), default='USD') # Track if they paid in KES or USD
    payment_type = db.Column(db.String(20)) # 'Downpayment' or 'Final'
    phone_number = db.Column(db.String(32), nullable=True)
    status = db.Column(db.String(20)) # 'Success', 'Failed', 'Pending'
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    processed_at = db.Column(db.DateTime, nullable=True)
    attempts = db.Column(db.Integer, default=0) # Track retry attempts for failed payments


class AdminDisbursement(db.Model):
    """
    Tracks outward payout operational requests made by audio collectors 
    pending manual transaction approval and disbursement by SemaData staff.
    """
    __tablename__ = 'admin_disbursement'
    
    id = db.Column(db.Integer, primary_key=True)
    collector_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    amount = db.Column(db.Float, nullable=False)
    
    # State Engine: 'PENDING', 'DISBURSED', 'REJECTED'
    status = db.Column(db.String(20), default='PENDING', nullable=False)
    
    initiated_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)
    processed_at = db.Column(db.DateTime, nullable=True)
    
    # Audit tracking notes (e.g., MPESA Reference code or rejection reason)
    transaction_note = db.Column(db.Text, nullable=True)

    # Relationship back-link helper to reach user data easily
    collector = db.relationship('User', backref=db.backref('disbursements', lazy=True))
