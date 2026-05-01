import React, { useState } from 'react';

export default function CommunityPostForm() {
    const [title, setTitle] = useState('');
    const [body, setBody] = useState('');
    const [attachment, setAttachment] = useState(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsSubmitting(true);

        const formData = new FormData();
        formData.append('title', title);
        formData.append('body', body);
        
        // Hardcoded author context ID
        formData.append('author_id', '1010');

        if (attachment) {
            formData.append('attachment', attachment);
        }

        try {
            const response = await fetch('http://localhost:5000/api/community/post', {
                method: 'POST',
                body: formData,
            });

            if (response.ok) {
                alert('Post published successfully!');
                setTitle('');
                setBody('');
                setAttachment(null);
            } else {
                alert('Failed to publish post.');
            }
        } catch (error) {
            console.error('Error connecting to backend:', error);
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div style={{ maxWidth: '500px', margin: '20px auto', padding: '20px', border: '1px solid #ddd', borderRadius: '8px' }}>
            <h2>Create Community Post</h2>
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                <div>
                    <label style={{ display: 'block', marginBottom: '5px' }}>Title</label>
                    <input
                        type="text"
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        required
                        style={{ width: '100%', padding: '8px' }}
                        placeholder="Enter title"
                    />
                </div>

                <div>
                    <label style={{ display: 'block', marginBottom: '5px' }}>Body</label>
                    <textarea
                        value={body}
                        onChange={(e) => setBody(e.target.value)}
                        required
                        style={{ width: '100%', padding: '8px', minHeight: '100px' }}
                        placeholder="What's on your mind?"
                    />
                </div>

                <div>
                    <label style={{ display: 'block', marginBottom: '5px' }}>Attachment</label>
                    <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => setAttachment(e.target.files[0])}
                    />
                </div>

                <button 
                    type="submit" 
                    disabled={isSubmitting}
                    style={{ padding: '10px', backgroundColor: '#007bff', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
                >
                    {isSubmitting ? 'Publishing...' : 'Publish Post'}
                </button>
            </form>
        </div>
    );
}
