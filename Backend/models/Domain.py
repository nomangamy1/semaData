from extensions import db
from flask_login import UserMixin

class Domain(db.Model, UserMixin):
    __tablename__ = 'Domain'
    id = db.Column(db.Integer, primary_key=True)
    domain_name = db.Column(db.String(128), index=True)
    reference_number = db.Column(db.Integer, unique=True)
    domain_features = db.Column(db.Text)
    owner_id = db.Column(db.Integer, db.ForeignKey('DomainOwner.id'))
    # Domain features can be defined by the owner  
    