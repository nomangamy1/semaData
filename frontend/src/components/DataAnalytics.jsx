import React, { useEffect, useState } from 'react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer
} from 'recharts';
import { Activity, Users, Briefcase, Globe, FileText } from 'lucide-react';

const DataAnalytics = ({ domainId }) => {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Mocked trend mapping data for the global chart view
  const fallbackChartData = [
    { day: 'Mon', submissions: 40 },
    { day: 'Tue', submissions: 55 },
    { day: 'Wed', submissions: 48 },
    { day: 'Thu', submissions: 70 },
    { day: 'Fri', submissions: 82 },
    { day: 'Sat', submissions: 90 },
    { day: 'Sun', submissions: 110 },
  ];

  useEffect(() => {
    const fetchAdminStats = async () => {
      try {
        setLoading(true);
        const token = localStorage.getItem('token');
        
        // Dynamic targeting: Use admin global endpoint or domain owner endpoint
        const targetUrl = domainId 
          ? `http://localhost:8000/api/main/analytics/${domainId}`
          : `http://localhost:8000/api/dashboard-stats`;

        const response = await fetch(targetUrl, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          }
        });

        if (!response.ok) {
          throw new Error('Failed to resolve platform operational analytics.');
        }

        const data = await response.json();
        setStats(data.stats);
        setError(null);
      } catch (err) {
        console.error('Analytics engine fetch failure:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchAdminStats();
  }, [domainId]);

  if (loading) return <div className="p-12 text-center text-slate-400 font-medium">Computing platform telemetry streams...</div>;
  if (error) return <div className="p-12 text-center text-red-500">Error rendering logs: {error}</div>;

  return (
    <div className="analytics-view animate-in fade-in duration-500">
      
      {/* ─── TITLE HEADER ─── */}
      <div className="mb-8">
        <h2 className="text-3xl font-black text-slate-900">Platform Analytics</h2>
        <p className="text-slate-500 font-medium">Global operational metrics across the SemaData environment.</p>
      </div>

      {/* ─── LIVE METRIC CARDS ─── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm flex items-center gap-4">
          <div className="p-4 bg-emerald-50 text-emerald-600 rounded-2xl"><Users size={24} /></div>
          <div>
            <p className="text-sm font-bold text-slate-400 uppercase tracking-wider">Active Collectors</p>
            <h4 className="text-2xl font-black text-slate-800">{stats?.total_collectors ?? 0}</h4>
          </div>
        </div>

        <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm flex items-center gap-4">
          <div className="p-4 bg-blue-50 text-blue-600 rounded-2xl"><Globe size={24} /></div>
          <div>
            <p className="text-sm font-bold text-slate-400 uppercase tracking-wider">Total Domains</p>
            <h4 className="text-2xl font-black text-slate-800">{stats?.total_domains ?? 0}</h4>
          </div>
        </div>

        <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm flex items-center gap-4">
          <div className="p-4 bg-amber-50 text-amber-600 rounded-2xl"><Briefcase size={24} /></div>
          <div>
            <p className="text-sm font-bold text-slate-400 uppercase tracking-wider">Active Jobs</p>
            <h4 className="text-2xl font-black text-slate-800">{stats?.active_jobs ?? 0}</h4>
          </div>
        </div>

        <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm flex items-center gap-4">
          <div className="p-4 bg-rose-50 text-rose-600 rounded-2xl"><FileText size={24} /></div>
          <div>
            <p className="text-sm font-bold text-slate-400 uppercase tracking-wider">Pending Apps</p>
            <h4 className="text-2xl font-black text-slate-800">{stats?.pending_applications ?? 0}</h4>
          </div>
        </div>
      </div>

      {/* ─── WEEKLY INGESTION MONITOR ─── */}
      <div className="bg-white p-8 rounded-[40px] border border-slate-100 shadow-sm">
        <h3 className="font-bold text-slate-800 flex items-center gap-2 mb-8">
          <Activity size={20} className="text-emerald-500" /> System-Wide Audio Ingestion Rate
        </h3>
        <div className="h-[280px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={fallbackChartData}>
              <defs>
                <linearGradient id="colorSub" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.2} />
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 12 }} />
              <YAxis axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 12 }} />
              <Tooltip contentStyle={{ borderRadius: '20px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.05)' }} />
              <Area type="monotone" dataKey="submissions" stroke="#10b981" strokeWidth={4} fillOpacity={1} fill="url(#colorSub)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

    </div>
  );
};

export default DataAnalytics;
