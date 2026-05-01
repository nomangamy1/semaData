import os
from flask import Blueprint, request, jsonify
from models import CommunityPost, Comment, InboxMessage, User
from flask_jwt_extended import jwt_required, get_jwt_identity
from extensions import db


community_bp = Blueprint('community', __name__)

@community_bp.route('/community/feed', methods=['GET'])
def get_feed():
    feed_type = request.args.get('type', 'all')
    page = request.args.get('page', 1, type=int)
    per_page = 20
    
    query = CommunityPost.query
    if feed_type != 'all':
        query = query.filter_by(post_type=feed_type)
        
    posts = query.order_by(CommunityPost.created_at.desc()).paginate(page=page, per_page=per_page)
    
    return jsonify({
        'posts': [{
            'id': p.id,
            'authorId': p.author_id,
            'authorName': p.author_name,
            'title': p.title,
            'body': p.body,
            'postType': p.post_type,
            'attachment': p.attachment,
            'likes': p.likes,
            'domainName': p.domain_name,
            'createdAt': p.created_at.isoformat()
        } for p in posts.items],
        'total': posts.total
    })

@community_bp.route('/community/post/<int:post_id>/like', methods=['POST'])
@jwt_required()
def like_post(post_id):
    post = CommunityPost.query.get_or_404(post_id)
    post.likes += 1
    db.session.commit()
    return jsonify({'message': 'Liked', 'likes': post.likes}), 200

@community_bp.route('/community/post/<int:post_id>/comment', methods=['POST'])
@jwt_required()
def add_comment(post_id):
    current_user_id = get_jwt_identity()
    data = request.get_json() or {}
    
    new_comment = Comment(
        post_id=post_id,
        author_id=current_user_id,
        body=data.get('body')
    )
    db.session.add(new_comment)
    db.session.commit()
    
    return jsonify({'message': 'Comment added', 'commentId': new_comment.id}), 201

@community_bp.route('/inbox', methods=['GET'])
@jwt_required()
def get_inbox():
    current_user_id = get_jwt_identity()
    messages = InboxMessage.query.filter_by(receiver_id=current_user_id).all()
    
    return jsonify({
        'threads': [{
            'id': m.id,
            'senderName': m.sender_name,
            'snippet': m.snippet,
            'time': m.created_at.strftime('%H:%M')
        } for m in messages]
    })
