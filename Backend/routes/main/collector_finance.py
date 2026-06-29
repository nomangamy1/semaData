from flask import Blueprint, jsonify, request
from flask_jwt_extended import jwt_required, get_jwt_identity
from models.user import User
from models.dataset import Dataset
from models.domain import Domain
from models.JobApplication import JobApplication
from models.Job import Job
from extensions import db
from datetime import datetime
import secrets
import string

collector_finance_bp = Blueprint("collector_finance", __name__)

# ─── Payment formula ───────────────────────────────────────────────────────────
# Earnings = Verified Submissions × Domain Rate × Quality Multiplier
# Platform takes 20% of domain rate, collector gets 80%
# Quality multiplier:
#   ≥ 95% approval  → 1.2x
#   85–94% approval → 1.0x
#   70–84% approval → 0.85x
#   < 70% approval  → 0.7x
# Minimum payout: KES 100

PLATFORM_CUT   = 0.20
MIN_PAYOUT_KES = 100.0
DEFAULT_RATE   = 20.0   # KES per submission if domain hasn't set one


def _get_quality_multiplier(approved, total):
    if total == 0:
        return 1.0
    rate = approved / total
    if rate >= 0.95:
        return 1.2
    elif rate >= 0.85:
        return 1.0
    elif rate >= 0.70:
        return 0.85
    else:
        return 0.7


def _calc_earnings(collector_id, domain_id=None):
    """Calculate gross earnings, penalty, and net balance for a collector."""
    query = Dataset.query.filter_by(collector_id=collector_id)
    if domain_id:
        query = query.filter_by(domain_id=domain_id)

    all_submissions = query.all()
    total    = len(all_submissions)
    approved = sum(1 for d in all_submissions if d.status in ('Verified', 'AI_Passed'))
    rejected = sum(1 for d in all_submissions if d.status == 'rejected')

    multiplier = _get_quality_multiplier(approved, total)

    # Get domain rate
    domain = Domain.query.get(all_submissions[0].domain_id) if all_submissions else None
    domain_rate     = float(getattr(domain, 'rate_per_submission', DEFAULT_RATE) or DEFAULT_RATE)
    collector_rate  = domain_rate * (1 - PLATFORM_CUT)

    base_earnings    = approved * collector_rate
    quality_bonus    = base_earnings * (multiplier - 1.0)  # positive or negative
    gross_earnings   = base_earnings + quality_bonus

    # Penalty: rejected submissions cost a small fraction
    penalty          = rejected * (collector_rate * 0.1)
    net_earnings     = max(gross_earnings - penalty, 0)

    # Total earned from collector_earnings table
    total_earned_db = db.session.execute(
        db.text("SELECT COALESCE(SUM(amount), 0) FROM collector_earnings WHERE collector_id = :uid AND status = 'earned'"),
        {"uid": collector_id}
    ).scalar() or 0

    # Total withdrawn — read from AdminDisbursement (the actual withdrawal model)
    from models.payments import AdminDisbursement
    total_withdrawn = db.session.query(
        db.func.coalesce(db.func.sum(AdminDisbursement.amount), 0.0)
    ).filter(
        AdminDisbursement.collector_id == collector_id,
        AdminDisbursement.status == "DISBURSED"
    ).scalar() or 0.0

    total_withdrawn = float(total_withdrawn)

    current_balance = max(net_earnings - float(total_withdrawn), 0)
    rejection_rate  = round((rejected / total * 100), 2) if total else 0

    return {
        "total_submissions": total,
        "total_approved":    approved,
        "total_rejected":    rejected,
        "rejection_rate":    rejection_rate,
        "quality_multiplier": multiplier,
        "base_earnings":     round(base_earnings, 2),
        "quality_bonus":     round(quality_bonus, 2),
        "penalty_deduction": round(penalty, 2),
        "gross_earnings":    round(gross_earnings, 2),
        "net_earnings":      round(net_earnings, 2),
        "total_withdrawn":   round(float(total_withdrawn), 2),
        "current_balance":   round(current_balance, 2),
        "minimum_payout_threshold": MIN_PAYOUT_KES,
    }


def _get_collector_domain(user):
    application = JobApplication.query.filter_by(
        reference_number_assigned=user.reference_number,
        status='approved'
    ).first()
    if not application:
        return None, None
    job    = Job.query.get(application.job_id)
    domain = Domain.query.get(job.domain_id) if job else None
    return application, domain


# ─── GET /api/collector/finance-summary ───────────────────────────────────────
@collector_finance_bp.route('/finance-summary', methods=['GET'])
@jwt_required()
def get_finance_summary():
    current_user_id = get_jwt_identity()
    user = User.query.get(int(current_user_id))
    if not user or user.user_type != 'User':
        return jsonify({"error": "Collector not found"}), 404

    application, domain = _get_collector_domain(user)
    earnings = _calc_earnings(user.id)

    return jsonify({
        "profile": {
            "full_name":         f"{user.first_name} {user.second_name or ''}".strip(),
            "email":             user.email,
            "username":          user.reference_number,
            "preferred_gateway": getattr(user, 'preferred_gateway', 'MPESA'),
            "mpesa_number":      getattr(user, 'mpesa_number', ''),
            "paypal_email":      getattr(user, 'paypal_email', ''),
        },
        "domain": {
            "name":     domain.domain_name if domain else "Unassigned",
            "id":       domain.id if domain else None,
            "is_active": domain.is_active if domain else False,
        },
        **earnings
    }), 200


# ─── POST /api/collector/update-gateway ───────────────────────────────────────
@collector_finance_bp.route('/update-gateway', methods=['POST'])
@jwt_required()
def update_gateway():
    current_user_id = get_jwt_identity()
    user = User.query.get(int(current_user_id))
    if not user or user.user_type != 'User':
        return jsonify({"error": "Collector not found"}), 404

    data    = request.get_json()
    gateway = data.get('preferred_gateway', 'MPESA').upper()

    # Validate
    if gateway == 'MPESA':
        phone = data.get('mpesa_number', '').strip()
        if not phone.startswith('254') or len(phone) != 12:
            return jsonify({"error": "M-Pesa number must start with 254 and be 12 digits"}), 400
        if hasattr(user, 'mpesa_number'):
            user.mpesa_number = phone
    elif gateway == 'PAYPAL':
        email = data.get('paypal_email', '').strip()
        if '@' not in email:
            return jsonify({"error": "Invalid PayPal email"}), 400
        if hasattr(user, 'paypal_email'):
            user.paypal_email = email
    else:
        return jsonify({"error": "Unsupported gateway. Use MPESA or PAYPAL"}), 400

    if hasattr(user, 'preferred_gateway'):
        user.preferred_gateway = gateway

    db.session.commit()
    return jsonify({"message": "Payment gateway updated successfully"}), 200


# ─── POST /api/collector/request-withdrawal ───────────────────────────────────
@collector_finance_bp.route('/request-withdrawal', methods=['POST'])
@jwt_required()
def request_withdrawal():
    current_user_id = get_jwt_identity()
    user = User.query.get(int(current_user_id))
    if not user or user.user_type != 'User':
        return jsonify({"error": "Collector not found"}), 404

    data   = request.get_json()
    amount = float(data.get('amount', 0))

    if amount < MIN_PAYOUT_KES:
        return jsonify({"error": f"Minimum withdrawal is KES {MIN_PAYOUT_KES}"}), 400

    # Verify available balance
    earnings = _calc_earnings(user.id)
    if amount > earnings['current_balance']:
        return jsonify({"error": "Amount exceeds available balance"}), 400

    # Generate withdrawal reference
    ref = 'WD-' + ''.join(secrets.choice(string.ascii_uppercase + string.digits) for _ in range(8))

    db.session.execute(
        db.text("""
            INSERT INTO withdrawal_requests 
                (collector_id, amount, gateway, phone_number, paypal_email, status, reference, requested_at)
            VALUES 
                (:uid, :amount, :gateway, :phone, :paypal, 'pending', :ref, NOW())
        """),
        {
            "uid":    user.id,
            "amount": amount,
            "gateway": getattr(user, 'preferred_gateway', 'MPESA'),
            "phone":   getattr(user, 'mpesa_number', ''),
            "paypal":  getattr(user, 'paypal_email', ''),
            "ref":     ref
        }
    )
    db.session.commit()

    return jsonify({
        "message":      "Withdrawal request submitted. Admin will process within 24 hours.",
        "reference_id": ref,
        "amount":       amount,
        "status":       "pending"
    }), 201


# ─── GET /api/main/request-withdrawal (alias for WalletTab) ───────────────────
@collector_finance_bp.route('/withdrawal', methods=['POST'])
@jwt_required()
def request_withdrawal_alias():
    return request_withdrawal()
