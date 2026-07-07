from flask import Blueprint, jsonify, request
from models import Feature
from models import Domain, User, DomainOwner, Dataset
from extensions import db
from flask_jwt_extended import jwt_required, get_jwt_identity
from models.JobApplication import JobApplication
from models.Job import Job
import secrets
import json
import string

def generate_ref_number(domain_name):
    prefix = domain_name[:4].upper().replace(" ", "")
    suffix = "".join(secrets.choice(string.ascii_uppercase + string.digits) for _ in range(6))
    return f"{prefix}--{suffix}"

domain_bp = Blueprint("domain", __name__)


@domain_bp.route("/domain", methods=["POST"])
@jwt_required()
def domain_register():
    try:
        jwt_identity = get_jwt_identity()
        
        # ─── COMPOSITE IDENTITY EXTRACTION ──────────────────────────────
        if isinstance(jwt_identity, dict):
            current_user_id = jwt_identity.get("id")
            user_role = jwt_identity.get("role")
        else:
            current_user_id = jwt_identity
            user_role = "domainowner"  # Fallback for old primitive tokens

        # Safeguard: Verify identity and restrict to domain owners
        owner = DomainOwner.query.filter_by(id=int(current_user_id)).first()
        if not owner or (user_role and user_role != "domainowner"):
            return jsonify({"error": "Unauthorized Access. Domain Owner profile required."}), 403
        # ────────────────────────────────────────────────────────────────

        data = request.get_json()
        domain_name = data.get("domain_name", "").strip()
        if not domain_name:
            return jsonify({"error": "Domain name is required"}), 400
        existing_domain = Domain.query.filter_by(domain_name=domain_name).first()
        if existing_domain:
            return jsonify({"error": "Domain name already exists"}), 400
        features_list = data.get("domain_features", [])
        if not isinstance(features_list, list):
            return jsonify({"error": "Domain features must be a list"}), 400
        requirements_text = data.get("requirements")
        price_per_response = 20
        try:
            target_goal_numeric = int(data.get("target_goal", 0))
        except (ValueError, TypeError):
            target_goal_numeric = 0
        total_budget   = price_per_response * target_goal_numeric
        deposit_amount = float(total_budget) * 0.3
        
        # Call the generator token here explicitly instead of using None
        assigned_reference_token = generate_ref_number(domain_name)

        domain = Domain(
            domain_name=domain_name,
            owner_id=owner.id,
            reference_number=assigned_reference_token,
            target_goal=target_goal_numeric,
            total_budget=total_budget,
            requirements=requirements_text,
            deposit_amount=deposit_amount,
            payment_status="pending",
            is_active=False
        )
        db.session.add(domain)
        db.session.flush()
        for feature_name in features_list:
            if feature_name.strip():
                feat = Feature(name=feature_name.strip(), domain_id=domain.id)
                db.session.add(feat)
        db.session.commit()
        return jsonify({
            "message":        "Domain saved. Pay the deposit to activate.",
            "domain_id":      domain.id,
            "domain_name":    domain_name,
            "deposit":        deposit_amount,
            "target_goal":    target_goal_numeric,
            "total_budget":   total_budget,
            "payment_status": "pending",
            "is_active":      False,
        }), 201
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": str(e)}), 500


@domain_bp.route("/my-domains", methods=["GET"])
@jwt_required()
def get_my_domains():
    jwt_identity = get_jwt_identity()
    
    # ─── COMPOSITE IDENTITY EXTRACTION ──────────────────────────────
    if isinstance(jwt_identity, dict):
        query_id = jwt_identity.get("id")
    else:
        query_id = jwt_identity

    try:
        query_id = int(query_id)
    except (ValueError, TypeError):
        pass
    # ────────────────────────────────────────────────────────────────

    domains = Domain.query.filter_by(owner_id=query_id).all()
    if not domains:
        return jsonify([]), 200
    output = []
    for d in domains:
        feature_count    = len(d.domain_features) if hasattr(d, "domain_features") else 0
        submission_count = Dataset.query.filter_by(domain_id=d.id).count()
        job_ids = [j.id for j in Job.query.filter_by(domain_id=d.id).all()]
        if job_ids:
            collector_count = User.query.filter(
                User.reference_number.in_(
                    db.session.query(JobApplication.reference_number_assigned).filter(
                        JobApplication.job_id.in_(job_ids),
                        JobApplication.status == "approved",
                        JobApplication.assigned_user_id.isnot(None)
                    )
                )
            ).count()
        else:
            collector_count = 0
        datasets = Dataset.query.filter_by(domain_id=d.id).all()
        dataset_list = []
        for ds in datasets:
            dataset_list.append({
                "ref_number":     ds.reference_number,
                "segmented_text": json.loads(ds.segmented_text) if ds.segmented_text else None,
                "status":         ds.status
            })
        output.append({
            "domain_name":      d.domain_name,
            "reference_number": d.reference_number,
            "domain_field":      d.requirements[:30] + "..." if d.requirements else "General Research",
            "datasets":         dataset_list,
            "feature_count":    feature_count,
            "collector_count":  collector_count,
            "submission_count": submission_count,
            "total_budget":      d.total_budget,
            "deposit_amount":   d.deposit_amount,
            "amount_paid":      d.amount_paid or 0,
            "payment_status":   d.payment_status,
            "is_active":        d.is_active,
            "domain_id":        d.id
        })
    return jsonify(output), 200


# ─── PATCH /api/domain/<id>/features ──────────────────────────────────────────
@domain_bp.route('/domain/<int:domain_id>/features', methods=['PATCH'])
@jwt_required()
def edit_domain_features(domain_id):
    """
    Domain owner edits feature schema after creation.
    Allows adding new features and removing unused ones.
    Existing data is preserved — removing a feature just stops asking for it
    in future submissions, it does not delete historical data.
    """
    current_user_id = get_jwt_identity()
    domain = Domain.query.get_or_404(domain_id)

    if str(domain.owner_id) != str(current_user_id):
        return jsonify({"error": "Unauthorized — not your domain"}), 403

    data = request.get_json() or {}
    add_features    = data.get('add_features', [])
    remove_feature_ids = data.get('remove_feature_ids', [])

    if not isinstance(add_features, list) or not isinstance(remove_feature_ids, list):
        return jsonify({"error": "add_features and remove_feature_ids must be lists"}), 400

    # Remove specified features
    removed = []
    for fid in remove_feature_ids:
        feat = Feature.query.filter_by(id=fid, domain_id=domain_id).first()
        if feat:
            removed.append(feat.name)
            db.session.delete(feat)

    # Add new features
    added = []
    existing_names = {f.name.lower() for f in domain.domain_features}
    for name in add_features:
        name = name.strip()
        if name and name.lower() not in existing_names:
            new_feat = Feature(name=name, domain_id=domain_id)
            db.session.add(new_feat)
            added.append(name)
            existing_names.add(name.lower())

    db.session.commit()

    current_features = [f.name for f in Domain.query.get(domain_id).domain_features]

    return jsonify({
        "message":          "Feature schema updated",
        "added":            added,
        "removed":          removed,
        "current_features": current_features
    }), 200
