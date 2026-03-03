import { Navigate } from 'react-router-dom';
import { jwtDecode } from 'jwt-decode';  

export default function AdminRoute({ children }) {
  const token = localStorage.getItem('token');
  if (!token) {
    return <Navigate to="/login" replace />;
  }

  try {
    const decoded = jwtDecode(token);
    if (decoded.role !== 'admin') {
      return <Navigate to="/userDashboard" replace />;
    }
  } catch (err) {
    console.error('JWT decode failed:', err);
    return <Navigate to="/login" replace />;
  }

  return children;
}