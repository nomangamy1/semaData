import os
from werkzeug.utils import secure_filename
from flask import Blueprint, jsonify, request, current_app
from models import CommunityPost, Comment, InboxMessage, db, User

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
            'authorName': f"{p.author.first_name} {p.author.second_name}".strip() if p.author else 'Unknown',
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

@community_bp.route('/community/post', methods=['POST'])
def add_post():
    if request.content_type and 'multipart/form-data' in request.content_type:
        title = request.form.get('title')
        body = request.form.get('body')
        author_id = request.form.get('author_id')
        
        attachment_path = None
        if 'attachment' in request.files:
            file = request.files['attachment']
            if file and file.filename != '':
                filename = secure_filename(file.filename)
                upload_folder = os.path.join(current_app.root_path, 'static/uploads')
                os.makedirs(upload_folder, exist_ok=True)
                file.save(os.path.join(upload_folder, filename))
                attachment_path = f"/static/uploads/{filename}"
    else:
        req_data = request.get_json() or {}
        title = req_data.get('title')
        body = req_data.get('body')
        author_id = req_data.get('author_id')
        attachment_path = req_data.get('attachment')

    new_post = CommunityPost(
        title=title,
        body=body,
        author_id=author_id,
        author_type='user',
        post_type='post',
        attachment=attachment_path
    )
    
    db.session.add(new_post)
    db.session.commit()
    
    return jsonify({'message': 'Post created successfully', 'id': new_post.id}), 201

@community_bp.route('/community/post/<int:post_id>/comment', methods=['POST'])
def add_comment(post_id):
    data = request.get_json() or {}
    author_id = data.get('author_id')
    body = data.get('body')
    
    if not author_id or not body:
        return jsonify({'error': 'Author ID and body are required'}), 400
        
    post = CommunityPost.query.get_or_404(post_id)
    comment = Comment(
        post_id=post.id,
        author_id=author_id,
        body=body
    )
    db.session.add(comment)
    db.session.commit()
    return jsonify({'message': 'Comment added successfully'}), 201

@community_bp.route('/community/post/<int:post_id>/like', methods=['POST'])
def like_post(post_id):
    post = CommunityPost.query.get_or_404(post_id)
    post.likes += 1
    db.session.commit()
    return jsonify({'likes': post.likes}), 200

@community_bp.route('/inbox', methods=['GET'])
def get_inbox():
    messages = InboxMessage.query.all()
    return jsonify({
        'messages': [{
            'id': m.id,
            'senderName': m.sender_name,
            'snippet': m.snippet,
            'createdAt': m.created_at.isoformat()
        } for m in messages]
    })
