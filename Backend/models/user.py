from extensions import db
from flask_login import UserMixin
from werkzeug.security import generate_password_hash, check_password_hash


class User(db.Model, UserMixin):
    __tablename__ = 'Users'

    id               = db.Column(db.Integer, primary_key=True)
    user_type        = db.Column(db.String(50), nullable=False, default='User')
    # user_type values:
    #   'User'      → vetted field collector
    #   'community' → free community member (ML/AI/research audience)
    #   'admin'     → platform administrator

    first_name       = db.Column(db.String(64), index=True)
    second_name      = db.Column(db.String(64), index=True)
    email            = db.Column(db.String(120), unique=True, index=True, nullable=False)
    password_hash    = db.Column(db.String(256), nullable=False)
    preferred_gateway = db.Column(db.String(20), default="MPESA")
    mpesa_number = db.Column(db.String(20), nullable=True)
    paypal_email = db.Column(db.String(100), nullable=True)

    is_verified      = db.Column(db.Boolean, nullable=False, default=False)
    role             = db.Column(db.String(80))
    # role mirrors user_type for JWT claims: 'user' | 'community' | 'admin'

    domain_name      = db.Column(db.String(64), nullable=True)
    area_of_interest = db.Column(db.String(100), nullable=True)
    assigned_domains = db.relationship('Domain', backref='assigned_user', lazy=True)
    is_super_admin = db.Column(db.Boolean, default=False)
    

    reference_number = db.Column(db.String(64), nullable=True)

    # ── Instance methods ───────────────────────────────────
    def set_password(self, password):
        self.password_hash = generate_password_hash(password)

    def check_password(self, password):
        return check_password_hash(self.password_hash, password)

    def create(self):
        db.session.add(self)
        db.session.commit()
        return self

    # ── Class methods ──────────────────────────────────────
    @classmethod
    def find_by_email(cls, email):
        return cls.query.filter_by(email=email).first()

    @classmethod
    def find_by_id(cls, user_id):
        return cls.query.get(user_id)

    def __repr__(self):
        return f"<User {self.id} [{self.user_type}] {self.email}>"
