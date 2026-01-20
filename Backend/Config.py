import os 

class Config:
    SECRET_KEY = os.environ.get('SECRET_KEY')
    MAIL_DEFAULT_SENDER = 'kiplimochege@gmail.com'
    MAIL_SERVER ='SMTP'
    MAIL_PORT = ''
    MAIL_USERNAME = 'kiplimochege@gmail.com'
    MAIL_PASSWORD = ''
    MAIL_USE_TLS = False 
    MAIL_USe_SSL = True 
    



    def init_app(semaData):
        pass

class DevelopmentConfig(Config):
    DEBUG = True
    SECRET_KEY = "mysecret"
    SECURITY_PASSWORD_SALT = '2026/17/1'

class ProductionConfig(Config):
    SQLALCHEMY_DATABASE_URI = os.environ.get('DATABASE_URI')
    SECRET_KEY = "mysecret"
    SECURITY_PASSWORD_SALT = '2026/17/1'
class TestConfig(Config):
    SECRET_KEY = "mysecret"
    SECURITY_PASSWORD_SALT = '2026/17/1'




config = {
    'development':DevelopmentConfig,
    'Production' :ProductionConfig,
    'default':DevelopmentConfig

}