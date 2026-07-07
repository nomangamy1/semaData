
from dotenv import load_dotenv
import os
load_dotenv()
from dotenv import load_dotenv
import os
load_dotenv()
from urllib import response

from flask import Flask, request 
from extensions import db,login_manager,migrate, mail
from models import User,Domain,DomainOwner
from flask_jwt_extended import JWTManager 
from routes.Auth.signUp import register_bp
from routes.Auth.domain import domain_bp
from routes.Auth.login import login_bp
from routes.Auth.forgot_password import forgot_bp
from routes.Auth.google_login import google_login_bp
from routes.Auth.google_sign_up import auth_bp  
from routes.core import semaData_engine_bp  
from routes.main.Dashboard import dashboard_bp
from routes.main.payment import payment_bp
from routes.main.UserDashboard import UserDashboard_bp
from routes.main.doDataAnalytics import UserAnalytics_bp
from routes.main.contact import contact_bp
from routes.main.payment import payment_bp
from routes.AdminCareers import AdminCareers_bp
from routes.main.community_routes import community_bp
from routes.main.AdminDashboard import admin_bp
from routes.main.careersPage import careers_bp
from routes.main.export import export_bp
from routes.main.collector_finance import collector_finance_bp
from routes.main.submission_review import submission_bp
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
    # Allow the configured FRONTEND_URL, but fall back to localhost during development
    frontend_origin = os.getenv('FRONTEND_URL') or 'http://localhost:5173'
    CORS(semaData, resources={
    r"/api/*": {
        "origins": ["http://localhost:5173"],  # add your production domain later
        "methods": ["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
        "allow_headers": ["Content-Type", "Authorization", "Accept", "X-Requested-With"],
        "supports_credentials": True,
        "max_age": 3600  # cache preflight for 1 hour
    }
}, supports_credentials=True)
                             
    migrate.init_app(semaData,db)
    mail.init_app(semaData)

    db.init_app(semaData)
    jwt = JWTManager(semaData)
    login_manager.init_app(semaData)
    semaData.register_blueprint(register_bp, url_prefix='/api/Auth')
    semaData.register_blueprint(domain_bp,url_prefix='/api')
    semaData.register_blueprint(login_bp, url_prefix='/api/Auth')
    semaData.register_blueprint(forgot_bp, url_prefix='/api/Auth')
    semaData.register_blueprint(google_login_bp, url_prefix='/api/Auth')
    semaData.register_blueprint(auth_bp, url_prefix='/api/Auth')
    semaData.register_blueprint(semaData_engine_bp, url_prefix='/api/core')
    semaData.register_blueprint(dashboard_bp, url_prefix ='/api/main')
    semaData.register_blueprint(UserDashboard_bp,url_prefix='/api/main')
    semaData.register_blueprint(UserDashboard_bp,url_prefix='/api/collector', name='collector_dashboard')
    semaData.register_blueprint(payment_bp,url_prefix='/api/main')
    semaData.register_blueprint(UserAnalytics_bp,url_prefix='/api/main')
    semaData.register_blueprint(contact_bp,url_prefix='/api/main')
    semaData.register_blueprint(admin_bp,url_prefix='/api/admin')
    semaData.register_blueprint(careers_bp,url_prefix ='/api')
    semaData.register_blueprint(export_bp,url_prefix='/api/export')
    semaData.register_blueprint(collector_finance_bp,url_prefix='/api/collector')
    semaData.register_blueprint(submission_bp,url_prefix='/api/admin')
    semaData.register_blueprint(AdminCareers_bp,url_prefix='/api/admin')
    semaData.register_blueprint(community_bp,url_prefix='/api/community')
    semaData.register_blueprint(payment_bp,url_prefix='/api/collector',name='collector_payment')
    @login_manager.user_loader
    def load_user(user_id):
        if user_id is None:
            return None
        
        try:
            user_id = int(user_id)  # only try int conversion if it's a number-like string
        except (ValueError, TypeError):
            print(f"Invalid user_id passed to load_user: {user_id} (type: {type(user_id)})")
            return None
        
        user = User.query.get(user_id)
        if user:
            return user
        
        domain_owner = DomainOwner.query.get(user_id)
        if domain_owner:
            return domain_owner
        
        print(f"No user or domain owner found for ID: {user_id}")
        return None



    @semaData.after_request
    def add_cors_headers(response):
        if request.method == 'OPTIONS':
            response.headers['Access-Control-Allow-Origin'] = request.headers.get('Origin', '*')
            response.headers['Access-Control-Allow-Methods'] = 'GET, POST, PUT, DELETE, OPTIONS, PATCH'
            response.headers['Access-Control-Allow-Headers'] = 'Content-Type, Authorization, Accept'
            response.headers['Access-Control-Max-Age'] = '3600'
        

        return response
    return semaData
