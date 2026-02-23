import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, CheckCircle, Clock, Wallet, Globe, Send, Upload } from 'lucide-react';
import './JobDescription.css'; 

const JobDescriptionView = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [job, setJob] = useState(null);
  const [resume, setResume] = useState(null); // Separate state for the file
  const [formData, setFormData] = useState({
    first_name: '',
    second_name: '',
    email: '',
    relevant_experience: '',
  });
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    fetch(`http://localhost:8000/api/careers/careers/${id}`)
      .then(res => res.json())
      .then(data => setJob(data));
  }, [id]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);

    // CRITICAL: Use FormData for file uploads
    const dataToSend = new FormData();
    dataToSend.append('first_name', formData.first_name);
    dataToSend.append('second_name', formData.second_name);
    dataToSend.append('email', formData.email);
    dataToSend.append('relevant_experience', formData.relevant_experience);
    if (resume) {
      dataToSend.append('resume', resume); // The PDF file
    }
    dataToSend.append('job_id', id);

    try {
      const res = await fetch(`http://localhost:8000/api/careers/apply/${id}`, {
        method: 'POST',
        // Note: Do NOT set Content-Type header when sending FormData; 
        // the browser will set it automatically with the correct boundary.
        body: dataToSend
      });
      
      if (res.ok) setSuccess(true);
      else {
        const errorData = await res.json();
        alert(errorData.message || "Submission failed.");
      }
    } catch (err) {
      alert("Network error. Please check your connection.");
    } finally {
      setSubmitting(false);
    }
  };

  if (!job) return <div className="p-20 text-center font-bold text-emerald-600 animate-pulse">Loading Project Details...</div>;

  return (
    <div className="min-h-screen bg-slate-50 py-12 px-6">
      <div className="max-w-6xl mx-auto">
        <button 
          onClick={() => navigate('/CareerPublic')}
          className="flex items-center gap-2 text-slate-500 hover:text-emerald-600 font-bold mb-8 transition-colors"
        >
          <ArrowLeft size={20} /> Back to Projects
        </button>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
          {/* LEFT: JOB INFO */}
          <div className="lg:col-span-2 space-y-8">
            <div className="bg-white p-10 rounded-[40px] border border-slate-100 shadow-sm">
              <h1 className="text-4xl font-black text-slate-900 mb-4">{job.title}</h1>
              <div className="flex flex-wrap gap-4 mb-8">
                <span className="flex items-center gap-1.5 text-slate-500 bg-slate-50 px-4 py-2 rounded-full text-sm font-bold">
                  <Globe size={16} className="text-emerald-500" /> {job.location}
                </span>
                <span className="flex items-center gap-1.5 text-slate-500 bg-slate-50 px-4 py-2 rounded-full text-sm font-bold">
                  <Wallet size={16} className="text-emerald-500" /> {job.compensation}
                </span>
                <span className="flex items-center gap-1.5 text-slate-500 bg-slate-50 px-4 py-2 rounded-full text-sm font-bold">
                  <Clock size={16} className="text-emerald-500" /> {job.duration}
                </span>
              </div>

              <div className="prose prose-slate max-w-none">
                <h3 className="text-xl font-bold text-slate-800 mb-3">Project Overview</h3>
                <p className="text-slate-600 leading-relaxed mb-6">{job.description}</p>
                
                <h3 className="text-xl font-bold text-slate-800 mb-3">Requirements</h3>
                <ul className="grid grid-cols-1 md:grid-cols-2 gap-3 list-none p-0">
                  {job.required_skills?.map(skill => (
                    <li key={skill} className="flex items-center gap-2 text-slate-600 font-medium">
                      <CheckCircle size={18} className="text-emerald-500" /> {skill}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>

          {/* RIGHT: APPLICATION FORM */}
          <div className="lg:col-span-1">
            <div className="bg-slate-900 p-8 rounded-[40px] shadow-2xl sticky top-8 text-white">
              {success ? (
                <div className="text-center py-10">
                  <div className="w-20 h-20 bg-emerald-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
                    <CheckCircle size={40} className="text-emerald-400" />
                  </div>
                  <h3 className="text-2xl font-black mb-2 text-emerald-400">Application Sent!</h3>
                  <p className="text-slate-400">Our team will review your CV. Check your email for further instructions.</p>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-4">
                  <h3 className="text-2xl font-black mb-6 flex items-center gap-2">
                    Quick Apply <Send size={20} className="text-emerald-400" />
                  </h3>
                  
                  <div className="grid grid-cols-2 gap-3">
                    <input 
                      required
                      placeholder="First Name"
                      className="bg-white/10 border-none rounded-xl p-3 text-sm focus:ring-2 focus:ring-emerald-500"
                      onChange={e => setFormData({...formData, first_name: e.target.value})}
                    />
                    <input 
                      required
                      placeholder="Last Name"
                      className="bg-white/10 border-none rounded-xl p-3 text-sm focus:ring-2 focus:ring-emerald-500"
                      onChange={e => setFormData({...formData, second_name: e.target.value})}
                    />
                  </div>
                  
                  <input 
                    required
                    type="email"
                    placeholder="Email Address"
                    className="bg-white/10 border-none rounded-xl p-3 text-sm focus:ring-2 focus:ring-emerald-500 w-full"
                    onChange={e => setFormData({...formData, email: e.target.value})}
                  />

                  {/* RESUME UPLOAD ZONE */}
                  <div className="relative group">
                    <input 
                      required
                      type="file" 
                      accept=".pdf"
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                      onChange={(e) => setResume(e.target.files[0])}
                    />
                    <div className="bg-white/5 border-2 border-dashed border-white/20 rounded-xl p-4 flex flex-col items-center justify-center group-hover:border-emerald-400 transition-colors">
                      <Upload size={20} className="text-slate-400 group-hover:text-emerald-400 mb-1" />
                      <span className="text-[10px] font-bold text-slate-400 truncate max-w-full">
                        {resume ? resume.name : "Upload Resume (PDF)"}
                      </span>
                    </div>
                  </div>

                  <textarea 
                    placeholder="Relevant experience..."
                    rows="3"
                    className="bg-white/10 border-none rounded-xl p-3 text-sm focus:ring-2 focus:ring-emerald-500 w-full"
                    onChange={e => setFormData({...formData, relevant_experience: e.target.value})}
                  />

                  <button 
                    disabled={submitting}
                    className="w-full bg-[#489c8c] hover:bg-emerald-400 disabled:bg-slate-700 text-white font-black py-4 rounded-xl transition-all flex items-center justify-center gap-2 mt-2"
                  >
                    {submitting ? 'Uploading...' : 'Send Application'}
                  </button>
                  
                  <p className="text-[9px] text-center text-slate-500 mt-2 px-2">
                    By clicking send, you confirm your data is accurate and agree to collector payouts via M-Pesa.
                  </p>
                </form>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default JobDescriptionView;