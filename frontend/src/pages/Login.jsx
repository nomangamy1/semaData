import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { Database, Loader2, CheckCircle, AlertCircle, Briefcase, User, Globe } from 'lucide-react';
import './Login.css';
import GoogleAuthButton from '../components/GoogleAuthButton';

const Login = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const params = new URLSearchParams(location.search);
  const justVerified = params.get('verified') === 'true';
  const expiredVerification = params.get('error') === 'expired';
  const nextPath     = params.get('next') || null;
  const isFresh      = params.get('fresh') === 'true';

  // ✅ Synchronous clear — runs before useEffect so auto-redirect finds no token
  if (isFresh) localStorage.clear();

  const [loginRole, setLoginRole] = useState(expiredVerification ? 'collector' : 'domainowner');
  const [formData, setFormData]   = useState({ email: '', password: '', reference_number: '' });
  const [error, setError]         = useState(
    expiredVerification
      ? 'This verification link expired. Sign in as a collector with your email, password, and application reference number to request a new link.'
      : ''
  );
  const [needsVerification, setNeedsVerification] = useState(expiredVerification);
  const [resendMessage, setResendMessage] = useState('');
  const [isResending, setIsResending] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Auto-redirect if already logged in
  useEffect(() => {
    if (isFresh || expiredVerification) return;
    const token    = localStorage.getItem('token');
    const userRole = localStorage.getItem('userRole');
    if (!token || !userRole) return;
    const role = userRole.toLowerCase();
    if      (role === 'admin')                                  navigate('/AdminDashboard',  { replace: true });
    else if (role === 'domain_owner' || role === 'domainowner') navigate('/Dashboard',       { replace: true });
    else if (role === 'user')                                   navigate('/userDashboard',   { replace: true });
    else if (role === 'community')                              navigate('/community',       { replace: true });
  }, [navigate, isFresh, expiredVerification]);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    setResendMessage('');
  };

  const handleResendVerification = async () => {
    setError('');
    setResendMessage('');
    if (!formData.email.trim() || !formData.password || !formData.reference_number.trim()) {
      setError('Enter your collector email, password, and application reference number first.');
      return;
    }

    setIsResending(true);
    try {
      const response = await fetch('/api/Auth/resend-verification', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: formData.email.trim(),
          password: formData.password,
          reference_number: formData.reference_number.trim(),
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Could not resend the verification link.');
      setResendMessage(data.message || 'Check your email for a new verification link.');
      setNeedsVerification(false);
    } catch (resendError) {
      setError(resendError.message || 'Could not resend the verification link.');
    } finally {
      setIsResending(false);
    }
  };

const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    // 🎯 Grab raw values directly from the DOM to bypass any state/tab bugs
    const formEl = e.currentTarget;
    const rawData = new FormData(formEl);
    const emailVal = rawData.get('email')?.trim();
    const passwordVal = rawData.get('password');
    const refVal = rawData.get('reference_number')?.trim();

    const backendRole = loginRole === 'collector' ? 'user' : loginRole;

    const payload = {
      email:    emailVal,
      password: passwordVal,
      role:     backendRole,
      ...(loginRole === 'collector' && { reference_number: refVal })
    };

    try {
      const response = await fetch('/api/Auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (response.ok) {
        if (!data.token || !data.role) {
          throw new Error('Login succeeded, but the server did not return a session. Please try again or contact support.');
        }

        localStorage.clear();
        localStorage.setItem('token', data.token);
        localStorage.setItem('userRole', data.role);
        localStorage.setItem('username', data.fullName || data.username || '');

        if (data.userId) {
          localStorage.setItem('userId', String(data.userId));
          localStorage.setItem('ownerId', String(data.userId));
        }
        if (data.domainId) localStorage.setItem('domainId', String(data.domainId));
        if (data.domain) localStorage.setItem('domain', data.domain);
        if (data.referenceNumber) localStorage.setItem('referenceNumber', data.referenceNumber);

        const role = (data.role || '').toLowerCase();
        const destination = role === 'admin'
          ? '/AdminDashboard'
          : role === 'domain_owner' || role === 'domainowner'
            ? '/Dashboard'
            : role === 'user' || role === 'collector'
              ? '/userDashboard'
              : role === 'community'
                ? '/community'
                : null;

        if (!destination) {
          localStorage.clear();
          throw new Error('Unknown role received from server.');
        }
        navigate(nextPath || destination, { replace: true });
      } else {
        setError(data.error || 'Login failed.');
        setNeedsVerification(response.status === 403 && data.error?.toLowerCase().includes('not verified'));
      }
    } catch {
      setError('Server connection failed.');
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
        {resendMessage && <p className="verified-banner-sub" role="status">{resendMessage}</p>}

        {(loginRole === 'community' || loginRole === 'domainowner') && (
          <>
            <GoogleAuthButton
              mode="login"
              role={loginRole === 'domainowner' ? 'domain_owner' : 'community'}
              onSuccess={(data) => {
                const role = (data.role || '').toLowerCase();
                if (role === 'admin') navigate('/AdminDashboard', { replace: true });
                else if (role === 'domain_owner') navigate('/Dashboard', { replace: true });
                else if (role === 'community') navigate('/community', { replace: true });
              }}
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
              <label className="login-label">Application Reference Number</label>
              <input className="login-input" name="reference_number" type="text" required
                placeholder="e.g. AGRI--ABC123" onChange={handleChange} />
              <p className="login-input-hint">Use the reference number in your application approval email.</p>
            </div>
          )}

          <div style={{ textAlign: "right", marginBottom: 8 }}>
            <a href="/forgot-password" style={{ fontSize: "0.8rem", color: "#489c8c", fontWeight: 600, textDecoration: "none" }}>
              Forgot password?
            </a>
          </div>
          <button type="submit" className="login-btn" disabled={isLoading}>
            {isLoading
              ? <><Loader2 size={18} className="spin" /> Signing in...</>
              : 'Sign In'
            }
          </button>
          {loginRole === 'collector' && needsVerification && (
            <button
              type="button"
              className="login-btn"
              onClick={handleResendVerification}
              disabled={isLoading || isResending}
            >
              {isResending ? 'Sending verification link…' : 'Resend verification link'}
            </button>
          )}
        </form>

        <p className="login-footer">
          Don't have an account? <Link to="/signup">Sign up</Link>
        </p>
      </div>
    </div>
  );
};

export default Login;
