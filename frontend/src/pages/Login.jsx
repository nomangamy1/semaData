import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { Database, Loader2, CheckCircle, AlertCircle, Briefcase, User, Globe } from 'lucide-react';
import './Login.css';

const Login = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const params = new URLSearchParams(location.search);
  const justVerified = params.get('verified') === 'true';
  const nextPath     = params.get('next') || null;
  const isFresh      = params.get('fresh') === 'true';

  // ✅ Synchronous clear — runs before useEffect so auto-redirect finds no token
  if (isFresh) localStorage.clear();

  const [loginRole, setLoginRole] = useState('domainowner');
  const [formData, setFormData]   = useState({ email: '', password: '', reference_number: '' });
  const [error, setError]         = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Auto-redirect if already logged in
  useEffect(() => {
    if (isFresh) return;
    const token    = localStorage.getItem('token');
    const userRole = localStorage.getItem('userRole');
    if (!token || !userRole) return;
    const role = userRole.toLowerCase();
    if      (role === 'admin')                                  navigate('/AdminDashboard',  { replace: true });
    else if (role === 'domain_owner' || role === 'domainowner') navigate('/Dashboard',       { replace: true });
    else if (role === 'user')                                   navigate('/userDashboard',   { replace: true });
    else if (role === 'community')                              navigate('/community',       { replace: true });
  }, [navigate, isFresh]);

  const handleChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    const payload = {
      email:    formData.email.trim(),
      password: formData.password,
      // Only send reference_number for collectors — backend uses its absence
      // to distinguish community members from collectors
      ...(loginRole === 'collector' && { reference_number: formData.reference_number.trim() })
    };

    try {
      const response = await fetch('http://localhost:8000/api/Auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (response.ok) {
        localStorage.clear();
        localStorage.setItem('token',    data.token);
        localStorage.setItem('userRole', data.role || '');
        localStorage.setItem('username', data.fullName || data.username || '');

        if (data.userId)   localStorage.setItem('ownerId',   String(data.userId));
        if (data.domainId) localStorage.setItem('domainId',  String(data.domainId));
        if (data.domain)   localStorage.setItem('domain',    data.domain);
        if (data.referenceNumber) localStorage.setItem('referenceNumber', data.referenceNumber);

        // nextPath comes from email verification link e.g. ?next=/community
        if (nextPath) { navigate(nextPath, { replace: true }); return; }

        const role = (data.role || '').toLowerCase();
        if      (role === 'admin')                                  navigate('/AdminDashboard',  { replace: true });
        else if (role === 'domain_owner' || role === 'domainowner') navigate('/Dashboard',       { replace: true });
        else if (role === 'user')                                   navigate('/userDashboard',   { replace: true });
        else if (role === 'community')                              navigate('/community',       { replace: true });
        else setError('Unknown role received from server.');
      } else {
        setError(data.error || 'Login failed. Please check your credentials.');
      }
    } catch {
      setError('Server connection failed. Is the backend running?');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="login-page">
      <div className="login-card">
        <div className="login-logo">
          <Database size={32} /> semaData
        </div>

        {justVerified && (
          <div className="verified-banner">
            <CheckCircle size={20} style={{ flexShrink: 0, marginTop: 1 }} />
            <div>
              <p className="verified-banner-title">Email Verified Successfully!</p>
              <p className="verified-banner-sub">
                {loginRole === 'community'
                  ? 'Log in to start posting in the community.'
                  : 'Log in now to continue setting up your account.'}
              </p>
            </div>
          </div>
        )}

        <h2 className="login-heading">Welcome back</h2>
        <p className="login-subheading">Sign in to your semaData account</p>

        {/* ── Role toggle — now three options ── */}
        <div className="role-toggle">
          <button type="button"
            className={`role-toggle-btn ${loginRole === 'community' ? 'active' : ''}`}
            onClick={() => setLoginRole('community')}>
            <Globe size={15} /> Community
          </button>
          <button type="button"
            className={`role-toggle-btn ${loginRole === 'domainowner' ? 'active' : ''}`}
            onClick={() => setLoginRole('domainowner')}>
            <Briefcase size={15} /> Domain Owner
          </button>
          <button type="button"
            className={`role-toggle-btn ${loginRole === 'collector' ? 'active' : ''}`}
            onClick={() => setLoginRole('collector')}>
            <User size={15} /> Collector
          </button>
        </div>

        {error && (
          <div className="login-error">
            <AlertCircle size={16} /> {error}
          </div>
        )}

        <form className="login-form" onSubmit={handleSubmit}>
          <div className="login-field">
            <label className="login-label">Email</label>
            <input className="login-input" name="email" type="email" required
              placeholder="you@example.com" onChange={handleChange} />
          </div>

          <div className="login-field">
            <label className="login-label">Password</label>
            <input className="login-input" name="password" type="password" required
              placeholder="••••••••" onChange={handleChange} />
          </div>

          {/* Reference number only shown for collectors */}
          {loginRole === 'collector' && (
            <div className="login-field">
              <label className="login-label">Domain Reference Number</label>
              <input className="login-input" name="reference_number" type="text" required
                placeholder="e.g. AGRI--ABC123" onChange={handleChange} />
              <p className="login-input-hint">Provided by your Domain Owner</p>
            </div>
          )}

          <button type="submit" className="login-btn" disabled={isLoading}>
            {isLoading
              ? <><Loader2 size={18} className="spin" /> Signing in...</>
              : 'Sign In'
            }
          </button>
        </form>

        <p className="login-footer">
          Don't have an account? <Link to="/signup">Sign up</Link>
        </p>
      </div>
    </div>
  );
};

export default Login;