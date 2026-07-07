import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, CheckCircle, Clock, Wallet, Globe, Send, Upload } from 'lucide-react';
import './JobDescription.css'; 

const JobDescriptionView = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [job, setJob] = useState(null);
  const [resume, setResume] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [formData, setFormData] = useState({
    first_name: '',
    second_name: '',
    email: '',
    relevant_experience: '',
  });
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    const fetchJob = async () => {
      try {
        setLoading(true);
        const response = await fetch(`http://localhost:8000/api/careers/${id}`);
        if (!response.ok) {
          throw new Error(`Failed to fetch job: ${response.status}`);
        }
        const data = await response.json();
        setJob(data);
        setError(null);
      } catch (err) {
        console.error('Error fetching job:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    
    if (id) {
      fetchJob();
    }
  }, [id]);

  const handleFormChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleResumeChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      setResume(e.target.files[0]);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.first_name.trim() || !formData.second_name.trim() || !formData.email.trim()) {
      alert('Please fill in all required fields');
      return;
    }

    if (!resume) {
      alert('Please upload your resume (PDF)');
      return;
    }

    setSubmitting(true);

    try {
      const dataToSend = new FormData();
      dataToSend.append('first_name', formData.first_name);
      dataToSend.append('second_name', formData.second_name);
      dataToSend.append('email', formData.email);
      dataToSend.append('relevant_experience', formData.relevant_experience || '');
      dataToSend.append('cv_file_path', resume);
      dataToSend.append('job_id', id);

      const res = await fetch(`http://localhost:8000/api/apply/${id}`, {
        method: 'POST',
        body: dataToSend
      });

      if (res.ok) {
        setSuccess(true);
        // Reset form after successful submission
        setTimeout(() => {
          setFormData({
            first_name: '',
            second_name: '',
            email: '',
            relevant_experience: '',
          });
          setResume(null);
        }, 2000);
      } else {
        const errorData = await res.json();
        alert(errorData.message || 'Submission failed. Please try again.');
      }
    } catch (err) {
      console.error('Submission error:', err);
      alert('Network error. Please check your connection and try again.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="p-20 text-center font-bold text-emerald-600 animate-pulse">
        Loading Project Details...
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-slate-50 py-12 px-6">
        <div className="max-w-6xl mx-auto">
          <button 
            onClick={() => navigate('/careers')}
            className="flex items-center gap-2 text-slate-500 hover:text-emerald-600 font-bold mb-8 transition-colors"
          >
            <ArrowLeft size={20} /> Back to Projects
          </button>
          <div className="bg-red-50 border border-red-200 rounded-xl p-8 text-center">
            <p className="text-red-600 font-semibold mb-4">Error loading job details</p>
            <p className="text-red-500 text-sm mb-6">{error}</p>
            <button
              onClick={() => navigate('/careers')}
              className="bg-red-600 hover:bg-red-700 text-white px-6 py-2 rounded-lg font-bold"
            >
              Return to Careers
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!job) {
    return (
      <div className="min-h-screen bg-slate-50 py-12 px-6">
        <div className="max-w-6xl mx-auto">
          <button 
            onClick={() => navigate('/careers')}
            className="flex items-center gap-2 text-slate-500 hover:text-emerald-600 font-bold mb-8 transition-colors"
          >
            <ArrowLeft size={20} /> Back to Projects
          </button>
          <div className="text-center py-12">
            <p className="text-slate-500 font-semibold">Job not found</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 py-12 px-6">
      <div className="max-w-6xl mx-auto">
        <button 
          onClick={() => navigate('/careers')}
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
                  <Globe size={16} className="text-emerald-500" /> {job.location || 'Remote'}
                </span>
                <span className="flex items-center gap-1.5 text-slate-500 bg-slate-50 px-4 py-2 rounded-full text-sm font-bold">
                  <Wallet size={16} className="text-emerald-500" /> {job.compensation || 'Negotiable'}
                </span>
                <span className="flex items-center gap-1.5 text-slate-500 bg-slate-50 px-4 py-2 rounded-full text-sm font-bold">
                  <Clock size={16} className="text-emerald-500" /> {job.duration || job.type || 'Contract'}
                </span>
              </div>

              <div className="prose prose-slate max-w-none">
                <h3 className="text-xl font-bold text-slate-800 mb-3">Project Overview</h3>
                <p className="text-slate-600 leading-relaxed mb-6">{job.description || 'No description available'}</p>
                
                {job.required_skills && job.required_skills.length > 0 && (
                  <>
                    <h3 className="text-xl font-bold text-slate-800 mb-3">Requirements</h3>
                    <ul className="grid grid-cols-1 md:grid-cols-2 gap-3 list-none p-0">
                      {job.required_skills.map((skill, index) => (
                        <li key={index} className="flex items-center gap-2 text-slate-600 font-medium">
                          <CheckCircle size={18} className="text-emerald-500" /> {skill}
                        </li>
                      ))}
                    </ul>
                  </>
                )}
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
                  <p className="text-slate-400 text-sm">Our team will review your CV. Check your email for further instructions.</p>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-4">
                  <h3 className="text-2xl font-black mb-6 flex items-center gap-2">
                    Quick Apply <Send size={20} className="text-emerald-400" />
                  </h3>
                  
                  <div className="grid grid-cols-2 gap-3">
                    <input 
                      required
                      type="text"
                      placeholder="First Name"
                      value={formData.first_name}
                      onChange={e => handleFormChange('first_name', e.target.value)}
                      className="bg-white/10 border border-white/20 rounded-xl p-3 text-sm focus:ring-2 focus:ring-emerald-500 focus:border-transparent text-white placeholder-slate-400"
                    />
                    <input 
                      required
                      type="text"
                      placeholder="Last Name"
                      value={formData.second_name}
                      onChange={e => handleFormChange('second_name', e.target.value)}
                      className="bg-white/10 border border-white/20 rounded-xl p-3 text-sm focus:ring-2 focus:ring-emerald-500 focus:border-transparent text-white placeholder-slate-400"
                    />
                  </div>
                  
                  <input 
                    required
                    type="email"
                    placeholder="Email Address"
                    value={formData.email}
                    onChange={e => handleFormChange('email', e.target.value)}
                    className="bg-white/10 border border-white/20 rounded-xl p-3 text-sm focus:ring-2 focus:ring-emerald-500 focus:border-transparent w-full text-white placeholder-slate-400"
                  />

                  {/* RESUME UPLOAD ZONE */}
                  <div className="relative group">
                    <input 
                      required
                      type="file" 
                      accept=".pdf"
                      onChange={handleResumeChange}
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                    />
                    <div className="bg-white/5 border-2 border-dashed border-white/20 rounded-xl p-4 flex flex-col items-center justify-center group-hover:border-emerald-400 transition-colors cursor-pointer">
                      <Upload size={20} className="text-slate-400 group-hover:text-emerald-400 mb-1" />
                      <span className="text-[10px] font-bold text-slate-400 truncate max-w-full text-center">
                        {resume ? resume.name : "Upload Resume (PDF)"}
                      </span>
                    </div>
                  </div>

                  <textarea 
                    placeholder="Relevant experience..."
                    rows="3"
                    value={formData.relevant_experience}
                    onChange={e => handleFormChange('relevant_experience', e.target.value)}
                    className="bg-white/10 border border-white/20 rounded-xl p-3 text-sm focus:ring-2 focus:ring-emerald-500 focus:border-transparent w-full text-white placeholder-slate-400 resize-none"
                  />

                  <button 
                    type="submit"
                    disabled={submitting}
                    className="w-full bg-emerald-500 hover:bg-emerald-600 disabled:bg-slate-700 disabled:cursor-not-allowed text-white font-black py-4 rounded-xl transition-all flex items-center justify-center gap-2 mt-2"
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
