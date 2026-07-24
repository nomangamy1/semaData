from flask import Blueprint, jsonify, request, send_file
from flask_jwt_extended import jwt_required, get_jwt_identity
from models.user import User
from models.dataset import Dataset
from models.Transcription import Transcription
from models.domain import Domain
from models.payments import Payment,AdminDisbursement
from extensions import db
from datetime import datetime
import json
import os

submission_bp = Blueprint("submission_review", __name__)

PLATFORM_CUT   = 0.20
DEFAULT_RATE   = 20.0
MIN_PAYOUT_KES = 100.0


def require_admin(identity):
    user = User.query.filter(User.id == int(identity)).first()
    return user if (user and user.role.lower() == 'admin') else None


def _collector_rate(domain):
    rate = float(getattr(domain, 'rate_per_submission', DEFAULT_RATE) or DEFAULT_RATE)
    return rate * (1 - PLATFORM_CUT)


# ─── GET /api/admin/submissions ───────────────────────────────────────────────
@submission_bp.route('/submissions', methods=['GET'])
@jwt_required()
def list_submissions():
    admin_id = get_jwt_identity()
    user = User.query.get(int(admin_id))
    if not require_admin(admin_id):
        return jsonify({"error": "Unauthorized"}), 403
        
    total_pending = Dataset.query.filter_by(status='pending_review').count()
   
    query = Dataset.query
    
    # Apply domain filtering for non-super admins
    if user.is_super_admin and total_pending > 5:
        domain_ids = [d.id for d in user.assigned_domains]
        query = query.filter(Dataset.domain_id.in_(domain_ids))

    status_filter = request.args.get('status', 'pending_review')
    domain_id     = request.args.get('domain_id')
    page          = int(request.args.get('page', 1))

    if status_filter and status_filter != 'all':
        query = query.filter_by(status=status_filter)
    if domain_id:
        query = query.filter_by(domain_id=int(domain_id))

    query = query.order_by(Dataset.created_at.desc())
    paged = query.paginate(page=page, per_page=20, error_out=False)

    submissions = []
    for ds in paged.items:
        # Get latest transcription
        transcription = Transcription.query.filter_by(
            dataset_id=ds.id
        ).order_by(Transcription.created_at.desc()).first()

        # Parse features
        features = {}
        try:
            features = json.loads(ds.segmented_text) if ds.segmented_text else {}
        except (json.JSONDecodeError, TypeError):
            pass

        # Get collector name
        collector = User.query.get(ds.collector_id)
        domain    = Domain.query.get(ds.domain_id)

        submissions.append({
            "id":               ds.id,
            "locked_by":        ds.locked_by, 
            "is_locked":        ds.locked_by is not None and (datetime.utcnow() - ds.locked_at).total_seconds() < 600,
            "status":           ds.status,
            "collector_id":     ds.collector_id,
            "contributor_name": transcription.contributor_name if transcription else (
                f"{collector.first_name} {collector.second_name or ''}".strip() if collector else "Unknown"
            ),
            "domain_name":      domain.domain_name if domain else "Unknown",
            "domain_id":        ds.domain_id,
            "ref_number":       ds.ref_number,
            "transcription":    transcription.transcription_text if transcription else ds.combined_text,
            "features":         features,
            "audio_file_path":  ds.audio_file_path,
            "submitted_at":     ds.created_at.isoformat() if ds.created_at else None,
        })

    return jsonify({
        "submissions":   submissions,
        "total":         paged.total,
        "pages":         paged.pages,
        "current_page":  page,
    }), 200

# ─── GET /api/admin/submission/<id>/audio ─────────────────────────────────────
@submission_bp.route('/submission/<int:dataset_id>/audio', methods=['GET'])
@jwt_required()
def serve_audio(dataset_id):
    admin_id = get_jwt_identity()
    if not require_admin(admin_id):
        return jsonify({"error": "Unauthorized"}), 403

    ds = Dataset.query.get_or_404(dataset_id)
    if not ds.audio_file_path or not os.path.exists(ds.audio_file_path):
        return jsonify({"error": "Audio file not found"}), 404

    return send_file(
        ds.audio_file_path,
        mimetype='audio/wav',
        as_attachment=False
    )


# ─── POST /api/admin/submission/<id>/approve ──────────────────────────────────
@submission_bp.route('/submission/<int:dataset_id>/approve', methods=['POST'])
@jwt_required()
def approve_submission(dataset_id):
    admin_id = get_jwt_identity()
    if not require_admin(admin_id):
        return jsonify({"error": "Unauthorized"}), 403

    ds = Dataset.query.get_or_404(dataset_id)
    if ds.status == 'Verified':
        return jsonify({"message": "Already approved"}), 200

    ds.status = 'Verified'

    # Credit collector earnings in Payment table
    domain         = Domain.query.get(ds.domain_id)
    collector_rate = _collector_rate(domain) if domain else DEFAULT_RATE * (1 - PLATFORM_CUT)

    # Check quality multiplier based on collector's approval rate
    total    = Dataset.query.filter_by(collector_id=ds.collector_id).count()
    approved = Dataset.query.filter_by(
        collector_id=ds.collector_id, status='Verified'
    ).count() + 1  # +1 for this one being approved now

    rate = approved / total if total else 1.0
    multiplier = 1.2 if rate >= 0.95 else 1.0 if rate >= 0.85 else 0.85 if rate >= 0.70 else 0.7
    earned = round(collector_rate * multiplier, 2)


    # ✅ Write to collector_earnings — this is the earning ledger
    # AdminDisbursement is only created when collector REQUESTS withdrawal
    earning_ref = f"EARN-DS-{ds.id}"
    already_earned = db.session.execute(
        db.text("SELECT id FROM collector_earnings WHERE transaction_ref = :ref"),
        {"ref": earning_ref}
    ).fetchone()

    if not already_earned:
        db.session.execute(
            db.text("""
                INSERT INTO collector_earnings
                    (collector_id, dataset_id, domain_id, amount, quality_multiplier, status, transaction_ref, processed_at)
                VALUES
                    (:cid, :did, :dmid, :amount, :mult, 'earned', :ref, NOW())
            """),
            {
                "cid":    ds.collector_id,
                "did":    ds.id,
                "dmid":   ds.domain_id,
                "amount": earned,
                "mult":   multiplier,
                "ref":    earning_ref
            }
        )
        db.session.commit()

        return jsonify({
            "message":    f"Submission approved. KES {earned} credited to collector balance.",
            "dataset_id": dataset_id,
            "earned":     earned,
            "multiplier": multiplier,
            "status":     "Verified"
        }), 200
    else:
        return jsonify({"message": "Earning already recorded for this submission"}), 200


# ─── POST /api/admin/submission/<id>/reject ───────────────────────────────────
@submission_bp.route('/submission/<int:dataset_id>/reject', methods=['POST'])
@jwt_required()
def reject_submission(dataset_id):
    admin_id = get_jwt_identity()
    if not require_admin(admin_id):
        return jsonify({"error": "Unauthorized"}), 403

    ds     = Dataset.query.get_or_404(dataset_id)
    data   = request.get_json() or {}
    reason = data.get('reason', 'Quality standards not met')

    ds.status = 'rejected'
    db.session.commit()

    return jsonify({
        "message":    "Submission rejected",
        "dataset_id": dataset_id,
        "reason":     reason,
        "status":     "rejected"
    }), 200


# ─── GET /api/admin/payouts/pending ───────────────────────────────────────────
@submission_bp.route('/payouts/pending', methods=['GET'])
@jwt_required()
def get_pending_payouts():
    admin_id = get_jwt_identity()
    if not require_admin(admin_id):
        return jsonify({"error": "Unauthorized"}), 403

    pending = Payment.query.filter_by(status='pending').order_by(
        Payment.processed_at.desc()
    ).all()

    result = []
    for p in pending:
        collector = User.query.get(p.collector_id)
        result.append({
            "id":            p.id,
            "collector_id":  p.collector_id,
            "collector_name": f"{collector.first_name} {collector.second_name or ''}".strip() if collector else "Unknown",
            "collector_email": collector.email if collector else "",
            "mpesa_number":  getattr(collector, 'mpesa_number', '') if collector else '',
            "paypal_email":  getattr(collector, 'paypal_email', '') if collector else '',
            "gateway":       getattr(collector, 'preferred_gateway', 'MPESA') if collector else 'MPESA',
            "amount":        float(p.amount),
            "reference":     p.transaction_ref,
            "requested_at":  p.processed_at.isoformat() if p.processed_at else None,
        })

    return jsonify(result), 200


@submission_bp.route('/submission/<int:dataset_id>/lock', methods=['POST'])
@jwt_required()
def lock_submission(dataset_id):
    admin_id = get_jwt_identity()
    ds = Dataset.query.get_or_404(dataset_id)
    
    # If already locked, check if it's expired (e.g., 10 mins)
    if ds.locked_by and ds.locked_at:
        if (datetime.utcnow() - ds.locked_at).total_seconds() < 600:
            return jsonify({"error": "Submission is currently being reviewed by another admin"}), 409
            
    # Lock the submission
    ds.locked_by = int(admin_id)
    ds.locked_at = datetime.utcnow()
    db.session.commit()
    return jsonify({"message": "Locked"}), 200


# ─── PATCH /api/admin/submission/<id>/edit ────────────────────────────────────
@submission_bp.route('/submission/<int:dataset_id>/edit', methods=['PATCH'])
@jwt_required()
def edit_submission(dataset_id):
    """
    Reviewer edits transcription text and/or extracted features.
    This is the human-in-the-loop correction step before approval.
    The corrected data is what gets exported to the domain owner.
    """
    admin_id = get_jwt_identity()
    if not require_admin(admin_id):
        return jsonify({"error": "Unauthorized"}), 403

    ds   = Dataset.query.get_or_404(dataset_id)
    data = request.get_json() or {}

    corrected_text     = data.get('transcription')
    corrected_features = data.get('features')

    if corrected_text is not None:
        ds.combined_text = corrected_text.strip()
        # Also update the transcription record
        t = Transcription.query.filter_by(
            dataset_id=dataset_id
        ).order_by(Transcription.created_at.desc()).first()
        if t:
            t.transcription_text = corrected_text.strip()

    if corrected_features is not None:
        if isinstance(corrected_features, dict):
            ds.segmented_text = json.dumps(corrected_features)
            # Update transcription domain_features too
            t = Transcription.query.filter_by(
                dataset_id=dataset_id
            ).order_by(Transcription.created_at.desc()).first()
            if t:
                t.domain_features = json.dumps(corrected_features)
        else:
            return jsonify({"error": "features must be a JSON object"}), 400

    ds.status = 'pending_review'  # Keep as pending until explicitly approved
    db.session.commit()

    return jsonify({
        "message":    "Submission updated successfully",
        "dataset_id": dataset_id,
        "transcription": ds.combined_text,
        "features":   json.loads(ds.segmented_text) if ds.segmented_text else {}
    }), 200
