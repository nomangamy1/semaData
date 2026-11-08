from datetime import datetime

from extensions import db


class DomainOwnerNotification(db.Model):
    __tablename__ = "domain_owner_notifications"

    id = db.Column(db.Integer, primary_key=True)
    domain_id = db.Column(db.Integer, db.ForeignKey("domain.id"), nullable=False, index=True)
    owner_id = db.Column(db.Integer, db.ForeignKey("DomainOwner.id"), nullable=False, index=True)
    sender_admin_id = db.Column(db.Integer, db.ForeignKey("Users.id"), nullable=False)
    sender_name = db.Column(db.String(100), nullable=False)
    message = db.Column(db.Text, nullable=False)
    created_at = db.Column(db.DateTime, nullable=False, default=datetime.utcnow, index=True)
    read_at = db.Column(db.DateTime, nullable=True)

    domain = db.relationship("Domain")
