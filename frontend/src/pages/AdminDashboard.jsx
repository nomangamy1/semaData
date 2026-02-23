import React, { useState, useEffect } from 'react';
import { 
  Users, Briefcase, CheckCircle, XCircle, 
  Plus, Globe, X, Mail, FileText, Award, 
  Calendar, User, Settings, LayoutGrid, Save,
  Search, ExternalLink, Trash2
} from 'lucide-react';

// Sub-components
import ApplicantModal from '../components/ApplicantModal'; 
import TemplateManager from '../components/TemplateManager';
import JobPostModal from '../components/JobPostModal'; // Newly Created

const AdminDashboard = () => {
  const [activeTab, setActiveTab] = useState('applications');
  const [applications, setApplications] = useState([]);
  const [jobs, setJobs] = useState([]);
  const [domains, setDomains] = useState([]);
  const [selectedDomain, setSelectedDomain] = useState('all');
  const [loading, setLoading] = useState(true);
  const [selectedApp, setSelectedApp] = useState(null);
  
  // Modal State
  const [isJobModalOpen, setIsJobModalOpen] = useState(false);

  useEffect(() => { fetchInitialData(); }, [activeTab]);

  const fetchInitialData = async () => {
    setLoading(true);
    const token = localStorage.getItem('token');
    try {
      // Always fetch domains as they are needed for filtering and modals
      const domRes = await fetch('http://localhost:8000/api/domains', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const domData = await domRes.json();
      setDomains(domData || []);

      if (activeTab === 'applications') {
        const res = await fetch('http://localhost:8000/api/admin/applications', {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await res.json();
        setApplications(data.applications || []);
      } 
      
      if (activeTab === 'jobs') {
        const res = await fetch('http://localhost:8000/api/admin/jobs', {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await res.json();
        setJobs(data.jobs || []);
      }
    } catch (err) { 
      console.error("Fetch Error:", err); 
    } finally { 
      setLoading(false); 
    }
  };

  // --- ACTIONS ---
  const handlePublishJob = async (jobData) => {
    const token = localStorage.getItem('token');
    try {
      const res = await fetch('http://localhost:8000/api/admin/jobs/create', {
        method: 'POST',
        headers: { 
          'Authorization': `Bearer ${token}`, 
          'Content-Type': 'application/json' 
        },
        body: JSON.stringify(jobData)
      });

      if (res.ok) {
        alert("Job successfully deployed to the public portal!");
        setIsJobModalOpen(false);
        fetchInitialData(); 
      }
    } catch (err) {
      alert("Failed to publish job. Check console.");
    }
  };

  const handleApprove = async (appId) => {
    const token = localStorage.getItem('token');
    const res = await fetch(`http://localhost:8000/api/admin/applications/${appId}/approve`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ approval_notes: "Vetted via SuperAdmin Dashboard" })
    });
    if (res.ok) {
      const result = await res.json();
      alert(`Approved! Collector Ref: ${result.reference_number}`);
      setSelectedApp(null);
      fetchInitialData();
    }
  };

  const handleReject = async (appId) => {
    if (!window.confirm("Reject this applicant?")) return;
    const token = localStorage.getItem('token');
    const res = await fetch(`http://localhost:8000/api/admin/applications/${appId}/reject`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' }
    });
    if (res.ok) {
      alert("Application Rejected and email notification sent.");
      setSelectedApp(null);
      fetchInitialData();
    }
  };

  const filteredApplications = selectedDomain === 'all' 
    ? applications 
    : applications.filter(app => app.domain_id === parseInt(selectedDomain));

  return (
    <div className="min-h-screen bg-[#f8fafc] flex">
      {/* --- SIDEBAR --- */}
      <aside className="w-64 bg-slate-900 text-white p-6 flex flex-col fixed h-full z-40">
        <div className="mb-10 px-4">
          <h2 className="text-2xl font-black text-emerald-400 tracking-tighter italic">SemaAdmin</h2>
          <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-1">SuperAdmin v2.1</p>
        </div>
        <nav className="space-y-1 flex-1">
          <NavBtn active={activeTab === 'applications'} icon={<Users size={18}/>} label="Review Queue" onClick={() => setActiveTab('applications')} />
          <NavBtn active={activeTab === 'jobs'} icon={<Briefcase size={18}/>} label="Job Postings" onClick={() => setActiveTab('jobs')} />
          <NavBtn active={activeTab === 'domains'} icon={<Globe size={18}/>} label="Domain Clients" onClick={() => setActiveTab('domains')} />
          <div className="pt-8">
            <p className="text-[10px] font-black text-slate-500 uppercase px-4 mb-2 tracking-widest">System Control</p>
            <NavBtn active={activeTab === 'templates'} icon={<Mail size={18}/>} label="Email Templates" onClick={() => setActiveTab('templates')} />
          </div>
        </nav>
      </aside>

      {/* --- MAIN CONTENT --- */}
      <main className="flex-1 ml-64 p-10 relative">
        <header className="flex justify-between items-center mb-10">
          <h1 className="text-3xl font-black text-slate-900 uppercase tracking-tight">{activeTab.replace('-', ' ')}</h1>
          
          <div className="flex items-center gap-4">
            {activeTab === 'jobs' && (
              <button 
                onClick={() => setIsJobModalOpen(true)}
                className="flex items-center gap-2 px-6 py-2.5 bg-slate-900 text-white rounded-2xl font-bold hover:bg-emerald-500 transition-all shadow-lg shadow-slate-200"
              >
                <Plus size={18} /> New Posting
              </button>
            )}

            {(activeTab === 'applications' || activeTab === 'jobs') && (
               <div className="flex items-center gap-2 px-4 py-2 bg-white rounded-2xl border border-slate-200 shadow-sm">
                <Globe size={16} className="text-slate-400" />
                <select className="bg-transparent font-bold text-slate-700 outline-none text-sm cursor-pointer" value={selectedDomain} onChange={(e) => setSelectedDomain(e.target.value)}>
                  <option value="all">Filter by Domain</option>
                  {domains.map(d => <option key={d.id} value={d.id}>{d.domain_name}</option>)}
                </select>
              </div>
            )}
          </div>
        </header>

        <div className="w-full">
          {activeTab === 'applications' && (
            <ApplicationsTable 
              loading={loading} 
              data={filteredApplications} 
              onView={(app) => setSelectedApp(app)}
              onApprove={handleApprove}
              onReject={handleReject}
            />
          )}

          {activeTab === 'jobs' && (
            <JobsTable 
              loading={loading} 
              jobs={jobs} 
              onDelete={(id) => console.log("Delete job", id)} 
            />
          )}

          {activeTab === 'templates' && <TemplateManager />}
        </div>

        {/* --- MODALS --- */}
        <JobPostModal 
          isOpen={isJobModalOpen} 
          onClose={() => setIsJobModalOpen(false)}
          domains={domains}
          onPublish={handlePublishJob}
        />

        {selectedApp && (
          <ApplicantModal 
            applicant={selectedApp} 
            onClose={() => setSelectedApp(null)} 
            onApprove={handleApprove}
            onReject={handleReject}
          />
        )}
      </main>
    </div>
  );
};

// --- SUB-COMPONENT: JOBS TABLE ---
const JobsTable = ({ loading, jobs, onDelete }) => {
  if (loading) return <div className="py-20 text-center animate-pulse font-bold text-slate-400">Syncing Career Portal...</div>;
  
  return (
    <div className="bg-white rounded-[32px] border border-slate-100 shadow-sm overflow-hidden">
      <table className="w-full text-left">
        <thead className="bg-slate-50/50 border-b border-slate-100">
          <tr>
            <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Active Posting</th>
            <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Linked Domain</th>
            <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Location/Pay</th>
            <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Action</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-50">
          {jobs.map(job => (
            <tr key={job.id} className="hover:bg-slate-50/50 transition-colors">
              <td className="px-6 py-5">
                <p className="font-bold text-slate-800">{job.title}</p>
                <p className="text-[10px] text-slate-400 font-bold uppercase">{job.field}</p>
              </td>
              <td className="px-6 py-5">
                <span className="px-3 py-1 bg-emerald-50 text-emerald-600 rounded-lg text-[10px] font-black uppercase tracking-tighter">
                  {job.domain_name}
                </span>
              </td>
              <td className="px-6 py-5">
                <p className="text-xs font-bold text-slate-600">{job.location}</p>
                <p className="text-xs text-emerald-500 font-bold">{job.compensation}</p>
              </td>
              <td className="px-6 py-5 text-right">
                <button onClick={() => onDelete(job.id)} className="p-2 text-slate-300 hover:text-rose-500 transition-colors">
                  <Trash2 size={18} />
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

// --- REUSABLE COMPONENTS ---
const ApplicationsTable = ({ loading, data, onView, onApprove, onReject }) => {
  if (loading) return <div className="py-20 text-center animate-pulse font-bold text-slate-400">Fetching Applications...</div>;
  return (
    <div className="bg-white rounded-[32px] border border-slate-100 shadow-sm overflow-hidden">
      <table className="w-full text-left">
        <thead className="bg-slate-50/50 border-b border-slate-100">
          <tr>
            <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Applicant</th>
            <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Target Job</th>
            <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-50">
          {data.map(app => (
            <tr key={app.id} onClick={() => onView(app)} className="hover:bg-slate-50/80 transition-colors group cursor-pointer">
              <td className="px-6 py-5">
                <p className="font-bold text-slate-800">{app.first_name} {app.second_name}</p>
                <p className="text-xs text-slate-400">{app.email}</p>
              </td>
              <td className="px-6 py-5">
                <p className="text-sm font-bold text-slate-600">{app.job_title}</p>
                <p className="text-[10px] text-emerald-500 font-black uppercase tracking-tighter">{app.domain_name}</p>
              </td>
              <td className="px-6 py-5 text-right space-x-2">
                <button onClick={(e) => { e.stopPropagation(); onApprove(app.id); }} className="p-2 bg-emerald-50 text-emerald-600 rounded-xl hover:bg-emerald-500 hover:text-white transition-all"><CheckCircle size={18} /></button>
                <button onClick={(e) => { e.stopPropagation(); onReject(app.id); }} className="p-2 bg-rose-50 text-rose-600 rounded-xl hover:bg-rose-500 hover:text-white transition-all"><XCircle size={18} /></button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

const NavBtn = ({ active, icon, label, onClick }) => (
  <button onClick={onClick} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-bold transition-all ${active ? 'bg-emerald-500 text-slate-900 shadow-lg' : 'hover:bg-white/5 text-slate-400 hover:text-white'}`}>
    {icon} {label}
  </button>
);

export default AdminDashboard;