import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import './walletView.css';

const CollectorProfile = () => {
  const navigate = useNavigate();
  
  // ─── Component States ───
  const [profile, setProfile] = useState({
    fullName: '',
    email: '',
    username: ''
  });

  const [finance, setFinance] = useState({
    grossEarnings: 0,
    totalWithdrawn: 0,
    currentBalance: 0,
    minimumPayoutThreshold: 100 // KES 100 / $1.00 minimum payout rule
  });

  const [gateway, setGateway] = useState('MPESA'); 
  const [mpesaPhone, setMpesaPhone] = useState('');
  const [paypalEmail, setPaypalEmail] = useState('');
  const [withdrawAmount, setWithdrawAmount] = useState('');
  
  const [statusMessage, setStatusMessage] = useState({ type: '', text: '' });
  const [loading, setLoading] = useState(false);

  // ─── Fetch Profile and Live Financial Summary ───
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      navigate('/login');
      return;
    }

    const initializeDashboard = async () => {
      try {
        const response = await fetch('http://localhost:8000/api/collector/finance-summary', {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (response.ok) {
          const data = await response.json();
          
          setFinance({
            grossEarnings: data.gross_earnings,
            totalWithdrawn: data.total_withdrawn,
            currentBalance: data.current_balance,
            minimumPayoutThreshold: data.minimum_payout_threshold
          });

          if (data.profile) {
            setProfile({
              fullName: data.profile.full_name || '',
              email: data.profile.email || '',
              username: data.profile.username || ''
            });
            setGateway(data.profile.preferred_gateway || 'MPESA');
            setMpesaPhone(data.profile.mpesa_number || '');
            setPaypalEmail(data.profile.paypal_email || '');
          }
        } else {
          setStatusMessage({ type: 'error', text: 'Failed to synchronize account metrics.' });
        }
      } catch (err) {
        setStatusMessage({ type: 'error', text: 'Unable to connect to SemaData core services.' });
      }
    };

    initializeDashboard();
  }, [navigate]);

  // ─── Handle Locking Payment Gateway Config ───
  const handleUpdateGateway = async (e) => {
    e.preventDefault();
    setStatusMessage({ type: '', text: '' });
    setLoading(true);

    // Frontend validation rules
    if (gateway === 'MPESA') {
      if (!mpesaPhone.startsWith('254') || mpesaPhone.length !== 12) {
        setStatusMessage({ type: 'error', text: 'M-Pesa number must start with 254 and be exactly 12 digits (e.g., 254712345678).' });
        setLoading(false);
        return;
      }
    } else if (gateway === 'PAYPAL' && !paypalEmail.includes('@')) {
      setStatusMessage({ type: 'error', text: 'Please enter a valid PayPal email address.' });
      setLoading(false);
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const response = await fetch('http://localhost:8000/api/collector/update-gateway', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          preferred_gateway: gateway,
          mpesa_number: gateway === 'MPESA' ? mpesaPhone : null,
          paypal_email: gateway === 'PAYPAL' ? paypalEmail : null
        })
      });

      if (response.ok) {
        setStatusMessage({ type: 'success', text: '✅ Payout destination configurations successfully locked.' });
      } else {
        setStatusMessage({ type: 'error', text: 'Failed to update gateway profile on the server.' });
      }
    } catch (err) {
      setStatusMessage({ type: 'error', text: 'Network request dropped.' });
    } finally {
      setLoading(false);
    }
  };

  // ─── Handle Withdrawal Point Request ───
  const handleWithdrawRequest = async (e) => {
    e.preventDefault();
    setStatusMessage({ type: '', text: '' });
    const amount = parseFloat(withdrawAmount);

    if (isNaN(amount) || amount < finance.minimumPayoutThreshold) {
      setStatusMessage({ type: 'error', text: `Withdrawal amount must meet the minimum threshold of KES ${finance.minimumPayoutThreshold}.` });
      return;
    }

    if (amount > finance.currentBalance) {
      setStatusMessage({ type: 'error', text: 'Insufficient available funds for this withdrawal request.' });
      return;
    }

    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('http://localhost:8000/api/collector/request-withdrawal', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ amount: amount })
      });

      if (response.ok) {
        setStatusMessage({ 
          type: 'success', 
          text: `🎯 Cashout request of KES ${amount} successfully submitted to SemaData administration for manual verification.` 
        });
        setWithdrawAmount('');
        // Perform an instant local deduction update to block redundant form clicks
        setFinance(prev => ({
          ...prev,
          currentBalance: prev.currentBalance - amount,
          totalWithdrawn: prev.totalWithdrawn + amount
        }));
      } else {
        const errData = await response.json();
        setStatusMessage({ type: 'error', text: errData.error || 'Server rejected the transaction payload.' });
      }
    } catch (err) {
      setStatusMessage({ type: 'error', text: 'Server transaction timeout.' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="profile-workspace-view">
      
      {/* HEADER META PORT */}
      <header className="workspace-header">
        <h2>Collector Control Center</h2>
        <div className="user-meta-sub">
          <span><strong>User:</strong> {profile.fullName || 'SemaData Collector'}</span> | 
          <span><strong> Username:</strong> @{profile.username || 'anonymous'}</span>
        </div>
      </header>

      {/* METRICS ZONE */}
      <div className="financial-dashboard-grid">
        <div className="financial-card highlight">
          <label>Withdrawable Balance</label>
          <div className="monetary-value">KES {finance.currentBalance.toLocaleString()}</div>
          <div className="card-footer-meta">Ready for payout point request</div>
        </div>
        
        <div className="financial-card">
          <label>Total Merit Earned</label>
          <div className="monetary-sub">KES {finance.grossEarnings.toLocaleString()}</div>
          <div className="card-footer-meta">From verified, clean audio records</div>
        </div>

        <div className="financial-card">
          <label>Total Disbursed</label>
          <div className="monetary-sub">KES {finance.totalWithdrawn.toLocaleString()}</div>
          <div className="card-footer-meta">Transferred out by officials</div>
        </div>
      </div>

      {/* STATUS SYSTEM BANNER */}
      {statusMessage.text && (
        <div className={`global-status-banner ${statusMessage.type}`}>
          {statusMessage.text}
        </div>
      )}

      {/* ACTION BLOCK SYSTEM */}
      <div className="split-action-layout">
        
        {/* ACTION BLOC 1: WITHDRAW POINT */}
        <div className="control-panel">
          <h3>Withdraw Point</h3>
          <p className="panel-desc">Request extraction of your earned balances. Minimum processing target is KES 100.</p>
          
          <form onSubmit={handleWithdrawRequest}>
            <div className="input-field-group">
              <label>Amount to Request</label>
              <div className="currency-input-wrapper">
                <span className="currency-tag">KES</span>
                <input 
                  type="number" 
                  placeholder="0.00"
                  value={withdrawAmount}
                  onChange={(e) => setWithdrawAmount(e.target.value)}
                  disabled={finance.currentBalance < finance.minimumPayoutThreshold}
                />
              </div>
            </div>
            
            <button 
              type="submit" 
              className="action-submit-btn execute-btn"
              disabled={loading || finance.currentBalance < finance.minimumPayoutThreshold || !withdrawAmount}
            >
              {loading ? 'Authorizing Request...' : 'Trigger Cashout Request'}
            </button>
          </form>
        </div>

        {/* ACTION BLOC 2: UPDATE PAYMENT MODE */}
        <div className="control-panel">
          <h3>Update Payment Mode</h3>
          <p className="panel-desc">Configure where SemaData officials will route your disbursed funds.</p>
          
          <div className="gateway-selector-row">
            <button 
              type="button"
              className={`gateway-tab ${gateway === 'MPESA' ? 'active-mpesa' : ''}`}
              onClick={() => setGateway('MPESA')}
            >
              Safaricom M-Pesa
            </button>
            <button 
              type="button"
              className={`gateway-tab ${gateway === 'PAYPAL' ? 'active-paypal' : ''}`}
              onClick={() => setGateway('PAYPAL')}
            >
              PayPal Global
            </button>
          </div>

          <form onSubmit={handleUpdateGateway}>
            {gateway === 'MPESA' ? (
              <div className="input-field-group">
                <label>M-Pesa Number</label>
                <input 
                  type="text" 
                  placeholder="254712345678" 
                  value={mpesaPhone}
                  onChange={(e) => setMpesaPhone(e.target.value.replace(/\D/g, ''))}
                  maxLength="12"
                />
                <small>Must include country code string without space/plus (254...)</small>
              </div>
            ) : (
              <div className="input-field-group">
                <label>PayPal Registered Email</label>
                <input 
                  type="email" 
                  placeholder="account@domain.com" 
                  value={paypalEmail}
                  onChange={(e) => setPaypalEmail(e.target.value)}
                />
              </div>
            )}
            
            <button type="submit" className="action-submit-btn" disabled={loading}>
              {loading ? 'Saving Layout...' : 'Update Payment Channel'}
            </button>
          </form>
        </div>

      </div>

      <footer className="panel-actions-footer">
        <button className="back-dashboard-btn" onClick={() => navigate('/userDashboard')}>
          ◀ Return to Main Audio Engine Workspace
        </button>
      </footer>
    </div>
  );
};

export default CollectorProfile;
