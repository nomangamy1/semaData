from flask import Flask ,Blueprint,request,jsonify
from werkzeug.security import generate_password_hash
from semaData import semaData
from Backend.models import User ,Domain
from forms import UserRegistrationForm
from extensions import db
from email import send_email


register_bp = Blueprint("register",__name__)

@register_bp.route(url_prefix = '/signUp',methods = ['GET','POST'])
#in this case we have the user and the domainowner
def signUp():
    data =request.json()
    role =data['role']
    if role == User:
        domain = Domain.query.filter_by(reference_number=data['reference_number']).first()
        if not domain:
            return {"error ": 'Invalid reference Number'},400
        
        user = User(
            username = data['username'],
            password =generate_password_hash(data['password']),
            role =role,
            reference_number = data.get('reference_number')
        )
        db.session.add(user)
        db.session.commit()
        return {'message':"User Registered"},201
    