from flask_mailman import EmailMessage
from flask import current_app
from extensions import mail

def send_approval_email(recipient_email, first_name, job_title,
                        ref_number, domain_name=None, signup_link=None):
    if not signup_link:
        signup_link = f"http://localhost:5173/signup?role=collector&ref={ref_number}"

    name        = first_name or "Applicant"
    domain_text = f"under {domain_name}" if domain_name else ""
    domain_html = f"under <strong>{domain_name}</strong>" if domain_name else ""

    try:
        msg = EmailMessage(
            subject="Your SemaData Application Has Been Approved!",
            recipients=[recipient_email],
            body=f"""
Dear {name},

Congratulations! Your application for "{job_title}" {domain_text} has been approved.

Your Reference Number: {ref_number}

Keep this safe — you need it to sign up and log in every time.

Create your account here:
{signup_link}

Steps:
1. Click the link above (or copy it into your browser)
2. Select the Collector tab on the signup page
3. Enter your email, reference number, and create a password
4. Verify your email and you are in

Questions? Contact support@semadata.com

Welcome aboard,
SemaData Admin Team
            """,
            html=f"""
<div style="font-family: Inter, sans-serif; max-width: 560px; margin: 0 auto;">
  <div style="background:#0f172a; padding:32px; border-radius:16px 16px 0 0; text-align:center;">
    <h1 style="color:#10b981; margin:0;">SemaData</h1>
    <p style="color:#94a3b8; margin:8px 0 0;">Data Collection Platform</p>
  </div>

  <div style="background:#fff; padding:40px 32px; border:1px solid #e2e8f0;">
    <h2 style="color:#0f172a; margin:0 0 8px;">Congratulations, {name}! 🎉</h2>
    <p style="color:#475569;">
      Your application for <strong>{job_title}</strong> {domain_html} has been
      <span style="color:#10b981; font-weight:700;">approved</span>.
    </p>

    <div style="background:#f0fdf4; border:1px solid #bbf7d0;
                border-radius:12px; padding:20px 24px; margin:24px 0;">
      <p style="margin:0 0 6px; color:#64748b; font-size:0.8rem;
                text-transform:uppercase; letter-spacing:0.1em; font-weight:700;">
        Your Reference Number
      </p>
      <p style="margin:0; font-size:1.5rem; font-weight:900;
                color:#059669; letter-spacing:0.05em;">
        {ref_number}
      </p>
      <p style="margin:8px 0 0; color:#64748b; font-size:0.85rem;">
        Keep this safe — you need it to sign up and log in every time.
      </p>
    </div>

    <a href="{signup_link}"
       style="display:inline-block; background:#10b981; color:white;
              padding:14px 32px; border-radius:10px; font-weight:700;
              text-decoration:none; font-size:1rem;">
      Create My Account →
    </a>

    <p style="color:#94a3b8; font-size:0.8rem; margin:20px 0 0;">
      Or copy: <a href="{signup_link}" style="color:#10b981;">{signup_link}</a>
    </p>
  </div>

  <div style="background:#f8fafc; padding:20px 32px; text-align:center;
              border-radius:0 0 16px 16px; border:1px solid #e2e8f0; border-top:none;">
    <p style="color:#94a3b8; font-size:0.8rem; margin:0;">
      Questions? <a href="mailto:support@semadata.com" style="color:#10b981;">support@semadata.com</a>
    </p>
  </div>
</div>
            """
        )
        
        # Ensure 'flask-mail' extension key placeholder exists in app extensions maps
        if 'flask-mail' not in current_app.extensions and 'mail' in current_app.extensions:
            current_app.extensions['flask-mail'] = current_app.extensions['mail']
            
        msg.send()
        return True
    except Exception as e:
        print(f"[mailer] Email failed for {recipient_email}: {e}")
        return False
