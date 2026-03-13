import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { FiPhone, FiMail, FiLock, FiUser, FiArrowRight, FiWifi } from 'react-icons/fi';

function getNetworkUrl() {
  const { hostname, port, protocol } = window.location;
  return hostname === 'localhost' || hostname === '127.0.0.1'
    ? null
    : `${protocol}//${hostname}${port ? ':' + port : ''}`;
}

export default function Login() {
  const { login } = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(username, password);
    } catch (err) {
      setError(err.response?.data?.error || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-logo">
          <FiPhone size={48} />
        </div>
        <h1>Welcome Back</h1>
        <p className="auth-subtitle">Sign in to VoiceLink</p>

        {error && <div className="auth-error">{error}</div>}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <FiUser className="input-icon" />
            <input
              type="text"
              placeholder="Username or Email"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
            />
          </div>
          <div className="form-group">
            <FiLock className="input-icon" />
            <input
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
          <button type="submit" className="btn-primary" disabled={loading}>
            {loading ? 'Signing in...' : 'Sign In'}
            <FiArrowRight />
          </button>
        </form>

        <p className="auth-footer" style={{ marginBottom: 8 }}>
          <Link to="/forgot-password">Forgot your password?</Link>
        </p>

        <p className="auth-footer">
          Don't have an account? <Link to="/register">Sign Up</Link>
        </p>

        <div className="network-info">
          <FiWifi size={14} />
          <span>Access from other devices:&nbsp;
            <strong>{window.location.protocol}//{window.location.hostname}:{window.location.port || (window.location.protocol === 'https:' ? '443' : '80')}</strong>
          </span>
        </div>
      </div>
    </div>
  );
}
