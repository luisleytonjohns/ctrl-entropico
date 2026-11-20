// CTRL ENTROPICO — Service Worker
const CACHE = 'ce-v1';
const ASSETS = [
  '/ctrl-entropico/',
  '/ctrl-entropico/index.html',
  '/ctrl-entropico/css/estilos.css',
  '/ctrl-entropico/js/auth.js',
  '/ctrl-entropico/js/api.js',
  '/ctrl-entropico/js/app.js',
  '/ctrl-entropico/js/decisiones.js',
  '/ctrl-entropico/img/icon.png'
];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE).then(c => c.addAll(ASSETS)).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  // Network first, fallback to cache
  e.respondWith(
    fetch(e.request)
      .then(resp => {
        if (resp.ok) {
          const clone = resp.clone();
          caches.open(CACHE).then(c => c.put(e.request, clone));
        }
        return resp;
      })
      .catch(() => caches.match(e.request))
  );
});
