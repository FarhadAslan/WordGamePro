// Service Worker - PWA offline dəstəyi
// Network-first strategiyası: əvvəlcə serverdən yüklə,
// server əlçatmaz olduqda cache-dən ver.
const CACHE_NAME = 'soztap-v2';
const URLS_TO_PRECACHE = [
  '/',
  '/index.html',
  '/manifest.webmanifest',
  '/icons/icon-192.png',
  '/icons/icon-512.png'
];

self.addEventListener('install', event => {
  // Yeni SW dərhal aktivləşsin — köhnə SW-ni gözlətmə
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(URLS_TO_PRECACHE))
  );
});

self.addEventListener('activate', event => {
  // Köhnə cache-ləri sil, yeni SW dərhal bütün səhifələri idarə etsin
  event.waitUntil(
    Promise.all([
      caches.keys().then(names =>
        Promise.all(
          names.filter(n => n !== CACHE_NAME).map(n => caches.delete(n))
        )
      ),
      self.clients.claim(), // Açıq olan bütün tabları bu SW idarə etsin
    ])
  );
});

self.addEventListener('fetch', event => {
  // HTML səhifələr: həmişə networkdan gətir (yeni versiya üçün)
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request)
        .then(response => {
          // Uğurlu cavabı cache-ə yaz
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
          return response;
        })
        .catch(() => caches.match(event.request)) // Offline olduqda cache-dən ver
    );
    return;
  }

  // JS/CSS/şəkil faylları: network-first, uğursuz olsa cache
  event.respondWith(
    fetch(event.request)
      .then(response => {
        if (response.ok) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
        }
        return response;
      })
      .catch(() => caches.match(event.request))
  );
});
