import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { authAPI } from '../services/api';
import { FiPhone, FiMail, FiArrowRight, FiArrowLeft, FiCheckCircle } from 'react-icons/fi';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await authAPI.forgotPassword(email);
      setSent(true);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to send reset email');
    } finally {
      setLoading(false);
    }
  };

  if (sent) {
    return (
      <div className="auth-page">
        <div className="auth-card">
          <div className="auth-logo" style={{ color: 'var(--success)' }}>
            <FiCheckCircle size={48} />
          </div>
          <h1>Check Your Email</h1>
          <p className="auth-subtitle">
            If an account with that email exists, a password reset link has been sent. Please check your inbox.
          </p>
          <p className="auth-footer" style={{ marginTop: 24 }}>
            <Link to="/login"><FiArrowLeft size={14} style={{ verticalAlign: 'middle' }} /> Back to Sign In</Link>
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-logo">
          <FiPhone size={48} />
        </div>
        <h1>Reset Password</h1>
        <p className="auth-subtitle">Enter your email to receive a reset link</p>

        {error && <div className="auth-error">{error}</div>}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <FiMail className="input-icon" />
            <input
              type="email"
              placeholder="Email address"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <button type="submit" className="btn-primary" disabled={loading}>
            {loading ? 'Sending...' : 'Send Reset Link'}
            <FiArrowRight />
          </button>
        </form>

        <p className="auth-footer" style={{ marginTop: 16 }}>
          <Link to="/login"><FiArrowLeft size={14} style={{ verticalAlign: 'middle' }} /> Back to Sign In</Link>
        </p>
      </div>
    </div>
  );
}
