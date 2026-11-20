// Service worker: offline aplikace + cache mapových dlaždic
const VERSION = 'stopar-v1.0.2';
const SHELL = VERSION + '-shell';
const TILES = 'stopar-tiles';
const META = 'stopar-meta'; // drobná nastavení SW, která musí přežít jeho uspání prohlížečem
const ASSETS = [
  './', 'index.html', 'manifest.webmanifest', 'css/app.css',
  'js/app.js', 'js/config.js', 'js/store.js', 'js/geo.js', 'js/osm.js', 'js/spawn.js', 'js/birds.js', 'js/admin.js',
  'vendor/leaflet/leaflet.js', 'vendor/leaflet/leaflet.css',
  'icons/icon-192.png', 'icons/icon-512.png', 'icons/icon-maskable-512.png', 'icons/apple-touch-icon.png'
];
let tileMax = 1500, tileMaxSet = false;
const tileMaxReady = caches.open(META).then(c => c.match('tile-max')).then(r => r ? r.text() : null)
  .then(t => { if (t != null && !tileMaxSet) tileMax = Number(t) || 0; }).catch(() => {});

self.addEventListener('install', e => {
  e.waitUntil(caches.open(SHELL).then(c => c.addAll(ASSETS)));
});

self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== SHELL && k !== TILES && k !== META).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});

self.addEventListener('message', e => {
  const d = e.data || {};
  if (d.type === 'skipWaiting') self.skipWaiting();
  if (d.type === 'config' && d.tileCacheMax != null) {
    tileMax = Number(d.tileCacheMax) || 0; tileMaxSet = true;
    e.waitUntil(caches.open(META).then(c => c.put('tile-max', new Response(String(tileMax)))));
  }
});

const isTile = url => /\/\d+\/\d+\/\d+(@2x)?\.(png|jpg|jpeg|webp)(\?.*)?$/i.test(url.pathname);

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);

  // Mapové dlaždice: nejdřív cache, jinak síť a uložit (jen dlaždice, které uživatel viděl)
  if (url.origin !== location.origin && isTile(url)) {
    e.respondWith(caches.open(TILES).then(async c => {
      await tileMaxReady;
      const hit = await c.match(req);
      if (hit) return hit;
      try {
        const res = await fetch(req);
        if (res.ok && tileMax > 0) { c.put(req, res.clone()).then(() => trim(c)); }
        return res;
      } catch (err) {
        return hit || Response.error();
      }
    }));
    return;
  }

  // Vlastní soubory: online vždy čerstvé ze sítě (max. 3 s), offline z cache
  if (url.origin === location.origin) {
    e.respondWith(caches.open(SHELL).then(async c => {
      try {
        const res = await Promise.race([fetch(req, { cache: 'no-cache' }), new Promise((_, rej) => setTimeout(() => rej(new Error('timeout')), 3000))]);
        if (res.ok) c.put(req, res.clone());
        return res;
      } catch (err) {
        const hit = await c.match(req, { ignoreSearch: true });
        return hit || (req.mode === 'navigate' ? c.match('index.html') : Response.error());
      }
    }));
  }
});

let trimming = false;
async function trim(c) {
  if (trimming) return; trimming = true;
  try {
    const keys = await c.keys();
    const over = keys.length - tileMax;
    for (let i = 0; i < over; i++) await c.delete(keys[i]);
  } finally { trimming = false; }
}
