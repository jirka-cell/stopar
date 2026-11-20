// Deterministické objevování zvířat: stejné místo + stejný čas = stejná zvířata pro všechny hráče
import { hash01, dist, mPerDegLat, mPerDegLon } from './geo.js';
import { biotopeAt } from './osm.js';
import { parseMap, parseZones, zoneFor, parseMonths } from './config.js';

export function currentSlot(cfg, now = Date.now()) {
  return Math.floor(now / (cfg.spawn.slotMinutes * 60000));
}

// Měsíc pro sezónnost (1–12); admin může měsíc simulovat kvůli testování
export function currentMonth(cfg, now = Date.now()) {
  const m = Number(cfg.general.monthOverride);
  return m >= 1 && m <= 12 ? m : new Date(now).getMonth() + 1;
}

// Region, ve kterém se hraje (výšková pásma, filtr druhů)
export function currentRegion(cfg) {
  return cfg.regions.find(r => r.id === cfg.spawn.region) || cfg.regions[0] || { id: '', zones: '' };
}

/**
 * bioAt / altAt jde podstrčit v testech; v aplikaci čtou biotopy z OSM a výšku z dlaždic Terrarium.
 * altAt vrací metry, null = výška se načítá (zvíře počká), NaN = výška není k dispozici (pásma se ignorují).
 */
export function visibleBirds(cfg, lat, lon, night, gone, now = Date.now(), bioAt = biotopeAt, altAt = () => NaN) {
  const S = cfg.spawn;
  const cell = S.cellSize, r = S.radius;
  const kx = mPerDegLon(Number(S.refLat ?? 50)), ky = mPerDegLat; // pevná šířka, ať mají všichni hráči stejnou mřížku
  const x = lon * kx, y = lat * ky;
  const slot = currentSlot(cfg, now);
  const p = Math.min(1, S.density / (Math.PI * r * r / (cell * cell)));
  const rw = Object.fromEntries(cfg.rarities.map(o => [String(o.id), Number(o.weight)]));
  const region = currentRegion(cfg), zones = parseZones(region.zones);
  const inRegion = s => !String(s.regions || '').trim() || String(s.regions).split(',').map(x => x.trim()).includes(region.id);
  const month = currentMonth(cfg, now);
  const sps = cfg.species.filter(s => s.active && inRegion(s) && parseMonths(s.months).has(month)); // tažní a zimující jen ve své sezóně
  const spBio = sps.map(s => parseMap(s.bio));
  const spAlt = sps.map(s => parseMap(s.alt));
  const out = [];
  let pending = 0;
  const c0x = Math.floor((x - r) / cell), c1x = Math.floor((x + r) / cell);
  const c0y = Math.floor((y - r) / cell), c1y = Math.floor((y + r) / cell);
  for (let cx = c0x; cx <= c1x; cx++) for (let cy = c0y; cy <= c1y; cy++) {
    if (hash01(S.seed, cx, cy, slot, 1) >= p) continue;
    const jx = (hash01(S.seed, cx, cy, slot, 2) - 0.5) * S.jitter;
    const jy = (hash01(S.seed, cx, cy, slot, 3) - 0.5) * S.jitter;
    const bx = (cx + 0.5 + jx) * cell, by = (cy + 0.5 + jy) * cell;
    const blat = by / ky, blon = bx / kx;
    const d = dist(lat, lon, blat, blon);
    if (d > r || d < S.minDistance) continue;
    const id = cx + '_' + cy + '_' + slot;
    if (gone[id]) continue;
    const bio = bioAt(blat, blon);
    if (bio === null) { pending++; continue; }
    const alt = zones.length ? altAt(blat, blon) : NaN;
    if (alt === null) { pending++; continue; }
    const zone = Number.isNaN(alt) ? null : zoneFor(alt, zones);
    let tot = 0;
    const cand = [];
    sps.forEach((s, i) => {
      let w = (spBio[i][bio] || 0) * (rw[String(s.rarity)] ?? 1);
      // výšková pásma: prázdné = všude; neznámá výška = bez omezení
      if (zone && Object.keys(spAlt[i]).length) w *= spAlt[i][zone] || 0;
      if (s.night && !night) w = 0;
      else if (!s.night && night) w *= S.nightFactorDay;
      if (w > 0) { cand.push([s, w]); tot += w; }
    });
    if (!tot) continue;
    let q = hash01(S.seed, cx, cy, slot, 4) * tot, pick = cand[0][0];
    for (const [s, w] of cand) { q -= w; if (q <= 0) { pick = s; break; } }
    out.push({ id, sp: pick.id, lat: blat, lon: blon, bio, alt: Number.isNaN(alt) ? null : alt, zone, d });
  }
  return { birds: out, pending };
}

// Verze algoritmu rozmisťování – zvýšit při každé změně, která mění, kde a jaká zvířata se objeví
export const SPAWN_ALGO = 4;

// Krátký kód z nastavení, které ovlivňuje rozmístění. Stejný kód = stejná zvířata na stejném místě.
export function spawnCode(cfg) {
  const pick = (o, keys) => Object.fromEntries(keys.map(k => [k, o[k]]));
  const data = [
    SPAWN_ALGO, cfg.spawn, pick(cfg.daynight, ['mode', 'sunAltitude', 'nightFrom', 'nightTo']),
    pick(cfg.osm, ['chunkDeg', 'lineBuffer', 'defaultBiotope', 'villagePlaces', 'townPlaces', 'villageRadius']),
    cfg.species.map(s => pick(s, ['id', 'active', 'rarity', 'night', 'bio', 'alt', 'months', 'regions'])),
    cfg.rarities, cfg.regions, cfg.biotopes.map(b => pick(b, ['id', 'priority', 'tags', 'villageFrom']))
  ];
  const s = JSON.stringify(data);
  let h = 2166136261 >>> 0;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619) >>> 0; }
  const A = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ'; // bez 0/O a 1/I, ať se kód dobře čte nahlas
  let c = '';
  for (let i = 0; i < 4; i++) { c += A[h & 31]; h >>>= 5; }
  return c.slice(0, 2) + '-' + c.slice(2);
}
