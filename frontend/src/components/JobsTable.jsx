// src/components/JobsTable.jsx
import React from 'react';
import { Trash2, ExternalLink } from 'lucide-react';

const JobsTable = ({ jobs, onDelete }) => {
  if (!jobs || jobs.length === 0) {
    return (
      <div className="py-20 text-center bg-white rounded-3xl border border-dashed border-slate-200">
        <Briefcase className="mx-auto text-slate-300 mb-4" size={64} />
        <h3 className="text-xl font-bold text-slate-600 mb-2">No Jobs Posted Yet</h3>
        <p className="text-slate-500">Click "New Job Posting" to create your first career opportunity.</p>
      </div>
    );
  }

  return (
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
          {jobs.map(job => (
            <tr key={job.id} className="hover:bg-slate-50 transition-colors">
              <td className="px-6 py-5">
                <p className="font-bold text-slate-800">{job.title}</p>
                <p className="text-xs text-slate-500">{job.field || 'General'}</p>
              </td>
              <td className="px-6 py-5">
                <span className="px-3 py-1 bg-emerald-50 text-emerald-700 rounded-full text-xs font-bold uppercase">
                  {job.domain_name || 'N/A'}
                </span>
              </td>
              <td className="px-6 py-5">
                <p className="text-sm font-medium text-slate-700">{job.location || 'Remote'}</p>
                <p className="text-xs text-emerald-600 font-bold">{job.compensation || 'Negotiable'}</p>
              </td>
              <td className="px-6 py-5 text-right space-x-3">
                <button 
                  onClick={() => window.open(job.application_link || '#', '_blank')}
                  className="p-2 text-slate-500 hover:text-blue-600"
                  title="View Public Posting"
                >
                  <ExternalLink size={18} />
                </button>
                <button 
                  onClick={() => onDelete?.(job.id)}
                  className="p-2 text-rose-600 hover:text-rose-800"
                  title="Delete Job"
                >
                  <Trash2 size={18} />
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};


export default JobsTable;