import React, { useState } from 'react';
import { X, Briefcase, MapPin, DollarSign, Clock, FileText, PlusCircle, Layers } from 'lucide-react';
import './JobPostModal.css';

const JobPostModal = ({ isOpen, onClose, domains, onPublish }) => {
  const [jobData, setJobData] = useState({
    title: '',
    domain_id: '',
    location: '',
    compensation: '',
    duration: '',
    description: '',
    required_skills: ''
  });

  if (!isOpen) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    // Split comma-separated skills into a clean array for the database
    const formattedData = {
      ...jobData,
      required_skills: jobData.required_skills.split(',').map(s => s.trim()).filter(s => s !== "")
    };
    onPublish(formattedData);
  };

  return (
    <div className="modal-overlay">
      <div className="modal-container animate-in">
        
        {/* Header: Admin Style */}
        <header className="modal-header">
          <div className="flex justify-between items-center w-full">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-emerald-500/20 text-emerald-400 rounded-2xl">
                <PlusCircle size={24} />
              </div>
              <div>
                <h2 className="text-2xl font-black italic text-white uppercase tracking-tight">Deploy New Project</h2>
                <p className="text-slate-400 text-[10px] font-bold uppercase tracking-[0.2em]">Careers Portal Management</p>
              </div>
            </div>
            <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-xl transition-colors text-slate-400">
              <X size={24} />
            </button>
          </div>
        </header>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="modal-body bg-white p-10 space-y-8 admin-scroll max-h-[70vh] overflow-y-auto">
          
          {/* Domain Selection: The "Link" */}
          <div className="space-y-3">
            <label className="flex items-center gap-2 text-[10px] font-black text-slate-400 uppercase tracking-widest">
              <Layers size={14}/> Target Knowledge Domain
            </label>
            <select 
              required
              className="admin-input-field w-full"
              onChange={e => setJobData({...jobData, domain_id: e.target.value})}
            >
              <option value="">Select a Client Domain...</option>
              {domains.map(d => (
                <option key={d.id} value={d.id}>{d.domain_name}</option>
              ))}
            </select>
            <p className="text-[10px] text-slate-400 italic">This job will be linked to the selected Domain Owner's stream.</p>
          </div>

          <div className="grid grid-cols-2 gap-6">
            <AdminInput 
              label="Project Title" 
              icon={<Briefcase size={14}/>} 
              placeholder="e.g. Zulu Audio Transcription" 
              onChange={val => setJobData({...jobData, title: val})}
            />
            <AdminInput 
              label="Location" 
              icon={<MapPin size={14}/>} 
              placeholder="e.g. Remote / Kisumu" 
              onChange={val => setJobData({...jobData, location: val})}
            />
          </div>

          <div className="grid grid-cols-2 gap-6">
            <AdminInput 
              label="Pay Rate" 
              icon={<DollarSign size={14}/>} 
              placeholder="e.g. KSh 200 / Entry" 
              onChange={val => setJobData({...jobData, compensation: val})}
            />
            <AdminInput 
              label="Timeline" 
              icon={<Clock size={14}/>} 
              placeholder="e.g. 4 Weeks" 
              onChange={val => setJobData({...jobData, duration: val})}
            />
          </div>

          <div className="space-y-3">
            <label className="flex items-center gap-2 text-[10px] font-black text-slate-400 uppercase tracking-widest">
              <FileText size={14}/> Skills Required (Comma Separated)
            </label>
            <input 
              required
              className="admin-input-field w-full"
              placeholder="Luhya Dialect, Fast Typing, Audio Recording..."
              onChange={e => setJobData({...jobData, required_skills: e.target.value})}
            />
          </div>

          <div className="space-y-3">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Job Brief & Instructions</label>
            <textarea 
              required
              rows="4"
              className="admin-input-field w-full resize-none"
              placeholder="Detail the data collection requirements..."
              onChange={e => setJobData({...jobData, description: e.target.value})}
            />
          </div>
        </form>

        {/* Footer Actions */}
        <footer className="p-8 bg-slate-50 border-t border-slate-100 flex justify-end gap-4">
          <button type="button" onClick={onClose} className="px-6 py-3 text-slate-400 font-black hover:text-slate-600 transition-colors">
            Discard
          </button>
          <button 
            type="submit"
            onClick={handleSubmit}
            className="px-10 py-4 bg-slate-900 text-white font-black rounded-2xl hover:bg-[#489c8c] transition-all shadow-xl active:scale-95"
          >
            Deploy to Careers Page
          </button>
        </footer>
      </div>
    </div>
  );
};

const AdminInput = ({ label, icon, placeholder, onChange }) => (
  <div className="space-y-3">
    <label className="flex items-center gap-2 text-[10px] font-black text-slate-400 uppercase tracking-widest">
      {icon} {label}
    </label>
    <input 
      required
      className="admin-input-field w-full"
      placeholder={placeholder}
      onChange={e => onChange(e.target.value)}
    />
  </div>
);

export default JobPostModal;