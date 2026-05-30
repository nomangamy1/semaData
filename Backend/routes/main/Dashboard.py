"""
ARCHITECTURE ANALYSIS: semaData DomainOwner Dashboard Data Flow
========================================================

ISSUE: Dashboard is NOT updating in real-time with collector push segments

CURRENT FLOW (Broken):
Collector Records Audio → Uploads → Backend Transcribes → Database Updated
BUT DomainOwner Dashboard Does NOT Reflect Changes (Stale Data)

ROOT CAUSES IDENTIFIED:
1. ❌ NO WebSocket/Server-Sent Events (SSE) for real-time updates
2. ❌ Dashboard uses static fetch() on mount - NO polling
3. ❌ No event listener for collector submissions
4. ❌ Frontend caches data without refresh mechanism
5. ❌ No bidirectional communication between collector & owner
"""

# =========== BACKEND: Enhanced Dashboard Route with Real-Time Support ===========

from flask import Flask, jsonify, Blueprint
from models import User, Dataset, Domain, DomainOwner, Transcription, Feature
from flask_jwt_extended import jwt_required, get_jwt_identity
from flask_socketio import SocketIO, emit, join_room
import json
import logging
from datetime import datetime

dashboard_bp = Blueprint('dashboard', __name__)
socketio = SocketIO()  # ← Add this to your app initialization

logger = logging.getLogger(__name__)

@dashboard_bp.route('/owner-stats', methods=['GET'])
@jwt_required()
def get_owner_dashboard_stats():
    """
    Get DomainOwner dashboard statistics with real-time dataset count
    """
    owner_id = get_jwt_identity()
    owner_domains = Domain.query.filter_by(owner_id=owner_id).all()
    domain_ids = [d.id for d in owner_domains]

    total_datasets = Dataset.query.filter(Dataset.domain_id.in_(domain_ids)).count()
    
    status_distribution = {
        "initial": Dataset.query.filter(
            Dataset.domain_id.in_(domain_ids), 
            Dataset.status == "Initial"
        ).count(),
        "processed": Dataset.query.filter(
            Dataset.domain_id.in_(domain_ids), 
            Dataset.status == "Processed"
        ).count(),
        "verified": Dataset.query.filter(
            Dataset.domain_id.in_(domain_ids), 
            Dataset.status == "Verified"
        ).count(),
    }

    return jsonify({
        'total_domains': len(owner_domains),
        'total_submissions': total_datasets,
        'status_breakdown': status_distribution,
        'active_tokens': [d.reference_number for d in owner_domains],
        'last_updated': datetime.now().isoformat()
    })


@dashboard_bp.route('/my-domains', methods=['GET'])
@jwt_required()
def get_my_domains():
    """
    Get all domains owned by current DomainOwner with live dataset counts
    """
    try:
        owner_id = get_jwt_identity()
        owner_domains = Domain.query.filter_by(owner_id=owner_id).all()
        
        if not owner_domains:
            return jsonify([]), 200
        
        domains_data = []
        for domain in owner_domains:
            features = Feature.query.filter_by(domain_id=domain.id).all()
            feature_list = [
                {"name": f.name, "type": getattr(f, 'field_type', 'text')}
                for f in features
            ]
            
            # Get LIVE datasets from database (not cached)
            datasets = Dataset.query.filter_by(domain_id=domain.id).all()
            datasets_list = [
                {
                    "id": d.id,
                    "ref_number": d.reference_number,
                    "status": d.status,
                    "segmented_text": d.segmented_text,
                    "collector_id": d.collector_id,
                    "created_at": d.created_at.isoformat() if hasattr(d, 'created_at') else None,
                }
                for d in datasets
            ]
            
            submission_count = len(datasets)
            collector_ids = set(d.collector_id for d in datasets if d.collector_id)
            collector_count = len(collector_ids)
            
            domains_data.append({
                "id": domain.id,
                "domain_name": domain.domain_name,
                "domain_field": domain.domain_field or "General Research",
                "reference_number": domain.reference_number,
                "payment_status": domain.payment_status,
                "is_active": domain.is_active,
                "target_goal": domain.target_goal,
                "requirements": domain.requirements,
                "submission_count": submission_count,
                "collector_count": collector_count,
                "features": feature_list,
                "datasets": datasets_list,
                "last_updated": datetime.now().isoformat()
            })
        
        return jsonify(domains_data), 200
    except Exception as e:
        logger.error(f"Error fetching domains for owner {owner_id}: {str(e)}")
        return jsonify({"error": "Failed to fetch domains"}), 500


# =========== WEBSOCKET: Real-Time Dataset Updates ===========

@socketio.on('connect')
def handle_connect():
    """
    Client connects to WebSocket for real-time updates
    """
    logger.info(f"Client connected: {request.sid}")
    emit('connection_response', {'data': 'Connected to real-time data stream'})


@socketio.on('join_domain')
def on_join_domain(data):
    """
    DomainOwner joins a domain room to listen for collector submissions
    
    Payload: {'domain_id': 123, 'owner_id': 456}
    """
    domain_id = data.get('domain_id')
    owner_id = get_jwt_identity()  # Get from JWT token
    
    # Verify ownership
    domain = Domain.query.get(domain_id)
    if not domain or domain.owner_id != owner_id:
        emit('error', {'message': 'Unauthorized access to this domain'})
        return
    
    room_name = f"domain_{domain_id}"
    join_room(room_name)
    logger.info(f"Owner {owner_id} joined domain room: {room_name}")
    emit('joined_domain', {'domain_id': domain_id, 'message': 'You are now receiving live updates'})


def notify_domain_owner_of_new_submission(domain_id, dataset_id, collector_id, status='Initial'):
    """
    Called from transcription/dataset creation route to notify DomainOwner in real-time
    
    Usage:
        notify_domain_owner_of_new_submission(
            domain_id=domain.id,
            dataset_id=dataset.id,
            collector_id=collector.id,
            status='Processed'
        )
    """
    room_name = f"domain_{domain_id}"
    
    dataset = Dataset.query.get(dataset_id)
    domain = Domain.query.get(domain_id)
    
    payload = {
        'event_type': 'new_submission',
        'domain_id': domain_id,
        'dataset_id': dataset_id,
        'collector_id': collector_id,
        'reference_number': dataset.reference_number if dataset else None,
        'status': status,
        'segmented_text': dataset.segmented_text if dataset else None,
        'timestamp': datetime.now().isoformat()
    }
    
    socketio.emit('dataset_update', payload, room=room_name)
    logger.info(f"Notified domain {domain_id} owners of new submission from collector {collector_id}")


def notify_domain_owner_of_status_change(domain_id, dataset_id, new_status):
    """
    Called when dataset status changes (e.g., Initial → Processed → Verified)
    """
    room_name = f"domain_{domain_id}"
    dataset = Dataset.query.get(dataset_id)
    
    payload = {
        'event_type': 'status_changed',
        'domain_id': domain_id,
        'dataset_id': dataset_id,
        'new_status': new_status,
        'timestamp': datetime.now().isoformat()
    }
    
    socketio.emit('dataset_status_update', payload, room=room_name)
    logger.info(f"Notified domain {domain_id} owners that dataset {dataset_id} status changed to {new_status}")
