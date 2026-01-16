from flask import Flask 
from extensions import db,login_manager
from models import User,Domain ,DomainOwner

def semaData_app():
    semaData = Flask(__name__)
    semaData.config.from_object("config.Config")

    db.init_app(semaData)
    login_manager.init_app(semaData)

    semaData.register_blueprint("register_bp",url_prefix='/signUp')
    semaData.register_blueprint('domain_bp',url_prefix ='/domain')


    return semaData