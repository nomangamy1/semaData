from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from werkzeug.security import generate_password_hash, check_password_hash
from models.user import User
from models.EmailToken import EmailToken
from extensions import db
from services.email_service import (
    send_verification_email,
    send_password_reset_email
)
from datetime import datetime

auth_bp = Blueprint('auth', __name__, url_prefix='/api/auth')


@auth_bp.route('/signup', methods=['POST'])
def signup():
    """
    Register a new user and send verification email
    """
    try:
        data = request.get_json() or {}
        
        # Validate required fields
        required_fields = ['first_name', 'second_name', 'email', 'password', 'role']
        for field in required_fields:
            if not data.get(field):
                return jsonify({"error": f"Missing required field: {field}"}), 400
        
        email = data['email'].strip().lower()
        password = data['password'].strip()
        
        # Password validation
        if len(password) < 8:
            return jsonify({"error": "Password must be at least 8 characters long"}), 400
        
        # Check if user already exists
        existing_user = User.query.filter_by(email=email).first()
        if existing_user:
            return jsonify({"error": "Email already registered"}), 409
        
        # Create new user
        new_user = User(
            first_name=data['first_name'].strip(),
            second_name=data['second_name'].strip(),
            email=email,
            password_hash=generate_password_hash(password),
            role=data['role'].lower(),
            is_email_verified=False
        )
        
        db.session.add(new_user)
        db.session.commit()
        
        # Send verification email
        success, message = send_verification_email(new_user)
        
        if success:
            return jsonify({
                "status": "success",
                "message": "Account created! Check your email to verify your account.",
                "user_id": new_user.id,
                "email": new_user.email
            }), 201
        else:
            # User created but email failed - they can request resend
            return jsonify({
                "status": "warning",
                "message": "Account created but verification email failed to send. You can request a resend.",
                "user_id": new_user.id,
                "email": new_user.email
            }), 201
            
    except Exception as e:
        db.session.rollback()
        print(f"Signup error: {e}")
        return jsonify({"error": "Signup failed. Please try again."}), 500


@auth_bp.route('/verify-email/<token>', methods=['POST'])
def verify_email(token):
    """
    Verify user's email using token from email link
    """
    try:
        # Find token
        email_token = EmailToken.query.filter_by(
            token=token,
            token_type='email_verification',
            is_used=False
        ).first()
        
        if not email_token:
            return jsonify({"error": "Invalid or expired verification link"}), 400
        
        if not email_token.is_valid():
            return jsonify({"error": "Verification link has expired. Please request a new one."}), 400
        
        # Mark token as used and verify email
        user = email_token.user
        user.is_email_verified = True
        email_token.mark_used()
        
        db.session.commit()
        
        return jsonify({
            "status": "success",
            "message": "Email verified successfully! You can now log in.",
            "user_id": user.id
        }), 200
        
    except Exception as e:
        db.session.rollback()
        print(f"Email verification error: {e}")
        return jsonify({"error": "Verification failed"}), 500


@auth_bp.route('/resend-verification', methods=['POST'])
def resend_verification():
    """
    Resend verification email to user
    """
    try:
        data = request.get_json() or {}
        email = data.get('email', '').strip().lower()
        
        if not email:
            return jsonify({"error": "Email is required"}), 400
        
        user = User.query.filter_by(email=email).first()
        if not user:
            return jsonify({"error": "User not found"}), 404
        
        if user.is_email_verified:
            return jsonify({"message": "Email already verified"}), 200
        
        # Delete old tokens
        EmailToken.query.filter_by(
            user_id=user.id,
            token_type='email_verification',
            is_used=False
        ).delete()
        db.session.commit()
        
        # Send new verification email
        success, message = send_verification_email(user)
        
        if success:
            return jsonify({
                "status": "success",
                "message": "Verification email sent. Check your inbox."
            }), 200
        else:
            return jsonify({
                "status": "error",
                "message": "Failed to send verification email. Try again later."
            }), 500
            
    except Exception as e:
        db.session.rollback()
        print(f"Resend verification error: {e}")
        return jsonify({"error": "Request failed"}), 500


@auth_bp.route('/forgot-password', methods=['POST'])
def forgot_password():
    """
    Send password reset email to user
    """
    try:
        data = request.get_json() or {}
        email = data.get('email', '').strip().lower()
        
        if not email:
            return jsonify({"error": "Email is required"}), 400
        
        user = User.query.filter_by(email=email).first()
        if not user:
            # Don't reveal if email exists (security best practice)
            return jsonify({
                "status": "success",
                "message": "If an account exists with this email, you'll receive a password reset link."
            }), 200
        
        # Delete old reset tokens
        EmailToken.query.filter_by(
            user_id=user.id,
            token_type='password_reset',
            is_used=False
        ).delete()
        db.session.commit()
        
        # Send password reset email
        success, message = send_password_reset_email(user)
        
        if success:
            return jsonify({
                "status": "success",
                "message": "If an account exists with this email, you'll receive a password reset link."
            }), 200
        else:
            print(f"Password reset email failed: {message}")
            return jsonify({
                "status": "success",
                "message": "If an account exists with this email, you'll receive a password reset link."
            }), 200
            
    except Exception as e:
        db.session.rollback()
        print(f"Forgot password error: {e}")
        return jsonify({
            "status": "success",
            "message": "If an account exists with this email, you'll receive a password reset link."
        }), 200


@auth_bp.route('/reset-password/<token>', methods=['POST'])
def reset_password(token):
    """
    Reset user's password using token from reset email
    """
    try:
        data = request.get_json() or {}
        new_password = data.get('password', '').strip()
        
        if not new_password:
            return jsonify({"error": "Password is required"}), 400
        
        if len(new_password) < 8:
            return jsonify({"error": "Password must be at least 8 characters long"}), 400
        
        # Find token
        email_token = EmailToken.query.filter_by(
            token=token,
            token_type='password_reset',
            is_used=False
        ).first()
        
        if not email_token:
            return jsonify({"error": "Invalid or expired reset link"}), 400
        
        if not email_token.is_valid():
            return jsonify({"error": "Reset link has expired. Please request a new one."}), 400
        
        # Update password
        user = email_token.user
        user.password_hash = generate_password_hash(new_password)
        email_token.mark_used()
        
        db.session.commit()
        
        return jsonify({
            "status": "success",
            "message": "Password reset successfully! You can now log in with your new password.",
            "user_id": user.id
        }), 200
        
    except Exception as e:
        db.session.rollback()
        print(f"Reset password error: {e}")
        return jsonify({"error": "Password reset failed"}), 500


@auth_bp.route('/check-email-verified/<int:user_id>', methods=['GET'])
@jwt_required()
def check_email_verified(user_id):
    """
    Check if user's email is verified
    """
    try:
        current_user_id = int(get_jwt_identity())
        
        # Users can only check their own status
        if current_user_id != user_id:
            return jsonify({"error": "Unauthorized"}), 403
        
        user = User.query.get(user_id)
        if not user:
            return jsonify({"error": "User not found"}), 404
        
        return jsonify({
            "user_id": user.id,
            "email": user.email,
            "is_email_verified": user.is_email_verified
        }), 200
        
    except Exception as e:
        print(f"Check email verified error: {e}")
        return jsonify({"error": "Check failed"}), 500


@auth_bp.route('/validate-reset-token/<token>', methods=['GET'])
def validate_reset_token(token):
    """
    Validate if a reset token is valid (before showing reset form)
    """
    try:
        email_token = EmailToken.query.filter_by(
            token=token,
            token_type='password_reset',
            is_used=False
        ).first()
        
        if not email_token or not email_token.is_valid():
            return jsonify({
                "valid": False,
                "message": "Invalid or expired reset link"
            }), 400
        
        return jsonify({
            "valid": True,
            "message": "Reset link is valid",
            "expires_at": email_token.expires_at.isoformat()
        }), 200
        
    except Exception as e:
        print(f"Validate reset token error: {e}")
        return jsonify({"error": "Validation failed"}), 500
