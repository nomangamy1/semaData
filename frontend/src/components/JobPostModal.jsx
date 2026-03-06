import React, { useState } from 'react';
import { X, Briefcase, MapPin, DollarSign, Clock, FileText, PlusCircle, Layers, AlertCircle } from 'lucide-react';
import './JobPostModal.css';

const JobPostModal = ({ isOpen, onClose, domains = [], onPublish }) => {
  const [jobData, setJobData] = useState({
    title: '',
    domain_id: '',
    custom_domain_name: '',
    location: '',
    compensation: '',
    duration: '',
    description: '',
    required_skills: '',
    field: '' // Added field to match backend requirement
  });

  const [useCustomDomain, setUseCustomDomain] = useState(false);
  const [formErrors, setFormErrors] = useState({});

  if (!isOpen) return null;

  const validateForm = () => {
    const errors = {};
    if (!jobData.title.trim()) errors.title = "Job title is required";
    if (!useCustomDomain && !jobData.domain_id) errors.domain = "Please select a domain or use custom";
    if (useCustomDomain && !jobData.custom_domain_name.trim()) errors.custom_domain_name = "Custom domain name is required";
    if (!jobData.field.trim()) errors.field = "Field/category is required";
    if (!jobData.location.trim()) errors.location = "Location is required";
    if (!jobData.compensation.trim()) errors.compensation = "Compensation is required";
    if (!jobData.duration.trim()) errors.duration = "Duration is required";
    if (!jobData.description.trim()) errors.description = "Description is required";
    if (!jobData.required_skills.trim()) errors.required_skills = "Required skills are required";

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    if (!validateForm()) {
      alert("Please fill all required fields.");
      return;
    }

    const formattedData = {
      ...jobData,
      required_skills: jobData.required_skills.split(',').map(s => s.trim()).filter(s => s !== ""),
      domain_id: useCustomDomain ? null : jobData.domain_id,
      domain_name: useCustomDomain ? jobData.custom_domain_name : undefined
    };

    console.log("Submitting job data:", formattedData); // Debug
    onPublish(formattedData);
  };

  return (
    <div className="modal-overlay">
      <div className="modal-container animate-in">
        {/* Header */}
        <header className="modal-header">
          <div className="flex justify-between items-center w-full">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-emerald-500/20 text-emerald-400 rounded-2xl">
                <PlusCircle size={24} />
              </div>
              <div>
                <h2 className="text-2xl font-black italic text-white uppercase tracking-tight">
                  Deploy New Project
                </h2>
                <p className="text-slate-300 text-sm">Careers Portal Management</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-white/10 rounded-xl transition-colors text-white"
            >
              <X size={28} />
            </button>
          </div>
        </header>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="modal-body bg-white p-8 md:p-10 space-y-8 overflow-y-auto max-h-[75vh]">
          {/* Domain Selection */}
          <div className="space-y-4">
            <label className="block text-sm font-semibold text-slate-700 flex items-center gap-2">
              <Layers size={18} /> Target Knowledge Domain
            </label>

            <select
              className="admin-input-field w-full"
              value={jobData.domain_id}
              onChange={(e) => {
                const val = e.target.value;
                setJobData({ ...jobData, domain_id: val });
                setUseCustomDomain(val === 'custom');
              }}
            >
              <option value="">Select a Client Domain...</option>
              {domains.length > 0 ? (
                domains.map(d => (
                  <option key={d.id} value={d.id}>
                    {d.name} {d.reference_number ? `(${d.reference_number})` : ''}
                  </option>
                ))
              ) : (
                <option disabled>No domains registered yet</option>
              )}
              <option value="custom">Other / Custom Domain...</option>
            </select>

            {useCustomDomain && (
              <div className="mt-4">
                <input
                  type="text"
                  placeholder="Enter custom domain name (e.g. Health Research Kenya)"
                  className={`admin-input-field w-full ${formErrors.custom_domain_name ? 'border-red-500' : ''}`}
                  value={jobData.custom_domain_name}
                  onChange={(e) => setJobData({ ...jobData, custom_domain_name: e.target.value })}
                />
                {formErrors.custom_domain_name && (
                  <p className="text-red-500 text-xs mt-1">{formErrors.custom_domain_name}</p>
                )}
                <p className="text-xs text-slate-500 mt-1 italic">
                  This job will be posted without linking to an existing domain owner.
                </p>
              </div>
            )}

            {domains.length === 0 && !useCustomDomain && (
              <p className="text-amber-600 text-sm mt-2 flex items-center gap-2">
                <AlertCircle size={16} /> No domains found — please use custom name above.
              </p>
            )}
          </div>

          {/* Grid for other fields */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <AdminInput
              label="Project Title"
              icon={<Briefcase size={16} />}
              placeholder="e.g. Zulu Audio Transcription Specialist"
              value={jobData.title}
              onChange={(val) => setJobData({ ...jobData, title: val })}
              error={formErrors.title}
            />

            <AdminInput
              label="Field / Category"
              icon={<Layers size={16} />}
              placeholder="e.g. Agriculture, Health, Linguistics"
              value={jobData.field}
              onChange={(val) => setJobData({ ...jobData, field: val })}
              error={formErrors.field}
            />

            <AdminInput
              label="Location"
              icon={<MapPin size={16} />}
              placeholder="e.g. Remote / Nairobi / Kisumu"
              value={jobData.location}
              onChange={(val) => setJobData({ ...jobData, location: val })}
              error={formErrors.location}
            />

            <AdminInput
              label="Pay Rate"
              icon={<DollarSign size={16} />}
              placeholder="e.g. KSh 250 per hour / KSh 45,000 monthly"
              value={jobData.compensation}
              onChange={(val) => setJobData({ ...jobData, compensation: val })}
              error={formErrors.compensation}
            />

            <AdminInput
              label="Timeline / Duration"
              icon={<Clock size={16} />}
              placeholder="e.g. 6 weeks / 3 months / Ongoing"
              value={jobData.duration}
              onChange={(val) => setJobData({ ...jobData, duration: val })}
              error={formErrors.duration}
            />
          </div>

          {/* Skills & Description */}
          <div className="space-y-6">
            <div className="space-y-2">
              <label className="block text-sm font-semibold text-slate-700 flex items-center gap-2">
                <FileText size={16} /> Required Skills (comma separated)
              </label>
              <input
                className={`admin-input-field w-full ${formErrors.required_skills ? 'border-red-500' : ''}`}
                placeholder="Luhya Dialect Knowledge, Audio Editing, Field Recording, Fast Typing..."
                value={jobData.required_skills}
                onChange={(e) => setJobData({ ...jobData, required_skills: e.target.value })}
              />
              {formErrors.required_skills && (
                <p className="text-red-500 text-xs mt-1">{formErrors.required_skills}</p>
              )}
            </div>

            <div className="space-y-2">
              <label className="block text-sm font-semibold text-slate-700">Job Brief & Instructions</label>
              <textarea
                rows={5}
                className={`admin-input-field w-full resize-y min-h-[120px] ${formErrors.description ? 'border-red-500' : ''}`}
                placeholder="Describe the data collection goals, quality standards, tools needed, timeline, and any specific instructions..."
                value={jobData.description}
                onChange={(e) => setJobData({ ...jobData, description: e.target.value })}
              />
              {formErrors.description && (
                <p className="text-red-500 text-xs mt-1">{formErrors.description}</p>
              )}
            </div>
          </div>
        </form>

        {/* Footer */}
        <footer className="p-6 bg-slate-50 border-t border-slate-100 flex justify-end gap-4">
          <button
            type="button"
            onClick={onClose}
            className="px-6 py-3 text-slate-600 font-medium hover:text-slate-800 transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            onClick={handleSubmit}
            className="px-8 py-3 bg-emerald-600 text-white font-semibold rounded-xl hover:bg-emerald-700 transition-all shadow-md active:scale-95 flex items-center gap-2"
          >
            <PlusCircle size={18} />
            Deploy to Careers Page
          </button>
        </footer>
      </div>
    </div>
  );
};

const AdminInput = ({ label, icon, placeholder, value, onChange, error }) => (
  <div className="space-y-2">
    <label className="block text-sm font-semibold text-slate-700 flex items-center gap-2">
      {icon} {label}
    </label>
    <input
      className={`admin-input-field w-full ${error ? 'border-red-500' : ''}`}
      placeholder={placeholder}
      value={value}
      onChange={(e) => onChange(e.target.value)}
    />
    {error && <p className="text-red-500 text-xs mt-1">{error}</p>}
  </div>
);

export default JobPostModal;