import React, { useState } from "react";
import { Link } from "react-router-dom";

const ForgotPassword = () => {
  const [email,     setEmail]     = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [loading,   setLoading]   = useState(false);
  const [error,     setError]     = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email.trim()) { setError("Email is required"); return; }
    setLoading(true); setError("");
    try {
      const res  = await fetch("http://localhost:8000/api/Auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setSubmitted(true);
    } catch (e) { setError(e.message); }
    finally { setLoading(false); }
  };

  if (submitted) return (
    <div style={wrap}>
      <div style={card}>
        <div style={{ fontSize: 48, marginBottom: 16 }}>📬</div>
        <h2 style={h2}>Check your email</h2>
        <p style={sub}>
          If <strong>{email}</strong> is registered, a reset link has been sent.
          Check your inbox and spam folder.
        </p>
        <Link to="/login" style={btn}>Back to login</Link>
      </div>
    </div>
  );

  return (
    <div style={wrap}>
      <div style={card}>
        <h2 style={h2}>Forgot your password?</h2>
        <p style={sub}>Enter your email and we will send you a reset link.</p>
        {error && <p style={{ color: "#ef4444", fontSize: "0.85rem", fontWeight: 600, margin: "0 0 12px" }}>{error}</p>}
        <form onSubmit={handleSubmit}>
          <input
            type="email"
            placeholder="your@email.com"
            value={email}
            onChange={e => setEmail(e.target.value)}
            style={input}
          />
          <button type="submit" disabled={loading} style={submitBtn}>
            {loading ? "Sending..." : "Send Reset Link"}
          </button>
        </form>
        <Link to="/login" style={{ fontSize: "0.8rem", color: "#94a3b8", display: "block", marginTop: 16, textAlign: "center" }}>
          Back to login
        </Link>
      </div>
    </div>
  );
};

const wrap      = { minHeight: "100vh", background: "#f8fafc", display: "flex", alignItems: "center", justifyContent: "center", padding: 20 };
const card      = { background: "white", borderRadius: 20, padding: "2.5rem", width: "100%", maxWidth: 420, boxShadow: "0 8px 32px rgba(0,0,0,0.08)", textAlign: "center" };
const h2        = { fontSize: "1.4rem", fontWeight: 900, color: "#0f172a", margin: "0 0 8px" };
const sub       = { fontSize: "0.875rem", color: "#64748b", margin: "0 0 24px", lineHeight: 1.6 };
const input     = { width: "100%", padding: "11px 14px", border: "1.5px solid #e2e8f0", borderRadius: 10, fontSize: "0.9rem", outline: "none", marginBottom: 12, boxSizing: "border-box", fontFamily: "Inter,sans-serif" };
const submitBtn = { width: "100%", padding: "11px", background: "#489c8c", color: "white", border: "none", borderRadius: 10, fontWeight: 700, fontSize: "0.9rem", cursor: "pointer" };
const btn       = { display: "inline-block", marginTop: 16, padding: "10px 24px", background: "#489c8c", color: "white", borderRadius: 10, textDecoration: "none", fontWeight: 700, fontSize: "0.875rem" };

export default ForgotPassword;
