import re
import threading
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
from flask_jwt_extended import jwt_required, get_jwt_identity
from models.Transcription import Transcription
from models.user import User
from extensions import db
from models.dataset import Dataset
from models.domain import Domain
from models.JobApplication import JobApplication
from models.Job import Job
from .nlp_matcher import segment_data

semantic_model = None
semaData_model = None

if os.environ.get('FLASK_ENV') != 'migration' and os.environ.get('DISABLE_ML_MODELS') != 'true':
    if SentenceTransformer and torch:
        try:
            print("Loading Semantic Model...")
            semantic_model = SentenceTransformer('all-MiniLM-L6-v2')
        except Exception as e:
            print(f"Failed to load semantic model: {e}")
    if WhisperModel:
        try:
            MODEL_NAME = os.environ.get('MODEL_NAME', 'tiny')
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


def process_semantic_segmentation(text, features):
    swahili_hints = {
        "age":      "age miaka years niko na miaka",
        "gender":   "gender jinsia mimi ni mwanamume mwanamke male female",
        "location": "location mahali ninaishi mtaa kaunti county",
        "name":     "name jina naitwa jina langu"
    }
    segmented_results = {}
    sentences = [s.strip() for s in text.replace('.', '. ').split('.') if len(s.strip()) > 2]
    if not sentences:
        return {f.name: "Not Mentioned" for f in features}

    enhanced_feature_names = [
        swahili_hints.get(f.name.lower(), f.name) for f in features
    ]
    sentence_embeddings = semantic_model.encode(sentences, convert_to_tensor=True)
    feature_embeddings  = semantic_model.encode(enhanced_feature_names, convert_to_tensor=True)
    cosine_scores = util.cos_sim(feature_embeddings, sentence_embeddings)

    for i, feature in enumerate(features):
        best_match_idx = torch.argmax(cosine_scores[i]).item()
        confidence     = cosine_scores[i][best_match_idx].item()
        if confidence > 0.30:
            segmented_results[feature.name] = sentences[best_match_idx]
        else:
            segmented_results[feature.name] = "Not Mentioned"
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


def refine_with_llm(transcribed_text, segmented_text, features):
    feature_names = [f.name for f in features]
    prompt = f"""You are a data extraction assistant for African field interviews.

Extract the following specific fields from the transcript below.
Return ONLY a valid JSON object with exactly these keys: {feature_names}
If a value is not mentioned in the transcript, use null for that key.
Do not add any explanation, markdown, or extra text — just the raw JSON object.

Transcript:
"{transcribed_text}"

Example return format:
{json.dumps({k: "extracted value or null" for k in feature_names})}
"""
    try:
        response = ollama.chat(
            model='llama3.2:1b',
            format='json',
            messages=[{'role': 'user', 'content': prompt}]
        )
        result = response['message']['content']
        json.loads(result)
        return result, {'status': 'LLM_SUCCESS', 'model': 'llama3.2:1b'}
    except Exception as e:
        error_str = str(e).lower()
        if any(word in error_str for word in ['connect', 'refused', 'offline', 'timeout']):
            print(f"[Engine] Ollama offline — using semantic fallback")
            return json.dumps(segmented_text), {'status': 'OLLAMA_OFFLINE', 'error': str(e)}
        print(f"[Engine] LLM error — using semantic fallback: {e}")
        return json.dumps(segmented_text), {'status': 'LLM_ERROR', 'error': str(e)}


def _cleanup(path):
    try:
        if path and os.path.exists(path):
            os.remove(path)
    except Exception:
        pass


@semaData_engine_bp.route('/transcribe', methods=['POST'])
@jwt_required()
def semaData_transcribe():
    audio_path = None
    try:
        current_user_id = get_jwt_identity()
        try:
            collector_id = int(current_user_id)
        except (TypeError, ValueError):
            return jsonify({"error": "Invalid token identity"}), 401

        ref_number = request.form.get('referenceNumber', '').strip()
        try:
            domain_id = int(request.form.get('domain_id'))
        except (TypeError, ValueError):
            return jsonify({"error": "Invalid domain_id"}), 400

        if 'file' not in request.files:
            return jsonify({'error': 'No file uploaded'}), 400

        file = request.files['file']
        if not file or file.filename == '':
            return jsonify({'error': 'Empty filename'}), 400

        temp_filename = secure_filename(file.filename)
        audio_path    = os.path.join(UPLOAD_FOLDER, temp_filename)
        file.save(audio_path)

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

        if librosa and np:
            valid, message = is_audible_valid(audio_path)
            if not valid:
                _cleanup(audio_path)
                return jsonify({'error': 'Quality gate failed.', 'message': message}), 400

        target_domain = Domain.query.get(domain_id)
        if not target_domain:
            _cleanup(audio_path)
            return jsonify({"error": "Domain not found"}), 404

        if not target_domain.is_active:
            _cleanup(audio_path)
            return jsonify({"error": "This domain is no longer active"}), 403

        collector = User.query.get(collector_id)
        if not collector:
            _cleanup(audio_path)
            return jsonify({"error": "Collector not found"}), 404

        application = JobApplication.query.filter_by(
            reference_number_assigned=collector.reference_number,
            status='approved'
        ).first()
        if not application:
            _cleanup(audio_path)
            return jsonify({"error": "No approved application found for this collector"}), 403

        job = Job.query.get(application.job_id)
        if not job or job.domain_id != domain_id:
            _cleanup(audio_path)
            return jsonify({"error": "Collector not authorized for this domain"}), 403

        print(f"AUTH OK: Collector {collector_id} ({collector.first_name}) -> Domain {domain_id}")

        if not semaData_model:
            _cleanup(audio_path)
            return jsonify({"error": "Transcription model not loaded"}), 503

        segments, info = semaData_model.transcribe(audio_path, task='transcribe')
        transcribed_text = " ".join([seg.text for seg in segments]).strip()
        print(f"TRANSCRIBED: {transcribed_text[:80]}...")

        final_filename = (
            f"DOMAIN_{domain_id}__REF__{collector.reference_number}"
            f"__{datetime.now().strftime('%Y%m%d_%H%M%S')}.wav"
        )
        final_path = os.path.join(SECURE_STORAGE, final_filename)
        os.rename(audio_path, final_path)
        audio_path = None

        required_features = target_domain.domain_features
        if semantic_model and torch:
            initial_segments = process_semantic_segmentation(transcribed_text, required_features)
        else:
            initial_segments = {f.name: "Not Mentioned" for f in required_features}

        refined_json_str, llm_metadata = refine_with_llm(
            transcribed_text,
            initial_segments,
            required_features
        )
        print(f"LLM STATUS: {llm_metadata['status']}")

        try:
            segmented_text = json.loads(refined_json_str) if isinstance(refined_json_str, str) else refined_json_str
        except json.JSONDecodeError:
            print("[Engine] LLM returned invalid JSON — falling back to semantic")
            segmented_text = initial_segments

        domain_owner_id = target_domain.owner_id

        # ✅ Every submission is its own Dataset row — never merge
        dataset_record = Dataset(
            name=f"Sub_{collector.reference_number}_{datetime.now().strftime('%Y%m%d_%H%M%S')}",
            description="Automated AI Transcription",
            owner_id=domain_owner_id,
            ref_number=collector.reference_number,
            domain_id=domain_id,
            audio_file_path=final_path,
            collector_id=collector_id,
            combined_text=transcribed_text,
            segmented_text=json.dumps(segmented_text),
            status="pending_review"
        )
        db.session.add(dataset_record)

        db.session.flush()

        transcription_record = Transcription(
            dataset_id=dataset_record.id,
            user_id=collector_id,
            contributor_name=f"{collector.first_name} {getattr(collector, 'second_name', '')}".strip(),
            transcription_text=transcribed_text,
            domain_features=json.dumps(segmented_text),
        )
        db.session.add(transcription_record)
        db.session.commit()

        total_submissions = Dataset.query.filter_by(domain_id=domain_id).count()
        target_goal       = target_domain.target_goal or 1
        progress_percent  = round((total_submissions / target_goal) * 100, 1)

        print(f"SAVED: Dataset {dataset_record.id}, Transcription {transcription_record.id}")
        print(f"PROGRESS: {total_submissions}/{target_goal} ({progress_percent}%)")

        return jsonify({
            "status":        "Success",
            "transcription": transcribed_text,
            "segments":      segmented_text,
            "llm_status":    llm_metadata['status'],
            "progress": {
                "submitted": total_submissions,
                "target":    target_goal,
                "percent":   progress_percent
            }
        }), 200

    except Exception as e:
        db.session.rollback()
        _cleanup(audio_path)
        print(f"Transcribe error: {e}")
        import traceback
        traceback.print_exc()
        return jsonify({'error': str(e)}), 500
