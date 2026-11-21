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
export function genWorld(seed, must = []) {
  const R = rng(seed), ang = R() * Math.PI * 2;
  // řeka: klikatá čára přes celou mapu, kolem farmy (ne přes statek); šířka meandrů podle seedu
  const off = 5.5 + R() * 3, cx = Math.cos(ang + Math.PI / 2) * off, cz = Math.sin(ang + Math.PI / 2) * off, dx = Math.cos(ang), dz = Math.sin(ang), wob = R() * 6, amp = 1.2 + R() * 2.2, freq = 3 + R() * 4;
  const river = [];
  for (let i = 0; i <= 100; i++) { const t = i / 100 * 2 - 1, w = Math.sin(t * freq + wob) * amp + Math.sin(t * freq * 2.3 + wob * 2) * amp * 0.3; river.push([cx + dx * t * 30 - dz * w, cz + dz * t * 30 + dx * w]); }
  // hory (počet, výška a rozložení podle seedu), kopce blíž
  const peaks = [], nP = 4 + Math.floor(R() * 6), side = R() * Math.PI * 2;
  for (let i = 0; i < nP; i++) { const a = side + (R() - 0.5) * (2.2 + R() * 3), d = 15 + R() * 9; peaks.push({ x: Math.cos(a) * d, z: Math.sin(a) * d, h: 3.2 + R() * 3.8, w: 2.4 + R() * 3 }); }
  const nH = 2 + Math.floor(R() * 6);
  for (let i = 0; i < nH; i++) { const a = R() * Math.PI * 2, d = 10 + R() * 6; peaks.push({ x: Math.cos(a) * d, z: Math.sin(a) * d, h: 0.8 + R() * 1.2, w: 1.6 + R() * 1.6 }); }
  const rough = 0.06 + R() * 0.14;
  const rawH = (x, z) => { let h = 0; for (const p of peaks) h += p.h * Math.exp(-((x - p.x) ** 2 + (z - p.z) ** 2) / (p.w * p.w)); return h + (Math.sin(x * 0.35 + seed) + Math.sin(z * 0.41 + seed * 0.7)) * rough; };
  // farma: roste od statku mezi překážkami; prodloužení podél náhodné osy = nepravidelný tvar
  const mustK = new Set(must.map(p => K(...p))), axis = R() * Math.PI, stretch = R() * 0.25;
  let lim = 0.4, maxD = 9; // když se farma nevejde, druhé kolo dovolí mírné svahy a větší dosah
  const blocked = (q, r) => { if (mustK.has(K(q, r)) || (!q && !r)) return false; const [x, z] = axial(q, r); return hexDist(q, r) > maxD || lineDist(river, x, z) < 1.3 || rawH(x, z) > lim; };
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
  // železnice: z okraje na okraj mapy mimo farmu; přes kopce tunelem
  const ra = R() * Math.PI * 2, rOff = 13 + R() * 3, rdx = Math.cos(ra), rdz = Math.sin(ra), rcx = -rdz * rOff, rcz = rdx * rOff, rw = R() * 6;
  const rail = [];
  for (let i = 0; i <= 200; i++) { const t = i / 200 * 2 - 1, w = Math.sin(t * 2.2 + rw) * 2.5; rail.push([rcx + rdx * t * 32 - rdz * w, rcz + rdz * t * 32 + rdx * w]); }
  // cesty v krajině: z okraje farmy k okraji mapy (2–4), přes řeku po mostech
  const roads = [], nR = 2 + Math.floor(R() * 3);
  for (let k = 0; k < nR; k++) {
    const a = R() * Math.PI * 2, edge = [...cells.values()].map(c => [c, axial(c.q, c.r)]).sort((p, q2) => (q2[1][0] * Math.cos(a) + q2[1][1] * Math.sin(a)) - (p[1][0] * Math.cos(a) + p[1][1] * Math.sin(a)))[0][1];
    const pts = []; for (let i = 0; i <= 40; i++) { const t = i / 40, d = t * 30, bend = Math.sin(t * 3 + k + seed) * 1.5 * t; pts.push([edge[0] + Math.cos(a) * d - Math.sin(a) * bend, edge[1] + Math.sin(a) * d + Math.cos(a) * bend]); }
    roads.push(pts);
  }
  const bridges = [];
  for (const line of [rail, ...roads]) for (let i = 1; i < line.length; i++) { const [x, z] = line[i]; if (lineDist(river, x, z) < 0.4 && !bridges.some(b => Math.hypot(b[0] - x, b[1] - z) < 2)) bridges.push([x, z, Math.atan2(line[i][0] - line[i - 1][0], line[i][1] - line[i - 1][1])]); }
  const inRegion = (x, z) => cells.has(K(...hexAt(x, z)));
  const H = (x, z) => {
    if (inRegion(x, z)) return 0;
    let h = rawH(x, z);
    const fd = farmDist(x, z); if (fd < 2.6) { const t = Math.max(0, (fd - 0.95) / 1.65); h *= t * t * (3 - 2 * t); } // svahy plynule dolů k farmě
    const d = lineDist(river, x, z); if (d < 1.8) h = h * (d / 1.8) ** 2 - 0.25 * (1 - d / 1.8);
    const dr = lineDist(rail, x, z); if (dr < 0.9 && rawH(x, z) < 1.1) h = Math.min(h, 0.6) * (1 - dr / 0.9) + h * (dr / 0.9); // zářez, v kopci tunel
    return h;
  };
  return { seed, cells, river, rail, roads, bridges, peaks, H, rawH };
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
  scene.background = new THREE.Color(0xbfe3f5); scene.fog = new THREE.Fog(0xbfe3f5, 26, 60);
  const cam = new THREE.PerspectiveCamera(42, 1, 0.1, 160);
  scene.add(new THREE.HemisphereLight(0xffffff, 0x6a8a4a, 0.9));
  const sun = new THREE.DirectionalLight(0xfff0d0, 1.55); sun.position.set(12, 20, 8); sun.castShadow = true;
  sun.shadow.mapSize.set(1024, 1024); Object.assign(sun.shadow.camera, { left: -13, right: 13, top: 13, bottom: -13 }); scene.add(sun);
  const mats = {};
  const mat = (c, o = {}) => { const k = c + JSON.stringify(o); return mats[k] || (mats[k] = new THREE.MeshStandardMaterial({ color: c, roughness: 0.85, flatShading: true, ...o })); };
  let dirty = true;

  /* krajina bez hexů: terén s horami, sněhem a údolím řeky */
  const SIZE = 56, SEG = 140;
  const tg = new THREE.PlaneGeometry(SIZE, SIZE, SEG, SEG); tg.rotateX(-Math.PI / 2);
  const P = tg.attributes.position, cols = new Float32Array(P.count * 3), col = new THREE.Color();
  for (let i = 0; i < P.count; i++) {
    const x = P.getX(i), z = P.getZ(i), h = W.H(x, z) - 0.02; P.setY(i, h);
    const dRiv = lineDist(W.river, x, z);
    if (h > 3.1) col.setHex(0xf4f7fa); else if (h > 2.2) col.setHex(0x8f8a84); else if (h > 1.3) col.setHex(0x5e8f45); else if (dRiv < 1.2) col.setHex(0xcbb98a); else col.setHex(hash(Math.round(x * 2), Math.round(z * 2), 7) < 0.5 ? 0x86bd5c : 0x7cb455);
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
  const inTunnel = (x, z) => W.rawH(x, z) >= 1.1 && lineDist(W.river, x, z) > 1.4;
  const railY = (x, z) => lineDist(W.river, x, z) < 1.4 ? 0.55 : inTunnel(x, z) ? 0.6 : Math.max(0.05, W.H(x, z)) + 0.05;
  const R = W.rail, dummy = new THREE.Object3D();
  const sleepers = new THREE.InstancedMesh(new THREE.BoxGeometry(0.5, 0.05, 0.12), mat(0x6a4a2a), R.length * 2), rails = new THREE.InstancedMesh(new THREE.BoxGeometry(0.04, 0.05, 1), mat(0x9aa0a6, { metalness: 0.6, roughness: 0.4 }), (R.length - 1) * 2);
  let si = 0, ri = 0;
  for (let i = 1; i < R.length; i++) {
    const [ax, az] = R[i - 1], [bx, bz] = R[i], len = Math.hypot(bx - ax, bz - az), ang = Math.atan2(bx - ax, bz - az), ya = railY(ax, az), yb = railY(bx, bz);
    if (!(inTunnel(ax, az) && inTunnel(bx, bz))) for (const f of [0.25, 0.75]) { dummy.position.set(ax + (bx - ax) * f, ya + (yb - ya) * f, az + (bz - az) * f); dummy.rotation.set(0, ang, 0); dummy.scale.set(1, 1, 1); dummy.updateMatrix(); sleepers.setMatrixAt(si++, dummy.matrix); }
    if (inTunnel(ax, az) && inTunnel(bx, bz)) { if (i > 1 && !inTunnel(...R[i - 2])) portal(ax, az, ang); continue; }
    if (inTunnel(bx, bz) && !inTunnel(ax, az)) portal(bx, bz, ang);
    for (const s of [-0.16, 0.16]) { const nx = Math.cos(ang) * s, nz = -Math.sin(ang) * s; dummy.position.set((ax + bx) / 2 + nx, (ya + yb) / 2 + 0.04, (az + bz) / 2 + nz); dummy.rotation.set(Math.atan2(ya - yb, len), ang, 0); dummy.scale.set(1, 1, len); dummy.updateMatrix(); rails.setMatrixAt(ri++, dummy.matrix); }
  }
  function portal(x, z, ang) { const p = new THREE.Mesh(new THREE.TorusGeometry(0.42, 0.12, 6, 12, Math.PI), mat(0x7a756e)); p.position.set(x, railY(x, z) - 0.05, z); p.rotation.y = ang + Math.PI / 2; p.castShadow = true; scene.add(p); }
  sleepers.count = si; rails.count = ri; scene.add(sleepers, rails);
  // mosty přes řeku (předem dané: železnice a cesty)
  for (const [x, z, a] of W.bridges) { const deck = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.1, 3.2), mat(0x8a6a44)); deck.position.set(x, 0.5, z); deck.rotation.y = a; deck.castShadow = true; scene.add(deck); for (const s2 of [-1, 1]) { const rl = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.18, 3.2), mat(0x5a4028)); rl.position.set(x + Math.cos(a) * 0.42 * s2, 0.62, z - Math.sin(a) * 0.42 * s2); rl.rotation.y = a; scene.add(rl); } for (const t2 of [-1.2, 0, 1.2]) { const pil = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.7, 0.2), mat(0x8a8580)); pil.position.set(x + Math.sin(a) * t2, 0.15, z + Math.cos(a) * t2); scene.add(pil); } }
  // cesty v krajině (kostra), po terénu
  for (const pts of W.roads) {
    const v = [], idx = [], w2 = 0.32;
    pts.forEach(([x, z], i) => { const [ax, az] = pts[Math.max(0, i - 1)], [bx, bz] = pts[Math.min(pts.length - 1, i + 1)], l = Math.hypot(bx - ax, bz - az) || 1, nx = -(bz - az) / l * w2 / 2, nz = (bx - ax) / l * w2 / 2, y = lineDist(W.river, x, z) < 0.5 ? 0.56 : W.H(x, z) + 0.03;
      v.push(x + nx, y, z + nz, x - nx, y, z - nz); if (i) { const k = i * 2; idx.push(k - 2, k - 1, k, k - 1, k + 1, k); } });
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(v, 3)); g.setIndex(idx); g.computeVertexNormals();
    const m = new THREE.Mesh(g, new THREE.MeshStandardMaterial({ color: 0xd8c59a, roughness: 0.9, side: THREE.DoubleSide })); m.receiveShadow = true; scene.add(m);
  }
  // vláček (lokomotiva + 2 vagony) jede z okraje na okraj a znovu
  const cars = [];
  [[0xc0392b, 0.62], [0x2f7d4f, 0.55], [0xe0a82e, 0.55]].forEach(([c, l], i) => { const g = new THREE.Group(); const b = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.32, l), mat(c)); b.position.y = 0.24; b.castShadow = true; g.add(b); if (!i) { const ch = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.25, 8), mat(0x2b2b2b)); ch.position.set(0, 0.48, 0.18); g.add(ch); } cars.push(g); scene.add(g); });
  const railLen = []; let acc = 0; R.forEach((p, i) => { if (i) acc += Math.hypot(p[0] - R[i - 1][0], p[1] - R[i - 1][1]); railLen.push(acc); });
  const railAt = s => { s = Math.max(0, Math.min(acc, s)); let i = 1; while (i < railLen.length - 1 && railLen[i] < s) i++; const t = (s - railLen[i - 1]) / (railLen[i] - railLen[i - 1] || 1), [ax, az] = R[i - 1], [bx, bz] = R[i], x = ax + (bx - ax) * t, z = az + (bz - az) * t; return [x, railY(x, z), z, Math.atan2(bx - ax, bz - az)]; };
  let trainS = 0;
  const placeTrain = () => cars.forEach((c, i) => { const [x, y, z, a] = railAt(trainS - i * 0.7); c.position.set(x, y, z); c.rotation.y = a; });
  placeTrain();

  // lesy a chalupy v krajině
  const R2 = rng(W.seed + 11), trees = [];
  for (let i = 0; i < 900 && trees.length < 520; i++) {
    const x = (R2() - 0.5) * SIZE * 0.95, z = (R2() - 0.5) * SIZE * 0.95, h = W.H(x, z);
    if (h < 0.15 || h > 2.6 || W.cells.has(K(...hexAt(x, z))) || lineDist(W.river, x, z) < 1.3 || lineDist(W.rail, x, z) < 0.6 || W.roads.some(rd => lineDist(rd, x, z) < 0.45)) continue;
    if (hash(Math.round(x), Math.round(z), W.seed) > 0.55 + h * 0.15) continue;
    trees.push([x, h, z, 0.7 + R2() * 0.7]);
  }
  const trunkM = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.05, 0.07, 0.3, 5), mat(0x7a5232), trees.length), crownM = new THREE.InstancedMesh(new THREE.ConeGeometry(0.3, 0.8, 6), mat(0x3f7a3a), trees.length);
  trees.forEach(([x, h, z, s], i) => { dummy.position.set(x, h + 0.15 * s, z); dummy.rotation.set(0, 0, 0); dummy.scale.setScalar(s); dummy.updateMatrix(); trunkM.setMatrixAt(i, dummy.matrix); dummy.position.y = h + 0.65 * s; dummy.updateMatrix(); crownM.setMatrixAt(i, dummy.matrix); });
  crownM.castShadow = true; scene.add(trunkM, crownM);
  const spots = W.roads.flatMap(rd => [rd[14], rd[24], rd[34]]).filter(Boolean);
  for (let i = 0; i < spots.length; i++) { const [x, z] = spots[i]; const ox = x + 0.7 * (i % 2 ? 1 : -1), oz = z + 0.5, h = W.H(ox, oz); if (h > 1.2 || lineDist(W.river, ox, oz) < 1.2) continue; const g = new THREE.Group(); const b = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.35, 0.4), mat(0xf2e6cc)); b.position.y = 0.17; const rf = new THREE.Mesh(new THREE.ConeGeometry(0.42, 0.3, 4), mat(0xb8442e)); rf.position.y = 0.5; rf.rotation.y = Math.PI / 4; b.castShadow = rf.castShadow = true; g.add(b, rf); g.position.set(ox, h, oz); scene.add(g); }

  /* hexová farma: měnitelná políčka (karty) */
  const hexGeo = new THREE.CylinderGeometry(HEX * 0.96, HEX * 0.96, TILE_H, 6), groups = {}, tileMeshes = [], deco = new THREE.Group(); scene.add(deco);
  const occupied = new Set(items.filter(i => pos[i.id]).map(i => K(...pos[i.id])));
  for (const c of W.cells.values()) { const ty = occupied.has(K(c.q, c.r)) ? 'base' : tileType(W, tiles, c.q, c.r); (groups[ty] ||= []).push(c); }
  function tree(x, y, z, s = 1, c = 0x3f7a3a) { const g = new THREE.Group(); const t = new THREE.Mesh(new THREE.CylinderGeometry(0.05 * s, 0.07 * s, 0.3 * s, 5), mat(0x7a5232)); t.position.y = 0.15 * s; const cr = new THREE.Mesh(new THREE.ConeGeometry(0.28 * s, 0.7 * s, 6), mat(c)); cr.position.y = 0.6 * s; cr.castShadow = true; g.add(t, cr); g.position.set(x, y, z); return g; }
  for (const [ty, list] of Object.entries(groups)) {
    const im = new THREE.InstancedMesh(hexGeo, mat(TCOL[ty] || 0x9fd06f), list.length); im.receiveShadow = true;
    list.forEach((c, i) => {
      const [x, z] = axial(c.q, c.r); dummy.position.set(x, TILE_H / 2, z); dummy.rotation.set(0, 0, 0); dummy.scale.set(1, 1, 1); dummy.updateMatrix(); im.setMatrixAt(i, dummy.matrix);
      const y = TILE_H, h = hash(c.q, c.r, 4);
      if (ty === 'forest') for (let k = 0; k < 4; k++) deco.add(tree(x + (hash(c.q, c.r, 10 + k) - .5) * 1.0, y, z + (hash(c.q, c.r, 20 + k) - .5) * 1.0, 0.75 + hash(c.q, c.r, 30 + k) * 0.4));
      if (ty === 'field') for (let k = -2; k <= 2; k++) { const b = new THREE.Mesh(new THREE.BoxGeometry(1.15, 0.07, 0.12), mat(0xc9a12e)); b.position.set(x, y + 0.035, z + k * 0.27); b.rotation.y = h * 0.6; deco.add(b); }
      if (ty === 'pond') { const w = new THREE.Mesh(new THREE.CylinderGeometry(0.75, 0.75, 0.02, 14), mat(0x4f9ad0, { roughness: 0.15, flatShading: false })); w.position.set(x, y + 0.01, z); deco.add(w); }
      if (ty === 'meadow' && h < 0.4) { const f = new THREE.Mesh(new THREE.SphereGeometry(0.05, 6, 4), mat([0xf2d64b, 0xf48fb1, 0xffffff][Math.floor(h * 9) % 3])); f.position.set(x + (h - .2), y + 0.03, z + (hash(c.q, c.r, 5) - .5)); deco.add(f); }
    });
    im.userData.tiles = list; tileMeshes.push(im); scene.add(im);
  }
  // cesty na hranách (kreslí hráč) se stromořadím po obou stranách
  const roadG = new THREE.Group(); scene.add(roadG);
  function drawRoads() {
    roadG.clear();
    for (const k of roads) {
      const [a, b] = k.split('|').map(s => s.split(',').map(Number)), [ax, az] = axial(...a), [bx, bz] = axial(...b);
      const mx = (ax + bx) / 2, mz = (az + bz) / 2, ang = Math.atan2(bx - ax, bz - az) + Math.PI / 2;
      const strip = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.03, HEX * 1.02), mat(0xdcc89a)); strip.position.set(mx, TILE_H + 0.015, mz); strip.rotation.y = ang; strip.receiveShadow = true; roadG.add(strip);
      const ex = Math.sin(ang), ez = Math.cos(ang), px = Math.cos(ang), pz = -Math.sin(ang);
      for (const t of [-0.38, 0, 0.38]) for (const s of [-0.17, 0.17]) { const tr = new THREE.Mesh(new THREE.SphereGeometry(0.09, 6, 5), mat(0x4f8f3a)); tr.position.set(mx + ex * t + px * s, TILE_H + 0.16, mz + ez * t + pz * s); tr.castShadow = true; const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.02, 0.1, 4), mat(0x7a5232)); stem.position.set(tr.position.x, TILE_H + 0.05, tr.position.z); roadG.add(tr, stem); }
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
  function build(list) {
    bgroup.clear(); labels.innerHTML = '';
    for (const it of list) {
      const p = pos[it.id]; if (!p || !W.cells.has(K(...p))) continue;
      const [x, z] = axial(...p), g = model(it.id, it.level, x, z); g.traverse(o => { o.userData.id = it.id; });
      bgroup.add(g);
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
  let raf = 0, alive = true, Wd = 0, Ht = 0, last = 0;
  const v3 = new THREE.Vector3();
  function frame(now) {
    if (!alive) return;
    raf = requestAnimationFrame(frame);
    const w = el.clientWidth, h = el.clientHeight;
    if (w !== Wd || h !== Ht) { Wd = w; Ht = h; renderer.setSize(w, h, false); cam.aspect = w / Math.max(1, h); cam.updateProjectionMatrix(); dirty = true; }
    if (opts.train !== false && now - last > 33) { trainS += Math.min(0.1, (now - last) / 1000) * 1.4; if (trainS > acc + 2) trainS = -1; last = now; placeTrain(); dirty = true; }
    if (!dirty || !w) return;
    dirty = false; renderer.render(scene, cam);
    for (const l of labels.children) {
      v3.copy(l._p).project(cam);
      const show = v3.z < 1 && Math.abs(v3.x) < 1.1 && Math.abs(v3.y) < 1.1;
      l.style.display = show ? '' : 'none';
      if (show) l.style.transform = `translate(${(v3.x + 1) / 2 * w}px, ${(1 - v3.y) / 2 * h}px) translate(-50%, -100%)`;
    }
  }
  place(); frame(0);
  return {
    update: list => build(list),
    setMoving: v => { opts.moving = v; },
    setRoadMode: v => { opts.roadMode = v; },
    setRoads: list => { roads.clear(); (list || []).forEach(k => roads.add(k)); drawRoads(); },
    highlight,
    focus: id => { const p = pos[id]; if (!p) return; [st.tx, st.tz] = axial(...p); st.d = Math.min(st.d, 10); place(); dirty = true; },
    destroy: () => { alive = false; cancelAnimationFrame(raf); renderer.dispose(); el.innerHTML = ''; }
  };
}
