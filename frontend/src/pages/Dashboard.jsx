import React, { useEffect, useState } from 'react';
import { LayoutDashboard, Database, Users, PlusCircle, Copy, ExternalLink, Activity, Globe } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import './Dashboard.css'; // Ensure you import the CSS file here

 const InsightsTable = ({ datasets, features }) => {
 if (!datasets || datasets.length === 0) return null;

return (
  <div className="bg-white rounded-3xl border border-slate-100 shadow-xl overflow-hidden mt-6">
    <table className="w-full text-left">
      <thead className="bg-slate-50 border-b border-slate-100">
        <tr>
          <th className="p-4 text-xs font-black text-slate-400 uppercase">Ref Number</th>
          {/* Dynamically create columns based on the NLP Features */}
          {features.map(f => (
            <th key={f} className="p-4 text-xs font-black text-slate-400 uppercase">{f}</th>
          ))}
          <th className="p-4 text-xs font-black text-slate-400 uppercase">Status</th>
        </tr>
      </thead>
      <tbody>
        {datasets.map(d => (
          <tr key={d.id} className="border-b border-slate-50 hover:bg-slate-50/50 transition">
            <td className="p-4 font-mono text-sm text-[#489c8c]">{d.ref_number}</td>
            {features.map(f => (
              <td key={f} className="p-4 text-sm text-slate-600">
                {d.segmented_text[f] === "Not Mentioned" ? 
                  <span className="text-slate-300">---</span> : 
                  d.segmented_text[f]}
              </td>
            ))}
            <td className="p-4">
              <span className={`px-2 py-1 rounded-md text-[10px] font-bold ${d.status === 'Processed' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>
                {d.status.toUpperCase()}
              </span>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  </div>
);
};

const Dashboard = () => {
  const [domains, setDomains] = useState([]);
  const [loading, setLoading] = useState(true);

  const navigate = useNavigate();

  const ownerId = localStorage.getItem('owner_id'); 

  useEffect(() => {
    const fetchDomains = async () => {
      try {
        const response = await fetch(`http://localhost:8000/api/my-domains/${ownerId}`);
        const data = await response.json();
        setDomains(data);
        setLoading(false);
      } catch (err) {
        console.error("Failed to fetch domains");
        setLoading(false);
      }
    };
    if (ownerId) fetchDomains();
  }, [ownerId]);



  return (
    <div className="dashboard-wrapper">
      {/* --- SIDEBAR --- */}
      <aside className="sidebar">
        <div className="brand-logo">
          <Database size={32} /> semaData
        </div>
        
        <nav className="flex-1">
          <div className="nav-item active">
            <LayoutDashboard size={20} /> Dashboard
          </div>
          <div className="nav-item">
            <Activity size={20} /> Data Analytics
          </div>
          <div className="nav-item">
            <Users size={20} /> Team Collectors
          </div>
          <div className="nav-item">
            <Globe size={20} /> Global Sync
          </div>
        </nav>

        <button 
          onClick={() => navigate('/DomainDefinition', { state: { owner_id: ownerId } })}
          className="finalize-btn" // Reusing your high-quality green button style
          style={{ marginTop: 'auto' }}
        >
          <PlusCircle size={20} /> Create New Domain
        </button>
      </aside>

      {/* --- MAIN CONTENT --- */}
      <main className="flex-1 p-10 overflow-y-auto">
        <header className="flex justify-between items-center mb-10">
          <div>
            <h2 className="text-3xl font-black text-slate-900">Command Center</h2>
            <p className="text-slate-500">System Status: <span className="text-[#489c8c] font-bold">Operational</span></p>
          </div>
          
          <div className="flex items-center gap-4 bg-white p-2 pr-6 rounded-full border border-slate-100 shadow-sm">
            <div className="w-10 h-10 bg-[#489c8c] rounded-full flex items-center justify-center text-white font-bold">
              DO
            </div>
            <div>
              <p className="text-xs font-black text-slate-400 uppercase">Administrator</p>
              <p className="text-sm font-bold text-slate-700">Domain Owner</p>
            </div>
          </div>
        </header>

        {/* --- INNOVATION STATS ROW --- */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
          <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
            <p className="text-slate-400 font-bold text-xs uppercase mb-1">Active Tokens</p>
            <h4 className="text-2xl font-black text-slate-800">{domains.length}</h4>
          </div>
          <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
            <p className="text-slate-400 font-bold text-xs uppercase mb-1">Total Submissions</p>
            <h4 className="text-2xl font-black text-slate-800">{domains.reduce((total, domain) => total + domain.submission_count, 0)}</h4>
          </div>
          <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
            <p className="text-slate-400 font-bold text-xs uppercase mb-1">Number of data collectors</p>
            <h4 className="text-2xl font-black text-slate-800">{domains.reduce((total, domain) => total + (domain.collector_count || 0), 0)}</h4>
          </div>
        </div>
        {/* --- PROJECT CARDS --- */}
        <div className="domain-grid">
          {domains.map((domain, index) => (
            <div 
              key={domain.reference_number} 
              className="project-card animate-card" 
              style={{ animationDelay: `${index * 0.1}s` }}
            >
              <div className="status-badge">
                <span className="inline-block w-2 h-2 bg-green-500 rounded-full mr-2 animate-pulse"></span>
                Live Sync
              </div>
              
              <div className="p-3 bg-slate-50 rounded-2xl text-[#489c8c] w-fit mb-4">
                <Database size={24} />
              </div>
              
              <h3 className="text-xl font-bold text-slate-900">{domain.domain_name}</h3>
              <p className="text-sm text-slate-500 mb-6">Vertical: {domain.domain_field || 'Research'}</p>
              
              <div className="token-vault">
                <div>
                  <p className="text-[10px] uppercase font-black text-slate-400">Project Token</p>
                  <p className="token-text">{domain.reference_number}</p>
                </div>
                <button 
                  onClick={() => {
                    navigator.clipboard.writeText(domain.reference_number);
                    alert("Token copied to clipboard!");
                  }}
                  className="copy-icon-btn"
                >
                  <Copy size={18} />
                </button>
              </div>

              <button className="w-full flex items-center justify-center gap-2 text-sm font-bold text-slate-600 hover:text-[#489c8c] transition mt-4 group">
                Enter Data Stream 
                <ExternalLink size={14} className="group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />
              </button>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
};

export default Dashboard;