from flask import Blueprint, request, jsonify
from extensions import db
from models.domain import Domain
from models.payments import Payment 
from datetime import datetime 
import time 
import requests
payment_bp = Blueprint('payment', __name__)

@payment_bp.route('/pay/initiate', methods=['POST'])
def initiate_payment():
    data = request.json
    domain_id = data.get('domain_id')

    domain = Domain.query.get(domain_id)
    if not domain:
        return jsonify({
            "Error":"Domain not found"
        }),404

    deposit_amount = domain.total_budget * 0.3

    transaction_reference =f"SEMA{domain_id}-{int(time.time())}"
    try:
        new_payment = Payment(
            domain_id=domain_id,
            amount=deposit_amount,
            transaction_ref=transaction_reference,
                status="Pending"
        )
        db.session(new_payment)
        db.session.commit()

        
        return jsonify({
            "status": "success",
            "checkout_url": "https://checkout.provider.com/ref123",
            "message": "Payment initiated",
            "deposit": deposit_amount
        }),200
    except Exception as e:
        return jsonify({
            "error":"Could not connect to payment gateaway"
        }),500
    
@payment_bp.route('/payment/callback', methods=['POST'])
def payment_callback():
    data = request.json

    domain_id = data.get('domain_id')

    amount_received = float(data.get('amount',0))
    domain =Domain.query.get(domain_id)
    if domain : 
        return jsonify({
            "Status": "Failed", "Message": "Domain not found"
        }),404
    
    is_now_active = domain.update_payment(amount_received)

    db.session.commit()

    return jsonify({
        "Stutus":"Success",
        "activated":is_now_active,
        "new total":domain.amount_paid

    }),200
