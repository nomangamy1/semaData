import React from 'react';
import { Link } from 'react-router-dom';
import { Mic, ArrowRight, ShieldCheck, Database } from 'lucide-react';
import './LandingPage.css';

const LandingPage = () => {
  return (
    <div className="bg-white font-sans text-gray-900">
      {/* NOTE: Navbar and Footer are now handled globally in App.jsx.
         This page focuses purely on the value proposition.
      */}

      {/* --- HERO SECTION --- */}
      <section className="relative bg-[#489c8c] pt-32 pb-32 px-8 rounded-b-[60px] md:rounded-b-[80px]">
        <div className="max-w-5xl mx-auto text-center text-white">
          <h1 className="text-5xl md:text-7xl font-extrabold mb-6 leading-tight">
            Data Collection <br />
            <span className="text-teal-200">Simplified.</span>
          </h1>
          <p className="text-xl md:text-2xl text-teal-50/80 mb-10 max-w-2xl mx-auto">
            Empowering data collectors and domain administrators with real-time insights and seamless workflows.
          </p>
          <div className="flex flex-col md:flex-row justify-center gap-4">
            <Link to="/signup" className="bg-white text-[#489c8c] px-10 py-4 rounded-2xl font-bold text-lg flex items-center justify-center gap-2 hover:bg-teal-50 transition shadow-xl">
              Get Started <ArrowRight size={20} />
            </Link>
            <button className="border-2 border-teal-400 text-white px-10 py-4 rounded-2xl font-bold text-lg hover:bg-teal-500 transition">
              Watch Demo
            </button>
          </div>
        </div>

        {/* Floating Icons */}
        <div className="absolute bottom-10 left-10 opacity-20 hidden lg:block floating-icon">
          <Mic size={100} />
        </div>
        <div className="absolute top-20 right-10 opacity-20 hidden lg:block floating-icon">
          <Database size={80} />
        </div>
      </section>

      {/* --- FEATURES SECTION --- */}
      <section id="features" className="py-24 px-8 max-w-7xl mx-auto mb-20">
        <div className="grid md:grid-cols-3 gap-12 text-center">
          <div className="feature-card-wrapper">
            <div className="w-16 h-16 bg-[#489c8c]/10 text-[#489c8c] rounded-2xl flex items-center justify-center mx-auto mb-6">
              <ShieldCheck size={32} />
            </div>
            <h3 className="text-xl font-bold mb-4 text-gray-800">Secure Control</h3>
            <p className="text-gray-600">Manage domains with enterprise-grade security and granular permissions.</p>
          </div>

          <div className="feature-card-wrapper">
            <div className="w-16 h-16 bg-[#489c8c]/10 text-[#489c8c] rounded-2xl flex items-center justify-center mx-auto mb-6">
              <Database size={32} />
            </div>
            <h3 className="text-xl font-bold mb-4 text-gray-800">Seamless Export</h3>
            <p className="text-gray-600">Download collected data in multiple formats for immediate analysis.</p>
          </div>

          <div className="feature-card-wrapper">
            <div className="w-16 h-16 bg-[#489c8c]/10 text-[#489c8c] rounded-2xl flex items-center justify-center mx-auto mb-6">
              <Mic size={32} />
            </div>
            <h3 className="text-xl font-bold mb-4 text-gray-800">Dialect Intelligence</h3>
            <p className="text-gray-600">Advanced NLP matching to capture rare linguistic patterns in real-time.</p>
          </div>
        </div>
      </section>

      {/* No local footer here - App.jsx handles it! */}
    </div>
  );
};

export default LandingPage;