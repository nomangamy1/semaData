import React, { useState, useEffect } from "react";
import "./collectorProfile.css";

const BASE = "http://localhost:8000/api/collector";

const CollectorProfileTab = ({ sessionData, onLogout, walletOnly = false, profileOnly = false }) => {
  const token = localStorage.getItem("token");
  const [finance, setFinance] = useState({
    currentBalance: 0, grossEarnings: 0, totalWithdrawn: 0,
    penaltyDeduction: 0, totalApproved: 0, rejectionRate: 0,
    minimumPayoutThreshold: 100
  });
  const [gateway,      setGateway]      = useState("MPESA");
  const [mpesaPhone,   setMpesaPhone]   = useState("");
  const [paypalEmail,  setPaypalEmail]  = useState("");
  const [withdrawAmt,  setWithdrawAmt]  = useState("");
  const [loading,      setLoading]      = useState(true);
  const [saving,       setSaving]       = useState(false);
  const [withdrawing,  setWithdrawing]  = useState(false);
  const [showWithdraw, setShowWithdraw] = useState(false);
  const [msg,          setMsg]          = useState({ type: "", text: "" });

  useEffect(() => {
    if (!token) return;
    fetch(`${BASE}/finance-summary`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then(data => {
        setFinance({
          currentBalance:         data.current_balance         || 0,
          grossEarnings:          data.gross_earnings          || 0,
          totalWithdrawn:         data.total_withdrawn         || 0,
          penaltyDeduction:       data.penalty_deduction       || 0,
          totalApproved:          data.total_approved          || 0,
          rejectionRate:          data.rejection_rate          || 0,
          minimumPayoutThreshold: data.minimum_payout_threshold || 100,
        });
        if (data.profile) {
          setGateway(data.profile.preferred_gateway || "MPESA");
          setMpesaPhone(data.profile.mpesa_number   || "");
          setPaypalEmail(data.profile.paypal_email  || "");
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [token]);

  const flash = (type, text) => {
    setMsg({ type, text });
    setTimeout(() => setMsg({ type: "", text: "" }), 4000);
  };

  const saveGateway = async (e) => {
    e.preventDefault();
    if (gateway === "MPESA" && (!mpesaPhone.startsWith("254") || mpesaPhone.length !== 12)) {
      flash("error", "M-Pesa number must start with 254 and be exactly 12 digits.");
      return;
    }
    if (gateway === "PAYPAL" && !paypalEmail.includes("@")) {
      flash("error", "Enter a valid PayPal email.");
      return;
    }
    setSaving(true);
    try {
      const res  = await fetch(`${BASE}/update-gateway`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ preferred_gateway: gateway, mpesa_number: mpesaPhone, paypal_email: paypalEmail })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      flash("success", "Payment channel updated successfully.");
    } catch (e) { flash("error", e.message); }
    finally { setSaving(false); }
  };

  const requestWithdrawal = async (e) => {
    e.preventDefault();
    const amount = parseFloat(withdrawAmt);
    if (isNaN(amount) || amount < finance.minimumPayoutThreshold) {
      flash("error", "Minimum withdrawal is KES " + finance.minimumPayoutThreshold);
      return;
    }
    if (amount > finance.currentBalance) {
      flash("error", "Amount exceeds available balance.");
      return;
    }
    setWithdrawing(true);
    try {
      const res  = await fetch(`${BASE}/request-withdrawal`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ amount })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      flash("success", "Withdrawal of KES " + amount + " submitted. Processed within 48 hours.");
      setWithdrawAmt(""); setShowWithdraw(false);
      setFinance(f => ({ ...f, currentBalance: f.currentBalance - amount }));
    } catch (e) { flash("error", e.message); }
    finally { setWithdrawing(false); }
  };

  if (loading) return (
    <div className="cp-loading"><div className="cp-spinner" /><p>Loading profile...</p></div>
  );

  const canWithdraw = finance.currentBalance >= finance.minimumPayoutThreshold;

  return (
    <div className="cp-root">
      {msg.text && <div className={"cp-banner cp-banner--" + msg.type}>{msg.text}</div>}

      {(!walletOnly) && (
      <section className="cp-card">
        <div className="cp-card-head">
          <div className="cp-avatar">
            {(sessionData?.name || "C").split(" ").map(w => w[0]).join("").toUpperCase().slice(0,2)}
          </div>
          <div>
            <h2 className="cp-name">{sessionData?.name || "Collector"}</h2>
            <p className="cp-role">Data Collection Agent</p>
          </div>
        </div>
        <div className="cp-info-grid">
          <div className="cp-info-item"><label>Email</label><p>{sessionData?.email || "N/A"}</p></div>
          <div className="cp-info-item"><label>Domain</label><p>{sessionData?.domain || "Unassigned"}</p></div>
          <div className="cp-info-item"><label>Reference</label><p className="cp-ref">{sessionData?.refNum || "N/A"}</p></div>
          <div className="cp-info-item"><label>Status</label><p className="cp-status-pill">Active</p></div>
        </div>
        <button className="cp-logout-btn" onClick={onLogout}>Sign out</button>
      </section>
      )}

      {(!profileOnly) && (
      <>
        <section className="cp-earnings-grid">
          <div className="cp-earn-card cp-earn-card--primary">
            <label>Withdrawable Balance</label>
            <div className="cp-earn-value">KES {finance.currentBalance.toLocaleString("en-KE", { minimumFractionDigits: 2 })}</div>
            <button className="cp-withdraw-trigger-btn" disabled={!canWithdraw} onClick={() => setShowWithdraw(s => !s)}>
              {canWithdraw ? "Request Withdrawal" : "Min KES " + finance.minimumPayoutThreshold + " required"}
            </button>
          </div>
          <div className="cp-earn-card">
            <label>Total Earned</label>
            <div className="cp-earn-sub">KES {finance.grossEarnings.toLocaleString()}</div>
            <small className="cp-earn-note">✅ {finance.totalApproved} verified</small>
          </div>
          <div className="cp-earn-card">
            <label>Quality Score</label>
            <div className="cp-earn-sub" style={{ color: finance.rejectionRate > 15 ? "#ef4444" : "#489c8c" }}>
              {(100 - finance.rejectionRate).toFixed(1)}%
            </div>
            <small className="cp-earn-note">{finance.rejectionRate.toFixed(1)}% rejection rate</small>
          </div>
        </section>

        {showWithdraw && (
          <section className="cp-card">
            <h3 className="cp-section-title">Request Withdrawal</h3>
            <p className="cp-section-sub">Minimum KES {finance.minimumPayoutThreshold}. Processed within 48 hours.</p>
            <form onSubmit={requestWithdrawal} className="cp-withdraw-form">
              <div className="cp-currency-input">
                <span className="cp-currency-tag">KES</span>
                <input type="number" placeholder="0.00" value={withdrawAmt}
                  onChange={e => setWithdrawAmt(e.target.value)}
                  max={finance.currentBalance} min={finance.minimumPayoutThreshold} />
              </div>
              <p className="cp-balance-hint">Available: KES {finance.currentBalance.toLocaleString()}</p>
              <div className="cp-form-actions">
                <button type="button" className="cp-btn-cancel" onClick={() => setShowWithdraw(false)}>Cancel</button>
                <button type="submit" className="cp-btn-primary" disabled={withdrawing}>
                  {withdrawing ? "Submitting..." : "Confirm Withdrawal"}
                </button>
              </div>
            </form>
          </section>
        )}
      </>
      )}

      <section className="cp-card">
        <h3 className="cp-section-title">Payment Channel</h3>
        <p className="cp-section-sub">Configure where SemaData sends your earnings.</p>
        <div className="cp-gateway-tabs">
          <button type="button" className={"cp-gateway-tab " + (gateway === "MPESA"  ? "active" : "")} onClick={() => setGateway("MPESA")}>📱 M-Pesa</button>
          <button type="button" className={"cp-gateway-tab " + (gateway === "PAYPAL" ? "active" : "")} onClick={() => setGateway("PAYPAL")}>🌐 PayPal</button>
        </div>
        <form onSubmit={saveGateway} className="cp-gateway-form">
          {gateway === "MPESA" ? (
            <div className="cp-field">
              <label>M-Pesa Number</label>
              <input type="text" placeholder="254712345678" value={mpesaPhone}
                onChange={e => setMpesaPhone(e.target.value.replace(/\D/g,""))} maxLength={12} />
              <small>Include country code — no spaces or + sign</small>
            </div>
          ) : (
            <div className="cp-field">
              <label>PayPal Email</label>
              <input type="email" placeholder="you@example.com" value={paypalEmail}
                onChange={e => setPaypalEmail(e.target.value)} />
            </div>
          )}
          <button type="submit" className="cp-btn-primary" disabled={saving}>
            {saving ? "Saving..." : "Update Payment Channel"}
          </button>
        </form>
      </section>
    </div>
  );
};

export default CollectorProfileTab;
