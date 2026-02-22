import React, { useEffect, useState } from 'react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer
} from 'recharts';
import { Activity, TrendingUp, CheckCircle, Zap } from 'lucide-react';

const DataAnalytics = ({ domainId }) => {
  const [analytics, setAnalytics] = useState({
    submissionData: [],
    confidenceScore: 0,
    ingestionRate: '+0%',
    loading: true,
    error: null
  });

  useEffect(() => {
    const fetchAnalytics = async () => {
      try {
        const response = await fetch(`http://localhost:8000/api/main/analytics/${domainId}`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${localStorage.getItem('token')}`
          }
        });

        if (!response.ok) {
          throw new Error('Failed to fetch analytics');
        }

        const data = await response.json();
        setAnalytics({
          submissionData: data.submissionData || [],
          confidenceScore: data.confidenceScore || 0,
          ingestionRate: data.ingestionRate || '+0%',
          loading: false,
          error: null
        });
      } catch (err) {
        console.error('Error fetching analytics:', err);
        setAnalytics(prev => ({
          ...prev,
          loading: false,
          error: err.message
        }));
      }
    };

    if (domainId) {
      fetchAnalytics();
    }
  }, [domainId]);

  if (analytics.loading) {
    return (
      <div className="analytics-view animate-in fade-in slide-in-from-bottom-4 duration-700 p-8">
        <div className="text-center text-slate-500">Loading analytics...</div>
      </div>
    );
  }

  if (analytics.error) {
    return (
      <div className="analytics-view animate-in fade-in slide-in-from-bottom-4 duration-700 p-8">
        <div className="text-center text-red-500">Error: {analytics.error}</div>
      </div>
    );
  }

  return (
    <div className="analytics-view animate-in fade-in slide-in-from-bottom-4 duration-700">
      {/* --- HEADER --- */}
      <div className="flex justify-between items-end mb-10">
        <div>
          <h2 className="text-3xl font-black text-slate-900">Data Collection Progress</h2>
          <p className="text-slate-500 font-medium">Real-time telemetry from the SemaData Pipeline.</p>
        </div>
        <div className="hidden md:flex gap-3">
          <div className="bg-emerald-50 text-[#489c8c] px-4 py-2 rounded-2xl border border-emerald-100 flex items-center gap-2 font-bold text-sm">
            <TrendingUp size={16} /> {analytics.ingestionRate} Ingestion Rate
          </div>
        </div>
      </div>

      {/* --- SUBMISSION VOLUME CHART --- */}
      <div className="bg-white p-8 rounded-[40px] border border-slate-100 shadow-sm mb-8">
        <div className="flex justify-between items-center mb-8">
          <h3 className="font-bold text-slate-800 flex items-center gap-2">
            <Activity size={20} className="text-[#489c8c]" /> Weekly Data Ingestion
          </h3>
        </div>

        <div className="h-[300px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={analytics.submissionData}>
              <defs>
                <linearGradient id="colorSub" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#489c8c" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#489c8c" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 12 }} />
              <YAxis axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 12 }} />
              <Tooltip
                contentStyle={{ borderRadius: '20px', border: 'none', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)' }}
              />
              <Area type="monotone" dataKey="submissions" stroke="#489c8c" strokeWidth={4} fillOpacity={1} fill="url(#colorSub)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* --- MODEL PERFORMANCE BOX --- */}
      <div className="bg-[#1a2e2a] rounded-[40px] p-10 text-white flex flex-col md:flex-row items-center justify-between gap-8 relative overflow-hidden">
        <div className="absolute top-0 right-0 p-10 opacity-10">
          <Zap size={150} />
        </div>
        <div className="relative z-10">
          <div className="flex items-center gap-2 mb-4">
            <CheckCircle className="text-emerald-400" size={24} />
            <span className="text-emerald-400 font-black uppercase tracking-[0.2em] text-xs">Model Performance</span>
          </div>
          <h4 className="text-4xl font-black mb-2">{analytics.confidenceScore}% Confidence Score</h4>
          <p className="text-emerald-50/60 max-w-md">
            The SemaData Inference Engine is currently processing transcriptions with high precision across all active domains.
          </p>
        </div>
        <button className="relative z-10 bg-emerald-500 hover:bg-emerald-400 text-white px-8 py-4 rounded-2xl font-bold transition-all shadow-xl shadow-emerald-900/20">
          Download Report
        </button>
      </div>
    </div>
  );
};

export default DataAnalytics;