from flask import Blueprint, request, jsonify, current_app, url_for
from models.user import User
from models.domainowner import DomainOwner
from extensions import db
from utils.tokens import generate_verification_token, confirm_token_verification
from utils.mailer import send_approval_email as send_mail
from werkzeug.security import generate_password_hash
from itsdangerous import SignatureExpired, BadTimeSignature

forgot_bp = Blueprint("forgot", __name__)


@forgot_bp.route("/forgot-password", methods=["POST"])
def forgot_password():
    data  = request.get_json() or {}
    email = data.get("email", "").strip().lower()

    if not email:
        return jsonify({"error": "Email is required"}), 400

    # Check both tables
    user  = User.query.filter_by(email=email).first()
    owner = DomainOwner.query.filter_by(email=email).first()

    if not user and not owner:
        # Don't reveal whether email exists — security best practice
        return jsonify({
            "message": "If that email is registered, a reset link has been sent."
        }), 200

    token       = generate_verification_token(email)
    frontend    = current_app.config.get("FRONTEND_URL", "http://localhost:5173")
    reset_url   = f"{frontend}/reset-password?token={token}"

    try:
        send_mail(
            email,
            "Reset your SemaData password",
            f"""<h3>Password Reset Request</h3>
                <p>Click the link below to reset your password. This link expires in 1 hour.</p>
                <p><a href="{reset_url}" style="background:#489c8c;color:white;padding:12px 24px;
                   border-radius:8px;text-decoration:none;font-weight:bold;">
                   Reset Password
                </a></p>
                <p>If you did not request this, ignore this email.</p>
                <p style="color:#94a3b8;font-size:0.8rem;">{reset_url}</p>"""
        )
    except Exception as e:
        current_app.logger.warning(f"Password reset email failed: {e}")

    return jsonify({
        "message": "If that email is registered, a reset link has been sent."
    }), 200


@forgot_bp.route("/reset-password", methods=["POST"])
def reset_password():
    data      = request.get_json() or {}
    token     = data.get("token", "").strip()
    new_pass  = data.get("password", "").strip()

    if not token or not new_pass:
        return jsonify({"error": "Token and new password are required"}), 400

    if len(new_pass) < 8:
        return jsonify({"error": "Password must be at least 8 characters"}), 400

    try:
        email = confirm_token_verification(token)
        if not email:
            return jsonify({"error": "Invalid or expired reset link"}), 400
    except (SignatureExpired, BadTimeSignature):
        return jsonify({"error": "Reset link has expired. Please request a new one."}), 400

    # Update password in whichever table the email belongs to
    user  = User.query.filter_by(email=email).first()
    owner = DomainOwner.query.filter_by(email=email).first()

    if not user and not owner:
        return jsonify({"error": "Account not found"}), 404

    target = user if user else owner
    target.password_hash = generate_password_hash(new_pass)
    db.session.commit()

    return jsonify({"message": "Password reset successfully. You can now log in."}), 200
