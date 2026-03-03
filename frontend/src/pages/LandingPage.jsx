// src/pages/LandingPage.jsx
import React from 'react';
import { Link } from 'react-router-dom';
import { Mic, ArrowRight, ShieldCheck, Database, PlayCircle } from 'lucide-react';
import './LandingPage.css';

const LandingPage = () => {
  return (
    <div className="bg-white font-sans text-gray-900 min-h-screen">
      {/* HERO SECTION */}
      <section className="relative bg-[#489c8c] pt-32 pb-40 px-6 md:px-12 rounded-b-[60px] md:rounded-b-[100px] overflow-hidden">
        <div className="max-w-6xl mx-auto text-center text-white relative z-10">
          <h1 className="text-5xl md:text-7xl font-extrabold mb-6 leading-tight tracking-tight">
            Data Collection <br />
            <span className="text-teal-200">Made Simple & Powerful</span>
          </h1>

          <p className="text-xl md:text-2xl text-teal-50/90 mb-12 max-w-3xl mx-auto">
            Connect collectors and domain owners with secure, real-time data workflows — from local voices to global insights.
          </p>

          <div className="flex flex-col sm:flex-row justify-center items-center gap-5 md:gap-8">
            {/* New users */}
            <Link
              to="/signup"
              className="group bg-white text-[#489c8c] px-10 py-5 rounded-2xl font-bold text-lg flex items-center gap-3 hover:bg-teal-50 transition-all duration-300 shadow-xl hover:shadow-2xl transform hover:-translate-y-1"
            >
              Get Started – Sign Up
              <ArrowRight className="group-hover:translate-x-1 transition-transform" size={22} />
            </Link>

            {/* Existing users */}
            <Link
              to="/login"
              className="group bg-transparent border-2 border-white text-white px-10 py-5 rounded-2xl font-bold text-lg flex items-center gap-3 hover:bg-white hover:text-[#489c8c] transition-all duration-300 shadow-lg hover:shadow-2xl transform hover:-translate-y-1"
            >
              Already have an account? Log In
              <ArrowRight className="group-hover:translate-x-1 transition-transform" size={22} />
            </Link>
          </div>
        </div>

        {/* Floating icons with animation */}
        <div className="absolute -bottom-10 left-10 opacity-20 hidden lg:block animate-float-slow">
          <Mic size={140} />
        </div>
        <div className="absolute top-20 right-16 opacity-20 hidden lg:block animate-float-medium">
          <Database size={100} />
        </div>
        <div className="absolute bottom-20 right-40 opacity-15 hidden lg:block animate-float-fast">
          <ShieldCheck size={80} />
        </div>
      </section>

      {/* FEATURES SECTION */}
      <section id="features" className="py-24 px-6 md:px-12 max-w-7xl mx-auto">
        <h2 className="text-4xl md:text-5xl font-bold text-center mb-16 text-gray-800">
          Why Choose semaData?
        </h2>

        <div className="grid md:grid-cols-3 gap-10 md:gap-12 text-center">
          <div className="feature-card bg-white p-10 rounded-3xl shadow-lg hover:shadow-2xl transition-all duration-300 border border-gray-100">
            <div className="w-20 h-20 bg-[#489c8c]/10 text-[#489c8c] rounded-3xl flex items-center justify-center mx-auto mb-8">
              <ShieldCheck size={40} />
            </div>
            <h3 className="text-2xl font-bold mb-5 text-gray-800">Enterprise-Grade Security</h3>
            <p className="text-gray-600 text-lg leading-relaxed">
              Full control, granular permissions, encrypted data, and compliance-ready workflows.
            </p>
          </div>

          <div className="feature-card bg-white p-10 rounded-3xl shadow-lg hover:shadow-2xl transition-all duration-300 border border-gray-100">
            <div className="w-20 h-20 bg-[#489c8c]/10 text-[#489c8c] rounded-3xl flex items-center justify-center mx-auto mb-8">
              <Database size={40} />
            </div>
            <h3 className="text-2xl font-bold mb-5 text-gray-800">Seamless Data Export</h3>
            <p className="text-gray-600 text-lg leading-relaxed">
              Download in CSV, JSON, Excel — ready for analysis in seconds.
            </p>
          </div>

          <div className="feature-card bg-white p-10 rounded-3xl shadow-lg hover:shadow-2xl transition-all duration-300 border border-gray-100">
            <div className="w-20 h-20 bg-[#489c8c]/10 text-[#489c8c] rounded-3xl flex items-center justify-center mx-auto mb-8">
              <Mic size={40} />
            </div>
            <h3 className="text-2xl font-bold mb-5 text-gray-800">Dialect & Voice Intelligence</h3>
            <p className="text-gray-600 text-lg leading-relaxed">
              Advanced speech-to-text and NLP tuned for local languages and rare dialects.
            </p>
          </div>
        </div>
      </section>

      {/* FINAL CTA SECTION */}
      <section className="bg-gray-50 py-20 px-6 md:px-12 text-center">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-4xl md:text-5xl font-bold mb-8 text-gray-800">
            Ready to Start Collecting?
          </h2>
          <p className="text-xl text-gray-600 mb-12 max-w-3xl mx-auto">
            Whether you're a collector or domain owner, semaData makes it fast, secure, and scalable.
          </p>

          <div className="flex flex-col sm:flex-row justify-center gap-6">
            <Link
              to="/signup"
              className="bg-[#489c8c] text-white px-12 py-5 rounded-2xl font-bold text-lg hover:bg-[#3a8c7c] transition shadow-xl"
            >
              Sign Up Now
            </Link>
            <Link
              to="/login"
              className="bg-transparent border-2 border-[#489c8c] text-[#489c8c] px-12 py-5 rounded-2xl font-bold text-lg hover:bg-[#489c8c] hover:text-white transition"
            >
              Log In
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
};

export default LandingPage;