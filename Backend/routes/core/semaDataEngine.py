import re
import os 
#import torch 
import json
import librosa
import numpy as np
from datetime import datetime 
from flask import request, jsonify, Blueprint
from faster_whisper import WhisperModel
import ollama 
from sentence_transformers import SentenceTransformer, util
from werkzeug.utils import secure_filename 

# Project Internal Imports
from extensions import db
from models.dataset import Dataset
from models.domain import Domain

# Preserved import as requested
from .nlp_matcher import segment_data 

# --- Model Initialization ---

# Initializing globally to prevent memory spikes during API calls
if os.environ.get('FLASK_ENV') != 'migration':

    print("Loading Semantic Model...")
    semantic_model = SentenceTransformer('all-MiniLM-L6-v2')
    MODEL_NAME = os.environ.get('MODEL_NAME', 'small') 
    device = "cpu" 
    print(f"Loading Whisper Model ({MODEL_NAME})...")
    semaData_model = WhisperModel(MODEL_NAME, device=device, compute_type="int8")
else: 
    semantic_model = None 
    semantic_model = None 
# --- Blueprint Setup ---
# Variable name must match routes/core/__init__.py
semaData_engine_bp = Blueprint('semaData_engine', __name__)


#saving the audio 
SECURE_STORAGE = " /var/www/semadata/protected_audio"
os.makedirs(SECURE_STORAGE,exist_ok =True)
UPLOAD_FOLDER = 'temp_audio'
os.makedirs(UPLOAD_FOLDER,exist_ok =True)





def process_semantic_segmentation(text, features):
    """_features_with_llm()
    Conceptual Segmentation: Matches transcribed sentences to domain features
    using Cosine Similarity (Semantic Math).
    """
    swahili_hints = {
        "age": "age miaka years niko na miaka",
        "gender": "gender jinsia mimi ni mwanamume mwanamke male female",
        "location": "location mahali ninaishi mtaa kaunti county",
        "name": "name jina naitwa naitwa jina langu"

    }
    segmented_results = {}
    # Split text into sentences for granular concept matching
    sentences = [s.strip() for s in text.replace('.', '. ').split('.') if len(s.strip()) > 2]
    
    if not sentences:
        return {f.name: "Not Mentioned" for f in features}

    enhanced_feature_names = [swahili_hints.get(f.name.lower(),f.name) for f in features]
    
    # Create Concept Vectors (Embeddings)
    sentence_embeddings = semantic_model.encode(sentences, convert_to_tensor=True)
    feature_embeddings = semantic_model.encode(enhanced_feature_names, convert_to_tensor=True)

    # Calculate 'Distance' between every sentence and every category
    cosine_scores = util.cos_sim(feature_embeddings, sentence_embeddings)

    for i, feature_name in enumerate(features):
        # Find the sentence that is most 'conceptually' similar to the feature name
        best_match_idx = torch.argmax(cosine_scores[i]).item()
        confidence_score = cosine_scores[i][best_match_idx].item()

        if confidence_score > 0.30:
            segmented_results[feature_name] = sentences[best_match_idx]
        else:
            segmented_results[feature_name] = "Not Mentioned"
        # Add this inside the loop for features named 'age'

        if segmented_results[feature_name.name] == "Not Mentioned" and feature_name.name.lower() == "age":
            digit_match = re.search(r'(\d+)', text)
            if digit_match:
                segmented_results[feature_name.name] = f"Extracted: {digit_match.group(1)}"

    return segmented_results

def is_audible_valid(file_path):
    """Quality Gate: Uses Librosa to reject silent or too-short recordings."""
    try:
        y, sr = librosa.load(file_path, sr=None)
        duration = librosa.get_duration(y=y, sr=sr)
        if duration < 1.5: 
            return False, "Audio too short (Min 1.5s)."
        
        # Calculate Root Mean Square energy to detect silence
        rms = librosa.feature.rms(y=y)
        if np.mean(rms) < 0.005:
            return False, "No detectable speech (Silence)."
        
        return True, "Valid"
    except Exception as e:
        return False, str(e)

# --- API Routes ---

@semaData_engine_bp.route('/transcribe', methods=['POST'])
def semaData_transcribe():
   
    # Retrieve form data from React Frontend
    ref_number = request.form.get('referenceNumber')
    
    try:
        domain_id = int(request.form.get("id"))
    except (TypeError, ValueError):
        return jsonify({"error": "Invalid domain Id"}), 400

    if 'file' not in request.files:
        return jsonify({'error': 'No file uploaded'}), 400
    
    file = request.files['file']
    if file.filename == '':
        return jsonify({'error': 'Empty filename'}), 400
    
    # File handling
    temp_filename = secure_filename(file.filename)
    audio_path = os.path.join(UPLOAD_FOLDER,temp_filename)
    file.save(audio_path)
   

    # 1. Quality Gate Check
    valid, message = is_audible_valid(audio_path)
    if not valid: 
        if os.path.exists(audio_path): os.remove(audio_path)
        return jsonify({'error': 'Quality gate failed.', 'message': message}), 400

    # 2. Domain & Feature Context Lookup
    target_domain = Domain.query.get(domain_id)
    if not target_domain:
        if os.path.exists(audio_path): os.remove(audio_path)
        return jsonify({"error": 'Domain context not found in database'}), 404
    
    required_features = target_domain.domain_features 
    if target_domain.reference_number != ref_number:
        if os.path.exists(audio_path): os.remove(audio_path)
        return jsonify({"error": 'Reference number does not match domain context'}), 400
    

    initial_segments = process_semantic_segmentation(transcribed_text,required_features)
    refined_json_strings = refine_with_llm(transcribed_text,initial_segments)
    try:
        segmented_text = json.loads(refined_json_strings)
    except:
        segmented_text = initial_segments
    
    secure_filename = f"DOMAIN_{domain_id}__REF__{ref_number}.wav"
    final_path = os.path.join(SECURE_STORAGE,secure_filename)
    os.rename(audio_path,final_path)

    print(f"Audio secured at : {final_path}")

    try:
        # 3. Speech-to-Text Processing (Faster-Whisper)
        segments, info = semaData_model.transcribe(audio_path, task='transcribe')
        transcribed_text = " ".join([segment.text for segment in segments]).strip()

        # 4. Semantic Processing (Segmentation)
        # Using the internal function to avoid conflict with nlp_matcher import
        segmented_text = process_semantic_segmentation(transcribed_text, required_features)

        # 5. Database Logic (Session Aggregation)
        existing_entry = Dataset.query.filter_by(ref_number=ref_number, domain_id=domain_id).first()

        collector_id_raw = request.form.get("user_id")
        collector_id = int(collector_id_raw) if collector_id_raw and collector_id_raw.isdigit() else None   

    
        if existing_entry:
            # Append to existing text if this is a "AI_passed" session
            timestamp = datetime.now().strftime("%Y-%m-%d %H:%M")
            existing_entry.combined_text += f"\n\n--- Entry: {timestamp} ---\n{transcribed_text}"
            existing_entry.segmented_text = segmented_text
            existing_entry.status = "AI_Passed"
        else:
            # Create a fresh record
            new_dataset = Dataset(
                name=f"Ingestion_{ref_number}_{datetime.now().strftime('%H%M')}", 
                
                # 2. Add a Description (Even if empty, it's better than None)
                description="Automated AI Transcription",
                ref_number=ref_number,
                domain_id=domain_id,
                audio_file_path =final_path,
                collector_id=collector_id,
                combined_text=transcribed_text,
                segmented_text=segmented_text,
                
                status="AI_Passed"

            )
            db.session.add(new_dataset)
        
        db.session.commit() 
        print(f"Data stored for Ref: {ref_number}, Domain ID: {domain_id}, Collector ID: {collector_id}")


        # Cleanup audio file to free up drive space (solves [Errno 28])
        
        return jsonify({
            "Status": "Success",
            "transcription": transcribed_text,
            "segments": segmented_text
        })

    except Exception as e:
        if os.path.exists(audio_path): 
            os.remove(audio_path)
        
        return jsonify({'error': str(e)}), 500

def refine_with_llm(transcribed_text, segmented_text):
    """
    Takes the messy 'Not Mentioned' or 'Sentence' results and turns them 
    into clean data points using a local LLM.
    """
    prompt = f"""
    You are a data extraction bot. Based on this Kenyan transcript: "{transcribed_text}"
    And these potential matches: {segmented_text}
    
    Return a valid JSON object extracting:
    - name (Full name or 'N/A')
    - age (Digits only or 'N/A')
    - crop (Type of crop or 'N/A')
    - 
    
    Example Output: {{"name": "John Doe", "age": 34, "crop": "Maize"}}
    Return ONLY JSON.
    """
    
    try:
        response = ollama.chat(model='llama3.2:1b',
                               format = 'json',
                                messages=[
            {'role': 'user', 'content': prompt},
        ])
        # Clean the string to ensure it's just JSON
        return response['message']['content']
    except Exception as e:
        print(f"LLM Offline Error: {e}")
        
        return segmented_text # Fallback to your existing logic