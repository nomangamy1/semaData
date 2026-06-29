import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import "../styles/community.css";

const BASE = "http://localhost:8000/api/community";
const getToken = () => localStorage.getItem("token");
const getRole  = () => (localStorage.getItem("userRole") || "").toLowerCase();
const isLoggedIn = () => !!getToken();
const authHeaders = () => ({
  Authorization: `Bearer ${getToken()}`,
  "Content-Type": "application/json"
});

const getBadge = (n) => {
  const badges = [
    { label: "Guardian",    min: 250, color: "#489c8c" },
    { label: "Expert",      min: 100, color: "#8b5cf6" },
    { label: "Contributor", min: 50,  color: "#3b82f6" },
    { label: "Verified",    min: 10,  color: "#10b981" },
    { label: "Pioneer",     min: 1,   color: "#f59e0b" },
  ];
  return badges.find(b => n >= b.min) || null;
};

const getRank = (r) => r === 1 ? "🥇" : r === 2 ? "🥈" : r === 3 ? "🥉" : `#${r}`;

const Spinner = () => (
  <div className="comm-spinner">
    <div className="comm-spinner-ring" />
  </div>
);

const Avatar = ({ name, size = 40 }) => {
  const initials = (name || "?").split(" ").map(w => w[0]).join("").toUpperCase().slice(0, 2);
  return (
    <div className="comm-avatar" style={{ width: size, height: size, fontSize: size * 0.35 }}>
      {initials}
    </div>
  );
};

const FeedCard = ({ post, onLike }) => {
  const [liked,  setLiked]  = useState(false);
  const [likes,  setLikes]  = useState(post.likes || 0);
  const isFlag = post.type === "flag";

  const handleLike = async () => {
    if (!getToken()) return;
    setLiked(!liked);
    setLikes(l => liked ? l - 1 : l + 1);
    try {
      await fetch(`${BASE}/post/${post.id}/like`, {
        method: "POST", headers: authHeaders()
      });
    } catch {}
  };

  return (
    <article className={`feed-card ${isFlag ? "feed-card--flag" : ""}`}>
      <div className="feed-header">
        <Avatar name={post.author} size={36} />
        <div className="feed-meta">
          <span className="feed-author">{post.author || "Anonymous"}</span>
          <span className="feed-time">{post.time}</span>
        </div>
        <span className="feed-domain-tag">{post.domain || "General"}</span>
        {isFlag && <span className="feed-flag-pill">⚑ Flag</span>}
      </div>
      <h4 className="feed-title">{post.title}</h4>
      <p className="feed-body">{post.body}</p>
      <div className="feed-actions">
        <button
          className={"feed-action-btn " + (liked ? "liked" : "")}
          onClick={handleLike}
          disabled={!isLoggedIn()}
        >
          ★ {likes}
        </button>
        <span className="feed-action-btn passive">
          💬 {post.replies || 0}
        </span>
      </div>
    </article>
  );
};

const PostForm = ({ onPost, onCancel }) => {
  const [title, setTitle] = useState("");
  const [body,  setBody]  = useState("");
  const [busy,  setBusy]  = useState(false);
  const [err,   setErr]   = useState("");

  const submit = async () => {
    if (!title.trim() || !body.trim()) { setErr("Title and body required."); return; }
    setBusy(true); setErr("");
    try {
      const res  = await fetch(`${BASE}/post`, {
        method: "POST", headers: authHeaders(),
        body: JSON.stringify({ title, body })
      });
      const data = await res.json();
      if (!res.ok) { setErr(data.error || "Failed"); return; }
      onPost(data);
      setTitle(""); setBody("");
    } catch { setErr("Server error."); }
    finally { setBusy(false); }
  };

  return (
    <div className="post-form">
      {err && <p className="post-form-error">{err}</p>}
      <input
        className="post-form-title"
        placeholder="Post title..."
        value={title}
        onChange={e => setTitle(e.target.value)}
      />
      <textarea
        className="post-form-body"
        rows={4}
        placeholder="Share insights, ask questions, discuss African language AI..."
        value={body}
        onChange={e => setBody(e.target.value)}
      />
      <div className="post-form-actions">
        <button className="post-form-cancel" onClick={onCancel}>Cancel</button>
        <button className="post-form-submit" onClick={submit} disabled={busy}>
          {busy ? "Publishing..." : "Publish Post"}
        </button>
      </div>
    </div>
  );
};

const Community = () => {
  const navigate   = useNavigate();
  const loggedIn   = isLoggedIn();
  const username   = localStorage.getItem('username') || 'Guest';
  const role       = getRole();

  const [tab,           setTab]           = useState("feed");
  const [feed,          setFeed]          = useState([]);
  const [leaderboard,   setLeaderboard]   = useState([]);
  const [feedFilter,    setFeedFilter]    = useState("all");
  const [showPostForm,  setShowPostForm]  = useState(false);
  const [loadingFeed,   setLoadingFeed]   = useState(true);
  const [loadingLB,     setLoadingLB]     = useState(true);
  const [feedError,     setFeedError]     = useState("");
  const [lbError,       setLbError]       = useState("");
  const [searchQuery,   setSearchQuery]   = useState("");

  const fetchFeed = useCallback(async (type = "all") => {
    setLoadingFeed(true); setFeedError("");
    try {
      const res  = await fetch(`${BASE}/feed?type=${type}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed");
      setFeed(data.posts || []);
    } catch (e) { setFeedError("Could not load feed."); }
    finally { setLoadingFeed(false); }
  }, []);

  const fetchLeaderboard = useCallback(async () => {
    setLoadingLB(true); setLbError("");
    try {
      const res  = await fetch(`${BASE}/leaderboard`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed");
      setLeaderboard(data.map((c, i) => ({ ...c, rank: i + 1 })));
    } catch (e) { setLbError("Could not load leaderboard."); }
    finally { setLoadingLB(false); }
  }, []);

  useEffect(() => { fetchFeed(feedFilter); }, [feedFilter, fetchFeed]);
  useEffect(() => { if (tab === "leaderboard") fetchLeaderboard(); }, [tab, fetchLeaderboard]);

  const filteredFeed = feed.filter(p =>
    !searchQuery ||
    p.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.body?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleNewPost = (post) => {
    setFeed(prev => [post, ...prev]);
    setShowPostForm(false);
  };

  return (
    <div className="community-page">

      {/* Hero */}
      <header className="comm-hero">
        <div className="comm-hero-inner">
          <div className="comm-hero-tag">🌍 Africa Language Data Network</div>
          <h1>The humans behind<br /><em>every dataset</em></h1>
          <p>Connect with collectors, share insights, and help shape what African AI looks like.</p>
          {!loggedIn && (
            <button className="comm-hero-cta" onClick={() => navigate("/signup?role=community")}>
              Join the community →
            </button>
          )}
        </div>
      </header>

      {/* Tab nav */}
      <div className="comm-tabs">
        <button
          className={"comm-tab " + (tab === "feed" ? "comm-tab--active" : "")}
          onClick={() => setTab("feed")}
        >
          💬 Community Feed
        </button>
        <button
          className={"comm-tab " + (tab === "leaderboard" ? "comm-tab--active" : "")}
          onClick={() => setTab("leaderboard")}
        >
          🏆 Rankings
        </button>
      </div>

      <main className="comm-main">

        {/* ── FEED TAB ── */}
        {tab === "feed" && (
          <section className="comm-section">
            <div className="comm-section-head">
              <div className="feed-search-bar">
                <input
                  type="text"
                  placeholder="Search posts..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="feed-search-input"
                />
              </div>
              <div className="feed-controls">
                <div className="feed-filters">
                  {["all", "posts", "flags"].map(f => (
                    <button
                      key={f}
                      className={"feed-filter-btn " + (feedFilter === f ? "active" : "")}
                      onClick={() => setFeedFilter(f)}
                    >
                      {f === "all" ? "All" : f === "posts" ? "💬 Posts" : "⚑ Flags"}
                    </button>
                  ))}
                </div>
                {loggedIn && (
                  <button
                    className="feed-post-btn"
                    onClick={() => setShowPostForm(s => !s)}
                  >
                    + New Post
                  </button>
                )}
              </div>
            </div>

            {!loggedIn && (
              <div className="feed-login-prompt">
                <strong>Join the conversation</strong> —{" "}
                <button onClick={() => navigate("/login?fresh=true")}>sign in</button>
                {" "}or{" "}
                <button onClick={() => navigate("/signup?role=community")}>create a free account</button>
                {" "}to post and like.
              </div>
            )}

            {showPostForm && loggedIn && (
              <PostForm onPost={handleNewPost} onCancel={() => setShowPostForm(false)} />
            )}

            {loadingFeed ? <Spinner /> : feedError ? (
              <div className="comm-error">
                {feedError}
                <button onClick={() => fetchFeed(feedFilter)}>Retry</button>
              </div>
            ) : filteredFeed.length === 0 ? (
              <div className="comm-empty">
                <p>No posts yet. {loggedIn ? "Be the first to start a discussion." : "Sign up to start the conversation."}</p>
              </div>
            ) : (
              <div className="feed-list">
                {filteredFeed.map(post => (
                  <FeedCard key={post.id} post={post} onLike={() => {}} />
                ))}
              </div>
            )}
          </section>
        )}

        {/* ── LEADERBOARD TAB ── */}
        {tab === "leaderboard" && (
          <section className="comm-section">
            <div className="comm-section-head">
              <div>
                <h2>Contributor Rankings</h2>
                <p>Ranked by total verified submissions.</p>
              </div>
            </div>
            {loadingLB ? <Spinner /> : lbError ? (
              <div className="comm-error">{lbError} <button onClick={fetchLeaderboard}>Retry</button></div>
            ) : leaderboard.length === 0 ? (
              <div className="comm-empty"><p>No verified submissions yet. Be the first collector to contribute.</p></div>
            ) : (
              <div className="lb-list">
                {leaderboard.map((c, i) => {
                  const badge = getBadge(c.submissions);
                  return (
                    <div key={c.id} className={"lb-row " + (i < 3 ? "lb-row--top" : "")}>
                      <span className="lb-rank">{getRank(i + 1)}</span>
                      <Avatar name={c.name} size={42} />
                      <div className="lb-info">
                        <span className="lb-name">{c.name}</span>
                        <span className="lb-domain">{c.domain || "General"}</span>
                      </div>
                      {badge && (
                        <span className="lb-badge" style={{ color: badge.color, borderColor: badge.color }}>
                          {badge.label}
                        </span>
                      )}
                      <div className="lb-score">
                        <span className="lb-count">{c.submissions}</span>
                        <span className="lb-unit">verified</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
            <div className="lb-cta">
              <p>Want your name on this board?</p>
              <button onClick={() => navigate("/careers")}>Apply as a Collector →</button>
            </div>
          </section>
        )}
      </main>
    </div>
  );
};

export default Community;
