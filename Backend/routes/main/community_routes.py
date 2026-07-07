import os
from werkzeug.utils import secure_filename
from flask import Blueprint, jsonify, request, current_app
from models import CommunityPost, Comment, InboxMessage, db, User
from flask_jwt_extended import jwt_required, get_jwt_identity
from sqlalchemy.orm import joinedload
community_bp = Blueprint('community', __name__)

@community_bp.route('/community/feed', methods=['GET'])
def get_feed():
    feed_type = request.args.get('type', 'all')
    page = request.args.get('page', 1, type=int)
    per_page = 20
    
    query = CommunityPost.query
    if feed_type != 'all':
        query = query.filter_by(post_type=feed_type)
    posts = CommunityPost.query.options(joinedload(CommunityPost.author)).order_by(CommunityPost.created_at.desc()).all()    
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
@jwt_required()
def add_post():
    if request.content_type and 'multipart/form-data' in request.content_type:
        title = request.form.get('title')
        body = request.form.get('body')
        author_id = get_jwt_identity()
        
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
    
    return jsonify({
           'message': 'Post created successfully', 
           'id': new_post.id,
           'title': new_post.title,
           'body': new_post.body,
           'author': f"{new_post.author.first_name} {new_post.author.second_name}".strip(),
           'time': 'Just now',
           'likes': 0

    }), 201

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


@community_bp.route('/challenges', methods=['GET'])
def get_challenges():
    from models.CommunityPost import CommunityPost
    challenges = CommunityPost.query.filter_by(
        post_type='challenge'
    ).order_by(
        CommunityPost.is_pinned.desc(),
        CommunityPost.created_at.desc()
    ).all()
    result = []
    for c in challenges:
        author = User.query.get(c.author_id)
        result.append({
            "id":                 c.id,
            "title":              c.title,
            "body":               c.body,
            "is_pinned":          getattr(c, 'is_pinned', False),
            "reward_description": getattr(c, 'reward_description', None),
            "deadline":           str(getattr(c, 'challenge_deadline', None)),
            "likes":              c.likes or 0,
            "author":             f"{author.first_name} {author.second_name or ''}".strip() if author else "SemaData",
            "created_at":         c.created_at.isoformat() if c.created_at else None,
            "response_count":     db.session.execute(
                db.text("SELECT COUNT(*) FROM community_responses WHERE post_id = :pid"),
                {"pid": c.id}
            ).scalar() or 0
        })
    return jsonify({"challenges": result}), 200


@community_bp.route('/challenge/<int:post_id>/responses', methods=['GET'])
def get_responses(post_id):
    rows = db.session.execute(
        db.text("""
            SELECT r.id, r.body, r.upvotes, r.created_at,
                   u.first_name, u.second_name, u.id as uid
            FROM community_responses r
            JOIN "Users" u ON u.id = r.author_id
            WHERE r.post_id = :pid
            ORDER BY r.upvotes DESC, r.created_at ASC
        """),
        {"pid": post_id}
    ).fetchall()
    return jsonify({
        "responses": [
            {
                "id":         row[0],
                "body":       row[1],
                "upvotes":    row[2],
                "created_at": row[3].isoformat() if row[3] else None,
                "author":     f"{row[4]} {row[5] or ''}".strip(),
                "author_id":  row[6]
            }
            for row in rows
        ]
    }), 200


@community_bp.route('/challenge/<int:post_id>/respond', methods=['POST'])
@jwt_required()
def post_response(post_id):
    current_user_id = int(get_jwt_identity())
    data = request.get_json() or {}
    body = data.get('body', '').strip()
    if not body or len(body) < 20:
        return jsonify({"error": "Response must be at least 20 characters"}), 400
    db.session.execute(
        db.text("""
            INSERT INTO community_responses (post_id, author_id, body, upvotes, created_at)
            VALUES (:pid, :uid, :body, 0, NOW())
        """),
        {"pid": post_id, "uid": current_user_id, "body": body}
    )
    db.session.execute(
        db.text("UPDATE community_posts SET reply_count = COALESCE(reply_count,0)+1 WHERE id=:pid"),
        {"pid": post_id}
    )
    db.session.commit()
    return jsonify({"message": "Response submitted"}), 201


@community_bp.route('/response/<int:response_id>/upvote', methods=['POST'])
@jwt_required()
def upvote_response(response_id):
    db.session.execute(
        db.text("UPDATE community_responses SET upvotes = upvotes+1 WHERE id=:rid"),
        {"rid": response_id}
    )
    db.session.commit()
    return jsonify({"message": "Upvoted"}), 200


@community_bp.route('/admin/challenge', methods=['POST'])
@jwt_required()
def create_challenge():
    """Admin posts a new challenge — the weekly idea prompt."""
    current_user_id = get_jwt_identity()
    user = User.query.filter(User.id == int(current_user_id)).first()
    if not user or user.role != 'admin':
        return jsonify({"error": "Admin only"}), 403

    data               = request.get_json() or {}
    title              = data.get('title', '').strip()
    body               = data.get('body', '').strip()
    reward_description = data.get('reward', '').strip()
    is_pinned          = data.get('is_pinned', False)

    if not title or not body:
        return jsonify({"error": "Title and body required"}), 400

    db.session.execute(
        db.text("""
            UPDATE community_posts SET is_pinned = FALSE
            WHERE post_type = 'challenge' AND is_pinned = TRUE
        """)
    )

    db.session.execute(
        db.text("""
            INSERT INTO community_posts
                (author_id, post_type, title, body, likes, is_pinned, reward_description)
            VALUES (:uid, 'challenge', :title, :body, 0, :pinned, :reward)
        """),
        {
            "uid":    user.id,
            "title":  title,
            "body":   body,
            "pinned": is_pinned,
            "reward": reward_description or None
        }
    )
    db.session.commit()
    return jsonify({"message": "Challenge posted successfully"}), 201
