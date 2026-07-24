import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import "../styles/community.css";

const BASE      = "http://localhost:8000/api/community";
const getToken    = () => localStorage.getItem("token");
const getRole     = () => (localStorage.getItem("userRole") || "").toLowerCase();
const getUsername = () => localStorage.getItem("username") || "Member";
const getUserId   = () => localStorage.getItem("ownerId") || null;
const isLogged    = () => !!getToken();
const authHdr     = () => ({ Authorization: `Bearer ${getToken()}`, "Content-Type": "application/json" });

const getBadge = (n) => {
  if (n >= 250) return { label: "Guardian",    color: "#489c8c" };
  if (n >= 100) return { label: "Expert",      color: "#8b5cf6" };
  if (n >= 50)  return { label: "Contributor", color: "#3b82f6" };
  if (n >= 10)  return { label: "Verified",    color: "#10b981" };
  if (n >= 1)   return { label: "Pioneer",     color: "#f59e0b" };
  return null;
};

const Avatar = ({ name, size = 38 }) => {
  const initials = (name || "?").split(" ").map(w => w[0]).join("").toUpperCase().slice(0, 2);
  return (
    <div style={{
      width: size, height: size, borderRadius: 10,
      background: "linear-gradient(135deg,#489c8c,#367a6d)",
      display: "flex", alignItems: "center", justifyContent: "center",
      fontWeight: 800, fontSize: size * 0.34, color: "white", flexShrink: 0
    }}>
      {initials}
    </div>
  );
};

const Spinner = () => (
  <div className="comm-spinner"><div className="comm-spinner-ring" /></div>
);

// ─── Challenge Card ────────────────────────────────────────────────────────────
const ChallengeCard = ({ challenge, onClick }) => (
  <div
    className={"challenge-card " + (challenge.is_pinned ? "challenge-card--pinned" : "")}
    onClick={() => onClick(challenge)}
  >
    {challenge.is_pinned && (
      <div className="pinned-badge">📌 Idea of the Week</div>
    )}
    <h3 className="challenge-title">{challenge.title}</h3>
    <p className="challenge-body">{challenge.body.slice(0, 180)}{challenge.body.length > 180 ? "..." : ""}</p>
    <div className="challenge-footer">
      <span className="challenge-stat">💬 {challenge.response_count} responses</span>
      <span className="challenge-stat">★ {challenge.likes} likes</span>
      {challenge.reward_description && (
        <span className="challenge-reward">🏆 {challenge.reward_description}</span>
      )}
      <span className="challenge-cta">Contribute →</span>
    </div>
  </div>
);

// ─── Response Item ─────────────────────────────────────────────────────────────
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

// ─── Challenge Detail View ─────────────────────────────────────────────────────
const ChallengeDetail = ({ challenge, onBack }) => {
  const [responses, setResponses] = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [newResp,   setNewResp]   = useState("");
  const [posting,   setPosting]   = useState(false);
  const [error,     setError]     = useState("");

  const fetchResponses = useCallback(async () => {
    setLoading(true);
    try {
      const res  = await fetch(`${BASE}/challenge/${challenge.id}/responses`);
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
        method: "POST", headers: authHdr(),
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

      {challenge.is_pinned && <div className="pinned-badge large">📌 Idea of the Week</div>}
      <h2 className="detail-title">{challenge.title}</h2>
      <p className="detail-body">{challenge.body}</p>

      {challenge.reward_description && (
        <div className="reward-box">
          🏆 <strong>Reward:</strong> {challenge.reward_description}
        </div>
      )}

      <div className="response-count-bar">
        <strong>{responses.length}</strong> contributions — ranked by community upvotes
      </div>

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
        <div className="login-gate">
          Sign in to contribute to this challenge.
        </div>
      )}

      {loading ? <Spinner /> : (
        <div className="responses-list">
          {responses.length === 0 ? (
            <div className="comm-empty">
              <p>No contributions yet. Be the first to propose a solution.</p>
            </div>
          ) : responses.map((r, i) => (
            <ResponseItem key={r.id} resp={r} rank={i + 1} onUpvote={upvote} />
          ))}
        </div>
      )}
    </div>
  );
};

// ─── Feed Card ─────────────────────────────────────────────────────────────────
const FeedCard = ({ post }) => (
  <article className={"feed-card " + (post.type === "flag" ? "feed-card--flag" : "")}>
    <div className="feed-header">
      <Avatar name={post.author} size={34} />
      <div className="feed-meta">
        <span className="feed-author">{post.author || "Anonymous"}</span>
        <span className="feed-time">{post.time}</span>
      </div>
      {post.type === "flag" && <span className="feed-flag-pill">⚑ Flag</span>}
    </div>
    <h4 className="feed-title">{post.title}</h4>
    <p className="feed-body">{post.body}</p>
    <div className="feed-actions">
      <span className="feed-action-btn passive">★ {post.likes || 0}</span>
      <span className="feed-action-btn passive">💬 {post.replies || 0}</span>
    </div>
  </article>
);

// ─── Main Community Component ──────────────────────────────────────────────────
const Community = () => {
  const navigate = useNavigate();

  const [tab,              setTab]             = useState("challenges");
  const [challenges,       setChallenges]      = useState([]);
  const [activeChallenge,  setActiveChallenge] = useState(null);
  const [feed,             setFeed]            = useState([]);
  const [leaderboard,      setLeaderboard]     = useState([]);
  const [loadingC,         setLoadingC]        = useState(true);
  const [loadingF,         setLoadingF]        = useState(true);
  const [loadingL,         setLoadingL]        = useState(true);
  const [showPostForm,     setShowPostForm]    = useState(false);
  const [postTitle,        setPostTitle]       = useState("");
  const [postBody,         setPostBody]        = useState("");
  const [postError,        setPostError]       = useState("");
  const [posting,          setPosting]         = useState(false);

  const fetchChallenges = useCallback(async () => {
    setLoadingC(true);
    try {
      const res  = await fetch(`${BASE}/challenges`);
      const data = await res.json();
      setChallenges(data.challenges || []);
    } catch {} finally { setLoadingC(false); }
  }, []);

  const fetchFeed = useCallback(async () => {
    setLoadingF(true);
    try {
      const res  = await fetch(`${BASE}/feed`);
      const data = await res.json();
      setFeed(data.posts || []);
    } catch {} finally { setLoadingF(false); }
  }, []);

  const fetchLeaderboard = useCallback(async () => {
    setLoadingL(true);
    try {
      const res  = await fetch(`${BASE}/leaderboard`);
      const data = await res.json();
      setLeaderboard(data.map((c, i) => ({ ...c, rank: i + 1 })));
    } catch {} finally { setLoadingL(false); }
  }, []);

  useEffect(() => { fetchChallenges(); }, [fetchChallenges]);
  useEffect(() => { if (tab === "feed") fetchFeed(); }, [tab, fetchFeed]);
  useEffect(() => { if (tab === "rankings") fetchLeaderboard(); }, [tab, fetchLeaderboard]);

  const submitPost = async () => {
    if (!postTitle.trim() || !postBody.trim()) { setPostError("Title and body required."); return; }
    setPosting(true); setPostError("");
    try {
      const res = await fetch(`${BASE}/post`, {
        method: "POST", headers: authHdr(),
        body: JSON.stringify({ title: postTitle, body: postBody })
      });
      if (!res.ok) { const d = await res.json(); throw new Error(d.error); }
      setShowPostForm(false); setPostTitle(""); setPostBody("");
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
          <p>
            Weekly challenges. Ranked contributions. Real problems that shape
            what SemaData builds next. Not a chat — a research engine.
          </p>
          {!isLogged() && (
            <button className="comm-hero-cta" onClick={() => navigate("/signup?role=community")}>
              Join 500 founding members →
            </button>
          )}
        </div>
      </header>

      {isLogged() && (
        <div style={{
          background: "#0f172a", padding: "0.875rem 2rem",
          display: "flex", alignItems: "center", gap: 12
        }}>
          <div style={{
            width: 34, height: 34, borderRadius: 9,
            background: "#489c8c", display: "flex",
            alignItems: "center", justifyContent: "center",
            fontWeight: 800, fontSize: "0.8rem", color: "white", flexShrink: 0
          }}>
            {getUsername().slice(0,2).toUpperCase()}
          </div>
          <div>
            <p style={{ margin: 0, fontWeight: 700, fontSize: "0.85rem", color: "white" }}>
              {getUsername()}
            </p>
            <p style={{ margin: 0, fontSize: "0.72rem", color: "#64748b" }}>
              {getRole() === "community" ? "Community Member" : getRole()}
            </p>
          </div>
          <div style={{ marginLeft: "auto", fontSize: "0.72rem", color: "#489c8c", fontWeight: 700 }}>
            Founding Member
          </div>
        </div>
      )}

      <div className="comm-tabs">
        <button className={"comm-tab " + (tab === "challenges" ? "comm-tab--active" : "")} onClick={() => { setTab("challenges"); setActiveChallenge(null); }}>
          🧩 Challenges
        </button>
        <button className={"comm-tab " + (tab === "feed"       ? "comm-tab--active" : "")} onClick={() => setTab("feed")}>
          💬 Insights Feed
        </button>
        <button className={"comm-tab " + (tab === "rankings"   ? "comm-tab--active" : "")} onClick={() => setTab("rankings")}>
          🏆 Rankings
        </button>
      </div>

      <main className="comm-main">

        {tab === "challenges" && (
          activeChallenge
            ? <ChallengeDetail challenge={activeChallenge} onBack={() => setActiveChallenge(null)} />
            : (
              <section className="comm-section">
                <div className="comm-section-head">
                  <div>
                    <h2>Active Challenges</h2>
                    <p>Pick a challenge, propose a solution, get ranked by the community.</p>
                  </div>
                </div>
                {loadingC ? <Spinner /> : challenges.length === 0 ? (
                  <div className="comm-empty"><p>No challenges yet. Check back soon.</p></div>
                ) : (
                  <div className="challenges-list">
                    {challenges.map(c => (
                      <ChallengeCard key={c.id} challenge={c} onClick={setActiveChallenge} />
                    ))}
                  </div>
                )}
              </section>
            )
        )}

        {tab === "feed" && (
          <section className="comm-section">
            <div className="comm-section-head">
              <div>
                <h2>Insights Feed</h2>
                <p>Share findings, linguistic notes, dataset observations.</p>
              </div>
              {isLogged() && (
                <button className="feed-post-btn" onClick={() => setShowPostForm(s => !s)}>
                  + Share Insight
                </button>
              )}
            </div>
            {!isLogged() && (
              <div className="feed-login-prompt">
                <strong>Join the conversation</strong> —{" "}
                <button onClick={() => navigate("/login?fresh=true")}>sign in</button>
                {" "}to post.
              </div>
            )}
            {showPostForm && (
              <div className="post-form">
                {postError && <p className="post-form-error">{postError}</p>}
                <input className="post-form-title" placeholder="Insight title..." value={postTitle} onChange={e => setPostTitle(e.target.value)} />
                <textarea className="post-form-body" rows={4} placeholder="Share your observation, finding or insight..." value={postBody} onChange={e => setPostBody(e.target.value)} />
                <div className="post-form-actions">
                  <button className="post-form-cancel" onClick={() => setShowPostForm(false)}>Cancel</button>
                  <button className="post-form-submit" onClick={submitPost} disabled={posting}>{posting ? "Publishing..." : "Publish"}</button>
                </div>
              </div>
            )}
            {loadingF ? <Spinner /> : feed.length === 0 ? (
              <div className="comm-empty"><p>No insights yet. Share the first one.</p></div>
            ) : (
              <div className="feed-list">{feed.map(p => <FeedCard key={p.id} post={p} />)}</div>
            )}
          </section>
        )}

        {tab === "rankings" && (
          <section className="comm-section">
            <div className="comm-section-head">
              <div>
                <h2>Contributor Rankings</h2>
                <p>Ranked by total upvotes received across all challenge contributions.</p>
              </div>
            </div>
            {loadingL ? <Spinner /> : leaderboard.length === 0 ? (
              <div className="comm-empty"><p>No ranked contributors yet.</p></div>
            ) : (
              <div className="lb-list">
                {leaderboard.map((c, i) => {
                  const badge = getBadge(c.submissions);
                  return (
                    <div key={c.id} className={"lb-row " + (i < 3 ? "lb-row--top" : "")}>
                      <span className="lb-rank">{i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : `#${i+1}`}</span>
                      <Avatar name={c.name} size={40} />
                      <div className="lb-info">
                        <span className="lb-name">{c.name}</span>
                        <span className="lb-domain">{c.domain || "Community"}</span>
                      </div>
                      {badge && <span className="lb-badge" style={{ color: badge.color, borderColor: badge.color }}>{badge.label}</span>}
                      <div className="lb-score">
                        <span className="lb-count">{c.submissions}</span>
                        <span className="lb-unit">contributions</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
            <div className="lb-cta">
              <p>Want to climb the rankings?</p>
              <button onClick={() => { setTab("challenges"); setActiveChallenge(null); }}>
                Start Contributing →
              </button>
            </div>
          </section>
        )}

      </main>
    </div>
  );
};

export default Community;
