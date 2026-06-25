import React, { useState, useEffect } from 'react';
import './PayoutManagement.css'; // Points to component specific stylesheet directly

const PayoutManagement = () => {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [processingId, setProcessingId] = useState(null);
  
  // Local state for tracking manual transaction receipt codes
  const [transactionNotes, setTransactionNotes] = useState({});

  // ─── FETCH THE PENDING DISBURSEMENT STACK ───
  const fetchPendingPayouts = async () => {
    setLoading(true);
    setErrorMessage('');
    const token = localStorage.getItem('token');
    
    try {
      const response = await fetch('http://localhost:8000/api/admin/payouts/pending', {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        const data = await response.json();
        setRequests(data);
      } else {
        setErrorMessage('Failed to look up pending disbursement structures.');
      }
    } catch (err) {
      setErrorMessage('Communication error connecting to backend API nodes.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPendingPayouts();
  }, []);

  const handleNoteChange = (id, value) => {
    setTransactionNotes(prev => ({
      ...prev,
      [id]: value
    }));
  };

  // ─── OPTION A: AUTOMATED M-PESA B2C DISBURSEMENT ───
  const handleAutomatedB2C = async (requestId) => {
    setErrorMessage('');
    setSuccessMessage('');
    if (!window.confirm(`Fire live Safaricom B2C M-Pesa transfer for Request #${requestId}?`)) return;

    const token = localStorage.getItem('token');
    setProcessingId(requestId);

    try {
      const response = await fetch('http://localhost:8000/admin/disburse/approve', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ disbursement_id: requestId })
      });

      const data = await response.json();

      if (response.ok && data.status === 'queued') {
        setSuccessMessage(`⚡ M-Pesa Request #${requestId} successfully queued. Daraja Track ID: ${data.conversation_id}`);
        fetchPendingPayouts();
      } else {
        setErrorMessage(data.error || 'Daraja gateway handshake rejected or timed out.');
      }
    } catch (err) {
      setErrorMessage('Failed to establish connection to upstream payment routing nodes.');
    } finally {
      setProcessingId(null);
    }
  };

  // ─── OPTION B: MANUAL FALLBACK COMMIT ───
  const handleManualApprove = async (requestId) => {
    setErrorMessage('');
    setSuccessMessage('');
    const token = localStorage.getItem('token');
    const noteText = transactionNotes[requestId] || '';

    if (!noteText.trim()) {
      setErrorMessage(`⚠️ You must provide a manual transaction reference for request #${requestId}.`);
      return;
    }

    try {
      const response = await fetch(`http://localhost:8000/api/admin/payouts/approve/${requestId}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ transaction_note: noteText })
      });

      if (response.ok) {
        setSuccessMessage(`✅ Ledger Request #${requestId} manually verified as DISBURSED.`);
        setTransactionNotes(prev => {
          const updated = { ...prev };
          delete updated[requestId];
          return updated;
        });
        fetchPendingPayouts();
      } else {
        const errorData = await response.json();
        setErrorMessage(errorData.error || 'Server rejected manual settlement confirmation.');
      }
    } catch (err) {
      setErrorMessage('Network connection failure during status commit.');
    }
  };

  return (
    <div className="admin-payout-desk-view">
      <header className="admin-view-header">
        <h2>Collector Payout Queue Desk</h2>
        <p className="subtext-alert">
          Choose between initiating automated real-time API payouts via Safaricom B2C or recording off-platform transactions manually.
        </p>
      </header>

      {errorMessage && <div className="admin-status-banner error-view">{errorMessage}</div>}
      {successMessage && <div className="admin-status-banner success-view">{successMessage}</div>}

      {loading ? (
        <div className="loading-spinner-wrapper">Synchronizing financial ledger rows...</div>
      ) : requests.length === 0 ? (
        <div className="empty-payout-state">
          <h3>🎯 Financial Queue Cleared</h3>
          <p>There are currently zero pending extraction requests submitted by the collector network matrix.</p>
        </div>
      ) : (
        <div className="table-responsive-wrapper">
          <table className="admin-finance-table">
            <thead>
              <tr>
                <th>Request ID</th>
                <th>Collector details</th>
                <th>Channel Preferred</th>
                <th>Payment Destination Target</th>
                <th>Amount Due</th>
                <th>Requested At</th>
                <th>Operational Actions &amp; Automated Routing</th>
              </tr>
            </thead>
            <tbody>
              {requests.map((req) => (
                <tr key={req.id}>
                  <td><strong>#{req.id}</strong></td>
                  <td>
                    <div className="user-info-cell">
                      <span className="username-block">@{req.username}</span>
                      <small className="uid-lbl">ID: {req.collector_id}</small>
                    </div>
                  </td>
                  <td>
                    <span className={`channel-badge ${req.preferred_gateway?.toLowerCase()}`}>
                      {req.preferred_gateway}
                    </span>
                  </td>
                  <td>
                    <code className="coordinate-print-block">{req.target_coordinate}</code>
                  </td>
                  <td>
                    <span className="payout-sum-text">KES {req.amount.toLocaleString()}</span>
                  </td>
                  <td>
                    <small className="date-string-lbl">{req.initiated_at}</small>
                  </td>
                  <td>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      {/* AUTOMATED TRANSFER ACCESS (Enabled only for MPESA rows) */}
                      {req.preferred_gateway === 'MPESA' && (
                        <button
                          onClick={() => handleAutomatedB2C(req.id)}
                          disabled={processingId === req.id}
                          className="commit-payout-btn automated-trigger-row-btn"
                          style={{ backgroundColor: '#10b981', color: '#fff', border: 'none' }}
                        >
                          {processingId === req.id ? "Queuing API Request..." : "⚡ Trigger M-Pesa B2C Payout"}
                        </button>
                      )}

                      {/* MANUAL TRANSFER OVERRIDE WORKFLOW */}
                      <div className="payout-execution-form" style={{ borderTop: req.preferred_gateway === 'MPESA' ? '1px dashed #cbd5e1' : 'none', paddingTop: req.preferred_gateway === 'MPESA' ? '8px' : '0' }}>
                        <input 
                          type="text" 
                          placeholder={req.preferred_gateway === 'MPESA' ? "Manual receipt (e.g. RFA8712XYZ)" : "e.g. PayPal Txn ID"}
                          value={transactionNotes[req.id] || ''}
                          onChange={(e) => handleNoteChange(req.id, e.target.value)}
                          className="audit-note-field"
                        />
                        <button 
                          onClick={() => handleManualApprove(req.id)}
                          className="commit-payout-btn"
                          style={{ whiteSpace: 'nowrap' }}
                        >
                          Confirm Manual Code
                        </button>
                      </div>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default PayoutManagement;
