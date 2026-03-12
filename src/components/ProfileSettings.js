import React, { useState, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { authAPI } from '../services/api';
import {
  FiCamera, FiTrash2, FiCheck, FiLock, FiUser, FiMail, FiEdit2, FiX,
} from 'react-icons/fi';

export default function ProfileSettings() {
  const { user, updateUser } = useAuth();
  const fileRef = useRef(null);

  const [activeSection, setActiveSection] = useState(null);

  // Profile edit state
  const [displayName, setDisplayName] = useState(user?.display_name || '');
  const [bio, setBio] = useState(user?.bio || '');
  const [saving, setSaving] = useState(false);
  const [profileMsg, setProfileMsg] = useState(null);

  // Password state
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordMsg, setPasswordMsg] = useState(null);
  const [changingPassword, setChangingPassword] = useState(false);

  // Avatar state
  const [uploading, setUploading] = useState(false);

  const handleAvatarUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      setProfileMsg({ type: 'error', text: 'Image must be under 5MB' });
      return;
    }

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const { data } = await authAPI.uploadAvatar(formData);
      updateUser(data.user);
      setProfileMsg({ type: 'success', text: 'Photo updated' });
    } catch (e) {
      setProfileMsg({ type: 'error', text: e.response?.data?.error || 'Upload failed' });
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  const handleRemoveAvatar = async () => {
    try {
      const { data } = await authAPI.removeAvatar();
      updateUser(data.user);
      setProfileMsg({ type: 'success', text: 'Photo removed' });
    } catch (e) {
      setProfileMsg({ type: 'error', text: 'Failed to remove photo' });
    }
  };

  const handleProfileSave = async () => {
    if (!displayName.trim()) {
      setProfileMsg({ type: 'error', text: 'Display name is required' });
      return;
    }
    setSaving(true);
    setProfileMsg(null);
    try {
      const { data } = await authAPI.updateProfile({
        display_name: displayName.trim(),
        bio: bio.trim(),
      });
      updateUser(data.user);
      setProfileMsg({ type: 'success', text: 'Profile updated' });
      setActiveSection(null);
    } catch (e) {
      setProfileMsg({ type: 'error', text: e.response?.data?.error || 'Update failed' });
    } finally {
      setSaving(false);
    }
  };

  const handlePasswordChange = async () => {
    setPasswordMsg(null);
    if (!currentPassword || !newPassword) {
      setPasswordMsg({ type: 'error', text: 'All fields are required' });
      return;
    }
    if (newPassword.length < 6) {
      setPasswordMsg({ type: 'error', text: 'New password must be at least 6 characters' });
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordMsg({ type: 'error', text: 'Passwords do not match' });
      return;
    }
    setChangingPassword(true);
    try {
      await authAPI.changePassword({
        current_password: currentPassword,
        new_password: newPassword,
      });
      setPasswordMsg({ type: 'success', text: 'Password changed successfully' });
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setActiveSection(null);
    } catch (e) {
      setPasswordMsg({ type: 'error', text: e.response?.data?.error || 'Failed to change password' });
    } finally {
      setChangingPassword(false);
    }
  };

  const memberSince = user?.created_at
    ? new Date(user.created_at).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
    : '';

  return (
    <div className="profile-settings">
      {/* Avatar Section */}
      <div className="profile-card">
        <div className="profile-avatar-section">
          <div className="profile-avatar-large">
            {user?.avatar_url ? (
              <img src={user.avatar_url} alt="" />
            ) : (
              <span>{user?.display_name?.charAt(0).toUpperCase() || <FiUser />}</span>
            )}
            <button
              className="avatar-upload-btn"
              onClick={() => fileRef.current?.click()}
              disabled={uploading}
              title="Change photo"
            >
              <FiCamera size={14} />
            </button>
            <input
              ref={fileRef}
              type="file"
              accept="image/jpeg,image/png,image/gif,image/webp"
              onChange={handleAvatarUpload}
              style={{ display: 'none' }}
            />
          </div>
          <div className="profile-avatar-info">
            <h2>{user?.display_name}</h2>
            <p className="profile-username">@{user?.username}</p>
            {user?.bio && <p className="profile-bio">{user.bio}</p>}
            {memberSince && <p className="profile-since">Member since {memberSince}</p>}
          </div>
        </div>
        {user?.avatar_url && (
          <button className="btn-text danger" onClick={handleRemoveAvatar}>
            <FiTrash2 size={13} /> Remove photo
          </button>
        )}
      </div>

      {profileMsg && (
        <div className={`profile-msg ${profileMsg.type}`}>{profileMsg.text}</div>
      )}

      {/* Account Info */}
      <div className="settings-section">
        <div className="settings-section-header" onClick={() => setActiveSection(activeSection === 'profile' ? null : 'profile')}>
          <div className="settings-section-title">
            <FiEdit2 size={16} />
            <span>Edit Profile</span>
          </div>
          <span className="settings-chevron">{activeSection === 'profile' ? <FiX size={16}/> : <FiEdit2 size={14}/>}</span>
        </div>
        {activeSection === 'profile' && (
          <div className="settings-section-body">
            <div className="form-group">
              <label>Display Name</label>
              <input
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                maxLength={100}
              />
            </div>
            <div className="form-group">
              <label>Bio</label>
              <textarea
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                maxLength={250}
                rows={3}
                placeholder="Write a short bio..."
              />
              <span className="char-count">{bio.length}/250</span>
            </div>
            <button className="btn-primary" onClick={handleProfileSave} disabled={saving}>
              <FiCheck size={15} /> {saving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        )}
      </div>

      <div className="settings-section">
        <div className="settings-section-header" onClick={() => setActiveSection(activeSection === 'password' ? null : 'password')}>
          <div className="settings-section-title">
            <FiLock size={16} />
            <span>Change Password</span>
          </div>
          <span className="settings-chevron">{activeSection === 'password' ? <FiX size={16}/> : <FiLock size={14}/>}</span>
        </div>
        {activeSection === 'password' && (
          <div className="settings-section-body">
            {passwordMsg && (
              <div className={`profile-msg ${passwordMsg.type}`}>{passwordMsg.text}</div>
            )}
            <div className="form-group">
              <label>Current Password</label>
              <input
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
              />
            </div>
            <div className="form-group">
              <label>New Password</label>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                minLength={6}
              />
            </div>
            <div className="form-group">
              <label>Confirm New Password</label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
              />
            </div>
            <button className="btn-primary" onClick={handlePasswordChange} disabled={changingPassword}>
              <FiCheck size={15} /> {changingPassword ? 'Changing...' : 'Change Password'}
            </button>
          </div>
        )}
      </div>

      <div className="settings-section">
        <div className="settings-section-header">
          <div className="settings-section-title">
            <FiUser size={16} />
            <span>Account Information</span>
          </div>
        </div>
        <div className="settings-section-body">
          <div className="info-row">
            <span className="info-label"><FiUser size={13} /> Username</span>
            <span className="info-value">@{user?.username}</span>
          </div>
          <div className="info-row">
            <span className="info-label"><FiMail size={13} /> Email</span>
            <span className="info-value">{user?.email}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
