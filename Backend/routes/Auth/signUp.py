from flask import Flask ,flask_login,flash
from semaData import semaData
from Backend.models import User
from forms import UserRegistrationForm
from extensions import db
from email import send_email
@semaData.route('/signUp',methods = ['GET','POST'])
#in this case we have the user and the domainowner
 
def signUp():
    form = UserRegistrationForm()
    if form.validate_on_submit():
        user = User(
            email=form.email.data,
            username = form.username.data,
            referenceNumber = form.referenceNumber.data,
            password = form.password.data,

        )
        db.session.add(user)
        db.session.commit()
        token = user.generate_confirmation_token()
        send_email =(user.email,'confirm your account',token =token ,user=user)
        flash("an confirmation message has been sent to your email account")