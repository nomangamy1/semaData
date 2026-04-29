import React from 'react';
import { useParams } from 'react-router-dom';
import './AdminShared.css'; // <--- Importing the new separate CSS
import { X, CheckCircle, XCircle, MapPin, Globe, FileText, Calendar, Briefcase, User, Info, Mail } from 'lucide-react';
const ApplicantModal = ({ applicant, onClose, onApprove, onReject }) => {
  
  if (!applicant) return null;

  return (
    <div className="modal-overlay">
      <div className="modal-container animate-in">
        
        {/* Header Section */}
        <header className="modal-header">
          <div className="flex justify-between items-start">
            <div className="flex gap-6 items-center">
              <div className="profile-avatar">
                {applicant.first_name[0]}{applicant.second_name[0]}
              </div>
              <div>
                <h2 className="text-3xl font-black italic">{applicant.first_name} {applicant.second_name}</h2>
                <div className="flex gap-4 mt-2 text-slate-400 text-xs font-bold uppercase tracking-widest">
                  <span className="flex items-center gap-1"><MapPin size={14}/> {applicant.country || 'Remote'}</span>
                  <span className="flex items-center gap-1 text-emerald-400"><Globe size={14}/> {applicant.domain_name}</span>
                </div>
              </div>
            </div>
            <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-xl transition-colors text-slate-400">
              <X size={24} />
            </button>
          </div>
        </header>

        {/* Body Section */}
        <div className="flex-1 overflow-y-auto p-10 admin-scroll grid grid-cols-12 gap-10 bg-white">
          <div className="col-span-7 space-y-8">
            <div className="detail-grid">
              <DetailBox icon={<Mail size={14}/>} label="Email" value={applicant.email} />
              <DetailBox icon={<Calendar size={14}/>} label="Applied" value={new Date(applicant.created_at).toLocaleDateString()} />
              <DetailBox icon={<Briefcase size={14}/>} label="Role" value={applicant.job_title} />
              <DetailBox icon={<User size={14}/>} label="ID" value={`#${applicant.id}`} />
            </div>
            
            <div className="bg-slate-50 p-6 rounded-3xl border border-slate-100">
              <h4 className="text-[10px] font-black text-slate-400 uppercase mb-2 tracking-widest">Applicant Intent</h4>
              <p className="text-slate-600 italic font-medium">Interested in linguistic modeling and data scaling.</p>
            </div>
          </div>

          <div className="col-span-5">
            <div className="cv-preview-box">
              <FileText size={40} className="mx-auto text-emerald-500 mb-3" />
              <h4 className="font-black text-slate-900 uppercase text-sm">Curriculum Vitae</h4>
              <button className="mt-4 w-full bg-white border border-emerald-200 py-2 rounded-xl text-sm font-bold hover:shadow-md transition-all">
                Download PDF
              </button>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <footer className="p-8 bg-slate-50 border-t border-slate-100 flex justify-end gap-4">
          <button onClick={() => onReject(applicant.id)} className="px-6 py-3 text-rose-500 font-black border-2 border-rose-100 rounded-2xl hover:bg-rose-500 hover:text-white transition-all">
            Reject
          </button>
          <button onClick={() => onApprove(applicant.id)} className="px-10 py-3 bg-slate-900 text-white font-black rounded-2xl hover:bg-emerald-500 transition-all shadow-lg">
            Approve Applicant
          </button>
        </footer>
      </div>
    </div>
  );
};

const DetailBox = ({ icon, label, value }) => (
  <div className="p-4 bg-white border border-slate-100 rounded-2xl shadow-sm">
    <div className="flex items-center gap-2 text-slate-400 mb-1">{icon} <span className="text-[9px] font-black uppercase">{label}</span></div>
    <p className="font-bold text-slate-800 text-xs truncate">{value}</p>
  </div>
);

export default ApplicantModal;