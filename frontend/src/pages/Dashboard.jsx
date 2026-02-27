import React, { useEffect, useState } from 'react';
import { LayoutDashboard, Database, Users, PlusCircle, Copy, ExternalLink, Activity, Globe, Download, Printer } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import './Dashboard.css';

// --- SUB-COMPONENT: INSIGHTS TABLE ---
const InsightsTable = ({ datasets, features }) => {
  if (!datasets || datasets.length === 0) {
    return (
      <div className="p-10 text-center bg-slate-50 rounded-3xl border border-dashed border-slate-200 mt-6">
        <p className="text-slate-400 font-medium">No datasets available for the selected domains.</p>
      </div>
    );
  }

  const handlePrint = () => window.print();

  return (
    <div className="bg-white rounded-3xl border border-slate-100 shadow-xl overflow-hidden mt-6">
      {/* Table Header with Actions */}
      <div className="p-6 border-b border-slate-50 flex justify-between items-center bg-white">
        <h3 className="text-lg font-bold text-slate-800">Linguistic Analysis Stream</h3>
        <div className="flex gap-2">
          <button className="flex items-center gap-2 px-4 py-2 text-sm font-bold text-slate-600 hover:bg-slate-50 rounded-xl transition">
            <Download size={16} /> Export CSV
          </button>
          <button onClick={handlePrint} className="flex items-center gap-2 px-4 py-2 text-sm font-bold bg-[#489c8c] text-white rounded-xl hover:bg-[#3d8577] transition shadow-md">
            <Printer size={16} /> Print Report
          </button>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left">
          <thead className="bg-slate-50 border-b border-slate-100">
            <tr>
              <th className="p-4 text-xs font-black text-slate-400 uppercase">Ref Number</th>
              {features.map(f => (
                <th key={f} className="p-4 text-xs font-black text-slate-400 uppercase">{f}</th>
              ))}
              <th className="p-4 text-xs font-black text-slate-400 uppercase">Status</th>
            </tr>
          </thead>
          <tbody>
            {datasets.map((d, idx) => (
              <tr key={idx} className="border-b border-slate-50 hover:bg-slate-50/50 transition">
                <td className="p-4 font-mono text-sm text-[#489c8c] font-bold">{d.ref_number}</td>
                {features.map(f => (
                  <td key={f} className="p-4 text-sm text-slate-600">
                    {d.segmented_text?.[f] || <span className="text-slate-300">---</span>}
                  </td>
                ))}
                <td className="p-4">
                  <span className={`px-3 py-1 rounded-full text-[10px] font-bold ${d.status === 'Processed' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>
                    {d.status?.toUpperCase() || 'PENDING'}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

// --- MAIN COMPONENT: DASHBOARD ---
const Dashboard = () => {
  const [domains, setDomains] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const ownerId = localStorage.getItem('ownerId') || localStorage.getItem('userId') || localStorage.getItem('owner_id');

  useEffect(() => {
    // If no owner ID, redirect to login
    if (!ownerId) {
      setError('Session expired. Please log in again.');
      setTimeout(() => navigate('/login'), 2000);
      return;
    }

    const fetchDomains = async () => {
      const token = localStorage.getItem('token');
 
      if (!token) {
        setError('No authentication token found. Please log in again.');
        navigate('/login');
        return;
      }

      try {
        const response = await fetch(`http://localhost:8000/api/my-domains`, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });

        if (response.status === 401 || response.status === 403) {
          setError('Authentication failed. Please log in again.');
          navigate('/login');
          return;
        }

        const data = await response.json();
        setDomains(data || []);
        setLoading(false);
      } catch (err) {
        console.error("Failed to fetch domains:", err);
        setError('Failed to load domains. Please check your connection.');
        setLoading(false);
      }
    };

    fetchDomains();
  }, [ownerId, navigate]);

  // AGGREGATION LOGIC: Flatten all datasets from all domains into one list
  const allDatasets = domains.flatMap(domain => domain.datasets || []);

  if (error) {
    return (
      <div className="p-20 text-center">
        <p className="text-red-600 font-bold mb-4">{error}</p>
        <p className="text-slate-500">Redirecting to login...</p>
      </div>
    );
  }

  if (loading) return <div className="p-20 text-center font-bold text-[#489c8c] animate-pulse">Initializing Command Center...</div>;

  return (
    <div className="dashboard-wrapper flex min-h-screen bg-slate-50">
      {/* --- SIDEBAR --- */}
      <aside className="sidebar w-64 bg-slate-900 text-white p-6 flex flex-col fixed h-full">
        <div className="brand-logo flex items-center gap-3 text-xl font-black mb-10 text-[#489c8c]">
          <Database size={32} /> semaData
        </div>
        
        <nav className="flex-1 space-y-2">
          <div className="nav-item active flex items-center gap-3 p-3 rounded-xl bg-[#489c8c] text-white font-bold cursor-pointer">
            <LayoutDashboard size={20} /> Dashboard
          </div>
          <div className="nav-item flex items-center gap-3 p-3 rounded-xl hover:bg-slate-800 text-slate-400 transition cursor-pointer">
            <Activity size={20} /> Data Analytics
          </div>
          <div className="nav-item flex items-center gap-3 p-3 rounded-xl hover:bg-slate-800 text-slate-400 transition cursor-pointer">
            <Users size={20} /> Team Collectors
          </div>
        </nav>

        <button 
          onClick={() => navigate('/DomainDefinition', { state: { owner_id: ownerId } })}
          className="bg-[#489c8c] hover:bg-[#3d8577] text-white p-4 rounded-2xl font-bold flex items-center justify-center gap-2 transition shadow-lg mt-auto"
        >
          <PlusCircle size={20} /> Create New Domain
        </button>
      </aside>

      {/* --- MAIN CONTENT --- */}
      <main className="flex-1 ml-64 p-10">
        <header className="flex justify-between items-center mb-10">
          <div>
            <h2 className="text-4xl font-black text-slate-900 tracking-tight">Command Center</h2>
            <p className="text-slate-500 font-medium">System Status: <span className="text-[#489c8c] animate-pulse">● Operational</span></p>
          </div>
          
          <div className="flex items-center gap-4 bg-white p-2 pr-6 rounded-2xl border border-slate-100 shadow-sm">
            <div className="w-12 h-12 bg-[#489c8c] rounded-xl flex items-center justify-center text-white font-black text-lg">DO</div>
            <div>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Administrator</p>
              <p className="text-sm font-bold text-slate-700">Domain Owner</p>
            </div>
          </div>
        </header>

        {/* --- STATS ROW --- */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
          <div className="bg-white p-8 rounded-[32px] border border-slate-100 shadow-sm hover:shadow-md transition">
            <p className="text-slate-400 font-bold text-xs uppercase mb-2">Active Tokens</p>
            <h4 className="text-3xl font-black text-slate-800">{domains.length}</h4>
          </div>
          <div className="bg-white p-8 rounded-[32px] border border-slate-100 shadow-sm hover:shadow-md transition">
            <p className="text-slate-400 font-bold text-xs uppercase mb-2">Total Submissions</p>
            <h4 className="text-3xl font-black text-slate-800">
              {domains.reduce((total, d) => total + (d.submission_count || 0), 0)}
            </h4>
          </div>
          <div className="bg-white p-8 rounded-[32px] border border-slate-100 shadow-sm hover:shadow-md transition">
            <p className="text-slate-400 font-bold text-xs uppercase mb-2">Team Collectors</p>
            <h4 className="text-3xl font-black text-slate-800">
              {domains.reduce((total, d) => total + (d.collector_count || 0), 0)}
            </h4>
          </div>
        </div>

        {/* --- PROJECT CARDS SECTION --- */}
        <h3 className="text-xl font-black text-slate-800 mb-6">Active Knowledge Domains</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {domains.map((domain, index) => (
            <div key={domain.reference_number} className="bg-white p-6 rounded-[32px] border border-slate-100 shadow-sm hover:shadow-xl transition-all group">
              <div className="flex justify-between items-start mb-6">
                <div className="p-3 bg-[#489c8c]/10 text-[#489c8c] rounded-2xl">
                  <Database size={24} />
                </div>
                <div className="bg-green-50 text-green-600 text-[10px] font-black px-2 py-1 rounded-lg uppercase tracking-tighter">Live Sync</div>
              </div>
              
              <h3 className="text-xl font-bold text-slate-900 mb-1">{domain.domain_name}</h3>
              <p className="text-sm text-slate-400 mb-6 font-medium">{domain.domain_field || 'General Research'}</p>
              
              <div className="bg-slate-50 p-4 rounded-2xl flex justify-between items-center border border-slate-100">
                <div className="overflow-hidden">
                  <p className="text-[9px] uppercase font-black text-slate-400">Security Token</p>
                  <p className="font-mono text-xs font-bold text-slate-600 truncate">{domain.reference_number}</p>
                </div>
                <button onClick={() => {navigator.clipboard.writeText(domain.reference_number); alert("Token Copied!");}} className="p-2 hover:bg-white rounded-lg transition text-slate-400 hover:text-[#489c8c]">
                  <Copy size={16} />
                </button>
              </div>

              <button className="w-full mt-4 py-3 flex items-center justify-center gap-2 text-xs font-black uppercase text-slate-500 hover:text-[#489c8c] transition group">
                Enter Stream <ExternalLink size={14} className="group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />
              </button>
            </div>
          ))}
        </div>

        {/* --- DATASET INSIGHTS SECTION (Outside the Loop) --- */}
        <div className="mt-20 mb-20">
          <header className="mb-2">
            <h3 className="text-2xl font-black text-slate-800">Dataset Intelligence</h3>
            <p className="text-slate-500 text-sm font-medium">Aggregated NLP segmentation from the SemaData Inference Engine.</p>
          </header>
          
          <InsightsTable 
            datasets={allDatasets} 
            features={['Keyword', 'Sentiment', 'Dialect_Marker']} 
          />
        </div>
      </main>
    </div>
  );
};

export default Dashboard;