import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import WalletTab from '../components/WalletTab';
import PersonalProfile from '../components/PersonalProfile';
import './userDashboard.css';
import db from './db';

const UserDashboard = () => {
  const navigate = useNavigate();

  // ✅ Token and identity mapping checks
  const token = localStorage.getItem('token');
  const userId = localStorage.getItem('ownerId'); 
  const domainId = localStorage.getItem('domainId');

  // Dashboard Data and UI Loading states
  const [isLoading, setIsLoading] = useState(true);
  const [drafts, setDrafts] = useState([]);
  const [isSyncing, setIsSyncing] = useState(false);
  const [error, setError] = useState('');

  // Financial State Management Context
  const [finance, setFinance] = useState({
    currentBalance: 0.0,
    baseEarnings: 0.0,
    penaltyDeduction: 0.0,
    totalApproved: 0,
    totalRejected: 0,
    rejectionRate: 0.0
  });

  // Profile data context state mapping
  const [sessionData, setSessionData] = useState({
    name: '', email: '', domain: '', refNum: ''
  });

  const [activeTask, setActiveTask] = useState({
    title: '', language: '', targetCount: 0, currentCount: 0, description: ''
  });

  const getCollectorInitials = (name) => {
    if (!name) return '??';
    const parts = name.trim().split(' ');
    return parts.length >= 2
      ? (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
      : name.substring(0, 2).toUpperCase();
  };

  // ─── Sync drafts to cloud ───
  const handleSyncData = async () => {
    if (drafts.length === 0 || !token) return;
    setIsSyncing(true);

    try {
      for (const draft of drafts) {
        if (!draft.refNum || draft.refNum === 'N/A') {
          console.warn(`Skipping draft ${draft.id} — missing reference number.`);
          continue;
        }

        const formData = new FormData();
        formData.append('file', draft.audioBlob, `sync_${draft.timestamp}.webm`);
        formData.append('referenceNumber', draft.refNum);   
        formData.append('domain_id', draft.domainId || domainId); 

        const response = await fetch('http://localhost:8000/api/core/transcribe', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`  
          },
          body: formData,
        });

        if (response.ok) {
          await db.drafts.delete(draft.id);
        } else {
          const err = await response.json();
          console.error(`Draft ${draft.id} sync failed:`, err.error);
        }
      }

      const remaining = await db.drafts.toArray();
      setDrafts(remaining);

      if (remaining.length === 0) {
        alert('✅ All local records synced successfully!');
        fetchFinancialSummary();
      } else {
        alert(`⚠️ ${remaining.length} drafts still pending. Some may have failed.`);
      }
    } catch (err) {
      console.error('Sync error:', err);
      alert('Sync encountered an error. Check your connection.');
    } finally {
      setIsSyncing(false);
    }
  };

  // ─── Fetch Financial Metrics ───
  const fetchFinancialSummary = async () => {
    try {
      const response = await fetch('http://localhost:8000/api/main/finance-summary', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        setFinance({
          currentBalance: data.current_balance,
          baseEarnings: data.base_earnings,
          penaltyDeduction: data.penalty_deduction,
          totalApproved: data.quality_metrics?.approved_entries || 0,
          totalRejected: data.quality_metrics?.rejected_entries || 0,
          rejectionRate: data.quality_metrics?.rejection_rate || 0.0
        });
      }
    } catch (err) {
      console.error("Error connecting to payment API ledger paths:", err);
    }
  };

  // ─── Initialize dashboard ───
  useEffect(() => {
    if (!token || !userId) {
      navigate('/login');
      return;
    }

    const initializeDashboard = async () => {
      try {
        const localDrafts = await db.drafts.toArray();
        setDrafts(localDrafts);

        const response = await fetch(
          `http://localhost:8000/api/main/collector-stats/${userId}`,
          {
            headers: {
              'Authorization': `Bearer ${token}`,  
              'Content-Type': 'application/json'
            }
          }
        );

        if (response.status === 401 || response.status === 403) {
          localStorage.removeItem('token');
          navigate('/login');
          return;
        }

        if (!response.ok) {
          const errData = await response.json();
          throw new Error(errData.error || 'Failed to fetch profile');
        }

        const data = await response.json();
        setSessionData(data.sessionData || { total_hours: 0, submissions: 0 });
        setActiveTask(data.activeTask);

        if (data.sessionData?.refNum) {
          localStorage.setItem('referenceNumber', data.sessionData.refNum);
        }

        // Parallel thread for updating financial indicators
        await fetchFinancialSummary();

      } catch (err) {
        console.error('Dashboard init error:', err);
        setError(err.message || 'Could not load your dashboard.');
      } finally {
        setIsLoading(false);
      }
    };

    initializeDashboard();
  }, [token, userId, navigate]);

  const handleLogout = () => {
    localStorage.clear();
    navigate('/login');
  };

  const handleStartRecording = () => {
    navigate('/collectorHome', {
      state: { task: activeTask.title, ref: sessionData.refNum }
    });
  };

  const progressPercent = activeTask.targetCount > 0
    ? Math.min(Math.round((activeTask.currentCount / activeTask.targetCount) * 100), 100)
    : 0;

  if (isLoading) {
    return (
      <div className="dashboard-wrapper">
        <div className="loader-container">
          <p>Initializing Secure Connection to SemaData Engine...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="dashboard-wrapper">
        <div className="loader-container" style={{ textAlign: 'center' }}>
          <p style={{ color: '#ef4444', fontWeight: 'bold', marginBottom: '1rem' }}>{error}</p>
          <button className="start-session-btn" onClick={() => navigate('/login')}>
            Back to Login
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="dashboard-wrapper">

      {/* Sync Warning Banner */}
      {drafts.length > 0 && (
        <div className="sync-warning-box">
          <span>⚠️ {drafts.length} record{drafts.length > 1 ? 's' : ''} saved locally. Connect to sync.</span>
          <button onClick={handleSyncData} disabled={isSyncing} className="sync-btn">
            {isSyncing ? 'Syncing...' : 'Sync Now'}
          </button>
        </div>
      )}

      {/* Header */}
      <header className="dashboard-header">
        <div className="profile-intro">
          <div className="collector-avatar">{getCollectorInitials(sessionData.name)}</div>
          <div className="header-text-group">
            <h1>Collector Profile</h1>
            <p className="status-badge">● System Agent: Verified</p>
          </div>
        </div>

        <div className="profile-id-shield">
          <div className="id-content">
            <span className="id-label">Official Domain Reference</span>
            <span className="id-number">{sessionData.refNum || 'N/A'}</span>
          </div>
        </div>
      </header>

      {/* Modular Balance Card Panel Component Integration */}
      <WalletTab finance={finance} token={token} onRefresh={fetchFinancialSummary} />

      <div className="dashboard-grid">
        <div className="main-content-flow">

          {/* Active Task Allocation */}
          <section className="task-card">
            <h2>Work Allocation</h2>
            <div className="active-assignment-box">
              <div className="assignment-header">
                <h3>{activeTask.title || 'No task assigned'}</h3>
                <span className="domain-pill">{sessionData.domain}</span>
              </div>
              {activeTask.language && (
                <p className="task-meta"><strong>Dialect Focus:</strong> {activeTask.language}</p>
              )}
              <p className="task-desc">{activeTask.description}</p>

              <div className="progress-container">
                <div className="progress-fill" style={{ width: `${progressPercent}%` }} />
              </div>
              <p className="progress-text">
                {activeTask.currentCount} / {activeTask.targetCount} — {progressPercent}% Complete
              </p>
            </div>

            <button className="start-session-btn" onClick={handleStartRecording}>
              🚀 Launch Collection Engine
            </button>
          </section>

          {/* Local Drafts Vault */}
          {drafts.length > 0 && (
            <section className="drafts-vault-card">
              <h3>Local Vault (Pending Sync)</h3>
              <div className="draft-list">
                {drafts.map((draft) => (
                  <div key={draft.id} className="draft-item">
                    <div className="draft-info">
                      <span className="draft-task">{draft.task}</span>
                      <span className="draft-meta">
                        {draft.duration} • {new Date(draft.timestamp).toLocaleTimeString()}
                      </span>
                    </div>
                    <span className="draft-status-pill">Pending</span>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Modular Account Personal Details Meta Card Component Integration */}
          <PersonalProfile sessionData={sessionData} onLogout={handleLogout} />
        </div>

        {/* Sidebar Guidelines Panel Layout */}
        <aside className="instructions-aside">
          <h4>Operational Guidelines</h4>
          <ul>
            <li><strong>Environment:</strong> Background noise below 20dB.</li>
            <li><strong>Hardware:</strong> Calibrate microphone before starting.</li>
            <li><strong>Integrity:</strong> Cross-verify dialect markers.</li>
            <li><strong>Security:</strong> Do not share your Reference Number.</li>
          </ul>
          <div className="support-box">
            <p>Need Technical Support?</p>
            <small>Contact your Domain Owner</small>
          </div>
        </aside>
      </div>

    </div>
  );
};

export default UserDashboard;
