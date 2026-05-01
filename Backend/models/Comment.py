from extensions import db
from datetime import datetime

class Comment(db.Model):
    __tablename__ = 'comment'
    
    id = db.Column(db.Integer, primary_key=True)
    post_id = db.Column(db.Integer, db.ForeignKey('community_posts.id'), nullable=False)
    author_id = db.Column(db.Integer, nullable=False)
    body = db.Column(db.Text, nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    post = db.relationship("CommunityPost", backref="comments")
