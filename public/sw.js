/* VoiceLink Service Worker — Offline caching + Web Push notifications */
const CACHE_NAME = 'voicelink-v1';
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/icons/icon-192.svg',
  '/icons/icon-512.svg',
];

/* ───── Install: pre-cache shell ───── */
self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(STATIC_ASSETS))
  );
});

/* ───── Activate: clean old caches ───── */
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

/* ───── Fetch: Network-first for API, cache-first for static ───── */
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET and cross-origin socket/API requests
  if (request.method !== 'GET') return;
  if (url.pathname.startsWith('/api/')) return;
  if (url.pathname.startsWith('/socket.io')) return;

  // For navigation requests, try network first then fall back to cached index
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request).catch(() => caches.match('/index.html'))
    );
    return;
  }

  // For static assets: stale-while-revalidate
  event.respondWith(
    caches.match(request).then((cached) => {
      const fetched = fetch(request).then((response) => {
        if (response && response.status === 200 && response.type === 'basic') {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
        }
        return response;
      }).catch(() => cached);

      return cached || fetched;
    })
  );
});

/* ───── Push Notification ───── */
self.addEventListener('push', (event) => {
  let data = { title: 'VoiceLink', body: 'New notification', type: 'message' };

  if (event.data) {
    try {
      data = event.data.json();
    } catch (e) {
      data.body = event.data.text();
    }
  }

  const options = {
    body: data.body || '',
    icon: '/icons/icon-192.svg',
    badge: '/icons/icon-96.svg',
    vibrate: data.type === 'call' ? [300, 100, 300, 100, 300] : [200, 100, 200],
    tag: data.tag || data.type || 'default',
    renotify: true,
    requireInteraction: data.type === 'call',
    data: {
      url: data.url || '/',
      type: data.type,
      callerId: data.caller_id,
      callType: data.call_type,
    },
    actions: data.type === 'call'
      ? [
          { action: 'answer', title: 'Answer' },
          { action: 'decline', title: 'Decline' },
        ]
      : [
          { action: 'open', title: 'Open' },
        ],
  };

  // Only show push notification if no client window is currently focused
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: false }).then((clients) => {
      const anyFocused = clients.some((c) => c.focused);
      if (!anyFocused) {
        return self.registration.showNotification(data.title, options);
      }
      // App is focused — skip push notification (in-app UI handles it)
    })
  );
});

/* ───── Notification click ───── */
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const { url, type } = event.notification.data || {};
  const targetUrl = url || '/';

  if (event.action === 'decline') {
    // Just close the notification
    return;
  }

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
      // Try to focus an existing window
      for (const client of clients) {
        if (client.url.includes(self.location.origin)) {
          client.focus();
          client.postMessage({
            type: 'NOTIFICATION_CLICK',
            action: event.action,
            notificationType: type,
            data: event.notification.data,
          });
          return;
        }
      }
      // No existing window, open a new one
      return self.clients.openWindow(targetUrl);
    })
  );
});

/* ───── Background sync (for offline messages) ───── */
self.addEventListener('sync', (event) => {
  if (event.tag === 'send-pending-messages') {
    event.waitUntil(sendPendingMessages());
  }
});

async function sendPendingMessages() {
  // Placeholder for offline message queue sync
  // Messages stored in IndexedDB while offline can be sent here
}
