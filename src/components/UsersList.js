import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCall } from '../contexts/CallContext';
import { useChat } from '../contexts/ChatContext';
import { useDashboard } from '../contexts/DashboardContext';
import { contactsAPI } from '../services/api';
import {
  FiPhone, FiVideo, FiMessageSquare, FiUserPlus, FiUserCheck, FiUsers,
  FiSearch, FiX, FiChevronLeft, FiChevronRight, FiWifi,
} from 'react-icons/fi';

export default function UsersList() {
  const { onlineUsers, loadContacts: onRefresh } = useDashboard();
  const navigate = useNavigate();
  const { initiateCall } = useCall();
  const { openChat } = useChat();
  const [users, setUsers] = useState([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all'); // all | online
  const [selectedUser, setSelectedUser] = useState(null);
  const popupRef = useRef(null);
  const searchTimer = useRef(null);

  const isOnline = (userId) => onlineUsers.some((u) => u.id === userId);

  // Debounced search
  const handleSearch = useCallback((value) => {
    setSearch(value);
    if (searchTimer.current) clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => {
      setPage(1);
      loadUsers(1, value);
    }, 300);
  }, []);

  useEffect(() => {
    loadUsers(page, search);
  }, [page]);

  useEffect(() => {
    return () => { if (searchTimer.current) clearTimeout(searchTimer.current); };
  }, []);

  // Close popup on outside click
  useEffect(() => {
    const handleClick = (e) => {
      if (popupRef.current && !popupRef.current.contains(e.target)) {
        setSelectedUser(null);
      }
    };
    if (selectedUser) document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [selectedUser]);

  const loadUsers = async (p, q = search) => {
    setLoading(true);
    try {
      const { data } = await contactsAPI.listAllUsers(p, q);
      setUsers(data.users || []);
      setTotalPages(data.pages || 1);
      setTotal(data.total || 0);
    } catch (e) {
      console.error('Failed to load users:', e);
    } finally {
      setLoading(false);
    }
  };

  const handleAddContact = async (userId) => {
    try {
      await contactsAPI.addContact(userId);
      setUsers((prev) =>
        prev.map((u) => (u.id === userId ? { ...u, is_contact: true } : u))
      );
      if (selectedUser?.id === userId) {
        setSelectedUser((prev) => ({ ...prev, is_contact: true }));
      }
      onRefresh();
    } catch (e) {
      console.error('Add contact failed:', e);
    }
  };

  // Filter by online if tab is active
  const displayUsers = filter === 'online'
    ? users.filter((u) => isOnline(u.id))
    : users;

  const onlineCount = users.filter((u) => isOnline(u.id)).length;

  // Page range for pagination
  const getPageRange = () => {
    const range = [];
    const maxVisible = 5;
    let start = Math.max(1, page - Math.floor(maxVisible / 2));
    let end = Math.min(totalPages, start + maxVisible - 1);
    if (end - start < maxVisible - 1) start = Math.max(1, end - maxVisible + 1);
    for (let i = start; i <= end; i++) range.push(i);
    return range;
  };

  const getUserAvatar = (user) => {
    if (user.avatar_url) {
      return <img src={user.avatar_url} alt="" className="ul-avatar-img" />;
    }
    return <span>{(user.display_name || user.username || '?').charAt(0).toUpperCase()}</span>;
  };

  return (
    <div className="ul-container">
      {/* Search & Filter Bar */}
      <div className="ul-toolbar">
        <div className="ul-search">
          <FiSearch className="ul-search-icon" size={15} />
          <input
            type="text"
            placeholder="Search by name or username..."
            value={search}
            onChange={(e) => handleSearch(e.target.value)}
          />
          {search && (
            <button className="ul-search-clear" onClick={() => { setSearch(''); setPage(1); loadUsers(1, ''); }}>
              <FiX size={14} />
            </button>
          )}
        </div>
        <div className="ul-filters">
          <button
            className={`ul-filter-btn ${filter === 'all' ? 'active' : ''}`}
            onClick={() => setFilter('all')}
          >
            <FiUsers size={13} /> All ({total})
          </button>
          <button
            className={`ul-filter-btn ${filter === 'online' ? 'active' : ''}`}
            onClick={() => setFilter('online')}
          >
            <FiWifi size={13} /> Online ({onlineCount})
          </button>
        </div>
      </div>

      {/* Users Grid */}
      {loading ? (
        <div className="ul-loading">
          <div className="ul-spinner" />
          <span>Loading users...</span>
        </div>
      ) : displayUsers.length === 0 ? (
        <div className="ul-empty">
          <FiUsers size={44} />
          <p>{filter === 'online' ? 'No users online right now' : search ? 'No users match your search' : 'No users registered yet'}</p>
          <span>{filter === 'online' ? 'Try checking back later' : search ? 'Try a different search term' : 'Invite people to join'}</span>
        </div>
      ) : (
        <div className="ul-grid">
          {displayUsers.map((user) => {
            const online = isOnline(user.id);
            return (
              <div
                key={user.id}
                className={`ul-card ${online ? 'is-online' : ''}`}
                onClick={() => setSelectedUser(user)}
              >
                <div className="ul-card-avatar">
                  {getUserAvatar(user)}
                  <div className={`ul-dot ${online ? 'online' : 'offline'}`} />
                </div>
                <div className="ul-card-info">
                  <span className="ul-card-name">{user.display_name}</span>
                  <span className="ul-card-username">@{user.username}</span>
                </div>
                <div className="ul-card-badges">
                  {user.is_contact && (
                    <span className="ul-badge contact"><FiUserCheck size={10} /> Contact</span>
                  )}
                  {online && (
                    <span className="ul-badge online">Online</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && filter === 'all' && (
        <div className="ul-pagination">
          <button
            className="ul-page-btn"
            disabled={page <= 1}
            onClick={() => setPage(page - 1)}
          >
            <FiChevronLeft size={14} />
          </button>
          {getPageRange().map((p) => (
            <button
              key={p}
              className={`ul-page-btn ${p === page ? 'active' : ''}`}
              onClick={() => setPage(p)}
            >
              {p}
            </button>
          ))}
          <button
            className="ul-page-btn"
            disabled={page >= totalPages}
            onClick={() => setPage(page + 1)}
          >
            <FiChevronRight size={14} />
          </button>
          <span className="ul-page-info">{total} user{total !== 1 ? 's' : ''}</span>
        </div>
      )}

      {/* User Popup */}
      {selectedUser && (
        <div className="ul-popup-overlay" onClick={() => setSelectedUser(null)}>
          <div
            className="ul-popup"
            ref={popupRef}
            onClick={(e) => e.stopPropagation()}
          >
            <button className="ul-popup-close" onClick={() => setSelectedUser(null)}>
              <FiX size={18} />
            </button>
            <div className="ul-popup-header">
              <div className={`ul-popup-avatar ${isOnline(selectedUser.id) ? 'online' : ''}`}>
                {getUserAvatar(selectedUser)}
                <div className={`ul-dot ${isOnline(selectedUser.id) ? 'online' : 'offline'}`} />
              </div>
              <h3>{selectedUser.display_name}</h3>
              <span className="ul-popup-username">@{selectedUser.username}</span>
              {selectedUser.bio && <p className="ul-popup-bio">{selectedUser.bio}</p>}
              <span className={`ul-popup-status ${isOnline(selectedUser.id) ? 'online' : 'offline'}`}>
                {isOnline(selectedUser.id) ? 'Online' : 'Offline'}
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
            {!selectedUser.is_contact ? (
              <button className="ul-popup-add" onClick={() => handleAddContact(selectedUser.id)}>
                <FiUserPlus size={15} /> Add to Contacts
              </button>
            ) : (
              <div className="ul-popup-contact-badge">
                <FiUserCheck size={14} /> Already in your contacts
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
