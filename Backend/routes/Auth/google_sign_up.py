from google.oauth2 import id_token
from google.auth.transport import requests as google_requests
from flask_jwt_extended import create_access_token 
from flask_jwt_extended import create_access_token
from flask import Blueprint, jsonify, request
from models import User, DomainOwner, Domain
from extensions import db
from Config import config

auth_bp = Blueprint("auth",__name__)

@auth_bp.route('/google_sign_up',methods =['POST'])
def google_sign_up():
    try:
        data = request.get_json()
        token = data.get('token')
        role_type = data.get('role')
        idinfo = id_token.verify_oauth2_token(token, google_requests.Request(), config['default'].GOOGLE_CLIENT_ID)
        
        email = idinfo['email']
        username = idinfo.get('name', email.split('@')[0])  # Use part of email as username if name not available

        if role_type == 'user':
            domain = Domain.query.filter_by(reference_number=data['reference_number']).first()
            if not domain:
                return {"error": 'Invalid domain reference Number'}, 400
            
            existing_user = User.query.filter_by(email=email).first()
            if existing_user:
                return {'message': "User already registered"}, 200

            # Parse name into first and second name
            name_parts = username.split(' ', 1)
            first_name = name_parts[0]
            second_name = name_parts[1] if len(name_parts) > 1 else ''

            user = User(
                first_name=first_name,
                second_name=second_name,
                email=email,
                role='user',
                reference_number=data.get('reference_number')
            )
            db.session.add(user)
            db.session.commit()
            access_token = create_access_token(identity=user.id)
            return {'message': "User Registered via Google", "access_token": access_token,}, 201
        else:
            existing_owner = DomainOwner.query.filter_by(email=email).first()
            if existing_owner:
                return {"message": 'Domain Owner already registered'}, 200

            # Parse name into first and last name
            name_parts = username.split(' ', 1)
            first_name = name_parts[0]
            last_name = name_parts[1] if len(name_parts) > 1 else ''

            domain_owner = DomainOwner(
                first_name=first_name,
                last_name=last_name,
                username=username,  # Assuming username is unique, as per model
                email=email,
                domain_field=data.get("domainField", "Health")  # Default if not provided
            )
            db.session.add(domain_owner)
            db.session.commit()
            access_token = create_access_token(identity=domain_owner.id)
            return {"message": 'You are now a domain owner via Google!', "access_token": access_token}, 201

    except ValueError:
        return {"error": "Invalid token"}, 400
    except Exception as e:
        return {"error": str(e)}, 500