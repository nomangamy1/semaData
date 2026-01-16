import os 

class Config:
    SECRET_KEY = os.environ.get('SECRET_KEY')


    def init_app(semaData):
        pass

class DevelopmentConfig(Config):
    DEBUG = True

class Production(Config):
    SQLALCHEMY_DATABASE_URI = os.environ.get('DATABASE_URI')





config = {
    'development':DevelopmentConfig,
    'Production' :Production,
    'default':DevelopmentConfig

}