import React from 'react';
import { Link } from 'react-router-dom';
import { Activity, ShieldCheck, Zap, Globe } from 'lucide-react';

export default function Landing() {
  return (
    <>
      <div className="hero-wrapper">
        <nav className="hero-nav">
          <div className="auth-logo" style={{ marginBottom: 0, fontSize: '1.5rem' }}>
            <Activity size={24} /> Vaultrix
          </div>
          <div style={{ display: 'flex', gap: '1rem' }}>
            <Link to="/login" className="btn btn-secondary">Sign In</Link>
            <Link to="/register" className="btn btn-primary">Get Started</Link>
          </div>
        </nav>

        <main className="hero-content animate-in">
          <h1 className="hero-title">
            The Modern Platform for Services & Tasks
          </h1>
          <p className="hero-subtitle">
            Find trusted professionals for any job. Submit requests, track progress, 
            pay securely, and get professional invoices — all in one place.
          </p>
          <div className="hero-buttons">
            <Link to="/services" className="btn btn-primary" style={{ padding: '1rem 2rem', fontSize: '1.1rem' }}>
              Browse Services
            </Link>
            <a href="#features" className="btn btn-secondary" style={{ padding: '1rem 2rem', fontSize: '1.1rem' }}>
              Learn more
            </a>
          </div>
        </main>
      </div>

      <section id="features" style={{ padding: '6rem 2rem', background: '#0a0a0f', color: '#f8fafc', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
        <div className="container">
          <div style={{ textAlign: 'center', marginBottom: '4rem' }}>
            <h2 style={{ fontSize: '2.5rem', fontWeight: 800, marginBottom: '1rem', background: 'linear-gradient(to right, #a78bfa, #22d3ee)', WebkitBackgroundClip: 'text', color: 'transparent' }}>
              Why choose Vaultrix?
            </h2>
            <p style={{ color: '#94a3b8', fontSize: '1.1rem', maxWidth: '600px', margin: '0 auto' }}>
              We've built a platform that puts security, speed, and simplicity first. Whether you're looking to hire or looking to work, Vaultrix makes it effortless.
            </p>
          </div>

          <div className="stats-grid">
            <div className="stat-card" style={{ textAlign: 'center', padding: '2.5rem 1.5rem' }}>
              <div className="stat-icon indigo" style={{ margin: '0 auto 1.5rem', width: '64px', height: '64px' }}>
                <ShieldCheck size={32} />
              </div>
              <h3 style={{ fontSize: '1.25rem', marginBottom: '0.75rem' }}>Bank-grade Security</h3>
              <p style={{ color: '#94a3b8', fontSize: '0.95rem' }}>Your data and wallet transactions are protected by industry-leading encryption and role-based access control.</p>
            </div>
            
            <div className="stat-card" style={{ textAlign: 'center', padding: '2.5rem 1.5rem' }}>
              <div className="stat-icon cyan" style={{ margin: '0 auto 1.5rem', width: '64px', height: '64px' }}>
                <Zap size={32} />
              </div>
              <h3 style={{ fontSize: '1.25rem', marginBottom: '0.75rem' }}>Lightning Fast</h3>
              <p style={{ color: '#94a3b8', fontSize: '0.95rem' }}>Our microservices architecture ensures that no matter how many users are active, your experience remains buttery smooth.</p>
            </div>

            <div className="stat-card" style={{ textAlign: 'center', padding: '2.5rem 1.5rem' }}>
              <div className="stat-icon green" style={{ margin: '0 auto 1.5rem', width: '64px', height: '64px' }}>
                <Globe size={32} />
              </div>
              <h3 style={{ fontSize: '1.25rem', marginBottom: '0.75rem' }}>Global Ecosystem</h3>
              <p style={{ color: '#94a3b8', fontSize: '0.95rem' }}>Connect instantly with service providers and customers around the globe without friction or hidden fees.</p>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
