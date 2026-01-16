from flask import Blueprint ,jsonify ,request 
from models import Domain,User 
from extensions import db 

domain_bp = Blueprint("domain",__name__)

@domain_bp.route('/domain',methods=['POST'])
def domain_register():
    data = request.json()
    reference_number =generate_ref_number()
    domain = Domain(
        domain_name = data['domain_name'],
        reference_number = reference_number,
        owner_id = data['owner.id'],
        domain_features = str(data.get("domain_features",""))        
    )
    db.session.add(domain)
    db.session.commit()

    return ("reference_number",reference_number),201