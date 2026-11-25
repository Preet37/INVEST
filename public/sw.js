// Minimal service worker: makes the app installable and shows a friendly page when offline.
// Pages and API calls always go to the network, so the feed is never stale and nothing private is cached.
const OFFLINE = "/offline.html";

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open("invest-v1").then((c) => c.add(OFFLINE)).then(() => self.skipWaiting()));
});
self.addEventListener("activate", (e) => e.waitUntil(self.clients.claim()));
self.addEventListener("fetch", (e) => {
  if (e.request.mode !== "navigate") return;
  e.respondWith(fetch(e.request).catch(() => caches.match(OFFLINE)));
});

// Daily nudge.
self.addEventListener("push", (e) => {
  let data = {};
  try {
    data = e.data ? e.data.json() : {};
  } catch {}
  e.waitUntil(
    self.registration.showNotification(data.title || "Invest", { body: data.body || "Today's lessons are ready.", icon: "/icons/icon-192.png", badge: "/icons/icon-192.png", data: { url: data.url || "/" } }),
  );
});
self.addEventListener("notificationclick", (e) => {
  e.notification.close();
  const url = (e.notification.data && e.notification.data.url) || "/";
  e.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((list) => {
      for (const c of list) if ("focus" in c) return c.focus();
      return self.clients.openWindow(url);
    }),
  );
});
