import re
import os
import json
from datetime import datetime
from flask import request, jsonify, Blueprint

try:
    import torch
except ImportError:
    torch = None
    print("[Warning] torch not available; semantic features disabled")

try:
    import librosa
except ImportError:
    librosa = None
    print("[Warning] librosa not available; audio validation disabled")

try:
    import numpy as np
except ImportError:
    np = None
    print("[Warning] numpy not available; processing disabled")

try:
    from faster_whisper import WhisperModel
except Exception as e:
    WhisperModel = None
    print(f"[Warning] faster_whisper import failed ({e})")

import ollama

try:
    from sentence_transformers import SentenceTransformer, util
except ImportError:
    SentenceTransformer = None
    util = None
    print("[Warning] sentence_transformers not available")

from werkzeug.utils import secure_filename
from flask_jwt_extended import jwt_required, get_jwt_identity  # ✅ ADD

from models.Transcription import Transcription
from models.user import User
from extensions import db
from models.dataset import Dataset
from models.domain import Domain
from .nlp_matcher import segment_data

# --- Model Initialization ---
semantic_model = None
semaData_model = None

if os.environ.get('FLASK_ENV') != 'migration':
    if SentenceTransformer and torch:
        try:
            print("Loading Semantic Model...")
            semantic_model = SentenceTransformer('all-MiniLM-L6-v2')
        except Exception as e:
            print(f"Failed to load semantic model: {e}")

    if WhisperModel:
        try:
            MODEL_NAME = os.environ.get('MODEL_NAME', 'small')
            print(f"Loading Whisper Model ({MODEL_NAME})...")
            semaData_model = WhisperModel(MODEL_NAME, device="cpu", compute_type="int8")
        except Exception as e:
            print(f"Failed to load Whisper model: {e}")

semaData_engine_bp = Blueprint('semaData_engine', __name__)

BASE_DIR = os.path.abspath(os.path.dirname(__file__))
SECURE_STORAGE = os.path.join(BASE_DIR, '..', '..', 'secure_storage')
UPLOAD_FOLDER = 'temp_audio'
os.makedirs(SECURE_STORAGE, exist_ok=True)
os.makedirs(UPLOAD_FOLDER, exist_ok=True)


# ─────────────────────────────────────────────────────────────
# HELPERS
# ─────────────────────────────────────────────────────────────

def process_semantic_segmentation(text, features):
    swahili_hints = {
        "age": "age miaka years niko na miaka",
        "gender": "gender jinsia mimi ni mwanamume mwanamke male female",
        "location": "location mahali ninaishi mtaa kaunti county",
        "name": "name jina naitwa jina langu"
    }
    segmented_results = {}
    sentences = [s.strip() for s in text.replace('.', '. ').split('.') if len(s.strip()) > 2]

    if not sentences:
        return {f.name: "Not Mentioned" for f in features}

    enhanced_feature_names = [swahili_hints.get(f.name.lower(), f.name) for f in features]

    sentence_embeddings = semantic_model.encode(sentences, convert_to_tensor=True)
    feature_embeddings = semantic_model.encode(enhanced_feature_names, convert_to_tensor=True)
    cosine_scores = util.cos_sim(feature_embeddings, sentence_embeddings)

    for i, feature in enumerate(features):
        best_match_idx = torch.argmax(cosine_scores[i]).item()
        confidence = cosine_scores[i][best_match_idx].item()

        if confidence > 0.30:
            segmented_results[feature.name] = sentences[best_match_idx]
        else:
            segmented_results[feature.name] = "Not Mentioned"

        # Digit fallback for age
        if segmented_results[feature.name] == "Not Mentioned" and feature.name.lower() == "age":
            digit_match = re.search(r'(\d+)', text)
            if digit_match:
                segmented_results[feature.name] = f"Extracted: {digit_match.group(1)}"

    return segmented_results


def is_audible_valid(file_path):
    try:
        y, sr = librosa.load(file_path, sr=None)
        duration = librosa.get_duration(y=y, sr=sr)
        if duration < 1.5:
            return False, "Audio too short (Min 1.5s)."
        rms = librosa.feature.rms(y=y)
        if np.mean(rms) < 0.005:
            return False, "No detectable speech (Silence)."
        return True, "Valid"
    except Exception as e:
        return False, str(e)


def refine_with_llm(transcribed_text, segmented_text):
    prompt = f"""
    You are a data extraction bot. Based on this Kenyan transcript: "{transcribed_text}"
    And these potential matches: {segmented_text}

    Return a valid JSON object extracting the relevant fields.
    Return ONLY JSON, no explanation.
    """
    try:
        response = ollama.chat(
            model='llama3.2:1b',
            format='json',
            messages=[{'role': 'user', 'content': prompt}]
        )
        result = response['message']['content']
        return result, {'status': 'LLM_SUCCESS', 'model': 'llama3.2:1b'}
    except ConnectionError as e:
        return segmented_text, {'status': 'OLLAMA_OFFLINE', 'error': str(e)}
    except json.JSONDecodeError as e:
        return segmented_text, {'status': 'LLM_PARSE_ERROR', 'error': str(e)}
    except Exception as e:
        return segmented_text, {'status': 'LLM_ERROR', 'error': str(e)}


def _cleanup(path):
    """Safely delete a file if it exists."""
    try:
        if path and os.path.exists(path):
            os.remove(path)
    except Exception:
        pass


# ─────────────────────────────────────────────────────────────
# TRANSCRIBE ROUTE
# ─────────────────────────────────────────────────────────────

@semaData_engine_bp.route('/transcribe', methods=['POST'])
@jwt_required()  # ✅ Protected — collector must be logged in
def semaData_transcribe():
    audio_path = None  # track for cleanup on error

    try:
        # ✅ Collector identity comes from JWT — not from form body
        current_user_id = get_jwt_identity()
        try:
            collector_id = int(current_user_id)
        except (TypeError, ValueError):
            return jsonify({"error": "Invalid token identity"}), 401

        # Form fields
        ref_number = request.form.get('referenceNumber')
        try:
            domain_id = int(request.form.get('domain_id'))
        except (TypeError, ValueError):
            return jsonify({"error": "Invalid domain_id"}), 400

        if 'file' not in request.files:
            return jsonify({'error': 'No file uploaded'}), 400

        file = request.files['file']
        if not file or file.filename == '':
            return jsonify({'error': 'Empty filename'}), 400

        # ── Save uploaded file ──
        temp_filename = secure_filename(file.filename)
        audio_path = os.path.join(UPLOAD_FOLDER, temp_filename)
        file.save(audio_path)

        # ── Convert to WAV if needed ──
        if not temp_filename.lower().endswith('.wav'):
            import subprocess
            converted_path = audio_path + '.wav'
            try:
                subprocess.run(
                    ['ffmpeg', '-y', '-i', audio_path, converted_path],
                    check=True, stdout=subprocess.PIPE, stderr=subprocess.PIPE
                )
                _cleanup(audio_path)
                audio_path = converted_path
            except Exception as e:
                print(f"ffmpeg conversion failed (continuing): {e}")

        # ── 1. Quality Gate ──
        if librosa and np:
            valid, message = is_audible_valid(audio_path)
            if not valid:
                _cleanup(audio_path)
                return jsonify({'error': 'Quality gate failed.', 'message': message}), 400

        # ── 2. Domain + Authorization ──
        target_domain = Domain.query.get(domain_id)
        if not target_domain:
            _cleanup(audio_path)
            return jsonify({"error": "Domain not found"}), 404

        if target_domain.reference_number != ref_number:
            _cleanup(audio_path)
            return jsonify({"error": "Reference number does not match domain"}), 400

        collector = User.query.get(collector_id)
        if not collector:
            _cleanup(audio_path)
            return jsonify({"error": "Collector not found"}), 404

        # ✅ Verify collector belongs to this domain via reference number
        if collector.reference_number != ref_number:
            _cleanup(audio_path)
            return jsonify({"error": "Collector not authorized for this domain"}), 403

        if not target_domain.is_active:
            _cleanup(audio_path)
            return jsonify({"error": "This domain is no longer active"}), 403

        print(f"✓ AUTH OK: Collector {collector_id} ({collector.first_name}) → Domain {domain_id}")

        # ── 3. Transcription ──
        if not semaData_model:
            _cleanup(audio_path)
            return jsonify({"error": "Transcription model not loaded"}), 503

        segments, info = semaData_model.transcribe(audio_path, task='transcribe')
        transcribed_text = " ".join([seg.text for seg in segments]).strip()

        # Move to secure permanent storage
        final_filename = f"DOMAIN_{domain_id}__REF__{ref_number}__{datetime.now().strftime('%H%M%S')}.wav"
        final_path = os.path.join(SECURE_STORAGE, final_filename)
        os.rename(audio_path, final_path)
        audio_path = None  # no longer needs cleanup — it's been moved

        print(f"Audio secured: {final_path}")

        # ── 4. Semantic Segmentation ──
        required_features = target_domain.domain_features
        initial_segments = {}

        if semantic_model and torch:
            initial_segments = process_semantic_segmentation(transcribed_text, required_features)
        else:
            initial_segments = {f.name: "Not Mentioned" for f in required_features}

        # ── 4b. LLM Refinement ──
        try:
            refined_json_str, llm_metadata = refine_with_llm(transcribed_text, initial_segments)
            segmented_text = json.loads(refined_json_str) if isinstance(refined_json_str, str) else refined_json_str
            print(f"LLM status: {llm_metadata['status']}")
        except (json.JSONDecodeError, Exception) as e:
            print(f"LLM fallback to semantic: {e}")
            segmented_text = initial_segments

        # ── 5. Save to Database ──
        domain_owner_id = target_domain.owner_id
        existing_entry = Dataset.query.filter_by(
            ref_number=ref_number, domain_id=domain_id
        ).first()

        if existing_entry:
            timestamp = datetime.now().strftime("%Y-%m-%d %H:%M")
            existing_entry.combined_text += f"\n\n--- Entry: {timestamp} ---\n{transcribed_text}"
            existing_entry.segmented_text = json.dumps(segmented_text)  # ✅ store as JSON string
            existing_entry.status = "AI_Passed"
            dataset_record = existing_entry
        else:
            dataset_record = Dataset(
                name=f"Ingestion_{ref_number}_{datetime.now().strftime('%H%M')}",
                description="Automated AI Transcription",
                owner_id=domain_owner_id,
                ref_number=ref_number,
                domain_id=domain_id,
                audio_file_path=final_path,
                collector_id=collector_id,
                combined_text=transcribed_text,
                segmented_text=json.dumps(segmented_text),  # ✅ store as JSON string
                status="AI_Passed"
            )
            db.session.add(dataset_record)

        db.session.flush()  # get dataset_record.id before creating Transcription

        transcription_record = Transcription(
            dataset_id=dataset_record.id,
            user_id=collector_id,
            contributor_name=f"{collector.first_name} {getattr(collector, 'second_name', '')}".strip(),
            transcription_text=transcribed_text,
            domain_features=json.dumps(segmented_text),  # ✅ store as JSON string
        )
        db.session.add(transcription_record)  # ✅ THIS WAS MISSING — records were never saved
        db.session.commit()                   # ✅ THIS WAS MISSING — nothing persisted to DB

        print(f"✓ SAVED: Dataset {dataset_record.id}, Transcription {transcription_record.id}")

        return jsonify({
            "status": "Success",
            "transcription": transcribed_text,
            "segments": segmented_text
        }), 200

    except Exception as e:
        db.session.rollback()
        _cleanup(audio_path)
        print(f"Transcribe error: {e}")
        return jsonify({'error': str(e)}), 500