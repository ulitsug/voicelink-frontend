import React, { useState, useEffect, useRef } from 'react';
import { adminAPI } from '../services/api';
import {
  FiUsers, FiSettings, FiServer, FiActivity, FiSearch,
  FiPlus, FiEdit2, FiTrash2, FiX, FiChevronLeft, FiChevronRight,
  FiShield, FiUser, FiSave, FiDatabase, FiWifi, FiCpu,
  FiMessageSquare, FiPhone, FiGlobe,
} from 'react-icons/fi';

const ADMIN_TABS = [
  { id: 'overview', label: 'Overview', icon: FiActivity },
  { id: 'users', label: 'Users', icon: FiUsers },
  { id: 'system', label: 'System Info', icon: FiServer },
  { id: 'config', label: 'Configuration', icon: FiSettings },
];

export default function AdminPanel() {
  const [activeTab, setActiveTab] = useState('overview');

  return (
    <div className="adm-container">
      <div className="adm-sidebar">
        {ADMIN_TABS.map(tab => (
          <button
            key={tab.id}
            className={`adm-tab ${activeTab === tab.id ? 'active' : ''}`}
            onClick={() => setActiveTab(tab.id)}
          >
            <tab.icon size={16} />
            <span>{tab.label}</span>
          </button>
        ))}
      </div>
      <div className="adm-content">
        {activeTab === 'overview' && <AdminOverview />}
        {activeTab === 'users' && <AdminUsers />}
        {activeTab === 'system' && <AdminSystemInfo />}
        {activeTab === 'config' && <AdminConfig />}
      </div>
    </div>
  );
}

/* ── Overview Tab ──────────────────────────────────────────── */
function AdminOverview() {
  const [stats, setStats] = useState(null);
  const [msgStats, setMsgStats] = useState(null);
  const [callStats, setCallStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      adminAPI.getDashboard(),
      adminAPI.getMessageStats(),
      adminAPI.getCallStats(),
    ]).then(([d, m, c]) => {
      setStats(d.data);
      setMsgStats(m.data);
      setCallStats(c.data);
    }).catch(e => console.error(e))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="adm-loading">Loading dashboard...</div>;

  const cards = [
    { label: 'Total Users', value: stats?.total_users, icon: FiUsers, color: 'var(--primary)' },
    { label: 'New Today', value: stats?.new_users_today, icon: FiPlus, color: 'var(--success)' },
    { label: 'Total Messages', value: stats?.total_messages, icon: FiMessageSquare, color: '#6366f1' },
    { label: 'Messages Today', value: stats?.messages_today, icon: FiMessageSquare, color: '#06b6d4' },
    { label: 'Total Calls', value: stats?.total_calls, icon: FiPhone, color: 'var(--accent)' },
    { label: 'Calls Today', value: stats?.calls_today, icon: FiPhone, color: '#f59e0b' },
    { label: 'Active Calls', value: stats?.active_calls, icon: FiActivity, color: 'var(--success)' },
    { label: 'Groups', value: stats?.total_groups, icon: FiUsers, color: 'var(--danger)' },
  ];

  return (
    <div>
      <h2 className="adm-section-title">Platform Overview</h2>
      <div className="adm-stats-grid">
        {cards.map(c => (
          <div key={c.label} className="adm-stat-card">
            <div className="adm-stat-icon" style={{ color: c.color, background: c.color + '15' }}>
              <c.icon size={20} />
            </div>
            <div className="adm-stat-info">
              <span className="adm-stat-value">{c.value ?? '-'}</span>
              <span className="adm-stat-label">{c.label}</span>
            </div>
          </div>
        ))}
      </div>

      <div className="adm-row">
        {msgStats && (
          <div className="adm-info-card">
            <h3><FiMessageSquare size={15} /> Message Breakdown</h3>
            <div className="adm-kv-list">
              <div className="adm-kv"><span>Total</span><strong>{msgStats.total}</strong></div>
              <div className="adm-kv"><span>Today</span><strong>{msgStats.today}</strong></div>
              {Object.entries(msgStats.by_type || {}).map(([k, v]) => (
                <div key={k} className="adm-kv"><span>{k}</span><strong>{v}</strong></div>
              ))}
            </div>
          </div>
        )}

        {callStats && (
          <div className="adm-info-card">
            <h3><FiPhone size={15} /> Call Breakdown</h3>
            <div className="adm-kv-list">
              <div className="adm-kv"><span>Total</span><strong>{callStats.total}</strong></div>
              <div className="adm-kv"><span>Today</span><strong>{callStats.today}</strong></div>
              <div className="adm-kv"><span>Avg Duration</span><strong>{callStats.avg_duration_seconds}s</strong></div>
              {Object.entries(callStats.by_status || {}).map(([k, v]) => (
                <div key={k} className="adm-kv"><span>{k}</span><strong>{v}</strong></div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/* ── Users Tab ─────────────────────────────────────────────── */
function AdminUsers() {
  const [users, setUsers] = useState([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [loading, setLoading] = useState(false);
  const [editUser, setEditUser] = useState(null);
  const [showCreate, setShowCreate] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const searchTimer = useRef(null);

  useEffect(() => { loadUsers(); }, [page, roleFilter]);

  const loadUsers = (q = search) => {
    setLoading(true);
    adminAPI.getUsers(page, q, roleFilter)
      .then(({ data }) => {
        setUsers(data.users || []);
        setTotalPages(data.pages || 1);
        setTotal(data.total || 0);
      })
      .catch(e => console.error(e))
      .finally(() => setLoading(false));
  };

  const handleSearch = (val) => {
    setSearch(val);
    if (searchTimer.current) clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => { setPage(1); loadUsers(val); }, 300);
  };

  const handleDelete = async (userId) => {
    try {
      await adminAPI.deleteUser(userId);
      setDeleteConfirm(null);
      loadUsers();
    } catch (e) {
      alert(e.response?.data?.error || 'Delete failed');
    }
  };

  const roleBadge = (role) => {
    const cls = role === 'super_admin' ? 'super' : role === 'admin' ? 'admin' : 'user';
    return <span className={`adm-role-badge ${cls}`}>{role === 'super_admin' ? 'Super Admin' : role === 'admin' ? 'Admin' : 'User'}</span>;
  };

  return (
    <div>
      <div className="adm-toolbar">
        <h2 className="adm-section-title">User Management</h2>
        <button className="adm-btn primary" onClick={() => setShowCreate(true)}>
          <FiPlus size={14} /> Create User
        </button>
      </div>

      <div className="adm-filters">
        <div className="adm-search">
          <FiSearch size={14} />
          <input
            placeholder="Search users..."
            value={search}
            onChange={(e) => handleSearch(e.target.value)}
          />
          {search && <button className="adm-clear" onClick={() => { setSearch(''); setPage(1); loadUsers(''); }}><FiX size={12} /></button>}
        </div>
        <select value={roleFilter} onChange={(e) => { setRoleFilter(e.target.value); setPage(1); }}>
          <option value="">All Roles</option>
          <option value="user">User</option>
          <option value="admin">Admin</option>
          <option value="super_admin">Super Admin</option>
        </select>
      </div>

      {loading ? (
        <div className="adm-loading">Loading users...</div>
      ) : (
        <div className="adm-table-wrap">
          <table className="adm-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>User</th>
                <th>Email</th>
                <th>Role</th>
                <th>Created</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map(u => (
                <tr key={u.id}>
                  <td>{u.id}</td>
                  <td>
                    <div className="adm-user-cell">
                      <div className="adm-user-avatar">
                        {u.avatar_url ? <img src={u.avatar_url} alt="" /> : u.display_name?.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <div className="adm-user-name">{u.display_name}</div>
                        <div className="adm-user-uname">@{u.username}</div>
                      </div>
                    </div>
                  </td>
                  <td className="adm-email">{u.email}</td>
                  <td>{roleBadge(u.role)}</td>
                  <td className="adm-date">{u.created_at ? new Date(u.created_at).toLocaleDateString() : '-'}</td>
                  <td>
                    <div className="adm-actions">
                      <button className="adm-icon-btn" title="Edit" onClick={() => setEditUser(u)}>
                        <FiEdit2 size={14} />
                      </button>
                      {u.role !== 'super_admin' && (
                        <button className="adm-icon-btn danger" title="Delete" onClick={() => setDeleteConfirm(u)}>
                          <FiTrash2 size={14} />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {users.length === 0 && (
                <tr><td colSpan={6} className="adm-empty-row">No users found</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {totalPages > 1 && (
        <div className="adm-pagination">
          <button disabled={page <= 1} onClick={() => setPage(page - 1)}><FiChevronLeft size={14} /></button>
          <span>Page {page} of {totalPages} ({total} users)</span>
          <button disabled={page >= totalPages} onClick={() => setPage(page + 1)}><FiChevronRight size={14} /></button>
        </div>
      )}

      {/* Edit Modal */}
      {editUser && (
        <UserFormModal
          user={editUser}
          onClose={() => setEditUser(null)}
          onSaved={() => { setEditUser(null); loadUsers(); }}
        />
      )}

      {/* Create Modal */}
      {showCreate && (
        <UserFormModal
          onClose={() => setShowCreate(false)}
          onSaved={() => { setShowCreate(false); loadUsers(); }}
        />
      )}

      {/* Delete Confirm */}
      {deleteConfirm && (
        <div className="adm-modal-overlay" onClick={() => setDeleteConfirm(null)}>
          <div className="adm-modal small" onClick={e => e.stopPropagation()}>
            <h3>Delete User</h3>
            <p>Are you sure you want to delete <strong>{deleteConfirm.display_name}</strong> (@{deleteConfirm.username})? This will remove all their data and cannot be undone.</p>
            <div className="adm-modal-actions">
              <button className="adm-btn" onClick={() => setDeleteConfirm(null)}>Cancel</button>
              <button className="adm-btn danger" onClick={() => handleDelete(deleteConfirm.id)}>Delete</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ── User Form Modal ───────────────────────────────────────── */
function UserFormModal({ user, onClose, onSaved }) {
  const isEdit = !!user;
  const [form, setForm] = useState({
    username: user?.username || '',
    email: user?.email || '',
    display_name: user?.display_name || '',
    bio: user?.bio || '',
    role: user?.role || 'user',
    password: '',
  });
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSaving(true);
    try {
      if (isEdit) {
        const payload = { ...form };
        if (!payload.password) delete payload.password;
        await adminAPI.updateUser(user.id, payload);
      } else {
        if (!form.password) { setError('Password is required'); setSaving(false); return; }
        await adminAPI.createUser(form);
      }
      onSaved();
    } catch (e) {
      setError(e.response?.data?.error || 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="adm-modal-overlay" onClick={onClose}>
      <div className="adm-modal" onClick={e => e.stopPropagation()}>
        <div className="adm-modal-header">
          <h3>{isEdit ? 'Edit User' : 'Create User'}</h3>
          <button className="adm-close" onClick={onClose}><FiX size={18} /></button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="adm-form-grid">
            <div className="adm-field">
              <label>Username</label>
              <input value={form.username} onChange={e => setForm(f => ({ ...f, username: e.target.value }))} required />
            </div>
            <div className="adm-field">
              <label>Display Name</label>
              <input value={form.display_name} onChange={e => setForm(f => ({ ...f, display_name: e.target.value }))} required />
            </div>
            <div className="adm-field">
              <label>Email</label>
              <input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} required />
            </div>
            <div className="adm-field">
              <label>Role</label>
              <select
                value={form.role}
                onChange={e => setForm(f => ({ ...f, role: e.target.value }))}
                disabled={user?.role === 'super_admin'}
              >
                <option value="user">User</option>
                <option value="admin">Admin</option>
                {user?.role === 'super_admin' && <option value="super_admin">Super Admin</option>}
              </select>
            </div>
            <div className="adm-field full">
              <label>Bio</label>
              <input value={form.bio} onChange={e => setForm(f => ({ ...f, bio: e.target.value }))} maxLength={250} />
            </div>
            <div className="adm-field full">
              <label>{isEdit ? 'New Password (leave blank to keep)' : 'Password'}</label>
              <input type="password" value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))} {...(!isEdit && { required: true })} />
            </div>
          </div>
          {error && <div className="adm-error">{error}</div>}
          <div className="adm-modal-actions">
            <button type="button" className="adm-btn" onClick={onClose}>Cancel</button>
            <button type="submit" className="adm-btn primary" disabled={saving}>
              <FiSave size={14} /> {saving ? 'Saving...' : isEdit ? 'Save Changes' : 'Create User'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

/* ── System Info Tab ───────────────────────────────────────── */
function AdminSystemInfo() {
  const [info, setInfo] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    adminAPI.getSystemInfo()
      .then(({ data }) => setInfo(data))
      .catch(e => console.error(e))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="adm-loading">Loading system info...</div>;

  const sections = [
    {
      title: 'Network',
      icon: FiWifi,
      items: [
        ['Hostname', info?.hostname],
        ['Local IP', info?.local_ip],
        ['Server Host', info?.server_host],
        ['Server Port', info?.server_port],
        ['Frontend URL', `https://${info?.local_ip}:3000`],
        ['Backend URL', `https://${info?.local_ip}:${info?.server_port}`],
      ],
    },
    {
      title: 'Platform',
      icon: FiCpu,
      items: [
        ['OS', info?.platform],
        ['Python', info?.python_version],
      ],
    },
    {
      title: 'Database',
      icon: FiDatabase,
      items: [
        ['Host', info?.db_host],
        ['Port', info?.db_port],
        ['Database', info?.db_name],
        ['User', info?.db_user],
      ],
    },
    {
      title: 'TURN Server',
      icon: FiGlobe,
      items: [
        ['Host', info?.turn_host],
        ['Port', info?.turn_port],
        ['Username', info?.turn_username],
      ],
    },
    {
      title: 'Storage',
      icon: FiServer,
      items: [
        ['Upload Folder', info?.upload_folder],
        ['Max Upload', `${info?.max_upload_mb} MB`],
      ],
    },
  ];

  return (
    <div>
      <h2 className="adm-section-title">System Information</h2>
      <div className="adm-info-grid">
        {sections.map(s => (
          <div key={s.title} className="adm-info-card">
            <h3><s.icon size={15} /> {s.title}</h3>
            <div className="adm-kv-list">
              {s.items.map(([k, v]) => (
                <div key={k} className="adm-kv">
                  <span>{k}</span>
                  <strong>{v ?? '-'}</strong>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ── Config Tab ────────────────────────────────────────────── */
function AdminConfig() {
  const [configs, setConfigs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newKey, setNewKey] = useState('');
  const [newValue, setNewValue] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [editValue, setEditValue] = useState('');

  useEffect(() => { loadConfigs(); }, []);

  const loadConfigs = () => {
    setLoading(true);
    adminAPI.getConfig()
      .then(({ data }) => setConfigs(data.configs || []))
      .catch(e => console.error(e))
      .finally(() => setLoading(false));
  };

  const handleAdd = async () => {
    if (!newKey.trim()) return;
    try {
      await adminAPI.updateConfig({ key: newKey.trim(), value: newValue, description: newDesc });
      setNewKey(''); setNewValue(''); setNewDesc('');
      loadConfigs();
    } catch (e) {
      alert(e.response?.data?.error || 'Failed to save');
    }
  };

  const handleUpdate = async (key) => {
    try {
      await adminAPI.updateConfig({ key, value: editValue });
      setEditingId(null);
      loadConfigs();
    } catch (e) {
      alert(e.response?.data?.error || 'Failed to update');
    }
  };

  const handleDelete = async (key) => {
    if (!window.confirm(`Delete config "${key}"?`)) return;
    try {
      await adminAPI.deleteConfig(key);
      loadConfigs();
    } catch (e) {
      alert(e.response?.data?.error || 'Failed to delete');
    }
  };

  return (
    <div>
      <h2 className="adm-section-title">System Configuration</h2>
      <p className="adm-desc">Dynamic key-value settings for the platform. Changes take effect immediately.</p>

      <div className="adm-config-add">
        <input placeholder="Key" value={newKey} onChange={e => setNewKey(e.target.value)} />
        <input placeholder="Value" value={newValue} onChange={e => setNewValue(e.target.value)} />
        <input placeholder="Description (optional)" value={newDesc} onChange={e => setNewDesc(e.target.value)} />
        <button className="adm-btn primary" onClick={handleAdd} disabled={!newKey.trim()}>
          <FiPlus size={14} /> Add
        </button>
      </div>

      {loading ? (
        <div className="adm-loading">Loading configuration...</div>
      ) : configs.length === 0 ? (
        <div className="adm-empty">No configuration entries yet. Add one above.</div>
      ) : (
        <div className="adm-table-wrap">
          <table className="adm-table">
            <thead>
              <tr>
                <th>Key</th>
                <th>Value</th>
                <th>Description</th>
                <th>Updated</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {configs.map(c => (
                <tr key={c.id}>
                  <td><code>{c.key}</code></td>
                  <td>
                    {editingId === c.id ? (
                      <div className="adm-inline-edit">
                        <input value={editValue} onChange={e => setEditValue(e.target.value)} autoFocus />
                        <button className="adm-icon-btn" onClick={() => handleUpdate(c.key)}><FiSave size={13} /></button>
                        <button className="adm-icon-btn" onClick={() => setEditingId(null)}><FiX size={13} /></button>
                      </div>
                    ) : (
                      <span className="adm-config-val">{c.value || <em>empty</em>}</span>
                    )}
                  </td>
                  <td className="adm-desc-cell">{c.description || '-'}</td>
                  <td className="adm-date">{c.updated_at ? new Date(c.updated_at).toLocaleString() : '-'}</td>
                  <td>
                    <div className="adm-actions">
                      <button className="adm-icon-btn" title="Edit" onClick={() => { setEditingId(c.id); setEditValue(c.value || ''); }}><FiEdit2 size={14} /></button>
                      <button className="adm-icon-btn danger" title="Delete" onClick={() => handleDelete(c.key)}><FiTrash2 size={14} /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
