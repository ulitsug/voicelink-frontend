import React from 'react';
import { Link } from 'react-router-dom';
import {
  FiPhone, FiVideo, FiMessageSquare, FiShield,
  FiArrowRight, FiWifi, FiBookOpen,
} from 'react-icons/fi';
import './LandingPage.css';

export default function LandingPage() {
  const networkUrl = (() => {
    const { hostname, port, protocol } = window.location;
    return `${protocol}//${hostname}${port ? ':' + port : ''}`;
  })();

  return (
    <div className="landing">
      {/* ── Header ── */}
      <header className="landing-header">
        <div className="landing-header-inner">
          <div className="landing-brand">
            <div className="landing-logo">
              <svg width="32" height="32" viewBox="0 0 96 96">
                <rect width="96" height="96" rx="19" fill="#0E2A52"/>
                <circle cx="48" cy="48" r="30.7" fill="none" stroke="#cfb000" strokeWidth="3"/>
                <text x="48" y="55" textAnchor="middle" fontFamily="Inter,sans-serif" fontWeight="700" fontSize="22" fill="white">VL</text>
              </svg>
            </div>
            <span className="landing-brand-name">VoiceLink</span>
          </div>
          <nav className="landing-nav">
            <Link to="/login" className="landing-nav-btn">Sign In</Link>
            <Link to="/register" className="landing-nav-btn landing-nav-btn--accent">Get Started</Link>
          </nav>
        </div>
      </header>

      {/* ── Hero ── */}
      <section className="landing-hero">
        <div className="landing-hero-inner">
          <div className="landing-hero-content">
            <h1>Communication<br/>made <span className="text-accent">simple.</span></h1>
            <p>
              Secure voice, video & messaging on your local network.
              No cloud. No subscriptions. Full control.
            </p>
            <div className="landing-hero-actions">
              <Link to="/register" className="landing-btn-primary">
                Create Account <FiArrowRight />
              </Link>
              <Link to="/login" className="landing-btn-secondary">
                Sign In
              </Link>
            </div>
          </div>

          <div className="landing-hero-visual">
            <div className="landing-hero-card">
              <FiVideo size={28} />
              <span>Video</span>
            </div>
            <div className="landing-hero-card">
              <FiPhone size={28} />
              <span>Voice</span>
            </div>
            <div className="landing-hero-card">
              <FiMessageSquare size={28} />
              <span>Chat</span>
            </div>
            <div className="landing-hero-card">
              <FiShield size={28} />
              <span>Encrypted</span>
            </div>
          </div>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="landing-footer">
        <div className="landing-footer-inner">
          <div className="landing-footer-brand">
            <svg width="20" height="20" viewBox="0 0 96 96">
              <rect width="96" height="96" rx="19" fill="#0E2A52"/>
              <circle cx="48" cy="48" r="30.7" fill="none" stroke="#cfb000" strokeWidth="3"/>
              <text x="48" y="55" textAnchor="middle" fontFamily="Inter,sans-serif" fontWeight="700" fontSize="22" fill="white">VL</text>
            </svg>
            <span>VoiceLink</span>
          </div>
          <div className="landing-footer-links">
            <Link to="/docs" className="landing-footer-link"><FiBookOpen size={13} /> API Docs</Link>
            <span className="landing-network">
              <FiWifi size={13} />
              Network: <strong>{networkUrl}</strong>
            </span>
          </div>
        </div>
      </footer>
    </div>
  );
}
