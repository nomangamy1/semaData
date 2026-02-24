import { BrowserRouter as Router, Routes, Route, Link, Navigate } from 'react-router-dom';
import LandingPage from './pages/LandingPage';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import Login from './pages/Login';
import DefineFeatures from './components/DomainDefinition';
import Signup from './pages/SignUp';
import SuccessPage from './components/Success'; 
import UserDashboard from './pages/userDashboard';
import CollectorHome from './pages/collectorHome';
import AboutUs from './pages/AboutUs';
import ContactUs from './pages/ContactUs';
import  Footer from './components/Footer';
import DataAnalytics from './components/DataAnalytics';
import TeamCollectors from './components/TeamCollectors';
import logo from './assets/logo.png';
import Navbar from './components/NavBar';
import PayInitiate from './components/PaymentInitiation';
import JobDescriptionView from './pages/JobDescription';
import CareersPage from './pages/careersPublic';
import AdminDashboard from './pages/AdminDashboard';

function SemaData_App() {
  const AdminRoute = ({ children }) => {
  const userString = localStorage.getItem('user');
  const user = userString ? JSON.parse(userString) : null; // Safely parse user object
  
  // Check specifically for the 'admin' role
  if (!user || user.role !== 'admin') {
    console.log('Access denied. User is:', user?.role || 'No user found');
    return <Navigate to="/login" replace />;
  }

  return children;
};
  return (
    <Router>
      <Navbar />
      <main>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/signup" element={<Signup />} />
          <Route path ="/login" element={<Login />} />
          <Route path="/DomainDefinition" element={<DefineFeatures />} /> 
          <Route path="/Success" element={<SuccessPage/>}/>
          <Route path="/Dashboard" element={<Dashboard />} />
          <Route path="/userDashboard" element={<UserDashboard />} /> 
          <Route path="/collectorHome" element={<CollectorHome />} />
          <Route path="/AboutUs" element={<AboutUs />} />
          <Route path="/ContactUs" element={<ContactUs />} />
          <Route path ="/DataAnalytics" element={<DataAnalytics/>} />
          <Route path="/TeamCollector" element={<TeamCollectors/>} />
          <Route path="/payInitiate" element={<PayInitiate/>} />
          <Route path="/careerPublic" element={<CareersPage />} />
          <Route path="/careers/:id" element={<JobDescriptionView />} />
          <Route path="/AdminDashboard" element={<AdminRoute><AdminDashboard /></AdminRoute>} />
          <Route path="*" element={<div className="text-white">Route Not Found - Check URL</div>} />
        </Routes>
      </main>
      <Footer />
    </Router>
  );
}

export default SemaData_App;