import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import {
  FiPhone, FiVideo, FiMessageSquare, FiShield, FiUsers, FiCalendar,
  FiUser, FiLock, FiMail, FiArrowRight, FiWifi, FiMonitor, FiGlobe
} from 'react-icons/fi';
import './LandingPage.css';

export default function LandingPage() {
  const { login, register } = useAuth();
  const [activeForm, setActiveForm] = useState('login');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Login state
  const [loginData, setLoginData] = useState({ username: '', password: '' });

  // Register state
  const [registerData, setRegisterData] = useState({
    username: '', email: '', display_name: '', password: '', confirmPassword: ''
  });

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(loginData.username, loginData.password);
    } catch (err) {
      setError(err.response?.data?.error || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    setError('');
    if (registerData.password !== registerData.confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    setLoading(true);
    try {
      await register({
        username: registerData.username,
        email: registerData.email,
        display_name: registerData.display_name,
        password: registerData.password,
      });
    } catch (err) {
      setError(err.response?.data?.error || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  const switchForm = (form) => {
    setActiveForm(form);
    setError('');
  };

  const networkUrl = (() => {
    const { hostname, port, protocol } = window.location;
    return `${protocol}//${hostname}${port ? ':' + port : ''}`;
  })();

  const features = [
    { icon: FiVideo, title: 'Video Calls', desc: 'Crystal-clear HD video calling across your local network' },
    { icon: FiPhone, title: 'Voice Calls', desc: 'Low-latency voice calls with noise suppression' },
    { icon: FiMessageSquare, title: 'Instant Chat', desc: 'Real-time messaging with file sharing and read receipts' },
    { icon: FiShield, title: 'Secure & Private', desc: 'End-to-end encryption keeps your conversations private' },
    { icon: FiUsers, title: 'Group Calls', desc: 'Connect multiple participants in group voice and video calls' },
    { icon: FiCalendar, title: 'Scheduling', desc: 'Built-in calendar to schedule calls and set reminders' },
  ];

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
            <button
              className={`landing-nav-btn ${activeForm === 'login' ? 'active' : ''}`}
              onClick={() => switchForm('login')}
            >Sign In</button>
            <button
              className={`landing-nav-btn landing-nav-btn--accent ${activeForm === 'register' ? 'active' : ''}`}
              onClick={() => switchForm('register')}
            >Get Started</button>
          </nav>
        </div>
      </header>

      {/* ── Hero ── */}
      <section className="landing-hero">
        <div className="landing-hero-inner">
          <div className="landing-hero-content">
            <h1>Communication<br/>made <span className="text-accent">simple.</span></h1>
            <p>
              A secure, self-hosted platform for voice calls, video calls, and instant messaging
              across your local network. No cloud. No subscriptions. Full control.
            </p>
            <div className="landing-hero-stats">
              <div className="landing-stat">
                <FiMonitor size={18} />
                <div>
                  <strong>Cross-Device</strong>
                  <span>Desktop & Mobile</span>
                </div>
              </div>
              <div className="landing-stat">
                <FiGlobe size={18} />
                <div>
                  <strong>Local Network</strong>
                  <span>Low-latency LAN</span>
                </div>
              </div>
              <div className="landing-stat">
                <FiShield size={18} />
                <div>
                  <strong>Private</strong>
                  <span>E2E Encrypted</span>
                </div>
              </div>
            </div>
          </div>

          {/* ── Auth Forms ── */}
          <div className="landing-auth">
            <div className="landing-auth-tabs">
              <button
                className={activeForm === 'login' ? 'active' : ''}
                onClick={() => switchForm('login')}
              >Sign In</button>
              <button
                className={activeForm === 'register' ? 'active' : ''}
                onClick={() => switchForm('register')}
              >Create Account</button>
            </div>

            {error && <div className="landing-auth-error">{error}</div>}

            {activeForm === 'login' ? (
              <form onSubmit={handleLogin} className="landing-form">
                <div className="landing-form-group">
                  <FiUser className="landing-input-icon" />
                  <input
                    type="text"
                    placeholder="Username or Email"
                    value={loginData.username}
                    onChange={(e) => setLoginData({ ...loginData, username: e.target.value })}
                    required
                    autoComplete="username"
                  />
                </div>
                <div className="landing-form-group">
                  <FiLock className="landing-input-icon" />
                  <input
                    type="password"
                    placeholder="Password"
                    value={loginData.password}
                    onChange={(e) => setLoginData({ ...loginData, password: e.target.value })}
                    required
                    autoComplete="current-password"
                  />
                </div>
                <button type="submit" className="landing-btn-submit" disabled={loading}>
                  {loading ? 'Signing in...' : 'Sign In'}
                  <FiArrowRight />
                </button>
                <p className="landing-form-footer">
                  Don't have an account?{' '}
                  <button type="button" onClick={() => switchForm('register')}>Create one</button>
                </p>
              </form>
            ) : (
              <form onSubmit={handleRegister} className="landing-form">
                <div className="landing-form-row">
                  <div className="landing-form-group">
                    <FiUser className="landing-input-icon" />
                    <input
                      type="text"
                      placeholder="Username"
                      value={registerData.username}
                      onChange={(e) => setRegisterData({ ...registerData, username: e.target.value })}
                      required
                      minLength={3}
                      maxLength={50}
                      autoComplete="username"
                    />
                  </div>
                  <div className="landing-form-group">
                    <FiUser className="landing-input-icon" />
                    <input
                      type="text"
                      placeholder="Display Name"
                      value={registerData.display_name}
                      onChange={(e) => setRegisterData({ ...registerData, display_name: e.target.value })}
                      required
                      autoComplete="name"
                    />
                  </div>
                </div>
                <div className="landing-form-group">
                  <FiMail className="landing-input-icon" />
                  <input
                    type="email"
                    placeholder="Email Address"
                    value={registerData.email}
                    onChange={(e) => setRegisterData({ ...registerData, email: e.target.value })}
                    required
                    autoComplete="email"
                  />
                </div>
                <div className="landing-form-row">
                  <div className="landing-form-group">
                    <FiLock className="landing-input-icon" />
                    <input
                      type="password"
                      placeholder="Password (min 6)"
                      value={registerData.password}
                      onChange={(e) => setRegisterData({ ...registerData, password: e.target.value })}
                      required
                      minLength={6}
                      autoComplete="new-password"
                    />
                  </div>
                  <div className="landing-form-group">
                    <FiLock className="landing-input-icon" />
                    <input
                      type="password"
                      placeholder="Confirm Password"
                      value={registerData.confirmPassword}
                      onChange={(e) => setRegisterData({ ...registerData, confirmPassword: e.target.value })}
                      required
                      autoComplete="new-password"
                    />
                  </div>
                </div>
                <button type="submit" className="landing-btn-submit" disabled={loading}>
                  {loading ? 'Creating Account...' : 'Create Account'}
                  <FiArrowRight />
                </button>
                <p className="landing-form-footer">
                  Already have an account?{' '}
                  <button type="button" onClick={() => switchForm('login')}>Sign in</button>
                </p>
              </form>
            )}
          </div>
        </div>
      </section>

      {/* ── Features ── */}
      <section className="landing-features">
        <div className="landing-features-inner">
          <h2>Everything you need to stay connected</h2>
          <div className="landing-features-grid">
            {features.map((f, i) => (
              <div className="landing-feature" key={i}>
                <div className="landing-feature-icon">
                  <f.icon size={20} />
                </div>
                <h3>{f.title}</h3>
                <p>{f.desc}</p>
              </div>
            ))}
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
          <div className="landing-network">
            <FiWifi size={13} />
            <span>Network: <strong>{networkUrl}</strong></span>
          </div>
        </div>
      </footer>
    </div>
  );
}
