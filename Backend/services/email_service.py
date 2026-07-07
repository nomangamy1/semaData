import os
from flask_mail import Mail, Message
from flask import current_app
from datetime import datetime, timedelta
import secrets
from extensions import db

# Initialize Flask-Mail
mail = Mail()


def init_email_service(app):
    """Initialize email service with Flask app config"""
    mail.init_app(app)


def generate_token(length=32):
    """Generate a secure random token"""
    return secrets.token_urlsafe(length)


def send_email(subject, recipient, body_html, body_text=None):
    """
    Send an email using Flask-Mail
    
    Args:
        subject: Email subject
        recipient: Recipient email address
        body_html: HTML body content
        body_text: Plain text fallback (optional)
    """
    try:
        msg = Message(
            subject=subject,
            recipients=[recipient] if isinstance(recipient, str) else recipient,
            html=body_html,
            body=body_text or "Please view this email in HTML format.",
            sender=current_app.config.get('MAIL_DEFAULT_SENDER', 'noreply@semadata.ai')
        )
        mail.send(msg)
        return True, "Email sent successfully"
    except Exception as e:
        print(f"Email error: {e}")
        return False, str(e)


def send_verification_email(user):
    """Send email verification link to user"""
    from models.EmailToken import EmailToken
    
    # Generate unique token
    token = generate_token()
    
    # Store token in database
    email_token = EmailToken(
        user_id=user.id,
        token=token,
        token_type='email_verification',
        expires_at=datetime.utcnow() + timedelta(hours=24)
    )
    db.session.add(email_token)
    db.session.commit()
    
    # Generate verification link
    verification_link = f"{current_app.config.get('FRONTEND_URL', 'http://localhost:3000')}/verify-email/{token}"
    
    # Email template
    html_body = f"""
    <div style="font-family: 'Inter', sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #489c8c 0%, #367a6d 100%); padding: 2rem; border-radius: 16px 16px 0 0; text-align: center;">
            <h1 style="color: white; margin: 0; font-size: 28px;">Welcome to SemaData! 🎉</h1>
        </div>
        
        <div style="background: #f8f9fa; padding: 2rem; border-radius: 0 0 16px 16px;">
            <p style="color: #1e293b; font-size: 16px; line-height: 1.6;">
                Hi {user.first_name},
            </p>
            
            <p style="color: #475569; font-size: 15px; line-height: 1.6;">
                Thank you for joining SemaData! To complete your registration and start collecting data, please verify your email address.
            </p>
            
            <div style="text-align: center; margin: 2rem 0;">
                <a href="{verification_link}" style="background: #489c8c; color: white; padding: 12px 32px; border-radius: 8px; text-decoration: none; font-weight: 700; display: inline-block;">
                    Verify Email Address
                </a>
            </div>
            
            <p style="color: #64748b; font-size: 13px; line-height: 1.6;">
                Or copy and paste this link in your browser:
                <br>
                <code style="background: white; padding: 8px 12px; border-radius: 4px; display: inline-block; margin-top: 8px; word-break: break-all;">
                    {verification_link}
                </code>
            </p>
            
            <p style="color: #64748b; font-size: 13px; line-height: 1.6;">
                This link expires in 24 hours.
            </p>
            
            <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 2rem 0;">
            
            <p style="color: #64748b; font-size: 12px; text-align: center;">
                If you didn't create this account, please ignore this email.
            </p>
        </div>
    </div>
    """
    
    success, message = send_email(
        subject="Verify Your SemaData Email Address",
        recipient=user.email,
        body_html=html_body
    )
    
    return success, message


def send_password_reset_email(user):
    """Send password reset link to user"""
    from models.EmailToken import EmailToken
    
    # Generate unique token
    token = generate_token()
    
    # Store token in database
    email_token = EmailToken(
        user_id=user.id,
        token=token,
        token_type='password_reset',
        expires_at=datetime.utcnow() + timedelta(hours=1)
    )
    db.session.add(email_token)
    db.session.commit()
    
    # Generate reset link
    reset_link = f"{current_app.config.get('FRONTEND_URL', 'http://localhost:3000')}/reset-password/{token}"
    
    # Email template
    html_body = f"""
    <div style="font-family: 'Inter', sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #489c8c 0%, #367a6d 100%); padding: 2rem; border-radius: 16px 16px 0 0; text-align: center;">
            <h1 style="color: white; margin: 0; font-size: 28px;">Reset Your Password 🔐</h1>
        </div>
        
        <div style="background: #f8f9fa; padding: 2rem; border-radius: 0 0 16px 16px;">
            <p style="color: #1e293b; font-size: 16px; line-height: 1.6;">
                Hi {user.first_name},
            </p>
            
            <p style="color: #475569; font-size: 15px; line-height: 1.6;">
                We received a request to reset your password. Click the button below to create a new password.
            </p>
            
            <div style="text-align: center; margin: 2rem 0;">
                <a href="{reset_link}" style="background: #489c8c; color: white; padding: 12px 32px; border-radius: 8px; text-decoration: none; font-weight: 700; display: inline-block;">
                    Reset Password
                </a>
            </div>
            
            <p style="color: #64748b; font-size: 13px; line-height: 1.6;">
                Or copy and paste this link in your browser:
                <br>
                <code style="background: white; padding: 8px 12px; border-radius: 4px; display: inline-block; margin-top: 8px; word-break: break-all;">
                    {reset_link}
                </code>
            </p>
            
            <p style="color: #f59e0b; background: #fffbeb; border-left: 4px solid #f59e0b; padding: 12px; border-radius: 4px; font-size: 13px; line-height: 1.6;">
                ⚠️ This link expires in 1 hour. If you didn't request a password reset, please ignore this email.
            </p>
            
            <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 2rem 0;">
            
            <p style="color: #64748b; font-size: 12px; text-align: center;">
                For security reasons, we'll never send you your password.
            </p>
        </div>
    </div>
    """
    
    success, message = send_email(
        subject="Reset Your SemaData Password",
        recipient=user.email,
        body_html=html_body
    )
    
    return success, message


def send_job_application_confirmation(user, job):
    """Send job application confirmation email"""
    html_body = f"""
    <div style="font-family: 'Inter', sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #489c8c 0%, #367a6d 100%); padding: 2rem; border-radius: 16px 16px 0 0; text-align: center;">
            <h1 style="color: white; margin: 0; font-size: 28px;">Application Received! ✅</h1>
        </div>
        
        <div style="background: #f8f9fa; padding: 2rem; border-radius: 0 0 16px 16px;">
            <p style="color: #1e293b; font-size: 16px; line-height: 1.6;">
                Hi {user.first_name},
            </p>
            
            <p style="color: #475569; font-size: 15px; line-height: 1.6;">
                Thank you for applying for the <strong>{job.title}</strong> position. We've received your application and our team is reviewing it.
            </p>
            
            <div style="background: white; border: 1px solid #e2e8f0; border-radius: 8px; padding: 1.5rem; margin: 1.5rem 0;">
                <h3 style="color: #1e293b; margin: 0 0 1rem; font-size: 16px;">Position Details</h3>
                <p style="color: #475569; font-size: 14px; margin: 0.5rem 0;"><strong>Role:</strong> {job.title}</p>
                <p style="color: #475569; font-size: 14px; margin: 0.5rem 0;"><strong>Location:</strong> {job.location}</p>
                <p style="color: #475569; font-size: 14px; margin: 0.5rem 0;"><strong>Compensation:</strong> {job.compensation}</p>
            </div>
            
            <p style="color: #64748b; font-size: 13px; line-height: 1.6;">
                We'll be in touch within 3-5 business days with updates on your application status. Keep an eye on your email!
            </p>
            
            <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 2rem 0;">
            
            <p style="color: #64748b; font-size: 12px; text-align: center;">
                Questions? Reply to this email or contact us at support@semadata.ai
            </p>
        </div>
    </div>
    """
    
    success, message = send_email(
        subject=f"Application Received - {job.title}",
        recipient=user.email,
        body_html=html_body
    )
    
    return success, message


def send_payout_notification(user, amount, status):
    """Send payout status notification"""
    status_text = "Approved ✅" if status == "approved" else "Pending Review ⏳" if status == "pending" else "Failed ❌"
    status_color = "#10b981" if status == "approved" else "#f59e0b" if status == "pending" else "#ef4444"
    
    html_body = f"""
    <div style="font-family: 'Inter', sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #489c8c 0%, #367a6d 100%); padding: 2rem; border-radius: 16px 16px 0 0; text-align: center;">
            <h1 style="color: white; margin: 0; font-size: 28px;">Payout Update 💰</h1>
        </div>
        
        <div style="background: #f8f9fa; padding: 2rem; border-radius: 0 0 16px 16px;">
            <p style="color: #1e293b; font-size: 16px; line-height: 1.6;">
                Hi {user.first_name},
            </p>
            
            <p style="color: #475569; font-size: 15px; line-height: 1.6;">
                Your payout request has been updated.
            </p>
            
            <div style="background: white; border-left: 4px solid {status_color}; border-radius: 8px; padding: 1.5rem; margin: 1.5rem 0;">
                <p style="color: {status_color}; font-size: 16px; font-weight: 700; margin: 0 0 0.5rem;">Status: {status_text}</p>
                <p style="color: #1e293b; font-size: 24px; font-weight: 900; margin: 0;">KSh {amount:,.2f}</p>
            </div>
            
            <p style="color: #64748b; font-size: 13px; line-height: 1.6;">
                Visit your dashboard to view more details about your payout.
            </p>
            
            <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 2rem 0;">
            
            <p style="color: #64748b; font-size: 12px; text-align: center;">
                For questions about your payout, contact our support team.
            </p>
        </div>
    </div>
    """
    
    success, message = send_email(
        subject=f"Payout Update - KSh {amount:,.2f}",
        recipient=user.email,
        body_html=html_body
    )
    
    return success, message
