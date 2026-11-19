const CACHE_VERSION = 'yaechanoh-pwa-v1';
const FONT_CACHE = 'yaechanoh-fonts-v1';

const PRECACHE_URLS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/favicon-32x32.png',
  '/apple-touch-icon.png',
  '/pwa-192x192.png',
  '/pwa-512x512.png',
  '/pwa-maskable-512x512.png',
  '/src/assets/images/monastery_hero_banner_1794872661641.jpg',
  '/src/assets/images/dhamma_hall_meditation_1794872662338.jpg',
  '/src/assets/images/earthen_water_pots_1794872662430.jpg',
  '/src/assets/images/dhamma_book_cover_1794872663461.jpg',
  '/src/assets/images/golden_pagoda_dusk_1794872663824.jpg',
];

const BYPASS_HOSTS = [
  'firestore.googleapis.com',
  'firebasestorage.googleapis.com',
  'identitytoolkit.googleapis.com',
  'securetoken.googleapis.com',
  'accounts.google.com',
  'apis.google.com',
  'firebase.googleapis.com',
  'firebaseinstallations.googleapis.com',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_VERSION).then(async (cache) => {
      await Promise.allSettled(
        PRECACHE_URLS.map(async (url) => {
          try {
            const res = await fetch(url, { cache: 'reload' });
            if (res.ok) {
              await cache.put(url, res);
            }
          } catch {
            // Skip missing assets in dev/offline install
          }
        })
      );
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  const validCaches = new Set([CACHE_VERSION, FONT_CACHE]);
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys.map((key) => (validCaches.has(key) ? Promise.resolve() : caches.delete(key)))
        )
      )
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;

  let url;
  try {
    url = new URL(request.url);
  } catch {
    return;
  }

  if (url.protocol !== 'http:' && url.protocol !== 'https:') return;

  // Never intercept API media upload/streaming, Firebase Auth, Firestore, or Google OAuth
  if (
    BYPASS_HOSTS.some((host) => url.hostname === host || url.hostname.endsWith(`.${host}`)) ||
    url.pathname.startsWith('/__/auth') ||
    url.pathname.startsWith('/api/')
  ) {
    return;
  }

  // Google Fonts: CacheFirst
  if (url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com') {
    event.respondWith(
      caches.open(FONT_CACHE).then(async (cache) => {
        const cached = await cache.match(request);
        if (cached) return cached;
        try {
          const response = await fetch(request);
          if (response.ok || response.type === 'opaque') {
            cache.put(request, response.clone());
          }
          return response;
        } catch {
          return cached || Response.error();
        }
      })
    );
    return;
  }

  // Only cache same-origin requests beyond fonts
  if (url.origin !== self.location.origin) return;

  // Navigation requests (SPA pages): NetworkFirst with cached /index.html fallback
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response.ok) {
            const copy = response.clone();
            caches.open(CACHE_VERSION).then((cache) => cache.put('/index.html', copy));
          }
          return response;
        })
        .catch(async () => {
          const cache = await caches.open(CACHE_VERSION);
          return (
            (await cache.match(request)) ||
            (await cache.match('/index.html')) ||
            (await cache.match('/')) ||
            Response.error()
          );
        })
    );
    return;
  }

  // Static same-origin assets: StaleWhileRevalidate
  event.respondWith(
    caches.open(CACHE_VERSION).then(async (cache) => {
      const cached = await cache.match(request);
      const networkPromise = fetch(request)
        .then((response) => {
          if (response.ok) {
            cache.put(request, response.clone());
          }
          return response;
        })
        .catch(() => cached || Response.error());

      return cached || networkPromise;
    })
  );
});
