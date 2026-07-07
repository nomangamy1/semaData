from flask import Blueprint, request, jsonify
from extensions import db
from utils.mailer import send_approval_email as send_email
from models.ContactUs import ContactInquiry
from datetime import datetime
import logging
import re

contact_bp = Blueprint('contact', __name__)
logger = logging.getLogger(__name__)



def is_valid_email(email):
    """Validate email format"""
    pattern = r'^[^\s@]+@[^\s@]+\.[^\s@]+$'
    return re.match(pattern, email) is not None


def is_valid_phone(phone):
    """Validate phone format"""
    if not phone:
        return True  # Phone is optional
    pattern = r'^[\d\s\-\+\(\)]{10,}$'
    return re.match(pattern, phone) is not None


def is_spam(message):
    """Simple spam detection"""
    spam_keywords = ['viagra', 'casino', 'lottery', 'click here', 'free money', 'bitcoin']
    message_lower = message.lower()
    return any(keyword in message_lower for keyword in spam_keywords)


@contact_bp.route('/api/contact', methods=['POST'])
def submit_contact():
    """
    Submit a contact form inquiry
    Expected JSON:
    {
        "name": "John Doe",
        "email": "john@example.com",
        "phone": "+254 712 345 678" (optional),
        "subject": "General Inquiry",
        "message": "Your message here..."
    }
    """
    try:
        data = request.get_json()
        
        # Validate required fields
        if not data:
            return jsonify({"error": "No data provided"}), 400
        
        name = data.get('name', '').strip()
        email = data.get('email', '').strip()
        phone = data.get('phone', '').strip()
        subject = data.get('subject', 'General Inquiry').strip()
        message = data.get('message', '').strip()
        
        # Validation checks
        errors = {}
        
        if not name:
            errors['name'] = 'Name is required'
        elif len(name) < 2:
            errors['name'] = 'Name must be at least 2 characters'
        
        if not email:
            errors['email'] = 'Email is required'
        elif not is_valid_email(email):
            errors['email'] = 'Invalid email format'
        
        if phone and not is_valid_phone(phone):
            errors['phone'] = 'Invalid phone format'
        
        if not subject:
            errors['subject'] = 'Subject is required'
        
        if not message:
            errors['message'] = 'Message is required'
        elif len(message) < 10:
            errors['message'] = 'Message must be at least 10 characters'
        elif len(message) > 5000:
            errors['message'] = 'Message cannot exceed 5000 characters'
        
        # Return validation errors
        if errors:
            logger.warning(f"Contact form validation failed: {errors}")
            return jsonify({"error": "Validation failed", "details": errors}), 400
        
        # Check for spam
        if is_spam(message):
            logger.warning(f"Spam detected from {email}")
            # Pretend it was successful but mark as spam internally
            inquiry = ContactInquiry(
                name=name,
                email=email,
                phone=phone,
                subject=subject,
                message=message,
                status='spam'
            )
            db.session.add(inquiry)
            db.session.commit()
            return jsonify({
                "message": "Thank you for your message. We'll review it and get back to you soon.",
                "inquiry_id": inquiry.id
            }), 200
        
        # Check for duplicate submissions (same email + message within 5 minutes)
        from datetime import timedelta
        recent_inquiry = ContactInquiry.query.filter(
            ContactInquiry.email == email,
            ContactInquiry.message == message,
            ContactInquiry.created_at >= datetime.utcnow() - timedelta(minutes=5)
        ).first()
        
        if recent_inquiry:
            logger.warning(f"Duplicate submission from {email}")
            return jsonify({
                "error": "Duplicate submission detected. Please wait before submitting again."
            }), 429
        
        # Create new inquiry
        inquiry = ContactInquiry(
            name=name,
            email=email,
            phone=phone,
            subject=subject,
            message=message,
            status='pending'
        )
        
        db.session.add(inquiry)
        db.session.commit()
        
        # Send confirmation email to user
        try:
            send_email(
                recipient=email,
                subject='We received your message',
                body=f"""
                Hi {name},
                
                Thank you for reaching out to semaData. We've received your message and will get back to you shortly.
                
                Your inquiry ID: {inquiry.id}
                Subject: {subject}
                
                Best regards,
                The semaData Team
                Eldoret, Kenya
                """
            )
        except Exception as e:
            logger.error(f"Failed to send confirmation email to {email}: {str(e)}")
        
        # Send notification to admin
        try:
            send_email(
                recipient='hello@semadata.ai',
                subject=f'New Contact Form Submission: {subject}',
                body=f"""
                New contact inquiry received:
                
                Name: {name}
                Email: {email}
                Phone: {phone if phone else 'Not provided'}
                Subject: {subject}
                
                Message:
                {message}
                
                Inquiry ID: {inquiry.id}
                Timestamp: {inquiry.created_at}
                """
            )
        except Exception as e:
            logger.error(f"Failed to send admin notification: {str(e)}")
        
        logger.info(f"Contact inquiry submitted: ID={inquiry.id}, Email={email}, Subject={subject}")
        
        return jsonify({
            "message": "Thank you for your message! We'll get back to you within 24 hours.",
            "inquiry_id": inquiry.id
        }), 201
        
    except Exception as e:
        logger.error(f"Contact form submission error: {str(e)}")
        return jsonify({"error": "An error occurred while processing your request"}), 500


@contact_bp.route('/api/contact/<int:inquiry_id>', methods=['GET'])
def get_contact_inquiry(inquiry_id):
    """Get a specific contact inquiry (for admin purposes)"""
    try:
        # In production, add authentication check here
        inquiry = ContactInquiry.query.get(inquiry_id)
        
        if not inquiry:
            return jsonify({"error": "Inquiry not found"}), 404
        
        return jsonify(inquiry.to_dict()), 200
        
    except Exception as e:
        logger.error(f"Error fetching inquiry {inquiry_id}: {str(e)}")
        return jsonify({"error": "An error occurred"}), 500


@contact_bp.route('/api/contact', methods=['GET'])
def get_all_contacts():
    """Get all contact inquiries (admin only)"""
    try:
        # In production, add authentication and authorization check
        status_filter = request.args.get('status', 'pending')
        
        inquiries = ContactInquiry.query.filter_by(status=status_filter).order_by(
            ContactInquiry.created_at.desc()
        ).all()
        
        return jsonify([inquiry.to_dict() for inquiry in inquiries]), 200
        
    except Exception as e:
        logger.error(f"Error fetching contacts: {str(e)}")
        return jsonify({"error": "An error occurred"}), 500


@contact_bp.route('/api/contact/<int:inquiry_id>', methods=['PATCH'])
def update_contact_status(inquiry_id):
    """Update inquiry status (admin only)"""
    try:
        # In production, add authentication and authorization check
        inquiry = ContactInquiry.query.get(inquiry_id)
        
        if not inquiry:
            return jsonify({"error": "Inquiry not found"}), 404
        
        data = request.get_json()
        status = data.get('status')
        
        if status not in ['pending', 'replied', 'spam']:
            return jsonify({"error": "Invalid status"}), 400
        
        inquiry.status = status
        db.session.commit()
        
        logger.info(f"Inquiry {inquiry_id} status updated to {status}")
        
        return jsonify({
            "message": "Inquiry status updated",
            "inquiry": inquiry.to_dict()
        }), 200
        
    except Exception as e:
        logger.error(f"Error updating inquiry {inquiry_id}: {str(e)}")
        return jsonify({"error": "An error occurred"}), 500
