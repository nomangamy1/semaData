from extensions import db
from datetime import datetime


class AuditLog(db.Model):
    __tablename__ = 'audit_logs'

    id = db.Column(db.Integer, primary_key=True)
    actor_id = db.Column(db.Integer, db.ForeignKey('Users.id'), nullable=True)
    action = db.Column(db.String(120), nullable=False)
    target_table = db.Column(db.String(120), nullable=True)
    target_id = db.Column(db.String(120), nullable=True)
    before = db.Column(db.JSON, nullable=True)
    after = db.Column(db.JSON, nullable=True)
    reason = db.Column(db.Text, nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)

    actor = db.relationship('User', foreign_keys=[actor_id], backref='audit_actions')

    def to_dict(self):
        return {
            'id': self.id,
            'actor_id': self.actor_id,
            'action': self.action,
            'target_table': self.target_table,
            'target_id': self.target_id,
            'before': self.before,
            'after': self.after,
            'reason': self.reason,
            'created_at': self.created_at.isoformat() if self.created_at else None,
        }
