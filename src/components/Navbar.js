import React from 'react';
import {
  FiHome, FiUsers, FiMessageSquare, FiPhone, FiCalendar, FiClock, FiGlobe, FiWifi,
} from 'react-icons/fi';

export default function Navbar({ activeTab, onTabChange }) {
  const tabs = [
    { id: 'home', label: 'Home', icon: FiHome },
    { id: 'users', label: 'All Users', icon: FiGlobe },
    { id: 'contacts', label: 'Contacts', icon: FiUsers },
    { id: 'chat', label: 'Chat', icon: FiMessageSquare },
    { id: 'groups', label: 'Groups', icon: FiUsers },
    { id: 'calendar', label: 'Calendar', icon: FiCalendar },
    { id: 'history', label: 'History', icon: FiClock },
  ];

  return (
    <nav className="navbar">
      <div className="nav-brand">
        <FiPhone size={22} />
        <span>VoiceLink</span>
      </div>

      <div className="nav-network">
        <FiWifi size={11} />
        <span>{window.location.hostname}:{window.location.port}</span>
      </div>

      <div className="nav-tabs">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            className={`nav-tab ${activeTab === tab.id ? 'active' : ''}`}
            onClick={() => onTabChange(tab.id)}
          >
            <tab.icon size={17} />
            <span>{tab.label}</span>
          </button>
        ))}
      </div>
    </nav>
  );
}
