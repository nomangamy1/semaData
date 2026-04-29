from flask import Blueprint, jsonify, request
from flask_jwt_extended import jwt_required, get_jwt_identity
from models import User, Dataset, Domain, DomainOwner
from extensions import db
from datetime import datetime
from sqlalchemy import func

community_bp = Blueprint('community', __name__)


# ─── PUBLIC: Leaderboard ──────────────────────────────────────
@community_bp.route('/leaderboard', methods=['GET'])
def get_leaderboard():
    results = db.session.query(
        User.id,
        User.first_name,
        User.second_name,
        User.reference_number,
        func.count(Dataset.id).label('submission_count')
    ).join(
        Dataset,
        (Dataset.collector_id == User.id) &
        (Dataset.status.in_(['AI_Passed', 'Verified']))
    ).filter(
        User.user_type == 'User'
    ).group_by(
        User.id, User.first_name, User.second_name, User.reference_number
    ).order_by(
        func.count(Dataset.id).desc()
    ).limit(50).all()

    leaderboard = []
    for rank, row in enumerate(results, start=1):
        domain = Domain.query.filter_by(reference_number=row.reference_number).first()

        # ✅ Guard against None second_name — community members may not have one
        first  = (row.first_name or '').strip()
        second = (row.second_name or '').strip()
        full_name = f"{first} {second}".strip()
        username  = f"{first.lower()}_{second[0].lower()}" if second else first.lower()

        leaderboard.append({
            "rank":        rank,
            "id":          row.id,
            "name":        full_name,
            "username":    username,
            "avatar":      (first[0] + (second[0] if second else '')).upper(),
            "submissions": row.submission_count,
            "domain":      domain.domain_name if domain else "General",
            "badge":       _get_badge(row.submission_count),
        })

    return jsonify(leaderboard), 200


# ─── PUBLIC: Community feed ───────────────────────────────────
@community_bp.route('/feed', methods=['GET'])
def get_feed():
    from models.CommunityPost import CommunityPost

    # ✅ Frontend sends 'all'|'posts'|'flags' — map 'posts' → 'post', 'flags' → 'flag'
    feed_type_map = {'posts': 'post', 'flags': 'flag', 'all': 'all'}
    raw_type  = request.args.get('type', 'all')
    feed_type = feed_type_map.get(raw_type, 'all')
    page      = max(1, int(request.args.get('page', 1)))

    query = CommunityPost.query.order_by(CommunityPost.created_at.desc())
    if feed_type != 'all':
        query = query.filter_by(post_type=feed_type)

    if not query: return jsonify({"posts": [], "pages": 0}), 200
    posts = query.paginate(page=page, per_page=20, error_out=False)
    return jsonify({
        "posts":        [_serialize_post(p) for p in posts.items],
        "total":        posts.total,
        "pages":        posts.pages,
        "current_page": page,
    }), 200


# ─── PROTECTED: Create post ───────────────────────────────────
@community_bp.route('/post', methods=['POST'])
@jwt_required()
def create_post():
    from models.CommunityPost import CommunityPost

    current_user_id = get_jwt_identity()
    data  = request.get_json()
    title = data.get('title', '').strip()
    body  = data.get('body', '').strip()

    if not title or not body:
        return jsonify({"error": "Title and body are required"}), 400

    post = CommunityPost(
        author_id  = int(current_user_id),
        post_type  = 'post',
        title      = title,
        body       = body,
        created_at = datetime.utcnow()
    )
    db.session.add(post)
    db.session.commit()
    return jsonify(_serialize_post(post)), 201


# ─── PROTECTED: Create quality flag ──────────────────────────
@community_bp.route('/flag', methods=['POST'])
@jwt_required()
def create_flag():
    # ✅ Both models live in CommunityPost.py — import together
    from models.CommunityPost import CommunityPost, QualityFlag

    current_user_id = get_jwt_identity()
    data       = request.get_json()
    domain_ref = data.get('domain_ref', '').strip()
    title      = data.get('title', '').strip()
    body       = data.get('body', '').strip()

    if not title or not body:
        return jsonify({"error": "Title and body are required"}), 400

    domain = Domain.query.filter_by(reference_number=domain_ref).first() if domain_ref else None

    post = CommunityPost(
        author_id   = int(current_user_id),
        post_type   = 'flag',
        title       = title,
        body        = body,
        domain_ref  = domain_ref if domain else None,
        domain_name = domain.domain_name if domain else None,
        created_at  = datetime.utcnow()
    )
    db.session.add(post)

    if domain:
        flag = QualityFlag(
            reporter_id = int(current_user_id),
            domain_id   = domain.id,
            description = f"{title}: {body}",
            status      = 'open',
            created_at  = datetime.utcnow()
        )
        db.session.add(flag)

    db.session.commit()
    return jsonify(_serialize_post(post)), 201


# ─── PROTECTED: Like a post ───────────────────────────────────
@community_bp.route('/post/<int:post_id>/like', methods=['POST'])
@jwt_required()
def like_post(post_id):
    from models.CommunityPost import CommunityPost

    post = CommunityPost.query.get_or_404(post_id)
    post.likes = (post.likes or 0) + 1
    db.session.commit()
    return jsonify({"likes": post.likes}), 200


# ─── PUBLIC: Collector public profile ────────────────────────
@community_bp.route('/profile/<int:user_id>', methods=['GET'])
def get_public_profile(user_id):
    user = User.query.get_or_404(user_id)
    if user.user_type != 'User':
        return jsonify({"error": "Profile not found"}), 404

    submission_count = Dataset.query.filter(
        Dataset.collector_id == user.id,
        Dataset.status.in_(['AI_Passed', 'Verified'])
    ).count()

    domain = Domain.query.filter_by(reference_number=user.reference_number).first()

    first  = (user.first_name or '').strip()
    second = (user.second_name or '').strip()

    return jsonify({
        "id":          user.id,
        "name":        f"{first} {second}".strip(),
        "avatar":      (first[0] + (second[0] if second else '')).upper(),
        "submissions": submission_count,
        "domain":      domain.domain_name if domain else "General",
        "badge":       _get_badge(submission_count),
    }), 200


# ─── HELPERS ─────────────────────────────────────────────────
def _get_badge(count):
    for threshold, label in [
        (250, 'Guardian'), (100, 'Expert'), (50, 'Contributor'),
        (10, 'Verified'),  (1,   'Pioneer')
    ]:
        if count >= threshold:
            return label
    return None


def _serialize_post(post):
    # ✅ Check both User and DomainOwner tables — either can post
    author = User.query.get(post.author_id) or DomainOwner.query.get(post.author_id)

    if author:
        first  = getattr(author, 'first_name', '') or ''
        # DomainOwner uses 'last_name', User uses 'second_name'
        second = getattr(author, 'second_name', '') or getattr(author, 'last_name', '') or ''
        author_name = f"{first} {second}".strip() or "Anonymous"
    else:
        author_name = "Anonymous"
        first = second = ''

    initials = (
        (first[0] if first else '') +
        (second[0] if second else '')
    ).upper() or '??'

    diff    = datetime.utcnow() - post.created_at
    seconds = int(diff.total_seconds())
    if seconds < 60:    time_ago = "just now"
    elif seconds < 3600:  time_ago = f"{seconds // 60}m ago"
    elif seconds < 86400: time_ago = f"{seconds // 3600}h ago"
    else:                 time_ago = f"{seconds // 86400}d ago"

    return {
        "id":         post.id,
        "type":       post.post_type,
        "author":     author_name,
        "avatar":     initials,
        "title":      post.title,
        "body":       post.body[:500] if post.body else "",
        "likes":      post.likes or 0,
        "replies":    0 or 0,
        "domain":     post.domain_name or "General",
        "domain_ref": post.domain_ref,
        "time":       time_ago,
    }