from flask import Flask ,Blueprint,request,jsonify
from werkzeug.security import generate_password_hash
from models import User ,Domain,DomainOwner,Dataset
from extensions import db
from utils.tokens import generate_verification_token,confirm_token_verification
from utils.email import send_email
from flask import url_for,redirect,current_app
from itsdangerous import SignatureExpired, BadTimeSignature,serializer
from models.JobApplication import JobApplication
import traceback
import os 
role = 'user'  # Default role for users 
register_bp = Blueprint("register",__name__)

@register_bp.route('/signup',methods = ['GET','POST'])
#in this case we have the user and the domainowner
def signUp():
    try:
        data =request.get_json()
        role = data.get('role').lower()
        email = data.get('email')

      
                                                    
        #Validation
        username = data.get('username') if role == 'domainowner' else None
        if User.query.filter_by(email=email).first() or DomainOwner.query.filter_by(email=email).first():
            return {"error": "Email already exists"},400
        if role == 'domainowner' and DomainOwner.query.filter_by(username=username).first():
            return {"error": "Username already exists"},400
        

        #role-based user creation
        if role =='user':
            ref_number = data.get('reference_number')

            domain = Domain.query.filter_by(reference_number=data['reference_number']).first()
            if not domain:
                return {"error ":'Invalid domain reference Number'},400
            application = JobApplication.query.filter_by(email=email,reference_number_assigned=ref_number,status='approved').first()
            if not application:
                return {"error": "Application not approved or does not exist"},400
            if application:
                application.assigned_user_id = user.id

            user = User(
            first_name = data.get('first_name'),
            second_name =data.get('second_name'),
            email =email,
            password_hash =generate_password_hash(data['password']),
            role =role,
            reference_number = data.get('reference_number')
            )
            
        else:
            user = DomainOwner(
                first_name = data.get('first_name'),
                last_name = data.get('last_name'),
                username = data.get('username'),
                email = email,
                password_hash = generate_password_hash(data['password']),
                domain_field = data.get('domain_field')

            )
        

        db.session.add(user)
        db.session.commit()
        
        #token generation and email sending
        token = generate_verification_token(user.email)
        confirm_url = url_for('register.email_verification', token=token, _external=True)
        html = f'<p>Welcome! {user.first_name}</p><p>Thanks for signing up. Please follow this link to verify your email: <a href="{confirm_url}">{confirm_url}</a></p><br><p>Cheers!</p>'
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
            return jsonify({
    "status": "success",
    "message": "User created successfully",
    "next_step": "/define_features", # Give the path, not the full domain
    "user_id": user.id,
    "requires_verification": True
}), 201

        return {'message':"User Registered. Please check your email to verify your account."},201
    
    
    except Exception as e:
        db.session.rollback()
        traceback.print_exc()
        return{"error": str(e)},500
        
    
   


@register_bp.route('/confirm/<token>', methods=['GET'])
def email_verification(token):
    frontend_base = current_app.config['FRONTEND_URL']

    try:
        email = confirm_token_verification(token)
        if not email:
            return redirect(f"{frontend_base}/login?error=invalid_token")
    except (SignatureExpired, BadTimeSignature):
        return redirect(f"{frontend_base}/login?error=expired")
    
    
    # Distinguish DomainOwner vs regular User for correct frontend redirect
    owner = DomainOwner.query.filter_by(email=email).first()
    user = User.query.filter_by(email=email).first()

    if not owner and not user:
        return redirect(f"{frontend_base}/signup?error=not_found")

    subject_obj = owner if owner else user

    # Check if already verified BEFORE marking as verified
    was_verified = subject_obj.is_verified
    if not was_verified:
        subject_obj.is_verified = True
        db.session.commit()

    # DomainOwner -> DomainDefinition; regular User (collector) -> userDashboard
    if owner:
        if was_verified:
            return redirect(f"{frontend_base}/DomainDefinition?message=already_verified&owner_id={owner.id}")
        return redirect(f"{frontend_base}/DomainDefinition?verified=true&owner_id={owner.id}")
    else:
        # attempt to find the domain id for the user via reference_number
        domain = Domain.query.filter_by(reference_number=user.reference_number).first()
        domain_id = domain.id if domain else ''
        if was_verified:
            return redirect(f"{frontend_base}/userDashboard?message=already_verified&domain_id={domain_id}")
        return redirect(f"{frontend_base}/userDashboard?verified=true&domain_id={domain_id}")



