from extensions import db

class Domain(db.Model):
    __tablename__ = 'domain'
    id = db.Column(db.Integer, primary_key=True)
    domain_name = db.Column(db.String(128), index=True)
    is_active = db.Column(db.Boolean, default=False)
    total_budget = db.Column(db.Float, nullable=True, default=0.0)
    amount_paid = db.Column(db.Float, default=0.0)
    payment_status = db.Column(db.String(20), default='Unpaid')
    target_goal = db.Column(db.Integer, nullable=False)
    is_automated = db.Column(db.Boolean, default=False)
    reference_number = db.Column(db.String(64), unique=True, nullable=False)
    domain_features = db.relationship('Feature',lazy =True,backref = 'domain')
    owner_id = db.Column(db.Integer, db.ForeignKey('DomainOwner.id'))
    # Domain features can be defined by the owner  
     