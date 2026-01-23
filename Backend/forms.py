from models.User import User
from wtforms import StringField,PasswordField,BooleanField,SubmitField

class UserRegistrationForm():
    #i will add more fields later
    username = StringField('Username')
    email = StringField('Email')