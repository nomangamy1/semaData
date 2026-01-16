from models.User import User
from flask import Form
from wtforms import StringField,PasswordField,BooleanField,SubmitField

class UserRegistrationForm(Form)