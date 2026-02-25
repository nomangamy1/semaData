from flask import Blueprint, request, jsonify, current_app
from extensions import db
from models.domain import Domain
from models.payments import Payment
from utils.mpesa_handler import MpesaHandler
from datetime import datetime
import time
import requests
import uuid

payment_bp = Blueprint('payment', __name__)


@payment_bp.route('/pay/initiate', methods=['POST'])
def initiate_payment():
    data = request.get_json(silent=True) or {}
    domain_id = data.get('domain_id')
    phone = data.get('phone')
    transaction_ref = data.get('transaction_ref')

    if not domain_id:
        return jsonify({"error": "domain_id is required"}), 400

    domain = Domain.query.get(domain_id)
    if not domain:
        return jsonify({"error": "Domain not found"}), 404
    try:
        # 1. Calculate the deposit (Keep logic consistent with UI)
        target_goal = getattr(domain, 'target_goal', 0)
        deposit_amount = float(target_goal) * 7 * 0.3

        # 2. Create a "Success" payment record immediately
        transaction_ref = f"MOCK-SEMA-{domain_id}-{int(time.time())}"
        new_payment = Payment(
            domain_id=domain_id,
            amount=deposit_amount,
            transaction_ref=transaction_ref,
            status="Success", # Directly set to Success
            phone_number=phone,
            processed_at=datetime.utcnow()
        )
        db.session.add(new_payment)

        # 3. Activate the domain immediately
        domain.is_active = True
        domain.amount_paid = (domain.amount_paid or 0) + deposit_amount
        domain.payment_status = "Paid"
        db.session.commit()

        # 4. Return the response the frontend is waiting for
        redirect_url = f"http://localhost:5173/Success?type=owner&domain_id={domain_id}"

        return jsonify({
            "status": "success",
            "message": "PROTOTYPE MODE: Payment Simulated Successfully",
            "deposit": deposit_amount,
            "transaction_ref": transaction_ref,
            "redirect_url": redirect_url
        }), 200

    except Exception as e:
        db.session.rollback()
        current_app.logger.error(f"Shortcut Error: {str(e)}")
        return jsonify({"error": "Internal prototype error"}), 500
    # generate transaction ref server-side if not provided
''' 
   if not transaction_ref:
        transaction_ref = f"SEMA{domain_id}-{int(time.time())}"

    # ensure uniqueness
    if Payment.query.filter_by(transaction_ref=transaction_ref).first():
        transaction_ref = f"{transaction_ref}-{uuid.uuid4().hex[:8]}"

    try:
        # Step 1: Create payment record with Pending status
        new_payment = Payment(
            domain_id=domain_id,
            amount=deposit_amount,
            transaction_ref=transaction_ref,
            status="Pending",
            phone_number=phone
        )
        db.session.add(new_payment)
        db.session.commit()

        # Step 2: Call Daraja to initiate STK push
        stk_response = MpesaHandler.initiate_stk_push(
            phone=phone,
            amount=deposit_amount,
            reference=transaction_ref,
            domain_id=domain_id
        )

        # Check if STK push was successful
        if stk_response.get('ResponseCode') == '0':
            checkout_request_id = stk_response.get('CheckoutRequestID')
            # Store the CheckoutRequestID for callback matching
            new_payment.checkout_request_id = checkout_request_id
            db.session.commit()

            redirect_url = current_app.config.get('PAYMENT_SUCCESS_REDIRECT', f"http://localhost:3000/Success?domain_id={domain_id}")

            return jsonify({
                "status": "success",
                "message": "M-Pesa prompt sent to your phone",
                "deposit": deposit_amount,
                "transaction_ref": transaction_ref,
                "checkout_request_id": checkout_request_id,
                "redirect_url": redirect_url
            }), 200
        else:
            # STK push failed
            error_msg = stk_response.get('errorMessage', 'Failed to initiate payment')
            current_app.logger.error(f"STK push failed: {error_msg}")
            new_payment.status = "Failed"
            db.session.commit()
            return jsonify({"error": error_msg}), 500

    except Exception as e:
        current_app.logger.exception("Failed to create payment for domain %s", domain_id)
        db.session.rollback()
        return jsonify({"error": "Could not connect to payment gateway"}), 500
'''

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

    # Match payment by CheckoutRequestID (new Daraja field)
    payment = Payment.query.filter_by(checkout_request_id=checkout_request_id).first()
    
    if not payment:
        current_app.logger.warning('Callback for unknown payment: %s', checkout_request_id)
        # Return 200 per Daraja requirements but do not crash
        return jsonify({"ResultCode": 0, "ResultDesc": "Received"}), 200

    try:
        # treat result_code as numeric or string
        is_success = False
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
            current_app.logger.info(f"Payment {checkout_request_id} succeeded - Domain {payment.domain_id} activated")
        else:
            payment.status = "Failed"
            current_app.logger.warning(f"Payment {checkout_request_id} failed with code {result_code}")

        db.session.commit()
    except Exception as e:
        current_app.logger.exception('Error processing payment callback for %s', checkout_request_id)
        db.session.rollback()
        return jsonify({"error": "processing error"}), 500

    return jsonify({"ResultCode": 0, "ResultDesc": "Received successfully"}), 200


@payment_bp.route('/status/<int:domain_id>', methods=['GET'])
def get_status(domain_id):
    domain = Domain.query.get(domain_id)
    if not domain:
        return jsonify({"error": "Domain not found"}), 404

    return jsonify({
        "is_active": getattr(domain, 'is_active', False),
        "reference_number": getattr(domain, 'reference_number', None),
        "domain_name": getattr(domain, 'domain_name', None)
    }), 200

