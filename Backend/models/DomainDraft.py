from datetime import datetime

from extensions import db


class DomainDraft(db.Model):
    __tablename__ = "domain_drafts"

    id = db.Column(db.Integer, primary_key=True)
    owner_id = db.Column(
        db.Integer,
        db.ForeignKey("DomainOwner.id"),
        nullable=False,
        index=True,
    )
    domain_name = db.Column(db.String(128), nullable=False, default="")
    payload = db.Column(db.JSON, nullable=False)
    created_at = db.Column(db.DateTime, nullable=False, default=datetime.utcnow)
    updated_at = db.Column(
        db.DateTime,
        nullable=False,
        default=datetime.utcnow,
        onupdate=datetime.utcnow,
    )
