import os
import requests
from flask import Blueprint, request, jsonify
import tempfile

semaDataEngine_bp = Blueprint("semaDataEngine", __name__)

# OpenAI Whisper API Configuration
OPENAI_API_KEY = os.environ.get('OPENAI_API_KEY')
WHISPER_API_URL = "https://api.openai.com/v1/audio/transcriptions"

def transcribe_audio_openai(audio_path):
    """
    Transcribe audio using OpenAI Whisper API
    Supports automatic language detection for Swahili and English
    """
    if not OPENAI_API_KEY:
        # Fallback to mock response for development
        return "This is a mock transcription for development purposes. Configure OPENAI_API_KEY for real transcription."

    headers = {
        "Authorization": f"Bearer {OPENAI_API_KEY}"
    }

    with open(audio_path, 'rb') as audio_file:
        files = {
            "file": audio_file,
            "model": (None, "whisper-1"),
        }
        # Let OpenAI auto-detect language (supports Swahili and English)
        data = {
            "response_format": "json"
        }

        try:
            response = requests.post(WHISPER_API_URL, headers=headers, files=files, data=data, timeout=30)

            if response.status_code == 200:
                return response.json().get('text', '')
            else:
                return f"API Error: {response.status_code} - {response.text}"
        except requests.exceptions.RequestException as e:
            return f"Request failed: {str(e)}"

@semaDataEngine_bp.route('/transcribe', methods=['POST'])
def transcribe():
    """
    Endpoint for audio transcription
    Accepts audio files and returns transcribed text
    """
    try:
        if 'file' not in request.files:
            return jsonify({"error": "No audio file provided"}), 400

        audio_file = request.files['file']
        if audio_file.filename == '':
            return jsonify({"error": "No file selected"}), 400

        # Validate file type
        allowed_extensions = {'mp3', 'mp4', 'wav', 'flac', 'm4a', 'ogg'}
        if not any(audio_file.filename.lower().endswith(ext) for ext in allowed_extensions):
            return jsonify({"error": "Unsupported file format. Use: mp3, mp4, wav, flac, m4a, ogg"}), 400

        # Save uploaded file temporarily
        with tempfile.NamedTemporaryFile(delete=False, suffix=os.path.splitext(audio_file.filename)[1]) as temp_file:
            audio_file.save(temp_file.name)
            temp_path = temp_file.name

        try:
            # Transcribe audio
            transcription = transcribe_audio_openai(temp_path)

            return jsonify({
                "transcription": transcription,
                "language": "auto-detected (Swahili/English)",
                "success": True
            })

        finally:
            # Clean up temp file
            if os.path.exists(temp_path):
                os.unlink(temp_path)

    except Exception as e:
        return jsonify({"error": f"Transcription failed: {str(e)}"}), 500

@semaDataEngine_bp.route('/health', methods=['GET'])
def health_check():
    """Health check endpoint"""
    return jsonify({
        "status": "healthy",
        "service": "semaData transcription engine",
        "api_configured": bool(OPENAI_API_KEY)
    })