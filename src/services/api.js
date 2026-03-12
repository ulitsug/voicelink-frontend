import axios from 'axios';

const API_BASE = '/api';

const api = axios.create({
  baseURL: API_BASE,
  headers: { 'Content-Type': 'application/json' },
});

// Attach JWT token to every request
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('access_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle 401 responses (expired token)
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('access_token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// Auth
export const authAPI = {
  register: (data) => api.post('/auth/register', data),
  login: (data) => api.post('/auth/login', data),
  getMe: () => api.get('/auth/me'),
  updateProfile: (data) => api.put('/auth/update-profile', data),
  changePassword: (data) => api.put('/auth/change-password', data),
  uploadAvatar: (formData) => api.post('/auth/upload-avatar', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  }),
  removeAvatar: () => api.delete('/auth/remove-avatar'),
  getDashboardStats: () => api.get('/auth/dashboard-stats'),
};

// Contacts
export const contactsAPI = {
  getContacts: () => api.get('/contacts'),
  searchUsers: (query) => api.get(`/contacts/search?q=${encodeURIComponent(query)}`),
  listAllUsers: (page = 1) => api.get(`/contacts/users?page=${page}`),
  addContact: (contactId) => api.post('/contacts', { contact_id: contactId }),
  removeContact: (contactId) => api.delete(`/contacts/${contactId}`),
  blockContact: (contactId) => api.put(`/contacts/${contactId}/block`),
  unblockContact: (contactId) => api.put(`/contacts/${contactId}/unblock`),
};

// Calls
export const callsAPI = {
  getHistory: (page = 1) => api.get(`/calls/history?page=${page}`),
  createLog: (data) => api.post('/calls/log', data),
  updateLog: (callId, data) => api.put(`/calls/log/${callId}`, data),
  getIceConfig: () => api.get('/calls/ice-config'),
};

// Chat
export const chatAPI = {
  getMessages: (userId, page = 1) => api.get(`/chat/messages/${userId}?page=${page}`),
  sendMessage: (data) => api.post('/chat/messages', data),
  uploadFile: (formData) => api.post('/chat/upload', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  }),
  getUnreadCounts: () => api.get('/chat/unread'),
  getConversations: () => api.get('/chat/conversations'),
};

// Groups
export const groupsAPI = {
  getGroups: () => api.get('/groups'),
  createGroup: (data) => api.post('/groups', data),
  getGroup: (groupId) => api.get(`/groups/${groupId}`),
  updateGroup: (groupId, data) => api.put(`/groups/${groupId}`, data),
  deleteGroup: (groupId) => api.delete(`/groups/${groupId}`),
  addMember: (groupId, userId) => api.post(`/groups/${groupId}/members`, { user_id: userId }),
  removeMember: (groupId, userId) => api.delete(`/groups/${groupId}/members/${userId}`),
  getGroupMessages: (groupId, page = 1) => api.get(`/groups/${groupId}/messages?page=${page}`),
};

// Calendar
export const calendarAPI = {
  getEvents: () => api.get('/calendar/events'),
  createEvent: (data) => api.post('/calendar/events', data),
  updateEvent: (eventId, data) => api.put(`/calendar/events/${eventId}`, data),
  deleteEvent: (eventId) => api.delete(`/calendar/events/${eventId}`),
  respondToEvent: (eventId, status) => api.put(`/calendar/events/${eventId}/respond`, { status }),
};

export default api;
