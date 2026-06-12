import React, { useState, useEffect } from 'react';
import '../pages/AdminDashboard.css'; // Fits inside your existing administrative design theme layout

const PayoutManagement = () => {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  
  // State tracking block to capture the verification code text per item row
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

  // ─── HANDLE TEXT INPUT FOR RECEIPT CODES ───
  const handleNoteChange = (id, value) => {
    setTransactionNotes(prev => ({
      ...prev,
      [id]: value
    }));
  };

  // ─── COMMIT DISBURSEMENT TO BALANCED STATE ───
  const handleApproveDisbursement = async (requestId) => {
    setErrorMessage('');
    setSuccessMessage('');
    const token = localStorage.getItem('token');
    const noteText = transactionNotes[requestId] || '';

    if (!noteText.trim()) {
      setErrorMessage(`⚠️ You must provide a valid payment transaction proof reference before approving request #${requestId}.`);
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
        setSuccessMessage(`✅ Ledger Request #${requestId} successfully flagged as DISBURSED.`);
        // Clean out field local trace variables
        setTransactionNotes(prev => {
          const updated = { ...prev };
          delete updated[requestId];
          return updated;
        });
        // Refresh structural balance values instantly
        fetchPendingPayouts();
      } else {
        const errorData = await response.json();
        setErrorMessage(errorData.error || 'Server rejected payout commitment payload.');
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
          Verify manual funds relocation transfers on M-Pesa or PayPal prior to clicking the confirmation action hooks below.
        </p>
      </header>

      {/* SYSTEM FEEDBACK NOTIFICATIONS */}
      {errorMessage && <div className="admin-status-banner error-view">{errorMessage}</div>}
      {successMessage && <div className="admin-status-banner success-view">{successMessage}</div>}

      {loading ? (
        <div className="loading-spinner-wrapper">Synchronizing financial ledger rows...</div>
      ) : requests.length === 0 ? (
        <div className="empty-payout-state">
          <h3>🎯 Financial Queue Cleared</h3>
          <p>There are currently zero pending user extraction requests submitted by the collector network matrix.</p>
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
                <th>Action Approvals Verification & Audit</th>
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
                    <span className={`channel-badge ${req.preferred_gateway.toLowerCase()}`}>
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
                    <div className="payout-execution-form">
                      <input 
                        type="text" 
                        placeholder={req.preferred_gateway === 'MPESA' ? "e.g., RFA8712XYZ" : "e.g., PayPal Txn ID"}
                        value={transactionNotes[req.id] || ''}
                        onChange={(e) => handleNoteChange(req.id, e.target.value)}
                        className="audit-note-field"
                      />
                      <button 
                        onClick={() => handleApproveDisbursement(req.id)}
                        className="commit-payout-btn"
                      >
                        Confirm Disbursed
                      </button>
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
