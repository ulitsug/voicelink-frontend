import React, { useState, useEffect } from 'react';
import { useCall } from '../contexts/CallContext';
import { useChat } from '../contexts/ChatContext';
import { contactsAPI } from '../services/api';
import {
  FiPhone, FiVideo, FiMessageSquare, FiUserPlus, FiUserCheck, FiUsers,
} from 'react-icons/fi';

export default function UsersList({ onlineUsers, onRefresh }) {
  const { initiateCall } = useCall();
  const { openChat } = useChat();
  const [users, setUsers] = useState([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(false);

  const isOnline = (userId) => onlineUsers.some((u) => u.id === userId);

  useEffect(() => {
    loadUsers(page);
  }, [page]);

  const loadUsers = async (p) => {
    setLoading(true);
    try {
      const { data } = await contactsAPI.listAllUsers(p);
      setUsers(data.users || []);
      setTotalPages(data.pages || 1);
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
      onRefresh();
    } catch (e) {
      console.error('Add contact failed:', e);
    }
  };

  return (
    <div className="contact-list-panel">
      {loading ? (
        <div className="empty-state small">
          <p>Loading users...</p>
        </div>
      ) : users.length === 0 ? (
        <div className="empty-state">
          <FiUsers size={48} />
          <p>No other users registered</p>
          <span>Invite people to join the platform</span>
        </div>
      ) : (
        <div className="contacts-list">
          {users.map((user) => (
            <div key={user.id} className="contact-item">
              <div className="contact-avatar">
                <span>{user.display_name?.charAt(0).toUpperCase()}</span>
                <div className={`status-dot ${isOnline(user.id) ? 'online' : 'offline'}`} />
              </div>
              <div className="contact-info">
                <span className="contact-name">{user.display_name}</span>
                <span className="contact-username">@{user.username}</span>
              </div>
              <div className="contact-actions">
                {!user.is_contact ? (
                  <button
                    className="btn-add"
                    onClick={() => handleAddContact(user.id)}
                    title="Add to Contacts"
                  >
                    <FiUserPlus size={14} /> Add
                  </button>
                ) : (
                  <span style={{ fontSize: 12, color: 'var(--success)', display: 'flex', alignItems: 'center', gap: 4 }}>
                    <FiUserCheck size={14} /> Contact
                  </span>
                )}
                <button
                  className="btn-action"
                  onClick={() => openChat('user', user.id)}
                  title="Chat"
                >
                  <FiMessageSquare size={16} />
                </button>
                <button
                  className="btn-action call"
                  onClick={() => initiateCall(user, 'voice')}
                  title={isOnline(user.id) ? 'Voice Call' : 'Voice Call (user offline)'}
                >
                  <FiPhone size={16} />
                </button>
                <button
                  className="btn-action video"
                  onClick={() => initiateCall(user, 'video')}
                  title={isOnline(user.id) ? 'Video Call' : 'Video Call (user offline)'}
                >
                  <FiVideo size={16} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {totalPages > 1 && (
        <div className="pagination">
          <button disabled={page <= 1} onClick={() => setPage(page - 1)}>
            Previous
          </button>
          <span>Page {page} of {totalPages}</span>
          <button disabled={page >= totalPages} onClick={() => setPage(page + 1)}>
            Next
          </button>
        </div>
      )}
    </div>
  );
}
