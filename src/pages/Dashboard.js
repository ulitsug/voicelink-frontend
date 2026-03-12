import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import Navbar from '../components/Navbar';
import HomeScreen from '../components/HomeScreen';
import ContactList from '../components/ContactList';
import ChatPanel from '../components/ChatPanel';
import GroupManager from '../components/GroupManager';
import CalendarView from '../components/CalendarView';
import CallHistory from '../components/CallHistory';
import UsersList from '../components/UsersList';
import ProfileSettings from '../components/ProfileSettings';
import { contactsAPI } from '../services/api';
import {
  FiLogOut, FiUser, FiSettings, FiChevronDown,
} from 'react-icons/fi';

const TAB_LABELS = {
  home: 'Dashboard',
  users: 'All Users',
  contacts: 'Contacts',
  chat: 'Chat',
  groups: 'Groups',
  calendar: 'Calendar',
  history: 'Call History',
  profile: 'Profile Settings',
};

export default function Dashboard() {
  const { user, logout, socket } = useAuth();
  const [activeTab, setActiveTab] = useState('home');
  const [contacts, setContacts] = useState([]);
  const [onlineUsers, setOnlineUsers] = useState([]);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const profileMenuRef = useRef(null);

  useEffect(() => {
    loadContacts();
  }, []);

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

  useEffect(() => {
    if (!socket) return;

    socket.on('authenticated', (data) => {
      setOnlineUsers(data.online_users || []);
    });

    socket.on('user_status_changed', (data) => {
      setOnlineUsers((prev) => {
        if (data.status === 'online') {
          const exists = prev.find((u) => u.id === data.user_id);
          if (exists) return prev;
          return [...prev, { id: data.user_id, username: data.username, status: 'online' }];
        } else {
          return prev.filter((u) => u.id !== data.user_id);
        }
      });
    });

    socket.on('online_users', (data) => {
      setOnlineUsers(data.users || []);
    });

    socket.emit('get_online_users');

    return () => {
      socket.off('authenticated');
      socket.off('user_status_changed');
      socket.off('online_users');
    };
  }, [socket]);

  const loadContacts = async () => {
    try {
      const { data } = await contactsAPI.getContacts();
      setContacts(data.contacts || []);
    } catch (e) {
      console.error('Failed to load contacts:', e);
    }
  };

  const renderContent = () => {
    switch (activeTab) {
      case 'home':
        return <HomeScreen onlineUsers={onlineUsers} onNavigate={setActiveTab} />;
      case 'users':
        return (
          <UsersList
            onlineUsers={onlineUsers}
            onRefresh={loadContacts}
          />
        );
      case 'contacts':
        return (
          <ContactList
            contacts={contacts}
            onlineUsers={onlineUsers}
            onRefresh={loadContacts}
            onNavigate={setActiveTab}
          />
        );
      case 'chat':
        return <ChatPanel contacts={contacts} onlineUsers={onlineUsers} />;
      case 'groups':
        return <GroupManager contacts={contacts} />;
      case 'calendar':
        return <CalendarView />;
      case 'history':
        return <CallHistory onlineUsers={onlineUsers} />;
      case 'profile':
        return <ProfileSettings />;
      default:
        return <HomeScreen onlineUsers={onlineUsers} onNavigate={setActiveTab} />;
    }
  };

  return (
    <div className="dashboard">
      <Navbar activeTab={activeTab} onTabChange={setActiveTab} />
      <div className="dashboard-main">
        <header className="dashboard-header">
          <h1 className="header-title">{TAB_LABELS[activeTab] || 'Dashboard'}</h1>
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
                  onClick={() => { setActiveTab('profile'); setShowProfileMenu(false); }}
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
          {renderContent()}
        </div>
      </div>
    </div>
  );
}
