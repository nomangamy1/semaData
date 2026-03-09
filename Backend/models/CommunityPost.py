from extensions import db
from datetime import datetime

class CommunityPost(db.Model):
    __tablename__ = 'community_posts'

    id          = db.Column(db.Integer, primary_key=True)
    author_id   = db.Column(db.Integer, db.ForeignKey('Users.id'), nullable=False)
    post_type   = db.Column(db.String(10), nullable=False, default='post')  # 'post' | 'flag'
    title       = db.Column(db.String(255), nullable=False)
    body        = db.Column(db.Text, nullable=False)
    likes       = db.Column(db.Integer, default=0)
    reply_count = db.Column(db.Integer, default=0)
    domain_ref  = db.Column(db.String(100), nullable=True)   # reference_number of flagged domain
    domain_name = db.Column(db.String(100), nullable=True)
    created_at  = db.Column(db.DateTime, default=datetime.utcnow)

    author = db.relationship('User', foreign_keys=[author_id])

    def __repr__(self):
        return f"<CommunityPost {self.id} [{self.post_type}] by user {self.author_id}>"


class QualityFlag(db.Model):
    __tablename__ = 'quality_flags'

    id          = db.Column(db.Integer, primary_key=True)
    reporter_id = db.Column(db.Integer, db.ForeignKey('Users.id'), nullable=False)
    domain_id   = db.Column(db.Integer, db.ForeignKey('domains.id'), nullable=True)
    description = db.Column(db.Text, nullable=False)
    status      = db.Column(db.String(20), default='open')  # open | reviewed | resolved
    created_at  = db.Column(db.DateTime, default=datetime.utcnow)
    resolved_at = db.Column(db.DateTime, nullable=True)

    reporter = db.relationship('User', foreign_keys=[reporter_id])
    domain   = db.relationship('Domain', foreign_keys=[domain_id])