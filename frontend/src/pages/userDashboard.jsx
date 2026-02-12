import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './userDashboard.css';



const UserDashboard = () => {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(true);
  const getCollectorInitials = (name) => {
  if (!name || name === 'Collector') return "??"; 
  
  const nameParts = name.trim().split(" ");
  
  if (nameParts.length >= 2) {
    // Takes first letter of first name and first letter of last name
    return (nameParts[0][0] + nameParts[nameParts.length - 1][0]).toUpperCase();
  }
  // If only one name is provided, take the first two letters
  return name.substring(0, 2).toUpperCase();
};
  
  // 1. Initial Empty State
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

  // 2. Fetch Data on Component Mount
  useEffect(() => {
    const fetchProfile = async () => {
      // We assume the userID was saved to localStorage during login
      const userId = localStorage.getItem('userId');
      
      if (!userId) {
        navigate('/login');
        return;
      }

      try {
        const response = await fetch(`http://localhost:8000/api/main/collector-stats/${userId}`);
        if (!response.ok) throw new Error("Failed to fetch profile");
        
        const data = await response.json();
        
        // Sync state with API response
        setSessionData(data.sessionData);
        setActiveTask(data.activeTask);
      } catch (error) {
        console.error("API Sync Error:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchProfile();
  }, [navigate]);

  // 3. Loading State Handler
  if (isLoading) {
    return (
      <div className="dashboard-wrapper">
        <div className="loader-container">
          <p>Initializing Secure Connection to SemaData Engine...</p>
        </div>
      </div>
    );
  }

  // Calculate progress percentage dynamically
  const progressPercent = activeTask.targetCount > 0 
    ? Math.round((activeTask.currentCount / activeTask.targetCount) * 100) 
    : 0;

  const handleStartRecording = () => {
    navigate('/collectorHome', { 
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
      <header className="dashboard-header">
        <div className="profile-intro">
         <div className="collector-avatar">
      {getCollectorInitials(sessionData.name)}
    </div>
    
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