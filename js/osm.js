// Biotopy z OpenStreetMap přes Overpass API, cache v IndexedDB po čtvercích
import { store } from './store.js';
import { inRing, distToLine, mPerDegLat, mPerDegLon } from './geo.js';

let CFG = null;
let rules = [];          // [{k,v,line,bio,prio}]
let rulesHash = '';
let villageMap = {};     // biotop → biotop pro vesnice (např. mesto → vesnice)
let placeSets = { v: new Set(), t: new Set() };
let targetRules = [];    // [{k, v, kind, icon}] – turistické cíle
const PATHS = 'path|footway|track|bridleway|cycleway|steps';
const PATH_RE = new RegExp('^(' + PATHS + ')$');
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
  villageMap = Object.fromEntries(cfg.biotopes.filter(b => b.villageFrom).map(b => [String(b.villageFrom).trim(), b.id]));
  const list = s => new Set(String(s || '').split(',').map(x => x.trim()).filter(Boolean));
  placeSets = { v: list(cfg.osm.villagePlaces), t: list(cfg.osm.townPlaces) };
  // turistické cíle: řádek „klíč=hodnota|název druhu|ikona“
  targetRules = String(cfg.osm.targetTags || '').split('\n').map(l => l.split('|').map(x => x.trim())).filter(([kv]) => kv && kv.includes('='))
    .map(([kv, kind, icon]) => { const [k, v] = kv.split('='); return { k: k.trim(), v: v.trim(), kind: kind || kv, icon: icon || '📍' }; });
  const h = JSON.stringify(rules) + '|' + cfg.osm.chunkDeg + '|places:' + [...placeSets.v, ...placeSets.t].join(',') + '|' + cfg.osm.villageRadius
    + '|t:' + JSON.stringify(targetRules) + '|pa:' + (cfg.osm.protectedPaths ? 1 : 0);
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
  // Názvy obcí (place=village/town…) v okolí čtverce rozšířeném o villageRadius → rozliší vesnici od města
  const places = [...placeSets.v, ...placeSets.t].filter(p => /^\w+$/.test(p));
  if (places.length && Object.keys(villageMap).length) {
    const dLat = CFG.osm.villageRadius / 111320, dLon = CFG.osm.villageRadius / (111320 * Math.cos(bb[0] * Math.PI / 180));
    parts.push(`node["place"~"^(${places.join('|')})$"](${bb[0] - dLat},${bb[1] - dLon},${bb[2] + dLat},${bb[3] + dLon});`);
  }
  for (const t of targetRules) if (/^[\w:]+$/.test(t.k) && /^[\w:]+$/.test(t.v)) parts.push(`node["${t.k}"="${t.v}"]["name"]${box};way["${t.k}"="${t.v}"]["name"]${box};`);
  // chráněné území: rozhoduje střed čtverce (oblasti z databáze Overpass, bez těžké geometrie hranic)
  const pa = CFG.osm.protectedPaths ? `is_in(${((bb[0] + bb[2]) / 2).toFixed(5)},${((bb[1] + bb[3]) / 2).toFixed(5)})->.a;(area.a["boundary"="protected_area"];area.a["leisure"="nature_reserve"];area.a["boundary"="national_park"];);out tags;` : '';
  return `[out:json][timeout:${CFG.osm.timeout}];(${parts.join('')});out geom;${pa}`;
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

const PA_TAGS = ['name', 'protect_class', 'protection_title', 'boundary', 'leisure', 'wikipedia', 'wikidata', 'website', 'operator'];
const pickTags = t => Object.fromEntries(PA_TAGS.filter(k => t[k]).map(k => [k, String(t[k]).slice(0, 200)]));
export function parseOverpass(json) {
  const feats = [];
  for (const el of json.elements || []) {
    const tags = el.tags || {};
    if (el.type === 'area') { feats.push({ pa: pickTags(tags) }); continue; }
    const tg = tags.name && targetRules.find(t => tags[t.k] === t.v);
    if (tg) {
      const pts = el.type === 'node' ? [[el.lat, el.lon]] : (el.geometry || []).map(g => [g.lat, g.lon]);
      if (pts.length) feats.push({ tg: tg.kind, icon: tg.icon, name: String(tags.name).slice(0, 80), id: el.type[0] + el.id, lat: pts.reduce((a, p) => a + p[0], 0) / pts.length, lon: pts.reduce((a, p) => a + p[1], 0) / pts.length });
      if (el.type === 'node') continue;
    }
    if (el.type === 'node') {
      if (tags.place && el.lat != null) feats.push({ pl: tags.place, lat: el.lat, lon: el.lon });
      continue;
    }
    if (el.type === 'way' && el.geometry && PATH_RE.test(tags.highway || '') && !matchRule(tags, true)) {
      const pts = el.geometry.map(g => [g.lat, g.lon]);
      feats.push({ path: true, outer: [pts], bb: bboxOf([pts]) });
      continue;
    }
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
    let feats = parseOverpass(await fetchOverpass(body));
    // v chráněném území se zvířata objevují jen u cest → stáhnout i pěšiny tohoto čtverce
    if (feats.some(f => f.pa)) {
      const q = `[out:json][timeout:${CFG.osm.timeout}];way["highway"~"^(${PATHS})$"](${bb[0]},${bb[1]},${bb[2]},${bb[3]});out geom;`;
      feats = feats.concat(parseOverpass(await fetchOverpass('data=' + encodeURIComponent(q))).filter(f => f.path));
    }
    failCount = 0; status.error = '';
    chunks.set(key, feats);
    try { await store.set(cacheKey, { time: Date.now(), features: feats }, 'osm'); } catch (e) {}
    return feats;
  })();
  loading.set(key, p);
  try { const f = await p; onChange(); return f; }
  finally { loading.delete(key); }
}

// Zkusí servery Overpass postupně, začne posledním funkčním; až když selžou všechny, ohlásí chybu
let goodUrl = 0;
export function overpassUrls(cfg = CFG) { return String(cfg.osm.overpassUrl || '').split('\n').map(u => u.trim()).filter(Boolean); }
async function fetchOverpass(body) {
  const urls = overpassUrls();
  let err = new Error('Overpass: žádný server');
  for (let i = 0; i < urls.length; i++) {
    const n = (goodUrl + i) % urls.length;
    try {
      // časový limit: zaseknutý server nesmí zastavit frontu čtverců
      const signal = AbortSignal.timeout ? AbortSignal.timeout((Number(CFG.osm.timeout) + 15) * 1000) : undefined;
      const r = await fetch(urls[n], { method: 'POST', body, signal, headers: { 'Content-Type': 'application/x-www-form-urlencoded' } });
      if (!r.ok) throw new Error('Overpass ' + r.status);
      const json = await r.json();
      // přetížený server odpoví 200 s „runtime error“ a neúplnými daty – nesmí se uložit do cache
      if (/error/i.test(json.remark || '')) throw new Error('Overpass: ' + String(json.remark).slice(0, 80));
      goodUrl = n;
      return json;
    } catch (e) { err = e; }
  }
  throw err;
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

// Chyba, kterou má smysl ukázat hráči: jen když chybí data přímo pod ním (výpadek okolních čtverců hru neomezuje)
export function errorAt(lat, lon) {
  return CFG && !chunks.has(chunkKey(lat, lon)) ? status.error : '';
}

// Biotop v bodě; null = data ještě nejsou načtená
export function biotopeAt(lat, lon) {
  const key = chunkKey(lat, lon);
  const feats = chunks.get(key);
  if (!feats) return null;
  let best = null;
  for (const f of feats) {
    if (!f.b) continue;
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
  const b = best ? best.b : CFG.osm.defaultBiotope;
  return villageMap[b] ? villageOrTown(feats, lat, lon, b) : b;
}

// Zástavba u vesnice → biotop vesnice: rozhoduje nejbližší název obce v okolí (stejná data pro všechny hráče)
function villageOrTown(feats, lat, lon, b) {
  let near = null, nd = CFG.osm.villageRadius;
  for (const f of feats) {
    if (!f.pl || !(placeSets.v.has(f.pl) || placeSets.t.has(f.pl))) continue;
    const d = Math.hypot((f.lat - lat) * mPerDegLat, (f.lon - lon) * mPerDegLon(lat));
    if (d < nd) { nd = d; near = f; }
  }
  return near && placeSets.v.has(near.pl) ? villageMap[b] : b;
}

export function loadedFeatures() {
  const out = [];
  chunks.forEach(f => { for (const x of f) if (x.b) out.push(x); });
  return out;
}

export async function clearOsmCache() { chunks.clear(); failCount = 0; failUntil = 0; status.error = ''; await store.clear('osm'); }

// Chráněné území v bodě (tagy z OSM) nebo null; undefined = data ještě nejsou
export function protectedAt(lat, lon) {
  const feats = chunks.get(chunkKey(lat, lon));
  if (!feats) return undefined;
  return (feats.find(f => f.pa) || {}).pa || null;
}
// Smí se tu objevit zvíře? V chráněném území jen do pathBuffer m od cesty (aby hra nelákala mimo cesty)
export function spawnAllowed(lat, lon) {
  if (!CFG || !CFG.osm.protectedPaths) return true;
  const feats = chunks.get(chunkKey(lat, lon));
  if (!feats || !feats.some(f => f.pa)) return true;
  const buf = Number(CFG.osm.pathBuffer) || 30, pad = buf / mPerDegLat * 1.6;
  return feats.some(f => f.path && !(lat < f.bb[0] - pad || lat > f.bb[2] + pad || lon < f.bb[1] - pad * 1.6 || lon > f.bb[3] + pad * 1.6) && distToLine(lat, lon, f.outer[0]) <= buf);
}
// Turistické cíle v načtených čtvercích do vzdálenosti r (m)
export function targetsNear(lat, lon, r) {
  const out = [], seen = new Set();
  chunks.forEach(f => { for (const x of f) if (x.tg && !seen.has(x.id)) { seen.add(x.id); const d = Math.hypot((x.lat - lat) * mPerDegLat, (x.lon - lon) * mPerDegLon(lat)); if (d <= r) out.push({ ...x, d }); } });
  return out.sort((a, b) => a.d - b.d);
}
