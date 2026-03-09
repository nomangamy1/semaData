from flask_mail import Message
from extensions import mail # Ensure mail = Mail() is in your extensions.py
from flask import render_template

def send_approval_email(recipient_email, first_name, job_title, ref_number):
    try:
        msg = Message(
            subject="Your SemaData Application Has Been Approved!",
            recipients=[recipient_email],
            body=f"""
            Dear {first_name or 'Applicant'},

            Congratulations! Your application for the position "{job_title}" has been approved.

            Your assigned reference number is: **{ref_number}**

            Use this number for all future communication and when logging into the platform.

            Next steps:
            1. Log in to https://semadata.app/login using your email: {recipient_email}
            2. Complete any required onboarding steps
            3. You will receive further instructions via email or dashboard

            If you have any questions, reply to this email or contact support@semadata.com.

            Welcome to the team!

            Best regards,
            SemaData Admin Team
            """,
            html=f"""
            <h2>Congratulations!</h2>
            <p>Dear {first_name or 'Applicant'},</p>
            <p>Your application for <strong>{job_title}</strong> has been approved.</p>
            <p><strong>Your Reference Number:</strong> <code>{ref_number}</code></p>
            <p>Use this number for all future communication and login.</p>
            <h3>Next Steps:</h3>
            <ol>
                <li>Log in at <a href="https://semadata.app/login">https://semadata.app/login</a> with your email: {recipient_email}</li>
                <li>Complete onboarding</li>
                <li>Watch for further instructions</li>
            </ol>
            <p>Questions? Reply to this email or contact <a href="mailto:support@semadata.com">support@semadata.com</a></p>
            <p>Welcome aboard!<br>SemaData Admin Team</p>
            """
        )
        mail.send(msg)
        return True
    except Exception as e:
        print(f"Email failed: {str(e)}")
        return False