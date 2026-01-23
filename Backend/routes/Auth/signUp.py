from flask import Flask ,Blueprint,request,jsonify
from werkzeug.security import generate_password_hash
from models import User ,Domain,DomainOwner
from forms import UserRegistrationForm
from extensions import db
from utils.tokens import generate_verification_token,confirm_token_verification
from utils.email import send_email
from forms import UserRegistrationForm
from flask import url_for
role = 'user'  # Default role for users 
register_bp = Blueprint("register",__name__)

@register_bp.route('/signUp',methods = ['GET','POST'])
#in this case we have the user and the domainowner
def signUp():
    try:
        data =request.get_json()
        role_type = data.get('role')
        email = data.get('email')
        if role_type ==['user']:
            domain = Domain.query.filter_by(reference_number=data['reference_number']).first()
            if not domain:
                return {"error ": 'Invalid domain reference Number'},400
            user = User(
            username = data['username'],
            password =generate_password_hash(data['password']),
            role =role,
            reference_number = data.get('reference_number')
            )
            db.session.add(user)
            db.session.commit()
            return {'message':"User Registered"},201
        else:
            user = DomainOwner(
                username =data['username'],
                email = data['email'],
                DomainField = data["domainField"]

            )
            db.session.add(user)
            db.session.commit()
            return {"Message":'You are now a domainOwner!'}
    
    except Exception as e:
        return{"error": str(e)},500
        
    
   




@register_bp.route('/confirm/<token>',methods =['GET'])
def email_verification(token):
        try:
            email = confirm_token_verification(token)
        except:
            return {'message':"an error occurred"},401
       
        user = User.query.filter_by(email=email).first_or_404()
        if user.isVerified :
            return {"message": "Invalid Input"},422
        else:
            user.isVerified = True 
            db.session.add(user)
            db.session.commit()

            return  {"message": "Success,Email verified you can now proceed to login now"},200
    
   
#should check on email_send message style development for high complex project involving two roles.
