import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import  './careersPublic.css';

import { Search, MapPin, ArrowRight, Briefcase, Filter, Sparkles } from 'lucide-react';
const CareersPage = () => {
  const [jobs, setJobs] = useState([]);
  const [fields, setFields] = useState([]);
  const [selectedField, setSelectedField] = useState('');
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  // 1. Fetch available fields for the Filter Bar
  useEffect(() => {
    fetch('http://localhost:8000/api/careers/fields')
      .then(res => res.json())
      .then(data => setFields(data.available_fields || []))
      .catch(err => console.error("Error fetching fields:", err));
  }, []);

  // 2. Fetch Jobs (Reacts to filter changes)
  useEffect(() => {
    setLoading(true);
    let url = 'http://localhost:8000/api/careers/careers';
    if (selectedField) url += `?field=${selectedField}`;

    fetch(url)
      .then(res => res.json())
      .then(data => {
        setJobs(data.jobs || []);
        setLoading(false);
      });
  }, [selectedField]);

  return (
    <div className="min-h-screen bg-[#fcfcfd]">
      {/* --- HERO SECTION --- */}
      <div className="bg-slate-900 pt-24 pb-40 px-6 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-1/2 h-full bg-emerald-500/10 blur-[120px] rounded-full" />
        <div className="max-w-6xl mx-auto text-center relative z-10">
          <div className="inline-flex items-center gap-2 bg-emerald-500/20 text-emerald-400 px-4 py-2 rounded-full mb-6">
            <Sparkles size={16} />
            <span className="text-sm font-bold uppercase tracking-widest">Join the SemaData Mission</span>
          </div>
          <h1 className="text-5xl md:text-7xl font-black text-white mb-6">
            Help build the future of <span className="text-emerald-400">African AI.</span>
          </h1>
          <p className="text-slate-400 text-lg md:text-xl max-w-2xl mx-auto">
            We are looking for specialized data collectors to help us bridge the linguistic gap 
            in rural Africa. Find a project that matches your dialect and expertise.
          </p>
        </div>
      </div>

      {/* --- FILTER BAR (Sticky) --- */}
      <div className="max-w-5xl mx-auto px-6 -mt-12 sticky top-6 z-20">
        <div className="bg-white p-4 rounded-[32px] shadow-2xl border border-slate-100 flex flex-col md:flex-row gap-4">
          <div className="flex-1 flex items-center gap-3 px-4 bg-slate-50 rounded-2xl border border-slate-100">
            <Search className="text-slate-400" size={20} />
            <input 
              type="text" 
              placeholder="Search by location or project name..." 
              className="bg-transparent border-none focus:ring-0 w-full text-slate-700 font-medium py-3"
            />
          </div>
          
          <div className="flex items-center gap-3 px-4 bg-slate-50 rounded-2xl border border-slate-100">
            <Filter className="text-slate-400" size={18} />
            <select 
              value={selectedField}
              onChange={(e) => setSelectedField(e.target.value)}
              className="bg-transparent border-none focus:ring-0 text-slate-600 font-bold pr-8"
            >
              <option value="">All Fields</option>
              {fields.map(f => <option key={f} value={f}>{f}</option>)}
            </select>
          </div>
        </div>
      </div>

      {/* --- JOB GRID --- */}
      <div className="max-w-6xl mx-auto px-6 py-20">
        <div className="flex justify-between items-end mb-12">
          <div>
            <h2 className="text-3xl font-black text-slate-900">Available Projects</h2>
            <p className="text-slate-500 font-medium">Browse open data collection roles</p>
          </div>
          <div className="text-slate-400 font-bold text-sm">
            Showing {jobs.length} Opportunities
          </div>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {[1,2,3].map(i => <div key={i} className="h-64 bg-slate-100 animate-pulse rounded-[32px]" />)}
          </div>
        ) : jobs.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {jobs.map(job => (
              <JobCard key={job.id} job={job} onClick={() => navigate(`/careers/${job.id}`)} />
            ))}
          </div>
        ) : (
          <div className="text-center py-20 bg-white rounded-[40px] border border-dashed border-slate-200">
            <Briefcase size={48} className="mx-auto text-slate-300 mb-4" />
            <h3 className="text-xl font-bold text-slate-800">No projects found in this field</h3>
            <p className="text-slate-500">Try selecting a different category or check back later.</p>
          </div>
        )}
      </div>
    </div>
  );
};

// --- THE JOB CARD COMPONENT ---
const JobCard = ({ job, onClick }) => {
  return (
    <div 
      onClick={onClick}
      className="bg-white border border-slate-100 p-8 rounded-[40px] shadow-sm hover:shadow-2xl hover:-translate-y-2 transition-all duration-500 cursor-pointer group flex flex-col h-full"
    >
      <div className="flex justify-between items-start mb-6">
        <span className="bg-emerald-50 text-emerald-600 text-[10px] font-black px-4 py-1.5 rounded-full uppercase tracking-widest border border-emerald-100">
          {job.field}
        </span>
        <div className="bg-slate-900 text-white p-2 rounded-xl group-hover:bg-emerald-500 transition-colors">
          <ArrowRight size={18} />
        </div>
      </div>

      <h3 className="text-2xl font-black text-slate-900 mb-2 leading-tight group-hover:text-emerald-600 transition-colors">
        {job.title}
      </h3>
      
      <div className="flex items-center gap-1.5 text-slate-500 font-bold text-xs mb-8">
        <MapPin size={14} className="text-emerald-500" />
        {job.location}
      </div>

      <div className="mt-auto pt-6 border-t border-slate-50 grid grid-cols-2 gap-4">
        <div>
          <p className="text-[10px] uppercase text-slate-400 font-black tracking-widest mb-1">Pay rate</p>
          <p className="text-slate-900 font-black">{job.compensation}</p>
        </div>
        <div>
          <p className="text-[10px] uppercase text-slate-400 font-black tracking-widest mb-1">Duration</p>
          <p className="text-slate-900 font-black">{job.duration}</p>
        </div>
      </div>
    </div>
  );
};

export default CareersPage;