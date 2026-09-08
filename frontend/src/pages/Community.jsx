import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import "../styles/community.css";

const BASE = "http://localhost:8000/api/community";
const getToken = () => localStorage.getItem("token");
const getRole = () => (localStorage.getItem("userRole") || "").toLowerCase();
const getUsername = () => localStorage.getItem("username") || "Member";
const isLogged = () => !!getToken();
const authHdr = () => ({ Authorization: `Bearer ${getToken()}` });

const Avatar = ({ name, size = 38 }) => {
  const initials = (name || "?").split(" ").map(w => w[0]).join("").toUpperCase().slice(0, 2);
  return (
    <div style={{
      width: size, height: size, borderRadius: 12,
      background: "linear-gradient(135deg,#489c8c,#2b584d)",
      display: "flex", alignItems: "center", justifyContent: "center",
      fontWeight: 800, fontSize: size * 0.36, color: "white", flexShrink: 0,
      boxShadow: "0 4px 12px rgba(72, 156, 140, 0.25)"
    }}>
      {initials}
    </div>
  );
};

const Spinner = () => (
  <div className="comm-spinner"><div className="comm-spinner-ring" /></div>
);

const ChallengeCard = ({ challenge, onClick }) => (
  <div
    className={"challenge-card " + (challenge.is_pinned ? "challenge-card--pinned" : "")}
    onClick={() => onClick(challenge)}
  >
    {challenge.is_pinned && <div className="pinned-badge">📌 Idea of the Week</div>}
    <h3 className="challenge-title">{challenge.title}</h3>
    <p className="challenge-body">{challenge.body.slice(0, 180)}{challenge.body.length > 180 ? "..." : ""}</p>
    {challenge.attachment && (
      <div style={{ margin: "10px 0", borderRadius: "6px", overflow: "hidden", maxHeight: "140px" }}>
        <img src={`http://localhost:8000${challenge.attachment}`} alt="Challenge Attachment" style={{ width: "100%", objectFit: "cover" }} />
      </div>
    )}
    <div className="challenge-footer">
      <span className="challenge-stat">💬 {challenge.response_count} responses</span>
      <span className="challenge-stat">★ {challenge.likes} likes</span>
      <span className="challenge-cta">Contribute →</span>
    </div>
  </div>
);

const ResponseItem = ({ resp, rank, onUpvote }) => (
  <div className={"response-item " + (rank <= 3 ? "response-item--top" : "")}>
    <div className="response-rank">
      {rank === 1 ? "🥇" : rank === 2 ? "🥈" : rank === 3 ? "🥉" : `#${rank}`}
    </div>
    <div className="response-content">
      <div className="response-header">
        <Avatar name={resp.author} size={30} />
        <span className="response-author">{resp.author}</span>
        <span className="response-time">{new Date(resp.created_at).toLocaleDateString()}</span>
      </div>
      <p className="response-body">{resp.body}</p>
    </div>
    <button className="upvote-btn" onClick={() => onUpvote(resp.id)} disabled={!isLogged()}>
      ▲ {resp.upvotes}
    </button>
  </div>
);

const ChallengeDetail = ({ challenge, onBack }) => {
  const [responses, setResponses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newResp, setNewResp] = useState("");
  const [posting, setPosting] = useState(false);
  const [error, setError] = useState("");

  const fetchResponses = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`${BASE}/challenge/${challenge.id}/responses`);
      const data = await res.json();
      setResponses(data.responses || []);
    } catch { setError("Failed to load responses"); }
    finally { setLoading(false); }
  }, [challenge.id]);

  useEffect(() => { fetchResponses(); }, [fetchResponses]);

  const submitResponse = async () => {
    if (!newResp.trim() || newResp.trim().length < 20) {
      setError("Response must be at least 20 characters.");
      return;
    }
    setPosting(true); setError("");
    try {
      const res = await fetch(`${BASE}/challenge/${challenge.id}/respond`, {
        method: "POST",
        headers: { ...authHdr(), "Content-Type": "application/json" },
        body: JSON.stringify({ body: newResp })
      });
      if (!res.ok) { const d = await res.json(); throw new Error(d.error); }
      setNewResp("");
      fetchResponses();
    } catch (e) { setError(e.message); }
    finally { setPosting(false); }
  };

  const upvote = async (rid) => {
    await fetch(`${BASE}/response/${rid}/upvote`, { method: "POST", headers: authHdr() });
    setResponses(prev => prev.map(r =>
      r.id === rid ? { ...r, upvotes: r.upvotes + 1 } : r
    ).sort((a, b) => b.upvotes - a.upvotes));
  };

  return (
    <div className="challenge-detail">
      <button className="back-btn" onClick={onBack}>← Back to Challenges</button>
      <h2 className="detail-title">{challenge.title}</h2>
      <p className="detail-body">{challenge.body}</p>
      {challenge.attachment && (
        <div style={{ margin: "14px 0", borderRadius: "8px", overflow: "hidden", maxHeight: "280px" }}>
          <img src={`http://localhost:8000${challenge.attachment}`} alt="Detail Attachment" style={{ width: "100%", objectFit: "cover" }} />
        </div>
      )}

      {isLogged() ? (
        <div className="response-form">
          {error && <p style={{ color: "#ef4444", fontSize: "0.8rem", fontWeight: 600, margin: "0 0 8px" }}>{error}</p>}
          <textarea
            rows={4}
            placeholder="Share your approach, solution or insight... (minimum 20 characters)"
            value={newResp}
            onChange={e => setNewResp(e.target.value)}
            className="response-textarea"
          />
          <button className="response-submit-btn" onClick={submitResponse} disabled={posting}>
            {posting ? "Submitting..." : "Submit Contribution"}
          </button>
        </div>
      ) : (
        <div className="login-gate">Sign in to contribute to this challenge.</div>
      )}

      {loading ? <Spinner /> : (
        <div className="responses-list">
          {responses.map((r, i) => <ResponseItem key={r.id} resp={r} rank={i + 1} onUpvote={upvote} />)}
        </div>
      )}
    </div>
  );
};

const FeedCard = ({ post }) => {
  const [showComments, setShowComments] = useState(false);
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState("");

  const toggleComments = async () => {
    if (!showComments && comments.length === 0) {
      try {
        const res = await fetch(`${BASE}/post/${post.id}/comments`);
        const data = await res.json();
        setComments(data);
      } catch { }
    }
    setShowComments(!showComments);
  };

  const handlePostComment = async () => {
    if (newComment.trim().length < 3) return;
    try {
      const res = await fetch(`${BASE}/post/${post.id}/comment`, {
        method: "POST",
        headers: { ...authHdr(), "Content-Type": "application/json" },
        body: JSON.stringify({ body: newComment })
      });
      if (res.ok) {
        setNewComment("");
        const updated = await fetch(`${BASE}/post/${post.id}/comments`);
        setComments(await updated.json());
      }
    } catch { }
  };

  return (
    <article className="feed-card">
      <div className="feed-header">
        <Avatar name={post.authorName} size={34} />
        <div className="feed-meta">
          <span className="feed-author">{post.authorName || "Anonymous"}</span>
          <span className="feed-time">{new Date(post.createdAt).toLocaleDateString()}</span>
        </div>
      </div>
      <h4 className="feed-title">{post.title}</h4>
      <p className="feed-body">{post.body}</p>

      {post.attachment && (
        <div style={{ margin: "12px 0", borderRadius: "8px", overflow: "hidden", maxHeight: "250px" }}>
          <img src={`http://localhost:8000${post.attachment}`} alt="Post Attachment" style={{ width: "100%", objectFit: "cover" }} />
        </div>
      )}

      <div className="feed-actions">
        <span className="feed-action-btn passive">★ {post.likes || 0}</span>
        <button className="feed-action-btn" onClick={toggleComments}>💬 {post.replyCount || 0} Replies</button>
      </div>

      {showComments && (
        <div style={{ marginTop: "12px", paddingTop: "12px", borderTop: "1px solid #e2e8f0" }}>
          {isLogged() && (
            <div style={{ display: "flex", gap: "8px", marginBottom: "10px" }}>
              <input
                type="text"
                placeholder="Write a comment..."
                value={newComment}
                onChange={e => setNewComment(e.target.value)}
                style={{ flex: 1, padding: "6px 10px", fontSize: "0.85rem", border: "1px solid #cbd5e1", borderRadius: "6px" }}
              />
              <button onClick={handlePostComment} style={{ padding: "6px 12px", background: "#489c8c", color: "white", border: "none", borderRadius: "6px", fontSize: "0.85rem", cursor: "pointer" }}>Reply</button>
            </div>
          )}
          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            {comments.map(c => (
              <div key={c.id} style={{ background: "#f8fafc", padding: "8px 12px", borderRadius: "6px", fontSize: "0.85rem" }}>
                <strong>{c.author_name}</strong>: {c.body}
              </div>
            ))}
          </div>
        </div>
      )}
    </article>
  );
};

const UserProfileView = () => {
  const navigate = useNavigate();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [activeTab, setActiveTab] = useState("profile"); // 'profile' | 'security'

  const [headline, setHeadline] = useState("");
  const [bio, setBio] = useState("");
  const [skillsInput, setSkillsInput] = useState("");
  const [socials, setSocials] = useState({ github: "", linkedin: "", x: "", reddit: "" });

  // Security states
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [newEmail, setNewEmail] = useState("");

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  const fetchProfile = useCallback(() => {
    setLoading(true);
    fetch(`${BASE}/profile/me`, { headers: authHdr() })
      .then(res => res.json())
      .then(data => {
        setProfile(data);
        setHeadline(data.headline || "");
        setBio(data.bio || "");
        setSkillsInput(data.skills ? data.skills.join(", ") : "");
        setSocials(data.social_links || { github: "", linkedin: "", x: "", reddit: "" });
        setNewEmail(data.email || "");
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  useEffect(() => { fetchProfile(); }, [fetchProfile]);

  const handleSaveProfile = async () => {
    setSaving(true);
    setError(""); setSuccessMsg("");
    try {
      const skillsArray = skillsInput.split(",").map(s => s.trim()).filter(Boolean);
      const res = await fetch(`${BASE}/profile/me`, {
        method: "PUT",
        headers: { ...authHdr(), "Content-Type": "application/json" },
        body: JSON.stringify({ headline, bio, skills: skillsArray, social_links: socials })
      });
      if (!res.ok) { const d = await res.json(); throw new Error(d.error || "Failed to update profile"); }
      setSuccessMsg("Profile updated successfully!");
      setIsEditing(false);
      fetchProfile();
    } catch (e) { setError(e.message); }
    finally { setSaving(false); }
  };

  const handleChangePassword = async () => {
    setSaving(true); setError(""); setSuccessMsg("");
    try {
      const res = await fetch(`${BASE}/profile/password`, {
        method: "PUT",
        headers: { ...authHdr(), "Content-Type": "application/json" },
        body: JSON.stringify({ old_password: oldPassword, new_password: newPassword })
      });
      if (!res.ok) { const d = await res.json(); throw new Error(d.error || "Failed to update password"); }
      setSuccessMsg("Password changed successfully!");
      setOldPassword(""); setNewPassword("");
    } catch (e) { setError(e.message); }
    finally { setSaving(false); }
  };

  const handleChangeEmail = async () => {
    setSaving(true); setError(""); setSuccessMsg("");
    try {
      const res = await fetch(`${BASE}/profile/email`, {
        method: "PUT",
        headers: { ...authHdr(), "Content-Type": "application/json" },
        body: JSON.stringify({ email: newEmail })
      });
      if (!res.ok) { const d = await res.json(); throw new Error(d.error || "Failed to update email"); }
      setSuccessMsg("Email changed successfully!");
      fetchProfile();
    } catch (e) { setError(e.message); }
    finally { setSaving(false); }
  };

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("userRole");
    localStorage.removeItem("username");
    navigate("/");
    window.location.reload();
  };

  if (loading) return <Spinner />;
  if (!profile) return <div style={{ padding: "40px", textAlign: "center" }}>Please sign in to view your profile.</div>;

  return (
    <div style={{ background: "white", padding: "32px", borderRadius: "16px", boxShadow: "0 10px 25px -5px rgba(0,0,0,0.05)", maxWidth: "680px", margin: "30px auto", border: "1px solid #e2e8f0" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "20px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "20px" }}>
          <Avatar name={profile.name} size={72} />
          <div>
            <h2 style={{ margin: 0, fontSize: "1.6rem", color: "#0f172a", fontWeight: "800" }}>{profile.name}</h2>
            <p style={{ margin: "4px 0 0", color: "#64748b", fontSize: "0.9rem" }}>
              {profile.email} • <span style={{ textTransform: "capitalize", background: "#f1f5f9", padding: "2px 8px", borderRadius: "4px", fontWeight: "600", color: "#489c8c" }}>{profile.role}</span>
            </p>
          </div>
        </div>
        <button onClick={handleLogout} style={{ background: "#fee2e2", border: "1px solid #fca5a5", color: "#991b1b", padding: "8px 14px", borderRadius: "8px", fontWeight: "600", fontSize: "0.8rem", cursor: "pointer" }}>
          🚪 Log Out
        </button>
      </div>

      {/* Profile Inner Sub-Tabs */}
      <div style={{ display: "flex", gap: "10px", borderBottom: "1px solid #e2e8f0", marginBottom: "24px", paddingBottom: "10px" }}>
        <button onClick={() => { setActiveTab("profile"); setError(""); setSuccessMsg(""); }} style={{ background: activeTab === "profile" ? "#489c8c" : "#f1f5f9", color: activeTab === "profile" ? "white" : "#475569", border: "none", padding: "6px 14px", borderRadius: "6px", fontSize: "0.85rem", fontWeight: "600", cursor: "pointer" }}>
          👤 Profile & Socials
        </button>
        <button onClick={() => { setActiveTab("security"); setError(""); setSuccessMsg(""); }} style={{ background: activeTab === "security" ? "#489c8c" : "#f1f5f9", color: activeTab === "security" ? "white" : "#475569", border: "none", padding: "6px 14px", borderRadius: "6px", fontSize: "0.85rem", fontWeight: "600", cursor: "pointer" }}>
          🔒 Account Security
        </button>
      </div>

      {error && <div style={{ background: "#fee2e2", color: "#991b1b", padding: "10px 14px", borderRadius: "8px", fontSize: "0.85rem", marginBottom: "16px" }}>{error}</div>}
      {successMsg && <div style={{ background: "#d1fae5", color: "#065f46", padding: "10px 14px", borderRadius: "8px", fontSize: "0.85rem", marginBottom: "16px" }}>{successMsg}</div>}

      {activeTab === "profile" && (
        <div>
          {!isEditing ? (
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
                <p style={{ fontWeight: "700", color: "#1e293b", fontSize: "1.05rem", margin: 0 }}>{headline || "AI Community Member"}</p>
                <button onClick={() => setIsEditing(true)} style={{ background: "#f8fafc", border: "1px solid #cbd5e1", color: "#334155", padding: "6px 12px", borderRadius: "6px", fontWeight: "600", fontSize: "0.8rem", cursor: "pointer" }}>
                  ✏️ Edit Profile
                </button>
              </div>

              <p style={{ color: "#475569", lineHeight: "1.6", marginBottom: "20px", whiteSpace: "pre-wrap" }}>{bio || "No biography added yet."}</p>

              <div style={{ marginBottom: "20px" }}>
                <h4 style={{ margin: "0 0 10px", fontSize: "0.85rem", color: "#0f172a", textTransform: "uppercase", letterSpacing: "0.05em" }}>External Reach</h4>
                <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
                  {profile.social_links?.github && <a href={profile.social_links.github} target="_blank" rel="noreferrer" style={{ background: "#24292e", color: "white", padding: "6px 12px", borderRadius: "6px", fontSize: "0.8rem", textDecoration: "none", fontWeight: "600" }}>GitHub ↗</a>}
                  {profile.social_links?.linkedin && <a href={profile.social_links.linkedin} target="_blank" rel="noreferrer" style={{ background: "#0a66c2", color: "white", padding: "6px 12px", borderRadius: "6px", fontSize: "0.8rem", textDecoration: "none", fontWeight: "600" }}>LinkedIn ↗</a>}
                  {profile.social_links?.x && <a href={profile.social_links.x} target="_blank" rel="noreferrer" style={{ background: "#000000", color: "white", padding: "6px 12px", borderRadius: "6px", fontSize: "0.8rem", textDecoration: "none", fontWeight: "600" }}>X (Twitter) ↗</a>}
                  {profile.social_links?.reddit && <a href={profile.social_links.reddit} target="_blank" rel="noreferrer" style={{ background: "#ff4500", color: "white", padding: "6px 12px", borderRadius: "6px", fontSize: "0.8rem", textDecoration: "none", fontWeight: "600" }}>Reddit ↗</a>}
                  {(!profile.social_links || Object.values(profile.social_links).every(v => !v)) && <span style={{ fontSize: "0.85rem", color: "#94a3b8" }}>No external links provided.</span>}
                </div>
              </div>

              <div style={{ borderTop: "1px solid #f1f5f9", paddingTop: "16px" }}>
                <h4 style={{ margin: "0 0 10px", fontSize: "0.85rem", color: "#0f172a", textTransform: "uppercase", letterSpacing: "0.05em" }}>Expertise & Stack</h4>
                <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
                  {profile.skills?.map((s, idx) => (
                    <span key={idx} style={{ background: "rgba(72, 156, 140, 0.1)", color: "#2b584d", padding: "4px 10px", borderRadius: "6px", fontSize: "0.8rem", fontWeight: "600" }}>{s}</span>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "14px", background: "#f8fafc", padding: "20px", borderRadius: "12px", border: "1px solid #e2e8f0" }}>
              <div>
                <label style={{ display: "block", fontSize: "0.8rem", fontWeight: "700", color: "#475569", marginBottom: "4px" }}>Professional Headline</label>
                <input type="text" value={headline} onChange={e => setHeadline(e.target.value)} placeholder="e.g. AI Researcher & Backend Engineer" style={{ width: "100%", padding: "8px 12px", border: "1px solid #cbd5e1", borderRadius: "8px", fontSize: "0.9rem" }} />
              </div>
              <div>
                <label style={{ display: "block", fontSize: "0.8rem", fontWeight: "700", color: "#475569", marginBottom: "4px" }}>Bio & Research Focus</label>
                <textarea rows={3} value={bio} onChange={e => setBio(e.target.value)} placeholder="Tell the community what you are working on..." style={{ width: "100%", padding: "8px 12px", border: "1px solid #cbd5e1", borderRadius: "8px", fontSize: "0.9rem" }} />
              </div>
              <div>
                <label style={{ display: "block", fontSize: "0.8rem", fontWeight: "700", color: "#475569", marginBottom: "4px" }}>Skills (comma separated)</label>
                <input type="text" value={skillsInput} onChange={e => setSkillsInput(e.target.value)} placeholder="Python, PyTorch, FastAPI, Docker" style={{ width: "100%", padding: "8px 12px", border: "1px solid #cbd5e1", borderRadius: "8px", fontSize: "0.9rem" }} />
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
                <input type="text" placeholder="GitHub URL" value={socials.github || ""} onChange={e => setSocials({ ...socials, github: e.target.value })} style={{ padding: "8px 10px", border: "1px solid #cbd5e1", borderRadius: "8px", fontSize: "0.85rem" }} />
                <input type="text" placeholder="LinkedIn URL" value={socials.linkedin || ""} onChange={e => setSocials({ ...socials, linkedin: e.target.value })} style={{ padding: "8px 10px", border: "1px solid #cbd5e1", borderRadius: "8px", fontSize: "0.85rem" }} />
                <input type="text" placeholder="X (Twitter) URL" value={socials.x || ""} onChange={e => setSocials({ ...socials, x: e.target.value })} style={{ padding: "8px 10px", border: "1px solid #cbd5e1", borderRadius: "8px", fontSize: "0.85rem" }} />
                <input type="text" placeholder="Reddit Profile URL" value={socials.reddit || ""} onChange={e => setSocials({ ...socials, reddit: e.target.value })} style={{ padding: "8px 10px", border: "1px solid #cbd5e1", borderRadius: "8px", fontSize: "0.85rem" }} />
              </div>
              <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px", marginTop: "8px" }}>
                <button onClick={() => setIsEditing(false)} style={{ background: "transparent", border: "none", color: "#64748b", fontWeight: "600", cursor: "pointer" }}>Cancel</button>
                <button onClick={handleSaveProfile} disabled={saving} style={{ background: "#489c8c", color: "white", border: "none", padding: "8px 20px", borderRadius: "8px", fontWeight: "600", cursor: "pointer" }}>{saving ? "Saving..." : "Save Changes"}</button>
              </div>
            </div>
          )}
        </div>
      )}

      {activeTab === "security" && (
        <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
          {/* Change Email Form */}
          <div style={{ background: "#f8fafc", padding: "16px", borderRadius: "10px", border: "1px solid #e2e8f0" }}>
            <h4 style={{ margin: "0 0 10px", fontSize: "0.9rem", color: "#0f172a" }}>Update Email Address</h4>
            <div style={{ display: "flex", gap: "10px" }}>
              <input type="email" value={newEmail} onChange={e => setNewEmail(e.target.value)} style={{ flex: 1, padding: "8px 12px", border: "1px solid #cbd5e1", borderRadius: "8px", fontSize: "0.9rem" }} />
              <button onClick={handleChangeEmail} disabled={saving} style={{ background: "#489c8c", color: "white", border: "none", padding: "8px 16px", borderRadius: "8px", fontWeight: "600", fontSize: "0.85rem", cursor: "pointer" }}>Update Email</button>
            </div>
          </div>

          {/* Change Password Form */}
          <div style={{ background: "#f8fafc", padding: "16px", borderRadius: "10px", border: "1px solid #e2e8f0" }}>
            <h4 style={{ margin: "0 0 10px", fontSize: "0.9rem", color: "#0f172a" }}>Change Password</h4>
            <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
              <input type="password" placeholder="Current Password" value={oldPassword} onChange={e => setOldPassword(e.target.value)} style={{ padding: "8px 12px", border: "1px solid #cbd5e1", borderRadius: "8px", fontSize: "0.9rem" }} />
              <input type="password" placeholder="New Password (min 6 chars)" value={newPassword} onChange={e => setNewPassword(e.target.value)} style={{ padding: "8px 12px", border: "1px solid #cbd5e1", borderRadius: "8px", fontSize: "0.9rem" }} />
              <button onClick={handleChangePassword} disabled={saving} style={{ alignSelf: "flex-end", background: "#489c8c", color: "white", border: "none", padding: "8px 16px", borderRadius: "8px", fontWeight: "600", fontSize: "0.85rem", cursor: "pointer" }}>Change Password</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const Community = () => {
  const navigate = useNavigate();
  const [tab, setTab] = useState("challenges");
  const [challenges, setChallenges] = useState([]);
  const [activeChallenge, setActiveChallenge] = useState(null);
  const [feed, setFeed] = useState([]);
  const [loadingC, setLoadingC] = useState(true);
  const [loadingF, setLoadingF] = useState(true);
  const [showPostForm, setShowPostForm] = useState(false);
  const [postTitle, setPostTitle] = useState("");
  const [postBody, setPostBody] = useState("");
  const [postImage, setPostImage] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [postError, setPostError] = useState("");
  const [posting, setPosting] = useState(false);

  const fetchChallenges = useCallback(async () => {
    setLoadingC(true);
    try {
      const res = await fetch(`${BASE}/challenges`);
      const data = await res.json();
      setChallenges(data.challenges || []);
    } catch { } finally { setLoadingC(false); }
  }, []);

  const fetchFeed = useCallback(async () => {
    setLoadingF(true);
    try {
      const res = await fetch(`${BASE}/feed`);
      const data = await res.json();
      setFeed(data.posts || []);
    } catch { } finally { setLoadingF(false); }
  }, []);

  useEffect(() => { fetchChallenges(); }, [fetchChallenges]);
  useEffect(() => { if (tab === "feed") fetchFeed(); }, [tab, fetchFeed]);

  const handleImageSelection = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        setPostError("File size exceeds 5MB limit.");
        return;
      }
      setPostError("");
      setPostImage(file);
      setImagePreview(URL.createObjectURL(file));
    }
  };

  const submitPost = async () => {
    if (!postTitle.trim() || !postBody.trim()) { setPostError("Title and body required."); return; }
    setPosting(true); setPostError("");

    const formData = new FormData();
    formData.append("title", postTitle);
    formData.append("body", postBody);
    if (postImage) formData.append("attachment", postImage);

    try {
      const res = await fetch(`${BASE}/post`, {
        method: "POST",
        headers: authHdr(),
        body: formData
      });
      if (!res.ok) { const d = await res.json(); throw new Error(d.error); }
      setShowPostForm(false);
      setPostTitle("");
      setPostBody("");
      setPostImage(null);
      setImagePreview(null);
      fetchFeed();
    } catch (e) { setPostError(e.message); }
    finally { setPosting(false); }
  };

  return (
    <div className="community-page">
      <header className="comm-hero">
        <div className="comm-hero-inner">
          <div className="comm-hero-tag">🧠 Research Community</div>
          <h1>Crowdsource solutions.<br /><em>Build African AI.</em></h1>
        </div>
      </header>

      <div className="comm-tabs">
        <button className={"comm-tab " + (tab === "challenges" ? "comm-tab--active" : "")} onClick={() => { setTab("challenges"); setActiveChallenge(null); }}>🧩 Challenges</button>
        <button className={"comm-tab " + (tab === "feed" ? "comm-tab--active" : "")} onClick={() => setTab("feed")}>💬 Insights Feed</button>
        {isLogged() && (
          <button className={"comm-tab " + (tab === "profile" ? "comm-tab--active" : "")} onClick={() => setTab("profile")}>👤 My Profile</button>
        )}
      </div>

      <main className="comm-main">
        {tab === "challenges" && (
          activeChallenge
            ? <ChallengeDetail challenge={activeChallenge} onBack={() => setActiveChallenge(null)} />
            : <div className="challenges-list">{challenges.map(c => <ChallengeCard key={c.id} challenge={c} onClick={setActiveChallenge} />)}</div>
        )}

        {tab === "feed" && (
          <section className="comm-section">
            <div className="comm-section-head">
              <h2>Insights Feed</h2>
              {isLogged() && <button className="feed-post-btn" onClick={() => setShowPostForm(s => !s)}>+ Share Insight</button>}
            </div>

            {showPostForm && (
              <div className="post-form">
                {postError && <p className="post-form-error">{postError}</p>}
                <input className="post-form-title" placeholder="Insight title..." value={postTitle} onChange={e => setPostTitle(e.target.value)} />
                <textarea className="post-form-body" rows={4} placeholder="Share observation..." value={postBody} onChange={e => setPostBody(e.target.value)} />

                {imagePreview && (
                  <div style={{ position: "relative", marginBottom: "12px", maxHeight: "150px", overflow: "hidden", borderRadius: "8px" }}>
                    <img src={imagePreview} alt="Preview" style={{ width: "100%", objectFit: "cover" }} />
                    <button type="button" onClick={() => { setPostImage(null); setImagePreview(null); }} style={{ position: "absolute", top: "8px", right: "8px", background: "#ef4444", color: "white", border: "none", borderRadius: "50%", padding: "4px 8px", cursor: "pointer" }}>✕</button>
                  </div>
                )}

                <div className="post-form-actions" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <label style={{ cursor: "pointer", color: "#489c8c", fontSize: "0.85rem", fontWeight: 600 }}>
                    📷 Attach Image (Max 5MB)
                    <input type="file" accept="image/png, image/jpeg, image/webp, image/gif" onChange={handleImageSelection} style={{ display: "none" }} />
                  </label>
                  <div>
                    <button className="post-form-cancel" onClick={() => setShowPostForm(false)}>Cancel</button>
                    <button className="post-form-submit" onClick={submitPost} disabled={posting}>{posting ? "Publishing..." : "Publish"}</button>
                  </div>
                </div>
              </div>
            )}

            <div className="feed-list">{feed.map(p => <FeedCard key={p.id} post={p} />)}</div>
          </section>
        )}

        {tab === "profile" && <UserProfileView />}
      </main>
    </div>
  );
};

export default Community;