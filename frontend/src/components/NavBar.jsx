import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Menu, X, LogOut, Sun, Moon } from 'lucide-react';
import './NavBar.css';

const Navbar = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [isDark, setIsDark] = useState(localStorage.getItem('theme') === 'dark');
  const location = useLocation();
  const isAuthenticated = !!localStorage.getItem('token'); // Using 'token' as per our SaaS standard

  useEffect(() => {
    document.documentElement.className = isDark ? 'dark' : 'light';
    localStorage.setItem('theme', isDark ? 'dark' : 'light');
  }, [isDark]);

  return (
    <nav className="master-nav">
      <div className="nav-container">
        {/* LEFT: LOGO */}
        <Link to="/" className="logo-text">
          sema<span className="text-teal">Data</span>
        </Link>

        {/* CENTER: NAVIGATION LINKS */}
        <div className="nav-links-wrapper">
          <Link to="/" className="nav-item">Home</Link>
          <Link to="/AboutUs" className="nav-item">About</Link>
          <Link to="/community" className="nav-item">Community</Link>
          <Link to="/careers" className="nav-item">Careers</Link>
          <Link to="/ContactUs" className="nav-item">Contact</Link>
        </div>

        {/* RIGHT: ACTIONS */}
        <div className="nav-actions">
          <button onClick={() => setIsDark(!isDark)} className="theme-toggle">
            {isDark ? <Sun size={20} /> : <Moon size={20} />}
          </button>
          
          {!isAuthenticated ? (
            <Link to="/signup" className="join-btn">Join Now</Link>
          ) : (
            <button onClick={() => { localStorage.clear(); window.location.href='/login'; }} className="logout-icon">
              <LogOut size={22} className="text-gray-500 hover:text-red-500 transition-colors" />
            </button>
          )}
          
          <button className="md:hidden ml-4" onClick={() => setIsOpen(!isOpen)}>
            {isOpen ? <X size={28} /> : <Menu size={28} />}
          </button>
        </div>
      </div>

      {/* MOBILE MENU */}
      {isOpen && (
        <div className="absolute top-full left-0 w-full bg-white border-b shadow-xl p-6 flex flex-col gap-4 md:hidden">
          <Link to="/" onClick={() => setIsOpen(false)} className="nav-item">Home</Link>
          <Link to="/AboutUs" onClick={() => setIsOpen(false)} className="nav-item">About</Link>
          <Link to="/community" onClick={() => setIsOpen(false)} className="nav-item">Community</Link>
          <Link to="/careers" onClick={() => setIsOpen(false)} className="nav-item">Careers</Link>
          <Link to="/ContactUs" onClick={() => setIsOpen(false)} className="nav-item">Contact</Link>
        </div>
      )}
    </nav>
  );
};

export default Navbar;
