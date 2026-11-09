import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Menu, X, LogOut, Sun, Moon } from 'lucide-react';
import './NavBar.css';

const Navbar = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [isDark, setIsDark] = useState(localStorage.getItem('theme') === 'dark');
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
          <button type="button" onClick={() => setIsDark(!isDark)} className="theme-toggle" aria-label={`Switch to ${isDark ? 'light' : 'dark'} mode`}>
            {isDark ? <Sun size={20} /> : <Moon size={20} />}
          </button>
          
          {!isAuthenticated ? (
            <Link to="/signup" className="join-btn">Join Now</Link>
          ) : (
            <button type="button" onClick={() => { localStorage.clear(); window.location.href='/login'; }} className="logout-icon" aria-label="Log out">
              <LogOut size={22} className="text-gray-500 hover:text-red-500 transition-colors" />
            </button>
          )}
          
          <button
            type="button"
            className="nav-menu-toggle"
            onClick={() => setIsOpen(!isOpen)}
            aria-label={isOpen ? 'Close navigation menu' : 'Open navigation menu'}
            aria-expanded={isOpen}
            aria-controls="mobile-nav-links"
          >
            {isOpen ? <X size={28} /> : <Menu size={28} />}
          </button>
        </div>
      </div>

      {/* MOBILE MENU */}
      {isOpen && (
        <div className="mobile-nav-links" id="mobile-nav-links">
          <Link to="/" onClick={() => setIsOpen(false)} className="nav-item">Home</Link>
          <Link to="/AboutUs" onClick={() => setIsOpen(false)} className="nav-item">About</Link>
          <Link to="/community" onClick={() => setIsOpen(false)} className="nav-item">Community</Link>
          <Link to="/careers" onClick={() => setIsOpen(false)} className="nav-item">Careers</Link>
          <Link to="/ContactUs" onClick={() => setIsOpen(false)} className="nav-item">Contact</Link>
          {!isAuthenticated && <Link to="/signup" onClick={() => setIsOpen(false)} className="mobile-nav-join">Join Now</Link>}
        </div>
      )}
    </nav>
  );
};

export default Navbar;
