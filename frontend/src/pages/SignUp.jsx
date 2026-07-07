import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { User, Briefcase, Globe, ArrowRight, CheckCircle2 } from 'lucide-react';
import './signUp.css';
import GoogleAuthButton from '../components/GoogleAuthButton';

const INTERESTS = [
  'Machine Learning', 'Natural Language Processing', 'AI Research',
  'Data Science', 'African Languages & Linguistics',
  'Speech Recognition', 'Academic Research', 'Other',
];

const ROLE_HINTS = {
  community:    'For data scientists, ML engineers, researchers and linguists. Free, no vetting, instant access.',
  User:         'For field agents and local language speakers. Requires an approved application and a reference number from a domain owner.',
  domainowner: 'For researchers, NGOs and organisations that need African language datasets. Requires payment after signup.',
};

const Signup = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const paramRole = searchParams.get('role');
  const initialRole = paramRole === 'collector' ? 'User'
    : paramRole === 'domainowner' ? 'domainowner'
    : 'community';

  const [role, setRole] = useState(initialRole);
  const [spotsLeft, setSpotsLeft] = useState(null);

  useEffect(() => {
    fetch('http://localhost:8000/api/Auth/community-spots')
      .then(r => r.json())
      .then(d => setSpotsLeft(d.spots_remaining))
      .catch(() => {});
  }, []);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');
  const [formData, setFormData] = useState({
    first_name: '', last_name: '', email: '', username: '',
    password: '', reference_number: '', domain_name: '',
    field_name: 'Health', area_of_interest: '',
  });

  const handleChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    let payload = {
      role,
      first_name: formData.first_name,
      email: formData.email,
      password: formData.password,
    };

    if (role === 'community') {
      payload.last_name = formData.last_name;
      payload.area_of_interest = formData.area_of_interest;
    } else if (role === 'User') {
      payload.second_name = formData.last_name;
      payload.reference_number = formData.reference_number;
      payload.domain_name = formData.domain_name;
    } else if (role === 'domainowner') {
      payload.last_name = formData.last_name;
      payload.username = formData.username;
      payload.domain_field = formData.field_name;
    }

    try {
      const response = await fetch('http://localhost:8000/api/Auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await response.json();

      if (response.ok) {
        localStorage.clear();
        if (data.token) localStorage.setItem('token', data.token);
        if (data.ownerId) localStorage.setItem('ownerId', String(data.ownerId));
        else if (data.userId) localStorage.setItem('ownerId', String(data.userId));
        localStorage.setItem('userRole', data.role || role);
        localStorage.setItem('username', formData.first_name);
        
        // Instant Redirection to the lowercase path matching App.jsx
        if ((data.role || role) === 'community') {
          navigate('/community');
        } else {
          setSubmitted(true);
        }
      } else {
        if (data.error === 'founding_limit_reached') {
          setError('🎯 SemaData V1 founding community is full (500 members). You\'ve been added to the V2 waitlist.');
        } else {
          setError(data.error || 'Signup failed. Please try again.');
        }
      }
    } catch {
      setError('Server is down. Please try again later.');
    }
  };

  const roleLabel = { community: 'Community', User: 'Collector', domainowner: 'Domain Owner' }[role];

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
          <small>
            Click the link to verify your account, then log in to continue.
          </small>
          <button className="signup-btn" onClick={() => navigate('/login')}>
            Go to Login
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="signup-page">
      <div className="signup-hero">
        <h2>Join <span>semaData</span></h2>
        <p>The bridge between local insights and global standards.</p>
      </div>

      <div className="signup-card">
        <div className="signup-role-toggle">
          <button type="button"
            className={`signup-role-btn ${role === 'community' ? 'active' : ''}`}
            onClick={() => setRole('community')}>
            <Globe size={16} /> Community
          </button>
          <button type="button"
            className={`signup-role-btn ${role === 'User' ? 'active' : ''}`}
            onClick={() => setRole('User')}>
            <User size={16} /> Collector
          </button>
          <button type="button"
            className={`signup-role-btn ${role === 'domainowner' ? 'active' : ''}`}
            onClick={() => setRole('domainowner')}>
            <Briefcase size={16} /> Domain Owner
          </button>
        </div>

        <p className="signup-role-hint">{ROLE_HINTS[role]}</p>
        {role === 'community' && spotsLeft !== null && (
          <div style={{
            display: 'flex', alignItems: 'center', gap: 8,
            background: spotsLeft < 50 ? '#fef3c7' : '#f0fdf4',
            border: `1px solid ${spotsLeft < 50 ? '#fde68a' : '#bbf7d0'}`,
            borderRadius: 10, padding: '8px 14px', marginBottom: 12,
            fontSize: '0.82rem', fontWeight: 700,
            color: spotsLeft < 50 ? '#92400e' : '#166534'
          }}>
            {spotsLeft < 50 ? '🔥' : '✅'} {spotsLeft} founding spots remaining out of 500
          </div>
        )}

        {error && <div className="signup-error">{error}</div>}

        {(role === 'community' || role === 'domainowner') && (
          <>
            <GoogleAuthButton
              mode="signup"
              role={role === 'domainowner' ? 'domain_owner' : 'community'}
              onSuccess={(data) => setSubmitted(true)}
              onError={(msg) => setError(msg)}
            />
            <div style={{
              display: 'flex', alignItems: 'center', gap: 12,
              margin: '1.25rem 0', color: '#94a3b8', fontSize: '0.8rem', fontWeight: 600
            }}>
              <div style={{ flex: 1, height: 1, background: '#e2e8f0' }} />
              or continue with email
              <div style={{ flex: 1, height: 1, background: '#e2e8f0' }} />
            </div>
          </>
        )}

        <form className="signup-form" onSubmit={handleSubmit}>
          <div className="signup-grid">
            <div className="signup-field">
              <label className="signup-label">First Name</label>
              <input className="signup-input" name="first_name" type="text" required
                placeholder="e.g. Amina" onChange={handleChange} />
            </div>
            <div className="signup-field">
              <label className="signup-label">Last Name</label>
              <input className="signup-input" name="last_name" type="text"
                required={role !== 'User'}
                placeholder="e.g. Wanjiku" onChange={handleChange} />
            </div>
          </div>

          {role === 'domainowner' && (
            <div className="signup-field">
              <label className="signup-label">Username</label>
              <input className="signup-input" name="username" type="text" required
                placeholder="e.g. aminaw" onChange={handleChange} />
            </div>
          )}

          <div className="signup-field">
            <label className="signup-label">Email Address</label>
            <input className="signup-input" name="email" type="email" required
              placeholder="you@example.com" onChange={handleChange} />
          </div>

          {role === 'community' && (
            <div className="signup-field">
              <label className="signup-label">Area of Interest</label>
              <select className="signup-select" name="area_of_interest"
                value={formData.area_of_interest} onChange={handleChange} required>
                <option value="">Select your focus area...</option>
                {INTERESTS.map(i => <option key={i} value={i}>{i}</option>)}
              </select>
            </div>
          )}

          {role === 'User' && (
            <>
              <div className="signup-field">
                <label className="signup-label">Invite Reference Number</label>
                <input className="signup-input" name="reference_number" required
                  placeholder="e.g. AGRI--ABC123" onChange={handleChange} />
                <small className="signup-hint">
                  Issued by your domain owner after your application is approved.
                </small>
              </div>
              <div className="signup-field">
                <label className="signup-label">Domain Name</label>
                <input className="signup-input" name="domain_name"
                  placeholder="The name of the project" onChange={handleChange} />
              </div>
            </>
          )}

          {role === 'domainowner' && (
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
              placeholder="Min. 8 characters" onChange={handleChange} />
          </div>

          <button type="submit" className="signup-btn">
            Create {roleLabel} Account <ArrowRight size={18} />
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
