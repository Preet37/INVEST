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
