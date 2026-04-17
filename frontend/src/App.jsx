import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';

import Navbar from './components/NavBar';
import Footer from './components/Footer';
import LandingPage from './pages/LandingPage';
import AboutUs from './pages/AboutUs';
import ContactUs from './pages/ContactUs';
import Community from './pages/Community';
import CareersPage from './pages/careersPublic';
import JobDescriptionView from './pages/JobDescription';
import Login from './pages/Login';
import Signup from './pages/SignUp';
import Dashboard from './pages/Dashboard';
import UserDashboard from './pages/userDashboard';
import CollectorHome from './pages/collectorHome';
import AdminDashboard from './pages/AdminDashboard';
import SuccessPage from './components/Success';
import GuestOnlyRoute from './components/GuestOnlyRoute';
import AdminRoute from './components/AdminRoute';

const STANDALONE_PATHS = [
  '/Dashboard', '/userDashboard', '/collectorHome',
  '/AdminDashboard', '/DataAnalytics', '/TeamCollector'
];

const ProtectedRoute = ({ children }) => {
  const token = localStorage.getItem('token');
  if (!token) return <Navigate to="/login" replace />;
  return children;
};

function AppShell() {
  const location = useLocation();
  const isStandalone = STANDALONE_PATHS.some(p => location.pathname.startsWith(p));

  return (
    <>
      {!isStandalone && <Navbar />}
      <main>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/AboutUs" element={<AboutUs />} />
          <Route path="/ContactUs" element={<ContactUs />} />
          <Route path="/community" element={<Community />} />
          <Route path="/careers" element={<CareersPage />} />
          <Route path="/careers/:id" element={<JobDescriptionView />} />
          <Route path="/signup" element={<GuestOnlyRoute><Signup /></GuestOnlyRoute>} />
          <Route path="/login" element={<GuestOnlyRoute><Login /></GuestOnlyRoute>} />
          <Route path="/Dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
          <Route path="/userDashboard" element={<ProtectedRoute><UserDashboard /></ProtectedRoute>} />
          <Route path="/collectorHome" element={<ProtectedRoute><CollectorHome /></ProtectedRoute>} />
          <Route path="/AdminDashboard" element={<AdminRoute><AdminDashboard /></AdminRoute>} />
          <Route path="/Success" element={<SuccessPage />} />
          <Route path="*" element={<div className="p-20 text-center"><h2>404 — Not Found</h2></div>} />
        </Routes>
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
