/* eslint-disable no-undef */

/**
 * Charge la config Firebase sans l’exposer en dur ici
 *    → génère /public/firebase-config.js au build (voir snippet plus bas)
 */
importScripts('/firebase-config.js');
importScripts('https://www.gstatic.com/firebasejs/10.12.1/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.12.1/firebase-messaging-compat.js');

firebase.initializeApp(self.firebaseConfig);
const messaging = firebase.messaging();

// PWA: cache app-shell (offline minimal)
const CACHE_NAME = 'clanimo-app-shell-v1';
const ICON_192   = '/icons/icon-192.png';

const APP_SHELL = [
  '/',                // fallback SPA
  '/index.html',
  '/manifest.webmanifest',
  ICON_192,
  '/icons/icon-512.png'
];

self.addEventListener('install', (event) => {
  // Pré-cache + prend la main immédiatement
  event.waitUntil(caches.open(CACHE_NAME).then((c) => c.addAll(APP_SHELL)));
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  // Nettoie anciens caches + contrôle toutes les pages
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  // Navigation (pages SPA): réseau d'abord, sinon fallback index.html
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request).catch(() => caches.match('/index.html'))
    );
    return;
  }

  const url = new URL(event.request.url);
  // Assets same-origin: cache d'abord, sinon réseau
  if (url.origin === location.origin) {
    event.respondWith(
      caches.match(event.request).then((cached) => cached || fetch(event.request))
    );
  }
});

// Notifications FCM en arrière-plan
messaging.onBackgroundMessage((payload) => {
  const title = payload?.notification?.title ?? 'Notification';
  const options = {
    body:  payload?.notification?.body ?? '',
    icon:  ICON_192,
    badge: ICON_192,
    data:  payload?.data || {}
  };
  self.registration.showNotification(title, options);
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = event.notification?.data?.link || '/';
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      const target = new URL(url, self.location.origin).href;
      for (const client of clientList) {
        if ('focus' in client && client.url === target) return client.focus();
      }
      if (clients.openWindow) return clients.openWindow(target);
    })
  );
});
