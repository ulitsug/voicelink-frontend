import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useCall } from '../contexts/CallContext';
import { useChat } from '../contexts/ChatContext';
import { useDashboard } from '../contexts/DashboardContext';
import { authAPI } from '../services/api';
import {
  FiUsers, FiMessageSquare, FiPhone, FiCalendar,
  FiPhoneMissed, FiArrowRight, FiVideo, FiX,
} from 'react-icons/fi';

export default function HomeScreen() {
  const { onlineUsers } = useDashboard();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { initiateCall } = useCall();
  const { openChat } = useChat();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedUser, setSelectedUser] = useState(null);
  const popupRef = useRef(null);

  useEffect(() => { loadStats(); }, []);

  useEffect(() => {
    const handleClick = (e) => {
      if (popupRef.current && !popupRef.current.contains(e.target)) setSelectedUser(null);
    };
    if (selectedUser) document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [selectedUser]);

  const loadStats = async () => {
    try {
      const { data } = await authAPI.getDashboardStats();
      setStats(data);
    } catch (e) {
      console.error('Failed to load stats:', e);
    } finally {
      setLoading(false);
    }
  };

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 18) return 'Good afternoon';
    return 'Good evening';
  };

  const statCards = [
    {
      label: 'Contacts',
      value: stats?.contacts ?? '-',
      icon: FiUsers,
      color: 'var(--primary)',
      to: '/contacts',
    },
    {
      label: 'Unread Messages',
      value: stats?.unread_messages ?? '-',
      icon: FiMessageSquare,
      color: 'var(--success)',
      to: '/chat',
    },
    {
      label: 'Total Calls',
      value: stats?.total_calls ?? '-',
      icon: FiPhone,
      color: 'var(--accent)',
      to: '/history',
    },
    {
      label: 'Groups',
      value: stats?.groups ?? '-',
      icon: FiCalendar,
      color: 'var(--danger)',
      to: '/groups',
    },
  ];

  return (
    <div className="home-screen">
      <div className="home-greeting">
        <h2>{getGreeting()}, {user?.display_name?.split(' ')[0]}</h2>
        <p className="home-subtitle">
          {onlineUsers.length} user{onlineUsers.length !== 1 ? 's' : ''} online
          {stats?.missed_calls > 0 && (
            <span className="home-missed">
              <FiPhoneMissed size={13} />
              {stats.missed_calls} missed call{stats.missed_calls !== 1 ? 's' : ''}
            </span>
          )}
        </p>
      </div>

      <div className="home-stats">
        {statCards.map((card) => (
          <button
            key={card.label}
            className="stat-card"
            onClick={() => navigate(card.to)}
          >
            <div className="stat-icon" style={{ color: card.color }}>
              <card.icon size={20} />
            </div>
            <div className="stat-info">
              <span className="stat-value">{loading ? '-' : card.value}</span>
              <span className="stat-label">{card.label}</span>
            </div>
          </button>
        ))}
      </div>

      <div className="home-sections">
        <div className="home-section">
          <div className="home-section-header">
            <h3>Online Now</h3>
            <button className="link-btn" onClick={() => navigate('/contacts')}>
              View all <FiArrowRight size={13} />
            </button>
          </div>
          {onlineUsers.length === 0 ? (
            <p className="empty-hint">No users online</p>
          ) : (
            <div className="online-avatars">
              {onlineUsers.slice(0, 8).map((u) => (
                <button
                  key={u.id}
                  className="online-avatar-item clickable"
                  onClick={() => setSelectedUser(u)}
                >
                  <div className="online-avatar">
                    {u.avatar_url ? (
                      <img src={u.avatar_url} alt="" />
                    ) : (
                      <span>{(u.username || u.display_name || '?').charAt(0).toUpperCase()}</span>
                    )}
                    <span className="online-dot" />
                  </div>
                  <span className="online-name">{u.username || u.display_name}</span>
                </button>
              ))}
              {onlineUsers.length > 8 && (
                <button className="online-avatar-item clickable" onClick={() => navigate('/users')}>
                  <div className="online-avatar more">
                    +{onlineUsers.length - 8}
                  </div>
                  <span className="online-name">more</span>
                </button>
              )}
            </div>
          )}
        </div>

        {stats?.recent_contacts?.length > 0 && (
          <div className="home-section">
            <div className="home-section-header">
              <h3>Recent Contacts</h3>
              <button className="link-btn" onClick={() => navigate('/contacts')}>
                View all <FiArrowRight size={13} />
              </button>
            </div>
            <div className="recent-contacts-list">
              {stats.recent_contacts.map((c) => {
                const online = onlineUsers.some((o) => o.id === c.id);
                return (
                  <button
                    key={c.id}
                    className="recent-contact-row clickable"
                    onClick={() => setSelectedUser({ ...c, _online: online })}
                  >
                    <div className="recent-contact-avatar">
                      {c.avatar_url ? (
                        <img src={c.avatar_url} alt="" />
                      ) : (
                        <span>{(c.display_name || c.username).charAt(0).toUpperCase()}</span>
                      )}
                      {online && <span className="online-dot" />}
                    </div>
                    <div className="recent-contact-info">
                      <span className="recent-contact-name">{c.display_name}</span>
                      <span className="recent-contact-user">@{c.username}</span>
                    </div>
                    <span className={`status-badge ${online ? 'online' : 'offline'}`}>
                      {online ? 'Online' : 'Offline'}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        <div className="home-section">
          <div className="home-section-header">
            <h3>Quick Actions</h3>
          </div>
          <div className="quick-actions">
            <button className="quick-action-btn" onClick={() => navigate('/chat')}>
              <FiMessageSquare size={18} />
              <span>New Message</span>
            </button>
            <button className="quick-action-btn" onClick={() => navigate('/contacts')}>
              <FiUsers size={18} />
              <span>Contacts</span>
            </button>
            <button className="quick-action-btn" onClick={() => navigate('/calendar')}>
              <FiCalendar size={18} />
              <span>Calendar</span>
            </button>
            <button className="quick-action-btn" onClick={() => navigate('/history')}>
              <FiPhone size={18} />
              <span>Call History</span>
            </button>
          </div>
        </div>
      </div>

      {/* User Popup */}
      {selectedUser && (
        <div className="ul-popup-overlay" onClick={() => setSelectedUser(null)}>
          <div className="ul-popup" ref={popupRef} onClick={(e) => e.stopPropagation()}>
            <button className="ul-popup-close" onClick={() => setSelectedUser(null)}>
              <FiX size={18} />
            </button>
            <div className="ul-popup-header">
              <div className="ul-popup-avatar online">
                {selectedUser.avatar_url ? (
                  <img src={selectedUser.avatar_url} alt="" className="ul-avatar-img" />
                ) : (
                  <span>{(selectedUser.display_name || selectedUser.username || '?').charAt(0).toUpperCase()}</span>
                )}
                <div className={`ul-dot ${onlineUsers.some(o => o.id === selectedUser.id) ? 'online' : 'offline'}`} />
              </div>
              <h3>{selectedUser.display_name || selectedUser.username}</h3>
              <span className="ul-popup-username">@{selectedUser.username}</span>
              <span className={`ul-popup-status ${onlineUsers.some(o => o.id === selectedUser.id) ? 'online' : 'offline'}`}>
                {onlineUsers.some(o => o.id === selectedUser.id) ? 'Online' : 'Offline'}
              </span>
            </div>
            <div className="ul-popup-actions">
              <button
                className="ul-popup-btn chat"
                onClick={() => { openChat('user', selectedUser.id); setSelectedUser(null); navigate('/chat'); }}
              >
                <FiMessageSquare size={18} />
                <span>Message</span>
              </button>
              <button
                className="ul-popup-btn voice"
                onClick={() => { initiateCall(selectedUser, 'voice'); setSelectedUser(null); }}
              >
                <FiPhone size={18} />
                <span>Voice Call</span>
              </button>
              <button
                className="ul-popup-btn video"
                onClick={() => { initiateCall(selectedUser, 'video'); setSelectedUser(null); }}
              >
                <FiVideo size={18} />
                <span>Video Call</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
