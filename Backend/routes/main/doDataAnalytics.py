from sqlalchemy import func, desc
from datetime import datetime, timedelta
from extensions import db
from models.dataset import Dataset
from models.domainowner import DomainOwner
from flask import Blueprint, jsonify, request
from flask_jwt_extended import jwt_required, get_jwt_identity
from models import Domain
import logging

UserAnalytics_bp = Blueprint('userAnalytics', __name__)
logger = logging.getLogger(__name__)

@UserAnalytics_bp.route('/analytics/<int:domain_id>', methods=['GET'])
@jwt_required()
def get_domain_analytics(domain_id):
    try:
        current_owner_id = get_jwt_identity()
        
        # Verify domain ownership
        domain = Domain.query.get(domain_id)
        if not domain or domain.owner_id != current_owner_id:
            return jsonify({"error": "Unauthorized"}), 403
        
        # Get time period filter (default: 7 days)
        period = request.args.get('period', '7')  # 7, 30, 90 days
        days_back = int(period)
        start_date = datetime.utcnow() - timedelta(days=days_back)
        
        # 1. Daily submission trend
        daily_counts = db.session.query(
            func.date(Dataset.created_at).label('day'),
            func.count(Dataset.id).label('submissions')
        ).filter(
            Dataset.domain_id == domain_id,
            Dataset.created_at >= start_date
        ).group_by(func.date(Dataset.created_at)).all()
        
        formatted_weekly = [
            {
                "day": count.day.strftime('%a %m/%d'),
                "submissions": count.submissions
            } for count in daily_counts
        ]
        
        # 2. Progress toward target goal
        total_datasets = Dataset.query.filter_by(domain_id=domain_id).count()
        progress_percent = (total_datasets / domain.target_goal * 100) if domain.target_goal > 0 else 0
        
        # 3. Status breakdown
        status_breakdown = db.session.query(
            Dataset.status,
            func.count(Dataset.id).label('count')
        ).filter(Dataset.domain_id == domain_id).group_by(Dataset.status).all()
        
        status_data = {s.status: s.count for s in status_breakdown}
        
        # 4. Top collectors by contribution
        top_collectors = db.session.query(
            Dataset.collector_id,
            func.count(Dataset.id).label('submissions')
        ).filter(Dataset.domain_id == domain_id).group_by(
            Dataset.collector_id
        ).order_by(desc(func.count(Dataset.id))).limit(10).all()
        
        # 5. Average AI confidence
        avg_confidence = db.session.query(
            func.avg(Dataset.Ai_confidence)
        ).filter(Dataset.domain_id == domain_id).scalar() or 0
        
        return jsonify({
            "submissionTrend": formatted_weekly,
            "progress": {
                "current": total_datasets,
                "target": domain.target_goal,
                "percentage": round(progress_percent, 2)
            },
            "statusBreakdown": status_data,
            "topCollectors": [
                {"collector_id": c.collector_id, "submissions": c.submissions}
                for c in top_collectors
            ],
            "averageConfidence": round(avg_confidence, 2),
            "period": f"{days_back} days"
        }), 200
        
    except Exception as e:
        logger.error(f"Analytics error for domain {domain_id}: {str(e)}")
        return jsonify({"error": "An error occurred"}), 500