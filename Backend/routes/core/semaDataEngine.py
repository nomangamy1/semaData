import os 
import datetime 
#import whisper 
from flask import Flask ,request ,jsonify, Blueprint
from flask_ngrok import run_with_ngrok
from werkzeug.utils import secure_filename 
from extensions import db
from models.dataset import Dataset
from models.Domain import Domain

from .nlp_matcher import segment_data
#should install whisper,flask_ngrok


MODEL_NAME = os.environ.get('MODEL_NAME', 'base') 
 # Default to 'base' in development
device = "cpu"  # or "cuda" if GPU is available
#semaData_model = whisper.load_model(MODEL_NAME,device=device)

semaData_engine_bp = Blueprint('semaData_engine', __name__)

UPLOAD_FOLDER = 'temp_audio'

os.makedirs(UPLOAD_FOLDER, exist_ok=True)


@semaData_engine_bp.route('/transcribe', methods=['POST'])
def semaData_transcribe():
    if file not in request.files:
        return jsonify({'error': 'No file uploaded'}), 400
    #session aggregation pattern 
    #data collection grouped by a referenceNumber 
    ref_number = request.form.get('referenceNumber')
    domain_id = request.form.get("id")
    file = request.files['file']
    if file.filename == '':
        return jsonify({'error': 'empty filename'}), 400
    

    filename = secure_filename(file.filename)
    audio_path = os.path.join(UPLOAD_FOLDER, filename)
    file.save(audio_path)

    target_domain = Domain.query.filter_by(id=domain_id).first()
    if not target_domain:
        return jsonify({"error": 'Domain not found'}),404
    
    required_features = target_domain.domain_features 

    
    try:
        result = semaData_model.transcribe(audio_path,task='transcribe')
        text = result['text'].strip()

        segmented_text = segment_data(text, required_features)


        existing_entry = Dataset.query.filter_by(ref_number=ref_number, domain_id=domain_id).first()
        if existing_entry:
            timestamp = datetime.now().strftime("%Y-%m-%d %H:%M")
            existing_entry.combined_text += f"\n\n--- Entry: {timestamp} ---\n{text}"
            existing_entry.segmented_text = segmented_text
            existing_entry.status = "Growing"
        else:
            new_dataset = Dataset(
                ref_number=ref_number,
                domain_id=domain_id,

                combined_text=text,
                segmented_text =segmented_text,
                status="Initial"
            )
            db.session.add(new_dataset)
        db.session.commit() 

        os.remove(audio_path)


    except Exception as e:
        if os.path.exists(audio_path): 
            os.remove(audio_path)
        return jsonify({'error': str(e)}), 500
    

    