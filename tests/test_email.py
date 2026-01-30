from Backend.semaData import semaData_app
from extensions import mail
from flask_mail import Message

app = semaData_app()
with app.app_context():
    try:
        msg = Message("Hello from SemaData",
                      recipients=["kiplimochege@gmail.com"], # Put your email here
                      body="This is a test to see if SMTP is working!")
        mail.send(msg)
        print("✅ Success! Check your email now.")
    except Exception as e:
        print(f"❌ Error: {e}")