import React, { useState } from "react";

const ChallengeManager = ({ token }) => {
  const [title,   setTitle]   = useState("");
  const [body,    setBody]    = useState("");
  const [reward,  setReward]  = useState("");
  const [pinned,  setPinned]  = useState(true);
  const [loading, setLoading] = useState(false);
  const [msg,     setMsg]     = useState("");
  const [error,   setError]   = useState("");

  const submit = async () => {
    if (!title.trim() || !body.trim()) { setError("Title and body required"); return; }
    setLoading(true); setMsg(""); setError("");
    try {
      const res = await fetch("http://localhost:8000/api/community/admin/challenge", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ title, body, reward, is_pinned: pinned })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed");
      setMsg("Challenge posted! It is now live in the community.");
      setTitle(""); setBody(""); setReward("");
    } catch (e) { setError(e.message); }
    finally { setLoading(false); }
  };

  return (
    <div style={{ background: "white", borderRadius: 20, padding: "2rem", boxShadow: "0 2px 8px rgba(0,0,0,0.06)" }}>
      <h2 style={{ fontSize: "1.2rem", fontWeight: 900, color: "#0f172a", margin: "0 0 6px" }}>
        Post Weekly Challenge
      </h2>
      <p style={{ fontSize: "0.85rem", color: "#64748b", margin: "0 0 1.5rem" }}>
        Post a new "Idea of the Week" challenge to the research community.
        Pinning replaces the current pinned challenge automatically.
      </p>

      {msg   && <div style={{ background: "#d1fae5", color: "#065f46", padding: "10px 14px", borderRadius: 10, fontSize: "0.85rem", fontWeight: 600, marginBottom: 16 }}>{msg}</div>}
      {error && <div style={{ background: "#fee2e2", color: "#991b1b", padding: "10px 14px", borderRadius: 10, fontSize: "0.85rem", fontWeight: 600, marginBottom: 16 }}>{error}</div>}

      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <div>
          <label style={lbl}>Challenge Title</label>
          <input
            style={inp}
            placeholder="e.g. How should SemaData handle low-resource Nilotic dialects?"
            value={title}
            onChange={e => setTitle(e.target.value)}
          />
        </div>
        <div>
          <label style={lbl}>Challenge Description</label>
          <textarea
            rows={5}
            style={{ ...inp, resize: "vertical", lineHeight: 1.6 }}
            placeholder="Describe the problem, why it matters, what kind of solutions you are looking for..."
            value={body}
            onChange={e => setBody(e.target.value)}
          />
        </div>
        <div>
          <label style={lbl}>Reward / Recognition (optional)</label>
          <input
            style={inp}
            placeholder="e.g. Top contributor gets early annotation engine access"
            value={reward}
            onChange={e => setReward(e.target.value)}
          />
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <input type="checkbox" id="pin" checked={pinned} onChange={e => setPinned(e.target.checked)} />
          <label htmlFor="pin" style={{ fontSize: "0.875rem", fontWeight: 600, color: "#475569", cursor: "pointer" }}>
            Pin as Idea of the Week (replaces current pinned challenge)
          </label>
        </div>
        <button
          onClick={submit}
          disabled={loading}
          style={{
            background: loading ? "#94a3b8" : "#489c8c",
            color: "white", border: "none",
            padding: "12px 24px", borderRadius: 12,
            fontWeight: 700, fontSize: "0.9rem",
            cursor: loading ? "not-allowed" : "pointer",
            alignSelf: "flex-start", transition: "all 0.2s"
          }}
        >
          {loading ? "Posting..." : "📌 Post Challenge"}
        </button>
      </div>
    </div>
  );
};

const lbl = { display: "block", fontSize: "0.75rem", fontWeight: 800, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 6 };
const inp = { width: "100%", padding: "10px 14px", border: "1.5px solid #e2e8f0", borderRadius: 10, fontSize: "0.875rem", outline: "none", fontFamily: "Inter,sans-serif", boxSizing: "border-box" };

export default ChallengeManager;
