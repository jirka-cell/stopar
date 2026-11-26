// Service worker: offline aplikace + cache mapových dat (vektorové dlaždice, terén, trasy, písma)
const VERSION = 'stopar-v4.3.2';
const SHELL = VERSION + '-shell';
const TILES = 'stopar-tiles-v2';   // nový název = stará obrázková cache z Leafletu se při aktivaci smaže
const STATIC = 'stopar-static';    // popis vektorové mapy (TileJSON) a písma popisků
const META = 'stopar-meta';
const OFFLINE = 'stopar-offline';   // stažené oblasti (offline mapy) – nepromazává se
const ASSETS = [
  './', 'index.html', 'manifest.webmanifest', 'css/app.css',
  'js/app.js', 'js/splash.js', 'js/splash-data.js', 'js/signs.js', 'js/calendar.js', 'js/atlas.js', 'js/keydata.js', 'js/config.js', 'js/store.js', 'js/geo.js', 'js/osm.js', 'js/spawn.js', 'js/birds.js', 'js/admin.js', 'js/mapstyle.js', 'js/species.js', 'js/species-batch1.js', 'js/species-batch2.js', 'js/species-batch3.js', 'js/species-batch4.js', 'js/species-batch5.js', 'js/species-fixes.js', 'js/quiz.js', 'js/herna.js', 'js/herna2.js', 'js/minigames.js', 'js/trip.js', 'js/elevation.js', 'js/legal.js', 'js/checklist.js', 'js/collection.js', 'js/art.js', 'js/images.js', 'js/progress.js', 'js/economy.js', 'js/world.js', 'js/field.js', 'js/family.js', 'js/qr.js', 'js/dog.js', 'js/stages.js', 'js/mapui.js', 'js/myths.js', 'js/treasure.js', 'js/trails.js', 'js/offline.js', 'js/extras.js', 'js/datamon.js', 'js/icons.js', 'js/tasks.js', 'vendor/three/three.module.min.js', 'vendor/three/addons/loaders/GLTFLoader.js', 'vendor/three/addons/utils/BufferGeometryUtils.js',
  'images/mapa/tex_papir.webp', 'images/mapa/tex_les.webp', 'images/mapa/tex_louka.webp', 'images/mapa/tex_pole.webp', 'images/mapa/tex_mokrad.webp', 'images/mapa/tex_voda.webp', 'images/mapa/tex_skaly.webp', 'images/mapa/tex_pisek.webp', 'images/mapa/tex_mesto.webp', 'images/mapa/tex_park.webp',
  'vendor/maplibre/maplibre-gl.js', 'vendor/maplibre/maplibre-gl.css', 'vendor/maplibre-contour/index.min.js',
  'images/dog/sit.webp', 'images/dog/lookR.webp', 'images/dog/yawn1.webp', 'images/dog/yawn.webp', 'images/dog/scratch.webp', 'images/dog/scratch2.webp', 'images/dog/wag.webp',
  'images/dog/car1.webp', 'images/dog/car2.webp', 'images/dog/cold.webp', 'images/dog/cone.webp', 'images/dog/joy2.webp', 'images/dog/night.webp', 'images/dog/offline.webp', 'images/dog/pant.webp', 'images/dog/pant2.webp', 'images/dog/portrait.webp', 'images/dog/run1.webp', 'images/dog/run2.webp', 'images/dog/search.webp', 'images/dog/shake.webp', 'images/dog/shake2.webp', 'images/dog/sleep2.webp', 'images/dog/think.webp', 'images/dog/trophy.webp', 'images/dog/walk1b.webp', 'images/dog/walk2b.webp', 'images/dog/wave.webp',
  'images/dog/cvicak-sedi.webp', 'images/dog/cvicak-lezi.webp', 'images/dog/cvicak-beh1.webp', 'images/dog/cvicak-beh2.webp', 'images/dog/cvicak-aport.webp', 'images/dog/cvicak-skok.webp', 'images/dog/cvicak-hra1.webp', 'images/dog/cvicak-hra2.webp',
  'images/dog/stand.webp', 'images/dog/walk1.webp', 'images/dog/walk2.webp', 'images/dog/point.webp', 'images/dog/sniff.webp', 'images/dog/sniff2.webp', 'images/dog/joy.webp', 'images/dog/jump.webp', 'images/dog/lie.webp', 'images/dog/sleep.webp', 'images/dog/sad.webp',
  'icons/icon-192.png', 'icons/icon-512.png', 'icons/icon-maskable-512.png', 'icons/apple-touch-icon.png'
];
let tileMax = 3000, tileMaxSet = false;
const tileMaxReady = caches.open(META).then(c => c.match('tile-max')).then(r => r ? r.text() : null)
  .then(t => { if (t != null && !tileMaxSet) tileMax = Number(t) || 0; }).catch(() => {});

self.addEventListener('install', e => {
  e.waitUntil(caches.open(SHELL).then(c => c.addAll(ASSETS)));
});

self.addEventListener('activate', e => {
  const keep = [SHELL, TILES, STATIC, META, OFFLINE];
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
  const url = new URL(req.url);
  // dotazy na Overpass (POST) a ostatní cizí služby jen změřit, nic neukládat
  if (req.method !== 'GET') { if (url.origin !== location.origin) e.respondWith(fetch(req).then(r => countNet(url, r))); return; }

  // Ukázky v design/ nejsou součást aplikace: vždy čerstvé ze sítě, nic se neukládá
  if (url.origin === location.origin && url.pathname.includes('/design/')) return;

  // Dlaždice a písma: nejdřív cache, jinak síť a uložit (jen to, co uživatel viděl)
  if (url.origin !== location.origin && (isTile(url) || isGlyph(url))) {
    const name = isGlyph(url) ? STATIC : TILES;
    e.respondWith(caches.open(name).then(async c => {
      await tileMaxReady;
      const hit = await c.match(req) || await (await caches.open(OFFLINE)).match(req);
      if (hit) return countHit(url, hit);
      try {
        const res = countNet(url, await fetch(req));
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
        const res = countNet(url, await fetch(req));
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
        const res = countNet(url, await Promise.race([fetch(req, { cache: 'no-cache' }), new Promise((_, rej) => setTimeout(() => rej(new Error('timeout')), 3000))]));
        if (res.ok) c.put(req, res.clone());
        return res;
      } catch (err) {
        const hit = await c.match(req, { ignoreSearch: true });
        return hit || (req.mode === 'navigate' ? c.match('index.html') : Response.error());
      }
    }));
    return;
  }
  // ostatní cizí služby (počasí, Wikipedie, hledání…): beze změny, jen změřit
  e.respondWith(fetch(req).then(r => countNet(url, r)));
});

/* ---------- měření dat (správa dat v aplikaci) ---------- */
const CATS = [['openfreemap', 'map'], ['elevation-tiles', 'dem'], ['amazonaws', 'dem'], ['overpass', 'osm'], ['waymarked', 'trails'], ['api.met.no', 'weather'], ['wikipedia', 'wiki'], ['nominatim', 'search']];
const catOf = url => url.origin === location.origin ? 'app' : ((CATS.find(([h]) => url.hostname.includes(h)) || [, 'other'])[1]);
const net = {}; let netTimer = 0;
const bump = (cat, k, v) => { const c = net[cat] || (net[cat] = { bytes: 0, req: 0, hit: 0, saved: 0 }); c[k] += v; if (!netTimer) netTimer = setTimeout(flushNet, 1000); };
async function flushNet() {
  netTimer = 0;
  const msg = { type: 'net', stats: net };
  for (const cl of await self.clients.matchAll({ type: 'window' })) cl.postMessage(msg);
}
const lenOf = r => Number(r.headers.get('content-length')) || 0;
// Ze sítě: velikost z hlavičky (komprimovaná), jinak se změří kopie odpovědi
function countNet(url, res) {
  try {
    const cat = catOf(url), n = lenOf(res);
    bump(cat, 'req', 1);
    if (n) bump(cat, 'bytes', n);
    else if (res.type !== 'opaque' && res.body) res.clone().blob().then(b => bump(cat, 'bytes', b.size)).catch(() => {});
  } catch (e) {}
  return res;
}
const countHit = (url, res) => { try { const cat = catOf(url); bump(cat, 'hit', 1); bump(cat, 'saved', lenOf(res)); } catch (e) {} return res; };

let trimming = false;
async function trim(c) {
  if (trimming) return; trimming = true;
  try {
    const keys = await c.keys();
    const over = keys.length - tileMax;
    for (let i = 0; i < over; i++) await c.delete(keys[i]);
  } finally { trimming = false; }
}
