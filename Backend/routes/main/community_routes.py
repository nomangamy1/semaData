# routes/main/community_routes.py
import os
from werkzeug.utils import secure_filename
from werkzeug.security import generate_password_hash, check_password_hash
from flask import Blueprint, jsonify, request, current_app
from models import CommunityPost, Comment, InboxMessage, db, User
from flask_jwt_extended import jwt_required, get_jwt_identity
from sqlalchemy.orm import joinedload
from datetime import datetime

community_bp = Blueprint('community', __name__)

ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg', 'gif', 'webp'}

def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

@community_bp.route('/feed', methods=['GET'])
def get_feed():
    feed_type = request.args.get('type', 'all')
    topic_category = request.args.get('topic_category')
    page = request.args.get('page', 1, type=int)
    per_page = 20

    query = CommunityPost.query.options(joinedload(CommunityPost.author))
    if feed_type != 'all':
        query = query.filter_by(post_type=feed_type)
    if topic_category:
        query = query.filter_by(topic_category=topic_category)

    pagination = query.order_by(CommunityPost.created_at.desc()).paginate(
        page=page, per_page=per_page, error_out=False
    )

    return jsonify({
        'posts': [{
            'id': p.id,
            'authorId': p.author_id,
            'authorName': f"{p.author.first_name} {p.author.second_name}".strip() if p.author else 'Unknown',
            'title': p.title,
            'body': p.body,
            'postType': p.post_type,
            'topicCategory': getattr(p, 'topic_category', None),
            'attachment': p.attachment,
            'likes': p.likes,
            'replyCount': getattr(p, 'reply_count', 0) or 0,
            'domainName': p.domain_name,
            'createdAt': p.created_at.isoformat() if p.created_at else None
        } for p in pagination.items],
        'total': pagination.total,
        'pages': pagination.pages,
        'current_page': pagination.page
    })

@community_bp.route('/post', methods=['POST'])
@jwt_required()
def add_post():
    author_id = int(get_jwt_identity())
    
    if request.content_type and 'multipart/form-data' in request.content_type:
        title = request.form.get('title')
        body = request.form.get('body')

        attachment_path = None
        if 'attachment' in request.files:
            file = request.files['attachment']
            if file and file.filename != '':
                if not allowed_file(file.filename):
                    return jsonify({'error': 'Invalid file type. Allowed: png, jpg, jpeg, gif, webp'}), 400
                
                filename = secure_filename(f"{datetime.utcnow().timestamp()}_{file.filename}")
                upload_folder = os.path.join(current_app.root_path, 'static/uploads')
                os.makedirs(upload_folder, exist_ok=True)
                file.save(os.path.join(upload_folder, filename))
                attachment_path = f"/static/uploads/{filename}"
    else:
        req_data = request.get_json() or {}
        title = req_data.get('title')
        body = req_data.get('body')
        attachment_path = req_data.get('attachment')

    if not title or not body:
        return jsonify({'error': 'Title and body are required'}), 400

    user = User.query.get(author_id)
    if not user:
        return jsonify({'error': 'User not found'}), 404

    new_post = CommunityPost(
        title=title,
        body=body,
        author_id=author_id,
        author_type=getattr(user, 'user_type', 'user'),
        post_type='post',
        attachment=attachment_path,
        likes=0,
        reply_count=0
    )

    db.session.add(new_post)
    db.session.commit()

    return jsonify({
        'message': 'Post created successfully', 
        'id': new_post.id,
        'title': new_post.title,
        'body': new_post.body,
        'author': f"{new_post.author.first_name} {new_post.author.second_name}".strip(),
        'attachment': new_post.attachment,
        'time': 'Just now',
        'likes': 0
    }), 201

@community_bp.route('/post/<int:post_id>/comment', methods=['POST'])
@jwt_required()
def add_comment(post_id):
    author_id = int(get_jwt_identity())
    data = request.get_json() or {}
    body = data.get('body', '').strip()

    if not body or len(body) < 3:
        return jsonify({'error': 'Comment must be at least 3 characters'}), 400

    post = CommunityPost.query.get_or_404(post_id)
    comment = Comment(
        post_id=post.id,
        author_id=author_id,
        body=body
    )
    post.reply_count = (post.reply_count or 0) + 1
    
    db.session.add(comment)
    db.session.commit()
    return jsonify({'message': 'Comment added successfully'}), 201

@community_bp.route('/post/<int:post_id>/comments', methods=['GET'])
def get_comments(post_id):
    comments = Comment.query.options(joinedload(Comment.author)).filter_by(post_id=post_id).order_by(Comment.created_at.asc()).all()
    return jsonify([
        {
            'id': c.id,
            'body': c.body,
            'author_id': c.author_id,
            'author_name': f"{c.author.first_name} {c.author.second_name or ''}".strip() if c.author else 'Member',
            'created_at': c.created_at.isoformat() if c.created_at else None
        } for c in comments
    ]), 200

@community_bp.route('/post/<int:post_id>/like', methods=['POST'])
@jwt_required()
def like_post(post_id):
    post = CommunityPost.query.get_or_404(post_id)
    post.likes = (post.likes or 0) + 1
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
            "id": c.id,
            "title": c.title,
            "body": c.body,
            "topic_category": c.topic_category or "General",
            "is_pinned": c.is_pinned,
            "reward_description": c.reward_description,
            "deadline": c.challenge_deadline.isoformat() if c.challenge_deadline else None,
            "likes": c.likes or 0,
            "attachment": c.attachment,
            "author": f"{author.first_name} {author.second_name or ''}".strip() if author else "SemaData",
            "author_type": c.author_type,
            "created_at": c.created_at.isoformat() if c.created_at else None,
            "response_count": db.session.execute(
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
                "id": row[0],
                "body": row[1],
                "upvotes": row[2],
                "created_at": row[3].isoformat() if row[3] else None,
                "author": f"{row[4]} {row[5] or ''}".strip(),
                "author_id": row[6]
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
    current_user_id = int(get_jwt_identity())
    existing_vote = db.session.execute(
        db.text("SELECT 1 FROM response_upvotes WHERE user_id = :uid AND response_id = :rid"),
        {"uid": current_user_id, "rid": response_id}
    ).fetchone()

    if existing_vote:
        db.session.execute(
            db.text("DELETE FROM response_upvotes WHERE user_id = :uid AND response_id = :rid"),
            {"uid": current_user_id, "rid": response_id}
        )
        db.session.execute(
            db.text("UPDATE community_responses SET upvotes = GREATEST(upvotes - 1, 0) WHERE id = :rid"),
            {"rid": response_id}
        )
        action = "unvoted"
    else:
        db.session.execute(
            db.text("INSERT INTO response_upvotes (user_id, response_id) VALUES (:uid, :rid)"),
            {"uid": current_user_id, "rid": response_id}
        )
        db.session.execute(
            db.text("UPDATE community_responses SET upvotes = upvotes + 1 WHERE id = :rid"),
            {"rid": response_id}
        )
        action = "upvoted"

    db.session.commit()
    updated_votes = db.session.execute(
        db.text("SELECT upvotes FROM community_responses WHERE id = :rid"),
        {"rid": response_id}
    ).scalar()

    return jsonify({"message": f"Successfully {action}", "upvotes": updated_votes}), 200

@community_bp.route('/admin/challenge', methods=['POST'])
@jwt_required()
def create_challenge():
    current_user_id = int(get_jwt_identity())
    user = User.query.filter(User.id == current_user_id).first()

    if not user:
        return jsonify({"error": "User not found"}), 404

    is_admin = user.role == 'admin'
    is_verified = getattr(user, 'is_verified', False) and getattr(user, 'reputation_score', 0) >= 500

    if not is_admin and not is_verified:
        return jsonify({"error": "Only admins or verified users can post challenges"}), 403

    title = request.form.get('title') if request.content_type and 'multipart/form-data' in request.content_type else request.get_json().get('title')
    body = request.form.get('body') if request.content_type and 'multipart/form-data' in request.content_type else request.get_json().get('body')
    
    attachment_path = None
    if request.files and 'attachment' in request.files:
        file = request.files['attachment']
        if file and file.filename != '':
            if allowed_file(file.filename):
                filename = secure_filename(f"challenge_{datetime.utcnow().timestamp()}_{file.filename}")
                upload_folder = os.path.join(current_app.root_path, 'static/uploads')
                os.makedirs(upload_folder, exist_ok=True)
                file.save(os.path.join(upload_folder, filename))
                attachment_path = f"/static/uploads/{filename}"

    if not title or not body:
        return jsonify({"error": "Title and body required"}), 400

    new_post = CommunityPost(
        author_id=user.id,
        author_type='admin' if is_admin else 'verified_user',
        post_type='challenge' if is_admin else 'idea',
        title=title.strip(),
        body=body.strip(),
        attachment=attachment_path,
        likes=0
    )

    db.session.add(new_post)
    db.session.commit()
    return jsonify({"message": "Challenge posted successfully", "id": new_post.id}), 201

@community_bp.route('/profile/me', methods=['GET'])
@jwt_required()
def get_my_profile():
    current_user_id = int(get_jwt_identity())
    user = User.query.get_or_404(current_user_id)
    return jsonify({
        "id": user.id,
        "name": f"{user.first_name} {user.second_name or ''}".strip(),
        "email": user.email,
        "role": user.user_type,
        "headline": user.headline or "",
        "bio": user.bio or "",
        "skills": user.skills or [],
        "social_links": getattr(user, 'social_links', {}) or {},
        "joined_at": user.created_at.isoformat() if getattr(user, 'created_at', None) else None
    }), 200

@community_bp.route('/profile/me', methods=['PUT'])
@jwt_required()
def update_my_profile():
    current_user_id = int(get_jwt_identity())
    user = User.query.get_or_404(current_user_id)
    data = request.get_json() or {}

    if 'headline' in data:
        user.headline = data['headline'].strip()
    if 'bio' in data:
        user.bio = data['bio'].strip()
    if 'skills' in data and isinstance(data['skills'], list):
        user.skills = [s.strip() for s in data['skills'] if s.strip()]
    if 'social_links' in data and isinstance(data['social_links'], dict):
        current_links = getattr(user, 'social_links', {}) or {}
        current_links.update(data['social_links'])
        user.social_links = current_links

    db.session.commit()
    return jsonify({"message": "Profile updated successfully"}), 200

@community_bp.route('/profile/password', methods=['PUT'])
@jwt_required()
def change_password():
    current_user_id = int(get_jwt_identity())
    user = User.query.get_or_404(current_user_id)
    data = request.get_json() or {}
    
    # Bulletproof fallback for both key naming conventions
    old_pw = data.get('old_password') or data.get('current_password')
    new_pw = data.get('new_password')
    
    if not old_pw or not new_pw:
        return jsonify({"error": "Old and new passwords are required"}), 400
        
    if not check_password_hash(user.password_hash, old_pw):
        return jsonify({"error": "Incorrect old password"}), 400
        
    if len(new_pw) < 6:
        return jsonify({"error": "New password must be at least 6 characters"}), 400
        
    user.password_hash = generate_password_hash(new_pw)
    db.session.commit()
    return jsonify({"message": "Password updated successfully"}), 200

@community_bp.route('/profile/email', methods=['PUT'])
@jwt_required()
def change_email():
    current_user_id = int(get_jwt_identity())
    user = User.query.get_or_404(current_user_id)
    data = request.get_json() or {}
    new_email = data.get('email', '').strip().lower()
    
    if not new_email or '@' not in new_email:
        return jsonify({"error": "Valid email is required"}), 400
        
    existing = User.query.filter_by(email=new_email).first()
    if existing and existing.id != user.id:
        return jsonify({"error": "Email is already in use"}), 400
        
    user.email = new_email
    db.session.commit()
    return jsonify({"message": "Email updated successfully"}), 200

@community_bp.route('/profile/<int:user_id>', methods=['GET'])
def get_public_profile(user_id):
    user = User.query.get_or_404(user_id)
    return jsonify({
        "id": user.id,
        "name": f"{user.first_name} {user.second_name or ''}".strip(),
        "role": user.user_type,
        "headline": user.headline or "AI Researcher and Developer",
        "bio": user.bio or "",
        "skills": user.skills or [],
        "social_links": getattr(user, 'social_links', {}) or {},
        "joined_at": user.created_at.isoformat() if getattr(user, 'created_at', None) else None
    }), 200