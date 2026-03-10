import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Menu, X, LogOut } from 'lucide-react';
import semaDataLogo from '../assets/semaDataLogo.png';
import './NavBar.css';

const Navbar = () => {
  const [isOpen,   setIsOpen]   = useState(false);
  const location   = useLocation();
  const navigate   = useNavigate();

  // ✅ Fixed: use 'token' not 'refNum'
  const isAuthenticated = !!localStorage.getItem('token');
  const userRole        = (localStorage.getItem('userRole') || '').toLowerCase();

  // Where to send the user when they click Dashboard
  const dashboardPath =
    userRole === 'admin'                                  ? '/AdminDashboard'
    : userRole === 'domain_owner' || userRole === 'domainowner' ? '/Dashboard'
    : userRole === 'user'                                 ? '/userDashboard'
    : userRole === 'community'                            ? '/community'
    : '/login';

  const isActive = (path) => location.pathname === path ? 'active' : '';

  const handleLogout = () => {
    localStorage.clear();
    navigate('/login?fresh=true', { replace: true });
    setIsOpen(false);
  };

  return (
    <nav className="sticky top-0 z-50 glass-nav px-8 py-4 w-full">
      <div className="max-w-7xl mx-auto flex items-center justify-between">

        {/* LOGO */}
        <Link to="/" className="flex items-center gap-2 group">
          <img src={semaDataLogo} alt="SemaData"
            className="h-10 w-auto object-contain transition-transform group-hover:scale-105" />
        </Link>

        {/* DESKTOP LINKS */}
        <div className="hidden md:flex space-x-8">
          <Link to="/"            className={`nav-link ${isActive('/')}`}>Home</Link>
          <Link to="/AboutUs"     className={`nav-link ${isActive('/AboutUs')}`}>About <strong>Us</strong></Link>
          <Link to="/ContactUs"   className={`nav-link ${isActive('/ContactUs')}`}>Contact <strong>Us</strong></Link>
          <Link to="/CareerPublic"className={`nav-link ${isActive('/CareerPublic')}`}>Careers</Link>
          <Link to="/community"   className={`nav-link ${isActive('/community')}`}>Community</Link>
          {isAuthenticated && (
            <Link to={dashboardPath} className={`nav-link ${isActive(dashboardPath)}`}>Dashboard</Link>
          )}
        </div>

        {/* AUTH BUTTONS */}
        <div className="hidden md:flex items-center space-x-4">
          {!isAuthenticated ? (
            <Link to="/signup" className="btn-primary-glow text-white px-6 py-2 rounded-full font-bold">
              Join Now
            </Link>
          ) : (
            <button onClick={handleLogout}
              className="text-gray-400 hover:text-red-500 transition-colors flex items-center gap-1"
              title="Sign out">
              <LogOut size={20} />
            </button>
          )}
        </div>

        {/* MOBILE TOGGLE */}
        <button className="md:hidden text-gray-600" onClick={() => setIsOpen(!isOpen)}>
          {isOpen ? <X size={28} /> : <Menu size={28} />}
        </button>
      </div>

      {/* MOBILE DROPDOWN */}
      {isOpen && (
        <div className="md:hidden absolute top-full left-0 w-full bg-white mobile-menu-enter p-6 shadow-xl border-t border-gray-100 z-50">
          <div className="flex flex-col space-y-4">
            <Link to="/"             onClick={() => setIsOpen(false)} className="font-semibold text-gray-700">Home</Link>
            <Link to="/AboutUs"      onClick={() => setIsOpen(false)} className="font-semibold text-gray-700">About</Link>
            <Link to="/ContactUs"    onClick={() => setIsOpen(false)} className="font-semibold text-gray-700">Contact</Link>
            <Link to="/CareerPublic" onClick={() => setIsOpen(false)} className="font-semibold text-gray-700">Careers</Link>
            <Link to="/community"    onClick={() => setIsOpen(false)} className="font-semibold text-gray-700">Community</Link>
            {isAuthenticated && (
              <Link to={dashboardPath} onClick={() => setIsOpen(false)} className="font-semibold text-gray-700">Dashboard</Link>
            )}
          </div>
          <div className="mt-6 flex flex-col gap-3">
            {!isAuthenticated ? (
              <Link to="/signup" onClick={() => setIsOpen(false)}
                className="bg-[#489c8c] text-white text-center py-3 rounded-xl font-bold block">
                Join Now
              </Link>
            ) : (
              <button onClick={handleLogout}
                className="text-red-500 font-bold text-center py-3 rounded-xl border border-red-200">
                Sign Out
              </button>
            )}
          </div>
        </div>
      )}
    </nav>
  );
};

export default Navbar;