import os 

class Config:
    SECRET_KEY = os.environ.get('SECRET_KEY')
    MAIL_DEFAULT_SENDER = os.environ.get('MAIL_SENDER')
    MAIL_SERVER ='SMTP'
    MAIL_PORT = ''
    MAIL_USERNAME = 'kiplimochege@gmail.com'
    MAIL_PASSWORD = ''
    MAIL_USE_TLS = False 
    MAIL_USe_SSL = True 
    
    # Google OAuth settings
    GOOGLE_CLIENT_ID = os.environ.get('GOOGLE_CLIENT_ID')
    GOOGLE_CLIENT_SECRET = os.environ.get('GOOGLE_CLIENT_SECRET')
    GOOGLE_REDIRECT_URI = os.environ.get('GOOGLE_REDIRECT_URI', 'http://localhost:5000/auth/google/callback')  # Default for development



    def init_app(semaData):
        pass

class DevelopmentConfig(Config):
    DEBUG = True
    SECRET_KEY = "mysecret"
    SQLALCHEMY_DATABASE_URI = 'sqlite:///semaData.db'
    SECURITY_PASSWORD_SALT = '2026/17/1'

class ProductionConfig(Config):
    SQLALCHEMY_DATABASE_URI = os.environ.get('DATABASE_URI')
    SECRET_KEY = "mysecret"
    SECURITY_PASSWORD_SALT = '2026/17/1'
    MAIL_DEFAULT_SENDER = os.environ.get('MAIL_SENDER')

class TestConfig(Config):
    SECRET_KEY = "mysecret"
    SQLALCHEMY_DATABASE_URI = 'sqlite:///test.db'
    SECURITY_PASSWORD_SALT = '2026/17/1'




config = {
    'development':DevelopmentConfig,
    'Production' :ProductionConfig,
    'default':DevelopmentConfig

}