import React, { useState } from 'react';
import { Mail, Phone, MapPin, Send, MessageSquare, Globe, CheckCircle, AlertCircle, Loader } from 'lucide-react';
import './ContactUs.css';

const ContactUs = () => {
  const [formState, setFormState] = useState({
    name: '',
    email: '',
    subject: 'General Inquiry',
    message: '',
    phone: ''
  });

  const [status, setStatus] = useState({
    loading: false,
    success: false,
    error: null
  });

  const [formErrors, setFormErrors] = useState({});

  // Form validation
  const validateForm = () => {
    const errors = {};

    if (!formState.name.trim()) errors.name = 'Name is required';
    if (!formState.email.trim()) errors.email = 'Email is required';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formState.email)) errors.email = 'Invalid email format';
    if (!formState.subject.trim()) errors.subject = 'Subject is required';
    if (!formState.message.trim()) errors.message = 'Message is required';
    else if (formState.message.trim().length < 10) errors.message = 'Message must be at least 10 characters';
    if (formState.phone && !/^[\d\s\-\+\(\)]+$/.test(formState.phone)) errors.phone = 'Invalid phone format';

    return errors;
  };

  // Handle input changes
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormState(prev => ({
      ...prev,
      [name]: value
    }));
    // Clear error for this field
    if (formErrors[name]) {
      setFormErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
  };

  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();

    // Validate form
    const errors = validateForm();
    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      return;
    }

    setStatus({ loading: true, success: false, error: null });

    try {
      const response = await fetch('http://localhost:8000/api/contact', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(formState)
      });

      const data = await response.json();

      if (response.ok) {
        setStatus({ loading: false, success: true, error: null });
        setFormState({
          name: '',
          email: '',
          subject: 'General Inquiry',
          message: '',
          phone: ''
        });
        setFormErrors({});

        // Clear success message after 5 seconds
        setTimeout(() => {
          setStatus({ loading: false, success: false, error: null });
        }, 5000);
      } else {
        setStatus({
          loading: false,
          success: false,
          error: data.message || 'Failed to send message. Please try again.'
        });
      }
    } catch (err) {
      console.error('Contact form error:', err);
      setStatus({
        loading: false,
        success: false,
        error: 'Network error. Please check your connection and try again.'
      });
    }
  };

  return (
    <div className="min-h-screen bg-white text-gray-900 font-sans">
      <div className="max-w-7xl mx-auto px-6 py-20">

        {/* HEADER SECTION */}
        <div className="mb-16 animate-fade-in">
          <h1 className="text-5xl font-black tracking-tighter mb-4 text-gray-900">
            Connect with our <span className="text-[#489c8c]">Intelligence Team.</span>
          </h1>
          <p className="text-xl text-gray-500 max-w-2xl leading-relaxed">
            Whether you're looking for a small dataset, a large complex one or technical support for dialect ingestion, our team in Eldoret, Kenya is ready to provide full assistance.
          </p>
        </div>

        <div className="grid lg:grid-cols-2 gap-16">

          {/* LEFT COLUMN: CONTACT INFO & BRAND IDENTITY */}
          <div className="space-y-12">
            <div className="grid sm:grid-cols-2 gap-8">
              <div className="p-6 bg-gray-50 rounded-2xl border border-gray-100 hover:shadow-lg hover:border-[#489c8c]/20 transition-all">
                <div className="w-12 h-12 bg-[#489c8c]/10 text-[#489c8c] rounded-xl flex items-center justify-center mb-4">
                  <Mail size={24} />
                </div>
                <h3 className="font-bold text-lg mb-1">Email us</h3>
                <p className="text-gray-500 text-sm mb-3">Support & Inquiries</p>
                <a href="mailto:hello@semadata.ai" className="font-semibold text-[#489c8c] hover:underline">hello@semadata.ai</a>
              </div>

              <div className="p-6 bg-gray-50 rounded-2xl border border-gray-100 hover:shadow-lg hover:border-[#489c8c]/20 transition-all">
                <div className="w-12 h-12 bg-[#489c8c]/10 text-[#489c8c] rounded-xl flex items-center justify-center mb-4">
                  <Phone size={24} />
                </div>
                <h3 className="font-bold text-lg mb-1">Call us</h3>
                <p className="text-gray-500 text-sm mb-3">Mon-Fri 8am-5pm EAT</p>
                <a href="tel:+254113165657" className="font-semibold text-[#489c8c] hover:underline">+254 (113) 165-657</a>
              </div>
            </div>

            <div className="p-8 bg-gray-900 rounded-[32px] text-white relative overflow-hidden">
              <div className="relative z-10">
                <h3 className="text-2xl font-bold mb-4 flex items-center gap-2">
                  <MapPin size={24} className="text-[#489c8c]" />
                  Visit our HQ
                </h3>
                <p className="text-gray-400 mb-6 leading-relaxed">
                  RiftValley Technical Training Institute<br />
                  Eldoret Town, Kenya
                </p>
                <div className="flex items-center gap-4">
                  <div className="w-2 h-2 bg-[#489c8c] rounded-full animate-pulse"></div>
                  <span className="text-sm font-medium tracking-widest text-[#489c8c] uppercase">Live Support Available</span>
                </div>
              </div>
              <Globe size={200} className="absolute -bottom-10 -right-10 text-white/5 rotate-12" />
            </div>

            {/* Social Links */}
            <div className="pt-8">
              <p className="font-bold mb-4 text-gray-900">Connect with us</p>
              <div className="flex gap-4">
                {[
                  { name: 'LinkedIn', url: 'https://linkedin.com' },
                  { name: 'Twitter', url: 'https://twitter.com' },
                  { name: 'GitHub', url: 'https://github.com' }
                ].map((social) => (
                  <a
                    key={social.name}
                    href={social.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-5 py-2 rounded-full border border-gray-200 text-sm font-medium hover:border-[#489c8c] hover:text-[#489c8c] hover:bg-[#489c8c]/5 transition-all"
                  >
                    {social.name}
                  </a>
                ))}
              </div>
            </div>
          </div>

          {/* RIGHT COLUMN: CONTACT FORM */}
          <div className="bg-white p-8 md:p-12 rounded-[40px] shadow-2xl shadow-gray-200/50 border border-gray-50">

            {/* Success Message */}
            {status.success && (
              <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-2xl flex items-start gap-3 animate-fade-in">
                <CheckCircle className="text-green-600 mt-1 flex-shrink-0" size={20} />
                <div>
                  <p className="font-bold text-green-900">Message sent successfully!</p>
                  <p className="text-sm text-green-700">We'll get back to you within 24 hours.</p>
                </div>
              </div>
            )}

            {/* Error Message */}
            {status.error && (
              <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-2xl flex items-start gap-3 animate-fade-in">
                <AlertCircle className="text-red-600 mt-1 flex-shrink-0" size={20} />
                <div>
                  <p className="font-bold text-red-900">Error sending message</p>
                  <p className="text-sm text-red-700">{status.error}</p>
                </div>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-sm font-bold text-gray-700 ml-1">Full Name *</label>
                  <input
                    type="text"
                    name="name"
                    value={formState.name}
                    onChange={handleChange}
                    placeholder="John Doe"
                    className={`w-full px-5 py-4 bg-gray-50 border rounded-2xl focus:outline-none focus:ring-2 focus:ring-[#489c8c]/20 focus:border-[#489c8c] transition-all ${formErrors.name ? 'border-red-300 focus:ring-red-200 focus:border-red-500' : 'border-gray-100'
                      }`}
                  />
                  {formErrors.name && <p className="text-red-600 text-sm ml-1">{formErrors.name}</p>}
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-bold text-gray-700 ml-1">Email Address *</label>
                  <input
                    type="email"
                    name="email"
                    value={formState.email}
                    onChange={handleChange}
                    placeholder="you@example.com"
                    className={`w-full px-5 py-4 bg-gray-50 border rounded-2xl focus:outline-none focus:ring-2 focus:ring-[#489c8c]/20 focus:border-[#489c8c] transition-all ${formErrors.email ? 'border-red-300 focus:ring-red-200 focus:border-red-500' : 'border-gray-100'
                      }`}
                  />
                  {formErrors.email && <p className="text-red-600 text-sm ml-1">{formErrors.email}</p>}
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-bold text-gray-700 ml-1">Phone (Optional)</label>
                <input
                  type="tel"
                  name="phone"
                  value={formState.phone}
                  onChange={handleChange}
                  placeholder="+254 712 345 678"
                  className={`w-full px-5 py-4 bg-gray-50 border rounded-2xl focus:outline-none focus:ring-2 focus:ring-[#489c8c]/20 focus:border-[#489c8c] transition-all ${formErrors.phone ? 'border-red-300 focus:ring-red-200 focus:border-red-500' : 'border-gray-100'
                    }`}
                />
                {formErrors.phone && <p className="text-red-600 text-sm ml-1">{formErrors.phone}</p>}
              </div>

              <div className="space-y-2">
                <label className="text-sm font-bold text-gray-700 ml-1">Subject *</label>
                <select
                  name="subject"
                  value={formState.subject}
                  onChange={handleChange}
                  className={`w-full px-5 py-4 bg-gray-50 border rounded-2xl focus:outline-none focus:ring-2 focus:ring-[#489c8c]/20 focus:border-[#489c8c] transition-all appearance-none cursor-pointer ${formErrors.subject ? 'border-red-300 focus:ring-red-200 focus:border-red-500' : 'border-gray-100'
                    }`}
                >
                  <option value="General Inquiry">General Inquiry</option>
                  <option value="Domain Ownership">Domain Ownership</option>
                  <option value="Partnership">Partnership</option>
                  <option value="Technical Issue">Technical Issue</option>
                  <option value="Data Collection">Data Collection</option>
                  <option value="Pricing">Pricing</option>
                </select>
                {formErrors.subject && <p className="text-red-600 text-sm ml-1">{formErrors.subject}</p>}
              </div>

              <div className="space-y-2">
                <label className="text-sm font-bold text-gray-700 ml-1">Message *</label>
                <textarea
                  name="message"
                  rows="5"
                  value={formState.message}
                  onChange={handleChange}
                  placeholder="How can semaData help your project?"
                  className={`w-full px-5 py-4 bg-gray-50 border rounded-2xl focus:outline-none focus:ring-2 focus:ring-[#489c8c]/20 focus:border-[#489c8c] transition-all resize-none ${formErrors.message ? 'border-red-300 focus:ring-red-200 focus:border-red-500' : 'border-gray-100'
                    }`}
                ></textarea>
                {formErrors.message && <p className="text-red-600 text-sm ml-1">{formErrors.message}</p>}
              </div>

              <button
                type="submit"
                disabled={status.loading}
                className="w-full bg-[#489c8c] text-white py-5 rounded-2xl font-black text-lg flex items-center justify-center gap-3 hover:bg-[#367a6d] transition-all shadow-xl shadow-[#489c8c]/20 active:scale-95 disabled:opacity-70 disabled:cursor-not-allowed"
              >
                {status.loading ? (
                  <>
                    <Loader size={20} className="animate-spin" />
                    Sending...
                  </>
                ) : (
                  <>
                    Send Message <Send size={20} />
                  </>
                )}
              </button>

              <p className="text-xs text-gray-500 text-center">
                We'll respond to your message within 24 hours during business hours.
              </p>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ContactUs;