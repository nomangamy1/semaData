import React, { useState } from 'react';
import { Mail, Phone, MapPin, Send, Loader, Twitter, Linkedin, Github, CheckCircle } from 'lucide-react';
import './ContactUs.css';

const ContactUs = () => {
  const [formState, setFormState] = useState({
    name: '', email: '', subject: 'General Inquiry', message: '', phone: ''
  });

  const [status, setStatus] = useState({ loading: false, success: false, error: null });

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormState(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setStatus({ loading: true, success: false, error: null });
    
    // Logic for handling form submission
    setTimeout(() => {
      setStatus({ loading: false, success: true, error: null });
      setFormState({ name: '', email: '', subject: 'General Inquiry', message: '', phone: '' });
    }, 2000);
  };

  return (
    <div className="contact-page-wrapper">
      <div className="contact-main-card">
        
        {/* LEFT: THE RICH INFO PANEL */}
        <div className="contact-info-panel">
          <div className="info-section">
            <h2 className="glam-title">Let's Connect</h2>
            <p className="glam-subtitle">Have a specialized request? Our team of data experts is ready to assist you in scaling your operations.</p>
          </div>

          <div className="info-list">
            <div className="glam-info-item">
              <div className="icon-box"><Mail /></div>
              <div className="info-content">
                <span>Email Us</span>
                <p>kiplimochege@gmail.com</p>
              </div>
            </div>
            <div className="glam-info-item">
              <div className="icon-box"><Phone /></div>
              <div className="info-content">
                <span>Call Center</span>
                <p>0113165657</p>
              </div>
            </div>
            <div className="glam-info-item">
              <div className="icon-box"><MapPin /></div>
              <div className="info-content">
                <span>Headquarters</span>
                <p>Nairobi, Kenya</p>
              </div>
            </div>
          </div>

          <div className="social-footer">
            <p>Follow our journey</p>
            <div className="social-icons">
              <Twitter size={20} className="hover:text-teal-400 cursor-pointer" /> 
              <Linkedin size={20} className="hover:text-teal-400 cursor-pointer" /> 
              <Github size={20} className="hover:text-teal-400 cursor-pointer" />
            </div>
          </div>
        </div>

        {/* RIGHT: THE MAXIMUM FORM */}
        <div className="contact-form-panel">
          <form onSubmit={handleSubmit} className="glam-form">
            <div className="form-grid">
              <div className="glam-group">
                <label>Full Name</label>
                <input name="name" value={formState.name} onChange={handleInputChange} className="glam-input" placeholder="Grace Hopper" required />
              </div>
              <div className="glam-group">
                <label>Phone Number</label>
                <input name="phone" value={formState.phone} onChange={handleInputChange} className="glam-input" placeholder="011..." />
              </div>
            </div>

            <div className="glam-group">
              <label>Work Email</label>
              <input name="email" type="email" value={formState.email} onChange={handleInputChange} className="glam-input" placeholder="name@company.com" required />
            </div>

            <div className="glam-group">
              <label>Inquiry Type</label>
              <select name="subject" value={formState.subject} onChange={handleInputChange} className="glam-input">
                <option>General Inquiry</option>
                <option>Data Partnership</option>
                <option>Careers</option>
                <option>Technical Support</option>
              </select>
            </div>

            <div className="glam-group">
              <label>Message</label>
              <textarea name="message" value={formState.message} onChange={handleInputChange} className="glam-input glam-textarea" rows="4" placeholder="How can we help you?" required></textarea>
            </div>

            <button type="submit" disabled={status.loading} className="glam-submit-btn">
              {status.loading ? <Loader className="animate-spin" /> : <>Send Proposal <Send size={20} /></>}
            </button>

            {status.success && (
              <div className="success-banner">
                <CheckCircle size={20} /> Message received! We'll be in touch soon.
              </div>
            )}
          </form>
        </div>
      </div>
    </div>
  );
};

export default ContactUs;
