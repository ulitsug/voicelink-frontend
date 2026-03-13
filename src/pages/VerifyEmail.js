import React, { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { authAPI } from '../services/api';
import { FiCheckCircle, FiAlertCircle, FiLoader } from 'react-icons/fi';

export default function VerifyEmail() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token') || '';
  const { login: authLogin, updateUser } = useAuth();
  const [status, setStatus] = useState('verifying'); // verifying, success, error
  const [error, setError] = useState('');

  useEffect(() => {
    if (!token) {
      setStatus('error');
      setError('No verification token provided.');
      return;
    }

    authAPI.verifyEmail(token)
      .then(({ data }) => {
        setStatus('success');
        // Auto-login the verified user
        if (data.access_token) {
          localStorage.setItem('access_token', data.access_token);
          localStorage.setItem('user', JSON.stringify(data.user));
          updateUser(data.user);
        }
      })
      .catch((err) => {
        setStatus('error');
        setError(err.response?.data?.error || 'Verification failed');
      });
  }, [token, updateUser]);

  if (status === 'verifying') {
    return (
      <div className="auth-page">
        <div className="auth-card">
          <div className="auth-logo">
            <FiLoader size={48} className="spin-icon" />
          </div>
          <h1>Verifying Email...</h1>
          <p className="auth-subtitle">Please wait while we verify your email address.</p>
        </div>
      </div>
    );
  }

  if (status === 'error') {
    return (
      <div className="auth-page">
        <div className="auth-card">
          <div className="auth-logo" style={{ color: 'var(--danger)' }}>
            <FiAlertCircle size={48} />
          </div>
          <h1>Verification Failed</h1>
          <p className="auth-subtitle">{error}</p>
          <p className="auth-footer" style={{ marginTop: 24 }}>
            <Link to="/login">Go to Sign In</Link>
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-logo" style={{ color: 'var(--success)' }}>
          <FiCheckCircle size={48} />
        </div>
        <h1>Email Verified!</h1>
        <p className="auth-subtitle">
          Your email has been verified successfully. You can now access VoiceLink.
        </p>
        <p className="auth-footer" style={{ marginTop: 24 }}>
          <Link to="/">Go to Dashboard</Link> | <Link to="/login">Sign In</Link>
        </p>
      </div>
    </div>
  );
}
