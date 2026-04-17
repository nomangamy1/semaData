import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Menu, X, LogOut } from 'lucide-react';
import './NavBar.css';

const Navbar = () => {
  const [isOpen, setIsOpen] = useState(false);
  const location = useLocation();
  const isAuthenticated = !!localStorage.getItem('refNum');

  return (
    <nav className="master-nav">
      <div className="nav-container">
        {/* LEFT: LOGO */}
        <Link to="/" className="logo-text">
          sema<span className="text-teal">Data</span>
        </Link>

        {/* CENTER: GLAMOROUS LINKS */}
        <div className="nav-links-wrapper">
          <Link to="/" className="nav-item">Home</Link>
          <Link to="/AboutUs" className="nav-item">About</Link>
          <Link to="/community" className="nav-item">Community</Link>
          <Link to="/careers" className="nav-item">Careers</Link>
          <Link to="/ContactUs" className="nav-item">Contact</Link>
        </div>

        {/* RIGHT: GLAMOROUS ACTIONS */}
        <div className="nav-actions">
          {!isAuthenticated ? (
            <Link to="/signup" className="join-btn">Join Now</Link>
          ) : (
            <button onClick={() => {localStorage.clear(); window.location.href='/login'}} className="logout-icon">
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
          <Link to="/signup" onClick={() => setIsOpen(false)} className="join-btn text-center">Join Now</Link>
        </div>
      )}
    </nav>
  );
};

export default Navbar;
