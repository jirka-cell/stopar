// Automatické kontroly logiky, na které stojí hra. Spuštění: node --test tests/
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { DEFAULTS, mergeDefaults, safeImage, clone } from '../js/config.js';
import { visibleBirds } from '../js/spawn.js';
import { parseOverpass, osmSetConfig, ensureArea, errorAt, status } from '../js/osm.js';
import { makeStyle, styleIdFor, circle, STYLES } from '../js/mapstyle.js';

const NOW = Date.UTC(2026, 10, 20, 10, 0);
const lesVsude = () => 'les';

test('rozmístění ptáků je deterministické (stejné místo a čas = stejní ptáci)', () => {
  const a = visibleBirds(DEFAULTS, 50.2306, 12.8711, false, {}, NOW, lesVsude);
  const b = visibleBirds(clone(DEFAULTS), 50.2306, 12.8711, false, {}, NOW, lesVsude);
  assert.ok(a.birds.length > 0, 'v okruhu má být aspoň jeden pták');
  assert.deepEqual(a, b);
});

test('jiný časový slot přehází ptáky', () => {
  const a = visibleBirds(DEFAULTS, 50.2306, 12.8711, false, {}, NOW, lesVsude);
  const b = visibleBirds(DEFAULTS, 50.2306, 12.8711, false, {}, NOW + DEFAULTS.spawn.slotMinutes * 60000, lesVsude);
  assert.notDeepEqual(a.birds.map(x => x.id), b.birds.map(x => x.id));
});

test('chycený pták (gone) se znovu neukáže a noční druh je jen v noci', () => {
  const den = visibleBirds(DEFAULTS, 50.2306, 12.8711, false, {}, NOW, lesVsude);
  const gone = { [den.birds[0].id]: NOW };
  assert.ok(!visibleBirds(DEFAULTS, 50.2306, 12.8711, false, gone, NOW, lesVsude).birds.some(b => b.id === den.birds[0].id));
  assert.ok(!den.birds.some(b => b.sp === 'pustik'), 've dne nesmí být puštík');
});

test('bez načtených biotopů hlásí čekání místo ptáků', () => {
  const r = visibleBirds(DEFAULTS, 50.2306, 12.8711, false, {}, NOW, () => null);
  assert.equal(r.birds.length, 0);
  assert.ok(r.pending > 0);
});

test('parseOverpass čte plochy, toky a multipolygon s dírou', () => {
  osmSetConfig(DEFAULTS);
  const sq = (a, b, s) => [[a, b], [a, b + s], [a + s, b + s], [a + s, b], [a, b]].map(([lat, lon]) => ({ lat, lon }));
  const f = parseOverpass({ elements: [
    { type: 'way', tags: { landuse: 'forest' }, geometry: sq(50, 12, 0.01) },
    { type: 'way', tags: { waterway: 'stream' }, geometry: [{ lat: 50, lon: 12 }, { lat: 50.01, lon: 12.01 }] },
    { type: 'relation', tags: { leisure: 'park' }, members: [
      { type: 'way', role: 'outer', geometry: sq(51, 13, 0.02).slice(0, 3) },
      { type: 'way', role: 'outer', geometry: sq(51, 13, 0.02).slice(2) },
      { type: 'way', role: 'inner', geometry: sq(51.005, 13.005, 0.005) }
    ] },
    { type: 'way', tags: { highway: 'path' }, geometry: sq(50, 12, 0.001) }
  ] });
  assert.equal(f.length, 3);
  assert.deepEqual(f.map(x => [x.b, x.line]), [['les', false], ['voda', true], ['park', false]]);
  assert.equal(f[2].outer.length, 1, 'dvě části vnější hranice se mají spojit do jednoho prstence');
  assert.equal(f[2].inner.length, 1);
});

test('mergeDefaults doplní nová pole druhů a zahodí nebezpečné hodnoty', () => {
  const saved = clone(DEFAULTS);
  delete saved.species[0].look.feet;
  delete saved.species[0].fact;
  saved.species[0].image = 'javascript:alert(1)';
  saved.species.push({ id: 'vlastni', name: 'Vlastní', look: { body: '#000' } });
  saved.map.vectorUrl = 'http://zly.example/planet';
  saved.osm.overpassUrl = 'https://x" onerror="y';
  const m = mergeDefaults(saved);
  assert.equal(m.species[0].look.feet, DEFAULTS.species[0].look.feet);
  assert.equal(m.species[0].fact, DEFAULTS.species[0].fact);
  assert.equal(m.species[0].image, '');
  const v = m.species.find(s => s.id === 'vlastni');
  assert.equal(v.fact, undefined, 'vlastní druh nesmí převzít texty jiného druhu');
  assert.equal(v.look.body, '#000');
  assert.equal(m.map.vectorUrl, DEFAULTS.map.vectorUrl);
  assert.equal(m.osm.overpassUrl, DEFAULTS.osm.overpassUrl);
  assert.equal(mergeDefaults({ species: 'nesmysl' }).species.length, DEFAULTS.species.length);
});

test('safeImage propustí jen vložený rastrový obrázek', () => {
  assert.ok(safeImage('data:image/png;base64,iVBORw0KGgo='));
  assert.equal(safeImage('data:image/svg+xml,<svg onload=alert(1)>'), '');
  assert.equal(safeImage('x" onerror="alert(1)'), '');
  assert.equal(safeImage(42), '');
});

test('při výpadku Overpass se dotazy neopakují stále dokola a chyba po úspěchu zmizí', async () => {
  const cfg = clone(DEFAULTS);
  osmSetConfig(cfg);
  const realFetch = globalThis.fetch, realNow = Date.now;
  let calls = 0, ok = false, now = realNow();
  Date.now = () => now;
  globalThis.fetch = async () => { calls++; return ok ? { ok: true, json: async () => ({ elements: [] }) } : { ok: false, status: 429 }; };
  const drain = () => new Promise(r => setTimeout(r, 50));
  try {
    const chunks = ensureArea(50.2306, 12.8711, 600);
    for (let i = 0; i < 10; i++) { ensureArea(50.2306, 12.8711, 600); await drain(); }
    assert.ok(chunks > 1);
    assert.equal(calls, 1, 'po první chybě se má čekat, ne posílat další dotazy');
    assert.match(status.error, /429/);
    assert.match(errorAt(50.2306, 12.8711), /429/, 'bez dat pod hráčem se chyba ukáže');
    now += 6000; ok = true;
    ensureArea(50.2306, 12.8711, 600); await drain();
    assert.equal(status.error, '', 'po úspěšném načtení má chyba zmizet');
    assert.equal(calls, 1 + chunks);
    // výpadek jen okolního čtverce: data pod hráčem jsou, chyba se hráči neukáže
    ok = false; now += 6000;
    ensureArea(50.2306, 12.8711, 1500); await drain();
    assert.match(status.error, /429/);
    assert.equal(errorAt(50.2306, 12.8711), '');
  } finally { globalThis.fetch = realFetch; Date.now = realNow; }
});

test('nastavení z verze 1 (Leaflet) se převede: zoom o 1 menší, nová atribuce, bez URL obrázkových dlaždic', () => {
  const old = { version: 1, map: { tileUrl: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png', attribution: '© OSM', minZoom: 13, maxZoom: 19, startZoom: 17, tileCacheMax: 1500 } };
  const m = mergeDefaults(old);
  assert.equal(m.version, 2);
  assert.deepEqual([m.map.minZoom, m.map.maxZoom, m.map.startZoom], [12, 18, 16]);
  assert.equal(m.map.attribution, DEFAULTS.map.attribution);
  assert.equal(m.map.tileCacheMax, DEFAULTS.map.tileCacheMax);
  assert.equal('tileUrl' in m.map, false);
  assert.equal(mergeDefaults(m).map.startZoom, 16, 'nová verze se už neposouvá');
});

test('styl mapy: den/noc podle slunce, unikátní vrstvy, vypnuté vrstvy skryté', () => {
  assert.equal(styleIdFor('auto', false), 'hra');
  assert.equal(styleIdFor('auto', true), 'noc');
  assert.equal(styleIdFor('papir', true), 'papir');
  assert.equal(styleIdFor('neexistuje', false), 'hra');
  const ctx = { vectorUrl: DEFAULTS.map.vectorUrl, glyphsUrl: DEFAULTS.map.glyphsUrl, demUrl: 'dem://x', contourUrl: 'contour://x', trailsUrl: DEFAULTS.map.trailsUrl, biotopes: DEFAULTS.biotopes, game: { catch: circle(12.87, 50.23, 100) } };
  for (const id of Object.keys(STYLES)) {
    const s = makeStyle(id, DEFAULTS.layers, ctx);
    const ids = s.layers.map(l => l.id);
    assert.equal(new Set(ids).size, ids.length, `duplicitní vrstva ve stylu ${id}`);
    for (const l of s.layers) if (l.source) assert.ok(s.sources[l.source], `vrstva ${l.id} nemá zdroj ${l.source}`);
  }
  const off = makeStyle('hra', { ...DEFAULTS.layers, contours: false, trHiking: false }, ctx);
  assert.equal(off.layers.find(l => l.id === 'contour').layout.visibility, 'none');
  assert.ok(!off.sources['tr-hiking']);
  const on = makeStyle('hra', { ...DEFAULTS.layers, contours: true, trHiking: true, buildings: '3d' }, ctx);
  assert.equal(on.layers.find(l => l.id === 'contour').layout.visibility, 'visible');
  assert.match(on.sources['tr-hiking'].tiles[0], /\/hiking\//);
  assert.ok(on.layers.some(l => l.type === 'fill-extrusion'));
  assert.equal(on.sources.catch.data.geometry.type, 'Polygon');
});
