// src/components/ApplicationsTable.jsx
import React from 'react';
import { Users,CheckCircle, XCircle, Eye } from 'lucide-react';

const ApplicationsTable = ({ data, onView, onApprove, onReject }) => {
  if (!data || data.length === 0) {
    return (
      <div className="py-20 text-center bg-white rounded-3xl border border-dashed border-slate-200">
        <Users className="mx-auto text-slate-300 mb-4" size={64} />
        <h3 className="text-xl font-bold text-slate-600 mb-2">No Applications Yet</h3>
        <p className="text-slate-500">Pending collector applications will appear here.</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
      <table className="w-full text-left">
        <thead className="bg-slate-50 border-b border-slate-100">
          <tr>
            <th className="px-6 py-4 text-xs font-black text-slate-500 uppercase tracking-wider">Applicant</th>
            <th className="px-6 py-4 text-xs font-black text-slate-500 uppercase tracking-wider">Target Job / Domain</th>
            <th className="px-6 py-4 text-xs font-black text-slate-500 uppercase tracking-wider text-right">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-50">
          {data.map(app => (
            <tr 
              key={app.id} 
              className="hover:bg-slate-50 transition-colors cursor-pointer"
              onClick={() => onView(app)}
            >
              <td className="px-6 py-5">
                <p className="font-bold text-slate-800">{app.applicant_name || 'Anonymous'}</p>
                <p className="text-xs text-slate-500">{app.applicant_email || 'N/A'}</p>
              </td>
              <td className="px-6 py-5">
                <p className="font-medium text-slate-700">{app.job_title || 'General Application'}</p>
                <p className="text-xs text-emerald-600">{app.domain_name || 'N/A'}</p>
              </td>
              <td className="px-6 py-5 text-right space-x-3">
                <button 
                  onClick={(e) => { e.stopPropagation(); onView(app); }}
                  className="p-2 text-slate-500 hover:text-blue-600"
                  title="View Details"
                >
                  <Eye size={18} />
                </button>
                <button 
                  onClick={(e) => { e.stopPropagation(); onApprove(app.id); }}
                  className="p-2 text-emerald-600 hover:text-emerald-800"
                  title="Approve"
                >
                  <CheckCircle size={18} />
                </button>
                <button 
                  onClick={(e) => { e.stopPropagation(); onReject(app.id); }}
                  className="p-2 text-rose-600 hover:text-rose-800"
                  title="Reject"
                >
                  <XCircle size={18} />
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default ApplicationsTable;