import React, { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Copy, Check, LayoutDashboard, Share2 } from 'lucide-react';

const SuccessPage = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [copied, setCopied] = useState(false);

  // Get data passed from the Domain Definition page
  const { refNum, domainName } = location.state || { refNum: '000000', domainName: 'Project' };

  const handleCopy = () => {
    navigator.clipboard.writeText(refNum);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000); // Reset icon after 2s
  };

  return (
    <div className="definition-container">
      <div className="definition-card text-center">
        <div className="flex justify-center mb-6">
          <div className="bg-[#f0fdfa] p-4 rounded-full">
            <Check size={48} className="text-[#489c8c]" />
          </div>
        </div>

        <h2 className="text-3xl font-black mb-2">Domain Created!</h2>
        <p className="text-gray-600 mb-8">
          Your project <strong>{domainName}</strong> is now live. Use the Reference Number below to invite collectors.
        </p>

        {/* --- THE TOKEN DISPLAY --- */}
        <div className="bg-gray-50 border-2 border-dashed border-gray-200 rounded-2xl p-6 mb-8 relative">
          <span className="text-xs font-bold text-gray-400 uppercase tracking-widest block mb-2">
            Reference Number / Token
          </span>
          <div className="text-5xl font-mono font-black text-[#489c8c] tracking-tighter">
            {refNum}
          </div>
          
          <button 
            onClick={handleCopy}
            className="absolute top-4 right-4 p-2 bg-white shadow-sm border rounded-lg hover:bg-gray-50 transition-all"
          >
            {copied ? <Check size={18} className="text-green-500" /> : <Copy size={18} className="text-gray-500" />}
          </button>
        </div>

        <div className="grid grid-cols-1 gap-4">
          <button 
            onClick={() => navigate('/dashboard')}
            className="finalize-btn"
          >
            <LayoutDashboard size={20} /> Go to Dashboard
          </button>
          
          <p className="text-sm text-gray-500 mt-4">
            This number is now saved in your Dashboard under <strong>"Active Domains"</strong>.
          </p>
        </div>
      </div>
    </div>
  );
};

export default SuccessPage;