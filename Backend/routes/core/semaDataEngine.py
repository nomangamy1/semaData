import os 
import datetime 
#import whisper 
from flask import Flask ,request ,jsonify, Blueprint
from flask_ngrok import run_with_ngrok
from werkzeug.utils import secure_filename 
from extensions import db
from models.dataset import Dataset
#should install whisper,flask_ngrok


MODEL_NAME = os.environ.get('MODEL_NAME', 'base')  # Default to 'base' in development

semaData_model = whisper.load_model(MODEL_NAME,"cpu",computer_type="int8") 
#is there a way to set the model to use base in development then 
#switch to medium or large in production automatically?
semaData_app = Flask(__name__)
run_with_ngrok(semaData_app)

UPLOAD_FOLDER =  "temp_audio"
os.makedirs(UPLOAD_FOLDER, exist_ok=True)
semaData_engine_bp = Blueprint('semaData_engine', __name__)

@semaData_engine_bp.route('/transcribe', methods=['POST'])
def semaData_transcribe():
    #session aggregation pattern 
    #data collection grouped by a referenceNumber 
    ref_number = request.form.get('referenceNumber')
    domain_id = request.form.get("id")
    file = request.files['file']

    audio_path = save_temp_file(file)
    result = semaData_model.transcribe(audio_path,task='translate')
    new_text = result['text']

    existing_entry = Dataset.query.filter_by(ref_number =ref_number,domain_id=domain_id).first()
    if existing_entry:
        timestamp = datetime.now().strftime("%Y-%m-%d %H:%M")
        existing_entry.combined_text += f"\n\n--- Entry: {timestamp} ---\n{new_text}"
        existing_entry.status = "Growing"
    
    else: 
        new_dataset = Dataset(
            ref_number = ref_number,
            domain_id = domain_id,
            combined_text = new_text,
            status = "Initial"

        )
        db.session.add(new_dataset)
        db.session.commit()
        return jsonify({"message":f"Data added to reference{ref_number}"})



    
    if 'file' not in request.files:
        return jsonify({'error': 'No file part in the request'}), 400

    file = request.files['file']
    if file.filename == '':
        return jsonify({'error': 'No selected file'}), 400
    

    if file:
        filename = secure_filename(file.filename)
        file_path = os.path.join(UPLOAD_FOLDER, filename)
        file.save(file_path)

        result = semaData_model.transcribe(file_path,task="transcribe")
        os.remove(file_path)  # Remove the temporary file after transcription

        return jsonify({'text': result['text']})
    else:
        return jsonify({'error': 'File not allowed'}), 400
    