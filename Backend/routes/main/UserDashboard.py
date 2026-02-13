from flask import Blueprint,jsonify 
from models import Domain,User,Dataset
from extensions import db 



UserDashboard_bp = Blueprint('User_Dashboard',__name__)

@UserDashboard_bp.route('/UserDashboard',methods=['POST'])
def UserDashboard():
    return jsonify({"message":"This is the user dashboard endpoint"})




    #should display some components for the frontend 
    '''
    Docstring for UserDashboard
    including the task assigned ,what percentage covered and remaining part 










    '''
@UserDashboard_bp.route('/collector-stats/<int:user_id>',methods=['GET'])
def get_collector_stats(user_id):
    #should return the particular datacollectors progress 
    #number of submission vs the remaining 
    user = User.query.get_or_404(user_id)

    assigned_domain = Domain.query.filter_by(reference_number =user.reference_number).first()

    if not assigned_domain:
        return jsonify({"error":"No domain assigned!!"}),404
    
    buffered_target_goal = assigned_domain.target_goal

    total_team_collected = Dataset.query.filter_by(domain_id=assigned_domain.id).count()
    remaining_goal = max(buffered_target_goal - total_team_collected, 0)  # Ensure it doesn't go negative
    agent_count = Dataset.query.filter_by(domain_id=assigned_domain.id).distinct(Dataset.collector_id).count()
    
    collector_currentDone = Dataset.query.filter_by(domain_id=assigned_domain.id, collector_id=user.id).count()
    collectorShareRemaining = remaining_goal // max(agent_count,1)
    calculated_goal =collector_currentDone + collectorShareRemaining # Avoid division by zero
    


    individual_valid_contribution = Dataset.query.filter(
        Dataset.domain_id == assigned_domain.id,
        Dataset.collector_id == user.id,
        Dataset.status.in_(['AI_Passed', 'Verified'])
    ).count()

    return jsonify({
        "sessionData":{
            "name": f"{user.first_name} {user.second_name}",
            "refNum": user.reference_number,
            "domain": assigned_domain.domain_name
        },
        "activeTask": {
            "title": assigned_domain.domain_name,
            "targetCount": calculated_goal, 
            "currentCount": individual_valid_contribution,
            "description": f"You are one of {agent_count} agents assigned to this domain."
        }

    })