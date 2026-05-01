import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './Community.css';

export default function Community() {
  const [posts, setPosts] = useState([]);
  const [threads, setThreads] = useState([]);
  const [comments, setComments] = useState({});
  const [postTitle, setPostTitle] = useState('');
  const [postBody, setPostBody] = useState('');
  const [attachment, setAttachment] = useState('');
  const [postType, setPostType] = useState('post');
  const [error, setError] = useState('');
  
  const [profile, setProfile] = useState({ 
    name: 'Ian Chege', 
    role: 'AI & Software Engineer', 
    location: 'Eldoret, Kenya', 
    bio: 'Building African tech platforms' 
  });
  
  const [dms, setDms] = useState([
    { id: 1, sender: 'AbbyRency', message: 'The deployment for the analytics module looks ready.', time: '10:45' }
  ]);
  const [dmMessage, setDmMessage] = useState('');

  useEffect(() => {
    fetchFeed();
    fetchInbox();
  }, []);

  const fetchFeed = async (type = 'all') => {
    try {
      const res = await axios.get('/api/community/feed?type=' + type);
      setPosts(res.data.posts || []);
    } catch (err) {
      console.error('Error fetching feed:', err);
    }
  };

  const fetchInbox = async () => {
    try {
      const res = await axios.get('/api/inbox');
      setThreads(res.data.threads || []);
    } catch (err) {
      console.error('Error fetching inbox:', err);
    }
  };

  const handleLike = async (postId) => {
    try {
      const token = localStorage.getItem('token');
      await axios.post('/api/community/post/' + postId + '/like', {}, {
        headers: { Authorization: 'Bearer ' + token }
      });
      fetchFeed();
    } catch (err) {
      setError('Authentication required to like this post.');
    }
  };

  const handleAddComment = async (postId, commentText) => {
    try {
      const token = localStorage.getItem('token');
      await axios.post('/api/community/post/' + postId + '/comment', { body: commentText }, {
        headers: { Authorization: 'Bearer ' + token }
      });
      fetchFeed();
    } catch (err) {
      setError('Failed to post reply.');
    }
  };

  const handlePostSubmit = (e) => {
    e.preventDefault();
    console.log('Submitted Thought/Post', { postTitle, postBody, postType, attachment });
  };

  const handleSendDM = (e) => {
    e.preventDefault();
    if(dmMessage.trim() === '') return;
    setDms([...dms, { id: Date.now(), sender: 'System User', message: dmMessage, time: 'Now' }]);
    setDmMessage('');
  };

  return (
    <div className="community-page">
      <header className="comm-hero">
        <div className="comm-hero-content">
          <div className="comm-hero-tag">SemaData • African Innovation</div>
          <h1>African Tech <em>Community</em></h1>
          <p>Collaborate, write workflows, and build connections across the region.</p>
        </div>
        <div className="comm-hero-visual">
          <div className="comm-hero-card">
            <span className="hero-card-avatar">🌍</span>
            <span className="hero-card-name">Regional Nodes</span>
            <span className="hero-card-count">Online</span>
          </div>
        </div>
      </header>

      <section className="comm-section">
        <div className="inbox-module" style={{ background: '#0f172a', borderColor: '#334155' }}>
          <div className="inbox-header" style={{ borderColor: '#334155' }}>
            <h3>User Profile</h3>
            <span className="feed-tag" style={{ background: '#059669', color: '#fff' }}>{profile.location}</span>
          </div>
          <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', marginTop: '1rem' }}>
            <div style={{ width: '4rem', height: '4rem', borderRadius: '50%', background: '#1e293b', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.5rem', color: '#489c8c' }}>
              IC
            </div>
            <div>
              <h4 style={{ margin: '0 0 0.25rem 0', color: '#fff' }}>{profile.name}</h4>
              <p style={{ margin: 0, color: '#94a3b8', fontSize: '0.85rem' }}>{profile.role}</p>
              <p style={{ margin: '0.25rem 0 0 0', color: '#cbd5e1', fontSize: '0.8rem', fontStyle: 'italic' }}>{profile.bio}</p>
            </div>
          </div>
        </div>

        {error && (
          <div className="feed-login-prompt">
            <p>{error} <button onClick={() => setError('')}>Dismiss</button></p>
          </div>
        )}

        <form className="post-form" onSubmit={handlePostSubmit}>
          <input 
            type="text" 
            className="post-form-title" 
            placeholder="Post Title" 
            value={postTitle}
            onChange={(e) => setPostTitle(e.target.value)}
          />
          
          <div className="post-form-toolbar">
            {['post', 'code', 'link', 'image'].map((type) => (
              <button 
                key={type}
                type="button" 
                className={`form-toolbar-btn ${postType === type ? 'active' : ''}`} 
                onClick={() => setPostType(type)}
              >
                {type.charAt(0).toUpperCase() + type.slice(1)}
              </button>
            ))}
          </div>

          <textarea 
            className="post-form-body" 
            rows={4} 
            placeholder="Share your thoughts..." 
            value={postBody}
            onChange={(e) => setPostBody(e.target.value)}
          />

          <input 
            type="text" 
            className="post-form-title" 
            placeholder={postType === 'code' ? 'Enter language or code snippet' : 'Attachment URL'} 
            value={attachment}
            onChange={(e) => setAttachment(e.target.value)}
          />

          <div className="post-form-actions">
            <button type="button" className="post-form-cancel" onClick={() => { setPostBody(''); setPostTitle(''); setAttachment(''); }}>
              Cancel
            </button>
            <button type="submit" className="post-form-submit">
              Publish Idea
            </button>
          </div>
        </form>

        <div className="feed-list">
          {posts.length > 0 ? (
            posts.map((p) => (
              <article className="feed-card" key={p.id}>
                <div className="feed-header">
                  <div className="feed-avatar">
                    {p.authorName ? p.authorName[0].toUpperCase() : 'U'}
                  </div>
                  <div className="feed-meta">
                    <span className="feed-author">{p.authorName || 'User'}</span>
                    <span className="feed-time">{p.createdAt}</span>
                  </div>
                  <span className="feed-tag">{p.domainName || 'General'}</span>
                </div>
                <h4 className="feed-title">{p.title}</h4>
                <p className="feed-body">{p.body}</p>
                
                {p.postType === 'code' && (
                  <pre className="feed-code-block">
                    <code>{p.attachment}</code>
                  </pre>
                )}
                {p.postType === 'link' && (
                  <a href={p.attachment} className="feed-link-attachment" target="_blank" rel="noopener noreferrer">
                    🔗 {p.attachment}
                  </a>
                )}
                {p.postType === 'image' && (
                  <img src={p.attachment} alt="Attachment" className="feed-media" />
                )}

                <div className="feed-actions">
                  <button className="feed-action" onClick={() => handleLike(p.id)}>
                    ❤ Like ({p.likes})
                  </button>
                </div>

                <div className="comment-section">
                  <div className="comment-list">
                    {(comments[p.id] || []).length > 0 ? (
                      (comments[p.id] || []).map((c) => (
                        <div key={c.id} className="comment-card">
                          <div className="comment-header">
                            <span>{c.author}</span>
                            <span>{c.timestamp}</span>
                          </div>
                          <div>{c.body}</div>
                        </div>
                      ))
                    ) : (
                      <div style={{ fontSize: '0.8rem', color: '#475569' }}>No replies yet. Be the first to reply!</div>
                    )}
                  </div>

                  <form className="comment-form" onSubmit={(e) => {
                    e.preventDefault();
                    const inputVal = e.target.elements.commentText.value;
                    handleAddComment(p.id, inputVal);
                    e.target.reset();
                  }}>
                    <input
                      type="text"
                      name="commentText"
                      className="comment-input"
                      placeholder="Write a reply or paste code snippet..."
                      required
                    />
                    <button type="submit" className="comment-submit-btn">Send</button>
                  </form>
                </div>
              </article>
            ))
          ) : (
            <div style={{ color: '#94a3b8', padding: '2rem', textAlign: 'center', background: '#111827', border: '1px solid #1f2937', borderRadius: '10px' }}>
              <p style={{ margin: 0 }}>No thoughts or posts found in the feed. Share your first idea!</p>
            </div>
          )}
        </div>

        <div className="inbox-module">
          <div className="inbox-header">
            <h3>Direct Messages</h3>
            <span className="feed-tag">Active Threads</span>
          </div>
          <div className="inbox-threads">
            {dms.length > 0 ? (
              dms.map((dm) => (
                <div key={dm.id} className="inbox-thread">
                  <div>
                    <span className="thread-sender">{dm.sender}</span>
                    <div className="thread-snippet">{dm.message}</div>
                  </div>
                  <span className="feed-time">{dm.time}</span>
                </div>
              ))
            ) : (
              <div style={{ color: '#64748b', textAlign: 'center', padding: '1rem 0' }}>
                No messages available.
              </div>
            )}
            
            <form style={{ display: 'flex', gap: '0.5rem', marginTop: '1rem' }} onSubmit={handleSendDM}>
              <input 
                type="text" 
                className="comment-input" 
                placeholder="Direct message a user..." 
                value={dmMessage}
                onChange={(e) => setDmMessage(e.target.value)} 
                required 
              />
              <button type="submit" className="comment-submit-btn">Send</button>
            </form>
          </div>
        </div>

        <div className="inbox-module">
          <div className="inbox-header">
            <h3>Active Conversations</h3>
            <span className="feed-tag">{threads.length} Open</span>
          </div>
          <div className="inbox-threads">
            {threads.length > 0 ? (
              threads.map((thread) => (
                <div key={thread.id} className="inbox-thread">
                  <div>
                    <span className="thread-sender">{thread.senderName}</span>
                    <div className="thread-snippet">{thread.snippet}</div>
                  </div>
                  <span className="feed-time">{thread.time}</span>
                </div>
              ))
            ) : (
              <div style={{ color: '#64748b', textAlign: 'center', padding: '1rem 0' }}>
                No active public threads in the inbox.
              </div>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
