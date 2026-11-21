// Service worker: offline aplikace + cache mapových dat (vektorové dlaždice, terén, trasy, písma)
const VERSION = 'stopar-v3.0.0';
const SHELL = VERSION + '-shell';
const TILES = 'stopar-tiles-v2';   // nový název = stará obrázková cache z Leafletu se při aktivaci smaže
const STATIC = 'stopar-static';    // popis vektorové mapy (TileJSON) a písma popisků
const META = 'stopar-meta';        // drobná nastavení SW, která musí přežít jeho uspání prohlížečem
const ASSETS = [
  './', 'index.html', 'manifest.webmanifest', 'css/app.css',
  'js/app.js', 'js/config.js', 'js/store.js', 'js/geo.js', 'js/osm.js', 'js/spawn.js', 'js/birds.js', 'js/admin.js', 'js/mapstyle.js', 'js/species.js', 'js/species-batch1.js', 'js/species-batch2.js', 'js/species-batch3.js', 'js/species-batch4.js', 'js/elevation.js', 'js/legal.js', 'js/checklist.js', 'js/collection.js', 'js/art.js', 'js/images.js', 'js/progress.js', 'js/economy.js', 'js/world.js', 'js/field.js', 'js/family.js', 'js/qr.js', 'js/contests.js', 'js/dog.js', 'js/mapui.js',
  'vendor/maplibre/maplibre-gl.js', 'vendor/maplibre/maplibre-gl.css', 'vendor/maplibre-contour/index.min.js',
  'icons/icon-192.png', 'icons/icon-512.png', 'icons/icon-maskable-512.png', 'icons/apple-touch-icon.png'
];
let tileMax = 3000, tileMaxSet = false;
const tileMaxReady = caches.open(META).then(c => c.match('tile-max')).then(r => r ? r.text() : null)
  .then(t => { if (t != null && !tileMaxSet) tileMax = Number(t) || 0; }).catch(() => {});

self.addEventListener('install', e => {
  e.waitUntil(caches.open(SHELL).then(c => c.addAll(ASSETS)));
});

self.addEventListener('activate', e => {
  const keep = [SHELL, TILES, STATIC, META];
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => !keep.includes(k)).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});

self.addEventListener('message', e => {
  const d = e.data || {};
  if (d.type === 'skipWaiting') self.skipWaiting();
  if (d.type === 'config' && d.tileCacheMax != null) {
    tileMax = Number(d.tileCacheMax) || 0; tileMaxSet = true;
    e.waitUntil(caches.open(META).then(c => c.put('tile-max', new Response(String(tileMax)))));
  }
});

// Dlaždice: …/z/x/y.png|jpg|webp|pbf (vektorová mapa, terén, trasy)
const isTile = url => /\/\d+\/\d+\/\d+(@2x)?\.(png|jpg|jpeg|webp|pbf)(\?.*)?$/i.test(url.pathname);
const isGlyph = url => /\/fonts\/.+\/\d+-\d+\.pbf$/.test(url.pathname);
const isTileJson = url => url.hostname === 'tiles.openfreemap.org' && /^\/planet\/?$/.test(url.pathname);

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);

  // Ukázky v design/ nejsou součást aplikace: vždy čerstvé ze sítě, nic se neukládá
  if (url.origin === location.origin && url.pathname.includes('/design/')) return;

  // Dlaždice a písma: nejdřív cache, jinak síť a uložit (jen to, co uživatel viděl)
  if (url.origin !== location.origin && (isTile(url) || isGlyph(url))) {
    const name = isGlyph(url) ? STATIC : TILES;
    e.respondWith(caches.open(name).then(async c => {
      await tileMaxReady;
      const hit = await c.match(req);
      if (hit) return hit;
      try {
        const res = await fetch(req);
        if (res.ok && (name === STATIC || tileMax > 0)) { c.put(req, res.clone()).then(() => name === TILES && trim(c)); }
        return res;
      } catch (err) {
        return Response.error();
      }
    }));
    return;
  }

  // Popis vektorové mapy: online čerstvý (obsahuje verzi dlaždic), offline z cache
  if (isTileJson(url)) {
    e.respondWith(caches.open(STATIC).then(async c => {
      try {
        const res = await fetch(req);
        if (res.ok) c.put(req, res.clone());
        return res;
      } catch (err) {
        return (await c.match(req)) || Response.error();
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
