import React, { useState } from 'react';
import { Save, Mail, AlertCircle } from 'lucide-react';
// Ensure this filename matches your utils folder exactly!
import { parseEmailTemplate } from '../utils/email_parser'; 

import './TemplateManager.css';

const TemplateManager = () => {
  const [activeTemplate, setActiveTemplate] = useState('welcome');
  const [templates, setTemplates] = useState({
    welcome: "Dear {{first_name}},\n\nCongratulations! You have been approved for the {{job_title}} project. Your reference is {{ref_number}}.",
    rejection: "Hi {{first_name}},\n\nUnfortunately, we've moved forward with other candidates. Reason: {{reason}}"
  });

  const insertTag = (tag) => {
    setTemplates({ ...templates, [activeTemplate]: templates[activeTemplate] + ` {{${tag}}}` });
  };

  const previewData = {
    first_name: "John",
    job_title: "Linguistic Annotator",
    ref_number: "REF-12345",
    domain_name: "SemaData Tech",
    reason: "Linguistic assessment score below 80%." // Added this for the preview
  };

  return (
    <div className="template-grid animate-in">
      {/* Left Sidebar */}
      <div className="template-list">
        <div 
          className={`template-item ${activeTemplate === 'welcome' ? 'active' : ''}`} 
          onClick={() => setActiveTemplate('welcome')}
        >
          <h4 className="font-black text-sm">Approval Email</h4>
          <p className="text-[10px] text-slate-400">Sent on acceptance</p>
        </div>
        <div 
          className={`template-item ${activeTemplate === 'rejection' ? 'active' : ''}`} 
          onClick={() => setActiveTemplate('rejection')}
        >
          <h4 className="font-black text-sm">Rejection Email</h4>
          <p className="text-[10px] text-slate-400">Sent on denial</p>
        </div>

        {/* Live Preview Box */}
        <div className="mt-10 p-5 bg-slate-900 rounded-[2rem] text-white shadow-xl">
          <p className="text-[10px] font-black text-emerald-400 mb-3 uppercase tracking-widest">Live Preview</p>
          <div className="text-xs italic text-slate-300 leading-relaxed whitespace-pre-wrap">
             {parseEmailTemplate(templates[activeTemplate], previewData)}
          </div>
        </div>
      </div>

      {/* Main Editor Surface */}
      <div className="editor-surface">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-lg font-black italic flex items-center gap-2 text-slate-800">
            <Mail size={18} className="text-emerald-500" /> EMAIL EDITOR
          </h3>
          <button className="bg-slate-900 text-white px-6 py-2 rounded-xl font-bold hover:bg-emerald-500 transition-all flex items-center gap-2 shadow-lg shadow-slate-200">
            <Save size={16} /> Save Changes
          </button>
        </div>

        <div className="tag-container">
          <span className="text-[9px] font-black text-slate-400 uppercase mr-2">Tags:</span>
          {['first_name', 'job_title', 'ref_number', 'reason'].map(tag => (
            <button key={tag} onClick={() => insertTag(tag)} className="tag-badge">
              + {tag}
            </button>
          ))}
        </div>

        <textarea 
          className="email-textarea"
          value={templates[activeTemplate]}
          onChange={(e) => setTemplates({...templates, [activeTemplate]: e.target.value})}
        />
        
        <div className="mt-4 flex items-center gap-2 text-slate-400 text-[10px] font-bold italic">
          <AlertCircle size={14}/> Note: Server-side parsing will be applied before sending.
        </div>
      </div>
    </div>
  );
};

export default TemplateManager;