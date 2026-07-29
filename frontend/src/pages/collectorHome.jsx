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

    // ── Feature conversation guide ──
  const generateConversationGuide = (features) => {
    const questionMap = {
      'age':        'Ask: "How old are you?" / "Una miaka mingapi?"',
      'name':       'Ask: "What is your name?" / "Jina lako ni nani?"',
      'location':   'Ask: "Where do you live?" / "Unaishi wapi?"',
      'gender':     'Ask: "Are you male or female?" / "Wewe ni mwanaume au mwanamke?"',
      'occupation': 'Ask: "What do you do for work?" / "Unafanya kazi gani?"',
      'crop':       'Ask: "What crops do you grow?" / "Unalima nini?"',
      'income':     'Ask: "What is your monthly income?" / "Mapato yako ni ngapi?"',
      'education':  'Ask: "What is your education level?" / "Elimu yako ni ngapi?"',
    };
    return features.map(f => ({
      feature: f,
      question: questionMap[f.toLowerCase()] || `Ask about: ${f}`
    }));
  };

  // ── Client-side feature detection ──
  const detectFeaturesInText = (text, features) => {
    if (!text || !features.length) return {};
    const lower = text.toLowerCase();
    const results = {};
    const patterns = {
      'age':        [/\d+\s*(miaka|years|yr|yrs|years old)/i, /nina\s*miaka/i, /am\s*\d+/i],
      'name':       [/naitwa|jina\s*langu|my\s*name\s*is|i\s*am\s*called/i],
      'location':   [/naishi|ninaishi|i\s*live|ninakaa|from\s*\w+|mtaa|kaunti|county/i],
      'gender':     [/mwanaume|mwanamke|male|female|man|woman|boy|girl/i],
      'occupation': [/nafanya|kazi|work|farmer|mkulima|teacher|nurse|driver/i],
      'crop':       [/mahindi|unga|corn|maize|ngano|wheat|sukari|beans|maharagwe/i],
      'income':     [/\d+\s*(ksh|kes|shilling|bob|mapato)/i, /earn|pata|income/i],
    };

    features.forEach(f => {
      const key = f.toLowerCase();
      const pats = patterns[key] || [new RegExp(key, 'i')];
      results[f] = pats.some(p => p.test(lower)) ? 'detected' : null;
    });
    return results;
  };

  // ── Pre-submission quality gate ──
  const getQualityWarnings = () => {
    if (!domainFeatures.length) return [];
    const warnings = [];

    // Use transcript text if available, fall back to segments
    const textToCheck = transcription && transcription.length > 20 ? transcription : '';
    const detected    = textToCheck
      ? detectFeaturesInText(textToCheck, domainFeatures)
      : {};

    // Also check Ollama segments if available
    const segmentNulls = segments
      ? Object.entries(segments).filter(([k,v]) => !v || v === 'Not mentioned' || v === 'null' || v === 'Not Mentioned').map(([k]) => k)
      : [];

    // Combine both checks — a feature passes if detected in text OR in segments
    const missingFields = domainFeatures.filter(f => {
      const inSegment  = !segmentNulls.includes(f);
      const inText     = detected[f] === 'detected';
      return !inSegment && !inText;
    });

    const missingPercent = (missingFields.length / domainFeatures.length) * 100;

    if (missingPercent > 50) {
      warnings.push({
        type: 'high_null',
        message: `${missingFields.length} of ${domainFeatures.length} features not captured`,
        fields: missingFields
      });
    } else if (missingPercent > 0) {
      warnings.push({
        type: 'partial_null',
        message: `${missingFields.length} feature${missingFields.length > 1 ? 's' : ''} may be missing`,
        fields: missingFields
      });
    }
    return warnings;
  };

  const qualityWarnings = segments ? getQualityWarnings() : [];
  const qualityBlocked  = qualityWarnings.some(w => w.type === 'high_null');

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
  const [domainFeatures, setDomainFeatures] = useState([]);
  const [segments, setSegments] = useState({}); // features to collect
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
    // ── Feature conversation guide ──
  const generateConversationGuide = (features) => {
    const questionMap = {
      'age':        'Ask: "How old are you?" / "Una miaka mingapi?"',
      'name':       'Ask: "What is your name?" / "Jina lako ni nani?"',
      'location':   'Ask: "Where do you live?" / "Unaishi wapi?"',
      'gender':     'Ask: "Are you male or female?" / "Wewe ni mwanaume au mwanamke?"',
      'occupation': 'Ask: "What do you do for work?" / "Unafanya kazi gani?"',
      'crop':       'Ask: "What crops do you grow?" / "Unalima nini?"',
      'income':     'Ask: "What is your monthly income?" / "Mapato yako ni ngapi?"',
      'education':  'Ask: "What is your education level?" / "Elimu yako ni ngapi?"',
    };
    return features.map(f => ({
      feature: f,
      question: questionMap[f.toLowerCase()] || `Ask about: ${f}`
    }));
  };

  // ── Client-side feature detection ──
  const detectFeaturesInText = (text, features) => {
    if (!text || !features.length) return {};
    const lower = text.toLowerCase();
    const results = {};
    const patterns = {
      'age':        [/\d+\s*(miaka|years|yr|yrs|years old)/i, /nina\s*miaka/i, /am\s*\d+/i],
      'name':       [/naitwa|jina\s*langu|my\s*name\s*is|i\s*am\s*called/i],
      'location':   [/naishi|ninaishi|i\s*live|ninakaa|from\s*\w+|mtaa|kaunti|county/i],
      'gender':     [/mwanaume|mwanamke|male|female|man|woman|boy|girl/i],
      'occupation': [/nafanya|kazi|work|farmer|mkulima|teacher|nurse|driver/i],
      'crop':       [/mahindi|unga|corn|maize|ngano|wheat|sukari|beans|maharagwe/i],
      'income':     [/\d+\s*(ksh|kes|shilling|bob|mapato)/i, /earn|pata|income/i],
    };

    features.forEach(f => {
      const key = f.toLowerCase();
      const pats = patterns[key] || [new RegExp(key, 'i')];
      results[f] = pats.some(p => p.test(lower)) ? 'detected' : null;
    });
    return results;
  };

  // ── Pre-submission quality gate ──
  const getQualityWarnings = () => {
    if (!domainFeatures.length) return [];
    const warnings = [];

    // Use transcript text if available, fall back to segments
    const textToCheck = transcription && transcription.length > 20 ? transcription : '';
    const detected    = textToCheck
      ? detectFeaturesInText(textToCheck, domainFeatures)
      : {};

    // Also check Ollama segments if available
    const segmentNulls = segments
      ? Object.entries(segments).filter(([k,v]) => !v || v === 'Not mentioned' || v === 'null' || v === 'Not Mentioned').map(([k]) => k)
      : [];

    // Combine both checks — a feature passes if detected in text OR in segments
    const missingFields = domainFeatures.filter(f => {
      const inSegment  = !segmentNulls.includes(f);
      const inText     = detected[f] === 'detected';
      return !inSegment && !inText;
    });

    const missingPercent = (missingFields.length / domainFeatures.length) * 100;

    if (missingPercent > 50) {
      warnings.push({
        type: 'high_null',
        message: `${missingFields.length} of ${domainFeatures.length} features not captured`,
        fields: missingFields
      });
    } else if (missingPercent > 0) {
      warnings.push({
        type: 'partial_null',
        message: `${missingFields.length} feature${missingFields.length > 1 ? 's' : ''} may be missing`,
        fields: missingFields
      });
    }
    return warnings;
  };

  const qualityWarnings = segments ? getQualityWarnings() : [];
  const qualityBlocked  = qualityWarnings.some(w => w.type === 'high_null');

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
    // ── Feature conversation guide ──
  const generateConversationGuide = (features) => {
    const questionMap = {
      'age':        'Ask: "How old are you?" / "Una miaka mingapi?"',
      'name':       'Ask: "What is your name?" / "Jina lako ni nani?"',
      'location':   'Ask: "Where do you live?" / "Unaishi wapi?"',
      'gender':     'Ask: "Are you male or female?" / "Wewe ni mwanaume au mwanamke?"',
      'occupation': 'Ask: "What do you do for work?" / "Unafanya kazi gani?"',
      'crop':       'Ask: "What crops do you grow?" / "Unalima nini?"',
      'income':     'Ask: "What is your monthly income?" / "Mapato yako ni ngapi?"',
      'education':  'Ask: "What is your education level?" / "Elimu yako ni ngapi?"',
    };
    return features.map(f => ({
      feature: f,
      question: questionMap[f.toLowerCase()] || `Ask about: ${f}`
    }));
  };

  // ── Client-side feature detection ──
  const detectFeaturesInText = (text, features) => {
    if (!text || !features.length) return {};
    const lower = text.toLowerCase();
    const results = {};
    const patterns = {
      'age':        [/\d+\s*(miaka|years|yr|yrs|years old)/i, /nina\s*miaka/i, /am\s*\d+/i],
      'name':       [/naitwa|jina\s*langu|my\s*name\s*is|i\s*am\s*called/i],
      'location':   [/naishi|ninaishi|i\s*live|ninakaa|from\s*\w+|mtaa|kaunti|county/i],
      'gender':     [/mwanaume|mwanamke|male|female|man|woman|boy|girl/i],
      'occupation': [/nafanya|kazi|work|farmer|mkulima|teacher|nurse|driver/i],
      'crop':       [/mahindi|unga|corn|maize|ngano|wheat|sukari|beans|maharagwe/i],
      'income':     [/\d+\s*(ksh|kes|shilling|bob|mapato)/i, /earn|pata|income/i],
    };

    features.forEach(f => {
      const key = f.toLowerCase();
      const pats = patterns[key] || [new RegExp(key, 'i')];
      results[f] = pats.some(p => p.test(lower)) ? 'detected' : null;
    });
    return results;
  };

  // ── Pre-submission quality gate ──
  const getQualityWarnings = () => {
    if (!domainFeatures.length) return [];
    const warnings = [];

    // Use transcript text if available, fall back to segments
    const textToCheck = transcription && transcription.length > 20 ? transcription : '';
    const detected    = textToCheck
      ? detectFeaturesInText(textToCheck, domainFeatures)
      : {};

    // Also check Ollama segments if available
    const segmentNulls = segments
      ? Object.entries(segments).filter(([k,v]) => !v || v === 'Not mentioned' || v === 'null' || v === 'Not Mentioned').map(([k]) => k)
      : [];

    // Combine both checks — a feature passes if detected in text OR in segments
    const missingFields = domainFeatures.filter(f => {
      const inSegment  = !segmentNulls.includes(f);
      const inText     = detected[f] === 'detected';
      return !inSegment && !inText;
    });

    const missingPercent = (missingFields.length / domainFeatures.length) * 100;

    if (missingPercent > 50) {
      warnings.push({
        type: 'high_null',
        message: `${missingFields.length} of ${domainFeatures.length} features not captured`,
        fields: missingFields
      });
    } else if (missingPercent > 0) {
      warnings.push({
        type: 'partial_null',
        message: `${missingFields.length} feature${missingFields.length > 1 ? 's' : ''} may be missing`,
        fields: missingFields
      });
    }
    return warnings;
  };

  const qualityWarnings = segments ? getQualityWarnings() : [];
  const qualityBlocked  = qualityWarnings.some(w => w.type === 'high_null');

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

      mediaRecorder.current.onstop = async () => {
        // Create audio blob from collected array chunks
        const audioBlob = new Blob(audioChunks.current, { type: 'audio/webm' });
        
        if (navigator.onLine) {
          setTranscription('Processing pipeline running... Extracting audio markers.');
          await uploadAudioToServer(audioBlob);
        } else {
          // Fallback smoothly to Dexie IndexedDB cache layer if working offline in the field
          await saveToLocalDatabase(audioBlob);
        }
      };
    }
  };

  // ─── Cloud Sync Pipeline ───
  const uploadAudioToServer = async (blob) => {
    try {
      const formData = new FormData();
      // Ensure file name maps seamlessly to your secure_filename parameters
      formData.append('file', blob, `audio_capture_${Date.now()}.webm`);
      formData.append('referenceNumber', ref);
      formData.append('domain_id', domainId);

      const response = await fetch('http://localhost:8000/api/core/transcribe', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}` // JWT token mapping to @jwt_required()
        },
        body: formData,
      });

      const data = await response.json();

      if (response.ok) {
        setTranscription(data.transcription || 'Audio parsed successfully.');
        alert(`✅ Engine Match Success!\nProgress: ${data.progress.percent}% of domain goal target.`);
      } else {
        setTranscription(`Quality Gate Flagged: ${data.error || 'Processing failure'}`);
      }
    } catch (err) {
      console.error('Server sync failure:', err);
      setTranscription('Connection broken. Saving backup draft copy into local vault.');
      await saveToLocalDatabase(blob);
    }
  };

  // ─── Dexie Local Cache Backup ───
  const saveToLocalDatabase = async (blob) => {
    try {
      await db.drafts.add({
        task: task || 'General Data Collection',
        audioBlob: blob,
        duration: formatTime(duration),
        timestamp: Date.now(),
        refNum: ref,
        domainId: domainId
      });
      alert('📡 Device working offline. Audio copy safely archived inside Local Vault.');
    } catch (err) {
      console.error('IndexedDB write failure:', err);
    }
  };
  // ── Feature conversation guide ──
  const generateConversationGuide = (features) => {
    const questionMap = {
      'age':        'Ask: "How old are you?" / "Una miaka mingapi?"',
      'name':       'Ask: "What is your name?" / "Jina lako ni nani?"',
      'location':   'Ask: "Where do you live?" / "Unaishi wapi?"',
      'gender':     'Ask: "Are you male or female?" / "Wewe ni mwanaume au mwanamke?"',
      'occupation': 'Ask: "What do you do for work?" / "Unafanya kazi gani?"',
      'crop':       'Ask: "What crops do you grow?" / "Unalima nini?"',
      'income':     'Ask: "What is your monthly income?" / "Mapato yako ni ngapi?"',
      'education':  'Ask: "What is your education level?" / "Elimu yako ni ngapi?"',
    };
    return features.map(f => ({
      feature: f,
      question: questionMap[f.toLowerCase()] || `Ask about: ${f}`
    }));
  };

  // ── Client-side feature detection ──
  const detectFeaturesInText = (text, features) => {
    if (!text || !features.length) return {};
    const lower = text.toLowerCase();
    const results = {};
    const patterns = {
      'age':        [/\d+\s*(miaka|years|yr|yrs|years old)/i, /nina\s*miaka/i, /am\s*\d+/i],
      'name':       [/naitwa|jina\s*langu|my\s*name\s*is|i\s*am\s*called/i],
      'location':   [/naishi|ninaishi|i\s*live|ninakaa|from\s*\w+|mtaa|kaunti|county/i],
      'gender':     [/mwanaume|mwanamke|male|female|man|woman|boy|girl/i],
      'occupation': [/nafanya|kazi|work|farmer|mkulima|teacher|nurse|driver/i],
      'crop':       [/mahindi|unga|corn|maize|ngano|wheat|sukari|beans|maharagwe/i],
      'income':     [/\d+\s*(ksh|kes|shilling|bob|mapato)/i, /earn|pata|income/i],
    };

    features.forEach(f => {
      const key = f.toLowerCase();
      const pats = patterns[key] || [new RegExp(key, 'i')];
      results[f] = pats.some(p => p.test(lower)) ? 'detected' : null;
    });
    return results;
  };

  // ── Pre-submission quality gate ──
  const getQualityWarnings = () => {
    if (!domainFeatures.length) return [];
    const warnings = [];

    // Use transcript text if available, fall back to segments
    const textToCheck = transcription && transcription.length > 20 ? transcription : '';
    const detected    = textToCheck
      ? detectFeaturesInText(textToCheck, domainFeatures)
      : {};

    // Also check Ollama segments if available
    const segmentNulls = segments
      ? Object.entries(segments).filter(([k,v]) => !v || v === 'Not mentioned' || v === 'null' || v === 'Not Mentioned').map(([k]) => k)
      : [];

    // Combine both checks — a feature passes if detected in text OR in segments
    const missingFields = domainFeatures.filter(f => {
      const inSegment  = !segmentNulls.includes(f);
      const inText     = detected[f] === 'detected';
      return !inSegment && !inText;
    });

    const missingPercent = (missingFields.length / domainFeatures.length) * 100;

    if (missingPercent > 50) {
      warnings.push({
        type: 'high_null',
        message: `${missingFields.length} of ${domainFeatures.length} features not captured`,
        fields: missingFields
      });
    } else if (missingPercent > 0) {
      warnings.push({
        type: 'partial_null',
        message: `${missingFields.length} feature${missingFields.length > 1 ? 's' : ''} may be missing`,
        fields: missingFields
      });
    }
    return warnings;
  };

  const qualityWarnings = segments ? getQualityWarnings() : [];
  const qualityBlocked  = qualityWarnings.some(w => w.type === 'high_null');

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

        {/* ── Conversation Guide — shown before recording ── */}
        {!isRecording && duration === 0 && domainFeatures.length > 0 && (
          <div style={{
            background: '#f0fdf4', border: '1px solid #bbf7d0',
            borderRadius: 14, padding: '1rem 1.25rem', marginBottom: 16
          }}>
            <p style={{ fontSize: '0.72rem', fontWeight: 800, color: '#489c8c', textTransform: 'uppercase', letterSpacing: '0.08em', margin: '0 0 10px' }}>
              📋 Conversation Guide — Cover These Points
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {generateConversationGuide(domainFeatures).map(({ feature, question }) => (
                <div key={feature} style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
                  <span style={{
                    background: '#489c8c', color: 'white',
                    padding: '2px 8px', borderRadius: 9999,
                    fontSize: '0.65rem', fontWeight: 800, flexShrink: 0, marginTop: 1
                  }}>
                    {feature}
                  </span>
                  <span style={{ fontSize: '0.8rem', color: '#475569', lineHeight: 1.4 }}>
                    {question}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

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
  className="save-btn"
  disabled={isRecording || duration === 0}
  onClick={() => navigate('/userDashboard')}
>
  Return to Dashboard
</button>
                  </div>
      </div>
    </div>
  );
};

export default CollectorHome;
