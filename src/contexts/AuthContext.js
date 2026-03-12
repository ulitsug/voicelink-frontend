import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { authAPI } from '../services/api';
import { connectSocket, disconnectSocket } from '../services/socket';
import { subscribeToPush, unsubscribeFromPush, requestNotificationPermission } from '../services/serviceWorker';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [socket, setSocket] = useState(null);

  // Check stored session on mount
  useEffect(() => {
    const token = localStorage.getItem('access_token');
    const storedUser = localStorage.getItem('user');
    if (token && storedUser) {
      try {
        setUser(JSON.parse(storedUser));
        const sock = connectSocket(token);
        setSocket(sock);
        // Subscribe to push on reconnect
        requestNotificationPermission().then((perm) => {
          if (perm === 'granted') subscribeToPush(token);
        });
      } catch {
        localStorage.removeItem('access_token');
        localStorage.removeItem('user');
      }
    }
    setLoading(false);
  }, []);

  const login = useCallback(async (username, password) => {
    const { data } = await authAPI.login({ username, password });
    localStorage.setItem('access_token', data.access_token);
    localStorage.setItem('user', JSON.stringify(data.user));
    setUser(data.user);
    const sock = connectSocket(data.access_token);
    setSocket(sock);
    // Request notification permission and subscribe to push
    requestNotificationPermission().then((perm) => {
      if (perm === 'granted') subscribeToPush(data.access_token);
    });
    return data;
  }, []);

  const register = useCallback(async (userData) => {
    const { data } = await authAPI.register(userData);
    localStorage.setItem('access_token', data.access_token);
    localStorage.setItem('user', JSON.stringify(data.user));
    setUser(data.user);
    const sock = connectSocket(data.access_token);
    setSocket(sock);
    requestNotificationPermission().then((perm) => {
      if (perm === 'granted') subscribeToPush(data.access_token);
    });
    return data;
  }, []);

  const logout = useCallback(() => {
    const token = localStorage.getItem('access_token');
    if (token) unsubscribeFromPush(token);
    localStorage.removeItem('access_token');
    localStorage.removeItem('user');
    disconnectSocket();
    setSocket(null);
    setUser(null);
  }, []);

  const updateUser = useCallback((updatedUser) => {
    setUser(updatedUser);
    localStorage.setItem('user', JSON.stringify(updatedUser));
  }, []);

  const value = {
    user,
    socket,
    loading,
    login,
    register,
    logout,
    updateUser,
    isAuthenticated: !!user,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
}
