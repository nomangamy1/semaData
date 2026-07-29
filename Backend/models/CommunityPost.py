from extensions import db
from datetime import datetime


class CommunityPost(db.Model):
    __tablename__ = "community_posts"

    id                    = db.Column(db.Integer, primary_key=True)
    author_id             = db.Column(db.Integer, db.ForeignKey("Users.id"), nullable=False)
    author_type           = db.Column(db.String(20), nullable=False, default="user")  # 'user', 'admin', 'verified_user'
    post_type             = db.Column(db.String(20), nullable=False, default="post")   # 'post', 'challenge', 'idea'
    title                 = db.Column(db.String(255), nullable=True)
    body                  = db.Column(db.Text, nullable=False)
    likes                 = db.Column(db.Integer, default=0)
    domain_ref            = db.Column(db.String(100), nullable=True)
    domain_name           = db.Column(db.String(100), nullable=True)
    attachment            = db.Column(db.String(500), nullable=True)
    upvotes     = db.Column(db.Integer, default=0)
    # Challenge-specific fields
    is_pinned             = db.Column(db.Boolean, default=False, index=True)
    reward_description    = db.Column(db.Text, nullable=True)
    challenge_deadline    = db.Column(db.DateTime, nullable=True)
    allow_community_posts = db.Column(db.Boolean, default=False)  # Allow verified users to post challenges
    
    # Timestamps
    created_at            = db.Column(db.DateTime, default=datetime.utcnow, index=True)
    updated_at            = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    author = db.relationship("User", foreign_keys=[author_id])

    def __repr__(self):
        return f"<CommunityPost {self.id} [{self.post_type}] by {self.author_id}>"

    def to_dict(self):
        """Convert model to dictionary for API responses"""
        return {
            'id': self.id,
            'title': self.title,
            'body': self.body,
            'author_id': self.author_id,
            'author_type': self.author_type,
            'post_type': self.post_type,
            'is_pinned': self.is_pinned,
            'reward_description': self.reward_description,
            'challenge_deadline': self.challenge_deadline.isoformat() if self.challenge_deadline else None,
            'likes': self.likes or 0,
            'domain_ref': self.domain_ref,
            'domain_name': self.domain_name,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None,
        }
class ResponseUpvote(db.Model):
    __tablename__ = "response_upvotes"

    user_id     = db.Column(db.Integer, db.ForeignKey("Users.id"), primary_key=True)
    response_id = db.Column(db.Integer, db.ForeignKey("community_responses.id"), primary_key=True)
    created_at  = db.Column(db.DateTime, default=datetime.utcnow)

    user     = db.relationship("User", foreign_keys=[user_id])
    response = db.relationship("CommunityResponse", backref=db.backref("upvote_records", cascade="all, delete-orphan"))

    def __repr__(self):
        return f"<ResponseUpvote user={self.user_id} response={self.response_id}>"






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


class CommunityResponse(db.Model):
    __tablename__ = "community_responses"

    id          = db.Column(db.Integer, primary_key=True)
    post_id     = db.Column(db.Integer, db.ForeignKey("community_posts.id"), nullable=False)
    user_id     = db.Column(db.Integer, db.ForeignKey("Users.id"), nullable=False)
    body        = db.Column(db.Text, nullable=False)
    attachment  = db.Column(db.String(500), nullable=True)
    created_at  = db.Column(db.DateTime, default=datetime.utcnow)

    post = db.relationship("CommunityPost", backref=db.backref("responses", lazy=True, cascade="all, delete-orphan"))
    user = db.relationship("User", foreign_keys=[user_id])

    def to_dict(self):
        return {
            'id': self.id,
            'post_id': self.post_id,
            'user_id': self.user_id,
            'body': self.body,
            'attachment': self.attachment,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'author_name': f"{self.user.first_name} {self.user.second_name}" if self.user else "Unknown"
        }
