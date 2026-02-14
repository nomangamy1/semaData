import React, { useState, useRef, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import db from './db'; // FIXED: Default import (removed curly braces)
import './collectorHome.css';

// --- SUB-COMPONENT: REAL-TIME WAVEFORM ---
const AudioVisualizer = ({ stream, isPaused }) => {
  const canvasRef = useRef(null);

  useEffect(() => {
    if (!stream || isPaused) return;

    const AudioContext = window.AudioContext || window.webkitAudioContext;
    const audioContext = new AudioContext();

    if (audioContext.state === 'suspended') {
      audioContext.resume();
    }

    const source = audioContext.createMediaStreamSource(stream);
    const analyzer = audioContext.createAnalyser();
    analyzer.fftSize = 256;
    analyzer.smoothingTimeConstant = 0.8;
    source.connect(analyzer);

    const bufferLength = analyzer.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    let animationFrameId;

    const draw = () => {
      animationFrameId = requestAnimationFrame(draw);
      analyzer.getByteFrequencyData(dataArray);

      const WIDTH = canvas.width;
      const HEIGHT = canvas.height;
      ctx.clearRect(0, 0, WIDTH, HEIGHT);

      const barWidth = (WIDTH / bufferLength) * 2.5;
      let x = 0;

      for (let i = 0; i < bufferLength; i++) {
        const barHeight = dataArray[i] / 2;
        ctx.fillStyle = '#489c8c';
        ctx.fillRect(x, HEIGHT - barHeight, barWidth, barHeight);
        x += barWidth + 1;
      }
    };

    draw();

    return () => {
      cancelAnimationFrame(animationFrameId);
      if (audioContext.state !== 'closed') {
        audioContext.close();
      }
    };
  }, [stream, isPaused]);

  return <canvas ref={canvasRef} width="600" height="100" className="waveform-canvas" />;
};

// --- MAIN COMPONENT ---
const CollectorHome = () => {
  const location = useLocation();
  const navigate = useNavigate();

  const locationState = location.state || {};
  const task = locationState.task || "General Ingestion";
  const ref = locationState.ref || localStorage.getItem('refNum') || "N/A";

  const [isRecording, setIsRecording] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [stream, setStream] = useState(null);
  const [transcription, setTranscription] = useState("");
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [duration, setDuration] = useState(0);

  const mediaRecorder = useRef(null);
  const audioChunks = useRef([]);
  const timerRef = useRef(null);

  // Connection Monitoring
  useEffect(() => {
    const handleStatus = () => setIsOnline(navigator.onLine);
    window.addEventListener('online', handleStatus);
    window.addEventListener('offline', handleStatus);
    return () => {
      window.removeEventListener('online', handleStatus);
      window.removeEventListener('offline', handleStatus);
    };
  }, []);

  // Timer Logic
  useEffect(() => {
    if (isRecording && !isPaused) {
      timerRef.current = setInterval(() => setDuration(d => d + 1), 1000);
    } else {
      clearInterval(timerRef.current);
    }
    return () => clearInterval(timerRef.current);
  }, [isRecording, isPaused]);

  const formatTime = (s) => {
    const mins = Math.floor(s / 60);
    const secs = s % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const startRecording = async () => {
    try {
      const audioStream = await navigator.mediaDevices.getUserMedia({ audio: true });
      setStream(audioStream);
      mediaRecorder.current = new MediaRecorder(audioStream);
      audioChunks.current = [];

      mediaRecorder.current.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunks.current.push(e.data);
      };

      mediaRecorder.current.start();
      setIsRecording(true);
      setIsPaused(false);
      setDuration(0);
      setTranscription("Listening to Conversation signal...");
    } catch (err) {
      console.error(err);
      alert("Hardware Error: Microphone access denied.");
    }
  };

  const pauseRecording = () => {
    if (mediaRecorder.current?.state === "recording") {
      mediaRecorder.current.pause();
      setIsPaused(true);
    }
  };

  const resumeRecording = () => {
    if (mediaRecorder.current?.state === "paused") {
      mediaRecorder.current.resume();
      setIsPaused(false);
    }
  };

  const stopRecording = () => {
    if (mediaRecorder.current && mediaRecorder.current.state !== "inactive") {
      mediaRecorder.current.stop();
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
      setIsRecording(false);
      setIsPaused(false);
      setTranscription("Acoustic buffer finalized. Ready for sync.");
    }
  };

  const handleSaveAndSync = async () => {
    if (audioChunks.current.length === 0) {
      alert("No audio data captured.");
      return;
    }

    const audioBlob = new Blob(audioChunks.current, { type: 'audio/webm' });

    // 1. Attempt Cloud Sync
    if (isOnline) {
      try {
        setTranscription("Transmitting to SemaData Cloud...");
        const formData = new FormData();
        formData.append("file", audioBlob, "recording.webm");
        formData.append("referenceNumber", ref);
        formData.append("user_id", localStorage.getItem('userId'));
        formData.append("domainId", localStorage.getItem('domainId'));

        const response = await fetch('http://localhost:8000/api/core/transcribe', {
          method: 'POST',
          body: formData,
        });

        if (response.ok) {
          alert("✅ Sync Complete!");
          navigate('/userDashboard');
          return;
        } else {
          throw new Error("Cloud rejected the data");
        }
      } catch (err) {
        console.warn("Cloud sync failed. Redirecting to Local Vault.");
      }
    }

    // 2. Fallback: Save to IndexedDB (Dexie)
    try {
      await db.drafts.add({
        audioBlob: audioBlob,
        refNum: ref,
        task: task,
        domainId: localStorage.getItem('domainId'),
        status: 'Pending Sync',
        timestamp: Date.now(),
        duration: formatTime(duration)
      });
      alert("NETWORK LOW: Session saved to secure local vault.");
      navigate('/userDashboard');
    } catch (dbErr) {
      console.error("Critical Storage Error:", dbErr);
      alert("Failed to save locally. Please check your storage settings.");
    }
  };

  return (
    <div className="collector-focus-mode">
      <div className={`status-bar ${!isOnline ? 'offline' : ''}`}>
        <div className="status-item">TASK: <strong>{task}</strong></div>
        <div className="status-item">REF: <code className="ref-code">{ref}</code></div>
        <div className="status-indicator">
          <span className={`dot ${!isOnline ? 'yellow' : isRecording ? (isPaused ? 'yellow' : 'red') : 'green'}`}></span>
          {!isOnline ? "OFFLINE" : isRecording ? (isPaused ? "PAUSED" : "LIVE") : "READY"}
        </div>
      </div>

      <div className="engine-container">
        <header className="engine-header">
          <h2>SemaData Dialect Conversation Engine</h2>
          <p className="engine-subtitle">Acoustic Signal Telemetry</p>
        </header>

        <div className="visualizer-box">
          <div className="timer-display">{formatTime(duration)}</div>
          {isRecording && !isPaused ? (
            <AudioVisualizer stream={stream} isPaused={isPaused} />
          ) : <div className="silent-wave"></div>}
        </div>

        <div className="mic-section">
          <div className="controls-row">
            {isRecording && (
              <button
                className={`secondary-btn ${isPaused ? 'pause-active' : ''}`}
                onClick={isPaused ? resumeRecording : pauseRecording}
              >
                {isPaused ? "▶ RESUME" : "⏸ PAUSE"}
              </button>
            )}

            <button
              className={`mic-button ${isRecording ? 'recording' : ''}`}
              onClick={isRecording ? stopRecording : startRecording}
            >
              {isRecording ? <div className="stop-square"></div> : "REC"}
            </button>
          </div>
        </div>

        <div className="transcription-preview">
          <label>Engine Output</label>
          <div className="text-display">{transcription}</div>
        </div>

        <div className="action-footer">
          <button className="cancel-btn" onClick={() => navigate('/userDashboard')}>Cancel Session</button>
          <button
            className={`save-btn ${!isOnline ? 'draft-mode' : ''}`}
            disabled={isRecording || duration === 0}
            onClick={handleSaveAndSync}
          >
            {isOnline ? "Finalize & Sync Cloud" : "Save to Local Vault"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default CollectorHome;