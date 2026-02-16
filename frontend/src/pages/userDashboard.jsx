import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './userDashboard.css';
import db from './db';

const UserDashboard = () => {
  const navigate = useNavigate();

  // --- State Management ---
  const [isLoading, setIsLoading] = useState(true);
  const [drafts, setDrafts] = useState([]); // Added to store actual draft objects
  const [isSyncing, setIsSyncing] = useState(false);
  
  const [sessionData, setSessionData] = useState({
    name: '',
    email: '',
    domain: '',
    refNum: ''
  });

  const [activeTask, setActiveTask] = useState({
    title: "",
    language: "",
    targetCount: 0,
    currentCount: 0,
    description: ""
  });

  // --- Helper Functions ---
  const getCollectorInitials = (name) => {
    if (!name || name === 'Collector') return "??";
    const nameParts = name.trim().split(" ");
    return nameParts.length >= 2 
      ? (nameParts[0][0] + nameParts[nameParts.length - 1][0]).toUpperCase()
      : name.substring(0, 2).toUpperCase();
  };

  // --- Sync Logic ---
  const handleSyncData = async () => {
    const domainId = localStorage.getItem('domainId');
    if (drafts.length === 0) return;
    
    try {
      setIsSyncing(true);
      
      for (const draft of drafts) {
        if (!draft.ref || draft.ref ==='N/A') {
          console.warn(`Skipping draft ${draft.id} due to missing reference number.`);
          continue;
        }
        const formData = new FormData();
        formData.append("id",localStorage.getItem('domainId'));
        // Append the binary audio blob and metadata
        formData.append("file", draft.audioBlob, `sync_${draft.timestamp}.webm`);
        formData.append("referenceNumber", draft.ref);
        formData.append("task", draft.task);
        formData.append("user_id", localStorage.getItem('userId'));

        const response = await fetch('http://localhost:8000/api/core/transcribe', {
          method: 'POST',
          body: formData, // Send as FormData, not JSON.stringify
        });
        if (!domainId) {
          throw new Error("Domain ID is missing. Cannot sync data.");
        }

        if (response.ok) {
          await db.drafts.delete(draft.id);
        }
      }
      
      // Refresh local list after sync attempt
      const remainingDrafts = await db.drafts.toArray();
      setDrafts(remainingDrafts);
      
      if(remainingDrafts.length === 0) {
        alert("✅ All local records synced successfully!");
      }
    } catch (error) {
      console.error("Sync failed:", error);
      alert("Sync encountered an error. Check your connection.");
    } finally {
      setIsSyncing(false);
    }
  };

  // --- Effects ---
  useEffect(() => {
    const initializeDashboard = async () => {
      const userId = localStorage.getItem('userId');
      
      if (!userId) {
        navigate('/login');
        return;
      }

      try {
        // 1. Fetch Local Drafts (Full objects to show in UI)
        const localDrafts = await db.drafts.toArray();
        setDrafts(localDrafts);

        // 2. Fetch Profile from API
        const response = await fetch(`http://localhost:8000/api/main/collector-stats/${userId}`);
        if (!response.ok) throw new Error("Failed to fetch profile");
        
        const data = await response.json();
        setSessionData(data.sessionData);
        setActiveTask(data.activeTask);
      } catch (error) {
        console.error("Initialization Error:", error);
      } finally {
        setIsLoading(false);
      }
    };

    initializeDashboard();
  }, [navigate]);

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
    ? Math.round((activeTask.currentCount / activeTask.targetCount) * 100) 
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

  return (
    <div className="dashboard-wrapper">
      {/* Sync Warning Banner */}
      {drafts.length > 0 && (
        <div className='sync-warning-box'>
          <span>⚠️ {drafts.length} records are saved locally. Connect to the internet to sync!</span>
          <button onClick={handleSyncData} disabled={isSyncing} className="sync-btn">
            {isSyncing ? "Syncing..." : "Sync Now"}
          </button>
        </div>
      )}

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
            <span className="id-number">{sessionData.refNum}</span>
          </div>
        </div>
      </header>

      <div className="dashboard-grid">
        <div className="main-content-flow">
          {/* Active Task Section */}
          <section className="task-card">
            <h2>Work Allocation</h2>
            <div className="active-assignment-box">
              <div className="assignment-header">
                <h3>{activeTask.title}</h3>
                <span className="domain-pill">{sessionData.domain}</span>
              </div>
              <p className="task-meta"><strong>Dialect Focus:</strong> {activeTask.language}</p>
              <p className="task-desc">{activeTask.description}</p>
              
              <div className="progress-container">
                <div className="progress-fill" style={{ width: `${progressPercent}%` }}></div>
              </div>
              <p className="progress-text">
                {progressPercent}% Complete — {activeTask.currentCount} of {activeTask.targetCount} records ingested
              </p>
            </div>

            <button className="start-session-btn" onClick={handleStartRecording}>
              🚀 Launch Collection Engine
            </button>
          </section>

          {/* NEW: Local Drafts Vault Section */}
          {drafts.length > 0 && (
            <section className="drafts-vault-card">
              <h3>Local Vault (Pending Sync)</h3>
              <div className="draft-list">
                {drafts.map((draft) => (
                  <div key={draft.id} className="draft-item">
                    <div className="draft-info">
                      <span className="draft-task">{draft.task}</span>
                      <span className="draft-meta">{draft.duration} • {new Date(draft.timestamp).toLocaleTimeString()}</span>
                    </div>
                    <span className="draft-status-pill">Pending</span>
                  </div>
                ))}
              </div>
            </section>
          )}

          <section className="profile-details-card">
            <h3>Account Metadata</h3>
            <div className="info-grid">
               <div className="info-item"><label>Full Name</label><p>{sessionData.name}</p></div>
               <div className="info-item"><label>Email Address</label><p>{sessionData.email}</p></div>
               <div className="info-item"><label>Role</label><p>Data Collection Agent</p></div>
               <div className="info-item"><label>Authentication Mode</label><p>Reference-Bound</p></div>
            </div>
            <button className="logout-link" onClick={handleLogout}>Sign out of system</button>
          </section>
        </div>

        <aside className="instructions-aside">
          <h4>Operational Guidelines</h4>
          <ul>
            <li><strong>Environment:</strong> Maintain background noise below 20dB.</li>
            <li><strong>Hardware:</strong> Calibrate microphone input before starting.</li>
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