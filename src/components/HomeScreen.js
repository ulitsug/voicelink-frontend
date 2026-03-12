import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { authAPI } from '../services/api';
import {
  FiUsers, FiMessageSquare, FiPhone, FiCalendar,
  FiPhoneMissed, FiArrowRight,
} from 'react-icons/fi';

export default function HomeScreen({ onlineUsers, onNavigate }) {
  const { user } = useAuth();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStats();
  }, []);

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
      tab: 'contacts',
    },
    {
      label: 'Unread Messages',
      value: stats?.unread_messages ?? '-',
      icon: FiMessageSquare,
      color: 'var(--success)',
      tab: 'chat',
    },
    {
      label: 'Total Calls',
      value: stats?.total_calls ?? '-',
      icon: FiPhone,
      color: 'var(--accent)',
      tab: 'history',
    },
    {
      label: 'Groups',
      value: stats?.groups ?? '-',
      icon: FiCalendar,
      color: 'var(--danger)',
      tab: 'groups',
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
            onClick={() => onNavigate(card.tab)}
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
            <button className="link-btn" onClick={() => onNavigate('contacts')}>
              View all <FiArrowRight size={13} />
            </button>
          </div>
          {onlineUsers.length === 0 ? (
            <p className="empty-hint">No users online</p>
          ) : (
            <div className="online-avatars">
              {onlineUsers.slice(0, 8).map((u) => (
                <div key={u.id} className="online-avatar-item">
                  <div className="online-avatar">
                    {u.avatar_url ? (
                      <img src={u.avatar_url} alt="" />
                    ) : (
                      <span>{(u.username || u.display_name || '?').charAt(0).toUpperCase()}</span>
                    )}
                    <span className="online-dot" />
                  </div>
                  <span className="online-name">{u.username || u.display_name}</span>
                </div>
              ))}
              {onlineUsers.length > 8 && (
                <div className="online-avatar-item">
                  <div className="online-avatar more">
                    +{onlineUsers.length - 8}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {stats?.recent_contacts?.length > 0 && (
          <div className="home-section">
            <div className="home-section-header">
              <h3>Recent Contacts</h3>
              <button className="link-btn" onClick={() => onNavigate('contacts')}>
                View all <FiArrowRight size={13} />
              </button>
            </div>
            <div className="recent-contacts-list">
              {stats.recent_contacts.map((c) => {
                const isOnline = onlineUsers.some((o) => o.id === c.id);
                return (
                  <div key={c.id} className="recent-contact-row">
                    <div className="recent-contact-avatar">
                      {c.avatar_url ? (
                        <img src={c.avatar_url} alt="" />
                      ) : (
                        <span>{(c.display_name || c.username).charAt(0).toUpperCase()}</span>
                      )}
                      {isOnline && <span className="online-dot" />}
                    </div>
                    <div className="recent-contact-info">
                      <span className="recent-contact-name">{c.display_name}</span>
                      <span className="recent-contact-user">@{c.username}</span>
                    </div>
                    <span className={`status-badge ${isOnline ? 'online' : 'offline'}`}>
                      {isOnline ? 'Online' : 'Offline'}
                    </span>
                  </div>
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
            <button className="quick-action-btn" onClick={() => onNavigate('chat')}>
              <FiMessageSquare size={18} />
              <span>New Message</span>
            </button>
            <button className="quick-action-btn" onClick={() => onNavigate('contacts')}>
              <FiUsers size={18} />
              <span>Contacts</span>
            </button>
            <button className="quick-action-btn" onClick={() => onNavigate('calendar')}>
              <FiCalendar size={18} />
              <span>Calendar</span>
            </button>
            <button className="quick-action-btn" onClick={() => onNavigate('history')}>
              <FiPhone size={18} />
              <span>Call History</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
