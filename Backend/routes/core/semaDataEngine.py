import os 
import datetime 
from faster_whisper import WhisperModel
import faster_whisper
import librosa
import numpy as np
from flask import Flask ,request ,jsonify, Blueprint
from flask_ngrok import run_with_ngrok
from werkzeug.utils import secure_filename 
from extensions import db
from models.dataset import Dataset
from models.domain import Domain

from .nlp_matcher import segment_data
#should install whisper,flask_ngrok



def is_audible_valid(file_path):
    try:
        y , sr =librosa.load(file_path,sr=None)
        duration =librosa.get_duration(y=y,sr=sr)
        if duration < 1.5: 
            return False, "Audio too short. Minimum duration is 1.5 seconds."
        
        #silence and energy check
        rms = librosa.feature.rms(y=y)
        if np.mean(rms) < 0.005:
            return False, "No detectable Speech (Silence)."
        
        return True , "Valid"
    
    except Exception as e :
        return False, str(e)
    
    

MODEL_NAME = os.environ.get('MODEL_NAME', 'base') 
model_size = 'small'
 # Default to 'base' in development
device = "cpu"  # or "cuda" if GPU is available
#semaData_model = whisper.load_model(MODEL_NAME,device=device)
semaData_model = WhisperModel(MODEL_NAME, device=device, compute_type="int8")


semaData_engine_bp = Blueprint('semaData_engine', __name__)

UPLOAD_FOLDER = 'temp_audio'
os.makedirs(UPLOAD_FOLDER, exist_ok=True)

@semaData_engine_bp.route('/transcribe', methods=['POST'])
def semaData_transcribe():
    
    ref_number = request.form.get('referenceNumber')
    domain_id = request.form.get("id")
    if 'file' not in request.files:
        return jsonify({'error': 'No file uploaded'}), 400
    #session aggregation pattern 

    #data collection grouped by a referenceNumber 
    file = request.files['file']
    if file.filename == '':
        return jsonify({'error': 'empty filename'}), 400
    
    #Dealing with file saving
    filename = secure_filename(file.filename)
    audio_path = os.path.join(UPLOAD_FOLDER, filename)
    file.save(audio_path)
    #semaData librosa gatekeeper
    valid,message = is_audible_valid(audio_path)
    if not valid: 
        os.remove(audio_path)
        return jsonify({'error': 'Quality  gate failed.','message':message})

    target_domain = Domain.query.filter_by(id=domain_id).first()
    if not target_domain:
        return jsonify({"error": 'Domain not found'}),404
    
    required_features = target_domain.domain_features 

    
    try:
        segments,info = semaData_model.transcribe(audio_path,task='transcribe')
        transcribed_text = " ".join([segment.text for segment in segments ]).strip()



        target_domain =Domain.query.get(domain_id)
        required_features = target_domain.domain_features if target_domain else []
        segmented_text = segment_data(transcribed_text,required_features)


        existing_entry = Dataset.query.filter_by(ref_number=ref_number, domain_id=domain_id).first()
    
        if existing_entry:
            timestamp = datetime.now().strftime("%Y-%m-%d %H:%M")
            existing_entry.combined_text += f"\n\n--- Entry: {timestamp} ---\n{transcribed_text}"
            existing_entry.segmented_text = segmented_text
            existing_entry.status = "Growing"
        else:
            new_dataset =Dataset(
                ref_number=ref_number,
                domain_id=domain_id,
                combined_text= transcribed_text,
                segmented_text =segmented_text,
                status="Processed")
            
            db.session.add(new_dataset)
        
        db.session.commit() 


        os.remove(audio_path)
        return jsonify({
            "Status":"Success",
            "transcription":transcribed_text,
            "segments":segmented_text
        })


    except Exception as e:
        if os.path.exists(audio_path): 
            os.remove(audio_path)
        return jsonify({'error': str(e)}), 500
    

    