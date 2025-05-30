from flask import Blueprint, jsonify, request, Response
from flask_jwt_extended import jwt_required, get_jwt_identity
from models import Domain, DomainOwner
from models.dataset import Dataset
from models.Transcription import Transcription
from models.Features import Feature
from extensions import db
import json
import csv
import io
from datetime import datetime

export_bp = Blueprint("export", __name__)


@export_bp.route("/domain/<int:domain_id>/export", methods=["GET"])
@jwt_required()
def export_dataset(domain_id):
    """
    Domain owner downloads their full dataset as CSV.
    Each row = one submission with all extracted feature values.
    Features are dynamically loaded from transcriptions and domain schema.
    """
    current_user_id = get_jwt_identity()

    # Verify domain exists and user owns it
    domain = Domain.query.get(domain_id)
    if not domain:
        return jsonify({"error": "Domain not found"}), 404
    
    if str(domain.owner_id) != str(current_user_id):
        return jsonify({"error": "Unauthorized - you don't own this domain"}), 403
    
    if not domain.is_active:
        return jsonify({"error": "Domain not yet activated"}), 403

    # Get all datasets for this domain
    datasets = Dataset.query.filter_by(domain_id=domain_id).all()
    if not datasets:
        return jsonify({"error": "No submissions yet"}), 404

    # Get feature names from domain schema
    try:
        domain_features = Feature.query.filter_by(domain_id=domain_id).all()
        feature_names = [f.name for f in domain_features]
    except Exception as e:
        print(f"Error loading domain features: {e}")
        feature_names = []

    # Collect all unique feature names from transcriptions (dynamic schema)
    transcription_features = set()
    all_transcriptions = Transcription.query.join(Dataset).filter(Dataset.domain_id == domain_id).all()
    for t in all_transcriptions:
        if t.domain_features:
            try:
                features_dict = json.loads(t.domain_features) if isinstance(t.domain_features, str) else t.domain_features
                transcription_features.update(features_dict.keys())
            except (json.JSONDecodeError, TypeError):
                pass
    
    # Merge domain schema features with extracted features (avoid duplicates)
    all_feature_names = sorted(list(set(feature_names) | transcription_features))

    # Build CSV in memory
    output = io.StringIO()
    
    # Base columns always present
    base_cols = ["submission_id", "collector_id", "contributor_name",
                 "transcription", "audio_file", "status", "submitted_at", "quality_score"]
    
    # Feature columns from merged schema
    all_cols = base_cols + all_feature_names

    writer = csv.DictWriter(output, fieldnames=all_cols, extrasaction="ignore")
    writer.writeheader()

    # Write data rows
    for dataset in datasets:
        transcriptions = Transcription.query.filter_by(dataset_id=dataset.id).all()
        
        for t in transcriptions:
            # Parse extracted features
            try:
                features = json.loads(t.domain_features) if isinstance(t.domain_features, str) else (t.domain_features or {})
            except (json.JSONDecodeError, TypeError):
                features = {}

            row = {
                "submission_id":     t.id,
                "collector_id":      t.user_id,
                "contributor_name":  t.contributor_name or "Unknown",
                "transcription":     t.transcription_text,
                "audio_file":        dataset.audio_file_path or "N/A",
                "status":            dataset.status,
                "submitted_at":      t.created_at.isoformat() if t.created_at else "",
                "quality_score":     dataset.quality_score or "N/A"
            }

            # Add each feature value (handles missing keys gracefully)
            for feat in all_feature_names:
                row[feat] = features.get(feat, "")

            writer.writerow(row)

    output.seek(0)
    timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
    filename = f"{domain.domain_name.replace(' ', '_')}_export_{timestamp}.csv"

    return Response(
        output.getvalue(),
        mimetype="text/csv",
        headers={
            "Content-Disposition": f"attachment; filename={filename}",
            "Content-Type": "text/csv; charset=utf-8"
        }
    )


@export_bp.route("/domain/<int:domain_id>/preview", methods=["GET"])
@jwt_required()
def preview_dataset(domain_id):
    """
    Preview first 10 rows of dataset as JSON — for dashboard display.
    Shows real-time data with extracted features.
    """
    current_user_id = get_jwt_identity()

    domain = Domain.query.get(domain_id)
    if not domain:
        return jsonify({"error": "Domain not found"}), 404
    
    if str(domain.owner_id) != str(current_user_id):
        return jsonify({"error": "Unauthorized"}), 403

    # Get feature schema
    try:
        domain_features = Feature.query.filter_by(domain_id=domain_id).all()
        feature_schema = [f.name for f in domain_features]
    except Exception as e:
        print(f"Error loading feature schema: {e}")
        feature_schema = []

    # Get recent datasets
    datasets = Dataset.query.filter_by(domain_id=domain_id).order_by(Dataset.id.desc()).limit(10).all()
    total_count = Dataset.query.filter_by(domain_id=domain_id).count()

    rows = []
    for dataset in datasets:
        transcriptions = Transcription.query.filter_by(dataset_id=dataset.id).all()
        for t in transcriptions:
            try:
                features = json.loads(t.domain_features) if isinstance(t.domain_features, str) else (t.domain_features or {})
            except (json.JSONDecodeError, TypeError):
                features = {}
            
            row = {
                "submission_id":    t.id,
                "contributor_name": t.contributor_name or "Unknown",
                "transcription":    t.transcription_text[:150] + "..." if len(t.transcription_text) > 150 else t.transcription_text,
                "audio_file":       dataset.audio_file_path or "N/A",
                "status":           dataset.status,
                "quality_score":    dataset.quality_score or "N/A",
                "submitted_at":     t.created_at.isoformat() if t.created_at else "",
                "features":         features
            }
            rows.append(row)

    return jsonify({
        "domain_id":         domain_id,
        "domain_name":       domain.domain_name,
        "feature_schema":    feature_schema,
        "total_submissions": total_count,
        "preview_rows":      rows[:10],
        "export_ready":      total_count > 0
    }), 200


@export_bp.route("/domain/<int:domain_id>/stats", methods=["GET"])
@jwt_required()
def get_export_stats(domain_id):
    """
    Get statistics about the domain's dataset for dashboard display.
    Updated in real-time after each transcription.
    """
    current_user_id = get_jwt_identity()

    domain = Domain.query.get(domain_id)
    if not domain:
        return jsonify({"error": "Domain not found"}), 404
    
    if str(domain.owner_id) != str(current_user_id):
        return jsonify({"error": "Unauthorized"}), 403

    # Count submissions by status
    total = Dataset.query.filter_by(domain_id=domain_id).count()
    pending = Dataset.query.filter_by(domain_id=domain_id, status="pending_review").count()
    approved = Dataset.query.filter_by(domain_id=domain_id, status="approved").count()
    rejected = Dataset.query.filter_by(domain_id=domain_id, status="rejected").count()

    # Get feature count
    try:
        feature_count = Feature.query.filter_by(domain_id=domain_id).count()
    except:
        feature_count = 0

    # Get last update time
    last_submission = Transcription.query.join(Dataset).filter(
        Dataset.domain_id == domain_id
    ).order_by(Transcription.created_at.desc()).first()
    
    last_updated = last_submission.created_at.isoformat() if last_submission else None

    return jsonify({
        "domain_id":      domain_id,
        "total_submissions": total,
        "pending_review": pending,
        "approved":       approved,
        "rejected":       rejected,
        "feature_count":  feature_count,
        "last_updated":   last_updated,
        "ready_for_export": total > 0
    }), 200
