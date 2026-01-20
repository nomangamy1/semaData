from flask_mail import Message,Mail
#should install Flask-Mail 
from flask import current_app 

mail = Mail()
#for sending verification email
def send_email(to,subject,template):
    msg = Message(
        subject,
        recipients = [to],
        html = template,
        sender = current_app.config['MAIL_DEFAULT_SENDER']
    )
    mail.send(msg)
