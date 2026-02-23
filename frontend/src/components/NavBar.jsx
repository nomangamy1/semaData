import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Menu, X, User, LogOut } from 'lucide-react';
import semaDataLogo from '../assets/semaDataLogo.png'; 
import './NavBar.css'; // Don't forget this!

const Navbar = () => {
  const [isOpen, setIsOpen] = useState(false);
  const location = useLocation();
  const isAuthenticated = !!localStorage.getItem('refNum');

  const isActive = (path) => location.pathname === path ? 'active' : '';
return (
    <nav className="sticky top-0 z-50 glass-nav px-8 py-4 w-full">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        
        {/* LOGO SECTION */}
        <Link to="/" className="flex items-center gap-2 group">
          <img 
            src={semaDataLogo} 
            alt="SemaData" 
            className="h-10 w-auto object-contain transition-transform group-hover:scale-105" 
          />
          <span className="font-black text-2xl tracking-tighter text-slate-900">
          </span>
        </Link>

        {/* DESKTOP LINKS */}
        <div className="hidden md:flex space-x-8">
          <Link to="/" className={`nav-link ${isActive('/')}`}>Home</Link>
          <Link to="/AboutUs" className={`nav-link ${isActive('/AboutUs')}`}>About <strong>Us</strong></Link>
          <Link to="/ContactUs" className={`nav-link ${isActive('/ContactUs')}`}>Contact <strong>Us</strong></Link>
          <Link to="/CareerPublic" className={`nav-link ${isActive('/CareerPublic')}`}>Careers</Link>
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

      {/* MOBILE MENU DROPDOWN - Still inside the <nav> */}
      {isOpen && (
        <div className="md:hidden absolute top-full left-0 w-full bg-white mobile-menu-enter p-6 shadow-xl border-t border-gray-100">
          <div className="flex flex-col space-y-4">
            <Link to="/" onClick={() => setIsOpen(false)} className="font-semibold text-gray-700">Home</Link>
            <Link to="/AboutUs" onClick={() => setIsOpen(false)} className="font-semibold text-gray-700">About</Link>
            <Link to="/ContactUs" onClick={() => setIsOpen(false)} className="font-semibold text-gray-700">Contact</Link>
            <Link to="/CareerPublic" onClick={() => setIsOpen(false)} className="font-semibold text-gray-700">Careers</Link>
            {isAuthenticated && (
              <Link to="/userDashboard" onClick={() => setIsOpen(false)} className="font-semibold text-gray-700">Dashboard</Link>
            )}
          </div>
          <div className="mt-6">
            <Link to="/signup" onClick={() => setIsOpen(false)} className="bg-[#489c8c] text-white text-center py-3 rounded-xl font-bold">Join Now</Link>
          </div>
        </div>
      )}
    </nav>
  );
};
  

export default Navbar;