from functools import wraps
from flask_jwt_extended import get_jwt_identity, verify_jwt_in_request
from models.AuditLog import AuditLog
from extensions import db
import json


def record_audit(actor_id, action, target_table=None, target_id=None, before=None, after=None, reason=None):
    try:
        entry = AuditLog(
            actor_id=actor_id,
            action=action,
            target_table=target_table,
            target_id=str(target_id) if target_id is not None else None,
            before=before,
            after=after,
            reason=reason
        )
        db.session.add(entry)
        db.session.commit()
    except Exception:
        db.session.rollback()


def audit_action(action=None, target_table=None, get_target_id=None, include_state=False):
    """Decorator to record a simple audit entry for an admin action.

    Parameters:
    - action: string name of the action
    - target_table: optional table name
    - get_target_id: callable(*args, **kwargs) -> id
    - include_state: if True, attempts to include 'before' and 'after' by reading kwargs['payload']
    """
    def decorator(fn):
        @wraps(fn)
        def wrapper(*args, **kwargs):
            try:
                verify_jwt_in_request(optional=True)
                actor = get_jwt_identity()
            except Exception:
                actor = None

            before = None
            if include_state:
                before = kwargs.get('before') if kwargs.get('before') is not None else None

            result = fn(*args, **kwargs)

            try:
                tid = None
                if callable(get_target_id):
                    try:
                        tid = get_target_id(*args, **kwargs)
                    except Exception:
                        tid = None
                record_audit(actor_id=actor, action=action or fn.__name__, target_table=target_table, target_id=tid, before=before, after=kwargs.get('after') if include_state else None)
            except Exception:
                pass

            return result
        return wrapper
    return decorator
