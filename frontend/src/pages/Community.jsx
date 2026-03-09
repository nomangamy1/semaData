import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import './Community.css';

const BASE = 'http://localhost:8000/api/community';

// ── Inline icons ─────────────────────────────────────────────
const Ic = ({ d, size = 18 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d={d} />
  </svg>
);
const IcFlag   = () => <Ic d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1zM4 22v-7" />;
const IcChat   = () => <Ic d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />;
const IcTrophy = () => <Ic d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6M18 9h1.5a2.5 2.5 0 0 0 0-5H18M8 21h8M12 17v4M17 9a5 5 0 1 1-10 0V4h10z" />;
const IcStar   = () => <Ic d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />;
const IcCheck  = () => <Ic d="M20 6L9 17l-5-5" />;
const IcPlus   = () => <Ic d="M12 5v14M5 12h14" />;
const IcGlobe  = () => <Ic d="M12 2a10 10 0 1 0 0 20A10 10 0 0 0 12 2zM2 12h20M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />;
const IcAlert  = () => <Ic d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0zM12 9v4M12 17h.01" />;
const IcArrow  = () => <Ic d="M19 12H5M12 5l7 7-7 7" />;

// ── Badge config ─────────────────────────────────────────────
const BADGES = [
  { id: 'pioneer',     label: 'Pioneer',     color: '#f59e0b', min: 1   },
  { id: 'verified',    label: 'Verified',    color: '#10b981', min: 10  },
  { id: 'contributor', label: 'Contributor', color: '#3b82f6', min: 50  },
  { id: 'expert',      label: 'Expert',      color: '#8b5cf6', min: 100 },
  { id: 'guardian',    label: 'Guardian',    color: '#489c8c', min: 250 },
];
const getBadge = (n) => [...BADGES].reverse().find(b => n >= b.min) || null;
const getRank  = (r) => r === 1 ? '🥇' : r === 2 ? '🥈' : r === 3 ? '🥉' : `#${r}`;

// ── Auth helpers ─────────────────────────────────────────────
const getToken    = () => localStorage.getItem('token');
const getRole     = () => (localStorage.getItem('userRole') || '').toLowerCase();
const getUsername = () => localStorage.getItem('username') || '';
const isLoggedIn  = () => !!getToken();
const authHeaders = () => ({ 'Authorization': `Bearer ${getToken()}`, 'Content-Type': 'application/json' });

// ── Sub-components ───────────────────────────────────────────

const Spinner = () => (
  <div className="comm-spinner">
    <div className="comm-spinner-ring" />
  </div>
);

const LeaderboardRow = ({ collector, rank, onClick }) => {
  const badge = getBadge(collector.submissions);
  return (
    <div className={`lb-row ${rank <= 3 ? 'lb-row--top' : ''}`} onClick={() => onClick(collector)}>
      <span className="lb-rank">{getRank(rank)}</span>
      <div className="lb-avatar">{collector.avatar || collector.name?.substring(0,2).toUpperCase()}</div>
      <div className="lb-info">
        <span className="lb-name">{collector.name}</span>
        <span className="lb-meta">{collector.domain || 'General'}</span>
      </div>
      {badge && (
        <span className="lb-badge" style={{'--badge-color': badge.color}}>{badge.label}</span>
      )}
      <div className="lb-score">
        <span className="lb-count">{collector.submissions}</span>
        <span className="lb-unit">verified</span>
      </div>
    </div>
  );
};

const FeedCard = ({ post, token, onRequireAuth }) => {
  const [liked,  setLiked]  = useState(false);
  const [likes,  setLikes]  = useState(post.likes || 0);
  const isFlag = post.type === 'flag';

  const handleLike = async () => {
    if (!token) { onRequireAuth(); return; }
    const next = !liked;
    setLiked(next);
    setLikes(l => next ? l + 1 : l - 1);
    try {
      await fetch(`${BASE}/post/${post.id}/like`, {
        method: 'POST', headers: authHeaders()
      });
    } catch { /* optimistic — ignore */ }
  };

  return (
    <article className={`feed-card ${isFlag ? 'feed-card--flag' : ''}`}>
      <div className="feed-header">
        <div className="feed-avatar">{post.avatar || post.author?.substring(0,2).toUpperCase()}</div>
        <div className="feed-meta">
          <span className="feed-author">{post.author}</span>
          <span className="feed-time">{post.time}</span>
        </div>
        <span className="feed-tag">{post.domain || 'General'}</span>
        {isFlag && <span className="feed-flag-badge"><IcAlert /> Quality Flag</span>}
      </div>
      <h4 className="feed-title">{post.title}</h4>
      <p className="feed-body">{post.body}</p>
      <div className="feed-actions">
        <button className={`feed-action ${liked ? 'feed-action--liked' : ''}`} onClick={handleLike}>
          <IcStar /> {likes}
        </button>
        <button className="feed-action">
          <IcChat /> {post.replies || 0} replies
        </button>
      </div>
    </article>
  );
};

const ProfileModal = ({ collector, onClose }) => {
  if (!collector) return null;
  const badge    = getBadge(collector.submissions);
  const nextBadge = BADGES.find(b => b.min > collector.submissions);
  const progress = nextBadge
    ? Math.round((collector.submissions / nextBadge.min) * 100)
    : 100;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card" onClick={e => e.stopPropagation()}>
        <div className="modal-hero">
          <div className="modal-avatar">{collector.avatar || collector.name?.substring(0,2).toUpperCase()}</div>
          <div className="modal-identity">
            <h2>{collector.name}</h2>
            {collector.username && <p>@{collector.username}</p>}
            {badge && <span className="modal-badge" style={{'--badge-color': badge.color}}>{badge.label}</span>}
          </div>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>
        <div className="modal-stats">
          <div className="modal-stat">
            <span className="modal-stat-val">{collector.submissions}</span>
            <span className="modal-stat-label">Verified Submissions</span>
          </div>
          <div className="modal-stat">
            <span className="modal-stat-val">{collector.domain || '—'}</span>
            <span className="modal-stat-label">Domain</span>
          </div>
          <div className="modal-stat">
            <span className="modal-stat-val">#{collector.rank}</span>
            <span className="modal-stat-label">Rank</span>
          </div>
        </div>
        <div className="modal-progress-section">
          <div className="modal-progress-label">
            <span>{nextBadge ? `Progress to ${nextBadge.label}` : 'Maximum badge reached'}</span>
            <span>{progress}%</span>
          </div>
          <div className="modal-progress-bar">
            <div className="modal-progress-fill"
              style={{width: `${progress}%`, '--badge-color': badge?.color || '#489c8c'}} />
          </div>
        </div>
        <div className="modal-badges-row">
          {BADGES.map(b => (
            <div key={b.id}
              className={`modal-badge-chip ${collector.submissions >= b.min ? 'earned' : 'locked'}`}
              style={{'--badge-color': b.color}}>
              {collector.submissions >= b.min ? <IcCheck /> : '🔒'} {b.label}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

const PostForm = ({ token, onPost, onCancel }) => {
  const [title, setTitle] = useState('');
  const [body,  setBody]  = useState('');
  const [busy,  setBusy]  = useState(false);
  const [err,   setErr]   = useState('');

  const submit = async () => {
    if (!title.trim() || !body.trim()) { setErr('Title and body are required.'); return; }
    setBusy(true); setErr('');
    try {
      const res  = await fetch(`${BASE}/post`, {
        method: 'POST', headers: authHeaders(),
        body: JSON.stringify({ title, body })
      });
      const data = await res.json();
      if (!res.ok) { setErr(data.error || 'Failed to post.'); return; }
      onPost(data);
      setTitle(''); setBody('');
    } catch { setErr('Server error. Try again.'); }
    finally { setBusy(false); }
  };

  return (
    <div className="post-form">
      {err && <p className="post-form-error">{err}</p>}
      <input className="post-form-title" placeholder="Post title…"
        value={title} onChange={e => setTitle(e.target.value)} />
      <textarea className="post-form-body" rows={4}
        placeholder="Share insights, ask questions, discuss African language AI…"
        value={body} onChange={e => setBody(e.target.value)} />
      <div className="post-form-actions">
        <button className="post-form-cancel" onClick={onCancel}>Cancel</button>
        <button className="post-form-submit" onClick={submit} disabled={busy}>
          {busy ? 'Publishing…' : 'Publish Post'}
        </button>
      </div>
    </div>
  );
};

// ── Main Component ────────────────────────────────────────────
const Community = () => {
  const navigate = useNavigate();
  const token    = getToken();
  const role     = getRole();
  const loggedIn = isLoggedIn();

  const [tab,               setTab]               = useState('leaderboard');
  const [leaderboard,       setLeaderboard]        = useState([]);
  const [feed,              setFeed]               = useState([]);
  const [feedFilter,        setFeedFilter]         = useState('all');
  const [selectedCollector, setSelectedCollector]  = useState(null);
  const [showPostForm,      setShowPostForm]       = useState(false);
  const [loadingLB,         setLoadingLB]          = useState(true);
  const [loadingFeed,       setLoadingFeed]        = useState(true);
  const [lbError,           setLbError]            = useState('');
  const [feedError,         setFeedError]          = useState('');
  const [authPrompt,        setAuthPrompt]         = useState(false);

  // Aggregate stats for hero
  const totalSubmissions = leaderboard.reduce((a, c) => a + (c.submissions || 0), 0);

  // ── Fetch leaderboard ──
  const fetchLeaderboard = useCallback(async () => {
    setLoadingLB(true); setLbError('');
    try {
      const res  = await fetch(`${BASE}/leaderboard`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed');
      // attach rank to each entry for ProfileModal
      setLeaderboard(data.map((c, i) => ({ ...c, rank: i + 1 })));
    } catch (e) {
      setLbError('Could not load leaderboard. Please try again.');
    } finally { setLoadingLB(false); }
  }, []);

  // ── Fetch feed ──
  const fetchFeed = useCallback(async (type = 'all') => {
    setLoadingFeed(true); setFeedError('');
    try {
      const res  = await fetch(`${BASE}/feed?type=${type}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed');
      setFeed(data.posts || []);
    } catch (e) {
      setFeedError('Could not load feed. Please try again.');
    } finally { setLoadingFeed(false); }
  }, []);

  useEffect(() => { fetchLeaderboard(); }, [fetchLeaderboard]);
  useEffect(() => { fetchFeed(feedFilter); }, [fetchFeed, feedFilter]);

  const handleNewPost = (post) => {
    setFeed(prev => [post, ...prev]);
    setShowPostForm(false);
  };

  const handleRequireAuth = () => setAuthPrompt(true);

  // Dashboard link based on role
  const dashboardPath = role === 'domain_owner' || role === 'domainowner' ? '/Dashboard'
    : role === 'user' ? '/userDashboard'
    : null;

  return (
    <div className="community-page">

      {/* ── NAV ── */}
      <nav className="comm-nav">
        <div className="comm-nav-brand" onClick={() => navigate('/')}>
          <IcGlobe size={20} /> semaData
        </div>
        <div className="comm-nav-links">
          <button className={tab === 'leaderboard' ? 'active' : ''} onClick={() => setTab('leaderboard')}>
            <IcTrophy /> Leaderboard
          </button>
          <button className={tab === 'feed' ? 'active' : ''} onClick={() => setTab('feed')}>
            <IcChat /> Community Feed
          </button>
        </div>
        <div className="comm-nav-actions">
          {loggedIn ? (
            <>
              {dashboardPath && (
                <button className="comm-nav-btn comm-nav-btn--ghost"
                  onClick={() => navigate(dashboardPath)}>
                  My Dashboard
                </button>
              )}
              <button className="comm-nav-btn"
                onClick={() => { localStorage.clear(); navigate('/login?fresh=true'); }}>
                Sign out
              </button>
            </>
          ) : (
            <>
              <button className="comm-nav-btn comm-nav-btn--ghost"
                onClick={() => navigate('/login?fresh=true')}>
                Sign in
              </button>
              <button className="comm-nav-btn"
                onClick={() => navigate('/signup?role=community')}>
                Join free
              </button>
            </>
          )}
        </div>
      </nav>

      {/* ── HERO ── */}
      <header className="comm-hero">
        <div className="comm-hero-content">
          <div className="comm-hero-tag"><IcGlobe size={13} /> Africa's Language Data Network</div>
          <h1>The humans behind<br /><em>every dataset</em></h1>
          <p>semaData collectors are named, ranked, and celebrated contributors building African language datasets for the AI age. Connect, discuss, and help shape what gets built.</p>
          <div className="comm-hero-stats">
            <div>
              <strong>{loadingLB ? '…' : totalSubmissions.toLocaleString()}</strong>
              <span>Verified Recordings</span>
            </div>
            <div>
              <strong>{loadingLB ? '…' : leaderboard.length}</strong>
              <span>Active Collectors</span>
            </div>
          </div>
          {!loggedIn && (
            <button className="comm-hero-cta" onClick={() => navigate('/signup?role=community')}>
              Join the community <IcArrow />
            </button>
          )}
        </div>
        <div className="comm-hero-visual">
          {leaderboard.slice(0, 5).map((c, i) => (
            <div key={c.id} className="comm-hero-card"
              style={{'--delay': `${i * 0.1}s`, '--offset': `${(i % 2) * 24}px`}}>
              <span className="hero-card-avatar">
                {c.avatar || c.name?.substring(0,2).toUpperCase()}
              </span>
              <span className="hero-card-name">{c.name?.split(' ')[0]}</span>
              <span className="hero-card-count">{c.submissions} ✓</span>
            </div>
          ))}
        </div>
      </header>

      {/* ── MAIN ── */}
      <main className="comm-main">

        {/* ── LEADERBOARD TAB ── */}
        {tab === 'leaderboard' && (
          <section className="comm-section">
            <div className="comm-section-head">
              <div>
                <h2>Contributor Rankings</h2>
                <p>Ranked by total verified submissions. Click any row to view a full profile.</p>
              </div>
            </div>

            {loadingLB ? <Spinner /> : lbError ? (
              <div className="comm-error">
                {lbError}
                <button onClick={fetchLeaderboard}>Retry</button>
              </div>
            ) : leaderboard.length === 0 ? (
              <div className="comm-empty">
                <p>No verified submissions yet. Be the first collector to contribute.</p>
              </div>
            ) : (
              <div className="lb-list">
                {leaderboard.map((c, i) => (
                  <LeaderboardRow key={c.id} collector={c} rank={i + 1}
                    onClick={setSelectedCollector} />
                ))}
              </div>
            )}

            <div className="lb-cta">
              <p>Want your name on this board?</p>
              <button onClick={() => navigate('/signup?role=collector')} className="lb-cta-btn">
                Apply as a Collector <IcArrow />
              </button>
            </div>
          </section>
        )}

        {/* ── FEED TAB ── */}
        {tab === 'feed' && (
          <section className="comm-section">
            <div className="comm-section-head">
              <div>
                <h2>Community Feed</h2>
                <p>Discussions, insights, and quality flags from the semaData community.</p>
              </div>
              <div className="feed-controls">
                <div className="feed-filters">
                  {['all', 'posts', 'flags'].map(f => (
                    <button key={f}
                      className={feedFilter === f ? 'active' : ''}
                      onClick={() => setFeedFilter(f)}>
                      {f === 'flags' ? <><IcAlert /> Flags</>
                        : f === 'posts' ? <><IcChat /> Posts</>
                        : 'All'}
                    </button>
                  ))}
                </div>
                {loggedIn && (
                  <button className="feed-post-btn" onClick={() => setShowPostForm(s => !s)}>
                    <IcPlus /> New Post
                  </button>
                )}
              </div>
            </div>

            {/* Auth prompt */}
            {(authPrompt || !loggedIn) && (
              <div className="feed-login-prompt">
                <p>
                  <strong>Join the conversation</strong> —{' '}
                  <button onClick={() => navigate('/login?fresh=true')}>sign in</button>
                  {' '}or{' '}
                  <button onClick={() => navigate('/signup?role=community')}>create a free account</button>
                  {' '}to like posts, flag issues, and share insights.
                </p>
              </div>
            )}

            {showPostForm && loggedIn && (
              <PostForm
                token={token}
                onPost={handleNewPost}
                onCancel={() => setShowPostForm(false)}
              />
            )}

            {loadingFeed ? <Spinner /> : feedError ? (
              <div className="comm-error">
                {feedError}
                <button onClick={() => fetchFeed(feedFilter)}>Retry</button>
              </div>
            ) : feed.length === 0 ? (
              <div className="comm-empty">
                <p>No posts yet.
                  {loggedIn
                    ? ' Be the first to start a discussion.'
                    : ' Sign up to start the conversation.'}
                </p>
              </div>
            ) : (
              <div className="feed-list">
                {feed.map(post => (
                  <FeedCard key={post.id} post={post} token={token}
                    onRequireAuth={handleRequireAuth} />
                ))}
              </div>
            )}
          </section>
        )}
      </main>

      {/* ── PROFILE MODAL ── */}
      {selectedCollector && (
        <ProfileModal
          collector={selectedCollector}
          onClose={() => setSelectedCollector(null)}
        />
      )}
    </div>
  );
};

export default Community;