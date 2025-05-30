import React, { useState, useEffect, useCallback } from "react";
import {
  Users, Briefcase, CheckCircle, XCircle,
  Plus, Globe, RefreshCw, Mail,
  ExternalLink, Trash2, Eye, AlertCircle
} from "lucide-react";
import "./AdminDashboard.css";
import ApplicantModal  from "../components/ApplicantModal";
import TemplateManager from "../components/TemplateManager";
import JobPostModal    from "../components/JobPostModal";

const AdminDashboard = () => {
  const [activeTab,      setActiveTab]      = useState("applications");
  const [applications,   setApplications]   = useState([]);
  const [jobs,           setJobs]           = useState([]);
  const [domains,        setDomains]        = useState([]);
  const [selectedDomain, setSelectedDomain] = useState("all");
  const [loading,        setLoading]        = useState(true);
  const [error,          setError]          = useState(null);
  const [selectedApp,    setSelectedApp]    = useState(null);
  const [isJobModalOpen, setIsJobModalOpen] = useState(false);

  const token = localStorage.getItem("token");

  const fetchDomains = useCallback(async () => {
    try {
      const res  = await fetch("http://localhost:8000/api/admin/all-domains", {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setDomains(await res.json() || []);
    } catch (err) {
      console.error("Failed to load domains:", err);
    }
  }, [token]);

  const fetchTabData = useCallback(async () => {
    if (!token) {
      setError("Session expired. Redirecting...");
      setTimeout(() => window.location.href = "/login", 2000);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      if (activeTab === "applications") {
        const res  = await fetch("http://localhost:8000/api/admin/applications", {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (!res.ok) throw new Error("Failed to load applications");
        const data = await res.json();
        setApplications(data.applications || []);
      }
      if (activeTab === "jobs") {
        const res  = await fetch("http://localhost:8000/api/admin/jobs", {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (!res.ok) throw new Error("Failed to load jobs");
        const data = await res.json();
        setJobs(data.jobs || []);
      }
    } catch (err) {
      setError(err.message || "Failed to load data");
    } finally {
      setLoading(false);
    }
  }, [activeTab, token]);

  useEffect(() => { fetchDomains(); }, [fetchDomains]);
  useEffect(() => { fetchTabData(); }, [fetchTabData]);

  const handlePublishJob = async (jobData) => {
    try {
      const res = await fetch("http://localhost:8000/api/admin/jobs", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify(jobData)
      });
      if (!res.ok) { const e = await res.json(); throw new Error(e.error || "Failed"); }
      alert("Job successfully posted!");
      setIsJobModalOpen(false);
      fetchTabData();
    } catch (err) { alert(`Failed: ${err.message}`); }
  };

  const handleApprove = async (appId) => {
    try {
      const res = await fetch(`http://localhost:8000/api/admin/applications/${appId}/approve`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ approval_notes: "Approved via Admin Dashboard" })
      });
      if (!res.ok) throw new Error("Failed to approve");
      alert("Application approved! Reference number sent to applicant.");
      setSelectedApp(null);
      fetchTabData();
    } catch (err) { alert(`Approval failed: ${err.message}`); }
  };

  const handleReject = async (appId) => {
    if (!window.confirm("Reject this application?")) return;
    try {
      const res = await fetch(`http://localhost:8000/api/admin/applications/${appId}/reject`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" }
      });
      if (!res.ok) throw new Error("Failed to reject");
      alert("Application rejected.");
      setSelectedApp(null);
      fetchTabData();
    } catch (err) { alert(`Rejection failed: ${err.message}`); }
  };

  const filteredApplications = selectedDomain === "all"
    ? applications
    : applications.filter(app => app.domain_name === domains.find(d => d.id === parseInt(selectedDomain))?.name);

  return (
    <div className="admin-root min-h-screen bg-gray-50 flex">
      <aside className="w-64 bg-slate-900 text-white p-6 flex flex-col fixed h-full z-40 overflow-y-auto">
        <div className="mb-10 px-4">
          <h2 className="sidebar-logo-text text-2xl font-black tracking-tighter italic">SemaAdmin</h2>
          <p className="text-xs text-slate-500 font-bold uppercase tracking-widest mt-1">SuperAdmin Panel</p>
        </div>
        <nav className="space-y-1 flex-1">
          <NavBtn active={activeTab === "applications"} icon={<Users size={18}/>}    label="Review Queue"   onClick={() => setActiveTab("applications")} />
          <NavBtn active={activeTab === "jobs"}         icon={<Briefcase size={18}/>} label="Job Postings"   onClick={() => setActiveTab("jobs")} />
          <NavBtn active={activeTab === "domains"}      icon={<Globe size={18}/>}     label="Domain Clients" onClick={() => setActiveTab("domains")} />
          <div className="pt-8">
            <p className="text-xs font-black text-slate-500 uppercase px-4 mb-2 tracking-widest">System</p>
            <NavBtn active={activeTab === "templates"}  icon={<Mail size={18}/>}      label="Email Templates" onClick={() => setActiveTab("templates")} />
          </div>
        </nav>
      </aside>

      <main className="flex-1 ml-64 p-8 md:p-10">
        <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-10 gap-4">
          <h1 className="text-3xl font-black text-slate-900 uppercase tracking-tight capitalize">
            {activeTab.replace("-", " ")}
          </h1>
          <div className="flex flex-wrap items-center gap-4">
            <button onClick={fetchTabData} disabled={loading}
              className="flex items-center gap-2 px-4 py-2 bg-slate-200 text-slate-700 rounded-xl hover:bg-slate-300 transition">
              <RefreshCw size={16} className={loading ? "animate-spin" : ""} /> Refresh
            </button>
            {activeTab === "jobs" && (
              <button onClick={() => setIsJobModalOpen(true)}
                className="btn-action flex items-center gap-2 px-6 py-2.5 bg-slate-900 text-white rounded-xl font-bold shadow-lg">
                <Plus size={18} /> New Job Posting
              </button>
            )}
            {(activeTab === "applications" || activeTab === "jobs") && domains.length > 0 && (
              <div className="flex items-center gap-2 px-4 py-2 bg-white rounded-xl border border-slate-200 shadow-sm">
                <Globe size={16} className="text-slate-500" />
                <select className="bg-transparent font-medium text-slate-700 outline-none text-sm cursor-pointer"
                  value={selectedDomain} onChange={e => setSelectedDomain(e.target.value)}>
                  <option value="all">All Domains</option>
                  {domains.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                </select>
              </div>
            )}
          </div>
        </header>

        {error && (
          <div className="mb-8 p-4 bg-red-50 border border-red-200 text-red-700 rounded-xl flex items-center gap-3">
            <AlertCircle size={20} /> <span>{error}</span>
          </div>
        )}

        {loading ? (
          <div className="py-32 text-center text-slate-400 font-medium text-lg">
            Loading...
          </div>
        ) : (
          <div className="w-full space-y-8">
            {activeTab === "applications" && (
              <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
                <table className="w-full text-left">
                  <thead className="bg-slate-50 border-b border-slate-100">
                    <tr>
                      <th className="px-6 py-4 text-xs font-black text-slate-500 uppercase tracking-wider">Applicant</th>
                      <th className="px-6 py-4 text-xs font-black text-slate-500 uppercase tracking-wider">Job / Domain</th>
                      <th className="px-6 py-4 text-xs font-black text-slate-500 uppercase tracking-wider text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {filteredApplications.length === 0 ? (
                      <tr><td colSpan="3" className="py-20 text-center text-slate-500">No applications yet</td></tr>
                    ) : filteredApplications.map(app => (
                      <tr key={app.id} className="hover:bg-slate-50 transition-colors cursor-pointer"
                        onClick={() => setSelectedApp(app)}>
                        <td className="px-6 py-5">
                          <p className="font-bold text-slate-800">
                            {app.first_name && app.second_name
                              ? `${app.first_name} ${app.second_name}`
                              : app.applicant_name || app.email}
                          </p>
                          <p className="text-xs text-slate-500">{app.applicant_email || app.email}</p>
                        </td>
                        <td className="px-6 py-5">
                          <p className="font-medium text-slate-700">{app.job_title || "General"}</p>
                          <span className="jobs-domain-badge">{app.domain_name || "N/A"}</span>
                        </td>
                        <td className="px-6 py-5 text-right space-x-2">
                          <button className="btn-action p-2 text-blue-600 rounded-lg hover:bg-blue-50"
                            onClick={e => { e.stopPropagation(); setSelectedApp(app); }}>
                            <Eye size={18} />
                          </button>
                          <button className="btn-action p-2 text-emerald-600 rounded-lg hover:bg-emerald-50"
                            onClick={e => { e.stopPropagation(); handleApprove(app.id); }}>
                            <CheckCircle size={18} />
                          </button>
                          <button className="btn-action p-2 text-rose-600 rounded-lg hover:bg-rose-50"
                            onClick={e => { e.stopPropagation(); handleReject(app.id); }}>
                            <XCircle size={18} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {activeTab === "jobs" && (
              <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
                <table className="w-full text-left">
                  <thead className="bg-slate-50 border-b border-slate-100">
                    <tr>
                      <th className="px-6 py-4 text-xs font-black text-slate-500 uppercase tracking-wider">Job Title</th>
                      <th className="px-6 py-4 text-xs font-black text-slate-500 uppercase tracking-wider">Domain / Field</th>
                      <th className="px-6 py-4 text-xs font-black text-slate-500 uppercase tracking-wider">Location / Pay</th>
                      <th className="px-6 py-4 text-xs font-black text-slate-500 uppercase tracking-wider text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {jobs.length === 0 ? (
                      <tr><td colSpan="4" className="py-20 text-center text-slate-500">No jobs posted yet</td></tr>
                    ) : jobs.map(job => (
                      <tr key={job.id} className="hover:bg-slate-50 transition-colors">
                        <td className="px-6 py-5">
                          <p className="font-bold text-slate-800">{job.title || "Untitled"}</p>
                          <p className="text-xs text-slate-500">{job.field || "General"}</p>
                        </td>
                        <td className="px-6 py-5">
                          <span className="jobs-domain-badge">{job.domain_name || "N/A"}</span>
                        </td>
                        <td className="px-6 py-5">
                          <p className="text-sm font-medium text-slate-700">{job.location || "Remote"}</p>
                          <p className="text-xs text-emerald-600 font-bold">{job.compensation || "Negotiable"}</p>
                        </td>
                        <td className="px-6 py-5 text-right space-x-2">
                          <button className="btn-action p-2 text-slate-500 rounded-lg hover:bg-slate-100">
                            <ExternalLink size={18} />
                          </button>
                          <button className="btn-action p-2 text-rose-600 rounded-lg hover:bg-rose-50">
                            <Trash2 size={18} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {activeTab === "domains" && (
              <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
                <table className="w-full text-left">
                  <thead className="bg-slate-50 border-b border-slate-100">
                    <tr>
                      <th className="px-6 py-4 text-xs font-black text-slate-500 uppercase tracking-wider">Domain Name</th>
                      <th className="px-6 py-4 text-xs font-black text-slate-500 uppercase tracking-wider">Reference Code</th>
                      <th className="px-6 py-4 text-xs font-black text-slate-500 uppercase tracking-wider">Payment Status</th>
                      <th className="px-6 py-4 text-xs font-black text-slate-500 uppercase tracking-wider text-right">Target</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {domains.length === 0 ? (
                      <tr><td colSpan="4" className="py-20 text-center text-slate-500">No domains registered yet</td></tr>
                    ) : domains.map(d => (
                      <tr key={d.id} className="hover:bg-slate-50 transition-colors">
                        <td className="px-6 py-5">
                          <p className="font-bold text-slate-800">{d.name || "Unnamed"}</p>
                          {!d.is_active && (
                            <span className="text-xs text-amber-600 font-bold">Awaiting payment</span>
                          )}
                        </td>
                        <td className="px-6 py-5">
                          <code className="px-2 py-1 bg-slate-100 rounded text-xs font-mono text-slate-600">
                            {d.reference_number || "Pending payment"}
                          </code>
                        </td>
                        <td className="px-6 py-5">
                          <span className={"badge-status px-3 py-1 rounded-full text-xs uppercase tracking-wider " + (
                            d.status === "deposit_paid" || d.status === "Paid"
                              ? "bg-emerald-100 text-emerald-700"
                              : "bg-amber-100 text-amber-700"
                          )}>
                            {d.status || "Pending"}
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
            )}

            {activeTab === "templates" && <TemplateManager />}
          </div>
        )}

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

const NavBtn = ({ active, icon, label, onClick }) => (
  <button onClick={onClick}
    className={"w-full flex items-center gap-3 px-5 py-3.5 rounded-xl font-medium transition-all " + (
      active ? "bg-emerald-500 text-white shadow-lg" : "text-slate-300 hover:bg-slate-800 hover:text-white"
    )}>
    {icon} {label}
  </button>
);

export default AdminDashboard;
