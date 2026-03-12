import React, { lazy, Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { CallProvider } from './contexts/CallContext';
import { ChatProvider } from './contexts/ChatContext';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import CallOverlay from './components/CallOverlay';

/* Lazy-loaded page components */
const HomeScreen = lazy(() => import('./components/HomeScreen'));
const UsersList = lazy(() => import('./components/UsersList'));
const ContactList = lazy(() => import('./components/ContactList'));
const ChatPanel = lazy(() => import('./components/ChatPanel'));
const GroupManager = lazy(() => import('./components/GroupManager'));
const CalendarView = lazy(() => import('./components/CalendarView'));
const CallHistory = lazy(() => import('./components/CallHistory'));
const ProfileSettings = lazy(() => import('./components/ProfileSettings'));
const AdminPanel = lazy(() => import('./components/AdminPanel'));

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

const PageLoader = () => <div className="page-loader">Loading...</div>;

function AppRoutes() {
  const { isAuthenticated } = useAuth();

  return (
    <>
      <Routes>
        <Route path="/login" element={<PublicRoute><Login /></PublicRoute>} />
        <Route path="/register" element={<PublicRoute><Register /></PublicRoute>} />
        <Route path="/" element={<ProtectedRoute><Dashboard /></ProtectedRoute>}>
          <Route index element={<Suspense fallback={<PageLoader />}><HomeScreen /></Suspense>} />
          <Route path="users" element={<Suspense fallback={<PageLoader />}><UsersList /></Suspense>} />
          <Route path="contacts" element={<Suspense fallback={<PageLoader />}><ContactList /></Suspense>} />
          <Route path="chat" element={<Suspense fallback={<PageLoader />}><ChatPanel /></Suspense>} />
          <Route path="groups" element={<Suspense fallback={<PageLoader />}><GroupManager /></Suspense>} />
          <Route path="calendar" element={<Suspense fallback={<PageLoader />}><CalendarView /></Suspense>} />
          <Route path="history" element={<Suspense fallback={<PageLoader />}><CallHistory /></Suspense>} />
          <Route path="profile" element={<Suspense fallback={<PageLoader />}><ProfileSettings /></Suspense>} />
          <Route path="admin" element={<Suspense fallback={<PageLoader />}><AdminPanel /></Suspense>} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
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
