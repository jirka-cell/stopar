// Deterministické objevování ptáků: stejné místo + stejný čas = stejní ptáci pro všechny hráče
import { hash01, dist, mPerDegLat, mPerDegLon } from './geo.js';
import { biotopeAt } from './osm.js';
import { parseMap } from './config.js';

export function currentSlot(cfg, now = Date.now()) {
  return Math.floor(now / (cfg.spawn.slotMinutes * 60000));
}

// bioAt jde podstrčit v testech; v aplikaci čte biotopy z OSM
export function visibleBirds(cfg, lat, lon, night, gone, now = Date.now(), bioAt = biotopeAt) {
  const S = cfg.spawn;
  const cell = S.cellSize, r = S.radius;
  const kx = mPerDegLon(Number(S.refLat ?? 50)), ky = mPerDegLat; // pevná šířka, ať mají všichni hráči stejnou mřížku
  const x = lon * kx, y = lat * ky;
  const slot = currentSlot(cfg, now);
  const p = Math.min(1, S.density / (Math.PI * r * r / (cell * cell)));
  const rw = Object.fromEntries(cfg.rarities.map(o => [String(o.id), Number(o.weight)]));
  const sps = cfg.species.filter(s => s.active);
  const spBio = sps.map(s => parseMap(s.bio));
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
    let tot = 0;
    const cand = [];
    sps.forEach((s, i) => {
      let w = (spBio[i][bio] || 0) * (rw[String(s.rarity)] ?? 1);
      if (s.night && !night) w = 0;
      else if (!s.night && night) w *= S.nightFactorDay;
      if (w > 0) { cand.push([s, w]); tot += w; }
    });
    if (!tot) continue;
    let q = hash01(S.seed, cx, cy, slot, 4) * tot, pick = cand[0][0];
    for (const [s, w] of cand) { q -= w; if (q <= 0) { pick = s; break; } }
    out.push({ id, sp: pick.id, lat: blat, lon: blon, bio, d });
  }
  return { birds: out, pending };
}
