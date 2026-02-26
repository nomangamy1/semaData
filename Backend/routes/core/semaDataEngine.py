import re
import os 
import json
from datetime import datetime 
from flask import request, jsonify, Blueprint

# ML dependencies are optional; if they fail to import we fall back gracefully
try:
    import torch
except ImportError:
    torch = None
    print("[Warning] torch library not available; semantic features disabled")

try:
    import librosa
except ImportError:
    librosa = None
    print("[Warning] librosa library not available; audio validation disabled")

try:
    import numpy as np
except ImportError:
    np = None
    print("[Warning] numpy library not available; audio/processing disabled")

# later imports that depend on numpy/torch should handle None cases
from flask import request, jsonify, Blueprint

# whisper and transformers are optional
try:
    from faster_whisper import WhisperModel
except Exception as e:
    # catch FileNotFoundError, ImportError, etc. to avoid startup crash
    WhisperModel = None
    print(f"[Warning] faster_whisper import failed; transcription disabled ({e})")

import ollama 
try:
    from sentence_transformers import SentenceTransformer, util
except ImportError:
    SentenceTransformer = None
    util = None
    print("[Warning] sentence_transformers not available; semantic matching disabled")

from werkzeug.utils import secure_filename 
from models.Transcription import Transcription

# Project Internal Imports
from extensions import db
from models.dataset import Dataset
from models.domain import Domain

# Preserved import as requested
from .nlp_matcher import segment_data 

# --- Model Initialization ---

# Initializing globally to prevent memory spikes during API calls
semantic_model = None
semaData_model = None

if os.environ.get('FLASK_ENV') != 'migration':
    # only attempt to load models if the required libraries are available
    if SentenceTransformer is None or torch is None:
        print("[Warning] semantic libraries unavailable; skipping model loading")
    else:
        try:
            print("Loading Semantic Model...")
            semantic_model = SentenceTransformer('all-MiniLM-L6-v2')
        except Exception as e:
            print(f"Failed to load semantic model: {e}")
            semantic_model = None
    
    if WhisperModel is None:
        print("[Warning] whisper model not importable; transcription disabled")
    else:
        try:
            MODEL_NAME = os.environ.get('MODEL_NAME', 'small')
            device = "cpu"
            print(f"Loading Whisper Model ({MODEL_NAME})...")
            semaData_model = WhisperModel(MODEL_NAME, device=device, compute_type="int8")
        except Exception as e:
            print(f"Failed to load Whisper model: {e}")
            semaData_model = None
# --- Blueprint Setup ---
# Variable name must match routes/core/__init__.py
semaData_engine_bp = Blueprint('semaData_engine', __name__)



BASE_DIR = os.path.abspath(os.path.dirname(__file__))
SECURE_STORAGE = os.path.join(BASE_DIR, '..', '..', 'secure_storage')
#saving the audio 

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
    
def refine_with_llm(transcribed_text, segmented_text):
    """
    Takes the messy 'Not Mentioned' or 'Sentence' results and turns them 
    into clean data points using a local LLM.
    Returns: (refined_data, metadata) where metadata tracks processing status
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
                               format='json',
                               messages=[
            {'role': 'user', 'content': prompt},
        ])
        result = response['message']['content']
        return result, {'status': 'LLM_SUCCESS', 'model': 'llama3.2:1b', 'confidence': 'high'}
    except ConnectionError as e:
        print(f"Ollama service unavailable: {e}")
        return segmented_text, {'status': 'OLLAMA_OFFLINE', 'fallback': 'semantic', 'error': str(e)}
    except json.JSONDecodeError as e:
        print(f"LLM returned invalid JSON: {e}")
        return segmented_text, {'status': 'LLM_PARSE_ERROR', 'fallback': 'semantic', 'error': str(e)}
    except Exception as e:
        print(f"LLM Error: {e}")
        return segmented_text, {'status': 'LLM_ERROR', 'fallback': 'semantic', 'error': str(e)}

# --- API Routes ---

@semaData_engine_bp.route('/transcribe', methods=['POST'])
def semaData_transcribe():
    """
    Transcribe audio files with strict collector authorization.
    SECURITY: Verifies collector can only transcribe for their assigned domain.
    """
    # Retrieve form data from React Frontend
    ref_number = request.form.get('referenceNumber')
    collector_id_raw = request.form.get("user_id")
    
    try:
        domain_id = int(request.form.get("id"))
    except (TypeError, ValueError):
        return jsonify({"error": "Invalid domain Id"}), 400
    
    try:
        collector_id = int(collector_id_raw) if collector_id_raw and collector_id_raw.isdigit() else None
    except (TypeError, ValueError):
        return jsonify({"error": "Invalid collector ID"}), 400
    
    if not collector_id:
        return jsonify({"error": "Collector ID is required"}), 400

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
    
    # SECURITY: Verify reference number matches (primary check)
    if target_domain.reference_number != ref_number:
        if os.path.exists(audio_path): os.remove(audio_path)
        return jsonify({"error": 'Reference number does not match domain context'}), 400
    
    # SECURITY: Verify collector belongs to this domain (critical authorization check)
    collector = User.query.get(collector_id)
    if not collector:
        if os.path.exists(audio_path): os.remove(audio_path)
        return jsonify({"error": 'Collector not found'}), 404
    
    if collector.reference_number != ref_number:
        if os.path.exists(audio_path): os.remove(audio_path)
        return jsonify({"error": 'Collector is not authorized for this domain. Collector reference does not match domain reference.'}), 403
    
    if not target_domain.is_active:
        if os.path.exists(audio_path): os.remove(audio_path)
        return jsonify({"error": 'This domain is no longer active'}), 403
    
    # Log successful authorization for audit trail
    print(f"✓ AUTHORIZATION VERIFIED: Collector ID {collector_id} ({collector.first_name} {collector.second_name}) authorized for Domain ID {domain_id} (ref: {ref_number})")
    
    required_features = target_domain.domain_features 
    # Get domain owner for dataset association
    domain_owner_id = target_domain.owner_id
    
    
    try:
        # 3. Speech-to-Text Processing (Faster-Whisper)
        segments, info = semaData_model.transcribe(audio_path, task='transcribe')
        transcribed_text = " ".join([segment.text for segment in segments]).strip()

        final_filename = f"DOMAIN_{domain_id}__REF__{ref_number}.wav"
        final_path = os.path.join(SECURE_STORAGE,final_filename)
        os.rename(audio_path,final_path)

        print(f"Audio secured at : {final_path}")

        # 4. Semantic Processing (Segmentation)
        # Using the internal function to avoid conflict with nlp_matcher import
        target_domain = Domain.query.get(domain_id)
        
        # Segmentation 
        initial_segments = process_semantic_segmentation(transcribed_text, required_features)

        # 4b. LLM Refinement with Enhanced Error Handling
        try:
            refined_json_strings, llm_metadata = refine_with_llm(transcribed_text, initial_segments)
            segmented_text = json.loads(refined_json_strings)
            print(f"LLM refinement successful: {llm_metadata['status']}")
        except json.JSONDecodeError as e:
            print(f"Failed to parse LLM output: {e}. Using semantic segmentation fallback.")
            segmented_text = initial_segments
            llm_metadata = {'status': 'PARSE_FAILED', 'error': str(e)}
        except Exception as e:
            print(f"Unexpected LLM error: {e}. Using semantic segmentation fallback.")
            segmented_text = initial_segments
            llm_metadata = {'status': 'ERROR', 'error': str(e)}
          
       

        # 5. Database Logic (Session Aggregation)
        existing_entry = Dataset.query.filter_by(ref_number=ref_number, domain_id=domain_id).first()

        # collector_id already validated and extracted at the beginning

        dataset_record = None
        
        if existing_entry:
            # Append to existing text if this is a "AI_passed" session
            timestamp = datetime.now().strftime("%Y-%m-%d %H:%M")
            existing_entry.combined_text += f"\n\n--- Entry: {timestamp} ---\n{transcribed_text}"
            existing_entry.segmented_text = segmented_text
            existing_entry.status = "AI_Passed"
            dataset_record = existing_entry
        else:
            # Create a fresh record
            dataset_record = Dataset(
                name=f"Ingestion_{ref_number}_{datetime.now().strftime('%H%M')}", 
                description="Automated AI Transcription",
                owner_id=domain_owner_id,
                ref_number=ref_number,
                domain_id=domain_id,
                audio_file_path=final_path,
                collector_id=collector_id,
                combined_text=transcribed_text,
                segmented_text=segmented_text,
                status="AI_Passed"
            )
            db.session.add(dataset_record)
        
        # Critical Fix: Flush to get dataset_id before creating Transcription
        db.session.flush()
        
        # 5b. Create Transcription Record (Critical for CSV Export)
        transcription_record = Transcription(
            dataset_id=dataset_record.id,
            user_id=collector_id,
            contributor_name=f"Collector_{collector_id}" if collector_id else "Unknown",
            transcription_text=transcribed_text,
            domain_features=segmented_text,
        )

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
