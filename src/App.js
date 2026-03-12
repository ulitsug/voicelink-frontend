import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { CallProvider } from './contexts/CallContext';
import { ChatProvider } from './contexts/ChatContext';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import CallOverlay from './components/CallOverlay';

function ProtectedRoute({ children }) {
  const { isAuthenticated, loading } = useAuth();
  if (loading) return <div className="loading-screen">Loading...</div>;
  return isAuthenticated ? children : <Navigate to="/login" />;
}

function PublicRoute({ children }) {
  const { isAuthenticated, loading } = useAuth();
  if (loading) return <div className="loading-screen">Loading...</div>;
  return !isAuthenticated ? children : <Navigate to="/" />;
}

function AppRoutes() {
  const { isAuthenticated } = useAuth();

  return (
    <>
      <Routes>
        <Route path="/login" element={<PublicRoute><Login /></PublicRoute>} />
        <Route path="/register" element={<PublicRoute><Register /></PublicRoute>} />
        <Route path="/*" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
      </Routes>
      {isAuthenticated && <CallOverlay />}
    </>
  );
}

export default function App() {
  return (
    <Router>
      <AuthProvider>
        <CallProvider>
          <ChatProvider>
            <AppRoutes />
          </ChatProvider>
        </CallProvider>
      </AuthProvider>
    </Router>
  );
}
