import React, { useState, useEffect } from 'react';

export default function CommentSection({ postId, authorId }) {
    const [comments, setComments] = useState([]);
    const [newComment, setNewComment] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        // Fetch comments for this specific post
        // Using placeholder endpoint based on the backend routes
        const fetchComments = async () => {
            try {
                const response = await fetch(`http://localhost:5000/api/community/post/${postId}/comments`);
                if (response.ok) {
                    const data = await response.json();
                    setComments(data.comments || []);
                }
            } catch (err) {
                console.error("Could not fetch comments:", err);
            }
        };
        fetchComments();
    }, [postId]);

    const handleAddComment = async (e) => {
        e.preventDefault();
        if (!newComment.trim()) return;
        setIsSubmitting(true);

        try {
            const response = await fetch(`http://localhost:5000/api/community/post/${postId}/comment`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    body: newComment,
                    author_id: authorId || '1010' // fallback to current context
                })
            });

            if (response.ok) {
                setComments([...comments, { body: newComment, authorName: 'Norman', createdAt: 'Just now' }]);
                setNewComment('');
            }
        } catch (err) {
            console.error("Error submitting comment:", err);
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div style={{ marginTop: '15px', padding: '10px', borderTop: '1px solid #e1e1e1' }}>
            <h4 style={{ fontSize: '13px', margin: '0 0 8px 0', color: '#7c7c7c' }}>Discussion Threads</h4>
            
            {/* Existing Comments List */}
            <div style={{ maxHeight: '200px', overflowY: 'auto', marginBottom: '10px' }}>
                {comments.length === 0 ? (
                    <p style={{ fontSize: '12px', color: '#999' }}>No comments yet. Start the technical discussion!</p>
                ) : (
                    comments.map((c, idx) => (
                        <div key={idx} style={{ padding: '6px 0', borderBottom: '1px solid #f2f2f2' }}>
                            <span style={{ fontSize: '11px', fontWeight: 'bold', color: '#333' }}>{c.authorName}</span>
                            <p style={{ fontSize: '12px', margin: '2px 0 0 0', color: '#1a1a1a' }}>{c.body}</p>
                        </div>
                    ))
                )}
            </div>

            {/* Comment Form */}
            <form onSubmit={handleAddComment} style={{ display: 'flex', gap: '8px' }}>
                <input 
                    type="text"
                    placeholder="Add a technical question or remark..."
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    style={{ flex: 1, padding: '6px', fontSize: '12px', border: '1px solid #ccc', borderRadius: '4px' }}
                />
                <button 
                    type="submit" 
                    disabled={isSubmitting}
                    style={{ padding: '6px 12px', fontSize: '12px', backgroundColor: '#3182ce', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
                >
                    {isSubmitting ? '...' : 'Reply'}
                </button>
            </form>
        </div>
    );
}
