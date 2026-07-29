import React, { useState } from "react";
import { X, Briefcase, Send, User, Mail, FileText } from "lucide-react";

const JobApplicationModal = ({ job, onClose }) => {
  const [formData, setFormData] = useState({
    first_name: "",
    second_name: "",
    email: "",
    cover_letter: "",
    relevant_experience: "",
    self_assessment_skills: ""
  });
  const [loading,   setLoading]   = useState(false);
  const [success,   setSuccess]   = useState(false);
  const [error,     setError]     = useState("");

  if (!job) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.first_name || !formData.email || !formData.cover_letter) {
      setError("Name, email and cover letter are required.");
      return;
    }
    setLoading(true); setError("");
    try {
      const res = await fetch(`http://localhost:8000/api/apply/${job.id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          self_assessment_skills: formData.self_assessment_skills
            .split(",").map(s => s.trim()).filter(Boolean)
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Application failed");
      setSuccess(true);
    } catch (e) { setError(e.message); }
    finally { setLoading(false); }
  };

  return (
    <div style={{
      position: "fixed", inset: 0, background: "rgba(8,15,30,0.75)",
      backdropFilter: "blur(8px)", zIndex: 9999,
      display: "flex", alignItems: "center", justifyContent: "center", padding: "1.5rem"
    }}>
      <div style={{
        background: "white", borderRadius: 24, width: "100%", maxWidth: 560,
        maxHeight: "90vh", overflow: "hidden", display: "flex", flexDirection: "column",
        boxShadow: "0 30px 80px rgba(0,0,0,0.3)"
      }}>
        {/* Header */}
        <div style={{ background: "linear-gradient(135deg,#080f1e,#0f172a)", padding: "1.75rem 2rem", flexShrink: 0 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
                <div style={{ background: "rgba(72,156,140,0.2)", padding: "8px", borderRadius: 10 }}>
                  <Briefcase size={20} color="#489c8c" />
                </div>
                <span style={{ fontSize: "0.72rem", fontWeight: 700, color: "#489c8c", textTransform: "uppercase", letterSpacing: "0.08em" }}>
                  Apply for Position
                </span>
              </div>
              <h2 style={{ fontSize: "1.2rem", fontWeight: 900, color: "white", margin: "0 0 4px" }}>{job.title}</h2>
              <p style={{ fontSize: "0.8rem", color: "#64748b", margin: 0 }}>{job.field} · {job.location || "Remote"}</p>
            </div>
            <button onClick={onClose} style={{ background: "rgba(255,255,255,0.08)", border: "none", color: "white", width: 32, height: 32, borderRadius: 9, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <X size={16} />
            </button>
          </div>
        </div>

        {/* Body */}
        <div style={{ overflowY: "auto", padding: "1.75rem 2rem", flex: 1 }}>
          {success ? (
            <div style={{ textAlign: "center", padding: "2rem 0" }}>
              <div style={{ fontSize: 56, marginBottom: 16 }}>🎉</div>
              <h3 style={{ fontWeight: 900, color: "#0f172a", margin: "0 0 8px" }}>Application Submitted!</h3>
              <p style={{ color: "#64748b", fontSize: "0.9rem", lineHeight: 1.6 }}>
                Your application has been received. If approved, you will receive a reference number via email to complete your registration.
              </p>
              <button onClick={onClose} style={{ marginTop: 20, background: "#489c8c", color: "white", border: "none", padding: "10px 24px", borderRadius: 10, fontWeight: 700, cursor: "pointer" }}>
                Done
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit}>
              {error && (
                <div style={{ background: "#fee2e2", color: "#991b1b", padding: "10px 14px", borderRadius: 10, fontSize: "0.85rem", fontWeight: 600, marginBottom: 16 }}>
                  {error}
                </div>
              )}

              {/* Job brief */}
              <div style={{ background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 12, padding: "1rem 1.25rem", marginBottom: 20 }}>
                <p style={{ fontSize: "0.72rem", fontWeight: 800, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.08em", margin: "0 0 6px" }}>Role Brief</p>
                <p style={{ fontSize: "0.85rem", color: "#475569", margin: 0, lineHeight: 1.6 }}>{job.description || "Data collection role. See full description on the careers page."}</p>
                {job.compensation && (
                  <p style={{ fontSize: "0.8rem", fontWeight: 700, color: "#489c8c", margin: "8px 0 0" }}>💰 {job.compensation}</p>
                )}
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 }}>
                <Field icon={<User size={14} />} label="First Name *">
                  <input style={inp} placeholder="First name" value={formData.first_name}
                    onChange={e => setFormData(f => ({ ...f, first_name: e.target.value }))} />
                </Field>
                <Field icon={<User size={14} />} label="Last Name">
                  <input style={inp} placeholder="Last name" value={formData.second_name}
                    onChange={e => setFormData(f => ({ ...f, second_name: e.target.value }))} />
                </Field>
              </div>

              <Field icon={<Mail size={14} />} label="Email Address *" style={{ marginBottom: 12 }}>
                <input style={inp} type="email" placeholder="your@email.com" value={formData.email}
                  onChange={e => setFormData(f => ({ ...f, email: e.target.value }))} />
              </Field>

              <Field icon={<FileText size={14} />} label="Why do you want this role? *" style={{ marginBottom: 12 }}>
                <textarea style={{ ...inp, resize: "vertical", minHeight: 100, lineHeight: 1.6 }}
                  placeholder="Tell us why you are a good fit for this data collection role, which languages you speak fluently, and any relevant field experience..."
                  value={formData.cover_letter}
                  onChange={e => setFormData(f => ({ ...f, cover_letter: e.target.value }))} />
              </Field>

              <Field icon={<FileText size={14} />} label="Relevant Experience" style={{ marginBottom: 12 }}>
                <textarea style={{ ...inp, resize: "vertical", minHeight: 80, lineHeight: 1.6 }}
                  placeholder="Previous data collection, fieldwork, transcription, or research experience..."
                  value={formData.relevant_experience}
                  onChange={e => setFormData(f => ({ ...f, relevant_experience: e.target.value }))} />
              </Field>

              <Field icon={<FileText size={14} />} label="Skills (comma separated)" style={{ marginBottom: 20 }}>
                <input style={inp} placeholder="Swahili, Kalenjin, audio recording, field interviewing..."
                  value={formData.self_assessment_skills}
                  onChange={e => setFormData(f => ({ ...f, self_assessment_skills: e.target.value }))} />
              </Field>

              <button type="submit" disabled={loading} style={{
                width: "100%", padding: "12px", background: loading ? "#94a3b8" : "#489c8c",
                color: "white", border: "none", borderRadius: 12, fontWeight: 700,
                fontSize: "0.9rem", cursor: loading ? "not-allowed" : "pointer",
                display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                transition: "all 0.2s"
              }}>
                <Send size={16} />
                {loading ? "Submitting..." : "Submit Application"}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

const Field = ({ icon, label, children, style }) => (
  <div style={style}>
    <label style={{ display: "flex", alignItems: "center", gap: 5, fontSize: "0.72rem", fontWeight: 800, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 6 }}>
      {icon} {label}
    </label>
    {children}
  </div>
);

const inp = { width: "100%", padding: "9px 12px", border: "1.5px solid #e2e8f0", borderRadius: 10, fontFamily: "Inter,sans-serif", fontSize: "0.875rem", outline: "none", boxSizing: "border-box", color: "#1e293b" };

export default JobApplicationModal;
