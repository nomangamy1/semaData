import React from 'react';
import CommentSection from './CommentSection';

export default function TechnicalPost({ post, onLike }) {
    return (
        <div className="post-card" style={{ backgroundColor: '#ffffff', border: '1px solid #ccc', borderRadius: '4px', padding: '16px', marginTop: '16px' }}>
            <span className="post-meta">
                Posted in <strong>{post.domainName || 'General'}</strong> by {post.authorName} | {post.createdAt}
            </span>
            
            <h2 className="post-title" style={{ fontSize: '20px', margin: '6px 0 12px 0' }}>{post.title}</h2>
            
            <div className="post-body">
                <p>{post.body}</p>
                
                {post.attachment && (
                    <div className="attachment-block">
                        <img 
                            src={`http://localhost:5000${post.attachment}`} 
                            alt="Attachment" 
                            className="post-img" 
                            style={{ maxWidth: '100%', borderRadius: '4px', margin: '12px 0' }}
                        />
                    </div>
                )}
            </div>

            <div className="post-actions" style={{ display: 'flex', gap: '24px', marginTop: '16px', fontSize: '14px', fontWeight: 600, color: '#7c7c7c' }}>
                <button 
                    onClick={() => onLike(post.id)}
                    className="action-btn"
                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#ff4500' }}
                >
                    ▲ Upvotes: {post.likes}
                </button>
                <span style={{ color: '#7c7c7c' }}>💬 Comments</span>
            </div>

            {/* Expandable Comment Thread Section */}
            <CommentSection postId={post.id} authorId={post.authorId} />
        </div>
    );
}
