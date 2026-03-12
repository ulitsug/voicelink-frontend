import { io } from 'socket.io-client';

let socket = null;
let heartbeatInterval = null;

export function connectSocket(token) {
  if (socket?.connected) return socket;

  // Disconnect stale socket if it exists but isn't connected
  if (socket) {
    socket.disconnect();
    socket = null;
  }
  if (heartbeatInterval) {
    clearInterval(heartbeatInterval);
    heartbeatInterval = null;
  }

  const url = window.location.origin;
  console.log('[SOCKET] Connecting to', url);

  socket = io(url, {
    // Use polling only — WebSocket upgrade through CRA proxy to HTTPS backend
    // with self-signed certs causes ECONNRESET
    transports: ['polling'],
    reconnection: true,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 5000,
    reconnectionAttempts: Infinity,
  });

  socket.on('connect', () => {
    console.log('[SOCKET] Connected, sid:', socket.id);
    // (Re-)authenticate on every connect — handles reconnections too
    socket.emit('authenticate', { token });

    // Start heartbeat to keep session alive
    if (heartbeatInterval) clearInterval(heartbeatInterval);
    heartbeatInterval = setInterval(() => {
      if (socket?.connected) socket.emit('heartbeat');
    }, 20000);
  });

  socket.on('disconnect', (reason) => {
    console.log('[SOCKET] Disconnected:', reason);
    if (heartbeatInterval) {
      clearInterval(heartbeatInterval);
      heartbeatInterval = null;
    }
  });

  socket.on('connect_error', (error) => {
    console.error('[SOCKET] Connection error:', error.message || error);
  });

  socket.on('authenticated', (data) => {
    console.log('[SOCKET] Authenticated:', data?.user?.username, '| Online:', data?.online_users?.length);
  });

  socket.on('auth_error', (data) => {
    console.error('[SOCKET] Auth error:', data);
  });

  return socket;
}

export function getSocket() {
  return socket;
}

export function disconnectSocket() {
  if (heartbeatInterval) {
    clearInterval(heartbeatInterval);
    heartbeatInterval = null;
  }
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}

export default { connectSocket, getSocket, disconnectSocket };
