import React, { useState, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import './collectorHome.css';

const CollectorHome = () => {
  const location = useLocation();
  const navigate = useNavigate();
  
  // Retrieve session context passed from UserDashboard
  const { task, ref } = location.state || { 
    task: "General Ingestion", 
    ref: localStorage.getItem('refNum') || "N/A" 
  };

  const [isRecording, setIsRecording] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [transcription, setTranscription] = useState("");

  // Placeholder for MediaRecorder (Future integration)
  const mediaRecorder = useRef(null);

  const startRecording = () => {
    setIsRecording(true);
    setIsPaused(false);
    setTranscription("System listening... Please speak clearly.");
    // In next step: navigator.mediaDevices.getUserMedia(...)
  };

  const pauseRecording = () => {
    setIsPaused(true);
    setTranscription(prev => prev + "\n[PAUSED] ");
    // In next step: mediaRecorder.current.pause()
  };

  const resumeRecording = () => {
    setIsPaused(false);
    setTranscription(prev => prev.replace("\n[PAUSED] ", " "));
    // In next step: mediaRecorder.current.resume()
  };

  const stopRecording = () => {
    setIsRecording(false);
    setIsPaused(false);
    // In next step: mediaRecorder.current.stop()
  };

  const handleSave = () => {
    // Logic to push transcription to your Flask Backend
    alert(`Data successfully synced for Reference: ${ref}`);
    navigate('/userDashboard');
  };

  return (
    <div className="collector-focus-mode">
      {/* Top Session Metadata */}
      <div className="status-bar">
        <div className="status-item">
          <span>TASK:</span> <strong>{task}</strong>
        </div>
        <div className="status-item">
          <span>REF ID:</span> <code className="ref-code">{ref}</code>
        </div>
        <div className="status-indicator">
          <span className={`dot ${isRecording ? (isPaused ? 'yellow' : 'red') : 'green'}`}></span>
          {isPaused ? "PAUSED" : isRecording ? "LIVE" : "READY"}
        </div>
      </div>

      <div className="engine-container">
        <header className="engine-header">
          <h2>Whisper Dialect Engine</h2>
          <p className="engine-subtitle">
            {isPaused 
              ? "Recording suspended. Tap Resume to continue." 
              : isRecording 
              ? "Capturing audio signal..." 
              : "Calibrate your environment and tap REC to begin."}
          </p>
        </header>

        {/* --- CENTRAL CONTROLS --- */}
        <div className="mic-section">
          <div className="controls-row">
            
            {/* Conditional Pause/Resume Toggle */}
            {isRecording && (
              <button 
                className={`secondary-btn ${isPaused ? 'resume-active' : 'pause-active'}`}
                onClick={isPaused ? resumeRecording : pauseRecording}
              >
                {isPaused ? "▶ RESUME" : "⏸ PAUSE"}
              </button>
            )}

            {/* Main Action Button */}
            <button 
              className={`mic-button ${isRecording ? 'recording' : ''} ${isPaused ? 'paused-state' : ''}`}
              onClick={isRecording ? stopRecording : startRecording}
            >
              <div className="mic-icon-container">
                {isRecording ? (
                  <div className="stop-square"></div>
                ) : (
                  <svg viewBox="0 0 24 24" className="mic-svg">
                    <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" fill="currentColor"/>
                    <path d="M19 10v2a7 7 0 0 1-14 0v-2M12 19v4M8 23h8" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                  </svg>
                )}
              </div>
            </button>
          </div>
        </div>

        {/* --- TRANSCRIPTION PREVIEW --- */}
        <div className={`transcription-preview ${isPaused ? 'preview-dimmed' : ''}`}>
           <label>Live Output Preview</label>
           <div className="text-display">
             {transcription || "Awaiting audio input..."}
           </div>
        </div>

        {/* --- FOOTER ACTIONS --- */}
        <div className="action-footer">
           <button 
            className="cancel-btn" 
            onClick={() => navigate('/userDashboard')}
           >
             Cancel Session
           </button>
           <button 
            className="save-btn" 
            disabled={!transcription || isRecording}
            onClick={handleSave}
           >
             Save & Sync Data
           </button>
        </div>
      </div>
    </div>
  );
};

export default CollectorHome;