import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Menu, X, User, LogOut } from 'lucide-react';
import './NavBar.css'; // Don't forget this!

const Navbar = () => {
  const [isOpen, setIsOpen] = useState(false);
  const location = useLocation();
  const isAuthenticated = !!localStorage.getItem('refNum');

  const isActive = (path) => location.pathname === path ? 'active' : '';

  return (
    <nav className="sticky top-0 z-50 glass-nav px-8 py-4 w-full">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        
        {/* LOGO */}
        <Link to="/" className="text-2xl font-black text-[#489c8c] tracking-tighter">
          semaData
        </Link>

        {/* DESKTOP LINKS */}
        <div className="hidden md:flex space-x-8">
          <Link to="/" className={`nav-link ${isActive('/')}`}>Home</Link>
          <Link to="/AboutUs" className={`nav-link ${isActive('/AboutUs')}`}>About <strong>Us</strong></Link>
          <Link to="/ContactUs" className={`nav-link ${isActive('/ContactUs')}`}>Contact <strong>Us</strong></Link>
          {isAuthenticated && (
            <Link to="/userDashboard" className={`nav-link ${isActive('/userDashboard')}`}>Dashboard</Link>
          )}
        </div>

        {/* AUTH BUTTONS */}
        <div className="hidden md:flex items-center space-x-4">
          {!isAuthenticated ? (
            <Link to="/signup" className="btn-primary-glow text-white px-6 py-2 rounded-full font-bold">
              Join Now
            </Link>
          ) : (
            <Link to="/login" className="text-gray-400 hover:text-red-500 transition-colors">
              <LogOut size={20} />
            </Link>
          )}
        </div>

        {/* MOBILE HAMBURGER TOGGLE */}
        <button className="md:hidden text-gray-600" onClick={() => setIsOpen(!isOpen)}>
          {isOpen ? <X size={28} /> : <Menu size={28} />}
        </button>
      </div>

      {/* MOBILE MENU DROPDOWN */}
      {isOpen && (
        <div className="md:hidden absolute top-full left-0 w-full bg-white mobile-menu-enter p-6 shadow-xl border-t border-gray-100">
          <div className="flex flex-col space-y-4">
            <Link to="/" onClick={() => setIsOpen(false)} className="font-semibold text-gray-700">Home</Link>
            <Link to="/AboutUs" onClick={() => setIsOpen(false)} className="font-semibold text-gray-700">About</Link>
            <Link to="/ContactUs" onClick={() => setIsOpen(false)} className="font-semibold text-gray-700">Contact</Link>
            <Link to="/signup" onClick={() => setIsOpen(false)} className="bg-[#489c8c] text-white text-center py-3 rounded-xl font-bold">Join Now</Link>
          </div>
        </div>
      )}
    </nav>
  );
};

export default Navbar;