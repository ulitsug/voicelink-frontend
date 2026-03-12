import React, { useState, useEffect } from 'react';
import { groupsAPI, contactsAPI } from '../services/api';
import { useChat } from '../contexts/ChatContext';
import { useCall } from '../contexts/CallContext';
import { useDashboard } from '../contexts/DashboardContext';
import {
  FiPlus, FiUsers, FiEdit2, FiTrash2, FiUserPlus, FiUserMinus,
  FiMessageSquare, FiPhone, FiVideo, FiX, FiSearch,
} from 'react-icons/fi';

export default function GroupManager() {
  const { contacts } = useDashboard();
  const { openChat } = useChat();
  const { initiateCall } = useCall();
  const [groups, setGroups] = useState([]);
  const [showCreate, setShowCreate] = useState(false);
  const [selectedGroup, setSelectedGroup] = useState(null);
  const [newGroupName, setNewGroupName] = useState('');
  const [newGroupDesc, setNewGroupDesc] = useState('');
  const [selectedMembers, setSelectedMembers] = useState([]);
  const [showAddMember, setShowAddMember] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);

  useEffect(() => {
    loadGroups();
  }, []);

  const loadGroups = async () => {
    try {
      const { data } = await groupsAPI.getGroups();
      setGroups(data.groups || []);
    } catch (e) {
      console.error('Failed to load groups:', e);
    }
  };

  const handleCreateGroup = async () => {
    if (!newGroupName.trim()) return;
    try {
      await groupsAPI.createGroup({
        name: newGroupName.trim(),
        description: newGroupDesc.trim(),
        member_ids: selectedMembers,
      });
      setNewGroupName('');
      setNewGroupDesc('');
      setSelectedMembers([]);
      setShowCreate(false);
      loadGroups();
    } catch (e) {
      console.error('Create group failed:', e);
    }
  };

  const handleDeleteGroup = async (groupId) => {
    if (!window.confirm('Delete this group?')) return;
    try {
      await groupsAPI.deleteGroup(groupId);
      setSelectedGroup(null);
      loadGroups();
    } catch (e) {
      console.error('Delete group failed:', e);
    }
  };

  const handleAddMember = async (userId) => {
    if (!selectedGroup) return;
    try {
      await groupsAPI.addMember(selectedGroup.id, userId);
      const { data } = await groupsAPI.getGroup(selectedGroup.id);
      setSelectedGroup(data.group);
      loadGroups();
    } catch (e) {
      console.error('Add member failed:', e);
    }
  };

  const handleRemoveMember = async (userId) => {
    if (!selectedGroup) return;
    try {
      await groupsAPI.removeMember(selectedGroup.id, userId);
      const { data } = await groupsAPI.getGroup(selectedGroup.id);
      setSelectedGroup(data.group);
      loadGroups();
    } catch (e) {
      console.error('Remove member failed:', e);
    }
  };

  const handleSearchUsers = async (q) => {
    setSearchQuery(q);
    if (q.length >= 2) {
      try {
        const { data } = await contactsAPI.searchUsers(q);
        setSearchResults(data.users || []);
      } catch (e) {
        console.error(e);
      }
    } else {
      setSearchResults([]);
    }
  };

  const toggleMember = (id) => {
    setSelectedMembers((prev) =>
      prev.includes(id) ? prev.filter((m) => m !== id) : [...prev, id]
    );
  };

  // Group detail view
  if (selectedGroup) {
    return (
      <div className="group-detail">
        <div className="panel-header">
          <button className="btn-back" onClick={() => setSelectedGroup(null)}>
            <FiX size={18} />
          </button>
          <h2>{selectedGroup.name}</h2>
          <div className="header-actions">
            <button className="btn-icon" onClick={() => openChat('group', selectedGroup.id)}>
              <FiMessageSquare size={16} />
            </button>
            <button className="btn-icon danger" onClick={() => handleDeleteGroup(selectedGroup.id)}>
              <FiTrash2 size={16} />
            </button>
          </div>
        </div>

        {selectedGroup.description && (
          <p className="group-description">{selectedGroup.description}</p>
        )}

        <div className="section-header">
          <h3>Members ({selectedGroup.members?.length || 0})</h3>
          <button className="btn-icon" onClick={() => setShowAddMember(!showAddMember)}>
            <FiUserPlus size={18} />
          </button>
        </div>

        {showAddMember && (
          <div className="search-section">
            <div className="search-input-wrapper">
              <FiSearch className="search-icon" />
              <input
                type="text"
                placeholder="Search users to add..."
                value={searchQuery}
                onChange={(e) => handleSearchUsers(e.target.value)}
              />
            </div>
            {searchResults.map((u) => (
              <div key={u.id} className="search-result-item">
                <span>{u.display_name}</span>
                <button className="btn-add" onClick={() => handleAddMember(u.id)}>
                  <FiUserPlus size={14} /> Add
                </button>
              </div>
            ))}
          </div>
        )}

        <div className="members-list">
          {selectedGroup.members?.map((member) => (
            <div key={member.id} className="member-item">
              <div className="contact-avatar">
                {member.user?.display_name?.charAt(0).toUpperCase()}
              </div>
              <div className="contact-info">
                <span className="contact-name">{member.user?.display_name}</span>
                <span className="member-role">{member.role}</span>
              </div>
              <div className="contact-actions">
                <button
                  className="btn-action call"
                  onClick={() => member.user && initiateCall(member.user, 'voice')}
                  title="Voice Call"
                >
                  <FiPhone size={14} />
                </button>
                <button
                  className="btn-action video"
                  onClick={() => member.user && initiateCall(member.user, 'video')}
                  title="Video Call"
                >
                  <FiVideo size={14} />
                </button>
                {member.role !== 'admin' && (
                  <button
                    className="btn-action danger"
                    onClick={() => handleRemoveMember(member.user_id)}
                  >
                    <FiUserMinus size={14} />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="group-manager">
      <div className="panel-actions">
        <button className="btn-icon" onClick={() => setShowCreate(!showCreate)}>
          {showCreate ? <FiX size={18} /> : <FiPlus size={18} />}
        </button>
      </div>

      {showCreate && (
        <div className="create-group-form">
          <input
            type="text"
            placeholder="Group Name"
            value={newGroupName}
            onChange={(e) => setNewGroupName(e.target.value)}
          />
          <input
            type="text"
            placeholder="Description (optional)"
            value={newGroupDesc}
            onChange={(e) => setNewGroupDesc(e.target.value)}
          />
          <div className="member-selection">
            <p>Select members:</p>
            {contacts.map((c) => (
              <label key={c.contact_id} className="member-checkbox">
                <input
                  type="checkbox"
                  checked={selectedMembers.includes(c.contact_id)}
                  onChange={() => toggleMember(c.contact_id)}
                />
                <span>{c.contact?.display_name}</span>
              </label>
            ))}
          </div>
          <button className="btn-primary" onClick={handleCreateGroup}>
            Create Group
          </button>
        </div>
      )}

      <div className="groups-list">
        {groups.length === 0 ? (
          <div className="empty-state">
            <FiUsers size={48} />
            <p>No groups yet</p>
            <span>Create a group to start collaborating</span>
          </div>
        ) : (
          groups.map((group) => (
            <div
              key={group.id}
              className="group-item"
              onClick={() => setSelectedGroup(group)}
            >
              <div className="group-avatar">
                <FiUsers size={20} />
              </div>
              <div className="group-info">
                <span className="group-name">{group.name}</span>
                <span className="group-meta">{group.member_count} members</span>
              </div>
              <div className="group-actions">
                <button
                  className="btn-action"
                  onClick={(e) => { e.stopPropagation(); openChat('group', group.id); }}
                >
                  <FiMessageSquare size={16} />
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
