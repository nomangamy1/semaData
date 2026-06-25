import React from 'react';
import './walletView.css';
const PersonalProfile = ({ sessionData, onLogout }) => {
  return (
    <section className="profile-details-card">
      <h3>Account Metadata</h3>
      <div className="info-grid">
        <div className="info-item"><label>Full Name</label><p>{sessionData.name}</p></div>
        <div className="info-item"><label>Email Address</label><p>{sessionData.email || 'N/A'}</p></div>
        <div className="info-item"><label>Assigned Domain</label><p>{sessionData.domain}</p></div>
        <div className="info-item"><label>Role</label><p>Data Collection Agent</p></div>
        <div className="info-item"><label>Auth Mode</label><p>Reference-Bound JWT</p></div>
      </div>
      <button className="logout-link" onClick={onLogout}>Sign out of system</button>
    </section>
  );
};

export default PersonalProfile;
