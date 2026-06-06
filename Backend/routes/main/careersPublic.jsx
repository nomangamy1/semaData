// src/pages/careersPublic.jsx
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Sparkles, Search, MapPin, Clock, ArrowRight, Briefcase, Loader } from 'lucide-react';
import './careersPublic.css';

const CareersPage = () => {
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [category, setCategory] = useState('All');
  const navigate = useNavigate();

  useEffect(() => {
    const fetchJobs = async () => {
      try {
        // Correct blueprint URL mapping to Flask factory config
        const response = await fetch('http://localhost:8000/api/careers');
        if (!response.ok) throw new Error('Network response matching failed');
        const data = await response.json();
        
        // Destructure safely from the {"jobs": [...]} API dictionary envelope
        setJobs(data.jobs || []);
      } catch (err) {
        console.error("Fetch failed, utilizing local system fallback context:", err);
        setJobs([
          { id: 1, title: 'Voice Collector (Swahili)', location: 'Eldoret', field: 'Linguistics', type: 'Contract', compensation: 'Ksh 25,000' },
          { id: 2, title: 'Amharic Data Validator', location: 'Remote', field: 'Data', type: 'Full-time', compensation: 'Negotiable' },
          { id: 3, title: 'Python Backend Engineer', location: 'Nairobi', field: 'Engineering', type: 'Full-time', compensation: 'Competitive' }
        ]);
      } finally {
        setLoading(false);
      }
    };
    fetchJobs();
  }, []);

  // Filter evaluation matching the model attributes payload structure (.field instead of .category)
  const filteredJobs = jobs.filter(job => 
    job.title?.toLowerCase().includes(searchTerm.toLowerCase()) &&
    (category === 'All' || job.field === category)
  );

  return (
    <div className="careers-container">
      {/* Hero Header Presentation */}
      <header className="careers-hero">
        <div className="hero-content">
          <div className="badge">
            <Sparkles size={14} />
            <span>Join the SemaData Mission</span>
          </div>
          <h1>Build the future of <span className="highlight">African AI.</span></h1>
          <p>Join a team working on high-impact linguistic datasets.</p>
        </div>
      </header>

      {/* Control Navigation Filters Wrapper Block */}
      <section className="search-wrapper">
        <div className="search-card">
          <div className="search-input-group">
            <Search className="icon" size={20} />
            <input 
              type="text" 
              placeholder="Search roles or languages..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <select onChange={(e) => setCategory(e.target.value)} className="category-select">
            <option value="All">All Categories</option>
            <option value="Linguistics">Linguistics</option>
            <option value="Data">Data Collection</option>
            <option value="Engineering">Engineering</option>
          </select>
        </div>
      </section>

      {/* Grid Iteration Area Component Container */}
      <main className="jobs-grid-container">
        {loading ? (
          <div className="loader-box"><Loader className="spinner" size={40} /></div>
        ) : (
          <div className="jobs-grid">
            {filteredJobs.length === 0 ? (
              <div className="w-full text-center py-12 text-slate-500 font-medium">
                No active openings found matching your chosen filter options.
              </div>
            ) : filteredJobs.map((job) => (
              <article 
                key={job.id} 
                className="job-card"
                onClick={() => navigate(`/careers/${job.id}`)}
              >
                <div className="card-header">
                  <div className="icon-box"><Briefcase size={22} /></div>
                  <span className="job-type">{job.type || 'Contract'}</span>
                </div>
                <h3>{job.title}</h3>
                <div className="card-meta">
                  <span><MapPin size={14}/> {job.location || 'Remote'}</span>
                  <span className="text-emerald-600 font-bold">{job.compensation || 'Negotiable'}</span>
                </div>
                <button className="apply-btn">
                  View & Apply <ArrowRight size={16} />
                </button>
              </article>
            ))}
          </div>
        )}
      </main>
    </div>
  );
};

export default CareersPage;
