/* Minimal service worker — PWA o‘rnatish (Chrome/Edge) uchun talab qilinadi */
self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('fetch', () => {
  /* Tarmoq so‘rovlari brauzer orqali; keyinroq cache strategiyasi qo‘shish mumkin */
});
