import React from 'react';
import './AboutUs.css';
import { Shield, Cpu, Globe, Users, Award } from 'lucide-react';
 import  founderPhoto from '../assets/founderIan.png' ;
 import  rvttilogo from '../assets/RVTTI-LOGO.gif';
const AboutUs = () => {
  const features = [
    {
      icon: <Cpu className="w-6 h-6 text-blue-400" />,
      title: "Faster-Model Inference",
      description: "Utilizing high technology for real-time, high-accuracy dialect transcription."
    },
    {
      icon: <Shield className="w-6 h-6 text-green-400" />,
      title: "Data Provenance",
      description: "Secure session aggregation with identity verification for research integrity."
    },
    {
      icon: <Globe className="w-6 h-6 text-purple-400" />,
      title: "Linguistic Preservation",
      description: "Capturing and segmenting rare dialect features through advanced NLP matching techniques."
    },
    {
      icon: <Users className="w-6 h-6 text-orange-400" />,
      title: "Collaborative Research",
      description: "A centralized platform for innovation heads and researchers to manage datasets."
    }
  ];

  return (
    <div className="min-h-screen bg-slate-900 text-white py-20 px-6">
      <div className="max-w-6xl mx-auto">
        {/* Header Section */}
        <div className="text-center mb-16">
          <h1 className="text-5xl font-bold mb-4 bg-gradient-to-r from-blue-400 to-emerald-400 bg-clip-text text-transparent">
            SemaData Platform
          </h1>
          <p className="text-xl text-slate-400 max-w-2xl mx-auto">
            The next generation of linguistic data ingestion,bridging the gap between Innovative problem solving ideas and Local Data.
          </p>
        </div>
        <div className="grid md:grid-cols-2 gap-12 items-start mb-24">
          <div className="space-y-6">
            <h2 className="text-3xl font-semibold flex items-center gap-2">
               Our Mission
            </h2>
            <p className="text-slate-300 leading-relaxed">
             Our mission is to end data scarcity in Africa by developing Real-world applicative tools that empower local communities and fuel innovation through authentic data.
            </p>
            <div className="border-l-4 border-blue-500 pl-4 py-2 italic text-slate-400">
              "Turning day to day conversations and activities into problem solving datasets."
            </div>
          </div>

          <div className="space-y-6">
            <h2 className="text-3xl font-semibold">Our Vision</h2>
            <p className="text-slate-300 leading-relaxed">
             Our vision is to bridge the global digital divide by becoming the leading provider of ground-truth African data for healthcare and beyond.
            </p>
          </div>
        </div>

        {/* Features Grid */}
        <div className="grid md:grid-cols-4 gap-8 mb-32">
          {features.map((f, i) => (
            <div key={i} className="p-6 bg-slate-800/50 rounded-xl border border-slate-700 hover:border-blue-500 transition-colors">
              <div className="mb-4">{f.icon}</div>
              <h4 className="font-bold mb-2">{f.title}</h4>
              <p className="text-sm text-slate-400 leading-snug">{f.description}</p>
            </div>
          ))}
        </div>

        {/* --- NEW FOUNDER SECTION --- */}
        <div className="mt-32 p-1 border-t border-slate-800">
          <div className="pt-16 grid md:grid-cols-3 gap-12 items-center">
            <div className="md:col-span-1 flex justify-center">
              <div className="relative w-64 h-64">
                <div className="absolute inset-0 bg-gradient-to-tr from-blue-500 to-emerald-500 rounded-2xl rotate-6 opacity-20"></div>
                <img 
                  src={founderPhoto}
                  alt="Founder Profile" 
                  className="relative z-10 w-full h-full object-cover rounded-2xl border-2 border-slate-700"
                />
              </div>
            </div>
            
            <div className="md:col-span-2 space-y-4 text-center md:text-left">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 text-blue-400 text-sm font-medium mb-2">
                <Award size={16} />
                <span>Meet the Founder</span>
              </div>
              <h2 className="text-4xl font-bold">Kiplimo Ian Chege</h2>
              <p className="text-xl text-blue-400 font-medium">Founder & Lead Developer</p>
              <p className="text-slate-300 text-lg leading-relaxed">
                Hey ,Ian Chege is a tech innovator and Entreprenuer dedicated to solving Africa Challenges across various 
                domains through
                 building AI solutions that empower local communities and bridge the digital diversed fields 
               through inclusive linguistic technology.
               SemaData is one of the impactful platforms aiming to revolutionize data collection by speeding,
               the process of  generating clean environmental-based datasets and actually making it a priority that systems 
               developed are user-friendly ,as this actually eases the process.
              </p>
              <div className="pt-4">
                <button className="bg-slate-800 hover:bg-slate-700 text-white px-6 py-2 rounded-lg border border-slate-600 transition-all">
                  Connect on LinkedIn
                </button>
              </div>
               {/* --- SECTION 3: INSTITUTIONAL PARTNERS (THE TRUST LAYER) --- */}
<div className="mt-32 mb-16 text-center">
  <h3 className="text-sm font-semibold uppercase tracking-[0.2em] text-emerald-400 mb-10">
    Strategic Technical Partners
  </h3>
  <div className="flex justify-center">
    <div className="group relative bg-slate-800/30 border border-slate-700 p-8 rounded-3xl hover:border-emerald-500/50 transition-all duration-500">
      {/* If it's a GIF, the motion will catch the eye here */}
      <img 
        src={rvttilogo} 
        alt="RVTTI Logo" 
        className="h-20 md:h-24 object-contain mx-auto mb-4 group-hover:scale-110 transition-transform"
      />
      <h4 className="text-xl font-bold text-white">Rift Valley Technical Training Institute</h4>
      <p className="text-slate-400 text-sm mt-2">Academic & Research Validation Partner</p>
      
      {/* Decorative Glow */}
      <div className="absolute -inset-1 bg-emerald-500 rounded-3xl blur opacity-0 group-hover:opacity-10 transition duration-500"></div>
    </div>
  </div>
</div>

<div className="mt-32 p-1 border-t border-slate-800">
   {/* Your Founder code follows here... */}
</div>    
            </div>
          </div>
        </div>
        {/* --- END FOUNDER SECTION --- */}

      </div>
    </div>
  );
};

export default AboutUs;