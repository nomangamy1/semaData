from extensions import db

class DomainOwner(db.Model):
    __tablename__ = 'DomainOwner'
    id = db.Column(db.Integer, primary_key=True)
    first_name = db.Column(db.String(64), index=True)
    last_name = db.Column(db.String(64), index=True)
    username = db.Column(db.String(36), unique=True, nullable=False)
    email = db.Column(db.String(64), unique=True, nullable=False)
    domain_field = db.Column(db.String(128), index=True, default='Health')
    reference_number = db.Column(db.Integer, unique=True)
    password_hash = db.Column(db.String(128))