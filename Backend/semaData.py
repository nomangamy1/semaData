from flask import Flask 
from extensions import db,login_manager,migrate, mail
from models import User,Domain,DomainOwner
from flask_jwt_extended import JWTManager 
from routes.Auth.signUp import register_bp
from routes.Auth.domain import domain_bp
from routes.Auth.login import login_bp
from routes.Auth.google_login import google_login_bp
from routes.Auth.google_sign_up import auth_bp  
from routes.core import semaData_engine_bp  
from routes.main.Dashboard import dashboard_bp
from routes.main.UserDashboard import UserDashboard_bp
#from routes.main.payment import payment_bp
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
    if config_name == 'migration': 
        semaData.config.from_object(config['development'])
    else:
        semaData.config.from_object(config[config_name])
    CORS(semaData)
    migrate.init_app(semaData,db)
    mail.init_app(semaData)

    db.init_app(semaData)
    jwt = JWTManager(semaData)
    login_manager.init_app(semaData)
    semaData.register_blueprint(register_bp, url_prefix='/api/Auth')
    semaData.register_blueprint(domain_bp)

    semaData.register_blueprint(login_bp, url_prefix='/api/Auth')
    semaData.register_blueprint(google_login_bp, url_prefix='/api/Auth')
    semaData.register_blueprint(auth_bp, url_prefix='/api/Auth')
    semaData.register_blueprint(semaData_engine_bp, url_prefix='/api/core')
    semaData.register_blueprint(dashboard_bp, url_prefix ='/api/main')
    semaData.register_blueprint(UserDashboard_bp,url_prefix='/api/main')
 #   semaData.register_blueprint(payment_bp,url_prefix='/api/main')
    
    

    return semaData

@login_manager.user_loader
def load_user(user_id):
    return User.query.get(int(user_id)) or DomainOwner.query.get(int(user_id))