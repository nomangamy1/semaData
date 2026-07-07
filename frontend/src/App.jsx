import PWAInstallPrompt from './components/PWAInstallPrompt';
import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';

import Navbar from './components/NavBar.jsx';
import Footer from './components/Footer';
import LandingPage from './pages/LandingPage';
import AboutUs from './pages/AboutUs';
import ContactUs from './pages/ContactUs';
import Community from './pages/Community';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';
import CareersPage from './pages/careersPublic';
import JobDescriptionView from './pages/JobDescription';
import Login from './pages/Login';
import Signup from './pages/SignUp';
import Dashboard from './pages/Dashboard';
import UserDashboard from './pages/userDashboard';
import CollectorHome from './pages/collectorHome';
import AdminDashboard from './pages/AdminDashboard';
import DefineFeatures from './components/DomainDefinition';
import PayInitiate from './components/PaymentInitiation'; 
import SuccessPage from './components/Success';
import GuestOnlyRoute from './components/GuestOnlyRoute';
import AdminRoute from './components/AdminRoute';
import CollectorProfile from './components/collectorProfile';
import PayoutManagement from './components/PayoutManagement';

const STANDALONE_PATHS = [
  '/dashboard', '/userdashboard', '/collectorhome', '/admindashboard',
  '/dataanalytics', '/teamcollector', '/domaindefinition', '/payinitiate'
];

// 🛡️ Enhanced Protected Route with Role Guard Rails
const ProtectedRoute = ({ children, allowedRoles }) => {
  const token = localStorage.getItem('token');
  const userRole = (localStorage.getItem('userRole') || '').toLowerCase();

  if (!token) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles && !allowedRoles.map(r => r.toLowerCase()).includes(userRole)) {
    // If unauthorized for this specific page, redirect cleanly to their correct home base
    if (userRole === 'admin') return <Navigate to="/AdminDashboard" replace />;
    if (userRole === 'domain_owner' || userRole === 'domainowner') return <Navigate to="/Dashboard" replace />;
    if (userRole === 'user') return <Navigate to="/userDashboard" replace />;
    return <Navigate to="/login" replace />;
  }

  return children;
};

function AppShell() {
  const location = useLocation();
  const isStandalone = STANDALONE_PATHS.some(p => location.pathname.toLowerCase().startsWith(p));

  return (
    <>
      {!isStandalone && <Navbar />}
      <main>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/AboutUs" element={<AboutUs />} />
          <Route path="/ContactUs" element={<ContactUs />} />
          <Route path="/community" element={<Community />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/reset-password" element={<ResetPassword />} />
          <Route path="/careers" element={<CareersPage />} />
          <Route path="/careers/:id" element={<JobDescriptionView />} />
          <Route path="/profile" element={<CollectorProfile />} />
          
          <Route path="/signup" element={<GuestOnlyRoute><Signup /></GuestOnlyRoute>} />
          <Route path="/login" element={<GuestOnlyRoute><Login /></GuestOnlyRoute>} />
          
          {/* 🏢 Domain Owner Only Routes */}
          <Route path="/Dashboard" element={<ProtectedRoute allowedRoles={['domain_owner', 'domainowner']}><Dashboard /></ProtectedRoute>} />
          <Route path="/dashboard" element={<ProtectedRoute allowedRoles={['domain_owner', 'domainowner']}><Dashboard /></ProtectedRoute>} />
          <Route path="/DomainDefinition" element={<ProtectedRoute allowedRoles={['domain_owner', 'domainowner']}><DefineFeatures /></ProtectedRoute>} />
          <Route path="/payInitiate" element={<ProtectedRoute allowedRoles={['domain_owner', 'domainowner']}><PayInitiate /></ProtectedRoute>} />
          
          {/* 👥 Collector / Standard User Only Routes */}
          <Route path="/userDashboard" element={<ProtectedRoute allowedRoles={['user']}><UserDashboard /></ProtectedRoute>} />
          <Route path="/userdashboard" element={<ProtectedRoute allowedRoles={['user']}><UserDashboard /></ProtectedRoute>} />
          <Route path="/collectorHome" element={<ProtectedRoute allowedRoles={['user']}><CollectorHome /></ProtectedRoute>} />
          <Route path="/collectorhome" element={<ProtectedRoute allowedRoles={['user']}><CollectorHome /></ProtectedRoute>} />
          
          {/* 👑 Admin Only Routes */}
          <Route path="/AdminDashboard" element={<AdminRoute><AdminDashboard /></AdminRoute>} />
          <Route path="/admindashboard" element={<AdminRoute><AdminDashboard /></AdminRoute>} />
          <Route path="/admin/payouts" element={<PayoutManagement />} />
          <Route path="/Success" element={<SuccessPage />} />
          
          {/* 404 Fallback Catch-all */}
          <Route path="*" element={
            <div className="p-20 text-center">
              <h2 className="text-2xl font-black text-red-500 mb-2">404 — Frontend Route Not Found</h2>
              <p className="text-slate-500">Path requested: <code className="bg-slate-100 p-1 rounded text-red-600 font-mono">{location.pathname}</code></p>
            </div>
          } />
        </Routes>
        <PWAInstallPrompt />
      </main>
      {!isStandalone && <Footer />}
    </>
  );
}

export default function SemaData_App() {
  return (
    <Router>
      <AppShell />
    </Router>
  );
}
