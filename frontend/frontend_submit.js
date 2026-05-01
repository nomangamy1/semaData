document.getElementById('postForm').addEventListener('submit', async function(e) {
    e.preventDefault();

    const formData = new FormData();
    formData.append('title', document.getElementById('title').value);
    formData.append('body', document.getElementById('body').value);
    
    const fileInput = document.getElementById('attachment');
    if (fileInput.files.length > 0) {
        formData.append('attachment', fileInput.files[0]);
    }

    // Temporary User Context ID. Ensure this maps to your actual user state or local storage token.
    formData.append('author_id', '1010');

    try {
        const response = await fetch('http://localhost:5000/api/community/post', {
            method: 'POST',
            body: formData
        });

        if (response.ok) {
            const data = await response.json();
            alert('Post created successfully!');
            // Clear form fields
            document.getElementById('postForm').reset();
        } else {
            console.error('Submission failed.');
            alert('Error publishing post.');
        }
    } catch (error) {
        console.error('Error connecting to the server:', error);
        alert('Server connection failed.');
    }
});
