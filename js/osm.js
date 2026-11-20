// Biotopy z OpenStreetMap přes Overpass API, cache v IndexedDB po čtvercích
import { store } from './store.js';
import { inRing, distToLine, mPerDegLat, mPerDegLon } from './geo.js';

let CFG = null;
let rules = [];          // [{k,v,line,bio,prio}]
let rulesHash = '';
const chunks = new Map(); // key -> features
const loading = new Map();
let onChange = () => {};

export function osmSetConfig(cfg, cb) {
  CFG = cfg;
  if (cb) onChange = cb;
  rules = [];
  for (const b of cfg.biotopes) {
    String(b.tags || '').split('\n').map(s => s.trim()).filter(Boolean).forEach(line => {
      const isLine = /\|line$/.test(line);
      const kv = line.replace(/\|line$/, '');
      const [k, v] = kv.split('=').map(s => s && s.trim());
      if (k) rules.push({ k, v: v || '*', line: isLine, bio: b.id, prio: Number(b.priority) || 99 });
    });
  }
  const h = JSON.stringify(rules) + '|' + cfg.osm.chunkDeg;
  if (h !== rulesHash) { rulesHash = h; chunks.clear(); }
}

function chunkKey(lat, lon) {
  const d = CFG.osm.chunkDeg;
  return Math.floor(lat / d) + '_' + Math.floor(lon / d);
}
function chunkBBox(key) {
  const d = CFG.osm.chunkDeg;
  const [a, b] = key.split('_').map(Number);
  return [a * d, b * d, (a + 1) * d, (b + 1) * d]; // s,w,n,e
}

function buildQuery(bb) {
  const box = `(${bb[0]},${bb[1]},${bb[2]},${bb[3]})`;
  const parts = [];
  const seen = new Set();
  for (const r of rules) {
    const sel = r.v === '*' ? `["${r.k}"]` : `["${r.k}"="${r.v}"]`;
    const key = sel + r.line;
    if (seen.has(key)) continue; seen.add(key);
    parts.push(`way${sel}${box};`);
    if (!r.line) parts.push(`relation${sel}${box};`);
  }
  return `[out:json][timeout:${CFG.osm.timeout}];(${parts.join('')});out geom;`;
}

function matchRule(tags, wantLine) {
  let best = null;
  for (const r of rules) {
    if (r.line !== wantLine) continue;
    const tv = tags[r.k];
    if (tv === undefined) continue;
    if (r.v !== '*' && tv !== r.v) continue;
    if (!best || r.prio < best.prio) best = r;
  }
  return best;
}

// Spojí části vnějších hranic multipolygonu do uzavřených prstenců
function assemble(ways) {
  const rings = [];
  const pool = ways.map(w => w.slice());
  while (pool.length) {
    let ring = pool.shift();
    let guard = 0;
    while (guard++ < 1000) {
      const first = ring[0], last = ring[ring.length - 1];
      if (first[0] === last[0] && first[1] === last[1]) break;
      const i = pool.findIndex(w => (w[0][0] === last[0] && w[0][1] === last[1]) || (w[w.length - 1][0] === last[0] && w[w.length - 1][1] === last[1]));
      if (i < 0) break;
      let w = pool.splice(i, 1)[0];
      if (!(w[0][0] === last[0] && w[0][1] === last[1])) w = w.reverse();
      ring = ring.concat(w.slice(1));
    }
    if (ring.length > 3) rings.push(ring);
  }
  return rings;
}

function bboxOf(rings) {
  let s = 90, w = 180, n = -90, e = -180;
  for (const r of rings) for (const p of r) { s = Math.min(s, p[0]); n = Math.max(n, p[0]); w = Math.min(w, p[1]); e = Math.max(e, p[1]); }
  return [s, w, n, e];
}

export function parseOverpass(json) {
  const feats = [];
  for (const el of json.elements || []) {
    const tags = el.tags || {};
    if (el.type === 'way' && el.geometry) {
      const pts = el.geometry.map(g => [g.lat, g.lon]);
      const closed = pts.length > 3 && pts[0][0] === pts[pts.length - 1][0] && pts[0][1] === pts[pts.length - 1][1];
      const areaRule = closed ? matchRule(tags, false) : null;
      const lineRule = matchRule(tags, true);
      if (areaRule) feats.push({ b: areaRule.bio, p: areaRule.prio, line: false, outer: [pts], inner: [], bb: bboxOf([pts]) });
      else if (lineRule) feats.push({ b: lineRule.bio, p: lineRule.prio, line: true, outer: [pts], inner: [], bb: bboxOf([pts]) });
    } else if (el.type === 'relation' && el.members) {
      const r = matchRule(tags, false);
      if (!r) continue;
      const outerW = [], innerW = [];
      for (const m of el.members) {
        if (m.type !== 'way' || !m.geometry) continue;
        const pts = m.geometry.map(g => [g.lat, g.lon]);
        (m.role === 'inner' ? innerW : outerW).push(pts);
      }
      const outer = assemble(outerW);
      if (!outer.length) continue;
      feats.push({ b: r.bio, p: r.prio, line: false, outer, inner: assemble(innerW), bb: bboxOf(outer) });
    }
  }
  return feats;
}

async function loadChunk(key) {
  if (chunks.has(key)) return chunks.get(key);
  if (loading.has(key)) return loading.get(key);
  const p = (async () => {
    const cacheKey = key + '|' + hashStr(rulesHash);
    try {
      const c = await store.get(cacheKey, 'osm');
      if (c && Date.now() - c.time < CFG.osm.cacheDays * 86400000) { chunks.set(key, c.features); return c.features; }
    } catch (e) {}
    if (Date.now() < failUntil) throw RETRY_LATER;
    const bb = chunkBBox(key);
    const body = 'data=' + encodeURIComponent(buildQuery(bb));
    const r = await fetch(CFG.osm.overpassUrl, { method: 'POST', body, headers: { 'Content-Type': 'application/x-www-form-urlencoded' } });
    if (!r.ok) throw new Error('Overpass ' + r.status);
    const feats = parseOverpass(await r.json());
    failCount = 0; status.error = '';
    chunks.set(key, feats);
    try { await store.set(cacheKey, { time: Date.now(), features: feats }, 'osm'); } catch (e) {}
    return feats;
  })();
  loading.set(key, p);
  try { const f = await p; onChange(); return f; }
  finally { loading.delete(key); }
}

function hashStr(s) { let h = 0; for (let i = 0; i < s.length; i++) h = (Math.imul(h, 31) + s.charCodeAt(i)) | 0; return (h >>> 0).toString(36); }

// Zajistí načtení čtverců v okruhu kolem bodu (postupně, ať se nepřetíží Overpass).
// Po chybě se síť zkouší znovu až po prodlevě 5 s, 10 s, 20 s … max. 5 min (cache z IndexedDB jde načíst i mezitím).
let queue = Promise.resolve();
const queued = new Set();
const RETRY_LATER = new Error('retry-later');
let failCount = 0, failUntil = 0;
export function ensureArea(lat, lon, radius) {
  const dLat = radius / mPerDegLat, dLon = radius / mPerDegLon(lat);
  const keys = [];
  const d = CFG.osm.chunkDeg;
  const a0 = Math.floor((lat - dLat) / d), a1 = Math.floor((lat + dLat) / d);
  const b0 = Math.floor((lon - dLon) / d), b1 = Math.floor((lon + dLon) / d);
  const ca = Math.floor(lat / d), cb = Math.floor(lon / d);
  for (let a = a0; a <= a1; a++) for (let b = b0; b <= b1; b++) keys.push(a + '_' + b);
  keys.sort((x, y) => { const [xa, xb] = x.split('_').map(Number), [ya, yb] = y.split('_').map(Number); return (Math.abs(xa - ca) + Math.abs(xb - cb)) - (Math.abs(ya - ca) + Math.abs(yb - cb)); });
  const missing = keys.filter(k => !chunks.has(k) && !queued.has(k));
  missing.forEach(k => {
    queued.add(k);
    queue = queue.then(() => loadChunk(k)).catch(err => {
      if (err === RETRY_LATER) return;
      failCount++;
      failUntil = Date.now() + Math.min(300000, 5000 * 2 ** (failCount - 1));
      status.error = String(err.message || err);
      onChange();
    }).finally(() => queued.delete(k));
  });
  return missing.length;
}

export const status = { error: '' };

// Biotop v bodě; null = data ještě nejsou načtená
export function biotopeAt(lat, lon) {
  const key = chunkKey(lat, lon);
  const feats = chunks.get(key);
  if (!feats) return null;
  let best = null;
  for (const f of feats) {
    if (best && f.p >= best.p) continue;
    const bb = f.bb;
    if (f.line) {
      const pad = CFG.osm.lineBuffer / mPerDegLat * 1.6;
      if (lat < bb[0] - pad || lat > bb[2] + pad || lon < bb[1] - pad * 1.6 || lon > bb[3] + pad * 1.6) continue;
      if (distToLine(lat, lon, f.outer[0]) <= CFG.osm.lineBuffer) best = f;
    } else {
      if (lat < bb[0] || lat > bb[2] || lon < bb[1] || lon > bb[3]) continue;
      if (f.outer.some(r => inRing(lat, lon, r)) && !f.inner.some(r => inRing(lat, lon, r))) best = f;
    }
  }
  return best ? best.b : CFG.osm.defaultBiotope;
}

export function loadedFeatures() {
  const out = [];
  chunks.forEach(f => out.push(...f));
  return out;
}

export async function clearOsmCache() { chunks.clear(); failCount = 0; failUntil = 0; status.error = ''; await store.clear('osm'); }
