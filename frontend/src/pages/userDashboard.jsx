import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import CollectorProfileTab from '../components/CollectorProfileTab';
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
  const [activeTab, setActiveTab] = useState('overview');
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
    <div className="ud-page">

      {/* ── Compact Header ── */}
      <header className="ud-header">
        <div className="ud-header-left">
          <div className="ud-avatar">{getCollectorInitials(sessionData.name)}</div>
          <div>
            <p className="ud-name">{sessionData.name || 'Collector'}</p>
            <p className="ud-domain">{sessionData.domain || 'Unassigned'}</p>
          </div>
        </div>
        <div className="ud-ref">
          <span className="ud-ref-label">Ref</span>
          <span className="ud-ref-code">{sessionData.refNum || 'N/A'}</span>
        </div>
      </header>

      {/* ── Sync Banner ── */}
      {drafts.length > 0 && (
        <div className="ud-sync-banner">
          <span>⚠️ {drafts.length} draft{drafts.length > 1 ? 's' : ''} pending sync</span>
          <button onClick={handleSyncData} disabled={isSyncing} className="ud-sync-btn">
            {isSyncing ? 'Syncing...' : 'Sync Now'}
          </button>
        </div>
      )}

      {/* ── Tab Navigation ── */}
      <div className="ud-tabs">
        {['overview', 'wallet', 'profile'].map(tab => (
          <button
            key={tab}
            className={"ud-tab " + (activeTab === tab ? "ud-tab--active" : "")}
            onClick={() => setActiveTab(tab)}
          >
            {tab === 'overview' ? '🎙️ Overview' : tab === 'wallet' ? '💰 Wallet' : '👤 Profile'}
          </button>
        ))}
      </div>

      {/* ── Tab Content ── */}
      <main className="ud-content">

        {/* OVERVIEW */}
        {activeTab === 'overview' && (
          <div className="ud-section">
            <div className="ud-task-card">
              <div className="ud-task-header">
                <div>
                  <h2 className="ud-task-title">{activeTask.title || 'No task assigned'}</h2>
                  <span className="ud-domain-pill">{sessionData.domain}</span>
                </div>
              </div>
              <p className="ud-task-desc">{activeTask.description || 'Your assigned data collection task will appear here.'}</p>
              <div className="ud-progress-track">
                <div className="ud-progress-fill" style={{ width: `${progressPercent}%` }} />
              </div>
              <p className="ud-progress-text">
                {activeTask.currentCount || 0} of {activeTask.targetCount || 0} submissions — {progressPercent}%
              </p>
              <button className="ud-launch-btn" onClick={handleStartRecording}>
                🚀 Start Recording Session
              </button>
            </div>

            {drafts.length > 0 && (
              <div className="ud-drafts-card">
                <h3 className="ud-card-title">Local Drafts</h3>
                <div className="ud-draft-list">
                  {drafts.map(draft => (
                    <div key={draft.id} className="ud-draft-row">
                      <div>
                        <p className="ud-draft-name">{draft.task || 'Recording'}</p>
                        <p className="ud-draft-meta">{draft.duration} · {new Date(draft.timestamp).toLocaleTimeString()}</p>
                      </div>
                      <span className="ud-draft-pill">Pending</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="ud-tips-card">
              <h3 className="ud-card-title">Recording Tips</h3>
              <ul className="ud-tips-list">
                <li>Find a quiet space with background noise below 20dB</li>
                <li>Test your microphone before starting</li>
                <li>Speak clearly and at a natural pace</li>
                <li>Never share your reference number</li>
              </ul>
            </div>
          </div>
        )}

        {/* WALLET */}
        {activeTab === 'wallet' && (
          <CollectorProfileTab
            sessionData={sessionData}
            onLogout={handleLogout}
            walletOnly={true}
          />
        )}

        {/* PROFILE */}
        {activeTab === 'profile' && (
          <CollectorProfileTab
            sessionData={sessionData}
            onLogout={handleLogout}
            profileOnly={true}
          />
        )}

      </main>
    </div>
  );
};

export default UserDashboard;
