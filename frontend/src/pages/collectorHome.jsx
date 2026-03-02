import React, { useState, useRef, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import db from './db';
import './collectorHome.css';

// --- SUB-COMPONENT: REAL-TIME WAVEFORM ---
const AudioVisualizer = ({ stream, isPaused }) => {
  const canvasRef = useRef(null);

  useEffect(() => {
    if (!stream || isPaused) return;

    const AudioContext = window.AudioContext || window.webkitAudioContext;
    const audioContext = new AudioContext();

    if (audioContext.state === 'suspended') audioContext.resume();

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
      if (audioContext.state !== 'closed') audioContext.close();
    };
  }, [stream, isPaused]);

  return <canvas ref={canvasRef} width="600" height="100" className="waveform-canvas" />;
};


// --- MAIN COMPONENT ---
const CollectorHome = () => {
  const location = useLocation();
  const navigate = useNavigate();

  // ✅ Auth — redirect if no token
  const token = localStorage.getItem('token');
  const domainId = localStorage.getItem('domainId');

  // ✅ Correct localStorage key — matches what login stores
  const ref = localStorage.getItem('referenceNumber') || location.state?.ref || 'N/A';

  // ─── State ───
  const [task, setTask] = useState(location.state?.task || null);
  const [domainFeatures, setDomainFeatures] = useState([]); // features to collect
  const [taskLoading, setTaskLoading] = useState(!location.state?.task);
  const [taskError, setTaskError] = useState('');

  const [isRecording, setIsRecording] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [stream, setStream] = useState(null);
  const [transcription, setTranscription] = useState('');
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [duration, setDuration] = useState(0);

  const mediaRecorder = useRef(null);
  const audioChunks = useRef([]);
  const timerRef = useRef(null);

  // ✅ Guard: redirect if not logged in
  useEffect(() => {
    if (!token) {
      navigate('/login');
    }
  }, [token, navigate]);

  // ✅ Fetch collector's assigned task + domain features from backend
  useEffect(() => {
    if (!token || !domainId) return;

    // Skip fetch if task was passed via navigation state
    if (location.state?.task) {
      setTaskLoading(false);
      return;
    }

    const fetchTask = async () => {
      try {
        const response = await fetch(
          `http://localhost:8000/api/collector/task?domain_id=${domainId}`,
          {
            headers: {
              'Authorization': `Bearer ${token}`,  // ✅ JWT token
              'Content-Type': 'application/json'
            }
          }
        );

        if (response.status === 401 || response.status === 403) {
          localStorage.removeItem('token');
          navigate('/login');
          return;
        }

        if (!response.ok) throw new Error('Failed to load task');

        const data = await response.json();
        setTask(data.task_description || 'General Data Collection');
        setDomainFeatures(data.features || []); // e.g. ['Keyword', 'Dialect', 'Location']

      } catch (err) {
        console.error('Task fetch error:', err);
        setTaskError('Could not load your assigned task. Please check your connection.');
      } finally {
        setTaskLoading(false);
      }
    };

    fetchTask();
  }, [token, domainId, navigate, location.state]);

  // Connection monitoring
  useEffect(() => {
    const handleStatus = () => setIsOnline(navigator.onLine);
    window.addEventListener('online', handleStatus);
    window.addEventListener('offline', handleStatus);
    return () => {
      window.removeEventListener('online', handleStatus);
      window.removeEventListener('offline', handleStatus);
    };
  }, []);

  // Timer
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

  // ─── Recording Controls ───
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
      setTranscription('Listening to Conversation signal...');
    } catch (err) {
      console.error(err);
      alert('Hardware Error: Microphone access denied.');
    }
  };

  const pauseRecording = () => {
    if (mediaRecorder.current?.state === 'recording') {
      mediaRecorder.current.pause();
      setIsPaused(true);
    }
  };

  const resumeRecording = () => {
    if (mediaRecorder.current?.state === 'paused') {
      mediaRecorder.current.resume();
      setIsPaused(false);
    }
  };

  const stopRecording = () => {
    if (mediaRecorder.current && mediaRecorder.current.state !== 'inactive') {
      mediaRecorder.current.stop();
      stream?.getTracks().forEach(track => track.stop());
      setIsRecording(false);
      setIsPaused(false);
      setTranscription('Acoustic buffer finalized. Ready for sync.');
    }
  };

  // ─── Save & Sync ───
  const handleSaveAndSync = async () => {
    if (audioChunks.current.length === 0) {
      alert('No audio data captured.');
      return;
    }

    const audioBlob = new Blob(audioChunks.current, { type: 'audio/webm' });

    if (isOnline) {
      try {
        setTranscription('Transmitting to SemaData Cloud...');

        const formData = new FormData();
        formData.append('file', audioBlob, 'recording.webm');
        formData.append('referenceNumber', ref);
        formData.append('domain_id', domainId);  // ✅ consistent key name

        const response = await fetch('http://localhost:8000/api/core/transcribe', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`  // ✅ JWT token — no Content-Type with FormData
          },
          body: formData,
        });

        if (response.ok) {
          alert('✅ Sync Complete!');
          navigate('/userDashboard');
          return;
        } else {
          throw new Error('Cloud rejected the data');
        }
      } catch (err) {
        console.warn('Cloud sync failed. Saving to Local Vault.', err);
      }
    }

    // Fallback: IndexedDB
    try {
      await db.drafts.add({
        audioBlob,
        refNum: ref,
        task,
        domainId,
        status: 'Pending Sync',
        timestamp: Date.now(),
        duration: formatTime(duration)
      });
      alert('NETWORK LOW: Session saved to secure local vault.');
      navigate('/userDashboard');
    } catch (dbErr) {
      console.error('Critical Storage Error:', dbErr);
      alert('Failed to save locally. Please check your storage settings.');
    }
  };

  // ─── Loading / Error states ───
  if (taskLoading) {
    return (
      <div className="collector-focus-mode">
        <div className="engine-container" style={{ textAlign: 'center', paddingTop: '4rem' }}>
          <p style={{ color: '#489c8c', fontWeight: 'bold', fontSize: '1.1rem', animation: 'pulse 1.5s infinite' }}>
            Loading your assigned task...
          </p>
        </div>
      </div>
    );
  }

  if (taskError) {
    return (
      <div className="collector-focus-mode">
        <div className="engine-container" style={{ textAlign: 'center', paddingTop: '4rem' }}>
          <p style={{ color: '#ef4444', fontWeight: 'bold' }}>{taskError}</p>
          <button className="save-btn" style={{ marginTop: '1rem' }} onClick={() => navigate('/userDashboard')}>
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="collector-focus-mode">

      {/* Status Bar */}
      <div className={`status-bar ${!isOnline ? 'offline' : ''}`}>
        <div className="status-item">TASK: <strong>{task || 'General Collection'}</strong></div>
        <div className="status-item">REF: <code className="ref-code">{ref}</code></div>
        {/* ✅ Show domain features so collector knows what to capture */}
        {domainFeatures.length > 0 && (
          <div className="status-item">
            CAPTURE: <strong>{domainFeatures.join(' · ')}</strong>
          </div>
        )}
        <div className="status-indicator">
          <span className={`dot ${!isOnline ? 'yellow' : isRecording ? (isPaused ? 'yellow' : 'red') : 'green'}`}></span>
          {!isOnline ? 'OFFLINE' : isRecording ? (isPaused ? 'PAUSED' : 'LIVE') : 'READY'}
        </div>
      </div>

      <div className="engine-container">
        <header className="engine-header">
          <h2>SemaData Dialect Conversation Engine</h2>
          <p className="engine-subtitle">Acoustic Signal Telemetry</p>
        </header>

        <div className="visualizer-box">
          <div className="timer-display">{formatTime(duration)}</div>
          {isRecording && !isPaused
            ? <AudioVisualizer stream={stream} isPaused={isPaused} />
            : <div className="silent-wave"></div>
          }
        </div>

        <div className="mic-section">
          <div className="controls-row">
            {isRecording && (
              <button
                className={`secondary-btn ${isPaused ? 'pause-active' : ''}`}
                onClick={isPaused ? resumeRecording : pauseRecording}
              >
                {isPaused ? '▶ RESUME' : '⏸ PAUSE'}
              </button>
            )}
            <button
              className={`mic-button ${isRecording ? 'recording' : ''}`}
              onClick={isRecording ? stopRecording : startRecording}
            >
              {isRecording ? <div className="stop-square"></div> : 'REC'}
            </button>
          </div>
        </div>

        <div className="transcription-preview">
          <label>Engine Output</label>
          <div className="text-display">{transcription || 'Awaiting signal...'}</div>
        </div>

        <div className="action-footer">
          <button className="cancel-btn" onClick={() => navigate('/userDashboard')}>
            Cancel Session
          </button>
          <button
            className={`save-btn ${!isOnline ? 'draft-mode' : ''}`}
            disabled={isRecording || duration === 0}
            onClick={handleSaveAndSync}
          >
            {isOnline ? 'Finalize & Sync Cloud' : 'Save to Local Vault'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default CollectorHome;