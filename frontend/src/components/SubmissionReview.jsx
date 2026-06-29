import React, { useState, useEffect, useRef } from 'react';
import './SubmissionReview.css';
import EmptyState from './EmptyState';

const BASE = 'http://localhost:8000/api';

const statusColor = {
  pending_review: { bg: '#fef3c7', color: '#92400e', label: 'Pending Review' },
  processing:     { bg: '#dbeafe', color: '#1e40af', label: 'Processing'       },
  Verified:       { bg: '#d1fae5', color: '#065f46', label: 'Verified'         },
  AI_Passed:      { bg: '#d1fae5', color: '#065f46', label: 'AI Passed'        },
  rejected:       { bg: '#fee2e2', color: '#991b1b', label: 'Rejected'         },
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
  const [filter, setFilter] = useState('pending_review');
  const [editing, setEditing] = useState(null);
  const [editData, setEditData] = useState({});
  const [setRejectId] = useState(null);

  const token = localStorage.getItem('token');
  
  const startEdit = (sub) => {
    setEditing(sub.id);
    setEditData({ transcription: sub.transcription || sub.combined_text || "" });
  };

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
    setProcessing(datasetId);
    try {
      const res = await fetch(`${BASE}/admin/submission/${datasetId}/approve`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }
      });
      if (res.ok) setSubmissions(prev => prev.filter(s => s.id !== datasetId));
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
        {submissions.length > 0 ? (
          submissions.map(sub => (
            <div key={sub.id} className="submission-card">
              <div className="card-body">
                <AudioPlayer path={sub.audio_file_path} datasetId={sub.id} />
                {editing === sub.id ? (
                  <textarea
                    rows={4} value={editData.transcription}
                    onChange={e => setEditData(d => ({ ...d, transcription: e.target.value }))}
                    style={{ width: '100%', padding: '10px', borderRadius: 10, border: '1.5px solid #489c8c' }}
                  />
                ) : (
                  <div className="transcription-box">
                    {sub.transcription || sub.combined_text || 'No transcription yet.'}
                  </div>
                )}
              </div>
              <div className="card-footer">
                {editing === sub.id ? (
                  <>
                    <button onClick={() => setEditing(null)} className="btn">Cancel</button>
                    <button className="btn btn-approve">Save Changes</button>
                  </>
                ) : (
                  <>
                    <button onClick={() => startEdit(sub)} className="btn">Edit</button>
                    <button className="btn btn-reject">Reject</button>
                    <button disabled={processing === sub.id} className="btn btn-approve" onClick={() => handleApprove(sub.id)}>
                      {processing === sub.id ? 'Processing...' : '✓ Approve'}
                    </button>
                  </>
                )}
              </div>
            </div>
          ))
        ) : (
          <EmptyState message="No pending submissions found." actionLabel="Refresh" onAction={fetchSubmissions} />
        )}
      </div>
    </div>
  );
};

export default SubmissionReview;
