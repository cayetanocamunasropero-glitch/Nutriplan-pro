// NutriPlan · service worker: la app siempre se actualiza sola (red primero) y funciona sin conexión con la última versión.
const CACHE = 'np2-v1';
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (e) =>
  e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim())),
);
self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== location.origin) return;
  if (req.mode === 'navigate') {
    if (url.pathname.startsWith('/clasica')) return;
    e.respondWith(
      fetch(req)
        .then((r) => {
          if (r.ok) caches.open(CACHE).then((c) => c.put('/', r.clone()));
          return r;
        })
        .catch(() => caches.match('/').then((r) => r || new Response('<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width"><body style="font-family:system-ui;padding:48px 24px;text-align:center"><h2>Sin conexión</h2><p>NutriPlan necesita internet la primera vez.</p><button onclick="location.reload()">Reintentar</button>', { headers: { 'Content-Type': 'text/html; charset=utf-8' } }))),
    );
    return;
  }
  if (url.pathname.startsWith('/assets/') || url.pathname.startsWith('/icons/')) {
    e.respondWith(
      caches.match(req).then(
        (hit) =>
          hit ||
          fetch(req).then((r) => {
            if (r.ok) {
              const copy = r.clone();
              caches.open(CACHE).then((c) => c.put(req, copy));
            }
            return r;
          }),
      ),
    );
  }
});
