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
