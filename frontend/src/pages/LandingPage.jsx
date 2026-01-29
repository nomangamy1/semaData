import React from 'react';
import { Link } from 'react-router-dom';
import { Mic, ArrowRight, ShieldCheck, Database } from 'lucide-react';
import './LandingPage.css';




const LandingPage = () => {
  return (
    <div className="min-h-screen bg-white font-sans text-gray-900">
      {/* --- NAVBAR --- */}
      <nav className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-gray-100 flex items-center justify-between px-8 py-4 max-w-full mx-auto">
        <div className="text-3xl font-black text-[#489c8c] tracking-tighter">
          Welcome to semaData
        </div>
        <div className="hidden md:flex space-x-8 font-medium">
          <a href="#features" className="hover:text-[#489c8c] transition">Features</a>
          <a href="#about" className="hover:text-[#489c8c] transition">About</a>
          <a href="#contact" className="hover:text-[#489c8c] transition">Contact Us</a>

        </div>
        <div className="flex items-center space-x-4">
          <Link to="/login" className="font-semibold text-gray-600 hover:text-[#489c8c]">Log in</Link>
          <Link to="/signup" className="bg-[#489c8c] text-white px-6 py-2 rounded-full font-bold hover:bg-[#367a6d] transition shadow-lg">
            Join Now
          </Link>
        </div>
      </nav>

      {/* --- HERO SECTION --- */}
      <section className="relative bg-[#489c8c] pt-20 pb-32 px-8 rounded-b-[80px]">
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

        {/* Floating Icon Decorations */}
        <div className="absolute bottom-10 left-10 opacity-20 hidden lg:block">
          <Mic size={100} />
        </div>
        <div className="absolute top-20 right-10 opacity-20 hidden lg:block">
          <Database size={80} />
        </div>
      </section>
      <section id="features" className="py-24 px-8 max-w-7xl mx-auto">
        <div className="grid md:grid-cols-3 gap-12 text-center">
          {/* Card 1 */}
          <div className="p-8 rounded-3xl border border-gray-100 bg-white transition-all duration-300 hover:scale-105 hover:shadow-2xl hover:border-semadata-green/20 group">
            <div className="w-16 h-16 bg-[#489c8c]/10 text-[#489c8c] rounded-2xl flex items-center justify-center mx-auto mb-6 group-hover:bg-[#489c8c] group-hover:text-white transition-colors">
              <ShieldCheck size={32} />
            </div>
            <h3 className="text-xl font-bold mb-4">Secure Domain Owner Control</h3>
            <p className="text-gray-600">Manage domains with enterprise-grade security and granular permissions.</p>
          </div>

          {/* Card 2 (Add a new one for balance) */}
          <div className="p-8 rounded-3xl border border-gray-100 bg-white transition-all duration-300 hover:scale-105 hover:shadow-2xl hover:border-semadata-green/20 group">
            <div className="w-16 h-16 bg-[#489c8c]/10 text-[#489c8c] rounded-2xl flex items-center justify-center mx-auto mb-6 group-hover:bg-[#489c8c] group-hover:text-white transition-colors">
              <Database size={32} />
            </div>
            <h3 className="text-xl font-bold mb-4">Seamless Data Export</h3>
            <p className="text-gray-600">Download your collected data in multiple formats for immediate analysis.</p>
          </div>
        </div>
      </section>

      <div className="py-12 bg-white border-y border-gray-100">
        <p className="text-center text-sm font-semibold text-gray-400 uppercase tracking-widest mb-8">Powering Data Teams At</p>
        <div className="flex flex-wrap justify-center gap-12 opacity-50 grayscale">
          {/* Use simple text logos if you don't have images */}
          <span className="text-2xl font-bold">ResearchHub</span>
          <span className="text-2xl font-bold">Linguistix</span>
          <span className="text-2xl font-bold">EcoData</span>
          <span className="text-2xl font-bold">GlobalStats</span>
        </div>
      </div>
      <footer className="bg-gray-900 text-gray-400 py-16 px-8">
        <div className="max-w-7xl mx-auto grid md:grid-cols-4 gap-12">
          <div className="col-span-1 md:col-span-2">
            <div className="text-2xl font-bold text-white mb-4">semaData</div>
            <p className="max-w-xs">The bridge between local insights and global data standards.</p>
          </div>
          <div>
            <h5 className="text-white font-bold mb-4">Product</h5>
            <ul className="space-y-2">
              <li><a href="#" className="hover:text-teal-400">Features</a></li>
              <li><a href="#" className="hover:text-teal-400">Security</a></li>
            </ul>
          </div>
          <div>
            <h5 className="text-white font-bold mb-4">Company</h5>
            <ul className="space-y-2">
              <li><a href="#" className="hover:text-teal-400">About Us</a></li>
              <li><a href="#" className="hover:text-teal-400">Contact</a></li>
            </ul>
          </div>
        </div>
        <div className="max-w-7xl mx-auto mt-12 pt-8 border-t border-gray-800 text-sm text-center">
          © 2026 semaData. Built with ❤️ in Kenya.
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;