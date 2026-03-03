import React, { useState, useEffect } from 'react';
import {
  Users, Briefcase, CheckCircle, XCircle,
  Plus, Globe, X, Mail, FileText, Award,
  Calendar, User, Settings, LayoutGrid, Save,
  Search, ExternalLink, Trash2
} from 'lucide-react';

import ApplicantModal from '../components/ApplicantModal';
import TemplateManager from '../components/TemplateManager';
import JobPostModal from '../components/JobPostModal';
import ApplicationsTable from '../components/ApplicationsTable';
import JobsTable from '../components/JobsTable';

const AdminDashboard = () => {
  const [activeTab, setActiveTab] = useState('applications');
  const [applications, setApplications] = useState([]);
  const [jobs, setJobs] = useState([]);
  const [domains, setDomains] = useState([]);
  const [selectedDomain, setSelectedDomain] = useState('all');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedApp, setSelectedApp] = useState(null);
  const [isJobModalOpen, setIsJobModalOpen] = useState(false);

  const token = localStorage.getItem('token');

  useEffect(() => {
    fetchInitialData();
  }, [activeTab]);

  const fetchInitialData = async () => {
    if (!token) {
      setError("No authentication token found. Please log in again.");
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // 1. Fetch All Domains
      const domRes = await fetch('http://localhost:8000/api/admin/all-domains', {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (!domRes.ok) {
        const errData = await domRes.json();
        throw new Error(errData.error || `HTTP ${domRes.status}`);
      }

      const domData = await domRes.json();
      console.log("Domains response:", domData); // ← debug
      setDomains(domData || []);

      // 2. Tab-specific data
      if (activeTab === 'applications') {
        const res = await fetch('http://localhost:8000/api/admin/applications', {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!res.ok) throw new Error(await res.json().error || 'Failed to load applications');
        const data = await res.json();
        setApplications(data.applications || []);
      }

      if (activeTab === 'jobs') {
        const res = await fetch('http://localhost:8000/api/admin/jobs', {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!res.ok) throw new Error(await res.json().error || 'Failed to load jobs');
        const data = await res.json();
        setJobs(data.jobs || []);
      }
    } catch (err) {
      console.error("Dashboard fetch error:", err);
      setError(err.message || "Failed to load dashboard data");
    } finally {
      setLoading(false);
    }
  };

  const handlePublishJob = async (jobData) => {
    try {
      const res = await fetch('http://localhost:8000/api/admin/jobs', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(jobData)
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'Failed to publish job');
      }

      alert("Job successfully posted to the public portal!");
      setIsJobModalOpen(false);
      fetchInitialData();
    } catch (err) {
      alert(`Failed to publish job: ${err.message}`);
    }
  };

  const handleApprove = async (appId) => {
    try {
      const res = await fetch(`http://localhost:8000/api/admin/applications/${appId}/approve`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ approval_notes: "Approved via Admin Dashboard" })
      });

      if (!res.ok) throw new Error('Failed to approve');
      alert("Application approved!");
      setSelectedApp(null);
      fetchInitialData();
    } catch (err) {
      alert(`Approval failed: ${err.message}`);
    }
  };

  const handleReject = async (appId) => {
    if (!window.confirm("Reject this application?")) return;
    try {
      const res = await fetch(`http://localhost:8000/api/admin/applications/${appId}/reject`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!res.ok) throw new Error('Failed to reject');
      alert("Application rejected.");
      setSelectedApp(null);
      fetchInitialData();
    } catch (err) {
      alert(`Rejection failed: ${err.message}`);
    }
  };

  const filteredApplications = selectedDomain === 'all'
    ? applications
    : applications.filter(app => app.domain_id === parseInt(selectedDomain));

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Sidebar */}
      <aside className="w-64 bg-slate-900 text-white p-6 flex flex-col fixed h-full z-40 overflow-y-auto">
        <div className="mb-10 px-4">
          <h2 className="text-2xl font-black text-emerald-400 tracking-tighter italic">SemaAdmin</h2>
          <p className="text-xs text-slate-500 font-bold uppercase tracking-widest mt-1">SuperAdmin Panel</p>
        </div>

        <nav className="space-y-1 flex-1">
          <NavBtn active={activeTab === 'applications'} icon={<Users size={18}/>} label="Review Queue" onClick={() => setActiveTab('applications')} />
          <NavBtn active={activeTab === 'jobs'} icon={<Briefcase size={18}/>} label="Job Postings" onClick={() => setActiveTab('jobs')} />
          <NavBtn active={activeTab === 'domains'} icon={<Globe size={18}/>} label="Domain Clients" onClick={() => setActiveTab('domains')} />
          <div className="pt-8">
            <p className="text-xs font-black text-slate-500 uppercase px-4 mb-2 tracking-widest">System</p>
            <NavBtn active={activeTab === 'templates'} icon={<Mail size={18}/>} label="Email Templates" onClick={() => setActiveTab('templates')} />
          </div>
        </nav>
      </aside>

      {/* Main Content */}
      <main className="flex-1 ml-64 p-8 md:p-10">
        <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-10 gap-4">
          <h1 className="text-3xl font-black text-slate-900 uppercase tracking-tight capitalize">
            {activeTab.replace('-', ' ')}
          </h1>

          <div className="flex flex-wrap items-center gap-4">
            {activeTab === 'jobs' && (
              <button
                onClick={() => setIsJobModalOpen(true)}
                className="flex items-center gap-2 px-6 py-2.5 bg-slate-900 text-white rounded-xl font-bold hover:bg-emerald-600 transition-all shadow-lg"
              >
                <Plus size={18} /> New Job Posting
              </button>
            )}

            {(activeTab === 'applications' || activeTab === 'jobs') && domains.length > 0 && (
              <div className="flex items-center gap-2 px-4 py-2 bg-white rounded-xl border border-slate-200 shadow-sm">
                <Globe size={16} className="text-slate-500" />
                <select
                  className="bg-transparent font-medium text-slate-700 outline-none text-sm cursor-pointer"
                  value={selectedDomain}
                  onChange={(e) => setSelectedDomain(e.target.value)}
                >
                  <option value="all">All Domains</option>
                  {domains.map(d => (
                    <option key={d.id} value={d.id}>{d.name}</option>
                  ))}
                </select>
              </div>
            )}
          </div>
        </header>

        {/* Error Message */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 text-red-700 rounded-xl">
            {error}
          </div>
        )}

        {/* Tab Content */}
        {loading ? (
          <div className="py-20 text-center animate-pulse text-slate-400 font-medium">
            Loading dashboard data...
          </div>
        ) : (
          <div className="w-full">
            {activeTab === 'applications' && (
              <ApplicationsTable
                data={filteredApplications}
                onView={setSelectedApp}
                onApprove={handleApprove}
                onReject={handleReject}
              />
            )}

            {activeTab === 'jobs' && (
              <JobsTable jobs={jobs} onDelete={(id) => console.log("Delete job", id)} />
            )}

            {activeTab === 'domains' && (
              <DomainsTable domains={domains} />
            )}

            {activeTab === 'templates' && <TemplateManager />}
          </div>
        )}

        {/* Modals */}
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

// ─── Nav Button Component ───
const NavBtn = ({ active, icon, label, onClick }) => (
  <button
    onClick={onClick}
    className={`w-full flex items-center gap-3 px-5 py-3.5 rounded-xl font-medium transition-all ${
      active
        ? 'bg-emerald-500 text-white shadow-lg'
        : 'text-slate-300 hover:bg-slate-800 hover:text-white'
    }`}
  >
    {icon} {label}
  </button>
);

// ─── Domains Table ───
const DomainsTable = ({ domains }) => {
  if (domains.length === 0) {
    return (
      <div className="py-20 text-center bg-white rounded-3xl border border-dashed border-slate-200">
        <Globe className="mx-auto text-slate-300 mb-4" size={64} />
        <h3 className="text-xl font-bold text-slate-600 mb-2">No Domains Registered Yet</h3>
        <p className="text-slate-500">Domain owners will appear here once they complete registration and payment.</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
      <table className="w-full text-left">
        <thead className="bg-slate-50 border-b border-slate-100">
          <tr>
            <th className="px-6 py-4 text-xs font-black text-slate-500 uppercase tracking-wider">Domain Name</th>
            <th className="px-6 py-4 text-xs font-black text-slate-500 uppercase tracking-wider">Reference Code</th>
            <th className="px-6 py-4 text-xs font-black text-slate-500 uppercase tracking-wider">Payment Status</th>
            <th className="px-6 py-4 text-xs font-black text-slate-500 uppercase tracking-wider text-right">Target Goal</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-50">
          {domains.map(d => (
            <tr key={d.id} className="hover:bg-slate-50 transition-colors">
              <td className="px-6 py-5">
                <p className="font-bold text-slate-800">{d.name || 'Unnamed Domain'}</p>
                <p className="text-xs text-slate-500 mt-1">ID: {d.id}</p>
              </td>
              <td className="px-6 py-5">
                <code className="px-2 py-1 bg-slate-100 rounded text-xs font-mono text-slate-600">
                  {d.reference_number || 'N/A'}
                </code>
              </td>
              <td className="px-6 py-5">
                <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${
                  d.status?.toLowerCase() === 'success' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
                }`}>
                  {d.status || 'Unknown'}
                </span>
              </td>
              <td className="px-6 py-5 text-right font-bold text-slate-700">
                {d.target || 0} <span className="text-xs text-slate-500 font-normal">submissions</span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

// Keep your existing ApplicationsTable, JobsTable, NavBtn components as-is
// ... (or add similar improvements if needed)

export default AdminDashboard;