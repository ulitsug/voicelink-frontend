import React, { useState, useCallback, useEffect } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import {
  FiHome, FiUsers, FiMessageSquare, FiPhone, FiCalendar, FiClock, FiGlobe, FiSettings,
  FiMenu, FiX, FiChevronDown, FiActivity, FiServer,
} from 'react-icons/fi';
import { useChat } from '../contexts/ChatContext';
import { useCall } from '../contexts/CallContext';

// Primary tabs shown in mobile bottom nav
const PRIMARY_PATHS = new Set(['/', '/contacts', '/chat', '/history']);

const ADMIN_SUBTABS = [
  { to: '/admin', label: 'Overview', icon: FiActivity, end: true },
  { to: '/admin/users', label: 'Users', icon: FiUsers },
  { to: '/admin/system', label: 'System Info', icon: FiServer },
  { to: '/admin/config', label: 'Configuration', icon: FiSettings },
];

export default function Navbar({ userRole }) {
  const { totalUnread } = useChat();
  const { callState } = useCall();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [adminOpen, setAdminOpen] = useState(false);
  const location = useLocation();
  const isAdmin = userRole === 'admin' || userRole === 'super_admin';
  const inCall = callState === 'active' || callState === 'calling' || callState === 'incoming' || callState === 'reconnecting';

  // Block navigation clicks during an active call
  const guardNav = useCallback((e) => {
    if (inCall) {
      e.preventDefault();
    }
  }, [inCall]);

  const tabs = [
    { to: '/', label: 'Home', icon: FiHome, end: true },
    { to: '/users', label: 'All Users', icon: FiGlobe },
    { to: '/contacts', label: 'Contacts', icon: FiUsers },
    { to: '/chat', label: 'Chat', icon: FiMessageSquare, badge: totalUnread },
    { to: '/groups', label: 'Groups', icon: FiUsers },
    { to: '/calendar', label: 'Calendar', icon: FiCalendar },
    { to: '/history', label: 'History', icon: FiClock },
  ];

  const primaryTabs = tabs.filter((t) => PRIMARY_PATHS.has(t.to));
  const secondaryTabs = tabs.filter((t) => !PRIMARY_PATHS.has(t.to));

  // Auto-expand admin submenu when on admin routes
  useEffect(() => {
    if (location.pathname.startsWith('/admin')) {
      setAdminOpen(true);
    }
  }, [location.pathname]);

  // Close sidebar on route change
  useEffect(() => {
    setSidebarOpen(false);
  }, [location.pathname]);

  const closeSidebar = useCallback(() => setSidebarOpen(false), []);

  const renderAdminSubmenu = (inMobile = false) => {
    if (!isAdmin) return null;
    const tabClass = inMobile ? 'mobile-sidebar-tab' : 'nav-tab';
    return (
      <div className="nav-submenu-group">
        <button
          className={`${tabClass} nav-submenu-toggle ${location.pathname.startsWith('/admin') ? 'active' : ''}`}
          onClick={() => setAdminOpen((v) => !v)}
        >
          <FiSettings size={inMobile ? 18 : 17} />
          <span>Admin</span>
          <FiChevronDown size={14} className={`nav-submenu-chevron ${adminOpen ? 'open' : ''}`} />
        </button>
        {adminOpen && (
          <div className="nav-submenu-items">
            {ADMIN_SUBTABS.map((sub) => (
              <NavLink
                key={sub.to}
                to={sub.to}
                end={sub.end}
                className={({ isActive }) => `${tabClass} nav-submenu-item ${isActive ? 'active' : ''}`}
                onClick={inMobile ? closeSidebar : undefined}
              >
                <sub.icon size={inMobile ? 16 : 15} />
                <span>{sub.label}</span>
              </NavLink>
            ))}
          </div>
        )}
      </div>
    );
  };

  return (
    <>
      <nav className="navbar">
        <div className="nav-brand">
          <FiPhone size={22} />
          <span>VoiceLink</span>
        </div>

        {/* Desktop: show all tabs */}
        <div className={`nav-tabs nav-tabs-desktop${inCall ? ' nav-disabled' : ''}`}>
          {tabs.map((tab) => (
            <NavLink
              key={tab.to}
              to={tab.to}
              end={tab.end}
              className={({ isActive }) => `nav-tab ${isActive ? 'active' : ''}${inCall ? ' disabled' : ''}`}
              onClick={guardNav}
            >
              <tab.icon size={17} />
              <span>{tab.label}</span>
              {tab.badge > 0 && <span className="nav-badge">{tab.badge > 99 ? '99+' : tab.badge}</span>}
            </NavLink>
          ))}
          {renderAdminSubmenu(false)}
        </div>

        {/* Mobile: show only primary tabs + menu button */}
        <div className={`nav-tabs nav-tabs-mobile${inCall ? ' nav-disabled' : ''}`}>
          {primaryTabs.map((tab) => (
            <NavLink
              key={tab.to}
              to={tab.to}
              end={tab.end}
              className={({ isActive }) => `nav-tab ${isActive ? 'active' : ''}${inCall ? ' disabled' : ''}`}
              onClick={guardNav}
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
                  className={({ isActive }) => `mobile-sidebar-tab ${isActive ? 'active' : ''}${inCall ? ' disabled' : ''}`}
                  onClick={inCall ? guardNav : closeSidebar}
                >
                  <tab.icon size={18} />
                  <span>{tab.label}</span>
                  {tab.badge > 0 && <span className="nav-badge">{tab.badge > 99 ? '99+' : tab.badge}</span>}
                </NavLink>
              ))}
              {renderAdminSubmenu(true)}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
