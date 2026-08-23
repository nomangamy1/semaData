from functools import wraps
from flask import jsonify
from flask_jwt_extended import verify_jwt_in_request, get_jwt_identity, get_jwt
from models.user import User


def get_current_user():
    try:
        verify_jwt_in_request(optional=True)
        identity = get_jwt_identity()
        if not identity:
            return None
        return User.query.get(int(identity))
    except Exception:
        return None


def requires_admin(fn):
    @wraps(fn)
    def wrapper(*args, **kwargs):
        verify_jwt_in_request()
        claims = get_jwt()
        identity = get_jwt_identity()
        user = User.query.get(int(identity)) if identity else None
        if not user or not user.is_admin_user():
            return jsonify({"error": "Admin only"}), 403
        return fn(*args, **kwargs)
    return wrapper


def requires_scope(scope_name):
    """Decorator placeholder to check for a named scope in JWT claims.
    If your tokens include a 'scopes' claim, this will validate it. Otherwise
    it falls back to admin users being allowed.
    """
    def decorator(fn):
        @wraps(fn)
        def wrapper(*args, **kwargs):
            verify_jwt_in_request()
            claims = get_jwt()
            scopes = claims.get('scopes') or []
            if isinstance(scopes, str):
                scopes = [s.strip() for s in scopes.split()]
            if scope_name in scopes:
                return fn(*args, **kwargs)
            # fallback to admin
            identity = get_jwt_identity()
            user = User.query.get(int(identity)) if identity else None
            if user and user.is_admin_user():
                return fn(*args, **kwargs)
            return jsonify({"error": "Insufficient scope"}), 403
        return wrapper
    return decorator
