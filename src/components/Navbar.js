import React, { useState, useCallback, useEffect } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import {
  FiHome, FiUsers, FiMessageSquare, FiPhone, FiCalendar, FiClock, FiGlobe, FiSettings,
  FiMenu, FiX,
} from 'react-icons/fi';
import { useChat } from '../contexts/ChatContext';

// Primary tabs shown in mobile bottom nav
const PRIMARY_PATHS = new Set(['/', '/contacts', '/chat', '/history']);

export default function Navbar({ userRole }) {
  const { totalUnread } = useChat();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();
  const isAdmin = userRole === 'admin' || userRole === 'super_admin';

  const tabs = [
    { to: '/', label: 'Home', icon: FiHome, end: true },
    { to: '/users', label: 'All Users', icon: FiGlobe },
    { to: '/contacts', label: 'Contacts', icon: FiUsers },
    { to: '/chat', label: 'Chat', icon: FiMessageSquare, badge: totalUnread },
    { to: '/groups', label: 'Groups', icon: FiUsers },
    { to: '/calendar', label: 'Calendar', icon: FiCalendar },
    { to: '/history', label: 'History', icon: FiClock },
    ...(isAdmin ? [{ to: '/admin', label: 'Admin', icon: FiSettings }] : []),
  ];

  const primaryTabs = tabs.filter((t) => PRIMARY_PATHS.has(t.to));
  const secondaryTabs = tabs.filter((t) => !PRIMARY_PATHS.has(t.to));

  // Close sidebar on route change
  useEffect(() => {
    setSidebarOpen(false);
  }, [location.pathname]);

  const closeSidebar = useCallback(() => setSidebarOpen(false), []);

  return (
    <>
      <nav className="navbar">
        <div className="nav-brand">
          <FiPhone size={22} />
          <span>VoiceLink</span>
        </div>

        {/* Desktop: show all tabs */}
        <div className="nav-tabs nav-tabs-desktop">
          {tabs.map((tab) => (
            <NavLink
              key={tab.to}
              to={tab.to}
              end={tab.end}
              className={({ isActive }) => `nav-tab ${isActive ? 'active' : ''}`}
            >
              <tab.icon size={17} />
              <span>{tab.label}</span>
              {tab.badge > 0 && <span className="nav-badge">{tab.badge > 99 ? '99+' : tab.badge}</span>}
            </NavLink>
          ))}
        </div>

        {/* Mobile: show only primary tabs + menu button */}
        <div className="nav-tabs nav-tabs-mobile">
          {primaryTabs.map((tab) => (
            <NavLink
              key={tab.to}
              to={tab.to}
              end={tab.end}
              className={({ isActive }) => `nav-tab ${isActive ? 'active' : ''}`}
            >
              <tab.icon size={17} />
              <span>{tab.label}</span>
              {tab.badge > 0 && <span className="nav-badge">{tab.badge > 99 ? '99+' : tab.badge}</span>}
            </NavLink>
          ))}
          <button
            className={`nav-tab nav-menu-btn ${sidebarOpen ? 'active' : ''}`}
            onClick={() => setSidebarOpen((v) => !v)}
          >
            <FiMenu size={17} />
            <span>More</span>
          </button>
        </div>
      </nav>

      {/* Mobile sidebar overlay for secondary tabs */}
      {sidebarOpen && (
        <div className="mobile-sidebar-overlay" onClick={closeSidebar}>
          <div className="mobile-sidebar" onClick={(e) => e.stopPropagation()}>
            <div className="mobile-sidebar-header">
              <FiPhone size={18} />
              <span>VoiceLink</span>
              <button className="mobile-sidebar-close" onClick={closeSidebar}>
                <FiX size={18} />
              </button>
            </div>
            <div className="mobile-sidebar-tabs">
              {secondaryTabs.map((tab) => (
                <NavLink
                  key={tab.to}
                  to={tab.to}
                  end={tab.end}
                  className={({ isActive }) => `mobile-sidebar-tab ${isActive ? 'active' : ''}`}
                  onClick={closeSidebar}
                >
                  <tab.icon size={18} />
                  <span>{tab.label}</span>
                  {tab.badge > 0 && <span className="nav-badge">{tab.badge > 99 ? '99+' : tab.badge}</span>}
                </NavLink>
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
