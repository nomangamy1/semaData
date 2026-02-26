import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './Login.css';
const Login = () => {
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    reference_number: ''
  });
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    try {
      const response = await fetch('http://localhost:8000/api/Auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (response.ok) {
        const userObj = {
          role: data.role,
          id: data.userId,
          email:data.email
        };
        localStorage.setItem('user', JSON.stringify(userObj));

        // Store user info in localStorage for session persistence
        localStorage.setItem('userRole', data.role);
        localStorage.setItem('userId',data.userId);
        // backend now returns access_token for admin and domain_owner
        localStorage.setItem('token', data.access_token || data.token || '');
        localStorage.setItem('domain', data.domain || '');
        localStorage.setItem('domainId', data.domainId || '');
        localStorage.setItem('referenceNumber', formData.reference_number || '');
        localStorage.setItem('username', data.username || 'Admin');
        // Innovation Tip: Redirect based on role
        if (data.role === 'admin') {
          navigate('/adminDashboard');
        } else if (data.role === 'domain_owner') {
          navigate('/Dashboard');
        } else {
          navigate('/userDashboard');
        }
      } else {
        setError(data.error || 'Login failed');
      }
    } catch (err) {
      setError('Server connection failed. Is Flask running?');
    }
  };

  return (
    <div className="login-container">
    <h2>SemaData Login</h2>
      {error && <p style={{ color: 'red' }}>{error}</p>}
      <form onSubmit={handleSubmit}>
        <input name="email" type="email" placeholder="Email" onChange={handleChange} required />
        <input name="password" type="password" placeholder="Password" onChange={handleChange} required />
        <input name="reference_number" type="text" placeholder="Domain Reference Number" onChange={handleChange} />
        <button type="submit">Unlock System</button>
      </form>
    </div>
  );
};

export default Login;