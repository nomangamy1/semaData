from flask import Flask ,Blueprint,request,jsonify
from werkzeug.security import generate_password_hash
from models import User ,Domain,DomainOwner
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
        role = data.get('role')
        email = data.get('email')
        if User.query.filter_by(email=email).first() or DomainOwner.query.filter_by(email=email).first():
            return {"error": "Email already exists"},400
        if role =='user':
            domain = Domain.query.filter_by(reference_number=data['reference_number']).first()
            if not domain:
                return {"error ": 'Invalid domain reference Number'},400
            user = User(
            first_name = data['first_name'],
            second_name = data['second_name'],
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
            db.session.add(user)
            db.session.commit()
            token = generate_verification_token(user.email)
            confirm_url = url_for('register.email_verification', token=token, _external=True)
            html = f'<p>Welcome! {user.first_name} {user.last_name}</p><p>Thanks for signing up. Please follow this link to verify your email: <a href="{confirm_url}">{confirm_url}</a></p><br><p>Cheers!</p>'
            if role == 'domainOwner':
                subject = "Please confirm your domain owner email"
                html = f"""<h3>Welcome,  {user.first_name}</h3>
                        <p>Thanks for signing up as a Domain Owner</p>
                         <p> Please follow this link to verify your email: <a href="{confirm_url}">{confirm_url}</a><br><p>Cheers!</p>
                        """
                return {'message':"Domain Owner Registered. Please check your email to verify your account."},201                                                          
                
                
            else:
                subject = f"You've joined {data.get('domain_field')}"
                html = f"""<h3>Welcome,  {user.first_name}</h3>
                <p>you have been added to the team for <strong>{data.get('domain_field')}</strong></p>
                    <p> Please follow this link to verify your email: <a href="{confirm_url}">{confirm_url}</a><br><p>Cheers!</p>
                """
                return {'message':"User Registered. Please check your email to verify your account."},201
            send_email(user.email, subject, html)
    
    except Exception as e:
        db.session.rollback()
        traceback.print_exc()
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
