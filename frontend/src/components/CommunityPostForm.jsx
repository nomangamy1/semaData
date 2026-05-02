import React, { useState } from 'react';
import '../styles/CommunityPostForm.css';

export default function CommunityPostForm() {
    const [title, setTitle] = useState('');
    const [body, setBody] = useState('');
    const [domain, setDomain] = useState('all');
    const [attachment, setAttachment] = useState(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsSubmitting(true);

        const formData = new FormData();
        formData.append('title', title);
        formData.append('body', body);
        formData.append('domainName', domain);
        if (attachment) formData.append('attachment', attachment);
        formData.append('authorName', 'Norman');

        try {
            const response = await fetch('http://localhost:5000/api/community/post', {
                method: 'POST',
                body: formData
            });

            if (response.ok) {
                setTitle('');
                setBody('');
                setDomain('all');
                setAttachment(null);
                alert('Post created successfully!');
                window.location.reload();
            } else {
                alert('Error creating post');
            }
        } catch (err) {
            console.error('Submission failed:', err);
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="post-form-container">
            <h2>Create Workspace Post</h2>
            <form onSubmit={handleSubmit}>
                <div className="form-group">
                    <label>Title</label>
                    <input 
                        type="text" 
                        value={title} 
                        onChange={(e) => setTitle(e.target.value)} 
                        required 
                        placeholder="Enter title or algorithm name" 
                    />
                </div>

                <div className="form-group">
                    <label>Domain</label>
                    <select 
                        value={domain} 
                        onChange={(e) => setDomain(e.target.value)}
                        style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid var(--sema-border)', backgroundColor: '#f8fafc' }}
                    >
                        <option value="all">General</option>
                        <option value="ml">Machine Learning</option>
                        <option value="research">Research</option>
                    </select>
                </div>

                <div className="form-group">
                    <label>Body</label>
                    <textarea 
                        value={body} 
                        onChange={(e) => setBody(e.target.value)} 
                        required 
                        placeholder="What would you like to share or ask?" 
                    />
                </div>

                <div className="form-group file-input-wrapper">
                    <label style={{ margin: 0 }}>Attach File</label>
                    <input 
                        type="file" 
                        onChange={(e) => setAttachment(e.target.files[0])} 
                        style={{ padding: '4px', backgroundColor: 'transparent', border: 'none' }} 
                    />
                </div>

                <button type="submit" className="submit-btn" disabled={isSubmitting}>
                    {isSubmitting ? 'Publishing...' : 'Publish Post'}
                </button>
            </form>
        </div>
    );
}
