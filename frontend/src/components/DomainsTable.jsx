import React, { useState, useEffect } from 'react';
import { Globe, Shield, ShieldAlert, Activity } from 'lucide-react';
import './AdminShared.css';

const DomainsTable = () => {
    const [domains, setDomains] = useState([]);
    const [loading, setLoading] = useState(true);

    const fetchDomains = async () => {
        try {
            setLoading(true);
            const token = localStorage.getItem('token');
            const response = await fetch('/api/all-domains', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (response.ok) {
                const data = await response.json();
                setDomains(data);
            }
        } catch (error) {
            console.error("Error retrieving administrative domain records:", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchDomains();
    }, []);

    if (loading) {
        return <div className="py-12 text-center text-slate-400 font-medium">Querying platform domain schema registry...</div>;
    }

    if (!domains || domains.length === 0) {
        return (
            <div className="py-20 text-center bg-white rounded-3xl border border-dashed border-slate-200">
                <Globe className="mx-auto text-slate-300 mb-4" size={64} />
                <h3 className="text-xl font-bold text-slate-600 mb-2">No Active Domains Found</h3>
                <p className="text-slate-500">Registered multi-domain collection tracks will appear here once provisioned.</p>
            </div>
        );
    }

    return (
        <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
            <table className="w-full text-left">
                <thead className="bg-slate-50 border-b border-slate-100">
                    <tr>
                        <th className="px-6 py-4 text-xs font-black text-slate-500 uppercase tracking-wider">Domain Scope Details</th>
                        <th className="px-6 py-4 text-xs font-black text-slate-500 uppercase tracking-wider">Reference Keys</th>
                        <th className="px-6 py-4 text-xs font-black text-slate-500 uppercase tracking-wider">Current Status</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                    {domains.map(dom => (
                        <tr key={dom.id} className="hover:bg-slate-50 transition-colors">
                            <td className="px-6 py-5">
                                <p className="font-bold text-slate-800">{dom.domain_name || 'Unnamed Scope'}</p>
                                <p className="text-xs text-slate-500">Owner ID: #{dom.owner_id || 'System'}</p>
                            </td>
                            <td className="px-6 py-5">
                                <code className="px-2 py-1 bg-slate-100 text-slate-700 font-mono text-xs rounded-md">
                                    {dom.reference_number || 'REF-UNASSIGNED'}
                                </code>
                            </td>
                            <td className="px-6 py-5">
                                <span className={`flex items-center gap-1.5 text-xs font-bold ${
                                    dom.status === 'active' || dom.is_active ? 'text-emerald-600' : 'text-slate-400'
                                }`}>
                                    <Activity size={14} />
                                    {dom.status || (dom.is_active ? 'Active' : 'Inactive')}
                                </span>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
};

export default DomainsTable;
