from flask import Flask,jsonify,Blueprint
from models import User,Dataset,Domain,domainowner


dashboard_bp = Blueprint('dashboard',__name__)

@dashboard_bp.route('/stats',methods=['GET'])
def get_dashboard_stats():
    user_count = User.query.count()
    dataset_count = Dataset.query.count()
    domain_count = Domain.query.count()
    owner_count = domainowner.query.count()

    stats = {
        'user_count': user_count,
        'dataset_count': dataset_count,
        'domain_count': domain_count,
        'owner_count': owner_count
    }
    return jsonify(stats)

@dashboard_bp.route('/owner-stats/<int:owner_id>', methods=['GET'])
def get_owner_dashboard_stats(owner_id):
    # Only get domains belonging to THIS owner
    owner_domains = Domain.query.filter_by(owner_id=owner_id).all()
    domain_ids = [d.id for d in owner_domains]

    # Aggregate stats across those domains
    total_datasets = Dataset.query.filter(Dataset.domain_id.in_(domain_ids)).count()
    
    # Logic: How many records are "Initial" vs "Growing" vs "Processed"?
    status_distribution = {
        "initial": Dataset.query.filter(Dataset.domain_id.in_(domain_ids), Dataset.status == "Initial").count(),
        "processed": Dataset.query.filter(Dataset.domain_id.in_(domain_ids), Dataset.status == "Processed").count()
    }

    return jsonify({
        'total_domains': len(owner_domains),
        'total_submissions': total_datasets,
        'status_breakdown': status_distribution,
        'active_token': owner_domains[0].reference_number if owner_domains else "None"
    })
