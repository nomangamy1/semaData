from flask import Flask,jsonify,Blueprint
from models import User,Dataset,Domain,domainowner,Transcription,Feature
from flask import send_file, current_app
from flask_jwt_extended import jwt_required, get_jwt_identity
import csv 
import json
from io import StringIO
import logging



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

@dashboard_bp.route('/owner-stats', methods=['GET'])
@jwt_required()
def get_owner_dashboard_stats():
    # determine owner from the JWT rather than trusting a URL param
    owner_id = get_jwt_identity()
    owner_domains = Domain.query.filter_by(owner_id=owner_id).all()
    domain_ids = [d.id for d in owner_domains]

    # Aggregate stats across those domains
    total_datasets = Dataset.query.filter(Dataset.domain_id.in_(domain_ids)).count()
    
    # Logic: How many records are "Initial" vs "Processed"?
    status_distribution = {
        "initial": Dataset.query.filter(Dataset.domain_id.in_(domain_ids), Dataset.status == "Initial").count(),
        "processed": Dataset.query.filter(Dataset.domain_id.in_(domain_ids), Dataset.status == "Processed").count()
    }

    return jsonify({
        'total_domains': len(owner_domains),
        'total_submissions': total_datasets,
        'status_breakdown': status_distribution,
        # return a list of tokens in case there are multiple domains
        'active_tokens': [d.reference_number for d in owner_domains]
    })


@dashboard_bp.route('')
def get_DomainProfileName():
    return jsonify({"domain_profile_name": "Example Domain Profile Name"})


logger = logging.getLogger(__name__)

@dashboard_bp.route('/download/<int:domain_id>', methods=['GET'])
@jwt_required()
def download_dataset(domain_id):
    try: 
        current_owner_id = get_jwt_identity() 
        domain = Domain.query.get(domain_id)
        if not domain:
            logger.warning(f"Download attempt: domain {domain_id} not found")
            return jsonify({"error": "Domain not found"}), 404
        if domain.owner_id != current_owner_id:
            logger.warning(f"Unauthorized download attempt: owner {current_owner_id} trying to access domain {domain_id}")
            return jsonify({"error": "Unauthorized"}), 403
        
        # Get all processed datasets for this domain owned by current user
        datasets = Dataset.query.filter_by(domain_id=domain_id, owner_id=current_owner_id, status="Processed").all()
        if not datasets:
            logger.info(f"Owner {current_owner_id} attempted download for domain {domain_id} but no processed datasets available")
            return jsonify({"error": "No processed datasets available for download"}), 400
        
        # Get domain features specification (column names)
        domain_features = Feature.query.filter_by(domain_id=domain_id).all()
        feature_names = [f.name for f in domain_features]
        
        if not feature_names:
            logger.warning(f"Domain {domain_id} has no features defined")
            return jsonify({"error": "Domain has no features defined"}), 400
        
        # Create CSV in memory - features only
        output = StringIO()
        writer = csv.writer(output)
        writer.writerow(feature_names)  # Header with feature names only

        total_records = 0
        for dataset in datasets:
            # Get all transcriptions for this dataset
            transcriptions = Transcription.query.filter_by(dataset_id=dataset.id).all()
            
            for transcription in transcriptions:
                # Extract only feature values
                if transcription.domain_features:
                    domain_features_dict = transcription.domain_features if isinstance(transcription.domain_features, dict) else json.loads(transcription.domain_features)
                    feature_values = [domain_features_dict.get(fname, '') for fname in feature_names]
                    writer.writerow(feature_values)
                    total_records += 1
        
        if total_records == 0:
            logger.info(f"Owner {current_owner_id} attempted download for domain {domain_id} but no transcriptions with features found")
            return jsonify({"error": "No transcription data with features available"}), 400
        
        logger.info(f"Owner {current_owner_id} successfully downloaded features dataset for domain {domain_id} with {total_records} records")

        output.seek(0)
        return send_file(StringIO(output.getvalue()), mimetype='text/csv', as_attachment=True, download_name=f'domain_{domain_id}_features.csv')    
    except Exception as e:
        logger.error(f"Error during dataset download for domain {domain_id}: {str(e)}")
        return jsonify({"error": "An error occurred while processing your request"}), 500