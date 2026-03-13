import { io } from 'socket.io-client';

let socket = null;
let heartbeatInterval = null;
let lastActivity = Date.now();

// Track user activity — any interaction resets the idle timer
function resetActivity() {
  lastActivity = Date.now();
}

if (typeof window !== 'undefined') {
  ['mousedown', 'keydown', 'touchstart', 'scroll'].forEach(evt =>
    window.addEventListener(evt, resetActivity, { passive: true })
  );
}

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
    socket.emit('authenticate', { token, device: 'web' });

    // Start heartbeat to keep session alive — send activity status
    if (heartbeatInterval) clearInterval(heartbeatInterval);
    heartbeatInterval = setInterval(() => {
      if (socket?.connected) {
        const idleMs = Date.now() - lastActivity;
        const isIdle = idleMs > 120000; // 2 minutes idle
        socket.emit('heartbeat', {
          activity: isIdle ? 'idle' : 'active',
          device: 'web',
        });
      }
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
