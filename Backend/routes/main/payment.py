'''
Docstring for Backend.routes.main.payment
from flask import Blueprint, request, jsonify
from extensions import db
from models.domain import Domain
from datetime import datetime 
import time 
import requests

payment_bp = Blueprint('payment', __name__)

@payment_bp.route('/pay/initiate', methods=['POST'])
def initiate_payment():
    data = request.json
    domain_id = data.get('domain_id')
    amount = data.get('amount') # The downpayment amount
    
    # 1. Logic to call M-Pesa or Flutterwave API goes here
    # 2. Return a transaction reference or a checkout link
    
    return jsonify({
        "status": "success",
        "checkout_url": "https://checkout.provider.com/ref123",
        "message": "Payment initiated"
    })
@payment_bp.route('/payment/callback', methods=['POST'])
def payment_callback():
    # Provider sends data here: { "status": "success", "tx_ref": "domain_5" }
    data = request.json 
    
    if data['status'] == 'successful':
        domain = Domain.query.get(data['domain_id'])
        domain.amount_paid += data['amount']
        
        # Logic to flip status
        if domain.amount_paid >= domain.total_cost:
            domain.payment_status = 'Completed'
        else:
            domain.payment_status = 'Partial'
            
        db.session.commit()
    return "OK", 200

@payment_bp.route('/checkout', methods=['POST'])
def create_checkout():
    domain_id = request.json.get('domain_id')
    user_email = request.json.get('email')
    amount = request.json.get('amount') # Calculate 30% of total
    
    # This is a generic example of calling a global aggregator
    payload = {
        "tx_ref": f"sema-{domain_id}-{int(time.time())}",
        "amount": amount,
        "currency": "USD", # You can accept USD globally!
        "redirect_url": "https://semadata.ai/payment-confirmed",
        "customer": {"email": user_email},
        "customizations": {
            "title": "SemaData - Downpayment",
            "description": f"Initial deposit for Domain #{domain_id}"
        }
    }
    # Send this to Flutterwave/Paystack API...
    return jsonify({"checkout_url": response_from_provider['link']})
'''