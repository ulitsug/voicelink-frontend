import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCall } from '../contexts/CallContext';
import { useChat } from '../contexts/ChatContext';
import { useDashboard } from '../contexts/DashboardContext';
import { contactsAPI } from '../services/api';
import {
  FiPhone, FiVideo, FiMessageSquare, FiSearch, FiUserPlus, FiUserX, FiX, FiUsers,
} from 'react-icons/fi';

export default function ContactList() {
  const { contacts, onlineUsers, loadContacts: onRefresh } = useDashboard();
  const navigate = useNavigate();
  const { initiateCall } = useCall();
  const { openChat } = useChat();
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [showSearch, setShowSearch] = useState(false);

  const isOnline = (userId) => onlineUsers.some((u) => u.id === userId);

  const handleSearch = async (query) => {
    setSearchQuery(query);
    if (query.length >= 2) {
      try {
        const { data } = await contactsAPI.searchUsers(query);
        setSearchResults(data.users || []);
      } catch (e) {
        console.error('Search failed:', e);
      }
    } else {
      setSearchResults([]);
    }
  };

  const handleAddContact = async (contactId) => {
    try {
      await contactsAPI.addContact(contactId);
      setSearchResults((prev) => prev.filter((u) => u.id !== contactId));
      onRefresh();
    } catch (e) {
      console.error('Add contact failed:', e);
    }
  };

  const handleRemoveContact = async (contactId) => {
    try {
      await contactsAPI.removeContact(contactId);
      onRefresh();
    } catch (e) {
      console.error('Remove contact failed:', e);
    }
  };

  return (
    <div className="contact-list-panel">
      <div className="panel-actions">
        <button className="btn-icon" onClick={() => setShowSearch(!showSearch)}>
          {showSearch ? <FiX size={18} /> : <FiUserPlus size={18} />}
        </button>
      </div>

      {showSearch && (
        <div className="search-section">
          <div className="search-input-wrapper">
            <FiSearch className="search-icon" />
            <input
              type="text"
              placeholder="Search users to add..."
              value={searchQuery}
              onChange={(e) => handleSearch(e.target.value)}
              autoFocus
            />
          </div>
          {searchResults.length > 0 && (
            <div className="search-results">
              {searchResults.map((user) => (
                <div key={user.id} className="search-result-item">
                  <div className="contact-avatar">
                    {user.display_name?.charAt(0).toUpperCase()}
                  </div>
                  <div className="contact-info">
                    <span className="contact-name">{user.display_name}</span>
                    <span className="contact-username">@{user.username}</span>
                  </div>
                  <button className="btn-add" onClick={() => handleAddContact(user.id)}>
                    <FiUserPlus size={16} /> Add
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      <div className="contacts-list">
        {contacts.length === 0 ? (
          <div className="empty-state">
            <FiUsers size={48} />
            <p>No contacts yet</p>
            <span>Search and add contacts to get started</span>
          </div>
        ) : (
          contacts.map((contact) => (
            <div key={contact.id} className="contact-item">
              <div className="contact-avatar">
                <span>{contact.contact?.display_name?.charAt(0).toUpperCase()}</span>
                <div className={`status-dot ${isOnline(contact.contact_id) ? 'online' : 'offline'}`} />
              </div>
              <div className="contact-info">
                <span className="contact-name">{contact.contact?.display_name}</span>
                <span className="contact-status">
                  {isOnline(contact.contact_id) ? 'Online' : 'Offline'}
                </span>
              </div>
              <div className="contact-actions">
                <button
                  className="btn-action"
                  onClick={() => { openChat('user', contact.contact_id); navigate('/chat'); }}
                  title="Chat"
                >
                  <FiMessageSquare size={16} />
                </button>
                <button
                  className="btn-action call"
                  onClick={() => initiateCall(contact.contact, 'voice')}
                  title={isOnline(contact.contact_id) ? 'Voice Call' : 'Voice Call (user offline)'}
                >
                  <FiPhone size={16} />
                </button>
                <button
                  className="btn-action video"
                  onClick={() => initiateCall(contact.contact, 'video')}
                  title={isOnline(contact.contact_id) ? 'Video Call' : 'Video Call (user offline)'}
                >
                  <FiVideo size={16} />
                </button>
                <button
                  className="btn-action danger"
                  onClick={() => handleRemoveContact(contact.contact_id)}
                  title="Remove"
                >
                  <FiUserX size={14} />
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
