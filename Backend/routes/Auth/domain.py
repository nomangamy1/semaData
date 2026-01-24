from flask import Blueprint ,jsonify ,request 
from models import Domain,User 
from extensions import db 
import secrets

def generate_ref_number():
    return secrets.token_hex(4)  # Generates an 8-character hexadecimal string

domain_bp = Blueprint("domain",__name__)

@domain_bp.route('/domain',methods=['POST'])
def domain_register():
    try:
        data = request.get_json()
        domain_name = data.get('domain_name')
        if not domain_name:
            return jsonify({"error": "Domain name is required"}), 400
        existing_domain = Domain.query.filter_by(domain_name=domain_name).first()
        if existing_domain:
            return jsonify({"error": "Domain name already exists"}), 400
        
        reference_number = generate_ref_number()

        domain_features = data.get('domain_features', [])
        if not isinstance(domain_features, list):
            return jsonify({"error": "Domain features must be a list"}), 400
        domain = Domain(
            owner_id = data.get('id'),
            domain_name=domain_name,
            reference_number=reference_number,
            domain_features=domain_features

        )
        db.session.add(domain)
        db.session.commit()
        return jsonify({"message": "Domain registered successfully",
        "reference_number": reference_number,
        "domain name": domain_name}), 201

    except Exception as e:
        return jsonify({"error": str(e)}), 500