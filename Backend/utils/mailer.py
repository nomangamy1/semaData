from flask_mail import Message
from extensions import mail # Ensure mail = Mail() is in your extensions.py
from flask import render_template

def send_approval_email(recipient_email, first_name, job_title, ref_number):
    try:
        msg = Message(
            subject=f"Approved: Getting Started as a {job_title}",
            recipients=[recipient_email]
        )
        # Use a simple f-string for speed, or render_template for beauty
        msg.body = f"""
        Hello {first_name},

        Great news! Your application for the {job_title} project has been approved.

        YOUR UNIQUE REFERENCE NUMBER: {ref_number}

        Please keep this number safe. You must use it for all data submissions 
        so that your work is tracked and paid correctly.

        Next Steps:
        1. Log in to your collector portal.
        2. View the project guidelines.
        3. Start collecting!

        Best regards,
        SemaAdmin Team
        """
        mail.send(msg)
        return True
    except Exception as e:
        print(f"Mail Error: {e}")
        return False