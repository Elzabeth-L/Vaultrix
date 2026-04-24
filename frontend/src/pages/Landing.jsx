import React from 'react';
import { Link } from 'react-router-dom';
import { Activity } from 'lucide-react';

export default function Landing() {
  return (
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
          Connect with professional service providers or offer your own skills. 
          Built on a secure, high-performance microservices architecture.
        </p>
        <div className="hero-buttons">
          <Link to="/register" className="btn btn-primary" style={{ padding: '1rem 2rem', fontSize: '1.1rem' }}>
            Start for free
          </Link>
          <a href="#features" className="btn btn-secondary" style={{ padding: '1rem 2rem', fontSize: '1.1rem' }}>
            Learn more
          </a>
        </div>
      </main>
    </div>
  );
}
