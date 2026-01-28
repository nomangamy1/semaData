from flask import Flask 
from extensions import db,login_manager
from models import User,Domain,DomainOwner
from flask_jwt_extended import JWTManager 
from routes.Auth.signUp import register_bp
from routes.Auth.domain import domain_bp
from routes.Auth.login import login_bp
from routes.Auth.google_login import google_login_bp
from routes.Auth.google_sign_up import auth_bp  
from routes.core.semaDataEngine import semaDataEngine_bp  
from utils.email import mail 
from flask_cors import CORS
from Config import config
import os
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

def semaData_app():
    semaData = Flask(__name__)
    config_name = os.environ.get('FLASK_ENV') or 'default'
    semaData.config.from_object(config[config_name])
    CORS(semaData)

    db.init_app(semaData)
    jwt = JWTManager(semaData)
    mail.init_app(semaData)
    login_manager.init_app(semaData)
    semaData.register_blueprint(register_bp, url_prefix='/api/Auth')
    semaData.register_blueprint(domain_bp, url_prefix='/api/Auth')
    semaData.register_blueprint(login_bp, url_prefix='/api/Auth')
    semaData.register_blueprint(google_login_bp, url_prefix='/api/Auth')
    semaData.register_blueprint(auth_bp, url_prefix='/api/Auth')
    semaData.register_blueprint(semaDataEngine_bp, url_prefix='/api/core')


    return semaData

@login_manager.user_loader
def load_user(user_id):
    user = User.query.get(int(user_id))
    if user:
        return user 

    domain_owner = DomainOwner.query.get(int(user_id))
    if domain_owner:
        return domain_owner
    

    return None