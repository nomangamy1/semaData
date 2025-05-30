from flask import Blueprint, jsonify, request, Response
from flask_jwt_extended import jwt_required, get_jwt_identity
from models import Domain, DomainOwner
from models.dataset import Dataset
from models.Transcription import Transcription
from extensions import db
import json
import csv
import io

export_bp = Blueprint("export", __name__)


@export_bp.route("/domain/<int:domain_id>/export", methods=["GET"])
@jwt_required()
def export_dataset(domain_id):
    """
    Domain owner downloads their full dataset as CSV.
    Each row = one submission with all extracted feature values.
    """
    current_user_id = get_jwt_identity()

    # Verify ownership
    domain = Domain.query.get(domain_id)
    if not domain:
        return jsonify({"error": "Domain not found"}), 404
    if str(domain.owner_id) != str(current_user_id):
        return jsonify({"error": "Unauthorized"}), 403
    if not domain.is_active:
        return jsonify({"error": "Domain not yet activated"}), 403

    # Get all datasets for this domain
    datasets = Dataset.query.filter_by(domain_id=domain_id).all()
    if not datasets:
        return jsonify({"error": "No submissions yet"}), 404

    # Get feature names from domain
    feature_names = [f.name for f in domain.domain_features] if hasattr(domain, "domain_features") else []

    # Build CSV in memory
    output = io.StringIO()
    
    # Base columns always present
    base_cols = ["submission_id", "collector_id", "contributor_name",
                 "transcription", "status", "submitted_at"]
    
    # Feature columns from domain schema
    all_cols = base_cols + feature_names

    writer = csv.DictWriter(output, fieldnames=all_cols, extrasaction="ignore")
    writer.writeheader()

    for dataset in datasets:
        # Get transcription records for this dataset
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
                "contributor_name":  t.contributor_name,
                "transcription":     t.transcription_text,
                "status":            dataset.status,
                "submitted_at":      t.created_at.isoformat() if t.created_at else "",
            }

            # Add each feature value
            for feat in feature_names:
                row[feat] = features.get(feat, "")

            writer.writerow(row)

    output.seek(0)
    filename = f"{domain.domain_name.replace(' ', '_')}_dataset.csv"

    return Response(
        output.getvalue(),
        mimetype="text/csv",
        headers={
            "Content-Disposition": f"attachment; filename={filename}",
            "Content-Type": "text/csv"
        }
    )


@export_bp.route("/domain/<int:domain_id>/preview", methods=["GET"])
@jwt_required()
def preview_dataset(domain_id):
    """
    Preview first 10 rows of dataset as JSON — for dashboard display.
    """
    current_user_id = get_jwt_identity()

    domain = Domain.query.get(domain_id)
    if not domain:
        return jsonify({"error": "Domain not found"}), 404
    if str(domain.owner_id) != str(current_user_id):
        return jsonify({"error": "Unauthorized"}), 403

    feature_names = [f.name for f in domain.domain_features] if hasattr(domain, "domain_features") else []

    datasets = Dataset.query.filter_by(domain_id=domain_id).limit(10).all()

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
                "contributor_name": t.contributor_name,
                "transcription":    t.transcription_text[:100] + "..." if len(t.transcription_text) > 100 else t.transcription_text,
                "status":           dataset.status,
                "submitted_at":     t.created_at.isoformat() if t.created_at else "",
                "features":         {feat: features.get(feat, None) for feat in feature_names}
            }
            rows.append(row)

    return jsonify({
        "domain_name":   domain.domain_name,
        "feature_schema": feature_names,
        "total_submissions": Dataset.query.filter_by(domain_id=domain_id).count(),
        "preview_rows":  rows[:10]
    }), 200
