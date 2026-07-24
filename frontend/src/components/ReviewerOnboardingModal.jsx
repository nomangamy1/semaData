import React, { useState } from 'react';
import { X, ShieldCheck, Mail, User, Key, Copy, Check } from 'lucide-react';

const ReviewerOnboardingModal = ({ isOpen, onClose }) => {
    const [formData, setFormData] = useState({ firstName: '', secondName: '', email: '' });
    const [credentials, setCredentials] = useState(null);
    const [copied, setCopied] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    if (!isOpen) return null;

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            const token = localStorage.getItem('token');
            const response = await fetch('http://localhost:8000/api/admin/manage-team/invite', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    email: formData.email.trim(),
                    first_name: formData.firstName.trim(),
                    second_name: formData.secondName.trim()
                })
            });

            const data = await response.json();

            if (response.ok) {
                setCredentials(data.credentials);
            } else {
                setError(data.error || 'Could not provision reviewer security clearance credentials.');
            }
        } catch (err) {
            setError('System transmission failure linking to backend identity management layer.');
        } finally {
            setLoading(false);
        }
    };

    const copyToClipboard = () => {
        if (!credentials) return;
        const secureText = `SemaData Reviewer Access Configuration:\nURL: http://localhost:3000/login\nEmail: ${credentials.email}\nTemporary Password: ${credentials.temporary_password}`;
        navigator.clipboard.writeText(secureText);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-md flex items-center justify-center z-[100] p-4">
            <div className="bg-white w-full max-w-md rounded-[36px] p-8 border border-slate-100 shadow-2xl relative overflow-hidden animate-in zoom-in-95 duration-200">
                
                {/* Close Button */}
                <button onClick={onClose} className="absolute top-6 right-6 p-2 text-slate-400 hover:text-slate-600 rounded-full transition-colors">
                    <X size={20} />
                </button>

                {!credentials ? (
                    <>
                        <div className="flex items-center gap-3 mb-4">
                            <div className="p-3 bg-emerald-50 text-emerald-600 rounded-2xl"><ShieldCheck size={24} /></div>
                            <div>
                                <h3 className="text-xl font-black text-slate-800">Provision Reviewer</h3>
                                <p className="text-xs text-slate-400">Instantly register trusted platform review personnel.</p>
                            </div>
                        </div>

                        {error && <div className="p-4 mb-4 text-xs font-bold bg-rose-50 text-rose-500 rounded-2xl border border-rose-100">{error}</div>}

                        <form onSubmit={handleSubmit} className="space-y-4 mt-2">
                            <div className="relative">
                                <User className="absolute left-4 top-4 text-slate-400" size={18} />
                                <input 
                                    type="text" placeholder="First Name" required
                                    className="w-full pl-12 pr-5 py-3.5 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-medium focus:outline-none focus:border-emerald-500 transition-colors"
                                    onChange={e => setFormData({...formData, firstName: e.target.value})}
                                />
                            </div>
                            <div className="relative">
                                <User className="absolute left-4 top-4 text-slate-400" size={18} />
                                <input 
                                    type="text" placeholder="Second Name" required
                                    className="w-full pl-12 pr-5 py-3.5 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-medium focus:outline-none focus:border-emerald-500 transition-colors"
                                    onChange={e => setFormData({...formData, secondName: e.target.value})}
                                />
                            </div>
                            <div className="relative">
                                <Mail className="absolute left-4 top-4 text-slate-400" size={18} />
                                <input 
                                    type="email" placeholder="Reviewer Corporate Email" required
                                    className="w-full pl-12 pr-5 py-3.5 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-medium focus:outline-none focus:border-emerald-500 transition-colors"
                                    onChange={e => setFormData({...formData, email: e.target.value})}
                                />
                            </div>

                            <button type="submit" disabled={loading} className="w-full mt-2 py-4 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-2xl text-sm shadow-lg shadow-emerald-600/10 transition-all flex justify-center items-center">
                                {loading ? "Generating Secure Account..." : "Provision Security Credentials"}
                            </button>
                        </form>
                    </>
                ) : (
                    <div className="text-center py-2">
                        <div className="w-14 h-14 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-4"><ShieldCheck size={28} /></div>
                        <h3 className="text-xl font-black text-slate-800 mb-1">Access Token Generated</h3>
                        <p className="text-xs text-slate-400 mb-6">Database account records updated. Deliver security profile below:</p>
                        
                        <div className="bg-slate-50 border border-slate-100 p-5 rounded-2xl text-left font-mono text-xs text-slate-700 space-y-2.5 mb-6 relative group">
                            <p><strong>Identity Identifier:</strong> {credentials.email}</p>
                            <p><strong>System Lock Passphrase:</strong> <span className="text-emerald-600 font-bold">{credentials.temporary_password}</span></p>
                        </div>

                        <div className="flex gap-3">
                            <button onClick={copyToClipboard} className="flex-1 py-3.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-2xl text-sm transition-colors flex items-center justify-center gap-2">
                                {copied ? <Check size={16} className="text-emerald-600" /> : <Copy size={16} />}
                                {copied ? "Copied Info!" : "Copy Payload"}
                            </button>
                            <button onClick={() => { setCredentials(null); onClose(); }} className="flex-1 py-3.5 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-2xl text-sm transition-colors">
                                Complete Entry
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default ReviewerOnboardingModal;
