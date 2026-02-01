import React, { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import './collectorHome.css';

const CollectorHome = () => {
  const location = useLocation();
  const navigate = useNavigate();
  
  // Destructure task and ref sent from UserDashboard
  const { task, ref } = location.state || { 
    task: "General Session", 
    ref: localStorage.getItem('refNum') || "Unknown" 
  };

  const [isRecording, setIsRecording] = useState(false);
  const [transcription, setTranscription] = useState("");

  const toggleRecording = () => {
    setIsRecording(!isRecording);
    // Logic for Whisper Engine / MediaRecorder API will go here
    if (!isRecording) {
      setTranscription("Listening and transcribing dialect in real-time...");
    }
  };

  const handleSaveSession = () => {
    alert(`Data saved for Ref: ${ref} under Task: ${task}`);
    navigate('/userDashboard');
  };

  return (
    <div className="collector-focus-mode">
      {/* Top Breadcrumb / Status */}
      <div className="status-bar">
        <span>Target: <strong>{task}</strong></span>
        <span>Operator: <strong>{localStorage.getItem('userName')}</strong></span>
        <span>Ref ID: <code style={{color: '#34d399'}}>{ref}</code></span>
      </div>

      <div className="engine-container">
        <header>
          <h2 style={{color: '#065f46'}}>Voice Capture Engine</h2>
          <p style={{color: '#6b7280'}}>Ensure your environment is quiet before recording.</p>
        </header>

        <div className="mic-section">
          <button 
            className={`mic-button ${isRecording ? 'recording' : ''}`}
            onClick={toggleRecording}
          >
            {isRecording ? (
              <svg width="40" height="40" viewBox="0 0 24 24" fill="currentColor">
                <rect x="6" y="6" width="12" height="12" />
              </svg>
            ) : (
              <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
                <path d="M19 10v2a7 7 0 0 1-14 0v-2M12 19v4M8 23h8" />
              </svg>
            )}
          </button>
          <p style={{marginTop: '1rem', fontWeight: '600'}}>
            {isRecording ? "RECORDING..." : "Tap to Start"}
          </p>
        </div>

        {/* Real-time Text Feedback */}
        <div className="transcription-preview">
          <label style={{fontSize: '0.7rem', color: '#9ca3af', textTransform: 'uppercase'}}>Live Transcription</label>
          <p style={{marginTop: '0.5rem', fontStyle: transcription ? 'normal' : 'italic', color: transcription ? '#1f2937' : '#9ca3af'}}>
            {transcription || "Transcription will appear here as you speak..."}
          </p>
        </div>

        <div style={{marginTop: '2rem', display: 'flex', gap: '1rem', justifyContent: 'center'}}>
          <button 
            onClick={() => navigate('/userDashboard')}
            style={{padding: '0.75rem 1.5rem', borderRadius: '8px', border: '1px solid #d1d5db', background: 'white', cursor: 'pointer'}}
          >
            Cancel
          </button>
          <button 
            onClick={handleSaveSession}
            disabled={!transcription}
            style={{
              padding: '0.75rem 1.5rem', 
              borderRadius: '8px', 
              background: transcription ? '#10b981' : '#d1d5db', 
              color: 'white', 
              border: 'none', 
              fontWeight: 'bold',
              cursor: transcription ? 'pointer' : 'not-allowed'
            }}
          >
            Save Transcription
          </button>
        </div>
      </div>
    </div>
  );
};

export default CollectorHome;