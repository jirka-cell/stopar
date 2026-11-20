// Geometrie, vzdálenosti, slunce
const R = 6371000;
const rad = d => d * Math.PI / 180;

export function dist(aLat, aLon, bLat, bLon) {
  const dLat = rad(bLat - aLat), dLon = rad(bLon - aLon);
  const s = Math.sin(dLat / 2) ** 2 + Math.cos(rad(aLat)) * Math.cos(rad(bLat)) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(s)));
}

// Metry na stupně v dané šířce
export const mPerDegLat = 111320;
export const mPerDegLon = lat => 111320 * Math.cos(rad(lat));

// Bod v polygonu (ring = [[lat,lon],...])
export function inRing(lat, lon, ring) {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const yi = ring[i][0], xi = ring[i][1], yj = ring[j][0], xj = ring[j][1];
    if (((yi > lat) !== (yj > lat)) && (lon < (xj - xi) * (lat - yi) / (yj - yi) + xi)) inside = !inside;
  }
  return inside;
}

// Vzdálenost bodu od lomené čáry v metrech (rovinná aproximace)
export function distToLine(lat, lon, line) {
  const kx = mPerDegLon(lat), ky = mPerDegLat;
  let best = Infinity;
  for (let i = 1; i < line.length; i++) {
    const ax = (line[i - 1][1] - lon) * kx, ay = (line[i - 1][0] - lat) * ky;
    const bx = (line[i][1] - lon) * kx, by = (line[i][0] - lat) * ky;
    const dx = bx - ax, dy = by - ay, l2 = dx * dx + dy * dy;
    let t = l2 ? -(ax * dx + ay * dy) / l2 : 0;
    t = Math.max(0, Math.min(1, t));
    const px = ax + t * dx, py = ay + t * dy;
    best = Math.min(best, Math.hypot(px, py));
  }
  return best;
}

// Výška slunce nad obzorem ve stupních (NOAA, přesnost ~0,5°)
export function sunAltitude(date, lat, lon) {
  const jd = date.getTime() / 86400000 + 2440587.5;
  const n = jd - 2451545.0;
  const L = (280.46 + 0.9856474 * n) % 360;
  const g = rad((357.528 + 0.9856003 * n) % 360);
  const lambda = rad(L + 1.915 * Math.sin(g) + 0.02 * Math.sin(2 * g));
  const eps = rad(23.439 - 0.0000004 * n);
  const dec = Math.asin(Math.sin(eps) * Math.sin(lambda));
  const ra = Math.atan2(Math.cos(eps) * Math.sin(lambda), Math.cos(lambda));
  const gmst = (18.697374558 + 24.06570982441908 * n) % 24;
  const lst = rad(((gmst * 15 + lon) % 360 + 360) % 360);
  const ha = lst - ra;
  const alt = Math.asin(Math.sin(rad(lat)) * Math.sin(dec) + Math.cos(rad(lat)) * Math.cos(dec) * Math.cos(ha));
  return alt * 180 / Math.PI;
}

// Deterministický hash -> 0..1
export function hash01(...n) {
  let h = 2166136261 >>> 0;
  for (const v of n) {
    let x = Math.floor(v) | 0;
    for (let i = 0; i < 4; i++) { h ^= (x & 255); h = Math.imul(h, 16777619) >>> 0; x >>= 8; }
  }
  h ^= h >>> 13; h = Math.imul(h, 0x5bd1e995) >>> 0; h ^= h >>> 15;
  return (h >>> 0) / 4294967296;
}
