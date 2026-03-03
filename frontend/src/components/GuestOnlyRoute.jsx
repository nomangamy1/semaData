// src/components/GuestOnlyRoute.jsx
import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

export default function GuestOnlyRoute({ children }) {
  const navigate = useNavigate();
  const token = localStorage.getItem('token');

  useEffect(() => {
    if (token) {
      // Read stored user data (assuming you save it after login)
      const userString = localStorage.getItem('user');
      const user = userString ? JSON.parse(userString) : null;

      // Role-based redirect
      if (user?.role === 'admin') {
        navigate('/AdminDashboard', { replace: true });
      } else if (user?.role === 'domain_owner') {
        navigate('/DomainDefinition', { replace: true });
      } else if (user?.role === 'user') {
        navigate('/userDashboard', { replace: true });
      } else {
        // Fallback for unknown role or missing user data
        navigate('/dashboard', { replace: true });
      }
    }
  }, [token, navigate]);

  // If no token → show login/signup page
  return !token ? children : null;
}