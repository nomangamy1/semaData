// ✅ ALL imports at the top
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';

import LandingPage        from './pages/LandingPage';
import Dashboard          from './pages/Dashboard';
import Login              from './pages/Login';
import DefineFeatures     from './components/DomainDefinition';
import Signup             from './pages/SignUp';
import SuccessPage        from './components/Success';
import UserDashboard      from './pages/userDashboard';
import CollectorHome      from './pages/collectorHome';
import AboutUs            from './pages/AboutUs';
import ContactUs          from './pages/ContactUs';
import Footer             from './components/Footer';
import DataAnalytics      from './components/DataAnalytics';
import TeamCollectors     from './components/TeamCollectors';
import Navbar             from './components/NavBar';
import PayInitiate        from './components/PaymentInitiation';
import JobDescriptionView from './pages/JobDescription';
import CareersPage        from './pages/careersPublic';
import AdminDashboard     from './pages/AdminDashboard';
import GuestOnlyRoute     from './components/GuestOnlyRoute';
import AdminRoute         from './components/AdminRoute';
import Community          from './pages/Community';

// Pages that manage their own full-screen layout (no shared Navbar/Footer)
const STANDALONE_PATHS = [
  '/Dashboard', '/userDashboard', '/collectorHome',
  '/AdminDashboard', '/DataAnalytics', '/TeamCollector'
];

const ProtectedRoute = ({ children }) => {
  const token = localStorage.getItem('token');
  if (!token) return <Navigate to="/login" replace />;
  return children;
};

// ✅ AppShell defined BEFORE SemaData_App, useLocation imported at top
function AppShell() {
  const location     = useLocation();
  const isStandalone = STANDALONE_PATHS.some(p => location.pathname.startsWith(p));

  return (
    <>
      {!isStandalone && <Navbar />}

      <main>
        <Routes>
          {/* ── Public ── */}
          <Route path="/"             element={<LandingPage />} />
          <Route path="/AboutUs"      element={<AboutUs />} />
          <Route path="/ContactUs"    element={<ContactUs />} />
          <Route path="/CareerPublic" element={<CareersPage />} />
          <Route path="/careers/:id"  element={<JobDescriptionView />} />
          <Route path="/community"    element={<Community />} />

          {/* ── Guest-only ── */}
          <Route path="/signup" element={<GuestOnlyRoute><Signup /></GuestOnlyRoute>} />
          <Route path="/login"  element={<GuestOnlyRoute><Login /></GuestOnlyRoute>} />

          {/* ── Protected ── */}
          <Route path="/Dashboard"        element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
          <Route path="/userDashboard"    element={<ProtectedRoute><UserDashboard /></ProtectedRoute>} />
          <Route path="/collectorHome"    element={<ProtectedRoute><CollectorHome /></ProtectedRoute>} />
          <Route path="/DataAnalytics"    element={<ProtectedRoute><DataAnalytics /></ProtectedRoute>} />
          <Route path="/TeamCollector"    element={<ProtectedRoute><TeamCollectors /></ProtectedRoute>} />
          <Route path="/payInitiate"      element={<ProtectedRoute><PayInitiate /></ProtectedRoute>} />
          <Route path="/DomainDefinition" element={<ProtectedRoute><DefineFeatures /></ProtectedRoute>} />
          <Route path="/AdminDashboard"   element={<AdminRoute><AdminDashboard /></AdminRoute>} />
          <Route path="/Success"          element={<SuccessPage />} />

          {/* ── 404 ── */}
          <Route path="*" element={
            <div style={{ padding: '4rem', textAlign: 'center', color: '#64748b' }}>
              <h2>404 — Page not found</h2>
            </div>
          } />
        </Routes>
      </main>

      {!isStandalone && <Footer />}
    </>
  );
}

function SemaData_App() {
  return (
    <Router>
      <AppShell />
    </Router>
  );
}

export default SemaData_App;