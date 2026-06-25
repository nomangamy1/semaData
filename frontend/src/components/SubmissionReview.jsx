import React, { useState, useEffect, useRef } from 'react';
import './SubmissionReview.css';

const BASE = 'http://localhost:8000/api';

const statusColor = {
  pending_review: { bg: '#fef3c7', color: '#92400e', label: 'Pending Review' },
  processing:     { bg: '#dbeafe', color: '#1e40af', label: 'Processing'     },
  Verified:       { bg: '#d1fae5', color: '#065f46', label: 'Verified'       },
  AI_Passed:      { bg: '#d1fae5', color: '#065f46', label: 'AI Passed'      },
  rejected:       { bg: '#fee2e2', color: '#991b1b', label: 'Rejected'       },
};

const StatusBadge = ({ status }) => {
  const s = statusColor[status] || { bg: '#f1f5f9', color: '#475569', label: status };
  return (
    <span style={{
      background: s.bg, color: s.color,
      padding: '3px 10px', borderRadius: 9999,
      fontSize: 11, fontWeight: 800,
      textTransform: 'uppercase', letterSpacing: '0.05em'
    }}>
      {s.label}
    </span>
  );
};

const AudioPlayer = ({ path, datasetId }) => {
  const audioRef = useRef(null);
  const [playing, setPlaying] = useState(false);
  const token = localStorage.getItem('token');
  const src = `${BASE}/admin/submission/${datasetId}/audio?token=${token}`;

  const toggle = () => {
    if (!audioRef.current) return;
    if (playing) { audioRef.current.pause(); }
    else         { audioRef.current.play();  }
    setPlaying(!playing);
  };

  return (
    <div className="audio-player-wrapper">
      <button onClick={toggle} className={`btn-audio ${playing ? 'pause' : 'play'}`}>
        {playing ? '⏸ Pause' : '▶ Play'}
      </button>
      <audio ref={audioRef} src={src} onEnded={() => setPlaying(false)} style={{ display: 'none' }} />
      <span className="audio-id">ID: {datasetId}</span>
    </div>
  );
};

const SubmissionReview = () => {
  const [submissions, setSubmissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [processing, setProcessing] = useState(null);
  const [rejectId, setRejectId] = useState(null);
  const [rejectReason, setRejectReason] = useState('');
  const [filter, setFilter] = useState('pending_review');

  const token = localStorage.getItem('token');
  
  // Directly pull the ID from local storage set during login
  const currentUserId = parseInt(localStorage.getItem('userId'));
  
  const fetchSubmissions = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${BASE}/admin/submissions?status=${filter}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      setSubmissions(data.submissions || []);
    } catch (e) { setError('Failed to load submissions.'); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchSubmissions(); }, [filter]);

  const handleApprove = async (datasetId) => {
    // 1. Lock first
    const lockRes = await fetch(`${BASE}/admin/submission/${datasetId}/lock`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` }
    });

    if (!lockRes.ok) {
      alert('This submission is currently being reviewed by another admin.');
      fetchSubmissions();
      return;
    }

    // 2. Then Approve
    setProcessing(datasetId);
    try {
      const res = await fetch(`${BASE}/admin/submission/${datasetId}/approve`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }
      });
      if (!res.ok) throw new Error('Approval failed');
      setSubmissions(prev => prev.filter(s => s.id !== datasetId));
    } catch (e) { alert(e.message); }
    finally { setProcessing(null); }
  };

  const handleReject = async () => {
    if (!rejectId) return;
    setProcessing(rejectId);
    try {
      const res = await fetch(`${BASE}/admin/submission/${rejectId}/reject`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: rejectReason })
      });
      if (!res.ok) throw new Error('Rejection failed');
      setSubmissions(prev => prev.filter(s => s.id !== rejectId));
      setRejectId(null);
    } catch (e) { alert(e.message); }
    finally { setProcessing(null); }
  };

  return (
    <div className="submission-review-container">
      <div className="review-header">
        <h2 className="review-title">Submission Review Queue</h2>
        <div className="filter-controls">
          {['pending_review', 'AI_Passed', 'Verified', 'rejected'].map(s => (
            <button key={s} onClick={() => setFilter(s)} className={`btn ${filter === s ? 'active' : ''}`}>
              {statusColor[s]?.label}
            </button>
          ))}
          <button onClick={fetchSubmissions} className="btn">↺ Refresh</button>
        </div>
      </div>

      <div className="card-list">
        {submissions.map(sub => (
          <div key={sub.id} className="submission-card">
            <div className="card-header">
              <span>#{sub.id} - {sub.contributor_name}</span>
              <StatusBadge status={sub.status} />
            </div>

            {sub.is_locked && sub.locked_by !== currentUserId && (
              <div className="locked-badge" style={{color: 'red', fontWeight: 'bold'}}>
                Locked by another Admin
              </div>
            )}

            <div className="card-body">
              <AudioPlayer path={sub.audio_file_path} datasetId={sub.id} />
              <div className="transcription-box">{sub.transcription}</div>
            </div>

            {sub.status === 'pending_review' && (
              <div className="card-footer">
                <button onClick={() => setRejectId(sub.id)} className="btn btn-reject">Reject</button>
                <button
                  disabled={processing === sub.id || sub.is_locked}
                  className={`btn ${sub.is_locked ? 'btn-disabled' : 'btn-approve'}`}
                  onClick={() => handleApprove(sub.id)}
                >
                  {sub.is_locked ? 'In Review...' : '✓ Approve & Credit'}
                </button>
              </div>
            )}
          </div>
        ))}
      </div>
      
      {/* ... (Keep your existing Reject Modal code here) ... */}
    </div>
  );
};

export default SubmissionReview;
