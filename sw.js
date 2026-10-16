// Web AI Playground — service worker: precache the app shell + vendored library; runtime-cache the ORT wasm from the CDN.
// Model files from huggingface.co are cached by Transformers.js itself (Cache API, 'transformers-cache'); we pass them through untouched.
const SHELL = 'webai-shell-v9';
const CDN = 'webai-cdn-v7';
const SHELL_FILES = ['./', './index.html', './styles.css', './app.js', './inference-worker.js', './manifest.webmanifest', './icon.svg',
  './samples/cats.jpg', './samples/corgi.jpg', './samples/coffee.jpg', './samples/butterfly.jpg', './samples/jfk.mp3'];

self.addEventListener('install', (e) => {
  e.waitUntil((async () => {
    const c = await caches.open(SHELL);
    await c.addAll(SHELL_FILES);
    try { const cdn = await caches.open(CDN); const u = 'https://cdn.jsdelivr.net/npm/@huggingface/transformers@4.3.1'; if (!(await cdn.match(u))) { const r = await fetch(u); if (r.ok) await cdn.put(u, r); } } catch (e) {}
    const clients = await self.clients.matchAll({ includeUncontrolled: true });
    clients.forEach(cl => cl.postMessage({ type: 'precached', n: SHELL_FILES.length }));
    await self.skipWaiting();
  })());
});
self.addEventListener('activate', (e) => {
  e.waitUntil((async () => {
    for (const k of await caches.keys()) if (k.startsWith('webai-') && k !== SHELL && k !== CDN) await caches.delete(k);
    await self.clients.claim();
  })());
});
self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url);
  if (e.request.method !== 'GET') return;
  if (url.hostname === 'huggingface.co' || url.hostname.endsWith('.hf.co')) {
    if (url.pathname.includes('/resolve/')) {         // model files: Transformers.js caches these itself ('transformers-cache');
      e.respondWith(fetch(e.request).catch(async (err) => (await caches.match(e.request)) || new Response('', { status: 404, statusText: 'offline: not cached' })));   // offline: serve its cached copy; a file that was never cached (e.g. an optional tokenizer_config.json that 404s online) answers 404 so the library treats it as absent instead of failing on a thrown fetch error
      return;
    }
    // Hub API / metadata calls (e.g. available dtypes): network-first, cached copy when offline
    e.respondWith((async () => {
      const c = await caches.open(CDN);
      try { const r = await fetch(e.request); if (r.ok) { const body = await r.clone().arrayBuffer(); c.put(e.request, new Response(body, { status: 200, headers: { 'content-type': r.headers.get('content-type') || 'application/json', 'x-webai-cached': new Date().toISOString() } })); } return r; }
      catch (err) { const hit = (await c.match(e.request)) || (await caches.match(e.request)); if (hit) return hit; throw err; }
    })());
    return;
  }
  if (url.origin === location.origin) {
    // app shell: cache-first, then network (and refresh the cache in the background)
    e.respondWith((async () => {
      const c = await caches.open(SHELL);
      const hit = await c.match(e.request, { ignoreSearch: true });
      const fetchP = fetch(e.request).then(r => { if (r.ok) c.put(e.request, r.clone()); return r; }).catch(() => null);
      return hit || (await fetchP) || new Response('offline', { status: 503 });
    })());
    return;
  }
  if (url.hostname === 'cdn.jsdelivr.net') {
    // ORT runtime files (.mjs/.wasm): cache-first, immutable by version in the URL
    e.respondWith((async () => {
      const c = await caches.open(CDN);
      const hit = await c.match(e.request);
      if (hit) return hit;
      const r = await fetch(e.request);
      if (r.ok) c.put(e.request, r.clone());
      return r;
    })());
  }
});
