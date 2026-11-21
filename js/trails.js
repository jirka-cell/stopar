// Turistické trasy jako vektor: relace route=hiking z OpenStreetMap přes Overpass, barva podle značky KČT (osmc:symbol).
// Stahuje se po dlaždicích 0,05° (≈ 5 × 3,5 km), uložené v IndexedDB jako biotopy.
import { store } from './store.js';

const COLORS = { red: '#d9302a', blue: '#2a62c9', green: '#2e9a3a', yellow: '#f2b81b', orange: '#e57b1e', purple: '#8e44ad', white: '#9a9a9a', black: '#333333', brown: '#8a5a2a' };
export const TILE = 0.05;
// Barva trasy: první slovo osmc:symbol (KČT: red:white:red_bar), jinak colour, jinak fialová
export function trailColor(tags) {
  const s = String(tags['osmc:symbol'] || '').split(':')[0].trim().toLowerCase();
  if (COLORS[s]) return COLORS[s];
  const c = String(tags.colour || '').toLowerCase();
  return COLORS[c] || (/^#[0-9a-f]{6}$/.test(c) ? c : '#9a5ab0');
}
export const isEducational = tags => /_(?:diag|backslash)$/.test(String(tags['osmc:symbol'] || '')) || /naučn/i.test(String(tags.name || ''));

// Odpověď Overpass (relace s geometrií členů) → GeoJSON čáry
export function trailsGeoJSON(json) {
  const features = [];
  for (const el of (json && json.elements) || []) {
    if (el.type !== 'relation' || !el.members) continue;
    const t = el.tags || {}, color = trailColor(t), name = String(t.name || t.ref || '').slice(0, 80), edu = isEducational(t);
    for (const m of el.members) {
      if (m.type !== 'way' || !Array.isArray(m.geometry)) continue;
      const coords = m.geometry.filter(g => g && Number.isFinite(g.lat)).map(g => [g.lon, g.lat]);
      if (coords.length >= 2) features.push({ type: 'Feature', properties: { color, name, edu: edu ? 1 : 0, id: el.id }, geometry: { type: 'LineString', coordinates: coords } });
    }
  }
  return features;
}
export const tileKey = (lat, lon) => Math.floor(lat / TILE) + '_' + Math.floor(lon / TILE);
// Dlaždice pokrývající výřez mapy (nejvýš max, nejbližší ke středu napřed)
export function tilesFor(b, max = 6) {
  const out = [], [s, w, n, e] = b, cy = (s + n) / 2, cx = (w + e) / 2;
  for (let a = Math.floor(s / TILE); a <= Math.floor(n / TILE); a++) for (let o = Math.floor(w / TILE); o <= Math.floor(e / TILE); o++) out.push([a, o]);
  return out.sort((p, q) => Math.hypot(p[0] * TILE - cy, p[1] * TILE - cx) - Math.hypot(q[0] * TILE - cy, q[1] * TILE - cx)).slice(0, max).map(([a, o]) => a + '_' + o);
}

const mem = new Map(), busy = new Set();
let failUntil = 0;
// Načte dlaždice (cache → síť); onData(GeoJSON) se zavolá, když přibudou data
export async function loadTrails(keys, fetcher, cacheDays, onData) {
  for (const k of keys) {
    if (mem.has(k) || busy.has(k)) continue;
    busy.add(k);
    try {
      const c = await store.get('kct|' + k, 'osm').catch(() => null);
      if (c && Date.now() - c.time < cacheDays * 86400000) mem.set(k, c.features);
      else {
        if (Date.now() < failUntil) continue;
        const [a, o] = k.split('_').map(Number), bb = [a * TILE, o * TILE, (a + 1) * TILE, (o + 1) * TILE].map(v => v.toFixed(4)).join(',');
        const feats = trailsGeoJSON(await fetcher(`[out:json][timeout:25];relation["route"="hiking"](${bb});out geom(${bb});`));
        mem.set(k, feats);
        store.set('kct|' + k, { time: Date.now(), features: feats }, 'osm').catch(() => {});
      }
      onData(collection());
    } catch (e) { failUntil = Date.now() + 120000; }
    finally { busy.delete(k); }
  }
}
export function collection() {
  const features = []; mem.forEach(f => features.push(...f));
  return { type: 'FeatureCollection', features };
}
export function clearTrails() { mem.clear(); failUntil = 0; }
