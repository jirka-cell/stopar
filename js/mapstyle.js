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
  data: { name: 'Bohatá data',
    bg: '#e9f2df', wood: '#a6d79a', grass: '#cdeab9', farm: '#e4efc4', wet: '#bfe3d5', water: '#8fd0ee', waterLine: '#6fc1e8', rock: '#d6d2c8', sand: '#f3e9c2',
    res: '#e6e6dc', ind: '#e4dccf', park: '#b7e3a4', bld: '#d9d2c7', bldLine: '#bdb3a5', road: '#ffffff', roadCase: '#b9b1a3', minor: '#fffdf6', path: '#c79a6a', rail: '#9a8f86',
    label: '#3c3a36', halo: '#ffffff', shade: '#4a4238', game: '#2f7d4f' },
  papir: { name: 'Papír a akvarel',
    bg: '#f2e8d2', wood: '#b9cf9a', grass: '#dfe3b4', farm: '#ece0b0', wet: '#c9dccb', water: '#a9cfd6', waterLine: '#8fbcc6', rock: '#ddd2bd', sand: '#efe2bf',
    res: '#eadfc8', ind: '#e5d6bf', park: '#c9d8a4', bld: '#e0cfb2', bldLine: '#c7b291', road: '#fbf6ea', roadCase: '#cbb48f', minor: '#f7efdc', path: '#b98d5c', rail: '#a8957a',
    label: '#6a5136', halo: '#f7efdc', shade: '#6a5136', game: '#7a5a2f' },
  bio: { name: 'Biotopy',
    bg: '#c8dc8a', wood: '#4f9a52', grass: '#c8dc8a', farm: '#d9e48f', wet: '#7fc7b8', water: '#3fa7e0', waterLine: '#3fa7e0', rock: '#b5b0a5', sand: '#e8dc9a',
    res: '#cfc8bd', ind: '#bdb6aa', park: '#7ec36a', bld: '#b3aa9c', bldLine: '#9a9183', road: '#ffffff', roadCase: '#8f877b', minor: '#f4f1ea', path: '#f4f1ea', rail: '#7a7266',
    label: '#2c2a26', halo: '#ffffff', shade: '#2c2a26', game: '#1f5f34' }
};

// Který styl použít: "auto" = herní den / herní noc podle slunce
export function styleIdFor(choice, night) {
  if (choice && choice !== 'auto' && STYLES[choice]) return choice;
  return night ? 'noc' : 'hra';
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

  add({ id: 'bg', type: 'background', paint: { 'background-color': p.bg } });
  add({ id: 'landuse-res', type: 'fill', source: 'om', 'source-layer': 'landuse', filter: cls(['residential', 'suburb', 'neighbourhood', 'commercial', 'retail']), paint: { 'fill-color': p.res } });
  add({ id: 'landuse-ind', type: 'fill', source: 'om', 'source-layer': 'landuse', filter: cls(['industrial', 'railway', 'garages']), paint: { 'fill-color': p.ind } });
  [['farmland', p.farm], ['grass', p.grass], ['wetland', p.wet], ['wood', p.wood]].forEach(([c, col]) =>
    add({ id: 'lc-' + c, type: 'fill', source: 'om', 'source-layer': 'landcover', filter: ['==', ['get', 'class'], c], paint: { 'fill-color': col } }));
  add({ id: 'lc-rock', type: 'fill', source: 'om', 'source-layer': 'landcover', filter: cls(['rock', 'sand']), layout: vis(o.landDetail), paint: { 'fill-color': ['match', ['get', 'class'], 'rock', p.rock, p.sand] } });
  add({ id: 'park', type: 'fill', source: 'om', 'source-layer': 'park', filter: ['!', cls(['national_park', 'nature_reserve', 'protected_area'])], paint: { 'fill-color': p.park } });
  add({ id: 'landuse-green', type: 'fill', source: 'om', 'source-layer': 'landuse', filter: cls(['cemetery', 'pitch', 'stadium', 'playground']), paint: { 'fill-color': p.park } });
  if (o.hillshade && ctx.demUrl) add({ id: 'hillshade', type: 'hillshade', source: 'dem', paint: { 'hillshade-shadow-color': p.shade, 'hillshade-exaggeration': .35, 'hillshade-highlight-color': '#ffffff' } });
  if (ctx.contourUrl) add({ id: 'contour', type: 'line', source: 'contours', 'source-layer': 'contours', layout: vis(o.contours), paint: { 'line-color': p.shade, 'line-opacity': .35, 'line-width': ['match', ['get', 'level'], 1, 1.2, .6] } });
  add({ id: 'water', type: 'fill', source: 'om', 'source-layer': 'water', paint: { 'fill-color': p.water } });
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

  if (o.buildings === 'flat') add({ id: 'building', type: 'fill', source: 'om', 'source-layer': 'building', minzoom: 14, paint: { 'fill-color': p.bld, 'fill-outline-color': p.bldLine } });
  add({ id: 'path', type: 'line', source: 'om', 'source-layer': 'transportation', filter: cls(['path', 'track']), layout: vis(o.paths), paint: { 'line-color': p.path, 'line-width': ['interpolate', ['linear'], ['zoom'], 14, .8, 18, 3], 'line-dasharray': [2, 1.5] } });
  const minor = cls(['minor', 'service']), major = cls(['motorway', 'trunk', 'primary', 'secondary', 'tertiary']);
  const w = k => ['interpolate', ['exponential', 1.6], ['zoom'], 12, .6 * k, 18, 14 * k];
  const road = (rid, f, col, k) => add({ id: rid, type: 'line', source: 'om', 'source-layer': 'transportation', filter: f, layout: { 'line-cap': 'round', 'line-join': 'round' }, paint: { 'line-color': col, 'line-width': w(k) } });
  road('road-minor-case', minor, p.roadCase, 1.25); road('road-major-case', major, p.roadCase, 1.75);
  road('road-minor', minor, p.minor, 1); road('road-major', major, p.road, 1.45);
  add({ id: 'rail', type: 'line', source: 'om', 'source-layer': 'transportation', filter: ['==', ['get', 'class'], 'rail'], layout: vis(o.rail), paint: { 'line-color': p.rail, 'line-width': 1.5, 'line-dasharray': [3, 2] } });
  if (o.buildings === '3d') add({ id: 'building-3d', type: 'fill-extrusion', source: 'om', 'source-layer': 'building', minzoom: 15, paint: { 'fill-extrusion-color': p.bld, 'fill-extrusion-height': ['coalesce', ['get', 'render_height'], 8], 'fill-extrusion-base': ['coalesce', ['get', 'render_min_height'], 0], 'fill-extrusion-opacity': .85 } });
  if (ctx.trailsUrl) TRAILS.forEach(([k, t]) => { if (o[k] && t !== 'hiking') add({ id: 'tr-' + t, type: 'raster', source: 'tr-' + t, paint: { 'raster-opacity': .9 } }); });
  // turistické trasy KČT: bílý okraj a barevný střed jako na značce, naučné stezky čárkovaně
  add({ id: 'kct-casing', type: 'line', source: 'kct', layout: { ...vis(o.trHiking), 'line-cap': 'round', 'line-join': 'round' }, paint: { 'line-color': '#ffffff', 'line-width': ['interpolate', ['linear'], ['zoom'], 11, 3, 16, 8], 'line-opacity': .9 } });
  // line-dasharray nesmí záviset na datech → naučné stezky jako samostatná vrstva
  const kw = ['interpolate', ['linear'], ['zoom'], 11, 1.5, 16, 3.5];
  add({ id: 'kct-line', type: 'line', source: 'kct', filter: ['!=', ['get', 'edu'], 1], layout: { ...vis(o.trHiking), 'line-cap': 'round', 'line-join': 'round' }, paint: { 'line-color': ['get', 'color'], 'line-width': kw } });
  add({ id: 'kct-edu', type: 'line', source: 'kct', filter: ['==', ['get', 'edu'], 1], layout: vis(o.trHiking), paint: { 'line-color': ['get', 'color'], 'line-width': kw, 'line-dasharray': [2, 1.5] } });
  add({ id: 'kct-label', type: 'symbol', source: 'kct', minzoom: 14, layout: { ...vis(o.trHiking), 'symbol-placement': 'line', 'text-field': ['get', 'name'], 'text-font': ['Noto Sans Regular'], 'text-size': 11 }, paint: txt({ 'text-color': ['get', 'color'] }) });

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

  const sources = {
    om: { type: 'vector', url: ctx.vectorUrl, attribution: ctx.attribution || '' },
    range: { type: 'geojson', data: g.range || EMPTY },
    acc: { type: 'geojson', data: g.acc || EMPTY },
    catch: { type: 'geojson', data: g.catch || EMPTY },
    biodebug: { type: 'geojson', data: g.bio || EMPTY }
  };
  if (ctx.demUrl) sources.dem = { type: 'raster-dem', tiles: [ctx.demUrl], encoding: 'terrarium', tileSize: 256, maxzoom: 13, attribution: 'Terén: Mapzen/AWS Terrain Tiles' };
  if (ctx.contourUrl) sources.contours = { type: 'vector', tiles: [ctx.contourUrl], maxzoom: 16 };
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
