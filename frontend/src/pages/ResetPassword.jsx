import React, { useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";

const ResetPassword = () => {
  const [searchParams]            = useSearchParams();
  const token                     = searchParams.get("token") || "";
  const navigate                  = useNavigate();
  const [password,  setPassword]  = useState("");
  const [confirm,   setConfirm]   = useState("");
  const [loading,   setLoading]   = useState(false);
  const [error,     setError]     = useState("");
  const [success,   setSuccess]   = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (password.length < 8)       { setError("Password must be at least 8 characters"); return; }
    if (password !== confirm)       { setError("Passwords do not match"); return; }
    setLoading(true); setError("");
    try {
      const res  = await fetch("http://localhost:8000/api/Auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setSuccess(true);
      setTimeout(() => navigate("/login?fresh=true"), 2500);
    } catch (e) { setError(e.message); }
    finally { setLoading(false); }
  };

  if (!token) return (
    <div style={wrap}>
      <div style={card}>
        <p style={{ color: "#ef4444", fontWeight: 600 }}>Invalid reset link. Please request a new one.</p>
      </div>
    </div>
  );

  if (success) return (
    <div style={wrap}>
      <div style={card}>
        <div style={{ fontSize: 48, marginBottom: 16 }}>✅</div>
        <h2 style={h2}>Password reset!</h2>
        <p style={sub}>Redirecting you to login...</p>
      </div>
    </div>
  );

  return (
    <div style={wrap}>
      <div style={card}>
        <h2 style={h2}>Set new password</h2>
        <p style={sub}>Enter your new password below.</p>
        {error && <p style={{ color: "#ef4444", fontSize: "0.85rem", fontWeight: 600, margin: "0 0 12px" }}>{error}</p>}
        <form onSubmit={handleSubmit}>
          <input type="password" placeholder="New password" value={password}
            onChange={e => setPassword(e.target.value)} style={input} />
          <input type="password" placeholder="Confirm password" value={confirm}
            onChange={e => setConfirm(e.target.value)} style={input} />
          <button type="submit" disabled={loading} style={submitBtn}>
            {loading ? "Resetting..." : "Reset Password"}
          </button>
        </form>
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

export default ResetPassword;
