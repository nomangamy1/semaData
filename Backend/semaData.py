from flask import Flask 
from extensions import db,login_manager
from models import User,Domain ,DomainOwner
from flask_jwt_extended import JWTManager 
from routes.Auth import register_bp
from utils.email import mail 
def semaData_app():
    semaData = Flask(__name__)
    semaData.config.from_object("config.Config")

    db.init_app(semaData)
    jwt = JWTManager(semaData)
    mail.init_app(semaData)
    

    semaData.register_blueprint("register_bp",url_prefix='/api/signUp')
    semaData.register_blueprint('domain_bp',url_prefix ='/api/domain')


    return semaData