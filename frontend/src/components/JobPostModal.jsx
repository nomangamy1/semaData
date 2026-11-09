// src/components/JobPostModal.jsx
import React, { useState } from 'react';
import { X, Briefcase, MapPin, DollarSign, Clock, FileText, PlusCircle, Layers } from 'lucide-react';
import './JobPostModal.css'; // FIXED: Switched to the correct stylesheet

const JobPostModal = ({
  isOpen,
  onClose,
  domains = [],
  domainsLoading = false,
  domainsError = '',
  onPublish,
}) => {
  const [jobData, setJobData] = useState({
    title: '',
    domain_id: '',
    custom_domain_name: '',
    location: '',
    compensation: '',
    duration: '',
    description: '',
    required_skills: '',
    field: '',
    visibility: 'public',
    invite_emails: '',
  });

  const [useCustomDomain, setUseCustomDomain] = useState(false);
  const [formErrors, setFormErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);

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
    if (jobData.visibility === 'private') {
      if (useCustomDomain || !jobData.domain_id) {
        errors.domain = "Private jobs must use a registered domain";
      }
      const inviteEmails = jobData.invite_emails.split(',').map(email => email.trim()).filter(Boolean);
      if (!inviteEmails.length) errors.invite_emails = "Add at least one invitee email";
      else if (inviteEmails.some(email => !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))) {
        errors.invite_emails = "Enter valid email addresses separated by commas";
      }
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    const formattedData = {
      ...jobData,
      required_skills: jobData.required_skills.split(',').map(s => s.trim()).filter(s => s !== ""),
      domain_id: useCustomDomain ? null : jobData.domain_id,
      domain_name: useCustomDomain ? jobData.custom_domain_name : undefined,
      visibility: jobData.visibility,
      invite_emails: jobData.visibility === 'private'
        ? jobData.invite_emails.split(',').map(email => email.trim()).filter(Boolean)
        : [],
    };

    setIsSubmitting(true);
    try {
      await onPublish(formattedData);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal-container">
        {/* Header wrapper mapped to match CSS bindings */}
        <header className="modal-header">
          <div style={{ display: 'flex', justifyContent: 'between', alignItems: 'center', width: '100%' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <div style={{ padding: '0.75rem', background: 'rgba(255,255,255,0.15)', borderRadius: '1rem' }}>
                <PlusCircle size={24} />
              </div>
              <div>
                <h2>Deploy New Project</h2>
                <p>Careers Portal Management</p>
              </div>
            </div>
            <button onClick={onClose} aria-label="Close Modal">
              <X size={24} />
            </button>
          </div>
        </header>

        {/* Form elements utilizing admin-scroll custom utility */}
        <form id="job-post-form"   onSubmit={handleSubmit} className="modal-body admin-scroll">
          
          {/* Target Knowledge Domain */}
          <div style={{ marginBottom: '1.75rem' }}>
            <label>
              <Layers size={14} style={{ marginRight: '0.25rem', display: 'inline', verticalAlign: 'text-bottom' }} /> 
              Target Knowledge Domain
            </label>
            <select
              className={`admin-input-field ${formErrors.domain ? 'error' : ''}`}
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
                    {d.domain_name || d.name} {d.reference_number ? `(${d.reference_number})` : ''}
                    {d.review_status && d.review_status !== 'accepted' ? ` - ${d.review_status} review` : ''}
                  </option>
                ))
              ) : (
                <option disabled>
                  {domainsLoading ? 'Loading registered domains...' : 'No registered domains available'}
                </option>
              )}
              <option value="custom">Other / Custom Domain...</option>
            </select>

            {domainsError && <p role="alert" style={{ color: 'var(--error)', fontSize: '0.75rem', marginTop: '0.5rem' }}>{domainsError}</p>}

            {useCustomDomain && (
              <div style={{ marginTop: '1rem' }}>
                <input
                  type="text"
                  placeholder="Enter custom domain name (e.g. Health Research Kenya)"
                  className={`admin-input-field ${formErrors.custom_domain_name ? 'error' : ''}`}
                  value={jobData.custom_domain_name}
                  onChange={(e) => setJobData({ ...jobData, custom_domain_name: e.target.value })}
                />
                {formErrors.custom_domain_name && (
                  <p style={{ color: 'var(--error)', fontSize: '0.75rem', marginTop: '0.25rem' }}>{formErrors.custom_domain_name}</p>
                )}
                <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem', fontStyle: 'italic' }}>
                  This job will be posted without linking to an existing domain owner.
                </p>
              </div>
            )}
          </div>

          <div style={{ marginTop: '1.5rem' }}>
            <label htmlFor="job-visibility">Job visibility</label>
            <select
              id="job-visibility"
              className="admin-input-field"
              value={jobData.visibility}
              onChange={(e) => setJobData({ ...jobData, visibility: e.target.value })}
            >
              <option value="public">Public — visible on careers page</option>
              <option value="private">Private — invitation required</option>
            </select>
            {jobData.visibility === 'private' && (
              <div style={{ marginTop: '1rem' }}>
                <label htmlFor="job-invite-emails">Invitee email addresses</label>
                <textarea
                  id="job-invite-emails"
                  rows={3}
                  className={`admin-input-field ${formErrors.invite_emails ? 'error' : ''}`}
                  placeholder="person@example.com, another@example.com"
                  value={jobData.invite_emails}
                  onChange={(e) => setJobData({ ...jobData, invite_emails: e.target.value })}
                />
                {formErrors.invite_emails && (
                  <p role="alert" style={{ color: 'var(--error)', fontSize: '0.75rem', marginTop: '0.25rem' }}>
                    {formErrors.invite_emails}
                  </p>
                )}
                <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                  Each invitee receives a private link showing the domain reference and collection details. Applications go to the admin team for review.
                </p>
              </div>
            )}
          </div>

          {/* Input Grid Mapping to JobPostModal.css grid layout styling */}
          <div className="grid-2">
            <AdminInput
              label="Project Title"
              icon={<Briefcase size={14} />}
              placeholder="e.g. Zulu Audio Transcription Specialist"
              value={jobData.title}
              onChange={(val) => setJobData({ ...jobData, title: val })}
              error={formErrors.title}
            />

            <AdminInput
              label="Field / Category"
              icon={<Layers size={14} />}
              placeholder="e.g. Agriculture, Health, Linguistics"
              value={jobData.field}
              onChange={(val) => setJobData({ ...jobData, field: val })}
              error={formErrors.field}
            />

            <AdminInput
              label="Location"
              icon={<MapPin size={14} />}
              placeholder="e.g. Remote / Nairobi / Kisumu"
              value={jobData.location}
              onChange={(val) => setJobData({ ...jobData, location: val })}
              error={formErrors.location}
            />

            <AdminInput
              label="Pay Rate"
              icon={<DollarSign size={14} />}
              placeholder="e.g. KSh 250 per hour / KSh 45,000 monthly"
              value={jobData.compensation}
              onChange={(val) => setJobData({ ...jobData, compensation: val })}
              error={formErrors.compensation}
            />

            <AdminInput
              label="Timeline / Duration"
              icon={<Clock size={14} />}
              placeholder="e.g. 6 weeks / 3 months / Ongoing"
              value={jobData.duration}
              onChange={(val) => setJobData({ ...jobData, duration: val })}
              error={formErrors.duration}
            />
          </div>

          {/* Full-width Elements Area */}
          <div style={{ marginTop: '1.75rem' }}>
            <div style={{ marginBottom: '1.5rem' }}>
              <label>
                <FileText size={14} style={{ marginRight: '0.25rem', display: 'inline', verticalAlign: 'text-bottom' }} /> 
                Required Skills (comma separated)
              </label>
              <input
                className={`admin-input-field ${formErrors.required_skills ? 'error' : ''}`}
                placeholder="Luhya Dialect Knowledge, Audio Editing, Field Recording, Fast Typing..."
                value={jobData.required_skills}
                onChange={(e) => setJobData({ ...jobData, required_skills: e.target.value })}
              />
              {formErrors.required_skills && (
                <p style={{ color: 'var(--error)', fontSize: '0.75rem', marginTop: '0.25rem' }}>{formErrors.required_skills}</p>
              )}
            </div>

            <div>
              <label>Job Brief & Instructions</label>
              <textarea
                rows={5}
                className={`admin-input-field ${formErrors.description ? 'error' : ''}`}
                placeholder="Describe the data collection goals, quality standards, tools needed..."
                value={jobData.description}
                onChange={(e) => setJobData({ ...jobData, description: e.target.value })}
              />
              {formErrors.description && (
                <p style={{ color: 'var(--error)', fontSize: '0.75rem', marginTop: '0.25rem' }}>{formErrors.description}</p>
              )}
            </div>
          </div>
        </form>

        {/* Modal Actions Footer styling wrapper */}
        <footer className="modal-footer">
         <button type="button" onClick={onClose} disabled={isSubmitting}>
         Cancel
          </button>
           {/* Add the form="job-post-form" attribute and ensure the form has that ID */}
            <button type="submit" form="job-post-form" disabled={isSubmitting}>
            {isSubmitting ? 'Publishing...' : jobData.visibility === 'private' ? 'Create & Invite' : 'Deploy to Careers Page'}
             </button>
             </footer>
              </div>
    </div>
  );
};

const AdminInput = ({ label, icon, placeholder, value, onChange, error }) => (
  <div style={{ marginBottom: '0.5rem' }}>
    <label style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
      {icon} {label}
    </label>
    <input
      className={`admin-input-field ${error ? 'error' : ''}`}
      placeholder={placeholder}
      value={value}
      onChange={(e) => onChange(e.target.value)}
    />
    {error && <p style={{ color: 'var(--error)', fontSize: '0.75rem', marginTop: '0.25rem' }}>{error}</p>}
  </div>
);

export default JobPostModal;
