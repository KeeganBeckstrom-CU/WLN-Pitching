// WLN Pitching service worker: shows the morning reminder and opens today's work when it is tapped.
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', e => e.waitUntil(self.clients.claim()));

// Always load the newest app from the network (bypassing the 10-minute GitHub cache); fall back to the last copy when offline.
self.addEventListener('fetch', e => {
  const r = e.request;
  if (r.method !== 'GET') return;
  const u = new URL(r.url);
  if (u.origin !== self.location.origin) return;
  if (r.mode === 'navigate' || u.pathname.endsWith('.html') || u.pathname.endsWith('version.json')) {
    e.respondWith(fetch(r.url, { cache: 'no-store', credentials: 'same-origin' }).then(res => {
      if (res.ok && r.mode === 'navigate') { const c = res.clone(); caches.open('cu-shell').then(ch => ch.put(r.url, c)); }
      return res;
    }).catch(() => caches.match(r.url).then(m => m || fetch(r))));
  }
});

self.addEventListener('push', e => {
  let d = {};
  try { d = e.data ? e.data.json() : {}; } catch (_) { d = { body: e.data && e.data.text() }; }
  e.waitUntil(self.registration.showNotification(d.title || 'WLN Pitching', {
    body: d.body || "Today's throwing work is ready. Get it done and log it.",
    icon: 'icon-192.png',
    badge: 'icon-192.png',
    tag: d.tag || 'cleary-morning',
    renotify: true,
    requireInteraction: true,
    timestamp: Date.now(),
    data: { url: d.url || 'index%20WLN.html#daily-work' }
  }));
});

self.addEventListener('notificationclick', e => {
  e.notification.close();
  const url = new URL(e.notification.data && e.notification.data.url || 'index%20WLN.html#daily-work', self.registration.scope).href;
  e.waitUntil(self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(ws => {
    for (const w of ws) {
      if (w.url.startsWith(self.registration.scope) && 'focus' in w) { w.navigate(url).catch(() => {}); return w.focus(); }
    }
    return self.clients.openWindow(url);
  }));
});
