from flask import Flask ,Blueprint,request,jsonify
from werkzeug.security import generate_password_hash
from models import User ,Domain,DomainOwner,Dataset
from extensions import db
from utils.tokens import generate_verification_token,confirm_token_verification
from utils.email import send_email
from flask import url_for
import traceback
role = 'user'  # Default role for users 
register_bp = Blueprint("register",__name__)

@register_bp.route('/signup',methods = ['GET','POST'])
#in this case we have the user and the domainowner
def signUp():
    try:
        data =request.get_json()
        role = data.get('role').lower()
        email = data.get('email')
        if User.query.filter_by(email=email).first() or DomainOwner.query.filter_by(email=email).first():
            return {"error": "Email already exists"},400
        if role =='user':
            domain = Domain.query.filter_by(reference_number=data['reference_number']).first()
            if not domain:
                return {"error ": 'Invalid domain reference Number'},400
            user = User(
            first_name = data.get('first_name'),
            second_name =data.get('second_name'),
            email =email,
            
            password_hash =generate_password_hash(data['password']),
            role =role,
            reference_number = data.get('reference_number')
            )
            db.session.add(user)
            db.session.commit()
            return {'message':"User Registered"},201
        else:
            user = DomainOwner(
                first_name = data.get('first_name'),
                last_name = data.get('last_name'),
                username = data.get('username'),
                email = email,
                password_hash = generate_password_hash(data['password']),
                domain_field = data.get('domain_field')

            )
            if DomainOwner.query.filter_by(username=user.username).first():
                return {"error": "Username already exists"},400
            db.session.add(user)
            db.session.commit()
            token = generate_verification_token(user.email)
            confirm_url = url_for('register.email_verification', token=token, _external=True)
            html = f'<p>Welcome! {user.first_name} {user.last_name}</p><p>Thanks for signing up. Please follow this link to verify your email: <a href="{confirm_url}">{confirm_url}</a></p><br><p>Cheers!</p>'
            if role == 'domainowner':
                subject = "Please confirm your domain owner email"
                html = f"""<h3>Welcome,  {user.first_name}</h3>
                        <p>Thanks for signing up as a Domain Owner</p>
                         <p> Please follow this link to verify your email: <a href="{confirm_url}">{confirm_url}</a><br><p>Cheers!</p>
                        """
               
            else:
                subject = f"You've joined {data.get('domain_field')}"
                html = f"""<h3>Welcome,  {user.first_name}</h3>
                <p>you have been added to the team for <strong>{data.get('domain_field')}</strong></p>
                    <p> Please follow this link to verify your email: <a href="{confirm_url}">{confirm_url}</a><br><p>Cheers!</p>
                """
            send_email(user.email, subject, html)
            if role == 'domainowner':

                 return {
                    "message": "Account created. Please define your domain features to get your reference number.","owner_id": user.id,
                    "next_step": "define_features"
                    }, 201
            
            return {'message':"User Registered. Please check your email to verify your account."},201
    
    except Exception as e:
        db.session.rollback()
        traceback.print_exc()
        return{"error": str(e)},500
        
    
   


@register_bp.route('/confirm/<token>', methods=['GET'])
def email_verification(token):
    try:
        email = confirm_token_verification(token)
    except:
        return {'message': "The confirmation link is invalid or has expired."}, 401
    
    # Check User table FIRST, then DomainOwner table if not found
    user = User.query.filter_by(email=email).first() or \
           DomainOwner.query.filter_by(email=email).first()

    if not user:
        return {"message": "User not found"}, 404

    # Use the correct attribute name (check if it's is_verified or isVerified in your models)
    if getattr(user, 'is_verified', False): 
        return {"message": "Account already verified"}, 200
    
    user.is_verified = True 
    db.session.commit()

    return {"message": "Success! Email verified. You can now login."}, 200


@register_bp.route('/my-domains/<int:owner_id>', methods=['GET'])
def get_owner_domains(owner_id):
    domains = Domain.query.filter_by(owner_id=owner_id).all()
    output = []
    for d in domains:
        feature_counts = len(d.domain_features) if hasattr(d,'domain_features') else 0  # Assuming a relationship 'domain_features' exists
        submission_counts = Dataset.query.filter_by(domain_id=d.id).count()  # Assuming a relationship 'submissions' exists
        collector_count = User.query.filter_by(reference_number=d.reference_number).count()
         # Assuming a relationship 'collectors' exists
        output.append({
            "domain_name": d.name,
            "reference_number": d.reference_number,
            "field_category": d.field_name, # Ensure this matches your model
            "feature_count": feature_counts,
            "collector_count": collector_count,
            "submission_count": submission_counts
        })
    return jsonify(output), 200