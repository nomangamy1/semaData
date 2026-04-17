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
        const response = await fetch('http://localhost:5000/api/jobs');
        if (!response.ok) throw new Error('Network error');
        const data = await response.json();
        setJobs(data);
      } catch (err) {
        console.error("Fetch failed, using local fallback:", err);
        setJobs([
          { id: 1, title: 'Voice Collector (Swahili)', location: 'Eldoret', category: 'Linguistics', type: 'Contract' },
          { id: 2, title: 'Amharic Data Validator', location: 'Remote', category: 'Data', type: 'Full-time' },
          { id: 3, title: 'Python Backend Engineer', location: 'Nairobi', category: 'Engineering', type: 'Full-time' }
        ]);
      } finally {
        setLoading(false);
      }
    };
    fetchJobs();
  }, []);

  const filteredJobs = jobs.filter(job => 
    job.title.toLowerCase().includes(searchTerm.toLowerCase()) &&
    (category === 'All' || job.category === category)
  );

  return (
    <div className="careers-container">
      {/* Hero Section */}
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

      {/* Floating Search Section */}
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

      {/* Results Grid */}
      <main className="jobs-grid-container">
        {loading ? (
          <div className="loader-box"><Loader className="spinner" size={40} /></div>
        ) : (
          <div className="jobs-grid">
            {filteredJobs.map((job) => (
              <article 
                key={job.id} 
                className="job-card"
                onClick={() => navigate(`/careers/${job.id}`)}
              >
                <div className="card-header">
                  <div className="icon-box"><Briefcase size={22} /></div>
                  <span className="job-type">{job.type}</span>
                </div>
                <h3>{job.title}</h3>
                <div className="card-meta">
                  <span><MapPin size={14}/> {job.location}</span>
                  <span><Clock size={14}/> Newly Added</span>
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
