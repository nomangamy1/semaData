from extensions import db
from datetime import datetime, timedelta


class EmailToken(db.Model):
    """Store email verification and password reset tokens"""
    __tablename__ = "email_tokens"

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey("Users.id"), nullable=False, index=True)
    token = db.Column(db.String(255), nullable=False, unique=True, index=True)
    token_type = db.Column(db.String(50), nullable=False)  # 'email_verification', 'password_reset'
    is_used = db.Column(db.Boolean, default=False, index=True)
    used_at = db.Column(db.DateTime, nullable=True)
    expires_at = db.Column(db.DateTime, nullable=False, index=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    user = db.relationship("User", foreign_keys=[user_id])

    def is_valid(self):
        """Check if token is still valid (not expired and not used)"""
        return not self.is_used and datetime.utcnow() < self.expires_at

    def mark_used(self):
        """Mark token as used"""
        self.is_used = True
        self.used_at = datetime.utcnow()
        db.session.commit()

    def __repr__(self):
        return f"<EmailToken {self.token_type} for user {self.user_id}>"
