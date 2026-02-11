from extensions import db

class Domain(db.Model):
    __tablename__ = 'domain'
    id = db.Column(db.Integer, primary_key=True)
    domain_name = db.Column(db.String(128), index=True)
    reference_number = db.Column(db.String(64), unique=True, nullable=False)
    domain_features = db.relationship('Feature',lazy =True,backref = 'domain')
    owner_id = db.Column(db.Integer, db.ForeignKey('DomainOwner.id'))
    # Domain features can be defined by the owner  
     