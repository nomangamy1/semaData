import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import LandingPage from './pages/LandingPage';
import Dashboard from './pages/Dashboard';
import Login from './pages/Login';
import DefineFeatures from './components/DomainDefinition';
import Signup from './pages/SignUp';
import SuccessPage from './components/Success'; 
import UserDashboard from './pages/userDashboard';
import CollectorHome from './pages/collectorHome';
import AboutUs from './pages/AboutUs';
import ContactUs from './pages/ContactUs';
import Footer from './components/Footer';
import DataAnalytics from './components/DataAnalytics';
import TeamCollectors from './components/TeamCollectors';
import Navbar from './components/NavBar';
import PayInitiate from './components/PaymentInitiation';
import JobDescriptionView from './pages/JobDescription';
import CareersPage from './pages/careersPublic';
import AdminDashboard from './pages/AdminDashboard';
import GuestOnlyRoute from './components/GuestOnlyRoute';
import AdminRoute from './components/AdminRoute';
import Community from './pages/Community';

// Optional: ProtectedRoute for logged-in users only
const ProtectedRoute = ({ children }) => {
  const token = localStorage.getItem('token');
  if (!token) {
    return <Navigate to="/login" replace />;
  }
  return children;
};

function SemaData_App() {
  

  return (
    <Router>
      <Navbar />
      <main>
        <Routes>
          {/* Public */}
          <Route path="/" element={<LandingPage />} />
          <Route path="/AboutUs" element={<AboutUs />} />
          <Route path="/ContactUs" element={<ContactUs />} />
          <Route path="/careerPublic" element={<CareersPage />} />
          <Route path="/careers/:id" element={<JobDescriptionView />} />
          <Route path="/community" element={<Community />} />

          {/* Guest-only (redirect to dashboard if logged in) */}
          <Route
            path="/signup"
            element={
              <GuestOnlyRoute>
                <Signup />
              </GuestOnlyRoute>
            }
          />
          <Route
            path="/login"
            element={
              <GuestOnlyRoute>
                <Login />
              </GuestOnlyRoute>
            }
          />

          {/* Protected routes (require login) */}
          <Route
            path="/Dashboard"
            element={
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/userDashboard"
            element={
              <ProtectedRoute>
                <UserDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/collectorHome"
            element={
              <ProtectedRoute>
                <CollectorHome />
              </ProtectedRoute>
            }
          />
          <Route
            path="/DataAnalytics"
            element={
              <ProtectedRoute>
                <DataAnalytics />
              </ProtectedRoute>
            }
          />
          <Route
            path="/TeamCollector"
            element={
              <ProtectedRoute>
                <TeamCollectors />
              </ProtectedRoute>
            }
          />
          <Route
            path="/payInitiate"
            element={
              <ProtectedRoute>
                <PayInitiate />
              </ProtectedRoute>
            }
          />
          <Route
            path="/DomainDefinition"
            element={
              <ProtectedRoute>
                <DefineFeatures />
              </ProtectedRoute>
            }
          />
          <Route
          path="/AdminDashboard"
          element={
            <AdminRoute>
              <AdminDashboard />
            </AdminRoute>
          }
        />
          <Route path="/Success" element={<SuccessPage />} />

       

          {/* 404 */}
          <Route path="*" element={<div className="text-white">404 - Route Not Found</div>} />
        </Routes>
      </main>
      <Footer />
    </Router>
  );
}

export default SemaData_App;