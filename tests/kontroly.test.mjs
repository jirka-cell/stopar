// Automatické kontroly logiky, na které stojí hra. Spuštění: node --test tests/
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { DEFAULTS, mergeDefaults, safeImage, clone, presetLayers, parseMonths, parseZones, zoneFor, EDU_FIELDS, formatMonths, compactConfig } from '../js/config.js';
import { visibleBirds } from '../js/spawn.js';
import { parseOverpass, osmSetConfig, ensureArea, errorAt, status, biotopeAt, clearOsmCache } from '../js/osm.js';
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
  assert.equal(m.version, 4);
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

test('předvolby vzhledu: neznámé vrstvy a nesmysly se zahodí, chybějící vrstvy jsou vypnuté', () => {
  const m = mergeDefaults({ version: 3, mapPresets: [{ name: ' Les ', style: 'papir', layers: { contours: 1, buildings: 'x', hack: true } }, { name: '' }, 'nesmysl'], layers: { contours: 'ano', buildings: '3d', zlo: 1 } });
  assert.equal(m.mapPresets.length, 1);
  assert.deepEqual(m.mapPresets[0], { name: 'Les', style: 'papir', layers: { contours: true } });
  assert.equal(m.layers.contours, true);
  assert.equal(m.layers.buildings, '3d');
  assert.equal('zlo' in m.layers, false);
  const l = presetLayers(m.mapPresets[0]);
  assert.equal(l.contours, true);
  assert.equal(l.roadNames, false);
  assert.equal(l.buildings, 'flat');
  assert.equal(mergeDefaults(null).mapPresets.length, DEFAULTS.mapPresets.length, 'výchozí předvolby');
});

test('měsíce výskytu a výšková pásma', () => {
  assert.deepEqual([...parseMonths('3-5')], [3, 4, 5]);
  assert.deepEqual([...parseMonths('11-2')].sort((a, b) => a - b), [1, 2, 11, 12], 'přes Nový rok');
  assert.deepEqual([...parseMonths('4, 9')].sort((a, b) => a - b), [4, 9]);
  assert.equal(parseMonths('').size, 12, 'prázdné = celý rok');
  assert.equal(parseMonths('nesmysl').size, 12);
  const z = parseZones(DEFAULTS.regions[0].zones);
  assert.equal(zoneFor(150, z), 'nizina');
  assert.equal(zoneFor(450, z), 'pahorkatina');
  assert.equal(zoneFor(1000, z), 'hory');
  assert.equal(zoneFor(1602, z), 'nad_lesem');
  assert.equal(zoneFor(null, z), null);
});

test('druhy: nové výchozí se doplní, smazané výchozí se nevrátí, vlastní úpravy zůstanou', () => {
  // staré nastavení bez speciesKnown: 9 druhů (ledňáček chybí) → bere se, že ledňáčka nikdy neznalo? Ne: bez speciesKnown se za známé berou jen uložené
  const v2 = clone(DEFAULTS); delete v2.speciesKnown; v2.version = 2;
  v2.species = v2.species.filter(s => s.id !== 'lednacek');
  v2.species[0].name = 'Datel (upravený)';
  v2.species.forEach(s => { delete s.edu; });
  const m = mergeDefaults(v2);
  assert.ok(m.species.some(s => s.id === 'lednacek'), 'druh, který v uloženém nastavení chyběl, se doplní');
  assert.equal(m.species[0].name, 'Datel (upravený)');
  assert.equal(m.species[0].edu.family, DEFAULTS.species[0].edu.family, 'vzdělávací údaje se doplní');
  // nová verze: uživatel smazal holuba → zůstane smazaný
  const v3 = compactConfig(m); v3.species = v3.species.filter(s => s.id !== 'holub');
  const m2 = mergeDefaults(v3);
  assert.ok(!m2.species.some(s => s.id === 'holub'));
  // druh přidaný v budoucí aktualizaci (není ve speciesKnown) se doplní
  const v4 = compactConfig(m2); v4.listsKnown.species = v4.listsKnown.species.filter(id => id !== 'kos'); v4.species = v4.species.filter(s => s.id !== 'kos');
  assert.ok(mergeDefaults(v4).species.some(s => s.id === 'kos'));
  // každý výchozí druh má všechna vzdělávací pole
  for (const s of DEFAULTS.species) for (const [k] of EDU_FIELDS) assert.ok(k in s.edu, `${s.id} nemá pole ${k}`);
});

test('verze 2 → 3: doplní nové výchozí předvolby vzhledu, vlastní zůstanou', () => {
  const m = mergeDefaults({ version: 2, mapPresets: [{ name: 'Moje', style: 'hra', layers: { contours: true } }, { name: 'Úsporný', style: 'auto', layers: {} }] });
  const names = m.mapPresets.map(p => p.name);
  assert.ok(names.includes('Moje'));
  assert.ok(names.includes('Les a hory') && names.includes('Maximum'));
  assert.equal(names.filter(n => n === 'Úsporný').length, 1);
  const again = mergeDefaults({ ...m, mapPresets: m.mapPresets.filter(p => p.name !== 'Zima') });
  assert.ok(!again.mapPresets.some(p => p.name === 'Zima'), 'smazaná předvolba se ve verzi 3 nevrátí');
});

test('výška z dlaždic Terrarium: dekódování a výpočet pixelu', async () => {
  const { elevationFromRGB, tileFor } = await import('../js/elevation.js');
  assert.equal(elevationFromRGB(128, 0, 0), 0, 'hladina moře');
  assert.equal(elevationFromRGB(129, 144, 0), 400);
  const t = tileFor(50.2306, 12.8711, 12);
  assert.deepEqual([t.tx, t.ty], [2194, 1385], 'dlaždice z12 pro Karlovy Vary (ověřeno vzorcem s asinh)');
  assert.ok(t.px >= 0 && t.px <= 255 && t.py >= 0 && t.py <= 255);
});

test('rozmisťování podle výškových pásem a regionů', () => {
  const cfg = clone(DEFAULTS);
  cfg.species = [
    { ...clone(DEFAULTS.species[2]), id: 'horak', bio: 'les:1', alt: 'hory:1', regions: '' },
    { ...clone(DEFAULTS.species[2]), id: 'vsude', bio: 'les:1', alt: '', regions: '' },
    { ...clone(DEFAULTS.species[2]), id: 'cizinec', bio: 'les:1', alt: '', regions: 'sk' }
  ];
  const run = altAt => visibleBirds(cfg, 50.2306, 12.8711, false, {}, NOW, lesVsude, altAt);
  const low = run(() => 200).birds.map(b => b.sp);
  assert.ok(low.length > 0 && low.every(s => s === 'vsude'), 'v nížině jen druh bez omezení');
  const high = run(() => 1000).birds;
  assert.ok(high.some(b => b.sp === 'horak'), 'v horách se objeví horský druh');
  assert.ok(high.every(b => b.zone === 'hory'));
  assert.ok(!high.some(b => b.sp === 'cizinec'), 'druh z jiného regionu se neobjeví');
  const wait = run(() => null);
  assert.equal(wait.birds.length, 0); assert.ok(wait.pending > 0, 'výška se načítá → zvířata počkají');
  assert.ok(run(() => NaN).birds.some(b => b.sp === 'horak'), 'bez výšky se pásma ignorují');
  assert.deepEqual(run(() => 1000), run(() => 1000), 'stále deterministické');
});

test('sezónnost: druh jen ve svých měsících, simulovaný měsíc z adminu, čitelný výpis', async () => {
  const { currentMonth } = await import('../js/spawn.js');
  const cfg = clone(DEFAULTS);
  cfg.species = [
    { ...clone(DEFAULTS.species[2]), id: 'letni', bio: 'les:1', alt: '', months: '4-9' },
    { ...clone(DEFAULTS.species[2]), id: 'zimni', bio: 'les:1', alt: '', months: '11-2' }
  ];
  const at = m => { cfg.general.monthOverride = m; return visibleBirds(cfg, 50.2306, 12.8711, false, {}, NOW, lesVsude).birds.map(b => b.sp); };
  assert.ok(at(6).length && at(6).every(s => s === 'letni'), 'v červnu jen letní druh');
  assert.ok(at(1).length && at(1).every(s => s === 'zimni'), 'v lednu jen zimní druh (úsek přes Nový rok)');
  assert.equal(at(3).length, 0, 'v březnu ani jeden');
  cfg.general.monthOverride = 0;
  assert.equal(currentMonth(cfg, Date.UTC(2026, 6, 15, 12)), 7, 'bez simulace skutečný měsíc');
  assert.equal(formatMonths('3-10'), 'březen–říjen');
  assert.equal(formatMonths('11-2'), 'listopad–únor');
  assert.equal(formatMonths(''), '');
});

test('ukládání jen změn: úpravy zůstanou, nové výchozí hodnoty a biotopy se dostanou i k uloženému nastavení', () => {
  const cfg = mergeDefaults(null);
  cfg.spawn.density = 9;
  cfg.species.find(s => s.id === 'kos').name = 'Kos (můj)';
  cfg.biotopes = cfg.biotopes.filter(b => b.id !== 'skaly');
  const saved = compactConfig(cfg);
  assert.deepEqual(saved.spawn, { density: 9 }, 'ukládá se jen změněná hodnota');
  assert.deepEqual(saved.species.find(s => s.id === 'kos'), { id: 'kos', name: 'Kos (můj)' });
  assert.ok(JSON.stringify(saved).length < JSON.stringify(cfg).length / 4, 'uložené nastavení je výrazně menší');
  const back = mergeDefaults(saved);
  assert.equal(back.spawn.density, 9);
  assert.equal(back.species.find(s => s.id === 'kos').name, 'Kos (můj)');
  assert.equal(back.species.find(s => s.id === 'kos').edu.family, DEFAULTS.species[2].edu.family);
  assert.ok(!back.biotopes.some(b => b.id === 'skaly'), 'smazaný biotop zůstane smazaný');
  assert.deepEqual(compactConfig(back), saved, 'uložení → načtení → uložení dává stejný výsledek');
});

test('převod z verze 3: staré výchozí váhy a biotopy se nahradí novými, vlastní úpravy zůstanou', () => {
  const v3 = clone(DEFAULTS); v3.version = 3;
  v3.species = v3.species.map(s => ({ ...s }));
  v3.species.find(s => s.id === 'vrabec').bio = 'mesto:4, louka:1';      // stará výchozí → nahradí se
  v3.species.find(s => s.id === 'kos').bio = 'park:1';                   // vlastní úprava → zůstane
  v3.biotopes = [
    { id: 'voda', name: 'Voda', color: '#6bb6e0', priority: 1, tags: DEFAULTS.biotopes[0].tags },
    { id: 'louka', name: 'Louka', color: '#c8dc8a', priority: 5, tags: 'landuse=meadow\nlanduse=farmland\nlanduse=grass\nnatural=grassland\nnatural=heath\nnatural=scrub\nlanduse=orchard\nlanduse=allotments' }
  ];
  const m = mergeDefaults(v3);
  assert.equal(m.species.find(s => s.id === 'vrabec').bio, DEFAULTS.species.find(s => s.id === 'vrabec').bio);
  assert.equal(m.species.find(s => s.id === 'kos').bio, 'park:1');
  const louka = m.biotopes.find(b => b.id === 'louka');
  assert.equal(louka.priority, 6); assert.ok(!/farmland/.test(louka.tags), 'pole už nejsou louka');
  for (const id of ['mokrad', 'skaly', 'sad', 'vesnice', 'pole']) assert.ok(m.biotopes.some(b => b.id === id), `nový biotop ${id}`);
});

test('vesnice × město podle nejbližšího názvu obce, nové biotopy z tagů OSM', () => {
  osmSetConfig(DEFAULTS);
  const sq = (a, b, s) => [[a, b], [a, b + s], [a + s, b + s], [a + s, b], [a, b]].map(([lat, lon]) => ({ lat, lon }));
  const f = parseOverpass({ elements: [
    { type: 'way', tags: { landuse: 'residential' }, geometry: sq(50, 12, 0.01) },
    { type: 'way', tags: { landuse: 'farmland' }, geometry: sq(51, 12, 0.01) },
    { type: 'way', tags: { natural: 'wetland', wetland: 'reedbed' }, geometry: sq(52, 12, 0.01) },
    { type: 'way', tags: { landuse: 'orchard' }, geometry: sq(53, 12, 0.01) },
    { type: 'way', tags: { landuse: 'quarry' }, geometry: sq(54, 12, 0.01) },
    { type: 'node', lat: 50.004, lon: 12.004, tags: { place: 'village', name: 'Ves' } }
  ] });
  assert.deepEqual(f.filter(x => !x.pl).map(x => x.b), ['mesto', 'pole', 'mokrad', 'sad', 'skaly']);
  assert.equal(f.filter(x => x.pl).length, 1);
});

test('biotop zástavby: u vesnice „vesnice“, u města „město“', async () => {
  const realFetch = globalThis.fetch;
  const sq = (a, b, s) => [[a, b], [a, b + s], [a + s, b + s], [a + s, b], [a, b]].map(([lat, lon]) => ({ lat, lon }));
  const run = async place => {
    osmSetConfig(clone(DEFAULTS)); try { await clearOsmCache(); } catch (e) {}
    globalThis.fetch = async () => ({ ok: true, json: async () => ({ elements: [
      { type: 'way', tags: { landuse: 'residential' }, geometry: sq(50, 12, 0.01) },
      { type: 'node', lat: 50.006, lon: 12.006, tags: { place } }
    ] }) });
    ensureArea(50.005, 12.005, 10); await new Promise(r => setTimeout(r, 50));
    return biotopeAt(50.005, 12.005);
  };
  try {
    assert.equal(await run('village'), 'vesnice');
    assert.equal(await run('town'), 'mesto');
  } finally { globalThis.fetch = realFetch; }
});

test('kód rozmístění: stejné nastavení = stejný kód, vzhled mapy ho nemění, seed ano', async () => {
  const { spawnCode } = await import('../js/spawn.js');
  const a = mergeDefaults(null), b = mergeDefaults(null);
  assert.match(spawnCode(a), /^[2-9A-Z]{2}-[2-9A-Z]{2}$/);
  assert.equal(spawnCode(a), spawnCode(b));
  b.layers.contours = true; b.map.style = 'papir'; b.mapPresets = [];
  assert.equal(spawnCode(a), spawnCode(b), 'vzhled mapy kód nemění');
  b.spawn.seed++;
  assert.notEqual(spawnCode(a), spawnCode(b));
});

test('data druhů jsou konzistentní: potrava, biotopy, pásma, vzácnost, skupina, statistiky, měsíce', async () => {
  const { GROUPS } = await import('../js/species.js');
  const { parseMap, parseNums } = await import('../js/config.js');
  const foods = new Set(DEFAULTS.foods.map(f => f.id)), bios = new Set(DEFAULTS.biotopes.map(b => b.id));
  const rar = new Set(DEFAULTS.rarities.map(r => String(r.id))), zones = new Set(parseZones(DEFAULTS.regions[0].zones).map(z => z[0]));
  const ids = new Set();
  for (const s of DEFAULTS.species) {
    assert.ok(!ids.has(s.id), `duplicitní id ${s.id}`); ids.add(s.id);
    assert.ok(/^[a-z0-9_]+$/.test(s.id), `id bez diakritiky: ${s.id}`);
    assert.ok(GROUPS.includes(s.group), `${s.id}: neznámá skupina ${s.group}`);
    assert.ok(rar.has(String(s.rarity)), `${s.id}: neznámá vzácnost`);
    for (const f of Object.keys(parseMap(s.food))) assert.ok(foods.has(f), `${s.id}: neznámá potrava ${f}`);
    const b = Object.keys(parseMap(s.bio)); assert.ok(b.length, `${s.id}: chybí biotop`);
    for (const x of b) assert.ok(bios.has(x), `${s.id}: neznámý biotop ${x}`);
    for (const z of Object.keys(parseMap(s.alt))) assert.ok(zones.has(z), `${s.id}: neznámé pásmo ${z}`);
    assert.equal(parseNums(s.stats).length, DEFAULTS.stats.length, `${s.id}: počet statistik`);
    if (s.months) assert.ok(parseMonths(s.months).size < 12, `${s.id}: měsíce`);
    assert.ok(s.fact && s.edu.sources, `${s.id}: chybí zajímavost nebo zdroj`);
  }
  assert.ok(DEFAULTS.species.length >= 35);
});
