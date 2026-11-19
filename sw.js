const CORE = 'ambrine-core-v44', VID = 'ambrine-signes-v1';
const SHELL = ['./', 'index.html', 'style.css', 'app.js', 'flows.js', 'anim.js', 'test-animations.html', 'manifest.webmanifest', 'icon.svg', 'icon-192.png', 'icon-512.png', 'assets/cards.json', 'assets/signs.json', 'assets/anim/index.json', 'assets/video/ambrine_coucou.mp4', 'assets/video/ambrine_salut.mp4', 'assets/cards/ambrine_coucou_poster.jpg'];
self.addEventListener('install', e => e.waitUntil((async () => {
  const c = await caches.open(CORE);
  await c.addAll(SHELL);
  const cards = await (await fetch('assets/cards.json')).json();
  await Promise.all(cards.map(k => c.add(k.image).catch(() => { })));
  const idx = await (await fetch('assets/anim/index.json')).json();
  await Promise.all(Object.values(idx).flatMap(a => a.files.map(f => c.add(a.dir + '/' + f).catch(() => { }))));
  self.skipWaiting();
})()));
self.addEventListener('activate', e => e.waitUntil((async () => { for (const k of await caches.keys()) if (k !== CORE && k !== VID) await caches.delete(k); await self.clients.claim(); })()));
async function rangeFrom(resp, req) {
  const m = /bytes=(\d*)-(\d*)/.exec(req.headers.get('range') || ''); if (!m) return resp;
  const buf = await resp.arrayBuffer(), size = buf.byteLength; let s = m[1] === '' ? 0 : +m[1], e = m[2] === '' ? size - 1 : Math.min(+m[2], size - 1);
  return new Response(buf.slice(s, e + 1), { status: 206, headers: { 'Content-Type': resp.headers.get('Content-Type') || 'video/mp4', 'Content-Range': `bytes ${s}-${e}/${size}`, 'Content-Length': String(e - s + 1), 'Accept-Ranges': 'bytes' } });
}
self.addEventListener('fetch', e => {
  const req = e.request; if (req.method !== 'GET') return; const url = new URL(req.url); if (url.origin !== location.origin) return;
  if (url.pathname.includes('/assets/signes/')) {            // vidéos : cache si téléchargées, sinon réseau
    e.respondWith((async () => { const c = await caches.open(VID); const hit = await c.match(url.pathname.replace(/^.*\/assets\//, 'assets/')) || await c.match(req.url);
      if (hit) return rangeFrom(hit, req); try { return await fetch(req); } catch (err) { return new Response('', { status: 503 }); } })()); return; }
  if (url.pathname.includes('/assets/video/')) {             // vidéos d'Ambrine : Safari demande des morceaux (Range)
    e.respondWith((async () => { const c = await caches.open(CORE); const hit = await c.match(url.pathname.replace(/^.*\/assets\//, 'assets/')) || await c.match(req.url, { ignoreSearch: true });
      if (hit) return rangeFrom(hit, req); try { return await fetch(req); } catch (err) { return new Response('', { status: 503 }); } })()); return; }
  const isCore = req.mode === 'navigate' || /\.(html|js|css|json|webmanifest)$/.test(url.pathname);
  e.respondWith((async () => {
    const c = await caches.open(CORE);
    if (isCore) { try { const r = await fetch(req, { cache: 'no-cache' }); if (r.ok) c.put(req, r.clone()); return r; } catch (err) { return (await c.match(req, { ignoreSearch: true })) || (await c.match('index.html')); } }
    const hit = await c.match(req); if (hit) return hit;
    try { const r = await fetch(req); if (r.ok) c.put(req, r.clone()); return r; } catch (err) { return new Response('', { status: 503 }); }
  })());
});
