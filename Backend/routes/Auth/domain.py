from flask import Blueprint, jsonify, request
from models import Feature, DomainDraft, DomainOwnerNotification, Transcription
from models import Domain, User, DomainOwner, Dataset
from extensions import db
from flask_jwt_extended import get_jwt, get_jwt_identity, jwt_required
from models.JobApplication import JobApplication
from models.Job import Job
import secrets
import json
import string
from datetime import datetime

def generate_ref_number(domain_name):
    prefix = domain_name[:4].upper().replace(" ", "")
    suffix = "".join(secrets.choice(string.ascii_uppercase + string.digits) for _ in range(6))
    return f"{prefix}--{suffix}"

domain_bp = Blueprint("domain", __name__)


def _get_domain_owner():
    jwt_identity = get_jwt_identity()
    claims = get_jwt()
    if isinstance(jwt_identity, dict):
        owner_id = jwt_identity.get("id")
        role = jwt_identity.get("role") or claims.get("role")
    else:
        owner_id = jwt_identity
        role = claims.get("role", "domainowner")

    if role and str(role).strip().lower() not in {"domainowner", "domain_owner"}:
        return None
    try:
        return DomainOwner.query.get(int(owner_id))
    except (TypeError, ValueError):
        return None


@domain_bp.route("/domain-notifications", methods=["GET"])
@jwt_required()
def list_domain_owner_notifications():
    owner = _get_domain_owner()
    if not owner:
        return jsonify({"error": "Domain owner access is required"}), 403

    notifications = DomainOwnerNotification.query.filter_by(owner_id=owner.id).order_by(
        DomainOwnerNotification.created_at.desc()
    ).all()
    return jsonify([{
        "id": notification.id,
        "domain_id": notification.domain_id,
        "domain_name": notification.domain.domain_name,
        "sender_name": notification.sender_name,
        "message": notification.message,
        "created_at": notification.created_at.isoformat(),
        "is_read": notification.read_at is not None,
    } for notification in notifications]), 200


@domain_bp.route("/domain-notifications/<int:notification_id>/read", methods=["PATCH"])
@jwt_required()
def mark_domain_owner_notification_read(notification_id):
    owner = _get_domain_owner()
    if not owner:
        return jsonify({"error": "Domain owner access is required"}), 403

    notification = DomainOwnerNotification.query.filter_by(
        id=notification_id,
        owner_id=owner.id,
    ).first()
    if not notification:
        return jsonify({"error": "Notification not found"}), 404

    if notification.read_at is None:
        notification.read_at = datetime.utcnow()
        db.session.commit()
    return jsonify({"id": notification.id, "is_read": True}), 200


@domain_bp.route("/domain-drafts", methods=["GET"])
@jwt_required()
def list_domain_drafts():
    owner = _get_domain_owner()
    if not owner:
        return jsonify({"error": "Domain owner access is required"}), 403

    drafts = DomainDraft.query.filter_by(owner_id=owner.id).order_by(
        DomainDraft.updated_at.desc()
    ).all()
    return jsonify([{
        "id": draft.id,
        "domain_name": draft.domain_name,
        "updated_at": draft.updated_at.isoformat(),
    } for draft in drafts]), 200


@domain_bp.route("/domain-drafts/<int:draft_id>", methods=["GET"])
@jwt_required()
def get_domain_draft(draft_id):
    owner = _get_domain_owner()
    if not owner:
        return jsonify({"error": "Domain owner access is required"}), 403

    draft = DomainDraft.query.filter_by(id=draft_id, owner_id=owner.id).first()
    if not draft:
        return jsonify({"error": "Draft not found"}), 404
    return jsonify({
        "id": draft.id,
        "domain_name": draft.domain_name,
        "payload": draft.payload,
        "updated_at": draft.updated_at.isoformat(),
    }), 200


@domain_bp.route("/domain-drafts", methods=["POST"])
@jwt_required()
def save_domain_draft():
    owner = _get_domain_owner()
    if not owner:
        return jsonify({"error": "Domain owner access is required"}), 403

    data = request.get_json(silent=True) or {}
    payload = data.get("payload")
    if not isinstance(payload, dict):
        return jsonify({"error": "Draft payload must be an object"}), 400

    draft_id = data.get("draft_id")
    if draft_id is not None:
        try:
            draft_id = int(draft_id)
        except (TypeError, ValueError):
            return jsonify({"error": "Invalid draft id"}), 400
        draft = DomainDraft.query.filter_by(id=draft_id, owner_id=owner.id).first()
        if not draft:
            return jsonify({"error": "Draft not found"}), 404
    else:
        draft = DomainDraft(owner_id=owner.id)
        db.session.add(draft)

    domain_name = payload.get("domain_name", "")
    draft.domain_name = str(domain_name).strip()[:128]
    draft.payload = payload
    db.session.commit()
    return jsonify({
        "id": draft.id,
        "domain_name": draft.domain_name,
        "updated_at": draft.updated_at.isoformat(),
    }), 200


@domain_bp.route("/domain-drafts/<int:draft_id>", methods=["DELETE"])
@jwt_required()
def delete_domain_draft(draft_id):
    owner = _get_domain_owner()
    if not owner:
        return jsonify({"error": "Domain owner access is required"}), 403

    draft = DomainDraft.query.filter_by(id=draft_id, owner_id=owner.id).first()
    if not draft:
        return jsonify({"error": "Draft not found"}), 404
    db.session.delete(draft)
    db.session.commit()
    return jsonify({"message": "Draft deleted"}), 200


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
        feature_definitions = []
        supported_types = {"text", "number", "date", "boolean", "select"}
        for item in features_list:
            if isinstance(item, str):
                feature_name = item.strip()
                definition = None
            elif isinstance(item, dict):
                feature_name = str(item.get("name", "")).strip()
                data_type = item.get("type", "text")
                if not isinstance(data_type, str) or data_type not in supported_types:
                    return jsonify({"error": f"Unsupported feature type: {data_type}"}), 400
                choices = item.get("choices", [])
                if not isinstance(choices, list) or not all(isinstance(choice, str) for choice in choices):
                    return jsonify({"error": "Feature choices must be a list of strings"}), 400
                if data_type == "select" and not any(choice.strip() for choice in choices):
                    return jsonify({"error": f"Select feature '{feature_name}' requires choices"}), 400
                if not isinstance(item.get("required", True), bool) or not isinstance(item.get("repeatable", False), bool):
                    return jsonify({"error": "Feature required and repeatable values must be booleans"}), 400
                definition = {
                    "group": str(item.get("group") or "General").strip() or "General",
                    "type": data_type,
                    "required": item.get("required", True),
                    "choices": [choice.strip() for choice in choices if choice.strip()],
                    "repeatable": item.get("repeatable", False),
                }
            else:
                return jsonify({"error": "Each feature must be a name or feature definition"}), 400

            if feature_name:
                if len(feature_name) > 100:
                    return jsonify({"error": "Feature names must be 100 characters or fewer"}), 400
                feature_definitions.append((feature_name, definition))

        feature_names = [name.casefold() for name, _ in feature_definitions]
        if len(feature_names) != len(set(feature_names)):
            return jsonify({"error": "Feature names must be unique within a dataset"}), 400

        requirements_text = data.get("requirements")
        draft_id = data.get("draft_id")
        draft_to_delete = None
        if draft_id is not None:
            try:
                draft_id = int(draft_id)
            except (TypeError, ValueError):
                return jsonify({"error": "Invalid draft id"}), 400
            draft_to_delete = DomainDraft.query.filter_by(
                id=draft_id,
                owner_id=owner.id,
            ).first()

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
        for feature_name, definition in feature_definitions:
            feat = Feature(
                name=feature_name,
                definition=definition,
                domain_id=domain.id,
            )
            db.session.add(feat)
        if draft_to_delete:
            db.session.delete(draft_to_delete)
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
                "ref_number":     ds.ref_number,
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
            "target_goal":       d.target_goal,
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
