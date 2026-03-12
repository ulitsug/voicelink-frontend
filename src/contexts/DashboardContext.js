import React, { createContext, useContext, useState, useEffect } from 'react';
import { useAuth } from './AuthContext';
import { contactsAPI } from '../services/api';

const DashboardContext = createContext(null);

export function DashboardProvider({ children }) {
  const { socket } = useAuth();
  const [contacts, setContacts] = useState([]);
  const [onlineUsers, setOnlineUsers] = useState([]);

  useEffect(() => { loadContacts(); }, []);

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

  return (
    <DashboardContext.Provider value={{ contacts, onlineUsers, loadContacts }}>
      {children}
    </DashboardContext.Provider>
  );
}

export function useDashboard() {
  const ctx = useContext(DashboardContext);
  if (!ctx) throw new Error('useDashboard must be used within DashboardProvider');
  return ctx;
}
