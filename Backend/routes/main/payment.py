from flask import Blueprint, request, jsonify, current_app
from extensions import db
from models.domain import Domain
from models.domainowner import DomainOwner
from models.payments import Payment
from flask_jwt_extended import jwt_required, get_jwt_identity
from datetime import datetime
import time
import secrets
import string

payment_bp = Blueprint("payment", __name__)


def generate_ref_number(domain_name):
    prefix = domain_name[:4].upper()
    suffix = "".join(secrets.choice(string.ascii_uppercase + string.digits) for _ in range(6))
    return f"{prefix}--{suffix}"


def _activate_domain(domain):
    if domain.reference_number:
        return domain.reference_number
    ref = generate_ref_number(domain.domain_name)
    domain.reference_number = ref
    domain.is_active        = True
    domain.payment_status   = "deposit_paid"
    owner = DomainOwner.query.get(domain.owner_id)
    if owner:
        owner.reference_number = ref
    return ref


@payment_bp.route("/pay/initiate", methods=["POST"])
@jwt_required()
def initiate_payment():
    current_owner_id = get_jwt_identity()
    try:
        current_owner_id = int(current_owner_id)
    except (ValueError, TypeError):
        pass
    data      = request.get_json(silent=True) or {}
    domain_id = data.get("domain_id")
    phone     = data.get("phone")
    if not domain_id:
        return jsonify({"error": "domain_id is required"}), 400
    domain = Domain.query.get(domain_id)
    if not domain:
        return jsonify({"error": "Domain not found"}), 404
    if domain.owner_id != current_owner_id:
        return jsonify({"error": "Unauthorized: This domain does not belong to you"}), 403
    if domain.payment_status == "deposit_paid" and domain.reference_number:
        return jsonify({
            "status":           "already_paid",
            "message":          "Domain already activated",
            "reference_number": domain.reference_number,
            "redirect_path":    "/Dashboard"
        }), 200
    try:
        deposit_amount  = float(domain.deposit_amount or 0)
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
        domain.amount_paid = (domain.amount_paid or 0) + deposit_amount
        ref_number = _activate_domain(domain)
        db.session.commit()
        return jsonify({
            "status":           "success",
            "message":          "Payment successful. Your domain is now active!",
            "deposit":          deposit_amount,
            "transaction_ref":  transaction_ref,
            "reference_number": ref_number,
            "redirect_path":    "/Dashboard"
        }), 200
    except Exception as e:
        db.session.rollback()
        current_app.logger.error(f"Payment Error: {str(e)}")
        return jsonify({"error": "Internal error"}), 500


@payment_bp.route("/payment/callback", methods=["POST"])
def payment_callback():
    payload = request.get_json(silent=True) or {}
    data = {}
    if isinstance(payload, dict):
        data = payload.get("Body", {}).get("stkCallback", {})
    result_code         = data.get("ResultCode")
    checkout_request_id = data.get("CheckoutRequestID")
    if not checkout_request_id:
        return jsonify({"error": "Missing CheckoutRequestID"}), 400
    payment = Payment.query.filter_by(checkout_request_id=checkout_request_id).first()
    if not payment:
        return jsonify({"ResultCode": 0, "ResultDesc": "Received"}), 200
    try:
        is_success = str(result_code) == "0"
        if is_success:
            if payment.status == "Success":
                return jsonify({"ResultCode": 0, "ResultDesc": "Already processed"}), 200
            payment.status = "Success"
            domain = Domain.query.get(payment.domain_id)
            if domain:
                domain.amount_paid = (domain.amount_paid or 0) + (payment.amount or 0)
                _activate_domain(domain)
            if hasattr(payment, "processed_at"):
                payment.processed_at = datetime.utcnow()
        else:
            payment.status = "Failed"
        db.session.commit()
    except Exception as e:
        current_app.logger.exception("Error processing callback: %s", e)
        db.session.rollback()
        return jsonify({"error": "processing error"}), 500
    return jsonify({"ResultCode": 0, "ResultDesc": "Received successfully"}), 200


@payment_bp.route("/status/<int:domain_id>", methods=["GET"])
@jwt_required()
def get_status(domain_id):
    current_owner_id = get_jwt_identity()
    try:
        current_owner_id = int(current_owner_id)
    except (ValueError, TypeError):
        pass
    domain = Domain.query.get(domain_id)
    if not domain:
        return jsonify({"error": "Domain not found"}), 404
    if domain.owner_id != current_owner_id:
        return jsonify({"error": "Unauthorized"}), 403
    return jsonify({
        "is_active":        domain.is_active,
        "payment_status":   domain.payment_status,
        "reference_number": domain.reference_number,
        "domain_name":      domain.domain_name,
        "deposit_amount":   domain.deposit_amount,
        "amount_paid":      domain.amount_paid or 0,
    }), 200
