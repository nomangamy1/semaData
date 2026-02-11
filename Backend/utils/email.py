from flask_mail import Message,Mail
#should install Flask-Mail 
from flask import current_app 

mail = Mail()
#for sending verification email
def send_email(to, subject, template):
    print("\n" + "!"*20 + " INTERNAL EMAIL DEBUG " + "!"*20)
    print(f"To: {to}")
    print(f"Subject: {subject}")
    print(f"Body: {template}")
    print("!"*62 + "\n")
    
    msg = Message(
        subject,
        recipients=[to],
        html=template,
        sender=current_app.config['MAIL_DEFAULT_SENDER']
    )
    # Wrap this in a try so the app doesn't crash if SMTP fails
   # try:
       # mail.send(msg)
    #except Exception as e:
     #   print(f"SMTP Error: {e}")

    # will embark on this during deployment