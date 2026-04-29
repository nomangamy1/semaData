from flask import Blueprint, request, jsonify
from extensions import db
from models.CommunityPost import CommunityPost
from models.user import User
from flask_jwt_extended import jwt_required, get_jwt_identity

community_bp = Blueprint('community', __name__)

@community_bp.route('/feed', methods=['GET'])
def get_feed():
    posts = CommunityPost.query.order_by(CommunityPost.created_at.desc()).all()
    return jsonify({
        "posts": [{
            "id": p.id,
            "title": p.title,
            "body": p.content,  # Mapping DB 'content' to Frontend 'body'
            "author": p.author.username if p.author else "Anonymous",
            "time": p.created_at.strftime("%b %d, %H:%M"),
            "post_type": p.post_type or "discussion"
        } for p in posts]
    })

@community_bp.route('/post', methods=['POST'])
@jwt_required()
def create_post():
    data = request.get_json()
    user_id = get_jwt_identity()
    new_post = CommunityPost(
        title=data.get('title'),
        content=data.get('body'), # Getting 'body' from frontend, saving to 'content'
        author_id=user_id,
        post_type=data.get('post_type', 'discussion')
    )
    db.session.add(new_post)
    db.session.commit()
    return jsonify({"message": "Post created"}), 201

@community_bp.route('/leaderboard', methods=['GET'])
def get_leaderboard():
    # Simplified logic: finding users with most posts/contributions
    users = User.query.limit(10).all() 
    return jsonify([{
        "id": u.id,
        "name": u.first_name,
        "submissions": 10, # Replace with actual contribution logic later
        "domain": "AI/ML"
    } for u in users])
