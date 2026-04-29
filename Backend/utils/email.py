from flask_mailman import EmailMessage
from flask import current_app

def send_email(to, subject, body):
    msg = EmailMessage(
        subject,
        body,
        current_app.config['MAIL_DEFAULT_SENDER'],
        [to]
    )
    msg.content_subtype = "html"  # This ensures your <h3> and <p> tags work
    try:
        msg.send()
        return True
    except Exception as e:
        print(f"Mail delivery failed: {e}")
        return False
