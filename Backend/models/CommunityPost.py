from extensions import db
from datetime import datetime


class CommunityPost(db.Model):
    __tablename__ = "community_posts"

    id          = db.Column(db.Integer, primary_key=True)
    author_id   = db.Column(db.Integer, db.ForeignKey("Users.id"), nullable=False)
    author_type = db.Column(db.String(20), nullable=False, default="user")
    post_type   = db.Column(db.String(20), nullable=False, default="post")
    title       = db.Column(db.String(255), nullable=True)
    body = db.Column(db.Text, nullable=False)
    likes       = db.Column(db.Integer, default=0)
    domain_ref  = db.Column(db.String(100), nullable=True)
    domain_name = db.Column(db.String(100), nullable=True)
    created_at  = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at  = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    author = db.relationship("User", foreign_keys=[author_id])

    def __repr__(self):
        return f"<CommunityPost {self.id} [{self.post_type}] by {self.author_id}>"


class QualityFlag(db.Model):
    __tablename__ = "quality_flags"

    id          = db.Column(db.Integer, primary_key=True)
    post_id     = db.Column(db.Integer, db.ForeignKey("community_posts.id"), nullable=True)
    author_id   = db.Column(db.Integer, db.ForeignKey("Users.id"), nullable=False)
    flag_reason = db.Column(db.Text, nullable=False)
    reporter_id = db.Column(db.Integer, db.ForeignKey("Users.id"), nullable=True)
    domain_id   = db.Column(db.Integer, db.ForeignKey("domain.id"), nullable=True)
    created_at  = db.Column(db.DateTime, default=datetime.utcnow)

    author   = db.relationship("User", foreign_keys=[author_id])
    reporter = db.relationship("User", foreign_keys=[reporter_id])
    domain   = db.relationship("Domain", foreign_keys=[domain_id])

    def __repr__(self):
        return f"<QualityFlag {self.id} on post {self.post_id}>"
