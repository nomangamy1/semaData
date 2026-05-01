import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

export default function GuestOnlyRoute({ children }) {
  const navigate = useNavigate();
  const token = localStorage.getItem('token');

  useEffect(() => {
    // Only redirect if a valid token exists
    if (token && token !== 'null' && token !== 'undefined') {
      const userString = localStorage.getItem('user');
      const user = userString ? JSON.parse(userString) : null;
      const role = user?.role || localStorage.getItem('userRole');

      if (role === 'admin') {
        navigate('/AdminDashboard', { replace: true });
      } else if (role === 'domain_owner' || role === 'domainowner') {
        navigate('/Dashboard', { replace: true });
      } else if (role === 'user' || role === 'collector') {
        navigate('/userDashboard', { replace: true });
      } else if (role === 'community') {
        navigate('/community', { replace: true });
      } else {
        // Fallback for any other logged-in users
        navigate('/Dashboard', { replace: true });
      }
    }
  }, [token, navigate]);

  // If no valid token → show login/signup page
  return (!token || token === 'null' || token === 'undefined') ? children : null;
}
