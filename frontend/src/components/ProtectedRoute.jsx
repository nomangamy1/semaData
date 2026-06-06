import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';

const ProtectedRoute = ({ children, allowedRoles }) => {
  const token = localStorage.getItem('token');
  const userRole = localStorage.getItem('userRole')?.toLowerCase();
  const location = useLocation();

  if (!token) {
    // Redirect them to login, preserving the location they tried to access
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (allowedRoles && !allowedRoles.map(r => r.toLowerCase()).includes(userRole)) {
    // Role mismatch? Kick them back to an unauthorized state or their respective home
    if (userRole === 'admin') return <Navigate to="/AdminDashboard" replace />;
    if (userRole === 'domain_owner' || userRole === 'domainowner') return <Navigate to="/Dashboard" replace />;
    if (userRole === 'user') return <Navigate to="/userDashboard" replace />;
    return <Navigate to="/login" replace />;
  }

  return children;
};

export default ProtectedRoute;

