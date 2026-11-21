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
  ] }).filter(x => x.b);
  assert.equal(f.length, 3, 'pěšina není biotop (ukládá se zvlášť jako cesta pro chráněná území)');
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
    assert.equal(calls, 3, 'po chybě všech 3 serverů se má čekat, ne posílat další dotazy');
    assert.match(status.error, /429/);
    assert.match(errorAt(50.2306, 12.8711), /429/, 'bez dat pod hráčem se chyba ukáže');
    now += 6000; ok = true;
    ensureArea(50.2306, 12.8711, 600); await drain();
    assert.equal(status.error, '', 'po úspěšném načtení má chyba zmizet');
    assert.equal(calls, 3 + chunks);
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
  assert.ok(DEFAULTS.species.length >= 100);
});

test('každý druh má anglický popis vzhledu pro prompty obrázků', async () => {
  const { VZHLED_EN } = await import('../tools/vzhled-en.mjs');
  for (const s of DEFAULTS.species) {
    assert.ok(VZHLED_EN[s.id], `${s.id}: chybí anglický popis v tools/vzhled-en.mjs`);
    assert.ok(VZHLED_EN[s.id][1].length > 30, `${s.id}: popis je moc krátký`);
  }
});

test('Overpass: při výpadku serveru se zkusí další a příště se začne funkčním', async () => {
  const cfg = clone(DEFAULTS); osmSetConfig(cfg); try { await clearOsmCache(); } catch (e) {}
  const realFetch = globalThis.fetch, hits = [];
  globalThis.fetch = async url => { hits.push(new URL(url).host); return url.includes('overpass-api.de') ? { ok: false, status: 504 } : { ok: true, json: async () => ({ elements: [] }) }; };
  try {
    ensureArea(50.2306, 12.8711, 600); await new Promise(r => setTimeout(r, 80));
    assert.deepEqual(hits.slice(0, 2), ['overpass-api.de', 'overpass.private.coffee']);
    assert.ok(hits.length > 2, 'víc čtverců');
    assert.equal(status.error, '');
    assert.ok(hits.slice(2).every(h => h === 'overpass.private.coffee'), 'další čtverce rovnou z funkčního serveru');
  } finally { globalThis.fetch = realFetch; }
});

test('souhlas: věk z roku narození, mladší 15 let potřebují rodiče, nová verze podmínek = nový souhlas', async () => {
  const { ageFrom, consentValid, TERMS_VERSION, MIN_AGE } = await import('../js/legal.js');
  const d = new Date(2026, 10, 21);
  assert.equal(ageFrom(2010, d), 15);
  assert.ok(ageFrom(2011, d) < MIN_AGE, 'narozený 2011 může mít 14 → rodič');
  for (const bad of ['', 'abc', 1800, 2030, 2000.5]) assert.equal(ageFrom(bad, d), null);
  assert.equal(consentValid({ v: TERMS_VERSION }), true);
  assert.equal(consentValid({ v: TERMS_VERSION - 1 }), false);
  assert.equal(consentValid(null), false);
});

test('rodičovský PIN: ukládá se jen otisk se solí, ověří správný PIN, odmítne špatný', async () => {
  const { newPin, verifyPin, PIN_RE } = await import('../js/legal.js');
  const rec = await newPin('4821');
  assert.ok(!JSON.stringify(rec).includes('4821'));
  assert.notEqual((await newPin('4821')).hash, rec.hash, 'jiná sůl = jiný otisk');
  assert.equal(await verifyPin(rec, '4821'), true);
  assert.equal(await verifyPin(rec, '4822'), false);
  assert.equal(await verifyPin(null, '4821'), false);
  for (const bad of ['123', '123456789', '12a4', '']) assert.equal(PIN_RE.test(bad), false);
});

test('servery Overpass a kontakt z nastavení se očistí', () => {
  const NL = String.fromCharCode(10);
  const m = mergeDefaults({ osm: { overpassUrl: ['https://a.example/api', 'javascript:alert(1)', ' http://b.example ', 'https://c.example/api'].join(NL) }, general: { contact: '<x>@y' } });
  assert.equal(m.osm.overpassUrl, 'https://a.example/api' + NL + 'https://c.example/api');
  assert.equal(m.general.contact, '');
  assert.equal(mergeDefaults({ osm: { overpassUrl: 'nic' } }).osm.overpassUrl, DEFAULTS.osm.overpassUrl);
  assert.equal(mergeDefaults({ general: { contact: 'stopar@example.cz' } }).general.contact, 'stopar@example.cz');
});

test('kontrolní seznam: text výsledku obsahuje všechny body a poznámky', async () => {
  const { CHECKS, checklistText, emptyChecklist } = await import('../js/checklist.js');
  const d = emptyChecklist(); d.name = 'Anička'; d.device = 'iPhone'; d.items.gps = { m: 'bad', n: 'skáče o 50 m' };
  const t = checklistText(d, 'info');
  assert.equal(CHECKS.length, 19);
  assert.ok(t.includes('Anička · zařízení: iPhone'));
  assert.ok(t.includes('GPS a poloha: Problém'));
  assert.ok(t.includes('skáče o 50 m'));
  assert.equal(t.split('\n').filter(l => /^\d+\. /.test(l)).length, 19);
});

test('verze aplikace sedí se service workerem a SW ukládá všechny moduly', async () => {
  const { readFileSync, readdirSync } = await import('node:fs');
  const { APP_VERSION } = await import('../js/legal.js');
  const sw = readFileSync(new URL('../sw.js', import.meta.url), 'utf8');
  assert.ok(sw.includes(`'stopar-v${APP_VERSION}'`), 'VERSION v sw.js = APP_VERSION');
  for (const f of readdirSync(new URL('../js/', import.meta.url))) assert.ok(sw.includes(`'js/${f}'`), `sw.js: chybí js/${f}`);
});

test('Overpass: odpověď 200 s „runtime error“ se neuloží a zkusí se další server', async () => {
  const cfg = clone(DEFAULTS); osmSetConfig(cfg); try { await clearOsmCache(); } catch (e) {}
  const realFetch = globalThis.fetch, hits = [];
  globalThis.fetch = async url => {
    hits.push(new URL(url).host);
    const bad = !url.includes('kumi.systems'); // jen třetí server odpoví bez chyby
    return { ok: true, json: async () => bad ? { elements: [], remark: 'runtime error: Query timed out in "query" at line 1 after 26 seconds.' } : { elements: [] } };
  };
  try {
    ensureArea(49.1, 16.6, 10); await new Promise(r => setTimeout(r, 80));
    assert.ok(hits.includes('overpass.kumi.systems') && hits.length >= 2, 'chybná odpověď = zkusit další server');
    assert.equal(status.error, '');
    assert.notEqual(biotopeAt(49.1, 16.6), null, 'data z druhého serveru jsou načtená');
  } finally { globalThis.fetch = realFetch; }
});

test('sbírka: starý nejlepší kus se převede na jedince, plná sbírka nahradí slabšího nebo zvíře pustí', async () => {
  const { migrateAnimals, addAnimal, animalFrom, power, cleanAnimal } = await import('../js/collection.js');
  const st = migrateAnimals({ caught: { kos: { count: 3, best: { q: 90, stats: [10, 20, 30, 40], date: 5, bio: 'park' } }, vrabec: { count: 0, best: null } } });
  assert.equal(st.animals.length, 1);
  assert.equal(st.animals[0].sp, 'kos'); assert.equal(power(st.animals[0]), 100);
  assert.equal(migrateAnimals(st).animals.length, 1, 'převod jen jednou');
  const s = { animals: [] };
  for (const p of [10, 20]) assert.ok(addAnimal(s, animalFrom('kos', [p], 50, 'les'), 2).kept);
  assert.ok(addAnimal(s, animalFrom('kos', [5], 50, 'les'), 2).released, 'slabší než všechny = pustit');
  const r = addAnimal(s, animalFrom('kos', [30], 50, 'les'), 2);
  assert.equal(power(r.replaced), 10, 'nahradí nejslabšího');
  assert.deepEqual(s.animals.map(power).sort((a, b) => a - b), [20, 30]);
  assert.ok(addAnimal(s, animalFrom('sojka', [1], 50, 'les'), 2).kept, 'strop platí pro každý druh zvlášť');
  assert.equal(cleanAnimal({ sp: 'kos', stats: ['x', 5], nick: '<b>Pepa</b>!' }).nick, 'bPepab');
  assert.equal(cleanAnimal({ nosp: 1 }), null);
});

test('přezdívky: filtr zachytí sprostá slova i s diakritikou a čísly, běžná jména projdou', async () => {
  const { badWord, cleanNick } = await import('../js/collection.js');
  for (const w of ['Kurva', 'k.u.r.v.a', 'Píča', 'h0vno', 'FUCK', 'zmrde']) assert.ok(badWord(cleanNick(w) || w), w);
  for (const w of ['Pepík', 'Žofka', 'Kos Karel', 'Rychlík 2']) assert.equal(badWord(w), false, w);
});

test('ubikace: každá skupina má ubikaci, neznámá skupina skončí v poslední', async () => {
  const { enclosureOf } = await import('../js/collection.js');
  const { GROUPS } = await import('../js/species.js');
  for (const g of GROUPS) assert.ok(enclosureOf(DEFAULTS, g).id, g);
  assert.equal(enclosureOf(DEFAULTS, 'Ptáci').id, 'voliera');
  assert.equal(enclosureOf(DEFAULTS, 'Neznámá').id, DEFAULTS.enclosures.at(-1).id);
  const m = mergeDefaults(compactConfig(DEFAULTS));
  assert.deepEqual(m.enclosures, DEFAULTS.enclosures, 'ubikace přežijí uložení a načtení');
});

test('každý druh mimo ptáky má vlastní kresbu bez chyb', async () => {
  const { animalSVG, hasArt } = await import('../js/art.js');
  for (const s of DEFAULTS.species.filter(s => s.group !== 'Ptáci')) {
    assert.ok(hasArt(s.id), `${s.id}: chybí kresba v js/art.js`);
    const v = animalSVG(s);
    assert.ok(v.startsWith('<svg') && v.endsWith('</svg>') && !/undefined|NaN/.test(v), s.id);
  }
});

test('úrovně: XP se přepočítá na úroveň a zbytek do další', async () => {
  const { levelFor } = await import('../js/progress.js');
  const G = { levelBase: 100, levelGrowth: 1.5 };
  assert.deepEqual(levelFor(0, G), { level: 1, into: 0, need: 100 });
  assert.deepEqual(levelFor(99, G), { level: 1, into: 99, need: 100 });
  assert.deepEqual(levelFor(100, G), { level: 2, into: 0, need: 150 });
  assert.deepEqual(levelFor(260, G), { level: 3, into: 10, need: 225 });
  assert.equal(levelFor(1e6, { levelBase: 100, levelGrowth: 1 }).level, 99, 'strop úrovně');
});

test('úkoly: stejné pro všechny v daný den, nový den = nové úkoly, splnění se počítá jednou', async () => {
  const { currentQuests, questEvent, cleanProgress } = await import('../js/progress.js');
  const d1 = new Date(2026, 10, 21, 10), d2 = new Date(2026, 10, 22, 10);
  const a = cleanProgress({}), b = cleanProgress({});
  assert.deepEqual(currentQuests(DEFAULTS, a, d1).map(i => i.id), currentQuests(DEFAULTS, b, d1).map(i => i.id));
  const ids1 = currentQuests(DEFAULTS, a, d1).map(i => i.id);
  assert.equal(ids1.length, DEFAULTS.game.questsPerDay + DEFAULTS.game.questsPerWeek);
  // týdenní úkoly zůstanou, denní se změní
  const week1 = ids1.filter(id => id.startsWith('w_'));
  const ids2 = currentQuests(DEFAULTS, a, d2).map(i => i.id);
  assert.deepEqual(ids2.filter(id => id.startsWith('w_')), week1);
  // splnění: úkol „Chyť 3 zvířata“ podstrčený napřímo
  const st = cleanProgress({}); st.quests = { day: '2026-11-21', week: '2026-W47', items: [{ id: 'd_catch3', p: 0, done: false }, { id: 'd_bird', p: 0, done: false }] };
  assert.equal(questEvent(DEFAULTS, st, { kind: 'catch', group: 'Savci', bio: 'les' }, d1).length, 0);
  assert.deepEqual(questEvent(DEFAULTS, st, { kind: 'catch', group: 'Ptáci', bio: 'les' }, d1).map(t => t.id), ['d_bird']);
  assert.deepEqual(questEvent(DEFAULTS, st, { kind: 'catch', group: 'Ptáci', bio: 'les' }, d1).map(t => t.id), ['d_catch3']);
  assert.equal(questEvent(DEFAULTS, st, { kind: 'catch', group: 'Ptáci', bio: 'les' }, d1).length, 0, 'hotový úkol se znovu nepočítá');
});

test('odznaky a alba: získají se jednou při dosažení cíle', async () => {
  const { checkBadges, cleanProgress, albumProgress } = await import('../js/progress.js');
  const st = Object.assign(cleanProgress({}), { caught: { pustik: { count: 1 }, vyr: { count: 2 } } });
  assert.deepEqual(albumProgress(DEFAULTS.albums.find(a => a.id === 'sovy'), st.caught), { have: 2, total: 3 });
  assert.ok(!checkBadges(DEFAULTS, st, 1).some(b => b.id === 'alb_sovy'));
  st.caught.sycek = { count: 1 }; st.counters.km = 5;
  const got = checkBadges(DEFAULTS, st, 1).map(b => b.id);
  assert.ok(got.includes('alb_sovy') && got.includes('km5'));
  assert.equal(checkBadges(DEFAULTS, st, 1).length, 0, 'podruhé nic');
});

test('kvíz: správná odpověď je mezi třemi různými možnostmi a sedí s údaji druhu', async () => {
  const { makeQuiz } = await import('../js/progress.js');
  let n = 0;
  for (const sp of DEFAULTS.species) {
    const z = makeQuiz(sp, DEFAULTS.species);
    if (!z) continue; n++;
    assert.equal(z.answers.length, 3); assert.equal(new Set(z.answers).size, 3, sp.id);
    assert.equal(z.answers[z.correct], sp.edu[z.field], sp.id);
  }
  assert.ok(n >= 90, 'kvíz jde skoro u všech druhů: ' + n);
});

test('ekonomika: vypuštění dá body podle vzácnosti a stádia, vývoj chce XP jedince i body', async () => {
  const { release, releaseValue, evolve, evolveNeed, stageNames, isMaster, train, buy, useItem } = await import('../js/economy.js');
  const { animalFrom } = await import('../js/collection.js');
  const { cleanProgress } = await import('../js/progress.js');
  const st = Object.assign(cleanProgress({}), { animals: [], inv: {} });
  const a = animalFrom('kos', [50, 50, 50, 50], 90, 'park'); st.animals.push(a);
  assert.equal(releaseValue(DEFAULTS, { rarity: '3' }, a), 60);
  assert.deepEqual(stageNames(DEFAULTS, 'Ptáci'), ['mládě', 'dospělý', 'mistr']);
  assert.deepEqual(stageNames(DEFAULTS, 'Obojživelníci'), ['pulec', 'mladý', 'dospělý', 'mistr']);
  assert.equal(evolve(DEFAULTS, st, a, 'Ptáci'), 'axp');
  a.axp = evolveNeed(DEFAULTS, a).axp;
  assert.equal(evolve(DEFAULTS, st, a, 'Ptáci'), 'points');
  st.points = 1000;
  assert.equal(evolve(DEFAULTS, st, a, 'Ptáci'), 'ok');
  assert.equal(a.stage, 1); assert.equal(a.stats[0], 55); assert.equal(st.points, 970);
  a.axp = 1e6; assert.equal(evolve(DEFAULTS, st, a, 'Ptáci'), 'ok'); assert.ok(isMaster(DEFAULTS, a, 'Ptáci'));
  assert.equal(evolve(DEFAULTS, st, a, 'Ptáci'), 'max');
  // trénink: šišky a denní limit
  const b = animalFrom('kos', [10, 5, 20, 30], 90, 'park');
  assert.equal(train(DEFAULTS, st, b, '2026-11-21'), 'cones');
  st.cones = 1000;
  for (let i = 0; i < DEFAULTS.game.trainPerDay; i++) assert.equal(train(DEFAULTS, st, b, '2026-11-21'), 'ok');
  assert.equal(train(DEFAULTS, st, b, '2026-11-21'), 'limit');
  assert.equal(train(DEFAULTS, st, b, '2026-11-22'), 'ok', 'nový den');
  assert.deepEqual(b.stats, [12, 11, 20, 30], 'trénink zvedá vždy nejslabší vlastnost');
  // obchod
  assert.equal(buy(DEFAULTS, st, 'navnada'), 'ok'); assert.equal(st.inv.navnada, 1);
  assert.equal(useItem(DEFAULTS, st, 'navnada').effect, 'lure'); assert.equal(st.inv.navnada, undefined);
  assert.equal(useItem(DEFAULTS, st, 'navnada'), null);
  // vypuštění odebere jedince
  assert.equal(release(DEFAULTS, st, a, { rarity: '1' }), 30); assert.equal(st.animals.length, 0);
});

test('počasí: stav z odpovědi MET Norway, zaokrouhlená poloha, nový dotaz až po vypršení', async () => {
  const { weatherFromMet, refreshWeather, weatherCond, weatherKey } = await import('../js/world.js');
  const now = Date.parse('2026-11-21T10:20:00Z');
  const met = (sym, t) => ({ properties: { timeseries: [{ time: '2026-11-21T10:00:00Z', data: { instant: { details: { air_temperature: t } }, next_1_hours: { summary: { symbol_code: sym } } } }] } });
  assert.equal(weatherFromMet(met('lightrain', 8), now).cond, 'rain');
  assert.equal(weatherFromMet(met('heavysnow', -2), now).cond, 'snow');
  assert.equal(weatherFromMet(met('cloudy', -3), now).cond, 'cold');
  assert.equal(weatherFromMet(met('clearsky_day', 28), now).cond, 'hot');
  assert.equal(weatherKey(50.0755, 14.4378), '50.1,14.4');
  let calls = 0, url = '';
  const fetcher = async u => { calls++; url = u; return { ok: true, headers: { get: () => new Date(now + 3600000).toUTCString() }, json: async () => met('rain', 7) }; };
  const w = await refreshWeather(null, 50.0755, 14.4378, now, fetcher);
  assert.ok(url.includes('lat=50.1&lon=14.4'), 'jen zaokrouhlená poloha');
  assert.equal(await refreshWeather(w, 50.08, 14.41, now + 60000, fetcher), w, 'v platnosti bez dotazu');
  assert.equal(calls, 1);
  const dry = { ...w, cond: 'cloudy' };
  assert.equal(weatherCond(dry, now + 3600000), 'rain', 'do 3 h po dešti');
  assert.equal(weatherCond(dry, now + 4 * 3600000), 'cloudy');
});

test('svět: události i přes Nový rok, násobky druhů, klidová pásma a barevné varianty', async () => {
  const { activeEvents, speciesMult, variantFor, wikiOf, protectedType } = await import('../js/world.js');
  assert.deepEqual(activeEvents(DEFAULTS, new Date(2026, 2, 20)).map(e => e.id).sort(), ['prilet', 'zabitah']);
  const cfg = { ...DEFAULTS, events: [{ id: 'z', from: '12-20', to: '01-10', boost: 'kos:2' }] };
  assert.equal(activeEvents(cfg, new Date(2027, 0, 3)).length, 1);
  assert.equal(activeEvents(cfg, new Date(2027, 0, 11)).length, 0);
  const sp = id => DEFAULTS.species.find(s => s.id === id);
  const ctx = { now: new Date(2026, 6, 1), weather: 'rain', twilight: false, hidden: false };
  assert.equal(speciesMult(DEFAULTS, sp('hlemyzd'), ctx), 3);
  assert.equal(speciesMult(DEFAULTS, sp('skokan'), ctx), 1.8, 'skupina Obojživelníci');
  assert.equal(speciesMult(DEFAULTS, sp('srnec'), { ...ctx, weather: '', twilight: true }), 3);
  assert.equal(speciesMult(DEFAULTS, sp('lednacek'), { ...ctx, weather: '', hidden: true }), 3, 'vzácnost 3 ve skrýši');
  assert.equal(speciesMult(DEFAULTS, sp('volavka'), { ...ctx, quiet: true, bio: 'mokrad' }), 0);
  assert.equal(variantFor(DEFAULTS, sp('zmije'), 0.05), 'melan', 'černá zmije je běžná');
  assert.equal(variantFor(DEFAULTS, sp('kos'), 0.05), '');
  assert.equal(variantFor(DEFAULTS, sp('kos'), 0.999), 'albin');
  assert.equal(variantFor(DEFAULTS, sp('babocka'), 0.999), '', 'hmyz albíny nemá');
  assert.equal(wikiOf({ wikipedia: 'cs:CHKO Křivoklátsko' }).url, 'https://cs.wikipedia.org/wiki/CHKO_K%C5%99ivokl%C3%A1tsko');
  assert.equal(protectedType({ protect_class: '5' }), 'chráněná krajinná oblast');
});

test('chráněné území: zvířata jen u cest, turistické cíle se načtou s názvem', async () => {
  const { spawnAllowed, protectedAt, targetsNear } = await import('../js/osm.js');
  osmSetConfig(clone(DEFAULTS)); try { await clearOsmCache(); } catch (e) {}
  const realFetch = globalThis.fetch;
  globalThis.fetch = async (u, o) => {
    const q = decodeURIComponent(String(o.body)).slice(5);
    const els = q.includes('is_in') ? [{ type: 'area', id: 1, tags: { name: 'CHKO Test', protect_class: '5', wikipedia: 'cs:CHKO Test' } }, { type: 'node', id: 7, lat: 49.2004, lon: 16.6004, tags: { tourism: 'viewpoint', name: 'Vyhlídka Test' } }]
      : [{ type: 'way', id: 2, tags: { highway: 'path' }, geometry: [{ lat: 49.2001, lon: 16.6001 }, { lat: 49.2009, lon: 16.6009 }] }];
    return { ok: true, json: async () => ({ elements: els }) };
  };
  try {
    ensureArea(49.2005, 16.6005, 10); await new Promise(r => setTimeout(r, 80));
    assert.equal(protectedAt(49.2005, 16.6005).name, 'CHKO Test');
    assert.equal(spawnAllowed(49.2005, 16.6005), true, 'u cesty');
    assert.equal(spawnAllowed(49.2005, 16.6095), false, 'daleko od cesty');
    const t = targetsNear(49.2005, 16.6005, 100);
    assert.equal(t.length, 1); assert.equal(t[0].name, 'Vyhlídka Test'); assert.equal(t[0].icon, '🔭');
  } finally { globalThis.fetch = realFetch; }
});

test('poznávání: stopy jen u druhů se znameními, kvíz má správný druh, klíč zužuje druhy, deník se očistí', async () => {
  const { isTrack, trackQuiz, sizeCm, keyFilter, cleanJournal, hasSigns } = await import('../js/field.js');
  const sp = id => DEFAULTS.species.find(s => s.id === id);
  assert.ok(hasSigns(sp('veverka')));
  assert.equal(isTrack(DEFAULTS, sp('veverka'), 0.1), true);
  assert.equal(isTrack(DEFAULTS, sp('veverka'), 0.9), false);
  assert.equal(isTrack(DEFAULTS, sp('kapr'), 0.01), false, 'ryba stopy nemá');
  const z = trackQuiz(sp('veverka'), DEFAULTS.species);
  assert.equal(z.opts.length, 3); assert.equal(z.opts[z.correct], 'veverka'); assert.equal(new Set(z.opts).size, 3);
  assert.equal(sizeCm('11–12 cm'), 11); assert.equal(sizeCm('1–1,3 m'), 100); assert.equal(sizeCm('20–25 cm + ocas 15–20 cm'), 20); assert.equal(sizeCm(''), null);
  const all = keyFilter(DEFAULTS.species, {}).length;
  const birds = keyFilter(DEFAULTS.species, { group: 'Ptáci' });
  assert.ok(birds.length < all && birds.every(s => s.group === 'Ptáci'));
  const small = keyFilter(DEFAULTS.species, { group: 'Ptáci', size: 'small' });
  assert.ok(small.some(s => s.id === 'modrinka') && !small.some(s => s.id === 'volavka'));
  assert.ok(keyFilter(DEFAULTS.species, { group: 'Ptáci', time: 'night' }).every(s => s.night));
  const j = cleanJournal([{ id: 'a', sp: 'kos', date: 5, note: 'x'.repeat(900), lat: 50.123456, lon: 14.98765, photo: '3' }, null, 'bad']);
  assert.equal(j.length, 1); assert.equal(j[0].note.length, 500); assert.equal(j[0].lat, 50.123); assert.equal(j[0].photo, 3);
});

test('QR kód: oprava chyb a formátové bity podle normy, matice má správnou velikost a vyhledávací vzory', async () => {
  const { rsEcc, formatBits, versionBits, qrMatrix } = await import('../js/qr.js');
  // příklad „HELLO WORLD“ 1-M z návodů k normě ISO/IEC 18004
  assert.deepEqual(rsEcc([32, 91, 11, 120, 209, 114, 220, 77, 67, 64, 236, 17, 236, 17, 236, 17], 10), [196, 35, 39, 119, 235, 215, 231, 226, 93, 23]);
  assert.equal(formatBits(0).toString(2).padStart(15, '0'), '101010000010010');
  assert.equal(formatBits(5).toString(2).padStart(15, '0'), '100000011001110');
  assert.equal(versionBits(7).toString(2).padStart(18, '0'), '000111110010010100');
  const m = qrMatrix('https://jirka-cell.github.io/stopar/');
  assert.equal(m.length, 29, '36 bajtů → verze 3 (29 × 29)');
  const finder = (x, y) => [0, 1, 2, 3, 4, 5, 6].every(i => m[y][x + i] && m[y + 6][x + i] && m[y + i][x] && m[y + i][x + 6]) && m[y + 3][x + 3] && !m[y + 1][x + 1];
  assert.ok(finder(0, 0) && finder(22, 0) && finder(0, 22));
  assert.throws(() => qrMatrix('x'.repeat(600)));
});

test('události od rodičů: odkaz se zakóduje a dekóduje, cíle se počítají jen v čase a místě události', async () => {
  const { cleanEvent, encodeEvent, decodeEvent, eventProgress, insideBound, cleanParent } = await import('../js/family.js');
  const e = cleanEvent({ id: 'x', n: 'Výprava k rybníku 🐸', m: 'Hodně štěstí!', f: 1000, t: 1e13, la: 50, lo: 14, r: 1000, g: [['catchGroup', 'Ptáci', 2], ['walk', '', 1000], ['bad', '', 1]] });
  assert.equal(e.g.length, 2, 'neznámý cíl se zahodí');
  const d = decodeEvent(encodeEvent(e));
  assert.equal(d.n, 'Výprava k rybníku 🐸'); assert.deepEqual(d.g, e.g);
  assert.equal(decodeEvent('nesmysl!!'), null);
  assert.equal(cleanEvent({ n: '', g: [['catch', '', 1]], f: 1, t: 2 }), null);
  const evs = [d], here = { lat: 50.001, lon: 14 }, far = { lat: 51, lon: 14 };
  assert.equal(eventProgress(evs, { kind: 'catch', group: 'Ptáci' }, far, 5000).length, 0);
  assert.deepEqual(d.p, [0, 0], 'mimo oblast se nepočítá');
  eventProgress(evs, { kind: 'catch', group: 'Ptáci' }, here, 5000);
  eventProgress(evs, { kind: 'catch', group: 'Ptáci' }, here, 5000);
  assert.equal(eventProgress(evs, { kind: 'walk', n: 1200 }, here, 5000).length, 1, 'splněno');
  assert.equal(eventProgress(evs, { kind: 'walk', n: 1200 }, here, 5000).length, 0, 'jen jednou');
  const p = cleanParent({ kidMode: 'zzz', bound: { lat: 50, lon: 14, r: 1000 } });
  assert.equal(p.kidMode, 'auto');
  assert.equal(insideBound(p, 50.005, 14), true); assert.equal(insideBound(p, 50.02, 14), false);
});

test('soutěže: hodnocení šikovnosti, skóre půl na půl se zvířetem, kód výsledku se přečte a odhalí překlep', async () => {
  const { sprintSkill, tahSkill, schovkaSkill, rytmusSkill, contestScore, scoreCode, readScoreCode, lemniscate, cleanRecords } = await import('../js/contests.js');
  assert.equal(sprintSkill([250, 250], 0), 1); assert.equal(sprintSkill([1000], 0), 0); assert.equal(sprintSkill([], 0), 0);
  assert.ok(Math.abs(sprintSkill([625], 1) - 0.45) < 1e-9);
  assert.equal(tahSkill(0, 4), 1); assert.equal(tahSkill(40, 4), 0); assert.equal(tahSkill(0, 15), 0);
  assert.equal(schovkaSkill(5, 5, 0), 1); assert.equal(schovkaSkill(0, 5, 500), 0);
  assert.equal(rytmusSkill([0, 0, 0]), 1); assert.equal(rytmusSkill([-200, 200]), 0);
  assert.equal(contestScore(1, 100, 100), 1000); assert.equal(contestScore(0, 50, 100), 250); assert.equal(contestScore(2, 500, 100), 1000, 'strop');
  const when = Date.UTC(2026, 10, 21, 12);
  for (const [g, s] of [['sprint', 812], ['tah', 0], ['schovka', 1000], ['rytmus', 437]]) {
    const c = scoreCode(g, s, when), r = readScoreCode(c);
    assert.match(c, /^[2-9A-HJ-NP-Z]{4}-[2-9A-HJ-NP-Z]{4}$/);
    assert.equal(r.game, g); assert.equal(r.score, s); assert.equal(new Date(r.date).toISOString().slice(0, 10), '2026-11-21');
    assert.deepEqual(readScoreCode(c.toLowerCase().replace('-', ' ')), r, 'malá písmena a mezera nevadí');
  }
  const c = scoreCode('sprint', 812, when), typo = (c[0] === '2' ? '3' : '2') + c.slice(1);
  assert.equal(readScoreCode(typo), null, 'překlep se pozná');
  assert.equal(readScoreCode('nesmysl'), null);
  assert.equal(lemniscate(300, 200).length, 240);
  assert.deepEqual(Object.keys(cleanRecords({ sprint: { score: 5000, sp: 'kos', date: 1 }, nic: { score: 1 } })), ['sprint']);
  assert.equal(cleanRecords({ sprint: { score: 5000 } }).sprint.score, 1000);
});
