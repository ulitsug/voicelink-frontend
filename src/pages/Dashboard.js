import React, { useState, useEffect, useRef } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { DashboardProvider } from '../contexts/DashboardContext';
import Navbar from '../components/Navbar';
import {
  FiLogOut, FiUser, FiSettings, FiChevronDown,
} from 'react-icons/fi';

const ROUTE_TITLES = {
  '/': 'Dashboard',
  '/users': 'All Users',
  '/contacts': 'Contacts',
  '/chat': 'Chat',
  '/groups': 'Groups',
  '/calendar': 'Calendar',
  '/history': 'Call History',
  '/profile': 'Profile Settings',
  '/admin': 'Admin Panel',
};

export default function Dashboard() {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const profileMenuRef = useRef(null);

  const pageTitle = ROUTE_TITLES[location.pathname] || 'Dashboard';

  // Close profile menu on outside click
  useEffect(() => {
    const handleClick = (e) => {
      if (profileMenuRef.current && !profileMenuRef.current.contains(e.target)) {
        setShowProfileMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  return (
    <DashboardProvider>
      <div className="dashboard">
        <Navbar userRole={user?.role} />
        <div className="dashboard-main">
          <header className="dashboard-header">
            <h1 className="header-title">{pageTitle}</h1>
            <div className="header-user" ref={profileMenuRef}>
              <button
                className="header-profile-btn"
                onClick={() => setShowProfileMenu(!showProfileMenu)}
              >
                <div className="header-avatar">
                  {user?.avatar_url ? (
                    <img src={user.avatar_url} alt="" />
                  ) : (
                    user?.display_name?.charAt(0).toUpperCase() || <FiUser />
                  )}
                </div>
                <span className="header-username">{user?.display_name}</span>
                <FiChevronDown size={14} className={`header-chevron ${showProfileMenu ? 'open' : ''}`} />
              </button>
              {showProfileMenu && (
                <div className="profile-dropdown">
                  <div className="profile-dropdown-header">
                    <div className="dropdown-avatar">
                      {user?.avatar_url ? (
                        <img src={user.avatar_url} alt="" />
                      ) : (
                        <span>{user?.display_name?.charAt(0).toUpperCase()}</span>
                      )}
                    </div>
                    <div>
                      <div className="dropdown-name">{user?.display_name}</div>
                      <div className="dropdown-email">{user?.email}</div>
                    </div>
                  </div>
                  <div className="profile-dropdown-divider" />
                  <button
                    className="profile-dropdown-item"
                    onClick={() => { navigate('/profile'); setShowProfileMenu(false); }}
                  >
                    <FiSettings size={15} /> Profile Settings
                  </button>
                  <div className="profile-dropdown-divider" />
                  <button className="profile-dropdown-item danger" onClick={logout}>
                    <FiLogOut size={15} /> Log Out
                  </button>
                </div>
              )}
            </div>
          </header>
          <div className="dashboard-content">
            <Outlet />
          </div>
        </div>
      </div>
    </DashboardProvider>
  );
}
