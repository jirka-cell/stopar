// Vzhled vektorové mapy (MapLibre): palety stylů a volitelné vrstvy.
// Čistá funkce bez závislosti na MapLibre, aby šla testovat v Node.

export const STYLES = {
  hra: { name: 'Herní den',
    bg: '#a8e09a', wood: '#7fcf7a', grass: '#b6eaa0', farm: '#c9ec9c', wet: '#9fd8c0', water: '#5ccbe6', waterLine: '#5ccbe6', rock: '#c9cfc0', sand: '#efe6b8',
    res: '#b9e3a8', ind: '#c6dcb8', park: '#8fdc86', bld: '#cfe8c4', bldLine: '#b4d6a8', road: '#f4fff0', roadCase: '#8cc79a', minor: '#e8fbe2', path: '#e6f5c8', rail: '#9bb8a0',
    label: '#3b6b4a', halo: '#e9ffe2', shade: '#2f5a3a', game: '#2f7d4f' },
  noc: { name: 'Herní noc',
    bg: '#2c3a63', wood: '#25456a', grass: '#33507a', farm: '#3a4f78', wet: '#2f557a', water: '#1d6fa0', waterLine: '#2a86bd', rock: '#45507a', sand: '#4a5478',
    res: '#36456f', ind: '#3a4572', park: '#2f5a74', bld: '#46547f', bldLine: '#56669a', road: '#8fb6ff', roadCase: '#20294a', minor: '#6f8fd6', path: '#5f78b8', rail: '#6c7aa8',
    label: '#d8e4ff', halo: '#1c2546', shade: '#0d1430', game: '#9fe0b4' },
  papir: { name: 'Papír a akvarel',
    bg: '#f2e8d2', wood: '#b9cf9a', grass: '#dfe3b4', farm: '#ece0b0', wet: '#c9dccb', water: '#a9cfd6', waterLine: '#8fbcc6', rock: '#ddd2bd', sand: '#efe2bf',
    res: '#eadfc8', ind: '#e5d6bf', park: '#c9d8a4', bld: '#e0cfb2', bldLine: '#c7b291', road: '#fbf6ea', roadCase: '#cbb48f', minor: '#f7efdc', path: '#b98d5c', rail: '#a8957a',
    label: '#6a5136', halo: '#f7efdc', shade: '#6a5136', game: '#7a5a2f' },
  // noční papír: tmavý sépiový podklad, světlé tahy jako bílá tužka
  papirnoc: { name: 'Papír a akvarel – noc',
    bg: '#2b2620', wood: '#3a4230', grass: '#353a2a', farm: '#3c3828', wet: '#2f3c36', water: '#2e4a55', waterLine: '#4f7380', rock: '#45403a', sand: '#463e2e',
    res: '#38322a', ind: '#3a332b', park: '#3a4630', bld: '#4a4236', bldLine: '#6a5e4c', road: '#a89a80', roadCase: '#1e1a15', minor: '#7a6e5a', path: '#b08a5a', rail: '#7a6e5a',
    label: '#e8dcc4', halo: '#2b2620', shade: '#e8dcc4', game: '#d9b878' },
  // pohádková mapa: plochy jsou akvarelové textury (images/mapa/tex_*.webp), barvy jen pro čáry a popisky
  pohadka: { name: 'Pohádka',
    bg: '#f2e8d2', wood: '#9fbf7f', grass: '#cfe0a0', farm: '#e8d398', wet: '#b6d0b0', water: '#8fc4c4', waterLine: '#6fb0b8', rock: '#cfc4ad', sand: '#ead8a8',
    res: '#e6d2b4', ind: '#ddcbb0', park: '#b8d58f', bld: '#d9c09a', bldLine: '#b89a70', road: '#fbf3e0', roadCase: '#c4a67a', minor: '#f4e8cc', path: '#a8784a', rail: '#9a8468',
    label: '#5e4326', halo: '#f7eedb', shade: '#6a5136', game: '#7a5a2f',
    tex: { bg: 'tex_papir', wood: 'tex_les', grass: 'tex_louka', farm: 'tex_pole', wet: 'tex_mokrad', water: 'tex_voda', rock: 'tex_skaly', sand: 'tex_pisek', res: 'tex_mesto', park: 'tex_park' } },
  // pohádkový soumrak: stejné textury přitlumené do teplého fialovohnědého večera (ne černá noc)
  pohadkanoc: { name: 'Pohádka – soumrak',
    bg: '#4a3a4a', wood: '#4f5a44', grass: '#5c5e48', farm: '#6a5c44', wet: '#4c5a54', water: '#3f5a68', waterLine: '#6f8fa0', rock: '#5e5650', sand: '#6a5e4c',
    res: '#5a4a48', ind: '#564844', park: '#55603f', bld: '#6a5a50', bldLine: '#8a7864', road: '#c8b490', roadCase: '#3a2e34', minor: '#9a8a70', path: '#d0a070', rail: '#8a7a68',
    label: '#f4e6cc', halo: '#3a2e38', shade: '#f0dcc0', game: '#f0c878',
    tex: { wood: 'tex_les', grass: 'tex_louka', farm: 'tex_pole', wet: 'tex_mokrad', water: 'tex_voda', rock: 'tex_skaly', sand: 'tex_pisek', res: 'tex_mesto', park: 'tex_park' }, texOpacity: .45 }
};
// Textury pohádkových stylů (názvy obrázků v mapě = soubory v images/mapa/)
export const TEXTURES = ['tex_papir', 'tex_les', 'tex_louka', 'tex_pole', 'tex_mokrad', 'tex_voda', 'tex_skaly', 'tex_pisek', 'tex_mesto', 'tex_park'];

// Který styl použít: výchozí Pohádka (den/soumrak podle slunce), na výběr Papír a akvarel
export function styleIdFor(choice, night) {
  if (choice === 'papir' || choice === 'papirnoc') return night ? 'papirnoc' : 'papir';
  if (choice && !['auto', 'pohadka', 'pohadkanoc'].includes(choice) && STYLES[choice]) return choice;
  return night ? 'pohadkanoc' : 'pohadka';
}

// Vrstevnice: interval podle přiblížení [menší, hlavní s popiskem] v metrech
export const CONTOUR_THRESHOLDS = { 11: [200, 1000], 12: [100, 500], 13: [50, 250], 14: [20, 100], 15: [10, 50], 16: [5, 25] };

export const TRAILS = [['trHiking', 'hiking'], ['trCycling', 'cycling'], ['trMtb', 'mtb'], ['trSkating', 'skating'], ['trRiding', 'riding'], ['trSlopes', 'slopes']];

const POI = [
  ['poiShop', ['shop', 'grocery', 'clothing_store', 'bakery', 'butcher', 'hardware', 'furniture', 'jewelry', 'books', 'mobile_phone', 'convenience', 'supermarket'], '#e07a3f'],
  ['poiFood', ['restaurant', 'cafe', 'fast_food', 'bar', 'beer', 'pub', 'ice_cream'], '#d14b6b'],
  ['poiTransport', ['bus', 'railway', 'tram', 'ferry_terminal', 'fuel'], '#3a7bd5'],
  ['poiEdu', ['school', 'college', 'library', 'kindergarten', 'university'], '#7a5cc7'],
  ['poiHealth', ['hospital', 'doctors', 'pharmacy', 'dentist', 'veterinary'], '#d33b3b'],
  ['poiTourism', ['attraction', 'museum', 'information', 'castle', 'monument', 'theatre', 'cinema', 'viewpoint', 'zoo', 'place_of_worship'], '#2a8f86'],
  ['poiParking', ['parking', 'bicycle_parking'], '#5c7cfa']
];

const FONT = ['Noto Sans Regular'], FONT_B = ['Noto Sans Bold'], FONT_I = ['Noto Sans Italic'];
const EMPTY = { type: 'FeatureCollection', features: [] };

/**
 * @param {string} id      klíč ze STYLES
 * @param {object} o       vrstvy (cfg.layers)
 * @param {object} ctx     { vectorUrl, glyphsUrl, demUrl, contourUrl, trailsUrl, attribution, biotopes, game: {catch, range, acc, bio} }
 */
export function makeStyle(id, o, ctx) {
  const p = STYLES[id] || STYLES.hra;
  const L = [], add = l => L.push(l), vis = on => ({ visibility: on ? 'visible' : 'none' });
  const cls = list => ['in', ['get', 'class'], ['literal', list]];
  const txt = (extra = {}) => ({ 'text-color': p.label, 'text-halo-color': p.halo, 'text-halo-width': 1.6, ...extra });
  const g = ctx.game || {};

  // výplň plochy: textura (pohádkové styly) nebo barva
  const T = p.tex || {}, fill = k => T[k] ? { 'fill-pattern': T[k], 'fill-opacity': p.texOpacity ?? 1 } : { 'fill-color': p[k] };
  add({ id: 'bg', type: 'background', paint: T.bg ? { 'background-pattern': T.bg } : { 'background-color': p.bg } });
  add({ id: 'landuse-res', type: 'fill', source: 'om', 'source-layer': 'landuse', filter: cls(['residential', 'suburb', 'neighbourhood', 'commercial', 'retail']), paint: fill('res') });
  add({ id: 'landuse-ind', type: 'fill', source: 'om', 'source-layer': 'landuse', filter: cls(['industrial', 'railway', 'garages']), paint: { 'fill-color': p.ind } });
  [['farmland', 'farm'], ['grass', 'grass'], ['wetland', 'wet'], ['wood', 'wood']].forEach(([c, k]) =>
    add({ id: 'lc-' + c, type: 'fill', source: 'om', 'source-layer': 'landcover', filter: ['==', ['get', 'class'], c], paint: fill(k) }));
  add({ id: 'lc-rock', type: 'fill', source: 'om', 'source-layer': 'landcover', filter: cls(['rock', 'sand']), layout: vis(o.landDetail),
    paint: T.rock ? { 'fill-pattern': ['match', ['get', 'class'], 'rock', T.rock, T.sand], 'fill-opacity': p.texOpacity ?? 1 } : { 'fill-color': ['match', ['get', 'class'], 'rock', p.rock, p.sand] } });
  add({ id: 'park', type: 'fill', source: 'om', 'source-layer': 'park', filter: ['!', cls(['national_park', 'nature_reserve', 'protected_area'])], paint: fill('park') });
  add({ id: 'landuse-green', type: 'fill', source: 'om', 'source-layer': 'landuse', filter: cls(['cemetery', 'pitch', 'stadium', 'playground']), paint: fill('park') });
  if (o.hillshade && ctx.demUrl) add({ id: 'hillshade', type: 'hillshade', source: 'dem', paint: { 'hillshade-shadow-color': p.shade, 'hillshade-exaggeration': .35, 'hillshade-highlight-color': '#ffffff' } });
  if (ctx.contourUrl) add({ id: 'contour', type: 'line', source: 'contours', 'source-layer': 'contours', layout: vis(o.contours), paint: { 'line-color': p.shade, 'line-opacity': .35, 'line-width': ['match', ['get', 'level'], 1, 1.2, .6] } });
  if (T.water && p.texOpacity) add({ id: 'water-base', type: 'fill', source: 'om', 'source-layer': 'water', paint: { 'fill-color': p.water } }); // pod přitlumenou texturou
  add({ id: 'water', type: 'fill', source: 'om', 'source-layer': 'water', paint: fill('water') });
  add({ id: 'waterway', type: 'line', source: 'om', 'source-layer': 'waterway', paint: { 'line-color': p.waterLine, 'line-width': ['interpolate', ['linear'], ['zoom'], 13, 1, 18, 6] } });

  // Herní obarvení ploch podle biotopů (přibližně z vektorové mapy, barvy z adminu)
  const bio = Object.fromEntries((ctx.biotopes || []).map(b => [b.id, b.color]));
  const bc = (k, d) => bio[k] || d;
  add({ id: 'bio-land', type: 'fill', source: 'om', 'source-layer': 'landcover', filter: cls(['wood', 'grass', 'farmland', 'wetland', 'rock', 'sand']), layout: vis(o.biotopes),
    paint: { 'fill-color': ['match', ['get', 'class'], 'wood', bc('les', '#6fa36b'), 'wetland', bc('mokrad', bc('voda', '#6bb6e0')), 'farmland', bc('pole', bc('louka', '#c8dc8a')),
      ['rock', 'sand'], bc('skaly', '#b5b0a5'), bc('louka', '#c8dc8a')], 'fill-opacity': .55 } });
  add({ id: 'bio-use', type: 'fill', source: 'om', 'source-layer': 'landuse', filter: cls(['residential', 'commercial', 'retail', 'industrial', 'cemetery', 'quarry', 'farmyard', 'orchard', 'vineyard', 'allotments']), layout: vis(o.biotopes),
    paint: { 'fill-color': ['match', ['get', 'class'], 'cemetery', bc('park', '#9fd08a'), 'quarry', bc('skaly', '#b5b0a5'), 'farmyard', bc('vesnice', '#e2cfa8'),
      ['orchard', 'vineyard', 'allotments'], bc('sad', '#b9d36b'), bc('mesto', '#cfc8bd')], 'fill-opacity': .55 } });
  add({ id: 'bio-park', type: 'fill', source: 'om', 'source-layer': 'park', layout: vis(o.biotopes), paint: { 'fill-color': bc('park', '#9fd08a'), 'fill-opacity': .55 } });
  add({ id: 'protected', type: 'line', source: 'om', 'source-layer': 'park', filter: cls(['national_park', 'nature_reserve', 'protected_area']), layout: vis(o.protected), paint: { 'line-color': '#2e7d32', 'line-width': 2.5, 'line-dasharray': [3, 2], 'line-opacity': .8 } });

  // Ladicí vrstva biotopů tak, jak je hra skutečně čte z Overpass
  add({ id: 'biodebug-fill', type: 'fill', source: 'biodebug', filter: ['==', ['geometry-type'], 'Polygon'], paint: { 'fill-color': ['get', 'color'], 'fill-opacity': .35, 'fill-outline-color': ['get', 'color'] } });
  add({ id: 'biodebug-line', type: 'line', source: 'biodebug', filter: ['==', ['geometry-type'], 'LineString'], paint: { 'line-color': ['get', 'color'], 'line-width': 4, 'line-opacity': .8 } });

  const bld = p.tex && o.buildings === '3d' ? 'flat' : o.buildings; // pohádka: budovy naplocho, 3D kvádry kazí kreslený vzhled
  if (bld === 'flat') add({ id: 'building', type: 'fill', source: 'om', 'source-layer': 'building', minzoom: 14, paint: { 'fill-color': p.bld, 'fill-outline-color': p.bldLine, 'fill-opacity': p.tex ? .6 : 1 } }); // v pohádce prosvítá textura zástavby
  add({ id: 'path', type: 'line', source: 'om', 'source-layer': 'transportation', filter: cls(['path', 'track']), layout: vis(o.paths), paint: { 'line-color': p.path, 'line-width': ['interpolate', ['linear'], ['zoom'], 14, .8, 18, 3], 'line-dasharray': [2, 1.5] } });
  const minor = cls(['minor', 'service']), major = cls(['motorway', 'trunk', 'primary', 'secondary', 'tertiary']);
  const w = k => ['interpolate', ['exponential', 1.6], ['zoom'], 12, .6 * k, 18, 14 * k];
  const road = (rid, f, col, k) => add({ id: rid, type: 'line', source: 'om', 'source-layer': 'transportation', filter: f, layout: { 'line-cap': 'round', 'line-join': 'round' }, paint: { 'line-color': col, 'line-width': w(k) } });
  road('road-minor-case', minor, p.roadCase, 1.25); road('road-major-case', major, p.roadCase, 1.75);
  road('road-minor', minor, p.minor, 1); road('road-major', major, p.road, 1.45);
  add({ id: 'rail', type: 'line', source: 'om', 'source-layer': 'transportation', filter: ['==', ['get', 'class'], 'rail'], layout: vis(o.rail), paint: { 'line-color': p.rail, 'line-width': 1.5, 'line-dasharray': [3, 2] } });
  if (bld === '3d') add({ id: 'building-3d', type: 'fill-extrusion', source: 'om', 'source-layer': 'building', minzoom: 15, paint: { 'fill-extrusion-color': p.bld, 'fill-extrusion-height': ['coalesce', ['get', 'render_height'], 8], 'fill-extrusion-base': ['coalesce', ['get', 'render_min_height'], 0], 'fill-extrusion-opacity': .85 } });
  // obrázkové dlaždice tras (cyklo…) jen jemně, ať nepřebíjí mapu
  if (ctx.trailsUrl) TRAILS.forEach(([k, t]) => { if (o[k] && t !== 'hiking') add({ id: 'tr-' + t, type: 'raster', source: 'tr-' + t, minzoom: 13, paint: { 'raster-opacity': .5 } }); });
  // turistické trasy KČT: bílý okraj a barevný střed jako na značce, naučné stezky čárkovaně
  add({ id: 'walk-casing', type: 'line', source: 'walk', layout: { 'line-cap': 'round', 'line-join': 'round' }, paint: { 'line-color': '#ffffff', 'line-width': 9, 'line-opacity': .9 } });
  add({ id: 'walk-line', type: 'line', source: 'walk', layout: { 'line-cap': 'round', 'line-join': 'round' }, paint: { 'line-color': '#e2602a', 'line-width': 5 } });
  add({ id: 'plan-line', type: 'line', source: 'plan', layout: { 'line-cap': 'round', 'line-join': 'round' }, paint: { 'line-color': ['get', 'color'], 'line-width': ['case', ['==', ['get', 'sel'], 1], 6, 3], 'line-opacity': ['case', ['==', ['get', 'sel'], 1], 1, .55] } });
  add({ id: 'kct-casing', type: 'line', source: 'kct', layout: { ...vis(o.trHiking), 'line-cap': 'round', 'line-join': 'round' }, paint: { 'line-color': '#ffffff', 'line-width': ['interpolate', ['linear'], ['zoom'], 11, 1.5, 16, 4.5], 'line-opacity': .55 } });
  // line-dasharray nesmí záviset na datech → naučné stezky jako samostatná vrstva
  const kw = ['interpolate', ['linear'], ['zoom'], 11, 0.8, 16, 2.2]; // tence a poloprůhledně jako na turistické mapě
  add({ id: 'kct-line', type: 'line', source: 'kct', filter: ['!=', ['get', 'edu'], 1], layout: { ...vis(o.trHiking), 'line-cap': 'round', 'line-join': 'round' }, paint: { 'line-color': ['get', 'color'], 'line-width': kw, 'line-opacity': .8 } });
  add({ id: 'kct-edu', type: 'line', source: 'kct', filter: ['==', ['get', 'edu'], 1], layout: vis(o.trHiking), paint: { 'line-color': ['get', 'color'], 'line-width': kw, 'line-opacity': .8, 'line-dasharray': [2, 1.5] } });
  add({ id: 'kct-label', type: 'symbol', source: 'kct', minzoom: 15.5, layout: { ...vis(o.trHiking), 'symbol-placement': 'line', 'text-field': ['get', 'name'], 'text-font': ['Noto Sans Regular'], 'text-size': 11 }, paint: txt({ 'text-color': ['get', 'color'] }) });

  // Herní kruhy: dosah objevování, přesnost GPS, dosah chytání
  add({ id: 'range', type: 'fill', source: 'range', paint: { 'fill-color': p.game, 'fill-opacity': .03 } });
  add({ id: 'range-line', type: 'line', source: 'range', paint: { 'line-color': p.game, 'line-width': 1, 'line-opacity': .3 } });
  add({ id: 'acc', type: 'fill', source: 'acc', paint: { 'fill-color': '#3a7bd5', 'fill-opacity': .1 } });
  add({ id: 'catch', type: 'fill', source: 'catch', paint: { 'fill-color': p.game, 'fill-opacity': .06 } });
  add({ id: 'catch-line', type: 'line', source: 'catch', paint: { 'line-color': p.game, 'line-width': 2, 'line-dasharray': [3, 3] } });

  if (ctx.contourUrl) add({ id: 'contour-label', type: 'symbol', source: 'contours', 'source-layer': 'contours', filter: ['>', ['get', 'level'], 0], layout: { ...vis(o.contours), 'symbol-placement': 'line', 'text-field': ['concat', ['number-format', ['get', 'ele'], {}], ' m'], 'text-font': FONT, 'text-size': 10 }, paint: txt({ 'text-color': p.shade }) });
  add({ id: 'water-name', type: 'symbol', source: 'om', 'source-layer': 'water_name', layout: { ...vis(o.waterNames), 'text-field': ['get', 'name'], 'text-font': FONT_I, 'text-size': 12 }, paint: txt() });
  add({ id: 'park-name', type: 'symbol', source: 'om', 'source-layer': 'park', minzoom: 14, layout: { ...vis(o.parkNames), 'text-field': ['get', 'name'], 'text-font': FONT_I, 'text-size': 12 }, paint: txt({ 'text-color': '#2e6b34' }) });
  add({ id: 'road-name', type: 'symbol', source: 'om', 'source-layer': 'transportation_name', minzoom: 14, layout: { ...vis(o.roadNames), 'symbol-placement': 'line', 'text-field': ['get', 'name'], 'text-font': FONT, 'text-size': 12 }, paint: txt() });
  const onPoi = POI.filter(([k]) => o[k]);
  if (onPoi.length) {
    const f = cls(onPoi.flatMap(x => x[1]));
    const col = ['match', ['get', 'class'], ...onPoi.flatMap(([, list, c]) => [list, c]), '#8a7d6b'];
    add({ id: 'poi-dot', type: 'circle', source: 'om', 'source-layer': 'poi', minzoom: 15, filter: f, paint: { 'circle-radius': 5, 'circle-color': col, 'circle-stroke-color': '#fff', 'circle-stroke-width': 1.5 } });
    add({ id: 'poi-name', type: 'symbol', source: 'om', 'source-layer': 'poi', minzoom: 16, filter: f, layout: { ...vis(o.poiNames), 'text-field': ['get', 'name'], 'text-font': FONT, 'text-size': 11, 'text-offset': [0, 1.1], 'text-anchor': 'top', 'text-optional': true }, paint: txt() });
  }
  add({ id: 'peak', type: 'symbol', source: 'om', 'source-layer': 'mountain_peak', layout: { ...vis(o.peaks), 'text-field': ['concat', '▲ ', ['coalesce', ['get', 'name'], ''], ' ', ['to-string', ['coalesce', ['get', 'ele'], '']], ' m'], 'text-font': FONT, 'text-size': 11 }, paint: txt({ 'text-color': '#7a4b2a' }) });
  add({ id: 'place', type: 'symbol', source: 'om', 'source-layer': 'place', filter: cls(['city', 'town', 'village', 'suburb', 'quarter', 'neighbourhood']), layout: { ...vis(o.places), 'text-field': ['get', 'name'], 'text-font': FONT_B, 'text-size': ['match', ['get', 'class'], ['city', 'town'], 15, 12] }, paint: txt() });

  // Poloha hráče jako vrstva mapy: na nakloněné mapě se kreslí ve správné perspektivě (i na kraji obrazovky)
  add({ id: 'me-halo', type: 'circle', source: 'me', paint: { 'circle-radius': 16, 'circle-color': '#2f7d4f', 'circle-opacity': .18, 'circle-pitch-alignment': 'map' } });
  add({ id: 'me-dot', type: 'circle', source: 'me', paint: { 'circle-radius': 9, 'circle-color': '#2f7d4f', 'circle-stroke-color': '#ffffff', 'circle-stroke-width': 3, 'circle-pitch-alignment': 'map' } });
  const sources = {
    om: { type: 'vector', url: ctx.vectorUrl, attribution: ctx.attribution || '' },
    range: { type: 'geojson', data: g.range || EMPTY },
    acc: { type: 'geojson', data: g.acc || EMPTY },
    catch: { type: 'geojson', data: g.catch || EMPTY },
    me: { type: 'geojson', data: g.me || EMPTY },
    biodebug: { type: 'geojson', data: g.bio || EMPTY }
  };
  if (ctx.demUrl) sources.dem = { type: 'raster-dem', tiles: [ctx.demUrl], encoding: 'terrarium', tileSize: 256, maxzoom: 13, attribution: 'Terén: Mapzen/AWS Terrain Tiles' };
  if (ctx.contourUrl) sources.contours = { type: 'vector', tiles: [ctx.contourUrl], maxzoom: 16 };
  sources.plan = { type: 'geojson', data: ctx.plan || EMPTY };
  sources.walk = { type: 'geojson', data: ctx.walk || EMPTY };
  sources.kct = { type: 'geojson', data: ctx.kct || EMPTY, attribution: 'Trasy: © přispěvatelé OpenStreetMap' };
  if (ctx.trailsUrl) TRAILS.forEach(([k, t]) => {
    if (o[k] && t !== 'hiking') sources['tr-' + t] = { type: 'raster', tiles: [ctx.trailsUrl.replace('{type}', t)], tileSize: 256, maxzoom: 18, attribution: 'Trasy: <a href="https://waymarkedtrails.org">Waymarked Trails</a> (CC BY-SA)' };
  });
  return { version: 8, glyphs: ctx.glyphsUrl, sources, layers: L };
}

// Kruh jako GeoJSON polygon (poloměr v metrech)
export function circle(lon, lat, r, n = 64) {
  if (lat == null || lon == null || !(r > 0)) return EMPTY;
  const pts = [], kx = 111320 * Math.cos(lat * Math.PI / 180), ky = 111320;
  for (let i = 0; i <= n; i++) { const a = i / n * 2 * Math.PI; pts.push([lon + r / kx * Math.cos(a), lat + r / ky * Math.sin(a)]); }
  return { type: 'Feature', properties: {}, geometry: { type: 'Polygon', coordinates: [pts] } };
}
