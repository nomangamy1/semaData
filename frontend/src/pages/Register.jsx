import React, { useState } from 'react';
import './Register.css'; 

const Register = () => {
  const [isAdmin, setIsAdmin] = useState(false);

  return (
    <div className="register-page">
      <nav style={{ width: '100%', padding: '20px' }}>
        <strong>semaData</strong>
      </nav>

      <h1>Join SemaData</h1>

      <div className="toggle-container">
        <button 
          className={`toggle-btn ${!isAdmin ? 'active' : ''}`}
          onClick={() => setIsAdmin(false)}
        >
          Data Collector
        </button>
        <button 
          className={`toggle-btn ${isAdmin ? 'active' : ''}`}
          onClick={() => setIsAdmin(true)}
        >
          Domain Owner 
        </button>
      </div>

      <div className="form-container">
        <h2>{isAdmin ? 'Admin Sign Up' : 'Collector Sign Up'}</h2>
        <form style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
          <input type="text" placeholder="Full Name" style={inputStyle} />
          <input type="email" placeholder="Email Address" style={inputStyle} />
          <input type="password" placeholder="Password" style={inputStyle} />
          <button style={submitButtonStyle}>Create Account</button>
        </form>
      </div>
    </div>
  );
};

// Small helper for internal styles if needed
const inputStyle = { padding: '12px', borderRadius: '8px', border: '1px solid #ddd' };
const submitButtonStyle = { 
  backgroundColor: '#489c8c', 
  color: 'white', 
  padding: '12px', 
  border: 'none', 
  borderRadius: '8px', 
  fontWeight: 'bold',
  cursor: 'pointer' 
};

export default Register;