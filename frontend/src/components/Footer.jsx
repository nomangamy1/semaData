import React from 'react';
import { Mail, Github, ShieldCheck, Database } from 'lucide-react';
import './Footer.css';




const Footer = () => {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="sema-footer">
      <div className="footer-content">
        <div className="footer-brand">
          <div className="brand-logo">
            <Database className="logo-icon" />
            <span>SemaData <span className="text-weight-light"></span></span>
          </div>
          <p className="brand-tagline">
            Local Dialect Data Collection Engine for Research and Analysis.
          </p>
        </div>

        <div className="footer-links">
          <div className="link-group">
            <h4>Platform</h4>
            <a href="/">Recorder</a>
            <a href="/AboutUs">About Us</a>
            <a href="/docs">Documentation</a>
          </div>
          <div className="link-group">
            <h4>Compliance</h4>
            <a href="/privacy">Data Privacy</a>
            <a href="/terms">Research Ethics</a>
          </div>
        </div>

        <div className="footer-contact">
          <h4>Innovation Lab</h4>
          <div className="contact-item">
            <Mail size={16} /> <span>semaDataResearch.gmail.com</span>
          </div>
          <div className="contact-item">
            <ShieldCheck size={16} /> <span>Patent Pending v1.4</span>
          </div>
        </div>
      </div>

      <div className="footer-bottom">
        <p>&copy; {currentYear} SemaData Engine v1.</p>
        <div className="social-icons">
          <Github size={18} />
        </div>
      </div>
    </footer>
  );
};

export default Footer;