from extensions import db
from flask_login import UserMixin
from werkzeug.security import generate_password_hash,check_password_hash
class User(db.Model,UserMixin):
    __tablename__ = 'Users'
    id = db.Column(db.Integer, primary_key=True)
    user_type = db.Column(db.String(50), nullable=False, default='User')
    first_name = db.Column(db.String(64), unique=False, index=True)
    second_name = db.Column(db.String(64), unique=False, index=True)
    email = db.Column(db.String(120), unique=True, index=True, nullable=False)
    is_verified = db.Column(db.Boolean, nullable=False, default=False)
    field_name = db.Column(db.String(64))
    role = db.Column(db.String(80))
    reference_number = db.Column(db.String(64), db.ForeignKey('Domain.reference_number'))
    password_hash = db.Column(db.String(128))

    def create(self):
        db.session.add(self)
        db.session.commit()
        return self
    
    @classmethod
    def find_by_email(cls, email):
        return cls.query.filter_by(email=email).first()
    
    @classmethod
    def find_by_username(cls, username):
        return cls.query.filter_by(username=username).first()
    

    def set_password(self, password):
        self.password_hash =generate_password_hash(password)
    
    def check_password(self,password):
        return check_password_hash(self.password_hash,password)
    
    
    
 