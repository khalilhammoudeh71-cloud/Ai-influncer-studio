/* Cache only the public offline notice. Never cache sessions, API responses,
   personas, media or navigation URLs (which can contain sign-in parameters). */
const CACHE = 'ai-studio-offline-v1';
const OFFLINE = '/offline.html';
self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE).then(async cache => {
    const response = await fetch(OFFLINE, { credentials: 'omit', cache: 'reload' });
    if (!response.ok || !response.headers.get('content-type')?.includes('text/html')) throw new Error('Offline page unavailable');
    await cache.put(OFFLINE, response);
  }));
  // No skipWaiting: an update must not replace a worker during an open call/draft.
});
self.addEventListener('activate', event => {
  event.waitUntil(caches.keys().then(keys => Promise.all(keys
    .filter(key => key.startsWith('ai-studio-offline-') && key !== CACHE)
    .map(key => caches.delete(key)))));
});
self.addEventListener('fetch', event => {
  const request = event.request;
  const url = new URL(request.url);
  if (request.method !== 'GET' || request.mode !== 'navigate' || url.origin !== self.location.origin
    || url.pathname.startsWith('/api/') || url.pathname.startsWith('/agent/')) return;
  event.respondWith(fetch(request).catch(async () => {
    const fallback = await (await caches.open(CACHE)).match(OFFLINE);
    return fallback || new Response('Connect to open AI Influencer Studio.', {
      status: 503, headers: { 'Content-Type': 'text/plain; charset=utf-8' },
    });
  }));
});
