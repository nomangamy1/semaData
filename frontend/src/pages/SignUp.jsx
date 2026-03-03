import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { User, Briefcase, ArrowRight, CheckCircle2 } from 'lucide-react';
import './signUp.css';

const Signup = () => {
  const navigate = useNavigate();
  const [role, setRole] = useState('User');
  const [submitted, setSubmitted] = useState(false);
  const [formData, setFormData] = useState({
    first_name: '', last_name: '', email: '', username: '',
    password: '', reference_number: '', domain_name: '', field_name: 'Health',
  });

  const handleChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    const payload = {
      role,
      first_name: formData.first_name,
      [role === 'domainowner' ? 'last_name' : 'second_name']: formData.last_name,
      email: formData.email,
      password: formData.password,
      ...(role === 'domainowner'
        ? { username: formData.username, domain_field: formData.field_name }
        : { reference_number: formData.reference_number, domain_name: formData.domain_name }
      )
    };

    try {
      const response = await fetch('http://localhost:8000/api/Auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await response.json();

      if (response.ok) {
        if (data.token) localStorage.setItem('token', data.token);
        if (data.ownerId) localStorage.setItem('ownerId', String(data.ownerId));
        else if (data.userId) localStorage.setItem('ownerId', String(data.userId));
        setSubmitted(true);
      } else {
        alert(`Error: ${data.error}`);
      }
    } catch {
      alert('Server is down. Please try again later.');
    }
  };

  // ─── Success Screen ───
  if (submitted) {
    return (
      <div className="signup-success">
        <div className="signup-success-card">
          <div className="signup-success-icon">
            <CheckCircle2 size={36} color="#489c8c" />
          </div>
          <h2>Check Your Email</h2>
          <p>We sent a verification link to</p>
          <p><strong>{formData.email}</strong></p>
          <small>Click the link to verify your account, then log in to continue.</small>
          <Link to="/login" className="signup-btn">Go to Login</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="signup-page">
      {/* Hero */}
      <div className="signup-hero">
        <h2>Join <span>semaData</span></h2>
        <p>The bridge between local insights and global standards.</p>
      </div>

      <div className="signup-card">
        <div className="signup-role-toggle">
          <button type="button"
            className={`signup-role-btn ${role === 'User' ? 'active' : ''}`}
            onClick={() => setRole('User')}>
            <User size={17} /> Data Collector
          </button>
          <button type="button"
            className={`signup-role-btn ${role === 'domainowner' ? 'active' : ''}`}
            onClick={() => setRole('domainowner')}>
            <Briefcase size={17} /> Domain Owner
          </button>
        </div>

        <form className="signup-form" onSubmit={handleSubmit}>
          {/* Name row */}
          <div className="signup-grid">
            <div className="signup-field">
              <label className="signup-label">First Name</label>
              <input className="signup-input" name="first_name" type="text" required
                placeholder="e.g. Jane" onChange={handleChange} />
            </div>
            <div className="signup-field">
              <label className="signup-label">{role === 'domainowner' ? 'Last Name' : 'Second Name'}</label>
              <input className="signup-input" name="last_name" type="text" required
                placeholder="e.g. Doe" onChange={handleChange} />
            </div>
          </div>

          {role === 'domainowner' && (
            <div className="signup-field">
              <label className="signup-label">Username</label>
              <input className="signup-input" name="username" type="text" required
                placeholder="e.g. janedoe" onChange={handleChange} />
            </div>
          )}

          <div className="signup-field">
            <label className="signup-label">Email Address</label>
            <input className="signup-input" name="email" type="email" required
              placeholder="you@example.com" onChange={handleChange} />
          </div>

          {role === 'User' ? (
            <>
              <div className="signup-field">
                <label className="signup-label">Invite Reference Number</label>
                <input className="signup-input" name="reference_number"
                  placeholder="e.g. AGRI--ABC123" onChange={handleChange} />
              </div>
              <div className="signup-field">
                <label className="signup-label">Domain Name</label>
                <input className="signup-input" name="domain_name"
                  placeholder="The name of the project" onChange={handleChange} />
              </div>
            </>
          ) : (
            <div className="signup-field">
              <label className="signup-label">Domain Category</label>
              <select className="signup-select" name="field_name" onChange={handleChange}>
                <option value="Health">Health / Medical</option>
                <option value="Agriculture">Agriculture</option>
                <option value="Linguistics">Linguistics</option>
                <option value="Research">Research</option>
              </select>
            </div>
          )}

          <div className="signup-field">
            <label className="signup-label">Password</label>
            <input className="signup-input" name="password" type="password" required
              placeholder="••••••••" onChange={handleChange} />
          </div>

          <button type="submit" className="signup-btn">
            Create {role === 'domainowner' ? 'Admin' : 'Collector'} Account <ArrowRight size={18} />
          </button>
        </form>

        <p className="signup-footer">
          Already a member? <Link to="/login?fresh=true">Log in here</Link>
        </p>
      </div>
    </div>
  );
};

export default Signup;
