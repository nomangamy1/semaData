import React, { useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import './LandingPage.css';

const LandingPage = () => {
  const observerRef = useRef(null);

  useEffect(() => {
    observerRef.current = new IntersectionObserver(
      (entries) => entries.forEach(e => {
        if (e.isIntersecting) e.target.classList.add('visible');
      }),
      { threshold: 0.1 }
    );
    document.querySelectorAll('.reveal').forEach(el => observerRef.current.observe(el));
    return () => observerRef.current?.disconnect();
  }, []);

  return (
    <div className="lp">

      {/* ── NAV ── */}

      {/* ── HERO ── */}
      <section className="lp-hero reveal">
        <div className="lp-hero-bg">
          <div className="lp-hero-orb lp-hero-orb--1" />
          <div className="lp-hero-orb lp-hero-orb--2" />
          <div className="lp-hero-grid" />
        </div>
        <div className="lp-hero-content">
          <div className="lp-hero-tag reveal">
            Africa's Language Intelligence Platform
          </div>
          <h1 className="lp-hero-h1 reveal">
            The infrastructure<br />
            behind <em>African</em><br />
            language AI
          </h1>
          <p className="lp-hero-p reveal">
            semaData connects field collectors, domain researchers, and the global data science community — building the datasets that will power the next generation of African language models.
          </p>
          <div className="lp-hero-actions reveal">
            <Link to="/signup" className="lp-btn lp-btn--primary">
              Start building →
            </Link>
            <Link to="/community" className="lp-btn lp-btn--ghost">
              Explore community
            </Link>
          </div>
          <div className="lp-hero-stats reveal">
            <div className="lp-stat">
              <strong>8+</strong><span>African languages</span>
            </div>
            <div className="lp-stat-divider" />
            <div className="lp-stat">
              <strong>1,500+</strong><span>Verified recordings</span>
            </div>
            <div className="lp-stat-divider" />
            <div className="lp-stat">
              <strong>3</strong><span>Active research domains</span>
            </div>
          </div>
        </div>
        <div className="lp-hero-visual reveal">
          <div className="lp-hero-card lp-hero-card--1">
            <div className="lp-hero-card-dot lp-hero-card-dot--green" />
            <span>Audio submitted</span>
            <strong>+1 verified</strong>
          </div>
          <div className="lp-hero-card lp-hero-card--2">
            <div className="lp-hero-card-dot lp-hero-card-dot--blue" />
            <span>New domain live</span>
            <strong>Agriculture · KE</strong>
          </div>
          <div className="lp-hero-card lp-hero-card--3">
            <div className="lp-hero-card-dot lp-hero-card-dot--amber" />
            <span>Community post</span>
            <strong>Kikuyu phonetics guide</strong>
          </div>
          <div className="lp-hero-waveform">
            {Array.from({length: 28}).map((_, i) => (
              <div key={i} className="lp-waveform-bar"
                style={{'--h': `${20 + Math.sin(i * 0.8) * 40 + Math.random() * 20}%`, '--d': `${i * 0.06}s`}} />
            ))}
          </div>
        </div>
      </section>

      {/* ── HOW IT WORKS ── */}
      <section id="how" className="lp-how">
        <div className="lp-section-label reveal">How it works</div>
        <h2 className="lp-section-h2 reveal">From field recording<br />to published dataset</h2>
        <div className="lp-steps">
          {[
            { n: '01', title: 'Domain owners define research',    body: 'Researchers and organisations specify data requirements, set target goals, and recruit vetted field collectors through semaData.' },
            { n: '02', title: 'Collectors capture real-world data', body: 'Approved collectors record audio, transcribe speech, and submit structured datasets from the field — in local languages and dialects.' },
            { n: '03', title: 'AI verifies and segments',          body: 'Our inference engine processes submissions, segments by linguistic features, and flags quality issues for human review.' },
            { n: '04', title: 'Community enriches the data',       body: 'Data scientists, linguists, and ML researchers discuss findings, flag issues, and contribute insights that improve dataset quality.' },
          ].map((s, i) => (
            <div key={i} className="lp-step reveal" style={{'--delay': `${i * 0.1}s`}}>
              <div className="lp-step-n">{s.n}</div>
              <div className="lp-step-body">
                <h3>{s.title}</h3>
                <p>{s.body}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── ROLES ── */}
      <section id="roles" className="lp-roles">
        <div className="lp-section-label reveal">Who it's for</div>
        <h2 className="lp-section-h2 reveal">Three paths into semaData</h2>
        <p className="lp-section-sub reveal">
          Each role is distinct. Choose the one that matches how you want to contribute.
        </p>

        <div className="lp-role-cards">

          <div className="lp-role-card lp-role-card--community reveal">
            <div className="lp-role-icon">◎</div>
            <div className="lp-role-tag">Free · Instant access</div>
            <h3>Community Member</h3>
            <p>You are a data scientist, ML researcher, student, or linguist interested in African language AI. You want to explore datasets, ask questions, and contribute knowledge — without committing to field work.</p>
            <ul>
              <li>Browse and discuss published datasets</li>
              <li>Post ML/AI/linguistics insights</li>
              <li>Comment and flag data quality issues</li>
              <li>Connect with domain owners and collectors</li>
            </ul>
            <Link to="/signup?role=community" className="lp-role-btn">
              Join the community →
            </Link>
          </div>

          <div className="lp-role-card lp-role-card--collector reveal" style={{'--delay': '0.1s'}}>
            <div className="lp-role-icon">◈</div>
            <div className="lp-role-tag">Vetted · Paid work</div>
            <h3>Data Collector</h3>
            <p>You are a field agent, community researcher, or local language speaker who wants to record, transcribe, and submit real-world data — and get compensated for verified contributions.</p>
            <ul>
              <li>Receive a reference number after approval</li>
              <li>Submit audio and structured field data</li>
              <li>Earn per verified submission</li>
              <li>Build a public contributor profile</li>
            </ul>
            <Link to="/signup?role=collector" className="lp-role-btn">
              Apply as collector →
            </Link>
          </div>

          <div className="lp-role-card lp-role-card--owner reveal" style={{'--delay': '0.2s'}}>
            <div className="lp-role-icon">◇</div>
            <div className="lp-role-tag">Paid · Full platform access</div>
            <h3>Domain Owner</h3>
            <p>You are a researcher, NGO, university, or organisation that needs high-quality African language datasets. You define what data gets collected and manage a team of verified collectors.</p>
            <ul>
              <li>Define custom data collection domains</li>
              <li>Set target goals and feature schemas</li>
              <li>Recruit and manage collectors</li>
              <li>Download and publish final datasets</li>
            </ul>
            <Link to="/signup?role=domainowner" className="lp-role-btn">
              Register your organisation →
            </Link>
          </div>

        </div>
      </section>

      {/* ── COMMUNITY STRIP ── */}
      <section id="community" className="lp-community reveal">
        <div className="lp-community-content">
          <div className="lp-section-label">Community</div>
          <h2>Africa's language data network — open to everyone</h2>
          <p>The semaData community is where data scientists, linguists, and AI researchers meet the people who collected the data. Discuss methods, share findings, flag quality issues, and help shape the future of African language AI.</p>
          <Link to="/community" className="lp-btn lp-btn--primary">Explore the community →</Link>
        </div>
        <div className="lp-community-posts">
          {[
            { init: 'AW', name: 'Amina W.', text: 'Tips for recording clean Kikuyu speech in noisy markets', tag: 'Linguistics' },
            { init: 'KM', name: 'Kofi M.',  text: 'Quality flag: duplicate recordings in HLTH-KE-0042',   tag: 'Quality' },
            { init: 'ND', name: 'Naledi D.', text: 'Zulu click consonants — guide for non-native transcribers', tag: 'Linguistics' },
          ].map((p, i) => (
            <div key={i} className="lp-community-post" style={{'--delay': `${i * 0.12}s`}}>
              <div className="lp-community-post-avatar">{p.init}</div>
              <div className="lp-community-post-body">
                <strong>{p.name}</strong>
                <span>{p.text}</span>
              </div>
              <div className="lp-community-post-tag">{p.tag}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer className="lp-footer">
        <div className="lp-footer-brand">
          <span className="lp-nav-dot" /> semaData
        </div>
        <p>Building the datasets that will power African language AI.</p>
        <div className="lp-footer-links">
          <Link to="/community">Community</Link>
          <Link to="/signup">Sign up</Link>
          <Link to="/login">Sign in</Link>
        </div>
      </footer>

    </div>
  );
};

export default LandingPage;