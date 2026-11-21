// 3D farma: uprostřed nepravidelná hexová farma (měnitelná políčka), kolem malebná krajina bez hexů –
// vysoké hory se sněhem, klikatá řeka s mosty, železnice s vláčkem, lesy a chalupy. Vše ze seedu farmy.
// Cesty kreslí hráč na hranách políček (jen vzhled, se stromořadím). Tvary jsou low-poly; modely (.glb) půjdou vyměnit v model().
const HEX = 1, SQ3 = Math.sqrt(3), TILE_H = 0.14;
const axial = (q, r) => [HEX * SQ3 * (q + r / 2), HEX * 1.5 * r];
const DIRS = [[1, 0], [1, -1], [0, -1], [-1, 0], [-1, 1], [0, 1]];
const K = (q, r) => q + ',' + r;
export const hexDist = (q, r) => (Math.abs(q) + Math.abs(r) + Math.abs(q + r)) / 2;
export const edgeKey = (a, b) => [K(...a), K(...b)].sort().join('|');
const hash = (q, r, s = 0) => { let h = (q * 374761393 + r * 668265263 + s * 2147483647) | 0; h = Math.imul(h ^ (h >>> 13), 1274126177); return ((h ^ (h >>> 16)) >>> 0) / 4294967296; };
function rng(seed) { let s = (seed * 2654435761) >>> 0 || 1; return () => { s ^= s << 13; s >>>= 0; s ^= s >>> 17; s ^= s << 5; s >>>= 0; return s / 4294967296; }; }
// Bod na zemi → políčko (šestiúhelník špičkou nahoru)
export function hexAt(x, z) {
  const q = (SQ3 / 3 * x - z / 3) / HEX, r = (2 / 3 * z) / HEX, s = -q - r;
  let rq = Math.round(q), rr = Math.round(r); const rs = Math.round(s);
  const dq = Math.abs(rq - q), dr = Math.abs(rr - r), ds = Math.abs(rs - s);
  if (dq > dr && dq > ds) rq = -rr - rs; else if (dr > ds) rr = -rq - rs;
  return [rq + 0, rr + 0];
}
const segDist = (px, pz, ax, az, bx, bz) => { const dx = bx - ax, dz = bz - az, t = Math.max(0, Math.min(1, ((px - ax) * dx + (pz - az) * dz) / (dx * dx + dz * dz || 1))); return Math.hypot(px - ax - t * dx, pz - az - t * dz); };
const lineDist = (pts, x, z) => { let m = Infinity; for (let i = 1; i < pts.length; i++) m = Math.min(m, segDist(x, z, pts[i - 1][0], pts[i - 1][1], pts[i][0], pts[i][1])); return m; };

/* ---------- generátor světa (čistá logika, testuje se) ---------- */
export const REGION_SIZE = 92;
// Základní evropské krajiny: výšky, lesnatost, tůně, barvy. Výchozí = česká pahorkatina (nižší zalesněné kopce, občas vyšší hora nebo hřeben)
export const BIOMES = {
  pahorkatina: { name: 'Pahorkatina', icon: '🌳', desc: 'Nižší zalesněné kopce, občas vyšší hora', hills: [7, 12, 0.7, 1.6], big: [0.45, 2.4, 3.4], range: [0.3, 1.8, 2.6], forest: 0.25, conifer: 0.5, ponds: [3, 6], grass: [0x86bd5c, 0x7cb455], snow: 99 },
  nizina: { name: 'Nížina', icon: '🌾', desc: 'Rovina s poli, lesíky a širokou řekou', hills: [3, 6, 0.3, 0.8], big: [0, 0, 0], range: [0, 0, 0], forest: 0.6, conifer: 0.25, ponds: [2, 4], grass: [0x9bc866, 0x8fc05c], snow: 99 },
  mokrady: { name: 'Rybníkářská krajina', icon: '🦆', desc: 'Rovina, rybníky a tůně, listnaté háje', hills: [3, 6, 0.3, 0.7], big: [0, 0, 0], range: [0, 0, 0], forest: 0.45, conifer: 0.2, ponds: [7, 11], grass: [0x82b85e, 0x76ad55], snow: 99 },
  hory: { name: 'Hory', icon: '🏔️', desc: 'Vysoké štíty se sněhem a hřebeny', hills: [4, 8, 1.0, 2.0], big: [0.9, 3.6, 6.2], range: [0.8, 3.4, 4.8], forest: 0.2, conifer: 0.85, ponds: [1, 3], grass: [0x7cb455, 0x6fa84c], snow: 3.1 },
  tajga: { name: 'Severský les', icon: '🌲', desc: 'Nízké kopce, hustý jehličnatý les, jezírka', hills: [6, 10, 0.5, 1.2], big: [0.2, 1.8, 2.4], range: [0.2, 1.4, 2.0], forest: -0.2, conifer: 0.95, ponds: [5, 9], grass: [0x6f9e52, 0x648f49], snow: 99 },
  stredomori: { name: 'Středomoří', icon: '🫒', desc: 'Suché kopce, olivovníky, světlá tráva', hills: [5, 9, 0.6, 1.5], big: [0.35, 2.2, 3.0], range: [0.3, 1.6, 2.4], forest: 0.8, conifer: 0.15, ponds: [0, 2], grass: [0xc9c27a, 0xbdb56c], snow: 99 }
};
export function genWorld(seed, must = [], biome = 'pahorkatina') {
  const B = BIOMES[biome] || BIOMES.pahorkatina, R = rng(seed), ang = R() * Math.PI * 2;
  // řeka: klikatá čára přes celou mapu, kolem farmy (ne přes statek); šířka meandrů podle seedu
  const off = 5.5 + R() * 3, cx = Math.cos(ang + Math.PI / 2) * off, cz = Math.sin(ang + Math.PI / 2) * off, dx = Math.cos(ang), dz = Math.sin(ang), wob = R() * 6, amp = 1.2 + R() * 2.2, freq = 3 + R() * 4;
  const river = [];
  for (let i = 0; i <= 120; i++) { const t = i / 120 * 2 - 1, w = Math.sin(t * freq + wob) * amp + Math.sin(t * freq * 2.3 + wob * 2) * amp * 0.3, p = [cx + dx * t * 34 - dz * w, cz + dz * t * 34 + dx * w]; if (Math.abs(p[0]) <= 27.6 && Math.abs(p[1]) <= 27.6) river.push(p); }
  // kopce (hlavně), občas vysoká hora a souvislý hřeben – podle krajiny
  const peaks = [], nH = B.hills[0] + Math.floor(R() * (B.hills[1] - B.hills[0] + 1));
  for (let i = 0; i < nH; i++) { const a = R() * Math.PI * 2, d = 9 + R() * 16; peaks.push({ x: Math.cos(a) * d, z: Math.sin(a) * d, h: B.hills[2] + R() * (B.hills[3] - B.hills[2]), w: 2.2 + R() * 2.8 }); }
  const nBig = R() < B.big[0] ? 1 + (biome === 'hory' ? Math.floor(R() * 4) : 0) : 0;
  for (let i = 0; i < nBig; i++) { const a = R() * Math.PI * 2, d = 15 + R() * 9; peaks.push({ x: Math.cos(a) * d, z: Math.sin(a) * d, h: B.big[1] + R() * (B.big[2] - B.big[1]), w: 2.6 + R() * 2.4 }); }
  if (R() < B.range[0]) {
    const a0 = R() * Math.PI * 2, len = 1.0 + R() * 1.4, rad = 16 + R() * 6, ph = R() * 6;
    for (let t = 0; t <= len; t += 0.11) { const rr2 = rad + Math.sin(t * 2.3 + ph) * 1.8; peaks.push({ x: Math.cos(a0 + t) * rr2, z: Math.sin(a0 + t) * rr2, h: B.range[1] + (Math.sin(t * 4.1 + ph) * 0.5 + 0.5) * (B.range[2] - B.range[1]) * (0.7 + R() * 0.3), w: 1.9 + R() * 0.9 }); }
  }
  const rough = 0.06 + R() * 0.14;
  const rawH = (x, z) => { let h = 0; for (const p of peaks) h += p.h * Math.exp(-((x - p.x) ** 2 + (z - p.z) ** 2) / (p.w * p.w)); return h + (Math.sin(x * 0.35 + seed) + Math.sin(z * 0.41 + seed * 0.7)) * rough; };
  // farma: roste od statku mezi překážkami; prodloužení podél náhodné osy = nepravidelný tvar
  const mustK = new Set(must.map(p => K(...p))), axis = R() * Math.PI, stretch = R() * 0.25;
  let lim = 0.4, maxD = 9; // když se farma nevejde, druhé kolo dovolí mírné svahy a větší dosah
  const blocked = (q, r) => { if (mustK.has(K(q, r)) || (!q && !r)) return false; const [x, z] = axial(q, r); return hexDist(q, r) > maxD || lineDist(river, x, z) < 2.0 || rawH(x, z) > lim; };
  const cells = new Map([[K(0, 0), { q: 0, r: 0, t: 'yard' }]]), front = new Map();
  const push = (q, r) => { const k = K(q, r); if (!cells.has(k) && !front.has(k) && !blocked(q, r)) front.set(k, [q, r]); };
  DIRS.forEach(([a, b]) => push(a, b));
  const fF = 0.1 + R() * 0.15, fP = 0.08 + R() * 0.12;
  for (let pass = 0; pass < 2; pass++) {
  if (pass) { lim = 0.8; maxD = 11; for (const c of [...cells.values()]) DIRS.forEach(([a, b]) => push(c.q + a, c.r + b)); }
  while (front.size && cells.size < REGION_SIZE) {
    let bk = null, bv = Infinity;
    for (const [k, [q, r]] of front) { const [x, z] = axial(q, r), across = Math.abs(-Math.sin(axis) * x + Math.cos(axis) * z); const v = hash(q, r, seed) * 0.9 + hexDist(q, r) * 0.16 + across * stretch; if (v < bv) { bv = v; bk = k; } }
    const [q, r] = front.get(bk); front.delete(bk);
    const h = hash(q, r, seed + 3);
    cells.set(bk, { q, r, t: h < fF ? 'forest' : h < fF + fP ? 'field' : 'meadow' });
    DIRS.forEach(([a, b]) => push(q + a, r + b));
  }
  }
  for (const [q, r] of must) if (!cells.has(K(q, r))) cells.set(K(q, r), { q, r, t: 'meadow' }); // budovy zůstanou na farmě i po nové krajině
  const centers = [...cells.values()].map(c => axial(c.q, c.r));
  const farmDist = (x, z) => { let m = Infinity; for (const [a, b] of centers) { const d = (x - a) ** 2 + (z - b) ** 2; if (d < m) m = d; } return Math.sqrt(m); };
  // trasy jako plynulé esovité křivky (Bézier); přes řeku kolmo po mostě
  const EDGE = 25;
  const cubic = (a, b, c, d, n, out) => { for (let i = out.length ? 1 : 0; i <= n; i++) { const t = i / n, u = 1 - t; out.push([u * u * u * a[0] + 3 * u * u * t * b[0] + 3 * u * t * t * c[0] + t * t * t * d[0], u * u * u * a[1] + 3 * u * u * t * b[1] + 3 * u * t * t * c[1] + t * t * t * d[1]]); } };
  const cross = (P, Q) => { for (let i = 1; i < river.length; i++) { const [ax, az] = river[i - 1], [bx, bz] = river[i], rx = bx - ax, rz = bz - az, sx = Q[0] - P[0], sz = Q[1] - P[1], den = rx * sz - rz * sx; if (Math.abs(den) < 1e-9) continue; const t = ((P[0] - ax) * sz - (P[1] - az) * sx) / den, u = ((P[0] - ax) * rz - (P[1] - az) * rx) / den; if (t >= 0 && t <= 1 && u >= 0 && u <= 1) { const l = Math.hypot(rx, rz); return { p: [ax + rx * t, az + rz * t], n: [-rz / l, rx / l] }; } } return null; };
  const route = (P0, d0, P3, d3, n1 = 40) => {
    const pts = [], c = cross(P0, P3), L = (a, b) => Math.hypot(b[0] - a[0], b[1] - a[1]);
    if (!c) { const k = L(P0, P3) / 3; cubic(P0, [P0[0] + d0[0] * k, P0[1] + d0[1] * k], [P3[0] - d3[0] * k, P3[1] - d3[1] * k], P3, n1, pts); return { pts, bridge: null }; }
    let n = c.n; if ((P3[0] - P0[0]) * n[0] + (P3[1] - P0[1]) * n[1] < 0) n = [-n[0], -n[1]]; // most kolmo k řece, směrem k cíli
    const B = c.p, k1 = L(P0, B) / 2.6, k2 = L(B, P3) / 2.6;
    cubic(P0, [P0[0] + d0[0] * k1, P0[1] + d0[1] * k1], [B[0] - n[0] * k1 * 0.8, B[1] - n[1] * k1 * 0.8], B, n1, pts);
    cubic(B, [B[0] + n[0] * k2 * 0.8, B[1] + n[1] * k2 * 0.8], [P3[0] - d3[0] * k2, P3[1] - d3[1] * k2], P3, n1, pts);
    return { pts, bridge: [B[0], B[1], Math.atan2(n[0], n[1])] };
  };
  const inRegion = (x, z) => cells.has(K(...hexAt(x, z)));
  const nearest = (pts, x, z) => { let m = Infinity, mi = 0; for (let i = 1; i < pts.length; i++) { const d = segDist(x, z, pts[i - 1][0], pts[i - 1][1], pts[i][0], pts[i][1]); if (d < m) { m = d; mi = i; } } return [m, mi]; };
  const H0 = (x, z) => {
    if (inRegion(x, z)) return 0;
    let h = rawH(x, z);
    const fd = farmDist(x, z); if (fd < 2.6) { const t = Math.max(0, (fd - 0.95) / 1.65); h *= t * t * (3 - 2 * t); } // svahy plynule dolů k farmě
    const d = lineDist(river, x, z);
    if (d < 4.5) { const t = Math.max(0, (d - 0.8) / 3.7); h *= t * t * (3 - 2 * t) * 0.85 + 0.15 * t; } // údolí řeky
    if (d < 1.8) h = h * (d / 1.8) ** 2 - 0.25 * (1 - d / 1.8);
    return h;
  };
  const BRIDGE_H = 0.6;
  const smooth = (prof, pts, passes, keep) => { for (let p = 0; p < passes; p++) prof = prof.map((v, i) => { if (keep(i)) return v; let s2 = 0, n = 0; for (let j = Math.max(0, i - 4); j <= Math.min(prof.length - 1, i + 4); j++) { s2 += prof[j]; n++; } return s2 / n; }); return prof; };
  // niveleta trati: terén vyhlazený; tunel tam, kde je nad tratí aspoň 0,7 horniny; krátké mezery mezi tunely se spojí
  function railProfile(pts) {
    const nearRiver = pts.map(([x, z]) => lineDist(river, x, z) < 1.2);
    let prof = pts.map(([x, z], i) => nearRiver[i] ? BRIDGE_H : Math.max(0.1, H0(x, z)) + 0.08);
    // nejdřív „ideální“ niveleta bez kopců: kopce nad prahem se ignorují (budou tunelem)
    const cap = Math.min(...prof) + 1.2; prof = prof.map(v => Math.min(v, cap));
    prof = smooth(prof, pts, 8, i => nearRiver[i]);
    let tun = pts.map(([x, z], i) => !nearRiver[i] && H0(x, z) > prof[i] + 0.7);
    for (let i = 0; i < tun.length; i++) if (!tun[i]) { let j = i; while (j < tun.length && !tun[j]) j++; if (i > 0 && j < tun.length && j - i < 8) for (let k = i; k < j; k++) tun[k] = true; i = j; }
    for (let i = 0; i < tun.length; i++) if (tun[i]) { let j = i; while (j < tun.length && tun[j]) j++; if (j - i < 7) for (let k = i; k < j; k++) tun[k] = false; else { tun[i] = tun[i + 1] = tun[j - 1] = tun[j - 2] = false; } i = j; } // krátký tunel = zářez; u vjezdu zářez k portálu
    return { prof, tun };
  }
  function roadProfile(pts) {
    const nearRiver = pts.map(([x, z]) => lineDist(river, x, z) < 1.0);
    let prof = pts.map(([x, z], i) => nearRiver[i] ? BRIDGE_H : Math.max(0.05, H0(x, z)) + 0.04);
    return smooth(prof, pts, 4, i => nearRiver[i]);
  }
  // pojistky realističnosti: z několika kandidátů trati vybrat nejlepší (krátké tunely, mírný sklon, ne podél řeky, ne přes farmu)
  let best = null;
  for (let k = 0; k < 14; k++) {
    const ra = R() * Math.PI * 2, rOff = 12 + R() * 6, rdx = Math.cos(ra), rdz = Math.sin(ra), rcx = -rdz * rOff, rcz = rdx * rOff, bendR = (R() - 0.5) * 0.6;
    const r2 = route([rcx - rdx * EDGE, rcz - rdz * EDGE], [Math.cos(ra + bendR), Math.sin(ra + bendR)], [rcx + rdx * EDGE, rcz + rdz * EDGE], [Math.cos(ra - bendR), Math.sin(ra - bendR)], 90);
    if (r2.pts.some(([x, z]) => farmDist(x, z) < 2.2)) continue;
    const { prof, tun } = railProfile(r2.pts);
    let grade = 0, along = 0, tunLen = 0;
    for (let i = 1; i < r2.pts.length; i++) { const l = Math.hypot(r2.pts[i][0] - r2.pts[i - 1][0], r2.pts[i][1] - r2.pts[i - 1][1]) || 1; grade = Math.max(grade, Math.abs(prof[i] - prof[i - 1]) / l); const dR = lineDist(river, ...r2.pts[i]); if (dR > 1.2 && dR < 3) along += l; if (tun[i]) tunLen += l; }
    const cost = tunLen * 0.4 + along * 1.5 + grade * 30;
    if (!best || cost < best.cost) best = { cost, ...r2, prof, tun };
  }
  const rail = best ? best.pts : [], railProf = best ? best.prof : [], railTun = best ? best.tun : [];
  const bridges = best && best.bridge ? [best.bridge] : [];
  // cesty: kolmo z hrany farmy; jen tam, kde nevedou přes hory (zkouší víc směrů)
  const roads = [], roadProf = [], nR = 2 + Math.floor(R() * 3), usedA = [];
  for (let k = 0; k < nR; k++) {
    let pick = null;
    for (let tries = 0; tries < 10; tries++) {
      const a = R() * Math.PI * 2; if (usedA.some(u => Math.abs(Math.atan2(Math.sin(u - a), Math.cos(u - a))) < 0.9)) continue;
      const da = [Math.cos(a), Math.sin(a)];
      let bc = null, bv = -Infinity;
      // roh hexu na okraji farmy: oba sousedé u rohu mimo farmu; cesta z rohu vyjde ve směru rohu
      for (const c of cells.values()) for (let ci = 0; ci < 6; ci++) { const ca = Math.PI / 6 + ci * Math.PI / 3, [x, z] = axial(c.q, c.r), px = x + Math.cos(ca) * HEX, pz = z + Math.sin(ca) * HEX, dn = [Math.cos(ca), Math.sin(ca)]; if (cells.has(K(...hexAt(px + dn[0] * 0.5, pz + dn[1] * 0.5)))) continue; const v = px * da[0] + pz * da[1] + (dn[0] * da[0] + dn[1] * da[1]) * 3; if (v > bv) { bv = v; bc = { px, pz, dn }; } }
      if (!bc) break;
      const r2 = route([bc.px, bc.pz], bc.dn, [da[0] * EDGE, da[1] * EDGE], da);
      const maxH = Math.max(...r2.pts.map(([x, z]) => rawH(x, z)));
      if (maxH > 1.25) continue; // přes hory cesta nevede
      pick = { a, ...r2 }; break;
    }
    if (!pick) continue;
    usedA.push(pick.a); roads.push(pick.pts); roadProf.push(roadProfile(pick.pts));
    if (pick.bridge && !bridges.some(b => Math.hypot(b[0] - pick.bridge[0], b[1] - pick.bridge[1]) < 2)) bridges.push(pick.bridge);
  }
  // tůně: malé rybníčky na rovinkách mimo farmu, řeku a trasy
  const ponds = [];
  const nPond = B.ponds[0] + Math.floor(R() * (B.ponds[1] - B.ponds[0] + 1));
  for (let k = 0; k < 80 && ponds.length < nPond; k++) {
    const a = R() * Math.PI * 2, d = 8 + R() * 16, x = Math.cos(a) * d, z = Math.sin(a) * d, r = 0.6 + R() * (biome === 'mokrady' || biome === 'tajga' ? 1.4 : 0.8);
    if (Math.abs(x) > 26 || Math.abs(z) > 26 || rawH(x, z) > 0.9 || farmDist(x, z) < 2.5 || lineDist(river, x, z) < 2.5 || (rail.length && lineDist(rail, x, z) < 2) || roads.some(rd => lineDist(rd, x, z) < 1.8) || ponds.some(p => Math.hypot(p.x - x, p.z - z) < 4)) continue;
    ponds.push({ x, z, r, y: H0(x, z), k: [R() * 6, R() * 6, 0.18 + R() * 0.15, 0.08 + R() * 0.12, 2 + Math.floor(R() * 2)] });
  }
  for (const p of ponds) p.rad = th => p.r * (1 + p.k[2] * Math.sin(p.k[4] * th + p.k[0]) + p.k[3] * Math.sin((p.k[4] + 2) * th + p.k[1])); // tvar tůně
  const H = (x, z) => {
    let h = H0(x, z);
    if (inRegion(x, z)) return h;
    for (const p of ponds) { const d = Math.hypot(x - p.x, z - p.z); if (d < p.r * 1.5 + 0.7) { const pr = p.rad(Math.atan2(z - p.z, x - p.x)), t = Math.max(0, (d - pr) / 0.7), w = t * t * (3 - 2 * t); if (t < 1) h = (p.y - 0.12) * (1 - w) + h * w; } }
    if (rail.length) { const [dr, i] = nearest(rail, x, z); if (dr < 1.6 && !railTun[i]) { const y = railProf[i] - 0.08, t = Math.max(0, Math.min(1, (dr - 0.45) / 1.15)), w = t * t * (3 - 2 * t); h = y * (1 - w) + h * w; } } // násyp nebo zářez trati
    if (lineDist(river, x, z) > 1.3) roads.forEach((rd, k) => { const [d, i] = nearest(rd, x, z); if (d < 1.1) { const y = roadProf[k][i] - 0.04, t = Math.max(0, Math.min(1, (d - 0.25) / 0.85)), w = t * t * (3 - 2 * t); h = y * (1 - w) + h * w; } }); // násyp cesty
    return h;
  };
  return { seed, biome, B, cells, river, rail, railProf, railTun, roads, roadProf, bridges, ponds, peaks, H, H0, rawH, farmDist };
}
// Kam smí budova: políčko farmy, ne rybníček ani statek, volné
export function canPlace(W, q, r, taken) {
  const c = (W.cells || W).get(K(q, r));
  return !!c && c.t !== 'yard' && c.t !== 'pond' && !taken.has(K(q, r));
}
export const validTiles = (W, taken) => [...(W.cells || W).values()].filter(c => canPlace(W, c.q, c.r, taken)).map(c => [c.q, c.r]);
export function autoPlace(W, pos, ids) {
  const taken = new Set(Object.values(pos).map(p => K(p[0], p[1])));
  const free = validTiles(W, taken).sort((a, b) => hexDist(a[0], a[1]) - hexDist(b[0], b[1]) || hash(a[0], a[1], 9) - hash(b[0], b[1], 9));
  for (const id of ids) if (!pos[id] && free.length) { const p = free.shift(); pos[id] = p; taken.add(K(p[0], p[1])); }
  return pos;
}
// Typ políčka: hráčova úprava má přednost před vygenerovaným
export const tileType = (W, tiles, q, r) => (tiles && tiles[K(q, r)]) || ((W.cells || W).get(K(q, r)) || {}).t;
export const neighbors = (q, r) => DIRS.map(([a, b]) => [q + a, r + b]);

const TCOL = { yard: 0xd9c79a, meadow: 0x9fd06f, field: 0xe3bf4a, forest: 0x6aa553, pond: 0x7cc0e8, base: 0xb5d98a };

export async function mountFarm(el, items, onPick, opts = {}) {
  const THREE = await import('../vendor/three/three.module.min.js');
  const W = opts.world, tiles = opts.tiles || {}, roads = new Set(opts.roads || []), pos = opts.pos || {};
  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
  renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  el.appendChild(renderer.domElement);
  const labels = document.createElement('div'); labels.className = 'flabels'; el.appendChild(labels);
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0xbfe3f5); scene.fog = new THREE.Fog(0xbfe3f5, 38, 95);
  const cam = new THREE.PerspectiveCamera(42, 1, 0.1, 160);
  const hemi = new THREE.HemisphereLight(0xffffff, 0x6a8a4a, 0.9); scene.add(hemi);
  const sun = new THREE.DirectionalLight(0xfff0d0, 1.55); sun.position.set(12, 20, 8); sun.castShadow = true;
  sun.shadow.mapSize.set(1024, 1024); Object.assign(sun.shadow.camera, { left: -13, right: 13, top: 13, bottom: -13 }); scene.add(sun);
  // skutečný čas a počasí (MET): noc, soumrak, zima/podzim, déšť, sníh, mlha, duha
  const env = opts.env || {}, nowD = new Date(), hour = env.hour ?? nowD.getHours() + nowD.getMinutes() / 60, month = env.month ?? nowD.getMonth() + 1;
  const season = month === 12 || month <= 2 ? 'winter' : month >= 9 && month <= 11 ? 'autumn' : 'summer', winter = season === 'winter' && env.cond !== 'hot';
  const night = hour < 6 || hour >= 20.5, dusk = !night && (hour < 7.5 || hour >= 19), sym = env.sym || '';
  const fog = /fog/.test(sym), snowing = env.cond === 'snow', raining = env.cond === 'rain' && !snowing, gloomy = fog || raining || snowing;
  const sky = night ? 0x1a2238 : dusk ? 0xf0b58a : gloomy ? 0xa9b4bd : 0xbfe3f5;
  scene.background.setHex(sky); scene.fog.color.setHex(sky);
  if (fog) { scene.fog.near = 6; scene.fog.far = 34; } else if (gloomy) { scene.fog.near = 22; scene.fog.far = 70; }
  if (night) { hemi.intensity = 0.3; hemi.color.setHex(0x8ea0d0); sun.intensity = 0.35; sun.color.setHex(0x9fb4ff); }
  else if (dusk) { sun.intensity = 1.1; sun.color.setHex(0xffb070); sun.position.set(18, 6, hour < 12 ? -6 : 8); }
  else if (gloomy) { sun.intensity = 0.7; hemi.intensity = 0.8; }
  const winMat = new THREE.MeshStandardMaterial({ color: night || dusk ? 0x3a3020 : 0x4a6070, emissive: 0xffc860, emissiveIntensity: night ? 1.3 : dusk ? 0.5 : 0 });
  const uT = { value: 0 }, windK = raining || snowing ? 2 : 1;
  // vítr: koruny stromů a obilí se vlní (posun vrcholů podle výšky, fáze podle polohy)
  const SWAY_GLSL = '#include <begin_vertex>\n#ifdef USE_INSTANCING\n float ph = instanceMatrix[3].x * 0.7 + instanceMatrix[3].z * 0.5;\n#else\n float ph = modelMatrix[3].x * 0.7 + modelMatrix[3].z * 0.5;\n#endif\n float sw = max(0.0, position.y + 0.4) * uAmp;\n transformed.x += sin(uT * 1.6 + ph) * sw; transformed.z += cos(uT * 1.3 + ph) * sw * 0.6;';
  const sway = (m, amp) => { m.onBeforeCompile = sh => { sh.uniforms.uT = uT; sh.uniforms.uAmp = { value: amp * windK }; sh.vertexShader = 'uniform float uT;\nuniform float uAmp;\n' + sh.vertexShader.replace('#include <begin_vertex>', SWAY_GLSL); }; return m; };
  const grainMat = sway(new THREE.MeshStandardMaterial({ color: 0xc9a12e, roughness: 0.85, flatShading: true }), 0.12);
  const mats = {};
  const mat = (c, o = {}) => { const k = c + JSON.stringify(o); return mats[k] || (mats[k] = new THREE.MeshStandardMaterial({ color: c, roughness: 0.85, flatShading: true, ...o })); };
  let dirty = true;

  /* krajina bez hexů: terén s horami, sněhem a údolím řeky */
  const SIZE = 56, SEG = 140;
  const tg = new THREE.PlaneGeometry(SIZE, SIZE, SEG, SEG); tg.rotateX(-Math.PI / 2);
  const SNOWC = new THREE.Color(0xf2f6f9), AUTC = new THREE.Color(0xc2a656);
  const P = tg.attributes.position, cols = new Float32Array(P.count * 3), col = new THREE.Color();
  for (let i = 0; i < P.count; i++) {
    const x = P.getX(i), z = P.getZ(i), h = W.H(x, z) - 0.02; P.setY(i, h);
    const dRiv = lineDist(W.river, x, z);
    const GB = W.B || { snow: 3.1, grass: [0x86bd5c, 0x7cb455] };
    if (h > GB.snow) col.setHex(0xf4f7fa); else if (h > Math.min(GB.snow - 0.9, 2.6)) col.setHex(0x8f8a84); else if (h > 1.6) col.setHex(0x5e8f45); else if (dRiv < 1.2) col.setHex(0xcbb98a); else col.setHex(hash(Math.round(x * 2), Math.round(z * 2), 7) < 0.5 ? GB.grass[0] : GB.grass[1]);
    if (winter) col.lerp(SNOWC, h > 2.2 ? 0.55 : 0.85); else if (season === 'autumn' && h < 1.6) col.lerp(AUTC, 0.25);
    cols.set([col.r, col.g, col.b], i * 3);
  }
  tg.setAttribute('color', new THREE.BufferAttribute(cols, 3)); tg.computeVertexNormals();
  const ground = new THREE.Mesh(tg, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.95, flatShading: true })); ground.receiveShadow = true; scene.add(ground);

  // řeka jako stuha
  const ribbon = (pts, width, y, color) => {
    const v = [], idx = [];
    pts.forEach(([x, z], i) => { const [ax, az] = pts[Math.max(0, i - 1)], [bx, bz] = pts[Math.min(pts.length - 1, i + 1)], ddx = bx - ax, ddz = bz - az, l = Math.hypot(ddx, ddz) || 1, nx = -ddz / l * width / 2, nz = ddx / l * width / 2;
      v.push(x + nx, y, z + nz, x - nx, y, z - nz); if (i) { const k = i * 2; idx.push(k - 2, k - 1, k, k - 1, k + 1, k); } });
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(v, 3)); g.setIndex(idx); g.computeVertexNormals();
    const m = new THREE.Mesh(g, new THREE.MeshStandardMaterial({ color, roughness: 0.2, metalness: 0.05, side: THREE.DoubleSide })); scene.add(m); return m;
  };
  ribbon(W.river, 1.1, -0.06, 0x4fa3d8);

  // železnice: pražce a kolejnice (InstancedMesh), přes řeku most s pilíři
  const PR = W.railProf, TN = W.railTun;
  const R = W.rail, dummy = new THREE.Object3D();
  const sleepers = new THREE.InstancedMesh(new THREE.BoxGeometry(0.5, 0.05, 0.12), mat(0x6a4a2a), R.length * 2), rails = new THREE.InstancedMesh(new THREE.BoxGeometry(0.04, 0.05, 1), mat(0x9aa0a6, { metalness: 0.6, roughness: 0.4 }), (R.length - 1) * 2);
  let si = 0, ri = 0;
  function portal(x, y, z, ang) {
    const g = new THREE.Group();
    const face = new THREE.Mesh(new THREE.BoxGeometry(1.5, 1.0, 0.35), mat(0x8a847a)); face.position.y = 0.42; face.castShadow = true; g.add(face);
    const hole = new THREE.Mesh(new THREE.CylinderGeometry(0.36, 0.36, 0.4, 14, 1, false, -Math.PI / 2, Math.PI), mat(0x15130f, { flatShading: false })); hole.rotation.z = Math.PI / 2; hole.rotation.y = Math.PI / 2; hole.position.y = 0.32; g.add(hole);
    const sq = new THREE.Mesh(new THREE.BoxGeometry(0.72, 0.32, 0.4), mat(0x15130f)); sq.position.y = 0.16; g.add(sq);
    const arch = new THREE.Mesh(new THREE.TorusGeometry(0.42, 0.07, 6, 14, Math.PI), mat(0x6a645b)); arch.position.set(0, 0.32, 0.19); g.add(arch);
    g.position.set(x, y - 0.06, z); g.rotation.y = ang; scene.add(g);
  }
  for (let i = 1; i < R.length; i++) {
    const [ax, az] = R[i - 1], [bx, bz] = R[i], len = Math.hypot(bx - ax, bz - az), ang = Math.atan2(bx - ax, bz - az), ya = PR[i - 1], yb = PR[i], pitch = Math.atan2(ya - yb, len);
    if (TN[i - 1] && TN[i]) continue;
    if (TN[i] !== TN[i - 1]) portal(TN[i] ? bx : ax, TN[i] ? yb : ya, TN[i] ? bz : az, ang);
    for (const f of [0.25, 0.75]) { dummy.position.set(ax + (bx - ax) * f, ya + (yb - ya) * f, az + (bz - az) * f); dummy.rotation.set(pitch, ang, 0, 'YXZ'); dummy.scale.set(1, 1, 1); dummy.updateMatrix(); sleepers.setMatrixAt(si++, dummy.matrix); }
    for (const s3 of [-0.16, 0.16]) { const nx = Math.cos(ang) * s3, nz = -Math.sin(ang) * s3; dummy.position.set((ax + bx) / 2 + nx, (ya + yb) / 2 + 0.04, (az + bz) / 2 + nz); dummy.rotation.set(pitch, ang, 0, 'YXZ'); dummy.scale.set(1, 1, len + 0.02); dummy.updateMatrix(); rails.setMatrixAt(ri++, dummy.matrix); }
  }
  sleepers.count = si; rails.count = ri; scene.add(sleepers, rails);
  // mosty přes řeku (předem dané: železnice a cesty)
  for (const [x, z, a] of W.bridges) { const deck = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.1, 3.2), mat(0x8a6a44)); deck.position.set(x, 0.55, z); deck.rotation.y = a; deck.castShadow = true; scene.add(deck); for (const s2 of [-1, 1]) { const rl = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.18, 3.2), mat(0x5a4028)); rl.position.set(x + Math.cos(a) * 0.42 * s2, 0.62, z - Math.sin(a) * 0.42 * s2); rl.rotation.y = a; scene.add(rl); } for (const t2 of [-1.2, 0, 1.2]) { const pil = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.7, 0.2), mat(0x8a8580)); pil.position.set(x + Math.sin(a) * t2, 0.15, z + Math.cos(a) * t2); scene.add(pil); } }
  // cesty v krajině (kostra), po terénu
  W.roads.forEach((pts, ri2) => {
    const v = [], idx = [], w2 = 0.32, RP = W.roadProf[ri2];
    pts.forEach(([x, z], i) => { const [ax, az] = pts[Math.max(0, i - 1)], [bx, bz] = pts[Math.min(pts.length - 1, i + 1)], l = Math.hypot(bx - ax, bz - az) || 1, nx = -(bz - az) / l * w2 / 2, nz = (bx - ax) / l * w2 / 2, y = RP[i] + 0.02, onBridge = W.bridges.some(b => Math.hypot(b[0] - x, b[1] - z) < 1.45);
      v.push(x + nx, onBridge ? -5 : y, z + nz, x - nx, onBridge ? -5 : y, z - nz); if (i) { const k = i * 2; idx.push(k - 2, k - 1, k, k - 1, k + 1, k); } }); // na mostě vede cesta po mostovce
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(v, 3)); g.setIndex(idx); g.computeVertexNormals();
    const m = new THREE.Mesh(g, new THREE.MeshStandardMaterial({ color: 0xd8c59a, roughness: 0.9, side: THREE.DoubleSide })); m.receiveShadow = true; scene.add(m);
  });
  const ponds3 = [];
  // tůně s rákosím
  for (const p of W.ponds || []) {
    const sh = new THREE.Shape(); for (let k = 0; k <= 28; k++) { const th = k / 28 * Math.PI * 2, rr = p.rad(th); k ? sh.lineTo(Math.cos(th) * rr, Math.sin(th) * rr) : sh.moveTo(Math.cos(th) * rr, Math.sin(th) * rr); }
    const w = new THREE.Mesh(new THREE.ShapeGeometry(sh), winter ? mat(0xdcecf4, { roughness: 0.5 }) : mat(0x4f9ad0, { roughness: 0.15, flatShading: false })); w.rotation.x = -Math.PI / 2; w.scale.z = -1; w.position.set(p.x, p.y - 0.09, p.z); w.userData.pond = true; scene.add(w); ponds3.push(w);
    for (let k = 0; k < 9; k++) { const th = k / 9 * Math.PI * 2 + p.k[0], rr = p.rad(th), rd = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.02, 0.3, 4), mat(0x6a8a3a)); rd.position.set(p.x + Math.cos(th) * rr, p.y + 0.02, p.z + Math.sin(th) * rr); scene.add(rd); }
  }
  // vláček (lokomotiva + 2 vagony) jede z okraje na okraj a znovu
  const cars = [];
  [[0xc0392b, 0.62], [0x2f7d4f, 0.55], [0xe0a82e, 0.55]].forEach(([c, l], i) => { const g = new THREE.Group(); const b = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.32, l), mat(c)); b.position.y = 0.24; b.castShadow = true; g.add(b); if (!i) { const ch = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.25, 8), mat(0x2b2b2b)); ch.position.set(0, 0.48, 0.18); g.add(ch); } cars.push(g); scene.add(g); });
  if (Object.values(opts.decor || {}).includes('station')) cars.slice(1).forEach(c => { for (const dz of [-0.13, 0.13]) { const cr = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.18, 0.22), mat(0xb98a4e)); cr.position.set(0, 0.49, dz); cr.castShadow = true; c.add(cr); } });
  const railLen = []; let acc = 0; R.forEach((p, i) => { if (i) acc += Math.hypot(p[0] - R[i - 1][0], p[1] - R[i - 1][1]); railLen.push(acc); });
  const railAt = s => { s = Math.max(0, Math.min(acc, s)); let i = 1; while (i < railLen.length - 1 && railLen[i] < s) i++; const seg = railLen[i] - railLen[i - 1] || 1, t = (s - railLen[i - 1]) / seg, [ax, az] = R[i - 1], [bx, bz] = R[i], x = ax + (bx - ax) * t, z = az + (bz - az) * t; return [x, PR[i - 1] + (PR[i] - PR[i - 1]) * t, z, Math.atan2(bx - ax, bz - az), Math.atan2(PR[i - 1] - PR[i], seg)]; };
  let trainS = 0;
  const placeTrain = () => cars.forEach((c, i) => { const [x, y, z, a, p] = railAt(trainS - i * 0.7); c.position.set(x, y, z); c.rotation.set(p, a, 0, 'YXZ'); });
  placeTrain();

  // lesy a louky v krajině: maska z plynulého šumu → souvislé lesy, mezi nimi louky s květy, ojedinělé stromy
  const sd = W.seed % 997, forestMask = (x, z) => Math.sin(x * 0.23 + sd) * Math.sin(z * 0.19 + sd * 1.3) + Math.sin((x + z) * 0.13 + sd * 0.4) * 0.6 + Math.sin(x * 0.5 - z * 0.4 + sd) * 0.25;
  const free = (x, z, h) => !(h < 0.08 || h > 2.6 || W.cells.has(K(...hexAt(x, z))) || W.farmDist(x, z) < 1.3 || lineDist(W.river, x, z) < 1.4 || (W.rail.length && lineDist(W.rail, x, z) < 0.8) || W.roads.some(rd => lineDist(rd, x, z) < 0.55) || (W.ponds || []).some(p => Math.hypot(p.x - x, p.z - z) < p.r + 0.4));
  const R2 = rng(W.seed + 11), conifers = [], broad = [], flowers = [];
  for (let i = 0; i < 9000 && conifers.length + broad.length < 1900; i++) {
    const x = (R2() - 0.5) * SIZE * 0.96, z = (R2() - 0.5) * SIZE * 0.96, h = W.H(x, z), m = forestMask(x, z);
    if (!free(x, z, h)) continue;
    const inForest = m > (W.B ? W.B.forest : 0.45) - h * 0.15, solo = R2() < 0.03;
    if (!inForest && !solo) { if (m < -0.35 && flowers.length < 700 && R2() < 0.35) flowers.push([x, h, z]); continue; }
    (h > 1.4 || R2() < (W.B ? W.B.conifer : 0.55) ? conifers : broad).push([x, h, z, 0.65 + R2() * 0.7]);
  }
  const inst = (geo, material, list, place2) => { const im = new THREE.InstancedMesh(geo, material, Math.max(1, list.length)); list.forEach((t, i) => { place2(t); dummy.updateMatrix(); im.setMatrixAt(i, dummy.matrix); }); im.count = list.length; return im; };
  const all = [...conifers, ...broad];
  scene.add(inst(new THREE.CylinderGeometry(0.05, 0.07, 0.3, 5), mat(0x7a5232), all, ([x, h, z, sc]) => { dummy.position.set(x, h + 0.15 * sc, z); dummy.rotation.set(0, 0, 0); dummy.scale.setScalar(sc); }));
  const cM = inst(new THREE.ConeGeometry(0.3, 0.8, 6), sway(new THREE.MeshStandardMaterial({ color: winter ? 0x5f7f6a : 0x3f7a3a, roughness: 0.85, flatShading: true }), 0.05), conifers, ([x, h, z, sc]) => { dummy.position.set(x, h + 0.65 * sc, z); dummy.scale.setScalar(sc); }); cM.castShadow = true; scene.add(cM);
  const bM = inst(new THREE.IcosahedronGeometry(0.34, 0), sway(new THREE.MeshStandardMaterial({ color: season === 'autumn' ? 0xffffff : winter ? 0x8a7560 : 0x5f9a3e, roughness: 0.85, flatShading: true }), 0.07), broad, ([x, h, z, sc]) => { dummy.position.set(x, h + 0.55 * sc, z); const k = winter ? 0.55 : 1; dummy.scale.set(sc * k, sc * 0.9 * k, sc * k); }); bM.castShadow = true; scene.add(bM);
  if (season === 'autumn') { const AUT = [0xd9822b, 0xc0392b, 0xe0b02e, 0x8f9a3e, 0xb5652a]; broad.forEach((_, i) => bM.setColorAt(i, col.setHex(AUT[i % 5]))); }
  const fl = [0xf2d64b, 0xf48fb1, 0xffffff, 0xb39ddb];
  if (!winter) fl.forEach((c, k) => scene.add(inst(new THREE.SphereGeometry(0.045, 5, 4), mat(c), flowers.filter((_, i) => i % 4 === k), ([x, h, z]) => { dummy.position.set(x, h + 0.04, z); dummy.scale.setScalar(1); })));
  const spots = W.roads.flatMap((rd, k) => [rd[16], rd[30], rd[44]].map(p => p && [p, k])).filter(Boolean);
  for (let i = 0; i < spots.length; i++) { const [[x, z], k] = spots[i], rd = W.roads[k], j = rd.findIndex(p => p[0] === x && p[1] === z), nb = rd[Math.min(rd.length - 1, j + 1)], dx2 = nb[0] - x, dz2 = nb[1] - z, l2 = Math.hypot(dx2, dz2) || 1, sideS = i % 2 ? 1 : -1, ox = x - dz2 / l2 * 0.8 * sideS, oz = z + dx2 / l2 * 0.8 * sideS, h = W.H(ox, oz);
    if (h > 1.2 || lineDist(W.river, ox, oz) < 2 || W.bridges.some(b => Math.hypot(b[0] - ox, b[1] - oz) < 2.5) || W.roads.some(r3 => lineDist(r3, ox, oz) < 0.45)) continue; /* dům ne na mostě, u řeky ani na cestě */ const g = new THREE.Group(); const b = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.35, 0.4), mat(0xf2e6cc)); b.position.y = 0.17; const rf = new THREE.Mesh(new THREE.ConeGeometry(0.42, 0.3, 4), mat(0xb8442e)); rf.position.y = 0.5; rf.rotation.y = Math.PI / 4; b.castShadow = rf.castShadow = true; const wn = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.1, 0.02), winMat); wn.position.set(0.1, 0.2, 0.205); const wn2 = wn.clone(); wn2.position.x = -0.1; g.add(b, rf, wn, wn2); g.rotation.y = Math.atan2(sideS * dz2, -sideS * dx2); g.position.set(ox, h, oz); scene.add(g); }

  const emoTex = {};
  const sprite = (ch, sz) => { const tex = emoTex[ch] || (emoTex[ch] = (() => { const c = document.createElement('canvas'); c.width = c.height = 64; const x = c.getContext('2d'); x.font = '50px serif'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText(ch, 32, 36); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t; })()); const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false })); sp.scale.setScalar(sz); sp.center.set(0.5, 0); return sp; };
  const pathLen = pts => { const L = [0]; for (let i = 1; i < pts.length; i++) L.push(L[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1])); return L; };
  const pathAt = (pts, L, d) => { d = Math.max(0, Math.min(L[L.length - 1], d)); let i = 1; while (i < L.length - 1 && L[i] < d) i++; const t = (d - L[i - 1]) / (L[i] - L[i - 1] || 1), [ax, az] = pts[i - 1], [bx, bz] = pts[i]; return [ax + (bx - ax) * t, az + (bz - az) * t, Math.atan2(bx - ax, bz - az)]; };
  // loďka pluje po řece tam a zpět (pod mosty proplouvá)
  const boat = new THREE.Group(), rivL = pathLen(W.river);
  { const hull = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.08, 0.55), mat(0x8a5a32)); hull.position.y = 0.04; const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.4, 4), mat(0x5a3a22)); mast.position.y = 0.26; const sail = new THREE.Mesh(new THREE.ConeGeometry(0.14, 0.32, 3), mat(0xf6f2e6)); sail.scale.z = 0.15; sail.position.set(0, 0.28, 0.06); boat.add(hull, mast, sail); scene.add(boat); }
  let boatS = rivL[rivL.length - 1] * 0.3, boatDir = 1;
  // zvěř: srny a zajíci se pasou na loukách, chodí od místa k místu
  const walkers = [], RW = rng(W.seed + 23);
  const freeSpot = (cx, cz, r) => { for (let k = 0; k < 30; k++) { const x = cx + (RW() - 0.5) * 2 * r, z = cz + (RW() - 0.5) * 2 * r, h = W.H(x, z); if (Math.abs(x) < SIZE / 2 - 1 && Math.abs(z) < SIZE / 2 - 1 && free(x, z, h) && h < 1.4) return [x, z]; } return null; };
  for (const [ch, n, sz, sp] of [['🦌', 2, 0.55, 0.5], ['🐇', 3, 0.3, 0.9]]) for (let i = 0; i < n; i++) { const p = freeSpot(0, 0, SIZE / 2 - 3); if (!p) continue; const s2 = sprite(ch, sz); scene.add(s2); walkers.push({ s: s2, x: p[0], z: p[1], hx: p[0], hz: p[1], r: 3, tx: p[0], tz: p[1], sp, wait: RW() * 3, land: true }); }
  // ptáci kroužící nad krajinou (ve dne a bez deště)
  const birds = [];
  if (!night && !gloomy) for (let i = 0; i < 7; i++) { const g = new THREE.Group(); for (const sd2 of [-1, 1]) { const wg = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.015, 0.06), mat(0x2b2b2b)); wg.position.x = sd2 * 0.1; g.add(wg); } g.userData = { a: i * 0.5 + RW(), r: 7 + RW() * 4, y: 5 + RW() * 1.5, ph: RW() * 6 }; scene.add(g); birds.push(g); }
  // déšť / sníh: částice padají kolem středu farmy
  let drops = null;
  if (raining || snowing) { const N = snowing ? 1400 : 2200, pp = new Float32Array(N * 3); for (let i = 0; i < N; i++) pp.set([(RW() - 0.5) * 34, RW() * 12, (RW() - 0.5) * 34], i * 3); const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(pp, 3)); drops = new THREE.Points(g, new THREE.PointsMaterial({ color: snowing ? 0xffffff : 0xaecbe0, size: snowing ? 0.11 : 0.05, transparent: true, opacity: 0.85, depthWrite: false })); drops.userData.v = snowing ? 1.2 : 9; scene.add(drops); }
  // duha po přeháňce (přes den)
  if (!night && /shower/.test(sym)) ['#e74c3c', '#e67e22', '#f1c40f', '#2ecc71', '#3498db', '#5b4bd6', '#8e44ad'].forEach((c, k) => { const a = new THREE.Mesh(new THREE.TorusGeometry(20 - k * 0.32, 0.16, 4, 64, Math.PI), new THREE.MeshBasicMaterial({ color: c, transparent: true, opacity: 0.32, depthWrite: false, fog: false })); a.position.set(0, -2, -30); scene.add(a); });
  function tickLife(dt, now) {
    uT.value = now / 1000;
    boatS += boatDir * dt * 0.6; if (boatS > rivL[rivL.length - 1] - 1 || boatS < 1) boatDir *= -1;
    const [bx, bz, ba] = pathAt(W.river, rivL, boatS); boat.position.set(bx + Math.cos(ba) * 0.25 * boatDir, -0.06, bz - Math.sin(ba) * 0.25 * boatDir); boat.rotation.y = ba + (boatDir < 0 ? Math.PI : 0);
    for (const w of walkers) {
      if (w.wait > 0) { w.wait -= dt; continue; }
      const dx = w.tx - w.x, dz = w.tz - w.z, d = Math.hypot(dx, dz);
      if (d < 0.05) { const p = w.land ? freeSpot(w.hx, w.hz, w.r) : [w.hx + (RW() - 0.5) * 2 * w.r, w.hz + (RW() - 0.5) * 2 * w.r]; if (p) [w.tx, w.tz] = p; w.wait = 1 + RW() * 4; continue; }
      const st2 = Math.min(d, w.sp * dt); w.x += dx / d * st2; w.z += dz / d * st2;
      w.s.position.set(w.x, (w.land ? W.H(w.x, w.z) : w.y) + (w.hop ? Math.abs(Math.sin(now / 120)) * 0.06 : 0), w.z);
    }
    for (const b of birds) { const u = b.userData; u.a += dt * 0.25; b.position.set(Math.cos(u.a) * u.r, u.y + Math.sin(u.a * 3) * 0.3, Math.sin(u.a) * u.r); b.rotation.y = -u.a; const fl2 = Math.sin(now / 110 + u.ph) * 0.5; b.children[0].rotation.z = fl2; b.children[1].rotation.z = -fl2; }
    if (drops) { const p = drops.geometry.attributes.position, v = drops.userData.v * dt; for (let i = 0; i < p.count; i++) { let y = p.getY(i) - v; if (y < 0) y += 12; p.setY(i, y); if (snowing) p.setX(i, p.getX(i) + Math.sin(now / 900 + i) * dt * 0.2); } p.needsUpdate = true; }
  }
  for (const w of walkers) w.s.position.set(w.x, W.H(w.x, w.z), w.z);

  /* hexová farma: měnitelná políčka (karty) */
  const hexGeo = new THREE.CylinderGeometry(HEX * 0.96, HEX * 0.96, TILE_H, 6), groups = {}, tileMeshes = [], deco = new THREE.Group(); scene.add(deco);
  const occupied = new Set(items.filter(i => pos[i.id]).map(i => K(...pos[i.id])));
  for (const c of W.cells.values()) { const ty = occupied.has(K(c.q, c.r)) ? 'base' : tileType(W, tiles, c.q, c.r); (groups[ty] ||= []).push(c); }
  function tree(x, y, z, s = 1, c = 0x3f7a3a) { const g = new THREE.Group(); const t = new THREE.Mesh(new THREE.CylinderGeometry(0.05 * s, 0.07 * s, 0.3 * s, 5), mat(0x7a5232)); t.position.y = 0.15 * s; const cr = new THREE.Mesh(new THREE.ConeGeometry(0.28 * s, 0.7 * s, 6), mat(c)); cr.position.y = 0.6 * s; cr.castShadow = true; g.add(t, cr); g.position.set(x, y, z); return g; }
  for (const [ty, list] of Object.entries(groups)) {
    const im = new THREE.InstancedMesh(hexGeo, mat(winter ? new THREE.Color(TCOL[ty] || 0x9fd06f).lerp(SNOWC, ty === 'yard' || ty === 'base' ? 0.45 : 0.6).getHex() : TCOL[ty] || 0x9fd06f), list.length); im.receiveShadow = true;
    list.forEach((c, i) => {
      const [x, z] = axial(c.q, c.r); dummy.position.set(x, TILE_H / 2, z); dummy.rotation.set(0, 0, 0); dummy.scale.set(1, 1, 1); dummy.updateMatrix(); im.setMatrixAt(i, dummy.matrix);
      const y = TILE_H, h = hash(c.q, c.r, 4);
      if (ty === 'forest') for (let k = 0; k < 4; k++) deco.add(tree(x + (hash(c.q, c.r, 10 + k) - .5) * 1.0, y, z + (hash(c.q, c.r, 20 + k) - .5) * 1.0, 0.75 + hash(c.q, c.r, 30 + k) * 0.4));
      if (ty === 'field') for (let k = -2; k <= 2; k++) { const b = new THREE.Mesh(new THREE.BoxGeometry(1.15, 0.07, 0.12), grainMat); b.position.set(x, y + 0.035, z + k * 0.27); b.rotation.y = h * 0.6; deco.add(b); }
      if (ty === 'pond') { const w = new THREE.Mesh(new THREE.CylinderGeometry(0.75, 0.75, 0.02, 14), winter ? mat(0xdcecf4, { roughness: 0.5 }) : mat(0x4f9ad0, { roughness: 0.15, flatShading: false })); w.position.set(x, y + 0.01, z); deco.add(w); }
      if (ty === 'meadow' && h < 0.4) { const f = new THREE.Mesh(new THREE.SphereGeometry(0.05, 6, 4), mat([0xf2d64b, 0xf48fb1, 0xffffff][Math.floor(h * 9) % 3])); f.position.set(x + (h - .2), y + 0.03, z + (hash(c.q, c.r, 5) - .5)); deco.add(f); }
    });
    im.userData.tiles = list; tileMeshes.push(im); scene.add(im);
  }
  // cesty na hranách (kreslí hráč) se stromořadím po obou stranách
  const roadG = new THREE.Group(); scene.add(roadG);
  function drawRoads() {
    roadG.clear();
    // hrana = úsečka mezi dvěma rohy; kde se v rohu potkají právě dvě cesty, roh se zaoblí (střídavé zatáčky dají plynulé S)
    const segs = [...roads].map(k => { const [a, b] = k.split('|').map(s => s.split(',').map(Number)), [ax, az] = axial(...a), [bx, bz] = axial(...b), mx = (ax + bx) / 2, mz = (az + bz) / 2, l = Math.hypot(bx - ax, bz - az), px = -(bz - az) / l * HEX / 2, pz = (bx - ax) / l * HEX / 2; return [[mx + px, mz + pz], [mx - px, mz - pz]]; });
    const ck = p => p.map(v => Math.round(v * 20)).join(), deg = new Map();
    for (const sg of segs) for (const p of sg) (deg.get(ck(p)) || deg.set(ck(p), []).get(ck(p))).push(sg);
    const T2 = 0.42, lerp = (p, q, t) => [p[0] + (q[0] - p[0]) * t, p[1] + (q[1] - p[1]) * t], pieces = [];
    for (const [P, Q] of segs) pieces.push([deg.get(ck(P)).length === 2 ? lerp(P, Q, T2) : P, deg.get(ck(Q)).length === 2 ? lerp(Q, P, T2) : Q]);
    for (const [key, list] of deg) if (list.length === 2) { const C = list[0].find(p => ck(p) === key), o = list.map(sg => sg.find(p => ck(p) !== key)), A = lerp(C, o[0], T2), B2 = lerp(C, o[1], T2), pts = []; for (let i = 0; i <= 6; i++) { const t = i / 6, u = 1 - t; pts.push([u * u * A[0] + 2 * u * t * C[0] + t * t * B2[0], u * u * A[1] + 2 * u * t * C[1] + t * t * B2[1]]); } pieces.push(pts); }
    const v = [], idx = [];
    for (const pts of pieces) pts.forEach((p, i) => { const q = pts[Math.min(i + 1, pts.length - 1)], r = pts[Math.max(i - 1, 0)], dx = q[0] - r[0], dz = q[1] - r[1], l = Math.hypot(dx, dz) || 1, nx = -dz / l * 0.1, nz = dx / l * 0.1, k = v.length / 3; v.push(p[0] + nx, TILE_H + 0.02, p[1] + nz, p[0] - nx, TILE_H + 0.02, p[1] - nz); if (i) idx.push(k - 2, k - 1, k, k - 1, k + 1, k); });
    if (v.length) { const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(v, 3)); g.setIndex(idx); g.computeVertexNormals(); const m = new THREE.Mesh(g, new THREE.MeshStandardMaterial({ color: 0xdcc89a, roughness: 0.9, side: THREE.DoubleSide })); m.receiveShadow = true; roadG.add(m); }
    for (const [[x1, z1], [x2, z2]] of segs) {
      const mx = (x1 + x2) / 2, mz = (z1 + z2) / 2, ang = Math.atan2(x2 - x1, z2 - z1);
      const ex = Math.sin(ang), ez = Math.cos(ang), px = Math.cos(ang), pz = -Math.sin(ang);
      for (const t of [-0.2, 0.2]) for (const s of [-0.19, 0.19]) { const tr = new THREE.Mesh(new THREE.SphereGeometry(0.09, 6, 5), mat(0x4f8f3a)); tr.position.set(mx + ex * t + px * s, TILE_H + 0.16, mz + ez * t + pz * s); tr.castShadow = true; const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.02, 0.1, 4), mat(0x7a5232)); stem.position.set(tr.position.x, TILE_H + 0.05, tr.position.z); roadG.add(tr, stem); }
    }
    dirty = true;
  }
  drawRoads();

  /* zvýraznění políček (stavění, přesun) */
  const hl = new THREE.Group(); scene.add(hl);
  const hlMat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.5, depthWrite: false });
  function highlight(list) { hl.clear(); for (const [q, r] of list || []) { const m = new THREE.Mesh(new THREE.CylinderGeometry(HEX * 0.78, HEX * 0.78, 0.02, 6), hlMat); const [x, z] = axial(q, r); m.position.set(x, TILE_H + 0.03, z); hl.add(m); } dirty = true; }

  /* budovy */
  const bgroup = new THREE.Group(); scene.add(bgroup);
  function model(kind, lv, x, z, y = TILE_H) {
    const g = new THREE.Group(), s = 0.75 + 0.05 * Math.min(10, lv);
    const box = (w, h, d, c, yy = h / 2, ox = 0, oz = 0) => { const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat(c)); m.position.set(ox, yy, oz); m.castShadow = m.receiveShadow = true; g.add(m); return m; };
    const roof = (w, d, h, c, yy) => { const m = new THREE.Mesh(new THREE.CylinderGeometry(0.001, w * 0.75, h, 4), mat(c)); m.rotation.y = Math.PI / 4; m.scale.set(1, 1, d / w); m.position.y = yy + h / 2; m.castShadow = true; g.add(m); };
    const fence = (rad, c = 0xc9a16a) => { for (let i = 0; i < 12; i++) { const a = i / 12 * Math.PI * 2; box(0.05, 0.3, 0.05, c, 0.15, Math.cos(a) * rad, Math.sin(a) * rad); } const t = new THREE.Mesh(new THREE.TorusGeometry(rad, 0.02, 4, 24), mat(c)); t.rotation.x = Math.PI / 2; t.position.y = 0.26; g.add(t); };
    if (!lv) { box(0.6, 0.05, 0.6, 0xb08a5a, 0.03); for (const [ox, oz] of [[-.25, -.25], [.25, -.25], [-.25, .25], [.25, .25]]) box(0.04, 0.5, 0.04, 0xc9a16a, 0.25, ox, oz); }
    else if (kind === 'home') { box(0.9, 0.5, 0.7, 0xf2e6cc); roof(0.9, 0.7, 0.4, 0xb8442e, 0.5); box(0.15, 0.25, 0.02, 0x7a4a2a, 0.13, 0, 0.36); }
    else if (kind === 'enc_voliera') { const c = new THREE.Mesh(new THREE.CylinderGeometry(0.45, 0.45, 0.7, 10, 1, true), new THREE.MeshStandardMaterial({ color: 0x9aa0a6, wireframe: true })); c.position.y = 0.35; g.add(c); const t = new THREE.Mesh(new THREE.ConeGeometry(0.5, 0.3, 10), mat(0x6a8a4a)); t.position.y = 0.85; g.add(t); box(0.1, 0.4, 0.1, 0x8a5a3a, 0.2); }
    else if (kind === 'enc_vybeh') { fence(0.6); box(0.35, 0.3, 0.3, 0xb07a4a, 0.15, 0.15, -0.1); roof(0.35, 0.3, 0.18, 0x7a4a2a, 0.3); }
    else if (kind === 'enc_rybnik') { const w = new THREE.Mesh(new THREE.CylinderGeometry(0.6, 0.6, 0.06, 16), new THREE.MeshStandardMaterial({ color: 0x4f9ad0, roughness: 0.15 })); w.position.y = 0.05; g.add(w); for (let i = 0; i < 6; i++) box(0.03, 0.35, 0.03, 0x6a8a3a, 0.2, Math.cos(i) * 0.62, Math.sin(i) * 0.62); }
    else if (kind === 'enc_terarium') { const gl = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.45, 0.55), new THREE.MeshStandardMaterial({ color: 0xbfe6f0, transparent: true, opacity: 0.45, roughness: 0.1 })); gl.position.y = 0.3; g.add(gl); box(0.82, 0.08, 0.57, 0x7a5a3a, 0.04); }
    else if (kind === 'enc_insektarium') { box(0.5, 0.6, 0.25, 0xc98a4a, 0.3); roof(0.55, 0.3, 0.25, 0x8a5a2a, 0.6); for (let i = 0; i < 3; i++) box(0.12, 0.1, 0.02, 0x5a3a1a, 0.15 + i * 0.15, 0, 0.13); }
    else if (kind === 'lumber') { for (let i = 0; i < 3; i++) { const l = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 0.7, 8), mat(0x9a6a3a)); l.rotation.z = Math.PI / 2; l.position.set(0, 0.1 + i * 0.15, (i - 1) * 0.12); l.castShadow = true; g.add(l); } g.add(tree(0.45, 0, 0.35, 0.8)); }
    else if (kind === 'quarry') { for (let i = 0; i < 4; i++) { const r = new THREE.Mesh(new THREE.DodecahedronGeometry(0.2 + 0.05 * i), mat(0x8f8a80)); r.position.set((i % 2 - .5) * 0.4, 0.15 + (i > 1 ? 0.15 : 0), (i < 2 ? -0.15 : 0.15)); r.castShadow = true; g.add(r); } }
    else if (kind === 'nursery') { const gh = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.3, 0.8, 12, 1, false, 0, Math.PI), new THREE.MeshStandardMaterial({ color: 0xdff2f8, transparent: true, opacity: 0.55, side: THREE.DoubleSide })); gh.rotation.z = Math.PI / 2; gh.position.y = 0.05; g.add(gh); box(0.7, 0.05, 0.55, 0x6a4a2a, 0.03); }
    else if (kind === 'field') { for (let i = -2; i <= 2; i++) box(0.9, 0.18, 0.12, 0xe0c24a, 0.1, 0, i * 0.18); }
    else if (kind === 'orchard') { for (const [ox, oz] of [[-.3, -.2], [.3, -.2], [0, .3]]) { g.add(tree(ox, 0, oz, 0.75, 0x5a9a3a)); const a = new THREE.Mesh(new THREE.SphereGeometry(0.05, 6, 4), mat(0xd9304a)); a.position.set(ox + 0.1, 0.5, oz + 0.1); g.add(a); } }
    else if (kind === 'worms') { box(0.8, 0.12, 0.5, 0x5a3a22, 0.06); box(0.84, 0.16, 0.04, 0x9a6a3a, 0.08, 0, 0.26); box(0.84, 0.16, 0.04, 0x9a6a3a, 0.08, 0, -0.26); }
    else if (kind === 'store') { box(0.8, 0.5, 0.6, 0xa8673a); roof(0.85, 0.65, 0.35, 0x6a3a22, 0.5); box(0.3, 0.32, 0.02, 0x5a2a12, 0.16, 0, 0.31); }
    else if (kind === 'pantry') { box(0.55, 0.45, 0.45, 0xe8d6a8); roof(0.6, 0.5, 0.3, 0x9a5a2a, 0.45); }
    else box(0.5, 0.4, 0.5, 0xcccccc);
    g.scale.setScalar(s); g.position.set(x, y, z); return g;
  }
  scene.add(model('home', 2, ...axial(0, 0)));
  // ozdoby (jen vzhled)
  const decoG = new THREE.Group(); scene.add(decoG);
  function decoModel(t, x, z) {
    const g = new THREE.Group(), box = (w, h, d, c, y = h / 2, ox = 0, oz = 0) => { const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat(c)); m.position.set(ox, y, oz); m.castShadow = true; g.add(m); return m; };
    if (t === 'barn') { box(0.8, 0.45, 0.55, 0x9a3a2a); const rf = new THREE.Mesh(new THREE.CylinderGeometry(0.001, 0.62, 0.35, 4), mat(0x5a3a2a)); rf.rotation.y = Math.PI / 4; rf.scale.set(1, 1, 0.75); rf.position.y = 0.62; g.add(rf); box(0.25, 0.3, 0.02, 0xe8d6a8, 0.15, 0, 0.29); }
    else if (t === 'mill') { box(0.35, 0.8, 0.35, 0xf2e6cc, 0.4); const hub = new THREE.Group(); hub.position.set(0, 0.72, 0.2); for (let i = 0; i < 4; i++) { const b = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.55, 0.02), mat(0x8a6a44)); b.position.y = 0.27; const arm = new THREE.Group(); arm.rotation.z = i * Math.PI / 2; arm.add(b); hub.add(arm); } g.add(hub); }
    else if (t === 'well') { const c = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.22, 0.22, 10), mat(0x8f8a80)); c.position.y = 0.11; g.add(c); box(0.04, 0.4, 0.04, 0x7a5232, 0.32, -0.18); box(0.04, 0.4, 0.04, 0x7a5232, 0.32, 0.18); box(0.5, 0.04, 0.3, 0x6a3a22, 0.54); }
    else if (t === 'chapel') { box(0.35, 0.5, 0.35, 0xf6f2e6, 0.25); const rf = new THREE.Mesh(new THREE.ConeGeometry(0.3, 0.45, 4), mat(0x3a5a8a)); rf.rotation.y = Math.PI / 4; rf.position.y = 0.72; g.add(rf); box(0.03, 0.18, 0.03, 0xd9b84a, 1.02); box(0.12, 0.03, 0.03, 0xd9b84a, 1.04); }
    else if (t === 'beehive') { for (let i = 0; i < 3; i++) box(0.22, 0.22, 0.22, [0xe9b84a, 0xd9a03a, 0xf2c95a][i], 0.11, (i - 1) * 0.3); }
    else if (t === 'scarecrow') { box(0.04, 0.6, 0.04, 0x7a5232, 0.3); box(0.45, 0.04, 0.04, 0x7a5232, 0.45); box(0.22, 0.25, 0.12, 0x3a6aa8, 0.42); const h = new THREE.Mesh(new THREE.SphereGeometry(0.09, 8, 6), mat(0xe8c890)); h.position.y = 0.65; g.add(h); const hat = new THREE.Mesh(new THREE.ConeGeometry(0.13, 0.1, 8), mat(0x8a6a2a)); hat.position.y = 0.76; g.add(hat); }
    else if (t === 'bench') { box(0.55, 0.04, 0.16, 0x8a6a44, 0.18); box(0.55, 0.14, 0.03, 0x8a6a44, 0.3, 0, -0.07); box(0.04, 0.18, 0.14, 0x4a4a4a, 0.09, -0.24); box(0.04, 0.18, 0.14, 0x4a4a4a, 0.09, 0.24); }
    else if (t === 'station') { box(0.95, 0.08, 0.5, 0x9a948a, 0.04); box(0.45, 0.35, 0.3, 0xe8d6a8, 0.25, -0.15, -0.05); const rf = new THREE.Mesh(new THREE.CylinderGeometry(0.001, 0.4, 0.2, 4), mat(0x8a3a2a)); rf.rotation.y = Math.PI / 4; rf.scale.set(1, 1, 0.7); rf.position.set(-0.15, 0.52, -0.05); g.add(rf); box(0.5, 0.03, 0.3, 0x5a5a5a, 0.42, 0.25, 0.05); for (const ox of [0.05, 0.45]) box(0.03, 0.34, 0.03, 0x4a4a4a, 0.25, ox, 0.18); box(0.1, 0.1, 0.02, 0x2b5a8a, 0.36, 0.25, 0.2); }
    else if (t === 'hay') { for (const [ox, oz, s] of [[-0.18, 0, 1], [0.2, 0.1, 0.85], [0, -0.22, 0.75]]) { const hb = new THREE.Mesh(new THREE.SphereGeometry(0.2 * s, 8, 6), mat(0xe0c24a)); hb.scale.y = 0.75; hb.position.set(ox, 0.13 * s, oz); hb.castShadow = true; g.add(hb); } }
    g.position.set(x, TILE_H, z); return g;
  }
  function drawDecor(map2) { decoG.clear(); for (const [k, t] of Object.entries(map2 || {})) { const [q, r] = k.split(',').map(Number); if (!W.cells.has(k)) continue; decoG.add(decoModel(t, ...axial(q, r))); } dirty = true; }
  drawDecor(opts.decor);
  function build(list) {
    bgroup.clear(); labels.innerHTML = ''; for (let i = walkers.length - 1; i >= 0; i--) if (walkers[i].enc) walkers.splice(i, 1);
    for (const it of list) {
      const p = pos[it.id]; if (!p || !W.cells.has(K(...p))) continue;
      const [x, z] = axial(...p), g = model(it.id, it.level, x, z); g.traverse(o => { o.userData.id = it.id; });
      bgroup.add(g);
      if (night || dusk) { const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.02, 0.45, 4), mat(0x3a3a3a)); pole.position.set(x + 0.62, TILE_H + 0.22, z + 0.3); const lamp = new THREE.Mesh(new THREE.SphereGeometry(0.05, 8, 6), winMat); lamp.position.set(x + 0.62, TILE_H + 0.47, z + 0.3); bgroup.add(pole, lamp); }
      (opts.encAnimals && opts.encAnimals[it.id] || []).slice(0, 4).forEach((ch, k) => { const s2 = sprite(ch, 0.32), a = k * 1.7; s2.position.set(x + Math.cos(a) * 0.4, TILE_H, z + Math.sin(a) * 0.4); bgroup.add(s2); walkers.push({ s: s2, x: s2.position.x, z: s2.position.z, hx: x, hz: z, r: 0.45, tx: x, tz: z, sp: 0.25, wait: k, land: false, y: TILE_H, hop: true, enc: true }); });
      const l = document.createElement('button'); l.className = 'flabel s-' + it.status; l.dataset.id = it.id;
      l.innerHTML = `<span>${it.icon}</span><b>${it.level}</b>${it.text ? `<small>${it.text}</small>` : ''}`; l.setAttribute('aria-label', it.name + ', úroveň ' + it.level + (it.text ? ', ' + it.text : ''));
      l._p = new THREE.Vector3(x, TILE_H + 1.1, z); labels.appendChild(l);
    }
    dirty = true;
  }
  build(items);

  /* kamera: otáčení, zoom, posun; stav se pamatuje mezi otevřeními (opts.cam) */
  const st = Object.assign({ th: 0.6, ph: 0.92, d: 19, tx: 0, tz: 0 }, opts.cam || {});
  const place = () => {
    st.ph = Math.max(0.3, Math.min(1.35, st.ph)); st.d = Math.max(5, Math.min(40, st.d));
    st.tx = Math.max(-14, Math.min(14, st.tx)); st.tz = Math.max(-14, Math.min(14, st.tz));
    cam.position.set(st.tx + st.d * Math.sin(st.ph) * Math.sin(st.th), st.d * Math.cos(st.ph), st.tz + st.d * Math.sin(st.ph) * Math.cos(st.th));
    cam.lookAt(st.tx, 0.2, st.tz);
    if (opts.cam) Object.assign(opts.cam, st);
  };
  const pts = new Map(); let gest = null, moved = 0;
  const cv = renderer.domElement; cv.style.touchAction = 'none';
  cv.addEventListener('pointerdown', e => { pts.set(e.pointerId, [e.clientX, e.clientY]); cv.setPointerCapture(e.pointerId); moved = 0; gest = null; });
  cv.addEventListener('pointermove', e => {
    if (!pts.has(e.pointerId)) return;
    const prev = pts.get(e.pointerId), dx = e.clientX - prev[0], dy = e.clientY - prev[1]; pts.set(e.pointerId, [e.clientX, e.clientY]);
    moved += Math.abs(dx) + Math.abs(dy);
    if (pts.size === 1) { st.th -= dx * 0.008; st.ph -= dy * 0.006; }
    else if (pts.size === 2) {
      const [a, b] = [...pts.values()], dist = Math.hypot(a[0] - b[0], a[1] - b[1]), mid = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
      if (gest) { st.d *= gest.dist / Math.max(1, dist); const mx = mid[0] - gest.mid[0], my = mid[1] - gest.mid[1], c = Math.cos(st.th), s = Math.sin(st.th), k = st.d * 0.0018; st.tx -= (mx * c + my * s) * k; st.tz -= (-mx * s + my * c) * k; }
      gest = { dist, mid };
    }
    place(); dirty = true;
  });
  const up = e => { const was = pts.size; pts.delete(e.pointerId); if (pts.size < 2) gest = null; if (was === 1 && moved < 8) pick(e.clientX, e.clientY); };
  cv.addEventListener('pointerup', up); cv.addEventListener('pointercancel', up);
  cv.addEventListener('wheel', e => { e.preventDefault(); st.d *= e.deltaY > 0 ? 1.1 : 0.9; place(); dirty = true; }, { passive: false });
  labels.addEventListener('click', e => { const b = e.target.closest('.flabel'); if (b && !opts.moving && !opts.roadMode) onPick(b.dataset.id); });
  const ray = new THREE.Raycaster(), v2 = new THREE.Vector2();
  function pick(cx, cy) {
    const r = cv.getBoundingClientRect(); v2.set((cx - r.left) / r.width * 2 - 1, -(cy - r.top) / r.height * 2 + 1);
    ray.setFromCamera(v2, cam);
    if (!opts.moving && !opts.roadMode) { const hit = ray.intersectObjects(bgroup.children, true)[0]; if (hit && hit.object.userData.id) { onPick(hit.object.userData.id); return; } }
    const th = ray.intersectObjects(tileMeshes, false)[0];
    if (!th || th.instanceId == null) return;
    const c = th.object.userData.tiles[th.instanceId]; if (!c) return;
    if (opts.roadMode && opts.onEdge) {
      // nejbližší hrana: směr od středu políčka k místu ťuku
      const [x, z] = axial(c.q, c.r), lx = th.point.x - x, lz = th.point.z - z;
      let best = 0, bv = -Infinity; DIRS.forEach(([a, b], i) => { const [nx, nz] = axial(a, b), v = lx * nx + lz * nz; if (v > bv) { bv = v; best = i; } });
      opts.onEdge(edgeKey([c.q, c.r], [c.q + DIRS[best][0], c.r + DIRS[best][1]]));
      return;
    }
    if (opts.onTile) opts.onTile(c.q, c.r);
  }

  /* vykreslení: při změně; vláček ~30 snímků/s */
  let raf = 0, alive = true, Wd = 0, Ht = 0, last = 0, lastOcc = 0;
  const occRay = new THREE.Raycaster();
  const v3 = new THREE.Vector3();
  function frame(now) {
    if (!alive) return;
    raf = requestAnimationFrame(frame);
    const w = el.clientWidth, h = el.clientHeight;
    if (w !== Wd || h !== Ht) { Wd = w; Ht = h; renderer.setSize(w, h, false); cam.aspect = w / Math.max(1, h); cam.updateProjectionMatrix(); dirty = true; }
    if (now - last > 33) { const dt = Math.min(0.1, (now - last) / 1000); if (opts.train !== false) { trainS += dt * 1.4; if (trainS > acc + 2) trainS = -1; placeTrain(); } tickLife(dt, now); last = now; dirty = true; }
    if (!dirty || !w) return;
    dirty = false; renderer.render(scene, cam);
    const occ = now - lastOcc > 120; if (occ) lastOcc = now;
    for (const l of labels.children) {
      if (occ) { const dir = l._p.clone().sub(cam.position), dist = dir.length(); occRay.set(cam.position, dir.normalize()); occRay.far = dist - 0.3; l._hid = occRay.intersectObject(ground, false).length > 0; }
      v3.copy(l._p).project(cam);
      const show = !l._hid && v3.z < 1 && Math.abs(v3.x) < 1.1 && Math.abs(v3.y) < 1.1;
      l.style.display = show ? '' : 'none';
      if (show) l.style.transform = `translate(${(v3.x + 1) / 2 * w}px, ${(1 - v3.y) / 2 * h}px) translate(-50%, -100%)`;
    }
  }
  place(); frame(0);
  return {
    update: list => build(list),
    setMoving: v => { opts.moving = v; },
    setRoadMode: v => { opts.roadMode = v; },
    setDecor: d => drawDecor(d),
    setRoads: list => { roads.clear(); (list || []).forEach(k => roads.add(k)); drawRoads(); },
    highlight,
    snap: () => new Promise(res => { renderer.render(scene, cam); renderer.domElement.toBlob(res, 'image/png'); }),
    focus: id => { const p = pos[id]; if (!p) return; [st.tx, st.tz] = axial(...p); st.d = Math.min(st.d, 10); place(); dirty = true; },
    destroy: () => { alive = false; cancelAnimationFrame(raf); renderer.dispose(); el.innerHTML = ''; }
  };
}
