import React, { useEffect, useState } from 'react';
import {
    LayoutDashboard, Database, Users, PlusCircle,
    Copy, ExternalLink, Activity, Download, Printer, LogOut, X, FileText
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import './Dashboard.css';

// --- SUB-COMPONENT: DETAIL MODAL ---
const DetailModal = ({ isOpen, onClose, dataset, features }) => {
    if (!isOpen || !dataset) return null;

    let segments = {};
    try {
        segments = typeof dataset.segmented_text === 'string'
            ? JSON.parse(dataset.segmented_text)
            : (dataset.segmented_text || {});
    } catch { segments = {}; }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-emerald-950/40 backdrop-blur-sm animate-fadeIn">
            <div className="bg-white w-full max-w-2xl rounded-3xl border border-emerald-100 shadow-2xl overflow-hidden flex flex-col max-h-[85vh] animate-slideUp">
                
                {/* Modal Header */}
                <div className="p-6 border-b border-emerald-50 flex justify-between items-center bg-emerald-50/30">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-[#489c8c]/10 text-[#489c8c] rounded-xl">
                            <FileText size={20} />
                        </div>
                        <div>
                            <h3 className="text-lg font-black text-slate-800 tracking-tight">Submission Analysis</h3>
                            <p className="text-xs font-mono text-[#489c8c] font-bold mt-0.5">REF: {dataset.ref_number}</p>
                        </div>
                    </div>
                    <button 
                        onClick={onClose}
                        className="p-2 hover:bg-emerald-100/50 text-slate-400 hover:text-emerald-700 rounded-xl transition-all"
                    >
                        <X size={18} />
                    </button>
                </div>

                {/* Modal Content */}
                <div className="p-6 overflow-y-auto space-y-6 custom-scrollbar flex-1">
                    
                    {/* Status Ribbon */}
                    <div className="flex justify-between items-center p-4 bg-emerald-50/20 rounded-2xl border border-emerald-100/60">
                        <span className="text-xs font-bold text-slate-500">Validation Status</span>
                        <span className={`inline-flex items-center px-3 py-1 rounded-full text-[10px] font-black tracking-wider ${
                            dataset.status === 'AI_Passed' || dataset.status === 'Verified'
                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-100'
                                : 'bg-amber-50 text-amber-700 border border-amber-100'
                        }`}>
                            {dataset.status?.toUpperCase() || 'PENDING'}
                        </span>
                    </div>

                    {/* Features Map with Tokenized Word Elements */}
                    <div className="space-y-4">
                        <h4 className="text-xs font-black text-emerald-700/70 uppercase tracking-wider">Extracted Feature Mappings</h4>
                        
                        {features.map(f => {
                            const rawText = segments[f] || '';
                            const words = rawText.toString().split(/\s+/).filter(w => w.length > 0);

                            return (
                                <div key={f} className="p-4 rounded-2xl border border-emerald-100/70 bg-white shadow-sm space-y-2.5">
                                    <span className="inline-block text-[10px] font-black uppercase tracking-wider text-[#489c8c] bg-emerald-50/60 px-2 py-0.5 rounded-md border border-emerald-100/40">
                                        {f}
                                    </span>
                                    
                                    {words.length > 0 ? (
                                        <div className="flex flex-wrap gap-1.5 p-3 bg-emerald-50/20 rounded-xl border border-dashed border-emerald-200/60">
                                            {words.map((word, idx) => (
                                                <span 
                                                    key={idx} 
                                                    className="inline-block px-2.5 py-1 text-xs font-medium text-slate-700 bg-white border border-slate-200/80 rounded-lg shadow-sm hover:border-[#489c8c]/40 hover:text-[#489c8c] transition-all cursor-default select-all"
                                                >
                                                    {word}
                                                </span>
                                            ))}
                                        </div>
                                    ) : (
                                        <p className="text-sm font-mono text-slate-300 pl-1">--- Empty Extraction Segment ---</p>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* Modal Footer */}
                <div className="p-4 bg-emerald-50/30 border-t border-emerald-50 flex justify-end">
                    <button 
                        onClick={onClose}
                        className="px-5 py-2.5 bg-slate-800 text-white rounded-xl text-xs font-bold hover:bg-slate-900 transition-all shadow-sm"
                    >
                        Close Blueprint View
                    </button>
                </div>
            </div>
        </div>
    );
};

// --- SUB-COMPONENT: INSIGHTS TABLE ---
const InsightsTable = ({ datasets, features }) => {
    const [selectedRow, setSelectedRow] = useState(null);
    const [isModalOpen, setIsModalOpen] = useState(false);

    if (!datasets || datasets.length === 0) {
        return (
            <div className="p-12 text-center bg-white rounded-3xl border border-dashed border-emerald-200 mt-6 shadow-sm">
                <Database size={40} className="mx-auto text-emerald-200 mb-3" />
                <p className="text-emerald-700/60 font-medium">No submission datasets available yet for this domain stream.</p>
            </div>
        );
    }

    const openDetails = (dataset) => {
        setSelectedRow(dataset);
        setIsModalOpen(true);
    };

    return (
        <>
            <div className="bg-white rounded-3xl border border-emerald-100/80 shadow-sm overflow-hidden mt-6">
                <div className="p-6 border-b border-emerald-50 flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center bg-white">
                    <div>
                        <h3 className="text-lg font-bold text-slate-800">Linguistic Analysis Stream</h3>
                        <p className="text-xs text-slate-400 mt-0.5">Real-time captured field voice-to-text extractions</p>
                    </div>
                    <div className="flex gap-2 w-full sm:w-auto">
                        <button className="flex-1 sm:flex-initial flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-bold text-slate-600 hover:bg-emerald-50/40 border border-slate-200 rounded-xl transition-all">
                            <Download size={16} /> Export CSV
                        </button>
                        <button onClick={() => window.print()}
                            className="flex-1 sm:flex-initial flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-bold bg-[#489c8c] text-white rounded-xl hover:bg-[#3d8577] transition-all shadow-sm">
                            <Printer size={16} /> Print Report
                        </button>
                    </div>
                </div>
                <div className="overflow-x-auto custom-scrollbar">
                    <table className="w-full text-left border-collapse min-w-[600px]">
                        <thead className="bg-emerald-50/40 border-b border-emerald-50">
                            <tr>
                                <th className="p-4 pl-6 text-xs font-black text-[#3b7e71] uppercase tracking-wider w-36">Ref Number</th>
                                {features.map(f => (
                                    <th key={f} className="p-4 text-xs font-black text-[#3b7e71] uppercase tracking-wider">{f}</th>
                                ))}
                                <th className="p-4 pr-6 text-xs font-black text-[#3b7e71] uppercase tracking-wider text-right w-28">Status</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-emerald-50/50">
                            {datasets.map((d, idx) => {
                                let segments = {};
                                try {
                                    segments = typeof d.segmented_text === 'string'
                                        ? JSON.parse(d.segmented_text)
                                        : (d.segmented_text || {});
                                } catch { segments = {}; }

                                return (
                                    <tr 
                                        key={idx} 
                                        onClick={() => openDetails(d)}
                                        className="hover:bg-emerald-50/30 cursor-pointer transition-colors group"
                                    >
                                        <td className="p-4 pl-6 font-mono text-xs text-[#489c8c] font-bold tracking-tight select-all">
                                            {d.ref_number}
                                        </td>
                                        {features.map(f => (
                                            <td key={f} className="p-4 text-sm text-slate-600 max-w-xs truncate">
                                                {segments[f] || <span className="text-slate-300 font-mono">---</span>}
                                            </td>
                                        ))}
                                        <td className="p-4 pr-6 text-right" onClick={(e) => e.stopPropagation()}>
                                            <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-black tracking-wider ${
                                                d.status === 'AI_Passed' || d.status === 'Verified'
                                                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-100'
                                                    : 'bg-amber-50 text-amber-700 border border-amber-100'
                                            }`}>
                                                {d.status?.toUpperCase() || 'PENDING'}
                                            </span>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </div>

            <DetailModal 
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                dataset={selectedRow}
                features={features}
            />
        </>
    );
};


// --- MAIN COMPONENT: DASHBOARD ---
const Dashboard = () => {
    const [domains, setDomains] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [selectedDomain, setSelectedDomain] = useState(null);
    const navigate = useNavigate();

    const token = localStorage.getItem('token');

    const handleLogout = () => {
        localStorage.clear();
        navigate('/login?fresh=true', { replace: true });
    };

    useEffect(() => {
        if (!token) {
            navigate('/login', { replace: true });
            return;
        }

        const fetchDomains = async () => {
            try {
                const response = await fetch('http://localhost:8000/api/my-domains', {
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    }
                });

                if (response.status === 401 || response.status === 403) {
                    localStorage.clear();
                    navigate('/login', { replace: true });
                    return;
                }

                if (response.status === 404) {
                    setError('API endpoint configuration error. Please contact support.');
                    setLoading(false);
                    return;
                }

                if (!response.ok) throw new Error(`Server error: ${response.status}`);

                const data = await response.json();
                setDomains(data || []);

                if (data && data.length > 0) setSelectedDomain(data[0]);
            } catch (err) {
                console.error('Failed to fetch domains:', err);
                setError('Failed to load domains. Please check your connection.');
            } finally {
                setLoading(false);
            }
        };

        fetchDomains();
    }, [token, navigate]);

    const selectedFeatures = selectedDomain?.features?.map(f => f.name || f) || [];
    const selectedDatasets = selectedDomain?.datasets || [];

    if (loading) {
        return (
            <div className="flex min-h-screen flex-col gap-4 items-center justify-center font-bold text-[#489c8c] bg-emerald-50/50">
                <div className="w-10 h-10 border-4 border-[#489c8c]/20 border-t-[#489c8c] rounded-full animate-spin"></div>
                <p className="text-sm tracking-wider font-black uppercase text-emerald-800/70 animate-pulse">Initializing Command Center...</p>
            </div>
        );
    }

    if (error) {
        return (
            <div className="flex min-h-screen flex-col items-center justify-center bg-emerald-50/40 p-6">
                <div className="bg-white p-8 rounded-3xl border border-emerald-100 shadow-sm max-w-md text-center">
                    <p className="text-rose-600 font-bold mb-4">{error}</p>
                    <button onClick={() => navigate('/login')}
                        className="w-full px-6 py-3 bg-[#489c8c] text-white rounded-xl font-bold hover:bg-[#3d8577] transition shadow-sm">
                        Back to Login
                    </button>
                </div>
            </div>
        );
    }

    return (
        /* CHANGED: Main background wrapper now uses a subtle, premium mint-sage tint (bg-emerald-50/40) */
        <div className="dashboard-wrapper bg-emerald-50/40">

            {/* SIDEBAR */}
            <aside className="sidebar">
                <div className="flex items-center gap-3 text-2xl font-black mb-10 text-[#489c8c] tracking-tight">
                    <Database size={28} className="stroke-[2.5]" /> semaData
                </div>
                
                <nav className="flex-1 space-y-1.5">
                    <div className="flex items-center gap-3 p-3 rounded-xl bg-[#489c8c] text-white font-bold cursor-pointer transition shadow-md shadow-[#489c8c]/10">
                        <LayoutDashboard size={18} /> Dashboard
                    </div>
                    <div className="flex items-center gap-3 p-3 rounded-xl hover:bg-slate-800/60 text-slate-400 hover:text-white transition cursor-pointer font-medium text-sm">
                        <Activity size={18} /> Data Analytics
                    </div>
                    <div className="flex items-center gap-3 p-3 rounded-xl hover:bg-slate-800/60 text-slate-400 hover:text-white transition cursor-pointer font-medium text-sm">
                        <Users size={18} /> Team Collectors
                    </div>
                </nav>

                <div className="pt-4 border-t border-slate-800/60 space-y-2">
                    <button onClick={() => navigate('/DomainDefinition')}
                        className="w-full bg-[#489c8c] hover:bg-[#3d8577] text-white p-3.5 rounded-xl font-bold flex items-center justify-center gap-2 transition shadow-md shadow-[#489c8c]/5 text-sm">
                        <PlusCircle size={18} /> New Domain
                    </button>
                    <button onClick={handleLogout}
                        className="w-full bg-slate-800/40 hover:bg-rose-950/40 border border-slate-800 Tri hover:border-rose-900/50 text-slate-400 hover:text-rose-400 p-3.5 rounded-xl font-bold flex items-center justify-center gap-2 transition text-sm">
                        <LogOut size={18} /> Logout
                    </button>
                </div>
            </aside>

            {/* MAIN CONTENT CONTAINER */}
            <main className="content-container">
                <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-10">
                    <div>
                        <h2 className="text-3xl font-black text-slate-900 tracking-tight">Command Center</h2>
                        <p className="text-slate-500 text-sm font-medium mt-0.5">
                            System Status: <span className="text-[#489c8c] font-bold inline-flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-[#489c8c] animate-pulse"></span>Operational</span>
                        </p>
                    </div>
                    <div className="flex items-center gap-3.5 bg-white p-2 pr-5 rounded-2xl border border-emerald-100/60 shadow-sm">
                        <div className="w-10 h-10 bg-[#489c8c]/10 text-[#489c8c] rounded-xl flex items-center justify-center font-black text-sm">
                            {localStorage.getItem('username')?.substring(0, 2).toUpperCase() || 'DO'}
                        </div>
                        <div>
                            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest leading-none">Administrator</p>
                            <p className="text-xs font-bold text-slate-700 mt-1">
                                {localStorage.getItem('username') || 'Domain Owner'}
                            </p>
                        </div>
                    </div>
                </header>

                {/* STATS ROW */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 mb-10">
                    <div className="bg-white p-6 rounded-2xl border border-emerald-100/60 shadow-sm hover:border-emerald-200/80 transition-all">
                        <p className="text-emerald-800/60 font-bold text-[11px] uppercase tracking-wider mb-1">Active Domains</p>
                        <h4 className="text-2xl font-black text-slate-800">{domains.length}</h4>
                    </div>
                    <div className="bg-white p-6 rounded-2xl border border-emerald-100/60 shadow-sm hover:border-emerald-200/80 transition-all">
                        <p className="text-emerald-800/60 font-bold text-[11px] uppercase tracking-wider mb-1">Total Submissions</p>
                        <h4 className="text-2xl font-black text-slate-800">
                            {domains.reduce((total, d) => total + (d.submission_count || 0), 0)}
                        </h4>
                    </div>
                    <div className="bg-white p-6 rounded-2xl border border-emerald-100/60 shadow-sm hover:border-emerald-200/80 transition-all sm:col-span-2 lg:col-span-1">
                        <p className="text-emerald-800/60 font-bold text-[11px] uppercase tracking-wider mb-1">Team Collectors</p>
                        <h4 className="text-2xl font-black text-slate-800">
                            {domains.reduce((total, d) => total + (d.collector_count || 0), 0)}
                        </h4>
                    </div>
                </div>

                {/* DOMAIN BLOCK CONTENT */}
                {domains.length === 0 ? (
                    <div className="text-center py-20 bg-white rounded-3xl border border-dashed border-emerald-200 shadow-sm max-w-2xl mx-auto">
                        <Database size={44} className="mx-auto text-emerald-300 mb-4" />
                        <h3 className="text-lg font-bold text-slate-700 mb-1">No Active Streams</h3>
                        <p className="text-slate-400 text-sm mb-6 max-w-xs mx-auto">Define your structural nodes to begin gathering text data fields.</p>
                        <button onClick={() => navigate('/DomainDefinition')}
                            className="px-5 py-2.5 bg-[#489c8c] text-white rounded-xl font-bold hover:bg-[#3d8577] transition shadow-sm text-sm">
                            <PlusCircle size={16} className="inline mr-1.5 -mt-0.5" /> Create First Domain
                        </button>
                    </div>
                ) : (
                    <>
                        <h3 className="text-lg font-black text-slate-800 mb-4 tracking-tight">Active Knowledge Domains</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                            {domains.map((domain) => (
                                <div key={domain.reference_number}
                                    className={`bg-white p-5 rounded-2xl border transition-all flex flex-col justify-between cursor-pointer relative group ${
                                        selectedDomain?.reference_number === domain.reference_number
                                            ? 'border-[#489c8c] shadow-md shadow-[#489c8c]/5 ring-1 ring-[#489c8c]/30'
                                            : 'border-emerald-100/60 hover:border-emerald-200 shadow-sm'
                                    }`}
                                    onClick={() => setSelectedDomain(domain)}
                                >
                                    <div>
                                        <div className="flex justify-between items-start mb-4">
                                            <div className="p-2.5 bg-[#489c8c]/10 text-[#489c8c] rounded-xl">
                                                <Database size={20} />
                                            </div>
                                            <div className={`text-[9px] font-black px-2 py-0.5 rounded-md uppercase tracking-wider ${
                                                domain.payment_status === 'Paid'
                                                    ? 'bg-emerald-50 text-emerald-600 border border-emerald-100'
                                                    : 'bg-amber-50 text-amber-600 border border-amber-100'
                                            }`}>
                                                {domain.payment_status === 'Paid' ? 'Live Sync' : 'Pending'}
                                            </div>
                                        </div>

                                        <h3 className="text-base font-bold text-slate-900 truncate">{domain.domain_name}</h3>
                                        <p className="text-xs text-slate-400 mb-3 font-medium truncate">{domain.domain_field || 'General Research'}</p>

                                        {domain.feature_count && domain.feature_count > 0 && (
                                            <div className="flex flex-wrap gap-1 mb-4">
                                                <span className="text-[9px] bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-md font-bold border border-emerald-100/40">
                                                    {domain.feature_count} schema inputs
                                                </span>
                                            </div>
                                        )}
                                    </div>

                                    <div className="space-y-2.5 mt-2">
                                        <div className="bg-emerald-50/30 p-2.5 rounded-xl flex justify-between items-center border border-emerald-100/40">
                                            <div className="overflow-hidden w-[82%]">
                                                <p className="text-[8px] uppercase font-black text-emerald-800/50 tracking-wider leading-none">Security Token</p>
                                                <p className="font-mono text-xs font-bold text-slate-600 truncate mt-1">{domain.reference_number}</p>
                                            </div>
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    navigator.clipboard.writeText(domain.reference_number);
                                                    alert('Token copied securely to clipboard.');
                                                }}
                                                className="p-1.5 hover:bg-white border border-transparent hover:border-slate-200 rounded-lg transition text-slate-400 hover:text-[#489c8c]"
                                                title="Copy Stream Token"
                                            >
                                                <Copy size={13} />
                                            </button>
                                        </div>

                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                navigate(`/domain/${domain.domain_id || domain.reference_number}`);
                                            }}
                                            className="w-full py-2 bg-emerald-50/50 group-hover:bg-[#489c8c]/5 text-[#489c8c] border border-transparent group-hover:border-[#489c8c]/20 rounded-xl flex items-center justify-center gap-1.5 text-xs font-bold transition-all"
                                        >
                                            Enter Stream <ExternalLink size={12} className="transition-transform group-hover:translate-x-0.5" />
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* DATASET INSIGHTS */}
                        <div className="mt-14 mb-6">
                            <header className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-3">
                                <div>
                                    <h3 className="text-xl font-black text-slate-800 tracking-tight">Dataset Intelligence</h3>
                                    <p className="text-slate-500 text-xs font-medium mt-0.5">
                                        Target Node: <strong className="text-[#489c8c] font-bold">{selectedDomain?.domain_name || 'None selected'}</strong>
                                    </p>
                                </div>
                                {domains.length > 1 && (
                                    <select
                                        className="w-full sm:w-auto text-xs font-bold border border-emerald-100 rounded-xl px-3 py-2 bg-white text-slate-700 shadow-sm focus:outline-none focus:border-[#489c8c] cursor-pointer"
                                        value={selectedDomain?.reference_number || ''}
                                        onChange={(e) => {
                                            const found = domains.find(d => d.reference_number === e.target.value);
                                            if (found) setSelectedDomain(found);
                                        }}
                                    >
                                        {domains.map(d => (
                                            <option key={d.reference_number} value={d.reference_number}>
                                                {d.domain_name}
                                            </option>
                                        ))}
                                    </select>
                                )}
                            </header>

                            <InsightsTable
                                datasets={selectedDatasets}
                                features={selectedFeatures}
                            />
                        </div>
                    </>
                )}
            </main>
        </div>
    );
};

export default Dashboard;
