from flask import Blueprint ,jsonify ,request 
from models import Feature 
from models import Domain,User, DomainOwner
from extensions import db 
import secrets
import json
import random

def generate_ref_number():
    return random.randint(100000, 999999)  # Generates a 6-digit integer

domain_bp = Blueprint("domain",__name__)

@domain_bp.route('/domain',methods=['POST'])
def domain_register():
    try:
        data = request.get_json()
        owner_id = data.get('id')
        features_list = data.get("domain_features",[])
        if not owner_id:
            return jsonify({"error": "Owner ID is required"}), 400
        
        owner = DomainOwner.query.get(owner_id)
        if not owner:
            return jsonify({"error": "Invalid owner ID"}), 400
        domain_name = data.get('domain_name')
        if not domain_name:
            return jsonify({"error": "Domain name is required"}), 400
        existing_domain = Domain.query.filter_by(domain_name=domain_name).first()
        if existing_domain:
            return jsonify({"error": "Domain name already exists"}), 400
        
        reference_number = generate_ref_number()

        owner.reference_number = reference_number 
        domain_features = data.get('domain_features', [])

        if not isinstance(domain_features, list):
            return jsonify({"error": "Domain features must be a list"}), 400
        domain = Domain(
            domain_name=domain_name,
            owner_id = data.get('id'),
            reference_number=reference_number,
        )
        db.session.add(domain)
        db.session.flush()


        for feature_name in features_list: 
            if feature_name.strip():
                feat = Feature(
                    name=feature_name.strip(),
                    domain_id = domain.id,
                )
                db.session.add(feat)


        db.session.commit()

        return jsonify({
            "message": "Domain and Features saved successfully",
            "reference_number": reference_number,
            "domain_name": domain_name
        }), 201

      

    except Exception as e:
        return jsonify({"error": str(e)}), 500