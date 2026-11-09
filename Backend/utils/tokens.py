"""
Docstring for Backend.utils.tokens
this is where methofs to generate verifications are stored 
the token should always be unique 

"""
from itsdangerous import URLSafeTimedSerializer
from itsdangerous.exc import BadSignature, SignatureExpired
from flask import current_app

def generate_verification_token(email):
    serializer = URLSafeTimedSerializer(current_app.config['SECRET_KEY'])
    return serializer.dumps(email,salt =current_app.config['SECURITY_PASSWORD_SALT'])


def confirm_token_verification(token, expiration=3600):
    serializer = URLSafeTimedSerializer(current_app.config['SECRET_KEY'])
    try:
        return serializer.loads(
            token,
            salt=current_app.config['SECURITY_PASSWORD_SALT'],
            max_age=expiration
        )
    except SignatureExpired:
        raise
    except BadSignature:
        return None
