// Gallery offline support.
// Keeps a copy of the app on the phone so it opens without internet.
// When online, it quietly fetches any newer version in the background;
// the update shows up the next time the app is opened.
const CACHE = 'gallery-v2';
const FILES = ['./', './index.html'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(FILES.map(f => new Request(f, { cache: 'reload' })))).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== location.origin) return;

  e.respondWith((async () => {
    const cache = await caches.open(CACHE);
    const key = req.mode === 'navigate' ? './index.html' : req;
    const cached = await cache.match(key, { ignoreSearch: true });
    const fresh = fetch(req, { cache: 'no-cache' }) // skip GitHub's 10-minute cache so updates arrive quickly
      .then(res => { if (res && res.ok) cache.put(key, res.clone()); return res; })
      .catch(() => null);
    if (cached) { e.waitUntil(fresh); return cached; }
    return (await fresh) || new Response('Offline — open the app once with internet first.', { status: 503 });
  })());
});
