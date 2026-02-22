import requests
import base64
import logging
from datetime import datetime
from flask import current_app

# Configure logging to track payment issues
logging.basicConfig(level=logging.INFO, filename='payments.log')

class MpesaHandler:
    @staticmethod
    def get_token():
        # Production Tip: Use a cache (like Redis or a simple file) for the token.
        # It lasts for 1 hour. Requesting a new one every minute is inefficient.
        url = "https://sandbox.safaricom.co.ke/oauth/v1/generate?grant_type=client_credentials"
        try:
            res = requests.get(
                url, 
                auth=(current_app.config['DARAJA_CONSUMER_KEY'], current_app.config['DARAJA_CONSUMER_SECRET']),
                timeout=5
            )
            res.raise_for_status()
            return res.json().get('access_token')
        except Exception as e:
            logging.error(f"Failed to fetch Mpesa Token: {str(e)}")
            return None

    @staticmethod
    def initiate_stk_push(phone, amount, reference, domain_id):
        token = MpesaHandler.get_token()
        if not token:
            return {"error": "Auth Failed"}, 500

        # Logic for formatting phone to 254...
        formatted_phone = f"254{phone[-9:]}" 
        
        timestamp = datetime.now().strftime('%Y%m%d%H%M%S')
        passkey = current_app.config['DARAJA_PASSKEY']
        shortcode = current_app.config['DARAJA_BUSINESS_CODE']
        
        password = base64.b64encode(f"{shortcode}{passkey}{timestamp}".encode()).decode()

        payload = {
            "BusinessShortCode": shortcode,
            "Password": password,
            "Timestamp": timestamp,
            "TransactionType": "CustomerPayBillOnline",
            "Amount": int(amount),
            "PartyA": formatted_phone,
            "PartyB": shortcode,
            "PhoneNumber": formatted_phone,
            "CallBackURL": current_app.config.get('DARAJA_CALLBACK_URL', current_app.config.get('MPESA_CALLBACK_URL')),
            "AccountReference": reference,
            "TransactionDesc": f"SemaData ID: {domain_id}"
        }

        try:
            response = requests.post(
                "https://sandbox.safaricom.co.ke/mpesa/stkpush/v1/processrequest",
                json=payload,
                headers={"Authorization": f"Bearer {token}"},
                timeout=10
            )
            data = response.json()
            
            # Production check: Log the CheckoutRequestID immediately
            if data.get('ResponseCode') == '0':
                logging.info(f"STK Push Sent: {data.get('CheckoutRequestID')} for Domain {domain_id}")
            
            return data
        except requests.exceptions.Timeout:
            return {"error": "Safaricom took too long to respond"}, 504
        except Exception as e:
            logging.error(f"STK Push Exception: {str(e)}")
            return {"error": "Internal Payment Error"}, 500