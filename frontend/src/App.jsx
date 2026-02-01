import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import LandingPage from './pages/LandingPage';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import Login from './pages/Login';
import DefineFeatures from './components/DomainDefinition';
import Signup from './pages/SignUp';
import SuccessPage from './components/Success'; 
import UserDashboard from './pages/userDashboard';
import CollectorHome from './pages/collectorHome';

import logo from './assets/logo.png';

function SemaData_App() {
  return (
    <Router>
      {/* Navbar: Clean White Background with Green Bottom Border */}
      <nav style={{ backgroundColor: 'white', borderBottom: '2px solid green', padding: '1rem' }}>
        <img src={logo} alt="semaData Logo" style={{ height: '40px' }} className="h-10 w-auto" />
      </nav>
      {/* Page Content */}
      <main>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/signup" element={<Signup />} />
          <Route path="/login" element={<Login />} />
          <Route path="/DomainDefinition" element={<DefineFeatures />} /> 
          <Route path="/Success" element={<SuccessPage/>}/>
          <Route path="/Dashboard" element={<Dashboard />} />
          <Route path="/userDashboard" element={<UserDashboard />} /> 
          <Route path="/collectorHome" element={<CollectorHome />} />
        </Routes>
      </main>
    </Router>
  );
}

export default SemaData_App;