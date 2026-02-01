

import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './userDashboard.css';

const UserDashboard = () => {
  const navigate = useNavigate();

  // 1. Initialize State from LocalStorage
  const [sessionData, setSessionData] = useState({
    name: localStorage.getItem('userName') || 'Collector',
    email: localStorage.getItem('userEmail') || 'Not Set',
    domain: localStorage.getItem('domain') || 'General',
    refNum: localStorage.getItem('refNum') || 'N/A'
  });

  // 2. Active Task Simulation (This will later be an API call)
  const [activeTask, setActiveTask] = useState({
    title: "Community Health Outreach",
    language: "Swahili (Bariandi Dialect)",
    targetCount: 50,
    currentCount: 12,
    description: "Collecting patient feedback on maternal health services in rural regions."
  });

  // Calculate progress percentage
  const progressPercent = Math.round((activeTask.currentCount / activeTask.targetCount) * 100);

  const handleStartRecording = () => {
    // Navigate to Collector Home / Engine
    navigate('/collectHome', { 
      state: { 
        task: activeTask.title, 
        ref: sessionData.refNum 
      } 
    });
  };

  const handleLogout = () => {
    localStorage.clear();
    navigate('/login');
  };

  return (
    <div className="dashboard-wrapper">
      {/* --- HEADER SECTION --- */}
      <header className="dashboard-header">
        <div className="profile-intro">
          <h1>Collector Profile</h1>
          <p className="status-badge">● Active System Agent</p>
        </div>
        
        <div className="profile-id-shield">
          <div className="id-content">
             <span className="id-label">OFFICIAL REF</span>
             <span className="id-number">{sessionData.refNum}</span>
          </div>
        </div>
      </header>

      {/* --- MAIN CONTENT GRID --- */}
      <div className="dashboard-grid">
        
        <div className="main-content-flow">
          {/* TASK ALLOCATION CARD */}
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
                <div 
                  className="progress-fill" 
                  style={{ width: `${progressPercent}%` }}
                ></div>
              </div>
              <p className="progress-text">
                {progressPercent}% Complete — {activeTask.currentCount} of {activeTask.targetCount} records ingested
              </p>
            </div>

            <button className="start-session-btn" onClick={handleStartRecording}>
              🚀 Launch Collection Engine
            </button>
          </section>

          {/* PROFILE DETAILS SECTION */}
          <section className="profile-details-card">
            <h3>Account Metadata</h3>
            <div className="info-grid">
               <div className="info-item">
                  <label>Full Name</label>
                  <p>{sessionData.name}</p>
               </div>
               <div className="info-item">
                  <label>Email Address</label>
                  <p>{sessionData.email}</p>
               </div>
               <div className="info-item">
                  <label>Role</label>
                  <p>Data Collection Agent</p>
               </div>
               <div className="info-item">
                  <label>Authentication Mode</label>
                  <p>Reference-Bound (Secure)</p>
               </div>
            </div>
            <button className="logout-link" onClick={handleLogout}>Sign out of system</button>
          </section>
        </div>

        {/* --- INSTRUCTIONS SIDEBAR --- */}
        <aside className="instructions-aside">
          <h4>Operational Guidelines</h4>
          <ul>
            <li><strong>Environment:</strong> Maintain background noise below 20dB.</li>
            <li><strong>Hardware:</strong> Calibrate microphone input before starting.</li>
            <li><strong>Integrity:</strong> Cross-verify dialect markers in Whisper output.</li>
            <li><strong>Security:</strong> Do not share your Reference Number with unauthorized users.</li>
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