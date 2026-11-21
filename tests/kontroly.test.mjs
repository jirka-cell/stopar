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
  assert.equal(m.version, 5);
  assert.deepEqual([m.map.minZoom, m.map.maxZoom, m.map.startZoom], [12, 18, 16]);
  assert.equal(m.map.attribution, DEFAULTS.map.attribution);
  assert.equal(m.map.tileCacheMax, DEFAULTS.map.tileCacheMax);
  assert.equal('tileUrl' in m.map, false);
  assert.equal(mergeDefaults(m).map.startZoom, 16, 'nová verze se už neposouvá');
});

test('styl mapy: den/noc podle slunce, unikátní vrstvy, vypnuté vrstvy skryté', () => {
  assert.equal(styleIdFor('auto', false), 'hra');
  assert.equal(styleIdFor('auto', true), 'noc');
  assert.equal(styleIdFor('papir', true), 'papirnoc'); assert.equal(styleIdFor('papir', false), 'papir');
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
  assert.ok(!on.sources['tr-hiking'], 'turistické trasy už nejsou obrázky');
  assert.equal(on.layers.find(l => l.id === 'kct-line').layout.visibility, 'visible');
  assert.equal(off.layers.find(l => l.id === 'kct-line').layout.visibility, 'none');
  assert.match(makeStyle('hra', { ...DEFAULTS.layers, trCycling: true }, ctx).sources['tr-cycling'].tiles[0], /\/cycling\//, 'cyklotrasy zůstávají z Waymarked Trails');
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

test('verze 4 → 5: vestavěné předvolby vzhledu se odeberou, vlastní zůstanou; výchozí vzhled Papír a akvarel', () => {
  const m = mergeDefaults({ version: 4, mapPresets: [{ name: 'Moje', style: 'hra', layers: { contours: true } }, { name: 'Úsporný', style: 'auto', layers: {} }, { name: 'Les a hory', style: 'auto', layers: {} }] });
  assert.deepEqual(m.mapPresets.map(p => p.name), ['Moje']);
  const again = mergeDefaults({ ...m, mapPresets: [...m.mapPresets, { name: 'Výlet', style: 'papir', layers: {} }] });
  assert.equal(again.mapPresets.length, 2, 've verzi 5 si předvolbu se starým názvem jde znovu vytvořit');
  const d = mergeDefaults(null);
  assert.equal(d.map.style, 'papir'); assert.equal(d.layers.buildings, '3d');
  assert.ok(d.layers.contours && d.layers.trHiking && d.layers.trCycling && d.layers.peaks && d.layers.protected && d.layers.roadNames);
  assert.ok(!d.layers.hillshade && !d.layers.biotopes && !d.layers.poiShop);
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
  assert.equal(CHECKS.length, 43);
  assert.ok(t.includes('Anička · zařízení: iPhone'));
  assert.ok(t.includes('GPS a poloha: Problém'));
  assert.ok(t.includes('skáče o 50 m'));
  assert.equal(t.split('\n').filter(l => /^\d+\. /.test(l)).length, 43);
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
  assert.equal(releaseValue(DEFAULTS, { rarity: '3' }, a), 30, 'vědomosti za vypuštění: základ 5 × vzácnost 6');
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
  assert.equal(release(DEFAULTS, st, a, { rarity: '1' }), 15); assert.equal(st.animals.length, 0);
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
  const ctx = { now: new Date(2026, 6, 1), weather: 'rain', twilight: false };
  assert.equal(speciesMult(DEFAULTS, sp('hlemyzd'), ctx), 3);
  assert.equal(speciesMult(DEFAULTS, sp('skokan'), ctx), 1.8, 'skupina Obojživelníci');
  assert.equal(speciesMult(DEFAULTS, sp('srnec'), { ...ctx, weather: '', twilight: true }), 3);
  assert.equal(speciesMult(DEFAULTS, sp('lednacek'), { ...ctx, weather: '', hidden: true }), 1, 'skrýš rozmístění nemění');
  assert.equal(DEFAULTS.world.weatherSpawn, false, 'počasí do rozmístění až se serverem');
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

test('pes Aegon: priorita stavů (událost, vystavení, čenichání, chůze, odpočinek) a kresby všech póz', async () => {
  const { dogPose, POSES, dogURL } = await import('../js/dog.js');
  const base = { now: 1000, eventUntil: 0, event: '', inRange: false, near: false, walking: false, idleMs: 0, night: false, dir: 1, sleepMs: 360000, lieMs: 120000 };
  assert.equal(dogPose(base).pose, 'sit');
  assert.equal(dogPose({ ...base, walking: true }).pose, 'walk');
  assert.equal(dogPose({ ...base, walking: true, near: true, dir: -1 }).pose, 'sniff');
  assert.deepEqual(dogPose({ ...base, near: true, inRange: true, dir: -1 }), { pose: 'point', dir: -1 });
  assert.equal(dogPose({ ...base, inRange: true, event: 'joy', eventUntil: 2000 }).pose, 'joy', 'událost má přednost');
  assert.equal(dogPose({ ...base, event: 'joy', eventUntil: 500 }).pose, 'sit', 'po události zase sedne');
  assert.equal(dogPose({ ...base, idleMs: 130000 }).pose, 'lie');
  assert.equal(dogPose({ ...base, idleMs: 200000, night: true }).pose, 'sleep', 'v noci usne dřív');
  for (const p of POSES) { const u = decodeURIComponent(dogURL(p)); assert.ok(u.includes('<svg') && u.includes('</svg>') && !/undefined|NaN/.test(u), p); }
});

test('ztlumení při chůzi: rychlost z poloh i z GPS, zapnutí a vypnutí s odstupem', async () => {
  const { nextSpeed, muteState } = await import('../js/mapui.js');
  assert.equal(nextSpeed(null, { t: 1000, gpsSpeed: NaN }, 0), 0);
  assert.equal(nextSpeed({ t: 0, speed: 0 }, { t: 2000, gpsSpeed: NaN }, 4), 1, '4 m za 2 s, vyhlazeno');
  assert.equal(nextSpeed({ t: 0, speed: 1 }, { t: 2000, gpsSpeed: 1.7 }, 0), 1.7, 'GPS rychlost má přednost');
  assert.equal(nextSpeed({ t: 0, speed: 0.8 }, { t: 200, gpsSpeed: NaN }, 5), 0.8, 'moc krátký interval');
  assert.equal(muteState(false, 1.2, 1), true); assert.equal(muteState(false, 0.9, 1), false);
  assert.equal(muteState(true, 0.7, 1), true, 'vypne se až pod polovinou'); assert.equal(muteState(true, 0.4, 1), false);
});

test('bájní tvorové: 2 okna ročně (zima, léto), stejná pro všechny, tvor jen u svého biotopu a v sezóně', async () => {
  const { mythWindows, activeWindow, daysToWindow, mythFor, hasMythArt } = await import('../js/myths.js');
  const w = mythWindows(DEFAULTS, 2027);
  assert.equal(w.length, 2);
  assert.deepEqual(w, mythWindows(clone(DEFAULTS), 2027), 'deterministické');
  const d0 = new Date(w[0].from), d1 = new Date(w[1].from);
  assert.ok(d0.getMonth() <= 1 && d1.getMonth() >= 5 && d1.getMonth() <= 7, 'zima a léto');
  assert.equal(Math.round((w[0].to - w[0].from) / 86400000), DEFAULTS.world.mythDays);
  assert.ok(activeWindow(DEFAULTS, w[1].from + 3600000));
  assert.equal(activeWindow(DEFAULTS, w[1].to + 86400000), null);
  assert.equal(daysToWindow(DEFAULTS, w[1].from - 2 * 86400000 + 1000), 2);
  const win = w[1], now = win.from + 3600000; // léto
  assert.equal(mythFor(DEFAULTS, { window: win, now, bio: 'louka', zone: 'nizina', night: false }, 0.001), 'vila');
  assert.equal(mythFor(DEFAULTS, { window: win, now, bio: 'louka', zone: 'nizina', night: false }, 0.5), '', 'vzácné');
  assert.equal(mythFor(DEFAULTS, { window: null, now, bio: 'louka', zone: 'nizina', night: false }, 0.001), '', 'mimo bájné dny nic');
  assert.notEqual(mythFor(DEFAULTS, { window: win, now, bio: 'les', zone: 'hory', night: false }, 0.001), 'snezny', 'sněžný muž v létě ne');
  const winterNow = w[0].from + 3600000;
  assert.equal(mythFor(DEFAULTS, { window: w[0], now: winterNow, bio: 'louka', zone: 'nad_lesem', night: false }, 0.001), 'snezny');
  assert.equal(mythFor(DEFAULTS, { window: w[0], now: winterNow, bio: 'les', zone: 'nizina', night: false }, 0.001), '', 'hejkal jen v noci');
  assert.equal(DEFAULTS.myths.filter(t => !t.fest).length, 10);
  for (const t of DEFAULTS.myths) assert.ok(hasMythArt(t.id), t.id);
});

test('sváteční tvorové: Dušičky, Mikuláš, Vánoce a Velikonoce podle data, všude a jen sváteční; Velikonoce správně', async () => {
  const { festWindows, activeWindow, mythFor, easter } = await import('../js/myths.js');
  assert.equal(easter(2026).toDateString(), new Date(2026, 3, 5).toDateString());
  assert.equal(easter(2027).toDateString(), new Date(2027, 2, 28).toDateString());
  const nik = new Date(2026, 11, 5, 12).getTime(), w = activeWindow(DEFAULTS, nik);
  assert.equal(w && w.fest, 'mikulas');
  const got = new Set(); for (let h = 0; h < 0.05; h += 0.001) got.add(mythFor(DEFAULTS, { window: w, now: nik, bio: 'mesto', zone: 'nizina', night: false }, h));
  assert.deepEqual([...got].sort(), ['andel', 'cert'], 'o Mikuláši jen čert a anděl, i ve městě');
  assert.equal(activeWindow(DEFAULTS, new Date(2026, 3, 4, 12).getTime()).fest, 'velikonoce');
  assert.equal(activeWindow({ ...DEFAULTS, world: { ...DEFAULTS.world, festivals: false } }, nik), null);
  assert.equal(festWindows(2026).length, 5);
  const { hradyWindow } = await import('../js/myths.js'), hw = hradyWindow(2026);
  assert.equal(new Date(hw.from + 86400000).toDateString(), new Date(2026, 7, 29).toDateString(), 'Noc na hradech kolem poslední srpnové soboty');
  assert.equal(activeWindow(DEFAULTS, new Date(2026, 7, 29, 20).getTime()).fest, 'hrady');
  assert.ok(DEFAULTS.myths.filter(t => t.fest).every(t => t.easy));
});

test('poklady a krmítka: odkaz na poklad, přibližný kruh, krmítka u cílů a větších parků, park se pozná', async () => {
  const { cleanTreasure, treasureLink, decodeTreasure, searchCircle, distM, feedersNear, feederReward, parkCell } = await import('../js/treasure.js');
  const t = cleanTreasure({ id: 'a1', n: 'Poklad u lípy 🌳', h: 'Kde dub objímá kámen', la: 50.123456789, lo: 14.5, c: 5, own: true });
  assert.equal(t.la, 50.12346);
  const link = treasureLink('https://x/stopar/', t), back = decodeTreasure(link.split('#poklad=')[1]);
  assert.equal(back.n, t.n); assert.equal(back.h, t.h); assert.equal(back.own, false, 'u příjemce není vlastní');
  assert.equal(decodeTreasure('xx!'), null); assert.equal(cleanTreasure({ n: 'bez polohy' }), null);
  const c = searchCircle(t, 60);
  assert.deepEqual(c, searchCircle(t, 60), 'stejný kruh pro všechny');
  assert.ok(distM({ lat: c.lat, lon: c.lon }, { lat: t.la, lon: t.lo }) <= 40.01, 'poklad je uvnitř kruhu');
  const f = feedersNear([{ id: 'n9', lat: 1, lon: 2, name: 'Rozhledna' }], [{ id: 'p1', lat: 3, lon: 4, size: 200 }, { id: 'p2', lat: 5, lon: 6, size: 30 }], 80);
  assert.deepEqual(f.map(x => x.id), ['fn9', 'fp1'], 'malý park krmítko nemá');
  assert.deepEqual(feederReward(DEFAULTS, 'fn9', '2026-11-21'), feederReward(DEFAULTS, 'fn9', '2026-11-21'));
  assert.equal(parkCell(50, 14), parkCell(50, 14), 'stejné místo'); assert.equal(new Set([0, 1, 2, 3].map(i => parkCell(50 + i * 0.00002, 14))).size <= 2, true, 'pár metrů = nejvýš sousední políčko');
  assert.notEqual(parkCell(50, 14), parkCell(50.001, 14));
  // park z dat OSM
  const { parksNear, parkAt } = await import('../js/osm.js');
  osmSetConfig(clone(DEFAULTS)); try { await clearOsmCache(); } catch (e) {}
  const realFetch = globalThis.fetch;
  const sq = (a, b, s) => [[a, b], [a, b + s], [a + s, b + s], [a + s, b], [a, b]].map(([lat, lon]) => ({ lat, lon }));
  globalThis.fetch = async () => ({ ok: true, json: async () => ({ elements: [{ type: 'way', id: 3, tags: { leisure: 'park' }, geometry: sq(48.5001, 17.0001, 0.004) }] }) });
  try {
    ensureArea(48.502, 17.002, 10); await new Promise(r => setTimeout(r, 80));
    assert.ok(parkAt(48.502, 17.002)); assert.equal(parkAt(48.4999, 16.9999), null);
    const p = parksNear(48.502, 17.002, 500); assert.equal(p.length, 1); assert.ok(p[0].size > 250);
  } finally { globalThis.fetch = realFetch; }
});

test('turistické trasy: barva podle značky KČT, naučné stezky, převod relací na čáry, dlaždice výřezu', async () => {
  const { trailColor, isEducational, trailsGeoJSON, tilesFor } = await import('../js/trails.js');
  assert.equal(trailColor({ 'osmc:symbol': 'red:white:red_bar' }), '#d9302a');
  assert.equal(trailColor({ 'osmc:symbol': 'blue:white:blue_bar' }), '#2a62c9');
  assert.equal(trailColor({ colour: 'yellow' }), '#f2b81b');
  assert.equal(trailColor({}), '#9a5ab0');
  assert.ok(isEducational({ 'osmc:symbol': 'green:white:green_diag' }));
  assert.ok(isEducational({ name: 'Naučná stezka Kopec' })); assert.ok(!isEducational({ name: 'Červená' }));
  const f = trailsGeoJSON({ elements: [{ type: 'relation', id: 5, tags: { route: 'hiking', 'osmc:symbol': 'green:white:green_bar', name: 'Zelená' }, members: [
    { type: 'way', geometry: [{ lat: 50, lon: 14 }, { lat: 50.01, lon: 14.01 }] }, { type: 'way', geometry: [{ lat: 50 }] }, { type: 'node', lat: 1, lon: 1 }] }] });
  assert.equal(f.length, 1); assert.equal(f[0].properties.color, '#2e9a3a'); assert.deepEqual(f[0].geometry.coordinates[0], [14, 50]);
  const t = tilesFor([50.01, 14.01, 50.12, 14.2], 4);
  assert.equal(t.length, 4); assert.ok(t.every(k => /^\d+_\d+$/.test(k)));
});

test('styl mapy: vlastnosti, které MapLibre neumí měnit podle dat, nejsou datové (jinak se mapa nenačte)', () => {
  const ctx = { vectorUrl: DEFAULTS.map.vectorUrl, glyphsUrl: DEFAULTS.map.glyphsUrl, demUrl: 'dem://x', contourUrl: 'contour://x', trailsUrl: DEFAULTS.map.trailsUrl, biotopes: DEFAULTS.biotopes, game: {} };
  const all = Object.fromEntries(Object.keys(DEFAULTS.layers).map(k => [k, k === 'buildings' ? '3d' : true]));
  for (const id of Object.keys(STYLES)) for (const l of makeStyle(id, all, ctx).layers) {
    const p = l.paint || {};
    for (const k of ['line-dasharray', 'fill-extrusion-opacity', 'raster-opacity']) if (k in p) assert.ok(!JSON.stringify(p[k]).includes('"get"'), `${id}/${l.id}: ${k} nesmí záviset na datech`);
  }
});

test('plánovač: graf pěšin, nejkratší cesta, okruh dané délky, zjednodušení a polyline do odkazu', async () => {
  const P = await import('../js/planner.js');
  // mřížka 7×7 uzlů po ~100 m: vodorovně pěšiny (levné), svisle ulice (dražší)
  const els = [], id = (r, c) => r * 10 + c + 1;
  for (let r = 0; r < 7; r++) for (let c = 0; c < 7; c++) els.push({ type: 'node', id: id(r, c), lat: 50 + r * 0.0009, lon: 14 + c * 0.0014 });
  for (let r = 0; r < 7; r++) els.push({ type: 'way', id: 1000 + r, tags: { highway: 'footway' }, nodes: [0, 1, 2, 3, 4, 5, 6].map(c => id(r, c)) });
  for (let c = 0; c < 7; c++) els.push({ type: 'way', id: 2000 + c, tags: { highway: 'residential' }, nodes: [0, 1, 2, 3, 4, 5, 6].map(r => id(r, c)) });
  const g = P.buildGraph({ elements: els });
  assert.equal(g.nodes.size, 49);
  assert.equal(P.nearestNode(g, [50.0001, 14.0001]), id(0, 0));
  const path = P.route(g, id(0, 0), id(0, 6));
  assert.equal(path.length, 7, 'po pěšině rovně'); assert.deepEqual(path, [0, 1, 2, 3, 4, 5, 6].map(c => id(0, c)));
  assert.equal(P.route(g, id(0, 0), 99999), null);
  const loops = P.suggestLoops(g, [50.0027, 14.0042], 1200);
  assert.ok(loops.length >= 1, 'aspoň jeden okruh');
  for (const L of loops) { assert.ok(L.len > 500 && L.len < 2500, 'délka ~1,2 km: ' + Math.round(L.len)); assert.deepEqual(L.coords[0], L.coords.at(-1), 'okruh končí na startu'); }
  // zjednodušení a polyline
  const line = [[50, 14], [50.0001, 14.001], [50, 14.002], [50.01, 14.002]];
  assert.equal(P.simplify(line, 50).length, 3, 'malá odchylka zmizí');
  const enc = P.encodePolyline([[38.5, -120.2], [40.7, -120.95], [43.252, -126.453]]);
  assert.equal(enc, '_p~iF~ps|U_ulLnnqC_mqNvxq`@', 'vzorový příklad Google');
  assert.deepEqual(P.decodePolyline(enc), [[38.5, -120.2], [40.7, -120.95], [43.252, -126.453]]);
  assert.equal(P.decodePolyline('_p~'), null);
  const cps = P.checkpointsAlong([[50, 14], [50, 14.01]], 3);
  assert.equal(cps.length, 3); assert.ok(Math.abs(cps[1][1] - 14.005) < 1e-9, 'prostřední v polovině');
  assert.equal(P.cleanRoute({ p: enc, n: 'X' }).n, 'X'); assert.equal(P.cleanRoute({ p: '_p~' }), null);
});

test('offline: dlaždice pokrývají kruh, odhad odpovídá tabulce variant, adresy jsou úplné', async () => {
  const { tileRange, planUrls, estimate } = await import('../js/offline.js');
  const t14 = tileRange(50.0755, 14.4378, 2000, 14);
  assert.ok(t14.length >= 9 && t14.length <= 20, 'z14, 2 km: ' + t14.length);
  assert.equal(tileRange(50.0755, 14.4378, 2000, 8).length, 1, 'z8 = jedna dlaždice');
  const e2 = estimate(50.0755, 14.4378, 2000, 0.01), e5 = estimate(50.0755, 14.4378, 5000, 0.01), e10 = estimate(50.0755, 14.4378, 10000, 0.01);
  assert.ok(e2.mb < e5.mb && e5.mb < e10.mb);
  assert.ok(e2.chunks >= 25 && e2.chunks <= 45, '2 km čtverce: ' + e2.chunks);
  assert.ok(e10.chunks >= 450 && e10.chunks <= 650, '10 km čtverce: ' + e10.chunks);
  assert.ok(e5.mb > 3 && e5.mb < 20, '5 km MB: ' + e5.mb);
  const urls = planUrls('https://t/p/{z}/{x}/{y}.pbf', 'https://d/{z}/{x}/{y}.png', 'https://f/{fontstack}/{range}.pbf', 50.0755, 14.4378, 2000);
  assert.ok(urls.every(u => !/[{}]/.test(u)), 'žádné nedosazené {}');
  assert.equal(new Set(urls).size, urls.length, 'bez duplicit');
  assert.ok(urls.some(u => u.includes('Noto%20Sans%20Bold/256-511')));
});

test('app.js: žádné jméno se nedováží dvakrát a každý dovoz existuje v modulu (jinak aplikace nenaběhne)', async () => {
  const { readFileSync } = await import('node:fs');
  const src = readFileSync(new URL('../js/app.js', import.meta.url), 'utf8');
  const names = [], re = /import\s*\{([^}]+)\}\s*from\s*'\.\/([\w-]+\.js)'/g;
  let m;
  while ((m = re.exec(src))) {
    const mod = await import('../js/' + m[2]);
    for (const part of m[1].split(',').map(s => s.trim()).filter(Boolean)) {
      const [orig, alias] = part.split(/\s+as\s+/).map(s => s.trim());
      assert.ok(orig in mod, `${m[2]} nemá export ${orig}`);
      names.push(alias || orig);
    }
  }
  const dup = names.filter((n, i) => names.indexOf(n) !== i);
  assert.deepEqual(dup, [], 'dvakrát dovezené: ' + dup.join(', '));
  for (const n of names) assert.ok(!new RegExp('^(?:function|let|const|class)\s+' + n + '\b', 'm').test(src), `${n} je dovezené i deklarované v app.js`);
});

test('drobnosti: každá potrava má obrázek, kód rodinné výpravy se přečte a pozná překlep', async () => {
  const { hasFoodIcon, foodIcon, weekCode, readWeekCode, weekNumber } = await import('../js/extras.js');
  for (const f of DEFAULTS.foods) { assert.ok(hasFoodIcon(f.id), 'obrázek potravy ' + f.id); assert.ok(!/undefined|NaN/.test(foodIcon(f.id))); }
  const wk = weekNumber(new Date(2026, 10, 21));
  assert.equal(wk, 45, 'týden od 5. 1. 2026');
  const c = weekCode(wk, 12345, 17), r = readWeekCode(c);
  assert.match(c, /^[2-9A-HJ-NP-Z]{3}-[2-9A-HJ-NP-Z]{3}-[2-9A-HJ-NP-Z]{3}$/);
  assert.deepEqual(r, { week: 45, meters: 12350, species: 17 }, 'po 10 m, zaokrouhleno');
  assert.deepEqual(readWeekCode(c.toLowerCase()), r);
  const typo = (c[0] === '2' ? '3' : '2') + c.slice(1);
  assert.equal(readWeekCode(typo), null);
  assert.equal(readWeekCode('nesmysl'), null);
});

test('plánovač: průchozí bod se vloží do správného úseku, trasa do cíle, profil a čas chůze', async () => {
  const P = await import('../js/planner.js');
  const els = [], id = (r, c) => r * 10 + c + 1;
  for (let r = 0; r < 7; r++) for (let c = 0; c < 7; c++) els.push({ type: 'node', id: id(r, c), lat: 50 + r * 0.0009, lon: 14 + c * 0.0014 });
  for (let r = 0; r < 7; r++) els.push({ type: 'way', id: 1000 + r, tags: { highway: 'footway' }, nodes: [0, 1, 2, 3, 4, 5, 6].map(c => id(r, c)) });
  for (let c = 0; c < 7; c++) els.push({ type: 'way', id: 2000 + c, tags: { highway: 'footway' }, nodes: [0, 1, 2, 3, 4, 5, 6].map(r => id(r, c)) });
  const g = P.buildGraph({ elements: els });
  const L = P.loopThrough(g, [id(0, 0), id(0, 6), id(6, 6)]);
  assert.equal(L.cuts.length, 4, 'start + 3 úseky okruhu');
  assert.deepEqual(L.coords[0], L.coords.at(-1));
  // bod u úseku start → (0,6) se vloží za start
  const v = P.viaIndex(L, [50.0001, 14.0042]);
  assert.equal(v.at, 1); assert.ok(v.d < 20);
  const open = P.loopThrough(g, [id(0, 0), id(0, 6)], false);
  assert.equal(open.closed, false); assert.ok(Math.abs(open.len - P.dist([50, 14], [50, 14.0084])) < 1, 'do cíle bez návratu');
  assert.equal(P.loopThrough(g, [id(0, 0)]), null, 'jeden bod není trasa');
  // profil: rovnoměrné vzorky, stoupání a klesání bez šumu pod 3 m
  const pr = P.profile([[50, 14], [50, 14.01]], (la, lo) => 200 + (lo - 14) * 10000 + ((lo * 1e5) % 2), 10);
  assert.equal(pr.h.length, 11); assert.ok(pr.ready);
  assert.ok(pr.up >= 95 && pr.up <= 102, 'stoupání ~100 m: ' + pr.up); assert.equal(pr.down, 0);
  assert.equal(P.profile([[50, 14], [50, 14.01]], () => null, 4).ready, false);
  // čas: 4 km po rovině tempem 4 km/h = 60 min; s 300 m stoupání = 90 min (delší + polovina kratšího)
  assert.equal(P.walkMinutes(4000, 0, 0, 4), 60);
  assert.equal(P.walkMinutes(4000, 300, 0, 4), 90);
  assert.ok(P.walkMinutes(4000, 0, 0, 2.5) > 90, 'pomalejší tempo = delší čas');
  assert.equal(P.fmtMin(75), '1 h 15 min');
});

test('minihry: posouvačka jde vždy složit, tahy jen do prázdna, pexeso má dvojice, odměna má denní strop', async () => {
  const M = await import('../js/minigames.js');
  let seed = 7; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  for (const n of [3, 4, 5]) {
    const t = M.slideShuffle(n, rnd);
    assert.equal(new Set(t).size, n * n); assert.equal(M.solved(t), false);
    // parita: složitelné uspořádání (inverze + řádek prázdného)
    const flat = t.filter(v => v !== n * n - 1); let inv = 0;
    for (let i = 0; i < flat.length; i++) for (let j = i + 1; j < flat.length; j++) if (flat[i] > flat[j]) inv++;
    const blankRowFromBottom = n - Math.floor(t.indexOf(n * n - 1) / n);
    assert.ok(n % 2 ? inv % 2 === 0 : (inv + blankRowFromBottom) % 2 === 1, 'složitelné pro n=' + n);
  }
  const t = [0, 1, 2, 3, 4, 5, 6, 8, 7]; // prázdné na pozici 7
  assert.equal(M.slideMove(t, 3, 0), false, 'daleko od prázdného');
  assert.equal(M.slideMove(t, 3, 8), true); assert.equal(M.solved(t), true);
  assert.equal(M.solved(M.swapShuffle(9, rnd)), false);
  assert.ok(M.rotShuffle(16, rnd).filter(Boolean).length >= 8);
  const deck = M.pexesoDeck(['a', 'b', 'c', 'd', 'e'], 4, rnd);
  assert.equal(deck.length, 8); for (const x of new Set(deck)) assert.equal(deck.filter(y => y === x).length, 2);
  const cfg = { games: { dailyCones: 25, conesEasy: 5, conesMid: 10, conesHard: 20 } };
  assert.equal(M.gameReward({ day: 'x', cones: 0 }, cfg, 'hard', 'x'), 20);
  assert.equal(M.gameReward({ day: 'x', cones: 20 }, cfg, 'hard', 'x'), 5, 'jen do stropu');
  assert.equal(M.gameReward({ day: 'včera', cones: 25 }, cfg, 'mid', 'dnes'), 10, 'nový den = nový strop');
  assert.deepEqual(M.cleanGames({ best: { slide_easy: 12, 'x y': 3, swap_mid: -1 }, cones: 'a' }).best, { slide_easy: 12 });
});

test('biotopy: první se stahuje čtverec pod hráčem, po přesunu zase nejbližší k nové poloze', async () => {
  const cfg = clone(DEFAULTS); cfg.osm.overpassUrl = 'https://a.example/api'; osmSetConfig(cfg); try { await clearOsmCache(); } catch (e) {}
  const realFetch = globalThis.fetch, boxes = [];
  let release; const gate = new Promise(r => { release = r; });
  globalThis.fetch = async (url, o) => { const m = /\(([-\d.]+),([-\d.]+),([-\d.]+),([-\d.]+)\)/.exec(decodeURIComponent(o.body)); boxes.push(m.slice(1).map(Number)); await gate; return { ok: true, json: async () => ({ elements: [] }) }; };
  const inBox = (b, lat, lon) => lat >= b[0] && lat <= b[2] && lon >= b[1] && lon <= b[3];
  try {
    ensureArea(50.2355, 12.8755, 1200);
    await new Promise(r => setTimeout(r, 30));
    assert.ok(boxes.length >= 1 && inBox(boxes[0], 50.2355, 12.8755), 'první čtverec je ten pod hráčem');
    ensureArea(50.2455, 12.8955, 1200); // hráč popošel o ~1,7 km
    release(); await new Promise(r => setTimeout(r, 60));
    assert.ok(inBox(boxes[1], 50.2455, 12.8955), 'po přesunu jde na řadu čtverec pod novou polohou');
    assert.ok(boxes.length > 3, 'po prvním úspěchu se stahuje víc najednou');
  } finally { globalThis.fetch = realFetch; }
});

test('správa dat: přírůstky z průběžných součtů, nový start SW, historie po sekundách a dnešní součet', async () => {
  const D = await import('../js/datamon.js');
  const m = D.createMeter();
  D.ingest(m, { map: { bytes: 1000, req: 2, hit: 1, saved: 500 } });
  const d = D.ingest(m, { map: { bytes: 3000, req: 3, hit: 1, saved: 500 }, osm: { bytes: 200, req: 1, hit: 0, saved: 0 } });
  assert.equal(d.map.bytes, 2000); assert.equal(m.session.map.bytes, 3000);
  D.ingest(m, { map: { bytes: 400, req: 1, hit: 0, saved: 0 } }); // SW se uspal a počítá od nuly
  assert.equal(m.session.map.bytes, 3400, 'po novém startu SW se nic neztratí ani nezdvojí');
  assert.equal(D.tickMeter(m), 3600); assert.equal(D.tickMeter(m), 0);
  assert.equal(m.hist.length, 60); assert.equal(m.hist.at(-2), 3600); assert.equal(m.quiet, 1);
  let day = D.addDay(null, '2026-11-21', d); day = D.addDay(day, '2026-11-21', d);
  assert.equal(day.cats.map.bytes, 4000);
  assert.equal(D.addDay(day, '2026-11-22', d).cats.map.bytes, 2000, 'nový den od nuly');
  assert.equal(D.cleanDay({ day: 'x', cats: { map: { bytes: -5 }, zlo: { bytes: 1 } } }).cats.map.bytes, 0);
  assert.deepEqual(Object.keys(D.cleanDay({ day: 'x', cats: { zlo: {} } }).cats), []);
  assert.equal(D.fmtBytes(1536), '1,5 kB'); assert.equal(D.fmtBytes(5 * 1048576), '5,0 MB');
});

test('průběh po trase: vzdálenost od startu kolmým průmětem a odchylka od trasy; ikony mají náhradní emoji', async () => {
  const P = await import('../js/planner.js');
  const pts = [[50, 14], [50, 14.01], [50.01, 14.01]];
  const a = P.progressAlong(pts, [50.0001, 14.005]);
  assert.ok(Math.abs(a.along - P.dist([50, 14], [50, 14.005])) < 2, 'polovina prvního úseku');
  assert.ok(a.off > 5 && a.off < 20);
  const b = P.progressAlong(pts, [50.005, 14.0101]);
  assert.ok(b.along > P.dist([50, 14], [50, 14.01]), 'už na druhém úseku');
  assert.ok(Math.abs(a.total - P.pathLength(pts)) < 1e-6);
  const I = await import('../js/icons.js');
  assert.match(I.ic('map'), /class="ic ic-map"/); assert.match(I.ic('neznama'), /•/);
  I.ICON_FILES.add('atlas'); assert.match(I.ic('atlas'), /icons\/ui\/atlas\.svg/); I.ICON_FILES.delete('atlas');
});

test('úkoly podle místa, jízda autem a nové minihry', async () => {
  const T = await import('../js/tasks.js');
  assert.equal(T.placeKind({ at: 'park' }), 'park'); assert.equal(T.placeKind({ at: 'Kokořín', kind: 'Hrad nebo zámek' }), 'hrad');
  assert.equal(T.placeKind({ at: 'X', kind: 'Pramen' }), 'voda'); assert.equal(T.placeKind({ at: 'X', kind: 'Neznámé' }), null);
  const a = T.taskFor('park', 'f1', '2026-11-21'), b = T.taskFor('park', 'f1', '2026-11-21');
  assert.deepEqual(a, b, 'stejná otázka pro všechny'); assert.equal(new Set(a.a).size, 3); assert.ok(a.c >= 0 && a.c < 3);
  for (const list of Object.values(T.TASKS)) for (const q of list) assert.equal(q.a.length, 3);
  const { stepKind } = await import('../js/mapui.js');
  const gps = { maxSpeed: 8, vehicleSpeed: 3.3 };
  assert.equal(stepKind(10, 10, gps), 'walk'); assert.equal(stepKind(50, 10, gps), 'ride'); assert.equal(stepKind(200, 10, gps), 'jump');
  const M = await import('../js/minigames.js');
  const t = [0, 1, 2, 3, 4, 5, 6, 7, 8]; M.shiftLine(t, 3, true, 0, 1); assert.deepEqual(t.slice(0, 3), [2, 0, 1]); M.shiftLine(t, 3, true, 0, -1); assert.ok(M.solved(t));
  M.shiftLine(t, 3, false, 1, 1); assert.deepEqual([t[1], t[4], t[7]], [7, 1, 4]);
  assert.equal(M.solved(M.rowsShuffle(4)), false);
  const r = M.ringsShuffle(4); assert.equal(r.length, 4); assert.ok(r.some(Boolean));
  assert.ok(['who', 'rows', 'rings'].every(id => M.PUZZLES.some(p => p.id === id)));
});

test('závody: minihry jako závody se zvířetem, kód výsledku i pro nové hry, trénink zvedne vlastnost hry', async () => {
  const K = await import('../js/contests.js');
  assert.ok(['najdi', 'utek', 'hnizdo', 'rozhled', 'stopar', 'stado', 'vir'].every(id => K.GAMES.some(g => g.id === id && g.mini)));
  assert.deepEqual(K.GAMES.slice(0, 4).map(g => g.id), ['sprint', 'tah', 'schovka', 'rytmus'], 'staré hry zůstávají na svých místech (staré kódy platí)');
  const c = K.scoreCode('vir', 777, Date.UTC(2026, 10, 21)), r = K.readScoreCode(c);
  assert.equal(r.game, 'vir'); assert.equal(r.score, 777);
  assert.equal(K.miniSkill('who', 0, 5), 1); assert.equal(K.miniSkill('who', 0, 0), 0);
  assert.ok(K.miniSkill('pexeso', 9) > K.miniSkill('pexeso', 30), 'méně tahů = lepší');
  assert.ok(K.miniSkill('slide', 1) <= 1);
  const { trainStat } = await import('../js/economy.js');
  const cfg = { game: { trainPerDay: 2, trainXp: 10, trainGain: 3 } }, a = { stats: [50, 40, 30, 20], axp: 0 };
  assert.equal(trainStat(cfg, a, 1, 0.3, 'd'), 'weak'); assert.equal(a.stats[1], 40);
  assert.equal(trainStat(cfg, a, 1, 0.8, 'd'), 'ok'); assert.equal(a.stats[1], 43); assert.equal(a.axp, 10);
  trainStat(cfg, a, 1, 0.8, 'd'); assert.equal(trainStat(cfg, a, 1, 0.8, 'd'), 'limit', 'denní limit');
  assert.equal(trainStat(cfg, a, 1, 0.8, 'd2'), 'ok', 'další den znovu');
  const b = { stats: [99, 0, 0, 0], axp: 0 }; trainStat(cfg, b, 0, 1, 'x', 100); assert.equal(b.stats[0], 100, 'strop vlastnosti');
});


test('farma: prázdný start, lineární ceny, pomalá výroba se stropem, chůze, pěstování, stavba a automatika', async () => {
  const F = await import('../js/farm.js');
  const t0 = Date.UTC(2026, 10, 21, 8), f = F.newFarm(['voliera', 'vybeh'], 12, t0, 42);
  assert.ok(F.isEmpty(f), 'nová farma je prázdná'); assert.equal(f.seed, 42);
  assert.deepEqual([F.cost('enc_voliera', 0).wood, F.cost('enc_voliera', 1).wood, F.cost('enc_voliera', 9).wood], [15, 30, 150], 'lineární cena');
  assert.deepEqual([F.buildMinutes(0), F.buildMinutes(4)], [5, 25], 'lineární doba');
  f.lv.lumber = 1; f.lv.field = 1; f.res.seeds = 10; const inv = {};
  F.advance(f, t0 + 2 * 3600000, inv); assert.ok(Math.abs(f.res.wood - 42) < 1e-9, 'dřevník 1/h');
  for (let i = 1; i <= 3; i++) F.advance(f, t0 + (2 + 72 * i) * 3600000, inv);
  assert.equal(f.res.wood, F.storeCap(f), 'strop skladu'); assert.ok(inv.krmivo > 0 && inv.krmivo <= 10, 'pole spotřebuje semínka');
  const w = F.newFarm([], 5, t0), b0 = w.res.wood; F.walkGain(w, 250, 'les'); assert.equal(w.res.wood - b0, 4);
  assert.equal(F.autoPick({ ...f, auto: true, build: null }, ['store', 'lumber']), null, 'automatika jen u postavených s místem');
  f.pos.lumber = [2, 0]; assert.equal(F.autoPick({ ...f, auto: true, build: null, res: { wood: 999, stone: 999, seeds: 0 } }, ['store', 'lumber']), 'lumber');
  const c = F.cleanFarm({ lv: { zlo: 5, store: 99 }, res: { wood: -3 }, seed: 7, guests: { voliera: ['kos', 5] }, deeds: { budka: 9 } }, ['voliera']);
  assert.equal(c.lv.store, 10); assert.equal(c.seed, 7); assert.deepEqual(c.guests.voliera, ['kos', '5']); assert.equal(c.deeds.budka, 9);
});


test('3D farma: svět ze seedu (hory, řeka, železnice), nepravidelná farma mezi překážkami, políčka, cesty, bonus okolí, stavění a přesun', async () => {
  const D = await import('../js/farm3d.js'), F = await import('../js/farm.js');
  const W = D.genWorld(123), W2 = D.genWorld(123), W3 = D.genWorld(124);
  assert.equal(W.cells.size, D.REGION_SIZE, 'farma má daný počet políček');
  assert.deepEqual([...W.cells.keys()], [...W2.cells.keys()], 'stejný seed = stejná farma');
  assert.notDeepEqual([...W.cells.keys()].sort(), [...W3.cells.keys()].sort(), 'jiný seed = jiný tvar');
  assert.equal(W.cells.get('0,0').t, 'yard');
  for (const c of W.cells.values()) { const x = Math.sqrt(3) * (c.q + c.r / 2), z = 1.5 * c.r; let m = Infinity; for (let i = 1; i < W.river.length; i++) { const [ax, az] = W.river[i - 1]; m = Math.min(m, Math.hypot(x - ax, z - az)); } assert.ok(m > 0.8 || (!c.q && !c.r), 'farma neleží na řece'); }
  const ring = [...W.cells.values()].map(c => D.hexDist(c.q, c.r)); assert.ok(Math.max(...ring) >= 3, 'tvar není jen kruh kolem statku');
  assert.ok(W.peaks.some(p => p.h > 1), 'kopce'); assert.ok(Math.max(...W.peaks.map(p => p.h)) < 3.6, 'pahorkatina bez velehor');
  for (const b of Object.keys(D.BIOMES)) assert.equal(D.genWorld(W.seed, [], b).cells.size, D.REGION_SIZE, 'farma v každé krajině: ' + b);
  assert.ok([1, 2, 3].some(k => D.genWorld(k * 71, [], 'hory').peaks.some(p => p.h > 4)), 'hory mají vysoké štíty');
  { const X = D.genWorld(213, [], 'pahorkatina'), c = X.crossings[0], rd = X.roads[c.road]; let bi = 0; rd.forEach((p, i) => { if (Math.hypot(p[0] - c.x, p[1] - c.z) < Math.hypot(rd[bi][0] - c.x, rd[bi][1] - c.z)) bi = i; }); const dx = rd[bi + 1][0] - rd[bi - 1][0], dz = rd[bi + 1][1] - rd[bi - 1][1]; assert.ok(Math.abs(dx * Math.sin(c.a) + dz * Math.cos(c.a)) / Math.hypot(dx, dz) < 0.05, 'přejezd kolmo'); assert.ok(Math.abs(X.roadProf[c.road][bi] - c.y) < 0.02, 'přejezd ve výšce kolejí');
    for (const [bx, bz, a] of X.bridges) for (const r2 of X.roads.filter(r3 => r3.some(p => Math.hypot(p[0] - bx, p[1] - bz) < 0.05))) for (const p of r2.filter(p => Math.hypot(p[0] - bx, p[1] - bz) < 1.7)) assert.ok(Math.abs((p[0] - bx) * Math.cos(a) - (p[1] - bz) * Math.sin(a)) < 0.02, 'cesta na most tečně'); }
  for (const sd of [5, 213, 781, 1207]) { // výšky a sklony komunikací
    const V = D.genWorld(sd), lineD = (pl, x, z) => Math.min(...pl.slice(1).map((b, i) => { const a2 = pl[i], dx = b[0] - a2[0], dz = b[1] - a2[1], t = Math.max(0, Math.min(1, ((x - a2[0]) * dx + (z - a2[1]) * dz) / (dx * dx + dz * dz || 1))); return Math.hypot(x - a2[0] - dx * t, z - a2[1] - dz * t); }));
    const slope = (pts, P) => Math.max(0, ...pts.slice(1).map((q, i) => { const l = Math.hypot(q[0] - pts[i][0], q[1] - pts[i][1]); return l > 0.05 ? Math.abs(P[i + 1] - P[i]) / l : 0; }));
    assert.ok(slope(V.rail, V.railProf) <= 0.052, 'sklon trati');
    V.roads.forEach((rd, k) => { const P = V.roadProf[k]; assert.ok(slope(rd, P) <= 0.16, 'sklon cesty'); assert.ok(Math.abs(P[0] - 0.14) < 1e-9, 'cesta na hex ve výšce políčka'); assert.ok(lineD(V.river, ...rd[0]) >= 4.5, 'most ne hned u farmy');
      for (const [bx, bz] of V.bridges) rd.forEach((q, i) => { if (Math.hypot(q[0] - bx, q[1] - bz) < 1.6) assert.ok(Math.abs(P[i] - 0.6) < 1e-9, 'cesta ve výšce mostovky'); }); });
    for (const c of V.cells.values()) if (c.q || c.r) assert.ok(lineD(V.river, Math.sqrt(3) * (c.q + c.r / 2), 1.5 * c.r) >= 2.6, 'farma dál od řeky');
  }
  for (const sd of [3, 71, 142, 999]) { const V = D.genWorld(sd); assert.ok(V.station && V.station.d <= 2.6, 'nádraží u farmy'); assert.ok(V.villages.length >= 1 && V.villages[0].houses.length >= 3, 'vesnice'); const e = p => Math.max(Math.abs(p[0]), Math.abs(p[1])); assert.ok(V.roads.every(r => e(r[r.length - 1]) > 27.8) && e(V.rail[0]) > 27.8 && e(V.rail[V.rail.length - 1]) > 27.8, 'cesty a trať až na okraj mapy'); assert.ok(V.Hn(V.rail[40][0], V.rail[40][1]) !== undefined); } assert.ok(W.rail.length > 60 && W.railProf.length === W.rail.length, 'železnice s niveletou');
  assert.ok(W.H(30, 30) !== undefined && W.H(0, 0) === 0, 'farma je rovná');
  const W4 = D.genWorld(123, [[9, 0]]); assert.ok(W4.cells.has('9,0'), 'budova zůstane na farmě i po nové krajině');
  for (const [q, r] of [[0, 0], [2, -1], [-3, 2], [1, 3]]) { const x = Math.sqrt(3) * (q + r / 2), z = 1.5 * r; assert.deepEqual(D.hexAt(x + 0.2, z - 0.2), [q, r]); }
  assert.equal(D.edgeKey([1, 0], [0, 0]), D.edgeKey([0, 0], [1, 0]), 'sdílená hrana má jeden klíč');
  const f = F.newFarm([], 5, 0, 123); f.res.wood = 999; f.res.stone = 999; f.res.seeds = 999;
  const valid = D.validTiles(W, new Set()); assert.ok(valid.length >= D.REGION_SIZE - 2);
  assert.ok(F.placeBuilding(f, 'lumber', 0, 0, W, 0).err, 'na statek ne');
  const [a, b, c] = valid;
  assert.ok(!F.placeBuilding(f, 'lumber', a[0], a[1], W, 0).err); F.advance(f, f.build.until + 1, {});
  assert.ok(!F.placeBuilding(f, 'quarry', b[0], b[1], W, 0).err); F.advance(f, f.build.until + 1, {});
  assert.equal(F.moveBuilding(f, 'lumber', b[0], b[1], W, 0, 1000).swapped, 'quarry');
  assert.match(F.moveBuilding(f, 'quarry', c[0], c[1], W, 30, 2000).err, /za 30 dní/);
  // políčka a bonus okolí: les vedle dřevníku = +10 %
  const nb = D.neighbors(...f.pos.lumber).find(([q, r]) => W.cells.has(q + ',' + r) && (q || r) && !Object.values(f.pos).some(p => p[0] === q && p[1] === r));
  if (D.tileType(W, f.tiles, ...nb) === 'forest') F.setTile(f, W, ...nb, 'meadow');
  const before = F.farmBonus(f, W).lumber; assert.ok(!F.setTile(f, W, ...nb, 'forest').err);
  assert.ok(Math.abs(F.farmBonus(f, W).lumber - before - 0.1) < 1e-9, 'les vedle dřevníku přidá 10 %');
  assert.ok(F.setTile(f, W, ...f.pos.lumber, 'pond').err, 'pod budovou ne'); assert.ok(F.setTile(f, W, 0, 0, 'field').err, 'statek ne');
  const k = D.edgeKey(a, b); assert.equal(F.toggleRoad(f, k), true); assert.equal(F.toggleRoad(f, k), false); assert.equal(f.roads.length, 0);
  const inv = {}; const g = F.newFarm([], 5, 0, 1); g.lv.lumber = 1; F.advance(g, 3600000, inv, { lumber: 1.5 }); assert.ok(Math.abs(g.res.wood - 41.5) < 1e-9, 'bonus násobí výrobu');
  assert.deepEqual(F.cleanFarm({ lv: {}, tiles: { '1,0': 'field', '2,0': 'lava', x: 'field' }, roads: ['0,0|1,0', 'zlo'] }, []).tiles, { '1,0': 'field' });
  const pos = D.autoPlace(W, {}, ['store', 'pantry']); assert.ok(pos.store && pos.pantry && pos.store.join() !== pos.pantry.join());
});

test('krajina farmy: železnice má plynulý sklon, mosty jsou kolmo k řece, cesty začínají na hraně farmy', async () => {
  const D = await import('../js/farm3d.js');
  let bridges = 0;
  for (const seed of [3, 17, 58, 99, 123, 777]) {
    const W = D.genWorld(seed);
    for (let i = 1; i < W.rail.length; i++) { const l = Math.hypot(W.rail[i][0] - W.rail[i - 1][0], W.rail[i][1] - W.rail[i - 1][1]); assert.ok(Math.abs(W.railProf[i] - W.railProf[i - 1]) / Math.max(l, 0.05) < 0.9, 'bez skoků v niveletě'); }
    for (const [x, z, a] of W.bridges) {
      bridges++;
      let best = null, bd = Infinity; for (let i = 1; i < W.river.length; i++) { const [ax, az] = W.river[i - 1], [bx, bz] = W.river[i], d = Math.hypot((ax + bx) / 2 - x, (az + bz) / 2 - z); if (d < bd) { bd = d; best = [bx - ax, bz - az]; } }
      const dir = [Math.sin(a), Math.cos(a)], cos = Math.abs(dir[0] * best[0] + dir[1] * best[1]) / Math.hypot(...best);
      assert.ok(cos < 0.35, 'most téměř kolmo k řece');
    }
    for (const rd of W.roads) { const [x, z] = rd[0], [q, r] = D.hexAt(x, z); const inside = W.cells.has(q + ',' + r); const out = D.hexAt(x + (rd[1][0] - x) * 4, z + (rd[1][1] - z) * 4); assert.ok(inside || W.cells.has(out.join()) === false, 'cesta vychází z okraje farmy'); }
  }
  assert.ok(bridges > 0, 'aspoň někde most');
});

test('farma: ozdoby jen pro vzhled – stojí suroviny, zaberou políčko, jdou odstranit', async () => {
  const D = await import('../js/farm3d.js'), F = await import('../js/farm.js');
  const W = D.genWorld(123), f = F.newFarm([], 5, 0, 123); f.res.wood = 50; f.res.stone = 50;
  const [a, b] = D.validTiles(W, new Set());
  assert.ok(!F.placeDecor(f, W, a[0], a[1], 'barn').err); assert.equal(f.decor[a.join()], 'barn'); assert.equal(f.res.wood, 44);
  assert.ok(F.placeDecor(f, W, a[0], a[1], 'well').err, 'jedna věc na políčko');
  assert.ok(F.placeBuilding(f, 'lumber', a[0], a[1], W, 0).err, 'budova ne na ozdobu');
  assert.ok(F.setTile(f, W, a[0], a[1], 'field').err, 'pod ozdobou se políčko nemění');
  assert.ok(F.placeDecor(f, W, 0, 0, 'well').err, 'statek ne'); assert.ok(F.placeDecor(f, W, b[0], b[1], 'raketa').err);
  F.removeDecor(f, ...a); assert.equal(f.decor[a.join()], undefined);
  assert.deepEqual(F.cleanFarm({ lv: {}, decor: { '1,0': 'mill', '2,0': 'zlo' } }, []).decor, { '1,0': 'mill' });
});

test('Farma: úkoly s odměnou (jednou) a nádraží s denním vlakem', async () => {
  const F = await import('../js/farm.js');
  const f = F.cleanFarm(F.newFarm(['a', 'b']), ['a', 'b']);
  assert.equal(F.claimTask(f, 'decor2'), null, 'nesplněný úkol nic nedá');
  f.decor = { '1,0': 'bench', '2,0': 'well' }; const w0 = f.res.wood;
  assert.deepEqual(F.claimTask(f, 'decor2'), { cones: 5 }); assert.equal(F.claimTask(f, 'decor2'), null, 'podruhé nic');
  f.lv.enc_a = 3; assert.ok(F.claimTask(f, 'lv3')); assert.equal(f.res.wood, w0 + 20, 'suroviny přičteny');
  assert.equal(F.trainDelivery(f, '2026-11-21'), 0, 'bez železnice vlak nejezdí');
  assert.ok(F.buyRail(f, 10).err, 'málo surovin'); f.res.wood = 130; f.res.stone = 90; const r1 = F.rates(f).wood;
  assert.deepEqual(F.buyRail(f, 60), { cones: 50 }); assert.equal(f.res.wood, 10); assert.ok(F.buyRail(f, 60).err, 'podruhé ne');
  f.lv.lumber = 1; assert.ok(F.rates(f).wood > 0); assert.equal(F.rates(f).wood, 2 * F.rates({ ...f, rail: false }).wood, 'suroviny ×2'); assert.ok(F.claimTask(f, 'station'));
  assert.equal(F.trainDelivery(f, '2026-11-21'), 3); assert.equal(F.trainDelivery(f, '2026-11-21'), 0, 'jednou denně');
  const g = F.cleanFarm(JSON.parse(JSON.stringify(f)), ['a', 'b']); assert.ok(g.tasks.decor2 && g.trainDay === '2026-11-21' && g.rail === true, 'přežije uložení');
  assert.deepEqual(F.cleanFarm({ ...f, tasks: { hack: 1 } }, ['a', 'b']).tasks, {}, 'neznámé úkoly pryč');
});
