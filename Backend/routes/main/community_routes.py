import os
from werkzeug.utils import secure_filename
from flask import Blueprint, jsonify, request, current_app
from models import CommunityPost, Comment, InboxMessage, db, User
from flask_jwt_extended import jwt_required, get_jwt_identity
from sqlalchemy.orm import joinedload
from datetime import datetime

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
    """Get all challenges/ideas, sorted by pin status and creation date"""
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
            "is_pinned":          c.is_pinned,
            "reward_description": c.reward_description,
            "deadline":           c.challenge_deadline.isoformat() if c.challenge_deadline else None,
            "likes":              c.likes or 0,
            "author":             f"{author.first_name} {author.second_name or ''}".strip() if author else "SemaData",
            "author_type":        c.author_type,
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
    """
    Admin or verified community users can post challenges/ideas.
    - Admin: Can post official 'challenge' type posts (pinnable)
    - Verified users: Can post 'idea' type posts (community contributions)
    """
    current_user_id = int(get_jwt_identity())
    user = User.query.filter(User.id == current_user_id).first()
    
    if not user:
        return jsonify({"error": "User not found"}), 404

    # Check authorization: Admin or verified user with high reputation
    is_admin = user.role == 'admin'
    is_verified = getattr(user, 'is_verified', False) and getattr(user, 'reputation_score', 0) >= 500
    
    if not is_admin and not is_verified:
        return jsonify({"error": "Only admins or verified users (500+ reputation) can post challenges"}), 403

    data               = request.get_json() or {}
    title              = data.get('title', '').strip()
    body               = data.get('body', '').strip()
    reward_description = data.get('reward', '').strip()
    is_pinned          = data.get('is_pinned', False) if is_admin else False  # Only admins can pin
    deadline           = data.get('deadline')  # Optional deadline for challenges

    if not title or not body:
        return jsonify({"error": "Title and body required"}), 400

    # If admin is pinning, unpin previous challenges
    if is_admin and is_pinned:
        db.session.execute(
            db.text("""
                UPDATE community_posts SET is_pinned = FALSE
                WHERE post_type = 'challenge' AND is_pinned = TRUE
            """)
        )

    # Determine post type based on user role
    post_type = 'challenge' if is_admin else 'idea'
    author_type = 'admin' if is_admin else 'verified_user'

    # Parse deadline if provided
    challenge_deadline = None
    if deadline and is_admin:
        try:
            challenge_deadline = datetime.fromisoformat(deadline)
        except (ValueError, TypeError):
            return jsonify({"error": "Invalid deadline format. Use ISO format (YYYY-MM-DDTHH:MM:SS)"}), 400

    # Create the new post
    new_post = CommunityPost(
        author_id=user.id,
        author_type=author_type,
        post_type=post_type,
        title=title,
        body=body,
        is_pinned=is_pinned,
        reward_description=reward_description or None,
        challenge_deadline=challenge_deadline,
        likes=0
    )
    
    db.session.add(new_post)
    db.session.commit()

    return jsonify({
        "message": f"{post_type.capitalize()} posted successfully",
        "id": new_post.id,
        "type": post_type,
        "is_pinned": is_pinned,
        "author_type": author_type
    }), 201


@community_bp.route('/admin/pin-idea/<int:post_id>', methods=['POST'])
@jwt_required()
def pin_idea(post_id):
    """Admin can pin multiple ideas/challenges to featured section"""
    current_user_id = int(get_jwt_identity())
    user = User.query.filter(User.id == current_user_id).first()
    
    if not user or user.role != 'admin':
        return jsonify({"error": "Admin only"}), 403

    post = CommunityPost.query.get_or_404(post_id)
    if post.post_type not in ['challenge', 'idea']:
        return jsonify({"error": "Can only pin challenges or ideas"}), 400

    data = request.get_json() or {}
    should_pin = data.get('pin', True)

    if should_pin:
        post.is_pinned = True
    else:
        post.is_pinned = False

    db.session.commit()
    return jsonify({
        "message": f"Post {'pinned' if should_pin else 'unpinned'} successfully",
        "post_id": post.id,
        "is_pinned": post.is_pinned
    }), 200


@community_bp.route('/admin/ideas', methods=['GET'])
@jwt_required()
def get_all_ideas():
    """Admin endpoint to view all community ideas/challenges for moderation"""
    current_user_id = int(get_jwt_identity())
    user = User.query.filter(User.id == current_user_id).first()
    
    if not user or user.role != 'admin':
        return jsonify({"error": "Admin only"}), 403

    ideas = CommunityPost.query.filter(
        CommunityPost.post_type.in_(['challenge', 'idea'])
    ).order_by(
        CommunityPost.is_pinned.desc(),
        CommunityPost.created_at.desc()
    ).all()

    result = []
    for idea in ideas:
        author = User.query.get(idea.author_id)
        result.append({
            "id": idea.id,
            "title": idea.title,
            "body": idea.body[:200] + "..." if len(idea.body) > 200 else idea.body,
            "post_type": idea.post_type,
            "author_type": idea.author_type,
            "author": f"{author.first_name} {author.second_name or ''}".strip() if author else "Unknown",
            "is_pinned": idea.is_pinned,
            "likes": idea.likes,
            "created_at": idea.created_at.isoformat() if idea.created_at else None,
        })

    return jsonify({"ideas": result}), 200
