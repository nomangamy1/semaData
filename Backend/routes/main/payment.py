from flask import Blueprint, request, jsonify, current_app
from extensions import db
from models.domain import Domain
from models.domainowner import DomainOwner
from models.payments import Payment
from flask_jwt_extended import jwt_required, get_jwt_identity
from flask_jwt_extended import jwt_required, get_jwt_identity, get_jwt

from datetime import datetime
import time
import secrets
import string
from sqlalchemy import func
import os
import requests
import base64

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
# ==============================================================================
# COLLECTOR DISBURSEMENT & FINANCIAL MANAGEMENT SYSTEM
# ==============================================================================
@payment_bp.route("/finance-summary", methods=["GET"])
@jwt_required()
def get_finance_summary():
    from models.user import User  
    from models.datasets import DatasetEntry 
    from models.disbursements import AdminDisbursement 
    from models.domain import Domain
    
    collector_id = get_jwt_identity()
    try:
        collector_id = int(collector_id)
    except (ValueError, TypeError):
        pass

    try:
        # 1. Compute baseline gross earnings from verified entries
        gross_query = db.session.query(
            func.coalesce(func.sum(Domain.collector_bounty), 0.00)
        ).join(
            DatasetEntry, DatasetEntry.domain_id == Domain.id
        ).filter(
            DatasetEntry.collector_id == collector_id,
            DatasetEntry.status == "Verified"
        ).scalar()
        
        base_earnings = float(gross_query)

        # 2. RUN QUALITY AUDIT: Check if penalty applies
        total_submissions = DatasetEntry.query.filter_by(collector_id=collector_id).count()
        null_rejections = DatasetEntry.query.filter_by(
            collector_id=collector_id, 
            status='Rejected', 
            rejection_reason='HIGH_NULL_VALUES'
        ).count()
        
        failure_rate = (null_rejections / total_submissions) if total_submissions > 0 else 0
        
        # Determine penalty deduction percentage
        penalty_percentage = 0.0
        penalty_deduction_amount = 0.0
        
        if failure_rate > 0.20 and total_submissions >= 5:
            penalty_percentage = 0.15 # 15% penalty fee for spam/null data patterns
            penalty_deduction_amount = base_earnings * penalty_percentage

        # Adjusted earnings after quality control fines
        net_gross_earnings = base_earnings - penalty_deduction_amount

        # 3. Fetch past successful payouts
        withdrawn_query = db.session.query(
            func.coalesce(func.sum(AdminDisbursement.amount), 0.00)
        ).filter(
            AdminDisbursement.collector_id == collector_id,
            AdminDisbursement.status == "DISBURSED"
        ).scalar()
        
        total_withdrawn = float(withdrawn_query)
        current_balance = net_gross_earnings - total_withdrawn

        return jsonify({
            "base_earnings": base_earnings,
            "penalty_deduction": penalty_deduction_amount,
            "penalty_percentage_applied": f"{penalty_percentage * 100}%",
            "net_gross_earnings": net_gross_earnings,
            "total_withdrawn": total_withdrawn,
            "current_balance": max(current_balance, 0.00), # Prevent negative balance edge cases
            "quality_metrics": {
                "total_submitted": total_submissions,
                "null_rejections": null_rejections,
                "rejection_rate": f"{round(failure_rate * 100, 2)}%"
            }
        }), 200

    except Exception as e:
        return jsonify({"error": f"Ledger aggregation crash: {str(e)}"}), 500

@payment_bp.route("/request-withdrawal", methods=["POST"])
@jwt_required()
def request_withdrawal():
    """ Creates a withdrawal intent row after validating the newly scaled dynamic balance formulas """
    from models.datasets import DatasetEntry
    from models.disbursements import AdminDisbursement

    collector_id = get_jwt_identity()
    try:
        collector_id = int(collector_id)
    except (ValueError, TypeError):
        pass

    data = request.get_json(silent=True) or {}
    try:
        requested_amount = float(data.get("amount", 0))
    except (ValueError, TypeError):
        return jsonify({"error": "Numeric values only"}), 400

    if requested_amount < 100.00:
        return jsonify({"error": "Minimum payout requirement is KES 100.00"}), 400

    try:
        # ─── RE-VERIFY BALANCE WITH DYNAMIC BOUNTY RATES ───
        gross = db.session.query(
            func.coalesce(func.sum(Domain.collector_bounty), 0.00)
        ).join(
            DatasetEntry, DatasetEntry.domain_id == Domain.id
        ).filter(
            DatasetEntry.collector_id == collector_id,
            DatasetEntry.status == "Verified"
        ).scalar()
        
        paid = db.session.query(func.coalesce(func.sum(AdminDisbursement.amount), 0.00)).filter(
            AdminDisbursement.collector_id == collector_id, AdminDisbursement.status == "DISBURSED"
        ).scalar()
        
        live_balance = float(gross) - float(paid)

        if requested_amount > live_balance:
            return jsonify({"error": "Withdrawal request rejected due to insufficient verified funds"}), 400

        new_intent = AdminDisbursement(
            collector_id=collector_id,
            amount=requested_amount,
            status="PENDING",
            initiated_at=datetime.utcnow()
        )
        db.session.add(new_intent)
        db.session.commit()

        return jsonify({"status": "success", "message": "Cashout request logged successfully."}), 200

    except Exception as e:
        db.session.rollback()
        return jsonify({"error": f"Ledger validation database error: {str(e)}"}), 500




# ==============================================================================
# SAFARICOM M-PESA DARAJA B2C AUTOMATED DISBURSEMENT PIPELINE
# ==============================================================================

# Fast memory-mapped token engine cache to keep optimization paths fluid
TOKEN_STORAGE = {"access_token": None, "expires_at": 0}

def get_daraja_access_token():
    """Generates and handles a valid OAuth2 token payload cache from Safaricom."""
    now = time.time()
    if TOKEN_STORAGE["access_token"] and now < TOKEN_STORAGE["expires_at"]:
        return TOKEN_STORAGE["access_token"]

    env = os.getenv("MPESA_ENV", "sandbox")
    base_url = "https://sandbox.safaricom.co.ke" if env == "sandbox" else "https://api.safaricom.co.ke"
    
    consumer_key = os.getenv("MPESA_CONSUMER_KEY")
    consumer_secret = os.getenv("MPESA_CONSUMER_SECRET")
    
    if not consumer_key or not consumer_secret:
        current_app.logger.error("Missing M-Pesa environment auth configuration profiles.")
        return None

    auth_chain = f"{consumer_key}:{consumer_secret}"
    b64_credentials = base64.b64encode(auth_chain.encode()).decode()
    
    headers = {"Authorization": f"Basic {b64_credentials}"}
    url = f"{base_url}/oauth/v1/generate?grant_type=client_credentials"
    
    try:
        res = requests.get(url, headers=headers, timeout=10)
        if res.status_code == 200:
            payload = res.json()
            TOKEN_STORAGE["access_token"] = payload["access_token"]
            TOKEN_STORAGE["expires_at"] = now + int(payload["expires_in"]) - 60
            return TOKEN_STORAGE["access_token"]
        current_app.logger.error(f"Daraja Authentication Refused: {res.text}")
        return None
    except Exception as e:
        current_app.logger.error(f"Upstream transmission channel exception: {str(e)}")
        return None


@payment_bp.route("/admin/disburse/approve", methods=["POST"])
@jwt_required()
def admin_approve_and_disburse():
    """
    Admin control action that intercepts a PENDING withdrawal intent row,
    validates the phone mapping target, and fires a live transaction request to Daraja.
    """
    from models.disbursements import AdminDisbursement
    from models.user import User  # Used to safely target physical contact details

    # Add admin-level claims checking here if your JWT setup handles specific role attributes
    data = request.get_json(silent=True) or {}
    disbursement_id = data.get("disbursement_id")

    if not disbursement_id:
        return jsonify({"error": "disbursement_id target parameter required"}), 400

    intent = AdminDisbursement.query.get(disbursement_id)
    if not intent:
        return jsonify({"error": "Target disbursement tracking row not found"}), 404

    if intent.status != "PENDING":
        return jsonify({"error": f"Invalid transition: row is already marked as {intent.status}"}), 400

    collector_profile = User.query.get(intent.collector_id)
    if not collector_profile or not collector_profile.phone_number:
        return jsonify({"error": "Collector user profile lacks valid operational phone mapping"}), 400

    # Ensure format strings match Kenya country prefixes cleanly (2547XXXXXXXX or 2541XXXXXXXX)
    clean_phone = str(collector_profile.phone_number).strip().replace("+", "")
    if clean_phone.startswith("0"):
        clean_phone = "254" + clean_phone[1:]

    token = get_daraja_access_token()
    if not token:
        return jsonify({"error": "Failed proxy authentication sequence with Safaricom Daraja"}), 502

    env = os.getenv("MPESA_ENV", "sandbox")
    base_url = "https://sandbox.safaricom.co.ke" if env == "sandbox" else "https://api.safaricom.co.ke"
    
    # Structure the formal B2C payment parameter dictionary payload object
    daraja_payload = {
        "InitiatorName": os.getenv("MPESA_INITIATOR_NAME"),
        "SecurityCredential": os.getenv("MPESA_INITIATOR_PASSWORD"), # In production, ensure this token string is encrypted via public certificate
        "CommandID": "SalaryPayment", # Use 'SalaryPayment' or 'BusinessPayment' depending on corporate shortcode configurations
        "Amount": int(intent.amount),
        "PartyA": os.getenv("MPESA_B2C_SHORTCODE"),
        "PartyB": clean_phone,
        "Remarks": f"SemaData Payout #{intent.id}",
        "QueueTimeOutURL": f"{os.getenv('MPESA_CALLBACK_BASE_URL')}/api/v1/finance/b2c/timeout",
        "ResultURL": f"{os.getenv('MPESA_CALLBACK_BASE_URL')}/api/v1/finance/b2c/result",
        "Occasion": "CollectorDisbursement"
    }

    headers = {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json"
    }

    try:
        response = requests.post(
            f"{base_url}/mpesa/b2c/v3/paymentrequest", 
            json=daraja_payload, 
            headers=headers, 
            timeout=15
        )
        res_json = response.json()

        if response.status_code == 200 and res_json.get("ResponseCode") == "0":
            # Update local transaction trace to isolate matching callback confirmation frames later
            intent.status = "PROCESSING"
            # Assuming your model contains a reference tracker field (e.g., tracking_id or conversation_id)
            if hasattr(intent, 'conversation_id'):
                intent.conversation_id = res_json.get("ConversationID")
                
            db.session.commit()
            
            return jsonify({
                "status": "queued",
                "message": "Disbursement pipeline initialized with M-Pesa network.",
                "conversation_id": res_json.get("ConversationID")
            }), 200
        else:
            return jsonify({
                "error": "Upstream transaction execution handshake rejected by Safaricom", 
                "details": res_json
            }), 400

    except Exception as e:
        db.session.rollback()
        current_app.logger.error(f"B2C Pipeline Request Fault: {str(e)}")
        return jsonify({"error": "Internal processing interface connection timeout"}), 500


@payment_bp.route("/api/v1/finance/b2c/result", methods=["POST"])
def finance_b2c_result_callback():
    """Asynchronous pipeline terminal entry hit by M-Pesa when fund transfers clear settlement."""
    from models.disbursements import AdminDisbursement
    
    payload = request.get_json(silent=True) or {}
    result_container = payload.get("Result", {})
    result_code = result_container.get("ResultCode")
    conversation_id = result_container.get("ConversationID")

    current_app.logger.info(f"[B2C Callback Tracking] Context hit for Conversation: {conversation_id}")

    # Recover transaction trace matching backend reference tracking codes
    intent = AdminDisbursement.query.filter_by(conversation_id=conversation_id).first()
    if not intent:
        # Gracefully handle early exits if records are unlinked or decoupled
        return jsonify({"ResultCode": 0, "ResultDesc": "Acknowledged - No Matching Intent Trace"}), 200

    try:
        if str(result_code) == "0":
            intent.status = "DISBURSED"
            if hasattr(intent, 'processed_at'):
                intent.processed_at = datetime.utcnow()
            current_app.logger.info(f"Disbursement transaction success for Intent ID #{intent.id}")
        else:
            intent.status = "FAILED"
            current_app.logger.warning(f"Disbursement transaction failed. Reason Code: {result_code}")
            
        db.session.commit()
    except Exception as e:
        db.session.rollback()
        current_app.logger.error(f"Callback status tracking update database error: {str(e)}")
        return jsonify({"error": "internal state processing exception"}), 500

    return jsonify({"ResultCode": 0, "ResultDesc": "Success Notification Resolved"}), 200


@payment_bp.route("/api/v1/finance/b2c/timeout", methods=["POST"])
def finance_b2c_timeout_callback():
    """Fallback handler tracking dropped or timed-out server connection segments safely."""
    current_app.logger.error("[M-PESA B2C TIMEOUT] Upstream network window expired.")
    return jsonify({"ResultCode": 0, "ResultDesc": "Timeout Received"}), 200






# ==============================================================================
# SECURE ADMINISTRATIVE DISBURSEMENT QUEUE ENDPOINTS
# ==============================================================================

@payment_bp.route("/api/admin/payouts/pending", methods=["GET"])
@jwt_required()
def get_pending_payouts():
    """
    Fetches all disbursement intents with a status of 'PENDING' 
    Strictly restricted to users holding administrative claims tokens.
    """
    # 1. Enforce Role-Based Access Control (RBAC) via Custom JWT Claims
    claims = get_jwt()
    if not claims.get("is_admin", False) and claims.get("role") != "ADMIN":
        current_app.logger.warning(f"Unauthorized access attempt to pending financial ledger by User ID: {get_jwt_identity()}")
        return jsonify({"error": "Access denied. Administrative credentials required."}), 403

    from models.disbursements import AdminDisbursement
    from models.user import User

    try:
        # Join AdminDisbursement with User table to fetch collector profiles securely
        pending_records = db.session.query(
            AdminDisbursement, User
        ).join(
            User, User.id == AdminDisbursement.collector_id
        ).filter(
            AdminDisbursement.status == "PENDING"
        ).all()

        results = []
        for disbursement, user in pending_records:
            results.append({
                "id": disbursement.id,
                "collector_id": disbursement.collector_id,
                "username": user.username if hasattr(user, 'username') else f"user_{user.id}",
                "preferred_gateway": "MPESA",  
                "target_coordinate": user.phone_number if hasattr(user, 'phone_number') else "No linked contact",
                "amount": float(disbursement.amount),
                "initiated_at": disbursement.initiated_at.strftime("%Y-%m-%d %H:%M:%S") if disbursement.initiated_at else "N/A"
            })

        return jsonify(results), 200

    except Exception as e:
        current_app.logger.error(f"Error fetching pending payout ledger: {str(e)}")
        return jsonify({"error": "Failed to aggregate pending payout metrics from database."}), 500


@payment_bp.route("/api/admin/payouts/approve/<int:request_id>", methods=["POST"])
@jwt_required()
def approve_manual_payout(request_id):
    """
    Intercepts and processes a pending withdrawal row manually.
    Enforces RBAC validation, prevents tracking code reuse, and maps transaction locks.
    """
    # 1. Enforce Role-Based Access Control (RBAC) via Custom JWT Claims
    claims = get_jwt()
    if not claims.get("is_admin", False) and claims.get("role") != "ADMIN":
        current_app.logger.error(f"CRITICAL: Unauthorized manual payout verification payload fired by non-admin identity token!")
        return jsonify({"error": "Access denied. Administrative privileges required."}), 403

    from models.disbursements import AdminDisbursement

    # 2. Extract and sanitize reference tokens
    data = request.get_json(silent=True) or {}
    transaction_note = data.get("transaction_note")

    if not transaction_note or not str(transaction_note).strip():
        return jsonify({"error": "A valid transaction reference code or note is required for verification."}), 400
    
    clean_note = str(transaction_note).strip()

    try:
        # 3. Microsecond Race-Condition Defense: Enforce Row Locking with .with_for_update()
        intent = AdminDisbursement.query.with_for_update().get(request_id)
        if not intent:
            return jsonify({"error": "Target disbursement tracking row not found."}), 404

        if intent.status != "PENDING":
            return jsonify({"error": f"Invalid state transition: request is already processed or {intent.status}."}), 400

        # 4. Check for duplicate receipt use manually before DB commit crashes
        duplicate_check = AdminDisbursement.query.filter_by(transaction_note=clean_note).first()
        if duplicate_check:
            return jsonify({"error": "Security alert: This payment confirmation reference code has already been processed in the system."}), 409

        # 5. Commit state changes
        intent.status = "DISBURSED"
        intent.transaction_note = clean_note
        intent.processed_at = datetime.utcnow()

        db.session.commit()

        current_app.logger.info(f"Payout ID #{request_id} manually cleared by Admin ID {get_jwt_identity()} with reference {clean_note}")
        return jsonify({
            "status": "success",
            "message": f"Ledger Request #{request_id} successfully authenticated and marked as DISBURSED.",
            "request_id": request_id
        }), 200

    except Exception as e:
        db.session.rollback()
        current_app.logger.error(f"Manual Payout Approval System Exception: {str(e)}")
        return jsonify({"error": "Internal ledger execution error. Reference might be a duplicated key entries conflict."}), 500
