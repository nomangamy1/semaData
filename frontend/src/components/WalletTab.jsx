import React, { useState } from 'react';
import './walletView.css';
const WalletTab = ({ finance, token, onRefresh }) => {
  const [isWithdrawModalOpen, setIsWithdrawModalOpen] = useState(false);
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [withdrawError, setWithdrawError] = useState('');

  const handleWithdrawalSubmit = async (e) => {
    e.preventDefault();
    setWithdrawError('');
    
    const numericAmount = parseFloat(withdrawAmount);
    if (isNaN(numericAmount) || numericAmount < 100.00) {
      setWithdrawError('Minimum allowed system payout execution threshold is KES 100.00.');
      return;
    }
    if (numericAmount > finance.currentBalance) {
      setWithdrawError('Requested amount exceeds current available balance allocation.');
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await fetch('http://localhost:8000/api/main/request-withdrawal', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ amount: numericAmount })
      });

      const resData = await response.json();
      if (!response.ok) throw new Error(resData.error || 'Withdrawal rejected.');

      alert(`✅ Payout queued successfully! Reference ID: ${resData.reference_id}`);
      setIsWithdrawModalOpen(false);
      setWithdrawAmount('');
      onRefresh(); // Trigger parent dashboard refetch
    } catch (err) {
      setWithdrawError(err.message || 'Network subsystem timeout.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="finance-summary-strip">
      <div className="finance-card primary-balance">
        <div className="card-info">
          <span className="finance-label">WITHDRAWABLE WALLET BALANCE</span>
          <h2 className="finance-value">KES {finance.currentBalance.toFixed(2)}</h2>
        </div>
        <button 
          className="cashout-action-btn"
          disabled={finance.currentBalance < 100.00}
          onClick={() => setIsWithdrawModalOpen(true)}
        >
          💸 Request Disbursal
        </button>
      </div>

      <div className="finance-card sub-metric">
        <span className="finance-label">GROSS WORK EARNINGS</span>
        <h3>KES {finance.baseEarnings.toFixed(2)}</h3>
        <small className="success-text">● Verified Entries: {finance.totalApproved}</small>
      </div>

      <div className="finance-card sub-metric">
        <span className="finance-label">QUALITY PENALTY TRACKING</span>
        <h3 className="penalty-text">KES {finance.penaltyDeduction.toFixed(2)}</h3>
        <small className={finance.rejectionRate > 15 ? 'danger-text' : 'warning-text'}>
          ❌ Rejection Rate: {Number(finance.rejectionRate || 0).toFixed(2)}%
        </small>
      </div>

      {isWithdrawModalOpen && (
        <div className="modal-backdrop">
          <div className="payout-modal-surface">
            <h3>Execute Payout Intent</h3>
            <p className="modal-help-text">Minimum transaction limit: KES 100.</p>
            <form onSubmit={handleWithdrawalSubmit}>
              <div className="modal-input-group">
                <label>Amount to Withdraw (KES)</label>
                <input 
                  type="number"
                  placeholder="e.g. 250"
                  value={withdrawAmount}
                  onChange={(e) => setWithdrawAmount(e.target.value)}
                  disabled={isSubmitting}
                  required
                />
                <span className="input-max-hint">Available: KES {finance.currentBalance.toFixed(2)}</span>
              </div>
              {withdrawError && <div className="modal-error-banner">{withdrawError}</div>}
              <div className="modal-actions">
                <button type="button" className="cancel-btn" onClick={() => setIsWithdrawModalOpen(false)} disabled={isSubmitting}>Cancel</button>
                <button type="submit" className="confirm-payout-btn" disabled={isSubmitting}>
                  {isSubmitting ? 'Processing...' : 'Confirm'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default WalletTab;
