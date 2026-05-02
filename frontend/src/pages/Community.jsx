import React, { useState, useEffect } from 'react';
import CommunityPostForm from '../components/CommunityPostForm';
import TechnicalPost from '../components/TechnicalPost';
import '../styles/community.css';

export default function CommunityPage() {
    const [posts, setPosts] = useState([]);
    const [activeTab, setActiveTab] = useState('all');
    const [loading, setLoading] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [currentUser, setCurrentUser] = useState({
        name: 'Norman',
        avatarUrl: '/static/uploads/default-avatar.png'
    });

    useEffect(() => {
        fetchFeed();
    }, [activeTab]);

    const fetchFeed = async () => {
        setLoading(true);
        try {
            const response = await fetch(`http://localhost:8000/api/community/feed?type=${activeTab}`);
            const data = await response.json();
            if (response.ok) {
                setPosts(data.posts);
            }
        } catch (err) {
            console.error('Error fetching data:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleLikePost = async (postId) => {
        try {
            const response = await fetch(`http://localhost:8000/api/community/post/${postId}/like`, {
                method: 'POST'
            });
            if (response.ok) {
                setPosts(posts.map(p => p.id === postId ? { ...p, likes: p.likes + 1 } : p));
            }
        } catch (err) {
            console.error('Error liking post:', err);
        }
    };

    const filteredPosts = posts.filter(post => 
        post.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        post.body.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <div className="community-layout">
            <div className="sidebar">
                <h2>SemaData</h2>
                <ul className="sidebar-list">
                    <li className="sidebar-item">
                        <button onClick={() => setActiveTab('all')} className={`sidebar-btn ${activeTab === 'all' ? 'active' : ''}`}>
                            Home Feed
                        </button>
                    </li>
                    <li className="sidebar-item">
                        <button onClick={() => setActiveTab('ml')} className={`sidebar-btn ${activeTab === 'ml' ? 'active' : ''}`}>
                            Machine Learning
                        </button>
                    </li>
                    <li className="sidebar-item">
                        <button onClick={() => setActiveTab('research')} className={`sidebar-btn ${activeTab === 'research' ? 'active' : ''}`}>
                            Research
                        </button>
                    </li>
                </ul>
            </div>

            <div className="main-content">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#ffffff', padding: '12px 20px', borderRadius: '6px', marginBottom: '24px', border: '1px solid var(--sema-border)', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
                    <input 
                        type="text" 
                        placeholder="Search posts or algorithms..." 
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        style={{ width: '68%', padding: '8px 12px', border: '1px solid var(--sema-border)', borderRadius: '6px', outline: 'none' }}
                    />
                    
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <span style={{ fontSize: '14px', fontWeight: '600' }}>{currentUser.name}</span>
                        <div style={{ width: '32px', height: '32px', borderRadius: '50%', backgroundColor: '#10b981', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 'bold' }}>
                            {currentUser.name.charAt(0)}
                        </div>
                    </div>
                </div>

                <CommunityPostForm />

                {loading ? (
                    <p style={{ textAlign: 'center', padding: '32px' }}>Loading workspace content...</p>
                ) : (
                    filteredPosts.length > 0 ? (
                        filteredPosts.map(post => (
                            <TechnicalPost 
                                key={post.id} 
                                post={post} 
                                onLike={handleLikePost} 
                            />
                        ))
                    ) : (
                        <p style={{ textAlign: 'center', padding: '32px', color: 'var(--sema-secondary)' }}>No items match the query.</p>
                    )
                )}
            </div>
        </div>
    );
}
