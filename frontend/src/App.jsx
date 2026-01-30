import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import LandingPage from './pages/LandingPage';
import Register from './pages/Register';
import Signup from './pages/SignUp';
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
        </Routes>
      </main>
    </Router>
  );
}

export default SemaData_App;