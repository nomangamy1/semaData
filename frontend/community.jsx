import React, { useState, useEffect } from 'react';
import CommunityPostForm from './CommunityPostForm';
import TechnicalPost from './TechnicalPost';

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
            const response = await fetch(`http://localhost:5000/api/community/feed?type=${activeTab}`);
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

    const handleLike = async (postId) => {
        try {
            const response = await fetch(`http://localhost:5000/api/community/post/${postId}/like`, {
                method: 'POST'
            });
            if (response.ok) {
                setPosts(posts.map(p => p.id === postId ? { ...p, likes: p.likes + 1 } : p));
            }
        } catch (err) {
            console.error('Error liking post:', err);
        }
    };

    // Filter posts by search query
    const filteredPosts = posts.filter(post => 
        post.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        post.body.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <div style={{ display: 'flex', minHeight: '100vh', backgroundColor: '#dae0e6', fontFamily: 'Arial, sans-serif' }}>
            {/* Left Sidebar (Topics/Filters) */}
            <div style={{ width: '240px', backgroundColor: '#ffffff', padding: '20px', borderRight: '1px solid #ccc' }}>
                <h2>SemaData</h2>
                <ul style={{ listStyleType: 'none', padding: 0 }}>
                    <li style={{ margin: '10px 0' }}><button onClick={() => setActiveTab('all')} style={{ background: 'none', border: 'none', cursor: 'pointer', fontWeight: activeTab === 'all' ? 'bold' : 'normal' }}>Home Feed</button></li>
                    <li style={{ margin: '10px 0' }}><button onClick={() => setActiveTab('ml')} style={{ background: 'none', border: 'none', cursor: 'pointer', fontWeight: activeTab === 'ml' ? 'bold' : 'normal' }}>Machine Learning</button></li>
                    <li style={{ margin: '10px 0' }}><button onClick={() => setActiveTab('research')} style={{ background: 'none', border: 'none', cursor: 'pointer', fontWeight: activeTab === 'research' ? 'bold' : 'normal' }}>Research</button></li>
                </ul>
            </div>

            {/* Main Content Feed Area */}
            <div style={{ flex: 1, padding: '24px', maxWidth: '680px', margin: '0 auto' }}>
                
                {/* Top Search & Profile Bar */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#ffffff', padding: '10px 16px', borderRadius: '4px', marginBottom: '20px', border: '1px solid #ccc' }}>
                    <input 
                        type="text" 
                        placeholder="Search posts or algorithms..." 
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        style={{ width: '70%', padding: '8px', border: '1px solid #ccc', borderRadius: '4px' }}
                    />
                    
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <span style={{ fontSize: '14px', fontWeight: 'bold' }}>{currentUser.name}</span>
                        <div style={{ width: '32px', height: '32px', borderRadius: '50%', backgroundColor: '#ff4500', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 'bold' }}>
                            {currentUser.name.charAt(0)}
                        </div>
                    </div>
                </div>

                <CommunityPostForm />

                {loading ? <p>Loading workspace content...</p> : (
                    filteredPosts.map(post => (
                        <TechnicalPost 
                            key={post.id} 
                            post={post} 
                            onLike={handleLike} 
                        />
                    ))
                )}
            </div>
        </div>
    );
}
