from flask import Blueprint, jsonify, request
from models import Feature
from models import Domain, User, DomainOwner, Dataset
from extensions import db
from flask_jwt_extended import jwt_required, get_jwt_identity
import secrets
import json
import string


def generate_ref_number(domain_name):
    prefix = domain_name[:4].upper()
    suffix = ''.join(secrets.choice(string.ascii_uppercase + string.digits) for _ in range(6))
    return f"{prefix}--{suffix}"


domain_bp = Blueprint("domain", __name__)


@domain_bp.route('/domain', methods=['POST'])
@jwt_required()  # ✅ PROTECTED — owner identity comes from token, not body
def domain_register():
    try:
        # ✅ Get owner ID from JWT — never trust the request body for identity
        current_user_id = get_jwt_identity()
        try:
            owner_id = int(current_user_id)
        except (ValueError, TypeError):
            owner_id = current_user_id

        owner = DomainOwner.query.get(owner_id)
        if not owner:
            return jsonify({"error": "Invalid owner. Please log in again."}), 403

        data = request.get_json()
        domain_name = data.get('domain_name')
        if not domain_name:
            return jsonify({"error": "Domain name is required"}), 400

        existing_domain = Domain.query.filter_by(domain_name=domain_name).first()
        if existing_domain:
            return jsonify({"error": "Domain name already exists"}), 400

        features_list = data.get('domain_features', [])
        if not isinstance(features_list, list):
            return jsonify({"error": "Domain features must be a list"}), 400

        requirements_text = data.get('requirements')

        # Payment calculation
        price_per_response = 20
        try:
            target_goal_numeric = int(data.get('target_goal', 0))
        except (ValueError, TypeError):
            target_goal_numeric = 0

        total_budget = price_per_response * target_goal_numeric
        deposit_amount = float(total_budget) * 0.3

        reference_number = generate_ref_number(domain_name)
        owner.reference_number = reference_number

        domain = Domain(
            domain_name=domain_name,
            owner_id=owner_id,  # ✅ Always from JWT, never from request body
            reference_number=reference_number,
            target_goal=target_goal_numeric,
            total_budget=total_budget,
            requirements=requirements_text,
            deposit_amount=deposit_amount
        )
        db.session.add(domain)
        db.session.flush()

        for feature_name in features_list:
            if feature_name.strip():
                feat = Feature(
                    name=feature_name.strip(),
                    domain_id=domain.id,
                )
                db.session.add(feat)

        db.session.commit()

        return jsonify({
            "message": "Domain and Features saved successfully",
            "domain_id": domain.id,
            "reference_number": reference_number,
            "domain_name": domain_name,
            "deposit": deposit_amount,
            "target_goal": target_goal_numeric,
            "total_budget": total_budget
        }), 201

    except Exception as e:
        db.session.rollback()
        return jsonify({"error": str(e)}), 500


@domain_bp.route('/my-domains', methods=['GET'])
@jwt_required()
def get_my_domains():
    current_user_id = get_jwt_identity()

    try:
        query_id = int(current_user_id)
    except (ValueError, TypeError):
        query_id = current_user_id

    domains = Domain.query.filter_by(owner_id=query_id).all()
    if not domains:
        return jsonify([]), 200

    output = []
    for d in domains:
        feature_counts = len(d.domain_features) if hasattr(d, 'domain_features') else 0
        submission_counts = Dataset.query.filter_by(domain_id=d.id).count()
        collector_count = User.query.filter_by(reference_number=d.reference_number).count()
        datasets = Dataset.query.filter_by(domain_id=d.id).all()

        dataset_list = []
        for ds in datasets:
            dataset_list.append({
                "ref_number": ds.reference_number,
                "segmented_text": json.loads(ds.segmented_text) if ds.segmented_text else None,
                "status": ds.status
            })

        output.append({
            "domain_name": d.domain_name,
            "reference_number": d.reference_number,
            "domain_field": d.requirements[:30] + "..." if d.requirements else "General Research",
            "datasets": dataset_list,
            "feature_count": feature_counts,
            "collector_count": collector_count,
            "submission_count": submission_counts,
            "total_budget": d.total_budget,
            "deposit_amount": d.deposit_amount,
            "amount_paid": d.amount_paid or 0,
            "payment_status": d.payment_status,
            "domain_id": d.id
        })

    return jsonify(output), 200