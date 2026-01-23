from flask import Blueprint ,jsonify ,request 
from models import Domain,User 
from extensions import db 
import secrets

def generate_ref_number():
    """Generate a unique one-time reference number for domain registration."""
    return secrets.token_hex(4)  # Generates an 8-character hexadecimal string

domain_bp = Blueprint("domain",__name__)

@domain_bp.route('/domain',methods=['POST'])
def domain_register():
    data = request.get_json()
    reference_number = generate_ref_number()
    domain = Domain(
        domain_name = data['domain_name'],
        reference_number = reference_number,
        owner_id = data['owner_id'],  # Assuming owner_id is passed as a flat key
        domain_features = str(data.get("domain_features",""))        
    )
    db.session.add(domain)
    db.session.commit()

    return jsonify({"reference_number": reference_number}), 201