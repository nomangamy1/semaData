from flask import Blueprint ,jsonify ,request 
from models import Feature 
from models import Domain,User, DomainOwner,Dataset
from extensions import db 
import secrets
import json
import string
import random

def generate_ref_number(domain_name):
    prefix = domain_name[:4].upper()
    suffix = ''.join(secrets.choice(string.ascii_uppercase + string.digits) for _ in range(6))
    return f"{prefix}--{suffix}"


domain_bp = Blueprint("domain",__name__)

@domain_bp.route('/domain',methods=['POST'])
def domain_register():
    try:
        data = request.get_json()
        owner_id = data.get('id')
        features_list = data.get("domain_features",[])
        target_goal = data.get('target_goal')


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

        system_buffer_goal = int(target_goal * 2.10)  # 10% buffer

        if not isinstance(domain_features, list):
            return jsonify({"error": "Domain features must be a list"}), 400
        domain = Domain(
            domain_name=domain_name,
            owner_id = data.get('id'),
            reference_number=reference_number,
            target_goal=system_buffer_goal,
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

@domain_bp.route('/my-domains/<int:owner_id>', methods=['GET'])
def get_owner_domains(owner_id):
    domains = Domain.query.filter_by(owner_id=owner_id).all()
    output = []
    for d in domains:
        feature_counts = len(d.domain_features) if hasattr(d,'domain_features') else 0  # Assuming a relationship 'domain_features' exists
        submission_counts = Dataset.query.filter_by(domain_id=d.id).count()  # Assuming a relationship 'submissions' exists
        collector_count = User.query.filter_by(reference_number=d.reference_number).count()
         # Assuming a relationship 'collectors' exists
        output.append({
            "domain_name": d.domain_name,
            "reference_number": d.reference_number,
            "feature_count": feature_counts,
            "collector_count": collector_count,
            "submission_count": submission_counts
        })
    return jsonify(output), 200


'''
Here on the domain features,I should consider 
adding some floating showing the resepcts the data collectors should consider 
when collecting data:
for example if Location is there should 
for certain age or 


dataset features specification 
'''