from flask import Blueprint, request, jsonify, current_app
from extensions import db
from models.domain import Domain
from models.payments import Payment
from flask_jwt_extended import jwt_required, get_jwt_identity  # ✅ ADD
from datetime import datetime
import time
import uuid

payment_bp = Blueprint('payment', __name__)


@payment_bp.route('/pay/initiate', methods=['POST'])
@jwt_required()  # ✅ PROTECTED
def initiate_payment():
    # ✅ Verify the caller is the actual domain owner
    current_owner_id = get_jwt_identity()
    try:
        current_owner_id = int(current_owner_id)
    except (ValueError, TypeError):
        pass

    data = request.get_json(silent=True) or {}
    domain_id = data.get('domain_id')
    phone = data.get('phone')

    if not domain_id:
        return jsonify({"error": "domain_id is required"}), 400

    domain = Domain.query.get(domain_id)
    if not domain:
        return jsonify({"error": "Domain not found"}), 404

    # ✅ Ensure this owner actually owns this domain
    if domain.owner_id != current_owner_id:
        return jsonify({"error": "Unauthorized: This domain does not belong to you"}), 403

    try:
        target_goal = getattr(domain, 'target_goal', 0)
        deposit_amount = float(target_goal) * 7 * 0.3

        transaction_ref = f"MOCK-SEMA-{domain_id}-{int(time.time())}"
        new_payment = Payment(
            domain_id=domain_id,
            amount=deposit_amount,
            transaction_ref=transaction_ref,
            status="Success",
            phone_number=phone,
            processed_at=datetime.utcnow()
        )
        db.session.add(new_payment)

        domain.is_active = True
        domain.amount_paid = (domain.amount_paid or 0) + deposit_amount
        domain.payment_status = "Paid"
        db.session.commit()

        # ✅ Return relative path — frontend uses React Router navigate()
        return jsonify({
            "status": "success",
            "message": "Payment Simulated Successfully",
            "deposit": deposit_amount,
            "transaction_ref": transaction_ref,
            "redirect_path": "/Dashboard"   # ✅ path only, not full URL
        }), 200

    except Exception as e:
        db.session.rollback()
        current_app.logger.error(f"Payment Error: {str(e)}")
        return jsonify({"error": "Internal error"}), 500


@payment_bp.route('/payment/callback', methods=['POST'])
def payment_callback():
    payload = request.get_json(silent=True) or {}
    data = {}
    if isinstance(payload, dict):
        data = payload.get('Body', {}).get('stkCallback', {})

    result_code = data.get('ResultCode')
    checkout_request_id = data.get('CheckoutRequestID')

    if not checkout_request_id:
        current_app.logger.warning('Payment callback missing CheckoutRequestID')
        return jsonify({"error": "Missing CheckoutRequestID"}), 400

    payment = Payment.query.filter_by(checkout_request_id=checkout_request_id).first()
    if not payment:
        current_app.logger.warning('Callback for unknown payment: %s', checkout_request_id)
        return jsonify({"ResultCode": 0, "ResultDesc": "Received"}), 200

    try:
        try:
            is_success = int(result_code) == 0
        except Exception:
            is_success = str(result_code) == '0'

        if is_success:
            if payment.status == 'Success':
                return jsonify({"ResultCode": 0, "ResultDesc": "Already processed"}), 200
            payment.status = "Success"
            domain = Domain.query.get(payment.domain_id)
            if domain:
                domain.is_active = True
                domain.amount_paid = (domain.amount_paid or 0) + (payment.amount or 0)
            if hasattr(payment, 'processed_at'):
                payment.processed_at = datetime.utcnow()
        else:
            payment.status = "Failed"

        db.session.commit()
    except Exception as e:
        current_app.logger.exception('Error processing callback for %s', checkout_request_id)
        db.session.rollback()
        return jsonify({"error": "processing error"}), 500

    return jsonify({"ResultCode": 0, "ResultDesc": "Received successfully"}), 200


@payment_bp.route('/status/<int:domain_id>', methods=['GET'])
@jwt_required()  # ✅ Protect status check too
def get_status(domain_id):
    current_owner_id = get_jwt_identity()
    try:
        current_owner_id = int(current_owner_id)
    except (ValueError, TypeError):
        pass

    domain = Domain.query.get(domain_id)
    if not domain:
        return jsonify({"error": "Domain not found"}), 404

    # ✅ Only allow the owner to see their domain status
    if domain.owner_id != current_owner_id:
        return jsonify({"error": "Unauthorized"}), 403

    return jsonify({
        "is_active": getattr(domain, 'is_active', False),
        "reference_number": getattr(domain, 'reference_number', None),
        "domain_name": getattr(domain, 'domain_name', None)
    }), 200