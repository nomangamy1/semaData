from flask import Blueprint, request, jsonify, current_app
from flask_jwt_extended import jwt_required, get_jwt_identity
from models.dataset import Dataset
from models.user import User
from extensions import db
from datetime import datetime, timedelta
from utils.permissions import requires_admin
from utils.audit import record_audit

adminR_bp = Blueprint('admin_bp', __name__)

def require_admin(identity):
    """ Delegates to canonical User.is_admin_user() — single source of truth """
    try:
        user = User.query.get(int(identity))
    except (TypeError, ValueError):
        return None
    return user if (user and user.is_admin_user()) else None

# ─── SECURE FIRST-IN, FIRST-OUT (FIFO) QUEUE CLAIM ENGINE ───
@adminR_bp.route('/api/admin/next-review-task', methods=['GET'])
@jwt_required()
def get_next_review_task():
    """
    Safely hands exactly ONE pending audio submission to a requesting admin reviewer.
    Uses database row locks to keep 20 simultaneous reviewers from ever colliding.
    """
    admin_id = get_jwt_identity()
    if not require_admin(admin_id):
        return jsonify({"error": "Unauthorized administrative clearance required."}), 403

    now = datetime.utcnow()
    # Safety Valve: Automatically clear locks older than 15 minutes if a reviewer logs off
    lock_timeout_threshold = now - timedelta(minutes=15)

    try:
        # Open an isolated nested transaction frame
        with db.session.begin_nested():
            
            # 1. First check if this specific admin already has an active task they didn't finish
            incomplete_task = Dataset.query.filter_by(
                status='pending',
                locked_by=int(admin_id)
            ).first()

            if incomplete_task:
                return jsonify(format_task_payload(incomplete_task)), 200

            # 2. Grab the oldest unassigned pending entry. 
            # skip_locked=True instructs the DB engine to skip rows locked by other admins.
            next_task = Dataset.query.filter(
                Dataset.status == 'pending',
                db.or_(
                    Dataset.locked_by == None,
                    db.and_(Dataset.locked_by != None, Dataset.locked_at < lock_timeout_threshold)
                )
            ).order_by(Dataset.created_at.asc()).with_for_update(skip_locked=True).first()

            if not next_task:
                return jsonify({"message": "Clear queue! No audio transcriptions left to evaluate."}), 200

            # 3. Lock this task immediately to the current admin worker node
            next_task.locked_by = int(admin_id)
            next_task.locked_at = now
            db.session.commit()

        return jsonify(format_task_payload(next_task)), 200

    except Exception as e:
        db.session.rollback()
        return jsonify({"error": f"Database race condition handling block error: {str(e)}"}), 500


def format_task_payload(entry):
    """ Standardizer mapping model schemas to frontend properties """
    return {
        "id": entry.id,
        "domain_id": entry.domain_id,
        "collector_id": entry.collector_id,
        "raw_transcription": entry.combined_text,
        "audio_url": f"http://localhost:8000/static/audio/{entry.audio_file_path}",
        "ai_confidence": float(entry.Ai_confidence) if entry.Ai_confidence else 1.00
    }
# ─── UPDATE ENTRY QUALITY STATUS & CALCULATE FAILURES ───
@adminR_bp.route('/api/admin/verify-entry/<int:entry_id>', methods=['POST'])
@jwt_required()
def verify_entry(entry_id):
    admin_id = get_jwt_identity()
    if not require_admin(admin_id):
        return jsonify({"error": "Unauthorized administrative clearance required."}), 403

    entry = Dataset.query.get_or_404(entry_id)
    data = request.get_json() or {}

    # Prevent editing a submission currently locked by a DIFFERENT admin
    if entry.locked_by and entry.locked_by != int(admin_id):
        if entry.locked_at and (datetime.utcnow() - entry.locked_at).total_seconds() < 600:
            return jsonify({"error": "This submission is locked by another reviewer."}), 409

    action = data.get('action')  # 'VERIFY' or 'REJECT'
    polished_text = data.get('polished_text', '').strip()
    rejection_reason = data.get('rejection_reason')
    reviewer_notes = data.get('reviewer_notes', '')

    if not action:
        return jsonify({"error": "Administrative action code payload is missing."}), 400

    collector_id = entry.collector_id
    before_status = entry.status

    if action == 'VERIFY':
        if not polished_text or polished_text.lower() in ['none', 'null', 'nan', '']:
            return jsonify({"error": "Verified entries cannot contain empty or null transcription values."}), 400
        entry.combined_text = polished_text
        entry.status = 'Verified'
        entry.rejection_reason = None

    elif action == 'REJECT':
        if not rejection_reason:
            return jsonify({"error": "A rejection reason must be specified."}), 400
        entry.status = 'Rejected'
        entry.rejection_reason = rejection_reason

    else:
        return jsonify({"error": "Invalid action. Expected VERIFY or REJECT."}), 400

    entry.reviewer_notes = reviewer_notes
    entry.updated_at = datetime.utcnow()
    entry.locked_by = None
    entry.locked_at = None

    try:
        db.session.commit()

        # Emit audit trail
        record_audit(
            actor_id=int(admin_id),
            action=f'submission_{action.lower()}',
            target_table='datasets',
            target_id=entry_id,
            before={'status': before_status},
            after={'status': entry.status, 'rejection_reason': entry.rejection_reason}
        )

        # Auto-calculate quality penalty alerts
        total_submissions = Dataset.query.filter_by(collector_id=collector_id).count()
        null_rejections = Dataset.query.filter_by(
            collector_id=collector_id,
            status='Rejected',
            rejection_reason='HIGH_NULL_VALUES'
        ).count()

        failure_rate = (null_rejections / total_submissions) if total_submissions > 0 else 0

        audit_response = {
            "message": f"Entry {entry_id} successfully updated to {entry.status}.",
            "audit": {
                "collector_id": collector_id,
                "total_submissions": total_submissions,
                "high_null_rejections": null_rejections,
                "null_failure_rate_percentage": round(failure_rate * 100, 2)
            }
        }

        if failure_rate > 0.20 and total_submissions >= 5:
            audit_response["audit"]["quality_alert"] = "⚠️ CRITICAL: Collector exceeding spam threshold. Financial deduction active."

        return jsonify(audit_response), 200

    except Exception as e:
        db.session.rollback()
        return jsonify({"error": f"Database write error: {str(e)}"}), 500
