from extensions import db

class Domain(db.Model):
    __tablename__ = 'domain'
    id = db.Column(db.Integer, primary_key=True)
    owner_id = db.Column(db.Integer, db.ForeignKey('DomainOwner.id'))

    domain_name = db.Column(db.String(128), index=True)
    is_active = db.Column(db.Boolean, default=False)
    total_budget = db.Column(db.Float, nullable=True, default=0.0)
    amount_paid = db.Column(db.Float, default=0.0)
    deposit_amount = db.Column(db.Float, nullable=True, default=0.0)
    payment_status = db.Column(db.String(20), default='Unpaid')
    target_goal = db.Column(db.Integer, nullable=False)
    is_automated = db.Column(db.Boolean, default=False)
    #agent_commission
    #is_verified  
    #total_cost_per_response =
    reference_number = db.Column(db.String(64), unique=True, nullable=False)
    is_paused        = db.Column(db.Boolean, default=False, nullable=False)
    rate_per_submission = db.Column(db.Float, default=20.0, nullable=False)
    domain_features = db.relationship('Feature',lazy =True,backref = 'domain')
    datasets = db.relationship('Dataset', backref='domain', lazy=True)
    requirements = db.Column(db.Text)
    collector_bounty = db.Column(db.Float, nullable=False, default=10.0)
    assigned_user_id = db.Column(db.Integer, db.ForeignKey('Users.id'))
     

    def update_payment(self,new_amount):
        self.amount_paid += new_amount

        activation_amount = self.total_budget*0.3
        
        if self.amount_paid >= activation_amount:
            self.is_active = True 
        
        if self.amount_paid >= self.total_budget:
            self.payment_status = "Completed"

        elif self.amount_paid > 0:
            self.payment_status = "Partially paid" 

        return self.is_active
    def save(self, *args, **kwargs):
        # Ensure numeric target_goal and calculate budgets consistently
        try:
            tg = int(self.target_goal)
        except Exception:
            tg = 0

        # Use per-item rate of 20 (matches payment initiation calculation)
        self.total_budget = float(tg) * 20
        self.deposit_amount = self.total_budget * 0.3
        if not self.collector_bounty:
            self.collector_bounty = 10.0

        # Persist using the session (some code expects a save() helper)
        db.session.add(self)
        db.session.commit()
        return self


