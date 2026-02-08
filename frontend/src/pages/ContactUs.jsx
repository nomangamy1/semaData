import React, { useState } from 'react';
import { Mail, Phone, MapPin, Send, MessageSquare, Globe, ArrowRight } from 'lucide-react';
import './ContactUs.css';

const ContactUs = () => {
  const [formState, setFormState] = useState({
    name: '',
    email: '',
    subject: 'General Inquiry',
    message: ''
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    // Logic for backend submission would go here
    alert("Message transmitted to semaData HQ.");
  };

  return (
    <div className="min-h-screen bg-white text-gray-900 font-sans">
      <div className="max-w-7xl mx-auto px-6 py-20">
        
        {/* HEADER SECTION */}
        <div className="mb-16">
          <h1 className="text-5xl font-black tracking-tighter mb-4 text-gray-900">
            Connect with our <span className="text-[#489c8c]">Intelligence Team.</span>
          </h1>
          <p className="text-xl text-gray-500 max-w-2xl">
            Whether you're looking for a small dataset,a large complex one or technical support for dialect ingestion, our team in Eldoret,Kenya is ready to be of 
          <br></br>
          full assistance !!
          .
          </p>
        </div>

        <div className="grid lg:grid-cols-2 gap-16">
          
          {/* LEFT COLUMN: CONTACT INFO & BRAND IDENTITY */}
          <div className="space-y-12">
            <div className="grid sm:grid-cols-2 gap-8">
              <div className="p-6 bg-gray-50 rounded-2xl border border-gray-100">
                <div className="w-12 h-12 bg-[#489c8c]/10 text-[#489c8c] rounded-xl flex items-center justify-center mb-4">
                  <Mail size={24} />
                </div>
                <h3 className="font-bold text-lg mb-1">Email us</h3>
                <p className="text-gray-500 text-sm mb-3">Support & Inquiries</p>
                <p className="font-semibold text-[#489c8c]">hello@semadata.ai</p>
              </div>

              <div className="p-6 bg-gray-50 rounded-2xl border border-gray-100">
                <div className="w-12 h-12 bg-[#489c8c]/10 text-[#489c8c] rounded-xl flex items-center justify-center mb-4">
                  <Phone size={24} />
                </div>
                <h3 className="font-bold text-lg mb-1">Call us</h3>
                <p className="text-gray-500 text-sm mb-3">Mon-Fri from 8am to 5pm</p>
                <p className="font-semibold text-[#489c8c]">+254 113165657</p>
              </div>
            </div>

            <div className="p-8 bg-gray-900 rounded-[32px] text-white relative overflow-hidden">
              <div className="relative z-10">
                <h3 className="text-2xl font-bold mb-4 flex items-center gap-2">
                   Visit our HQ
                </h3>
                <p className="text-gray-400 mb-6 leading-relaxed">
                  RiftValley Technical Training Institute<br />
                  Eldoret Town
                </p>
                <div className="flex items-center gap-4">
                   <div className="w-2 h-2 bg-[#489c8c] rounded-full animate-pulse"></div>
                   <span className="text-sm font-medium tracking-widest text-[#489c8c] uppercase">Live Support Available</span>
                </div>
              </div>
              {/* Decorative Globe Icon in Background */}
              <Globe size={200} className="absolute -bottom-10 -right-10 text-white/5 rotate-12" />
            </div>

         
          </div>

          {/* RIGHT COLUMN: CONTACT FORM */}
          <div className="bg-white p-8 md:p-12 rounded-[40px] shadow-2xl shadow-gray-200/50 border border-gray-50">
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-sm font-bold text-gray-700 ml-1">Full Name</label>
                  <input 
                    type="text" 
                    className="w-full px-5 py-4 bg-gray-50 border border-gray-100 rounded-2xl focus:outline-none focus:ring-2 focus:ring-[#489c8c]/20 focus:border-[#489c8c] transition-all"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-bold text-gray-700 ml-1">Email Address</label>
                  <input 
                    type="email" 
                    className="w-full px-5 py-4 bg-gray-50 border border-gray-100 rounded-2xl focus:outline-none focus:ring-2 focus:ring-[#489c8c]/20 focus:border-[#489c8c] transition-all"
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-bold text-gray-700 ml-1">Subject</label>
                <select className="w-full px-5 py-4 bg-gray-50 border border-gray-100 rounded-2xl focus:outline-none focus:ring-2 focus:ring-[#489c8c]/20 focus:border-[#489c8c] transition-all appearance-none cursor-pointer">
                  <option>General Inquiry</option>
                  <option>Domain Ownership</option>
                  <option>Partnership</option>
                  <option>Technical Issue</option>
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-bold text-gray-700 ml-1">Message</label>
                <textarea 
                  rows="5" 
                  placeholder="How can semaData help my AI project?" 
                  className="w-full px-5 py-4 bg-gray-50 border border-gray-100 rounded-2xl focus:outline-none focus:ring-2 focus:ring-[#489c8c]/20 focus:border-[#489c8c] transition-all"
                  required
                ></textarea>
              </div>

              <button 
                type="submit" 
                className="w-full bg-[#489c8c] text-white py-5 rounded-2xl font-black text-lg flex items-center justify-center gap-3 hover:bg-[#367a6d] transition-all shadow-xl shadow-[#489c8c]/20 active:scale-95"
              >
                Send Message <Send size={20} />
              </button>
            </form>

          </div>
             <div className="pt-8">
              <p className="font-bold mb-4">Social Ecosystem</p>
              <div className="flex gap-4">
                {['LinkedIn', 'Twitter', 'GitHub'].map((social) => (
                  <button key={social} className="px-5 py-2 rounded-full border border-gray-200 text-sm font-medium hover:border-[#489c8c] hover:text-[#489c8c] transition-all">
                    {social}
                  </button>
                ))}
              </div>
            </div>
        </div>
      </div>
    </div>
  );
};

export default ContactUs;