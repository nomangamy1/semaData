import React from 'react';

export default function TechnicalPost({ post, onLike }) {
    return (
        <div className="post-card">
            <span className="post-meta">
                Posted in <strong>{post.domainName || 'General'}</strong> by {post.authorName} | {post.createdAt}
            </span>
            
            <h2 className="post-title">{post.title}</h2>
            
            <div className="post-body">
                <p>{post.body}</p>
                
                {post.attachment && (
                    <div className="attachment-block">
                        <img 
                            src={`http://localhost:5000${post.attachment}`} 
                            alt="Attachment" 
                            className="post-img" 
                        />
                    </div>
                )}
            </div>

            <div className="post-actions">
                <button 
                    onClick={() => onLike(post.id)}
                    className="action-btn"
                >
                    ▲ Upvotes: {post.likes}
                </button>
                <button className="action-btn">
                    💬 Discussion
                </button>
            </div>
        </div>
    );
}
