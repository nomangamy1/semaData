from flask import Blueprint, request, jsonify
# Importing your precise model signature layout
from models.dataset import Dataset 
from extensions import db
from datetime import datetime

adminR_bp = Blueprint('admin_bp', __name__)

# ─── FETCH ALL ENTRIES AWAITING HUMAN REVIEW ───
@adminR_bp.route('/api/admin/review-queue', methods=['GET'])
def get_review_queue():
    # Matching your lowercase status 'pending' configuration
    pending_entries = Dataset.query.filter_by(status='pending').order_by(Dataset.updated_at.asc()).all()
    
    queue_data = []
    for entry in pending_entries:
        queue_data.append({
            "id": entry.id,
            "domain_id": entry.domain_id,
            "collector_id": entry.collector_id,
            "raw_transcription": entry.combined_text,
            "audio_url": f"http://localhost:8000/static/audio/{entry.audio_file_path}",
            "ai_confidence": float(entry.Ai_confidence) if entry.Ai_confidence else 1.00
        })
        
    return jsonify(queue_data), 200

# ─── UPDATE ENTRY QUALITY STATUS & CALCULATE FAILURES ───
@adminR_bp.route('/api/admin/verify-entry/<int:entry_id>', methods=['POST'])
def verify_entry(entry_id):
    entry = Dataset.query.get_or_404(entry_id)
    data = request.get_json() or {}
    
    action = data.get('action') # 'VERIFY' or 'REJECT'
    polished_text = data.get('polished_text', '').strip()
    rejection_reason = data.get('rejection_reason') # e.g., 'HIGH_NULL_VALUES', 'POOR_AUDIO_QUALITY'
    reviewer_notes = data.get('reviewer_notes', '')

    if not action:
        return jsonify({"error": "Administrative action code payload is missing."}), 400

    collector_id = entry.collector_id

    if action == 'VERIFY':
        # Catch explicit textual null inputs manually input during review
        if not polished_text or polished_text.lower() in ['none', 'null', 'nan', '']:
            return jsonify({"error": "Verified entries cannot contain empty or system-null transcription values."}), 400
        
        entry.combined_text = polished_text
        entry.status = 'Verified'
        entry.rejection_reason = None
        
    elif action == 'REJECT':
        if not rejection_reason:
            return jsonify({"error": "A structural rejection reason must be specified to evaluate collector performance fines."}), 400
            
        entry.status = 'Rejected'
        entry.rejection_reason = rejection_reason # Logs 'HIGH_NULL_VALUES'
        
    else:
        return jsonify({"error": "Invalid administrative action specified."}), 400

    entry.reviewer_notes = reviewer_notes
    entry.updated_at = datetime.utcnow()
    
    try:
        db.session.commit()

        # ─── AUTO-CALCULATE QUALITY PENALTY ALERTS ───
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

        # Flag inside response if user has crossed the 20% spam threshold
        if failure_rate > 0.20 and total_submissions >= 5:
            audit_response["audit"]["quality_alert"] = "⚠️ CRITICAL: Collector exceeding spam threshold. Financial deduction active on ledger."

        return jsonify(audit_response), 200

    except Exception as e:
        db.session.rollback()
        return jsonify({"error": f"Database write crash executing transaction: {str(e)}"}), 500
