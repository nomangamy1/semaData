import os 

class Config:
    SECRET_KEY = os.environ.get('SECRET_KEY')
    MAIL_DEFAULT_SENDER = os.environ.get("MAIL_DEFAULT_SENDER")
    MAIL_SERVER = os.environ.get('MAIL_SERVER', 'smtp.gmail.com')
    MAIL_PORT = int(os.environ.get('MAIL_PORT', 587))
    MAIL_USERNAME = os.environ.get('MAIL_USERNAME')
    MAIL_PASSWORD = os.environ.get('MAIL_PASSWORD')
    MAIL_USE_TLS = True
    MAIL_USE_SSL = False
    JWT_TOKEN_LOCATION = ['headers', 'query_string']
    JWT_QUERY_STRING_NAME = 'token'
    FLASK_ENV = os.environ.get('FLASK_ENV', 'development')
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    FRONTEND_URL = os.getenv('FRONTEND_URL', 'http://localhost:5173').rstrip('/')

    TESTING = os.environ.get('TESTING', 'False').lower() == 'true'
    MAIL_SUPPRESS_SEND = os.environ.get('MAIL_SUPPRESS_SEND')
    
    # Google OAuth settings
    GOOGLE_CLIENT_ID = os.environ.get('GOOGLE_CLIENT_ID')
    GOOGLE_CLIENT_SECRET = os.environ.get('GOOGLE_CLIENT_SECRET')
    GOOGLE_REDIRECT_URI = os.environ.get('GOOGLE_REDIRECT_URI', 'http://localhost:5000/auth/google/callback')  # Default for development

    WTF_CSRF_ENABLED = True
    
    # Daraja M-Pesa settings
    DARAJA_CONSUMER_KEY = os.getenv('DARAJA_CONSUMER_KEY')
    DARAJA_CONSUMER_SECRET = os.getenv('DARAJA_CONSUMER_SECRET')
    DARAJA_BUSINESS_CODE = os.getenv('DARAJA_BUSINESS_CODE', '174379')
    DARAJA_PASSKEY = os.getenv('DARAJA_PASSKEY')
    DARAJA_CALLBACK_URL = os.getenv('DARAJA_CALLBACK_URL', 'http://localhost:8000/api/main/payment/callback')

    def init_app(semaData):
        pass

class DevelopmentConfig(Config):
    DEBUG = True
    SECRET_KEY = os.environ.get('SECRET_KEY', 'dev_secret_key')
    SECURITY_PASSWORD_SALT = '2026/17/1'
    SQLALCHEMY_DATABASE_URI= os.environ.get('DATABASE_URI',"postgresql+psycopg2://nomangamy1:4upm6Z?!@localhost:5432/semadata")
    OAUTHLIB_INSECURE_TRANSPORT = True  # Enable insecure transport for development
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    SQLALCHEMY_ECHO = True
    SESSION_PERMANENT = False
    REMEMBER_COOKIE_DURATION = 3600
    WHISPER_MODEL = os.environ.get('MODEL_NAME', 'base')  # Default to 'base' in development
    MAIL_USE_TLS = True
    MAIL_USE_SSL = False



class ProductionConfig(Config):
    DEBUG = False
    SQLALCHEMY_DATABASE_URI = os.environ.get('DATABASE_URI', 'postgresql://semadata_user:secure_password_2026@localhost:5432/semadata_db')
    SECRET_KEY = os.environ.get('SECRET_KEY')
    SECURITY_PASSWORD_SALT = '2026/17/1'
    MAIL_DEFAULT_SENDER = os.environ.get("MAIL_DEFAULT_SENDER")
    WHISPER_MODEL = os.environ.get('MODEL_NAME', 'base')

class TestConfig(Config):
    SECRET_KEY = os.environ.get('SECRET_KEY', 'test_secret_key')
    SECURITY_PASSWORD_SALT = '2026/17/1'
    SQLALCHEMY_DATABASE_URI = os.environ.get('TEST_DATABASE_URI', 'sqlite:///:memory:')
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    SQLALCHEMY_ECHO = True
    TESTING = True
    MAIL_SUPPRESS_SEND = True



config = {
    'development':DevelopmentConfig,
    'Production' :ProductionConfig,
    'testing':TestConfig,
    'default':DevelopmentConfig

}
