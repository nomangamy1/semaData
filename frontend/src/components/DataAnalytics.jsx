import React from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, 
  ResponsiveContainer, PieChart, Pie, Cell, AreaChart, Area 
} from 'recharts';
import { Activity, TrendingUp, Mic, CheckCircle, Zap } from 'lucide-react';

const DataAnalytics = () => {
  // Mock data representing weekly ingestion volume
  const submissionData = [
    { day: 'Mon', submissions: 120 },
    { day: 'Tue', submissions: 190 },
    { day: 'Wed', submissions: 150 },
    { day: 'Thu', submissions: 210 },
    { day: 'Fri', submissions: 280 },
    { day: 'Sat', submissions: 110 },
    { day: 'Sun', submissions: 95 },
  ];

  // Mock data for Dialect Segmentation
  const dialectData = [
    { name: 'Standard', value: 45 },
    { name: 'Coastal', value: 25 },
    { name: 'Rift Valley', value: 20 },
    { name: 'Central', value: 10 },
  ];

  const COLORS = ['#489c8c', '#10b981', '#34d399', '#a7f3d0'];

  return (
    <div className="analytics-view animate-in fade-in slide-in-from-bottom-4 duration-700">
      {/* --- HEADER --- */}
      <div className="flex justify-between items-end mb-10">
        <div>
          <h2 className="text-3xl font-black text-slate-900">Linguistic Intelligence</h2>
          <p className="text-slate-500 font-medium">Real-time telemetry from the SemaData Inference Engine.</p>
        </div>
        <div className="hidden md:flex gap-3">
          <div className="bg-emerald-50 text-[#489c8c] px-4 py-2 rounded-2xl border border-emerald-100 flex items-center gap-2 font-bold text-sm">
            <TrendingUp size={16} /> +12.5% Ingestion Rate
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
        {/* --- MAIN CHART: SUBMISSION VOLUME --- */}
        <div className="lg:col-span-2 bg-white p-8 rounded-[40px] border border-slate-100 shadow-sm">
          <div className="flex justify-between items-center mb-8">
            <h3 className="font-bold text-slate-800 flex items-center gap-2">
              <Activity size={20} className="text-[#489c8c]" /> Weekly Data Ingestion
            </h3>
            <select className="bg-slate-50 border-none text-xs font-bold text-slate-500 rounded-lg px-3 py-1">
              <option>Last 7 Days</option>
              <option>Last 30 Days</option>
            </select>
          </div>
          
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={submissionData}>
                <defs>
                  <linearGradient id="colorSub" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#489c8c" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#489c8c" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 12}} />
                <YAxis axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 12}} />
                <Tooltip 
                  contentStyle={{borderRadius: '20px', border: 'none', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)'}}
                />
                <Area type="monotone" dataKey="submissions" stroke="#489c8c" strokeWidth={4} fillOpacity={1} fill="url(#colorSub)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* --- PIE CHART: DIALECT DISTRIBUTION --- */}
        <div className="bg-white p-8 rounded-[40px] border border-slate-100 shadow-sm flex flex-col">
          <h3 className="font-bold text-slate-800 mb-8 flex items-center gap-2">
            <Mic size={20} className="text-[#489c8c]" /> Dialect Coverage
          </h3>
          <div className="h-[250px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={dialectData}
                  cx="50%" cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={8}
                  dataKey="value"
                >
                  {dialectData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-4 space-y-3">
            {dialectData.map((d, i) => (
              <div key={i} className="flex justify-between items-center text-sm font-medium">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full" style={{backgroundColor: COLORS[i]}}></div>
                  <span className="text-slate-500">{d.name}</span>
                </div>
                <span className="text-slate-800 font-bold">{d.value}%</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* --- INFERENCE ENGINE STATUS (THE "WOW" BOX) --- */}
      <div className="bg-[#1a2e2a] rounded-[40px] p-10 text-white flex flex-col md:flex-row items-center justify-between gap-8 relative overflow-hidden">
        <div className="absolute top-0 right-0 p-10 opacity-10">
            <Zap size={150} />
        </div>
        <div className="relative z-10">
          <div className="flex items-center gap-2 mb-4">
            <CheckCircle className="text-emerald-400" size={24} />
            <span className="text-emerald-400 font-black uppercase tracking-[0.2em] text-xs">Model Performance</span>
          </div>
          <h4 className="text-4xl font-black mb-2">98.2% Confidence Score</h4>
          <p className="text-emerald-50/60 max-w-md">
            The SemaData Inference Engine is currently processing dialects with high precision across all active regional domains.
          </p>
        </div>
        <button className="relative z-10 bg-emerald-500 hover:bg-emerald-400 text-white px-8 py-4 rounded-2xl font-bold transition-all shadow-xl shadow-emerald-900/20">
          Download Analysis Report
        </button>
      </div>
    </div>
  );
};

export default DataAnalytics;