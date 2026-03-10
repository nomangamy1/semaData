import React from 'react';
import './AboutUs.css';
import { Shield, Cpu, Globe, Users, Award } from 'lucide-react';
import founderPhoto from '../assets/founderIan.png';
import rvttilogo    from '../assets/RVTTI-LOGO.gif';

const features = [
  {
    icon: <Cpu  className="feature-icon feature-icon--blue"  />,
    title: "Faster-Model Inference",
    description: "Utilizing high technology for real-time, high-accuracy dialect transcription."
  },
  {
    icon: <Shield className="feature-icon feature-icon--green" />,
    title: "Data Provenance",
    description: "Secure session aggregation with identity verification for research integrity."
  },
  {
    icon: <Globe  className="feature-icon feature-icon--purple" />,
    title: "Linguistic Preservation",
    description: "Capturing and segmenting rare dialect features through advanced NLP matching techniques."
  },
  {
    icon: <Users  className="feature-icon feature-icon--orange" />,
    title: "Collaborative Research",
    description: "A centralized platform for innovation heads and researchers to manage datasets."
  }
];

const AboutUs = () => (
  <div className="about-container">
    <div className="about-inner">

      {/* ── Header ── */}
      <div className="about-header">
        <h1 className="main-title">SemaData Platform</h1>
        <p className="about-subtitle">
          The next generation of linguistic data ingestion, bridging the gap between
          innovative problem solving ideas and local data.
        </p>
      </div>

      {/* ── Mission & Vision ── */}
      <div className="mv-grid">
        <div className="mv-card">
          <h2 className="section-heading">Our Mission</h2>
          <p className="mv-text">
            Our mission is to end data scarcity in Africa by developing real-world
            applicative tools that empower local communities and fuel innovation
            through authentic data.
          </p>
          <blockquote className="quote-border">
            "Turning day to day conversations and activities into problem solving datasets."
          </blockquote>
        </div>
        <div className="mv-card">
          <h2 className="section-heading">Our Vision</h2>
          <p className="mv-text">
            Our vision is to bridge the global digital divide by becoming the leading
            provider of ground-truth African data for healthcare and beyond.
          </p>
        </div>
      </div>

      {/* ── Feature Cards ── */}
      <div className="features-grid">
        {features.map((f, i) => (
          <div key={i} className="feature-card">
            <div className="feature-icon-wrap">{f.icon}</div>
            <h4 className="feature-title">{f.title}</h4>
            <p className="feature-desc">{f.description}</p>
          </div>
        ))}
      </div>

      {/* ── Partners ── */}
      <div className="partners-section">
        <p className="partners-label">Strategic Technical Partners</p>
        <div className="partner-card">
          <img src={rvttilogo} alt="RVTTI Logo" className="partner-logo" />
          <h4 className="partner-name">Rift Valley Technical Training Institute</h4>
          <p className="partner-role">Academic &amp; Research Validation Partner</p>
        </div>
      </div>

      {/* ── Founder ── */}
      <div className="founder-section">
        <div className="founder-grid">

          <div className="founder-image-wrapper">
            <div className="image-accent-bg" />
            <img src={founderPhoto} alt="Founder" className="founder-photo" />
          </div>

          <div className="founder-info">
            <span className="founder-badge">
              <Award size={16} /> Meet the Founder
            </span>
            <h2 className="founder-name">Kiplimo Ian Chege</h2>
            <p className="founder-role-title">Founder &amp; Lead Developer</p>
            <p className="founder-bio">
              Ian Chege is a tech innovator and entrepreneur dedicated to solving
              Africa's challenges through AI solutions that empower local communities
              and bridge the digital divide through inclusive linguistic technology.
              SemaData revolutionizes data collection by speeding up the process of
              generating clean, environment-based datasets while keeping systems
              user-friendly.
            </p>
            <button className="linkedin-btn">Connect on LinkedIn</button>
          </div>
        </div>
      </div>

    </div>
  </div>
);

export default AboutUs;