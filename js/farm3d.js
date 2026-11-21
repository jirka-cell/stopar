// 3D farma: generovaná šestiúhelníková krajina (kopce, řeka, rybník, síť cest, les, skály), budovy stojí u cest.
// Ovládání: táhni = otáčení, dva prsty / kolečko = zoom, dva prsty táhnout = posun, ťuk = výběr budovy nebo políčka.
// Tvary jsou zatím jednoduché (low-poly); realistické modely (.glb) se dají později vyměnit ve funkci model().
const HEX = 1, SQ3 = Math.sqrt(3), STEP = 0.32; // STEP = výška jednoho stupně terénu
export const R_MAP = 7;
const axial = (q, r) => [HEX * SQ3 * (q + r / 2), HEX * 1.5 * r];
const DIRS = [[1, 0], [1, -1], [0, -1], [-1, 0], [-1, 1], [0, 1]];
const K = (q, r) => q + ',' + r;
export const hexDist = (q, r) => (Math.abs(q) + Math.abs(r) + Math.abs(q + r)) / 2;
function ring(n) {
  if (!n) return [[0, 0]];
  const out = []; let q = -n, r = n;
  for (let d = 0; d < 6; d++) for (let i = 0; i < n; i++) { out.push([q, r]); q += DIRS[d][0]; r += DIRS[d][1]; }
  return out;
}
const hash = (q, r, s = 0) => { let h = (q * 374761393 + r * 668265263 + s * 2147483647) | 0; h = Math.imul(h ^ (h >>> 13), 1274126177); return ((h ^ (h >>> 16)) >>> 0) / 4294967296; };

/* ---------- generátor krajiny (stejný seed = stejná krajina) ---------- */
export function genTerrain(seed, R = R_MAP) {
  const T = new Map(), s = (seed % 997) + 1;
  const noise = (q, r) => { const [x, z] = axial(q, r); return (Math.sin(x * 0.42 + s) + Math.sin(z * 0.47 + s * 1.7) + Math.sin((x - z) * 0.31 + s * 0.6) + (hash(q, r, s) - 0.5) * 0.9) / 3.45; };
  for (let n = 0; n <= R; n++) for (const [q, r] of ring(n)) {
    const lv = Math.max(0, Math.min(3, Math.round((noise(q, r) + 1) * 1.6 - 0.2)));
    T.set(K(q, r), { q, r, t: 'meadow', h: lv });
  }
  // okolí statku srovnat
  const base = T.get(K(0, 0)).h;
  for (let n = 0; n <= 1; n++) for (const [q, r] of ring(n)) Object.assign(T.get(K(q, r)), { h: base, t: n ? 'road' : 'yard' });
  // řeka: od nejvyššího místa na okraji dolů do nejnižšího souseda; v jámě rybník
  const edge = [...ring(R - 1), ...ring(R)].map(([q, r]) => T.get(K(q, r))).sort((a, b) => b.h - a.h || hash(a.q, a.r, s + 1) - hash(b.q, b.r, s + 1));
  let cur = edge[0]; const seen = new Set();
  for (let i = 0; i < R * 4 && cur; i++) {
    seen.add(K(cur.q, cur.r)); if (cur.t !== 'yard' && cur.t !== 'road') cur.t = 'water';
    const nb = DIRS.map(([dq, dr]) => T.get(K(cur.q + dq, cur.r + dr))).filter(t => t && !seen.has(K(t.q, t.r)) && hexDist(t.q, t.r) > 1);
    if (!nb.length) break;
    nb.sort((a, b) => a.h - b.h || hexDist(b.q, b.r) - hexDist(a.q, a.r));
    const nx = nb[0];
    if (nx.h > cur.h) { nb.filter(t => t.h <= cur.h + 1).slice(0, 2).forEach(t => { t.t = 'water'; t.h = cur.h; }); break; } // rybník
    if (hexDist(nx.q, nx.r) > R) break;
    nx.h = Math.min(nx.h, cur.h); cur = nx;
  }
  // cesty: 6 paprsků od statku + okruhy 3 a 6; přes vodu mostek
  const road = t => { if (!t) return; if (t.t === 'water') t.t = 'bridge'; else if (t.t !== 'yard') t.t = 'road'; };
  for (const [dq, dr] of DIRS) for (let k = 2; k <= R; k++) road(T.get(K(dq * k, dr * k)));
  for (const n of [3, 6]) if (n <= R) for (const [q, r] of ring(n)) road(T.get(K(q, r)));
  // les na kopcích a u okraje, skály na vrcholech
  for (const t of T.values()) {
    if (t.t !== 'meadow') continue;
    const h = hash(t.q, t.r, s + 2), d = hexDist(t.q, t.r);
    if (t.h === 3 && h < 0.4) t.t = 'rock';
    else if ((t.h >= 2 && h < 0.5) || (d >= R - 1 && h < 0.6) || h < 0.08) t.t = 'forest';
  }
  return T;
}
// Kam smí budova: louka, les nebo skála (vykácí se/odklidí), volné, se sousední cestou
export const isRoad = t => t && (t.t === 'road' || t.t === 'bridge' || t.t === 'yard');
export function canPlace(T, q, r, taken) {
  const t = T.get(K(q, r));
  if (!t || !['meadow', 'forest', 'rock'].includes(t.t) || taken.has(K(q, r))) return false;
  return DIRS.some(([dq, dr]) => isRoad(T.get(K(q + dq, r + dr))));
}
export const validTiles = (T, taken) => [...T.values()].filter(t => canPlace(T, t.q, t.r, taken)).map(t => [t.q, t.r]);
// Budovy bez místa (starší farmy): nejbližší volná políčka u cesty
export function autoPlace(T, pos, ids) {
  const taken = new Set(Object.values(pos).map(p => K(p[0], p[1])));
  const free = validTiles(T, taken).sort((a, b) => hexDist(a[0], a[1]) - hexDist(b[0], b[1]) || hash(a[0], a[1], 9) - hash(b[0], b[1], 9));
  for (const id of ids) if (!pos[id] && free.length) { const p = free.shift(); pos[id] = p; taken.add(K(p[0], p[1])); }
  return pos;
}
// Bod na zemi → políčko (šestiúhelník špičkou nahoru, zaokrouhlení v kubických souřadnicích)
export function hexAt(x, z) {
  const q = (SQ3 / 3 * x - z / 3) / HEX, r = (2 / 3 * z) / HEX, s = -q - r;
  let rq = Math.round(q), rr = Math.round(r); const rs = Math.round(s);
  const dq = Math.abs(rq - q), dr = Math.abs(rr - r), ds = Math.abs(rs - s);
  if (dq > dr && dq > ds) rq = -rr - rs; else if (dr > ds) rr = -rq - rs;
  return [rq + 0, rr + 0]; // + 0: bez záporné nuly
}
const TCOL = { yard: 0xb8d68f, road: 0x93c870, bridge: 0x5aa6d6, base: 0x9ccf7a, meadow: 0x8cc66a, forest: 0x5f9a4c, rock: 0x9a958a, water: 0x5aa6d6 };
const top = t => 0.15 + t.h * STEP;

export async function mountFarm(el, items, onPick, opts = {}) {
  const THREE = await import('../vendor/three/three.module.min.js');
  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
  renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  el.appendChild(renderer.domElement);
  const labels = document.createElement('div'); labels.className = 'flabels'; el.appendChild(labels);
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0xbfe0f2); scene.fog = new THREE.Fog(0xbfe0f2, 22, 42);
  const cam = new THREE.PerspectiveCamera(42, 1, 0.1, 120);
  scene.add(new THREE.HemisphereLight(0xffffff, 0x6a8a4a, 0.85));
  const sun = new THREE.DirectionalLight(0xfff2d8, 1.5); sun.position.set(9, 16, 7); sun.castShadow = true;
  sun.shadow.mapSize.set(1024, 1024); Object.assign(sun.shadow.camera, { left: -15, right: 15, top: 15, bottom: -15 }); scene.add(sun);
  const mats = {};
  const mat = c => mats[c] || (mats[c] = new THREE.MeshStandardMaterial({ color: c, roughness: 0.85, flatShading: true }));
  const T = opts.terrain || genTerrain(opts.seed || 1), pos = opts.pos || {};
  const occupied = new Set(items.filter(i => pos[i.id]).map(i => K(...pos[i.id])));

  /* krajina: sloupky podle výšky (InstancedMesh na typ) */
  const hexGeo = new THREE.CylinderGeometry(HEX * 0.98, HEX * 0.98, 1, 6), dummy = new THREE.Object3D(), deco = new THREE.Group(); scene.add(deco);
  const groups = {}, tileMeshes = [];
  for (const t of T.values()) { const ty = occupied.has(K(t.q, t.r)) ? 'base' : t.t; (groups[ty] ||= []).push(t); }
  for (const [ty, list] of Object.entries(groups)) {
    const im = new THREE.InstancedMesh(hexGeo, mat(TCOL[ty]), list.length); im.receiveShadow = true;
    list.forEach((t, i) => {
      const [x, z] = axial(t.q, t.r), hgt = top(t) + 0.3 - (ty === 'water' || ty === 'bridge' ? 0.08 : 0);
      dummy.position.set(x, hgt / 2 - 0.3, z); dummy.scale.set(1, hgt, 1); dummy.updateMatrix(); im.setMatrixAt(i, dummy.matrix);
      decorate(ty, x, z, t);
    });
    im.userData.tiles = list; tileMeshes.push(im); scene.add(im);
  }
  function tree(x, y, z, s = 1, c = 0x3f7a3a) {
    const g = new THREE.Group();
    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.05 * s, 0.07 * s, 0.3 * s, 6), mat(0x7a5232)); trunk.position.y = 0.15 * s;
    const cone = new THREE.Mesh(new THREE.ConeGeometry(0.28 * s, 0.7 * s, 7), mat(c)); cone.position.y = 0.6 * s;
    cone.castShadow = trunk.castShadow = true; g.add(trunk, cone); g.position.set(x, y, z); return g;
  }
  function decorate(ty, x, z, t) {
    const y = top(t), h = hash(t.q, t.r, 4);
    if (ty === 'forest') for (let i = 0; i < 3; i++) deco.add(tree(x + (hash(t.q, t.r, 10 + i) - .5) * 1.1, y, z + (hash(t.q, t.r, 20 + i) - .5) * 1.1, 0.8 + hash(t.q, t.r, 30 + i) * 0.5));
    if (ty === 'meadow' && h < 0.35) { const f = new THREE.Mesh(new THREE.SphereGeometry(0.05, 6, 4), mat([0xf2d64b, 0xf48fb1, 0xffffff][Math.floor(h * 9) % 3])); f.position.set(x + (h - .2) * 1.2, y + 0.03, z + (hash(t.q, t.r, 5) - .5)); deco.add(f); }
    if (ty === 'rock') for (let i = 0; i < 2; i++) { const s = new THREE.Mesh(new THREE.DodecahedronGeometry(0.2 + hash(t.q, t.r, 40 + i) * 0.18), mat(0x8a857a)); s.position.set(x + (hash(t.q, t.r, 50 + i) - .5), y + 0.12, z + (hash(t.q, t.r, 60 + i) - .5)); s.castShadow = true; deco.add(s); }
    if (ty === 'water' || ty === 'bridge') { const w = new THREE.Mesh(new THREE.CylinderGeometry(HEX * 0.98, HEX * 0.98, 0.04, 6), new THREE.MeshStandardMaterial({ color: 0x6ab8e8, roughness: 0.15, metalness: 0.1, transparent: true, opacity: 0.9 })); w.position.set(x, y - 0.06, z); deco.add(w); }
    // cesta = pěšinka od středu k sousedním cestám (na mostě prkna)
    if (ty === 'road' || ty === 'bridge' || ty === 'yard') {
      const c = ty === 'bridge' ? 0x9a6a3a : 0xdcc89a, wid = ty === 'yard' ? 0.5 : 0.34;
      const disc = new THREE.Mesh(new THREE.CylinderGeometry(wid * 0.6, wid * 0.6, 0.03, 10), mat(c)); disc.position.set(x, y + 0.015, z); disc.receiveShadow = true; deco.add(disc);
      DIRS.forEach(([dq, dr]) => { const n = T.get(K(t.q + dq, t.r + dr)); if (!n || !isRoad(n)) return; const [nx, nz] = axial(n.q, n.r), dx = (nx - x) / 2, dz = (nz - z) / 2, len = Math.hypot(dx, dz), dy = (top(n) - y) / 2;
        const seg = new THREE.Mesh(new THREE.BoxGeometry(wid, 0.03, len), mat(c)); seg.position.set(x + dx / 2, y + 0.015 + dy / 2, z + dz / 2); seg.rotation.y = Math.atan2(dx, dz); seg.rotation.x = -Math.atan2(dy, len); seg.receiveShadow = true; deco.add(seg); });
    }
  }
  scene.add(model('home', 2, ...axial(0, 0), top(T.get('0,0'))));

  /* zvýraznění políček (stavění, přesun) */
  const hl = new THREE.Group(); scene.add(hl);
  const hlMat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.45, depthWrite: false });
  function highlight(list) {
    hl.clear();
    for (const [q, r] of list || []) { const t = T.get(K(q, r)); if (!t) continue; const m = new THREE.Mesh(new THREE.CylinderGeometry(HEX * 0.8, HEX * 0.8, 0.03, 6), hlMat); const [x, z] = axial(q, r); m.position.set(x, top(t) + 0.03, z); hl.add(m); }
    dirty = true;
  }

  /* budovy */
  const bgroup = new THREE.Group(); scene.add(bgroup);
  let dirty = true;
  function model(kind, lv, x, z, y = 0.15) {
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
  function build(list) {
    bgroup.clear(); labels.innerHTML = '';
    for (const it of list) {
      const p = pos[it.id], t = p && T.get(K(...p)); if (!t) continue;
      const [x, z] = axial(...p), y = top(t), g = model(it.id, it.level, x, z, y); g.traverse(o => { o.userData.id = it.id; });
      bgroup.add(g);
      const l = document.createElement('button'); l.className = 'flabel s-' + it.status; l.dataset.id = it.id;
      l.innerHTML = `<span>${it.icon}</span><b>${it.level}</b>${it.text ? `<small>${it.text}</small>` : ''}`; l.setAttribute('aria-label', it.name + ', úroveň ' + it.level + (it.text ? ', ' + it.text : ''));
      l._p = new THREE.Vector3(x, y + 1.1, z); labels.appendChild(l);
    }
    dirty = true;
  }
  build(items);

  /* kamera: otáčení, zoom, posun */
  const st = { th: 0.6, ph: 0.9, d: 17, tx: 0, tz: 0 };
  const place = () => {
    st.ph = Math.max(0.35, Math.min(1.35, st.ph)); st.d = Math.max(5, Math.min(28, st.d));
    st.tx = Math.max(-9, Math.min(9, st.tx)); st.tz = Math.max(-9, Math.min(9, st.tz));
    cam.position.set(st.tx + st.d * Math.sin(st.ph) * Math.sin(st.th), st.d * Math.cos(st.ph), st.tz + st.d * Math.sin(st.ph) * Math.cos(st.th));
    cam.lookAt(st.tx, 0.3, st.tz);
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
  labels.addEventListener('click', e => { const b = e.target.closest('.flabel'); if (b && !opts.moving) onPick(b.dataset.id); });
  const ray = new THREE.Raycaster(), v2 = new THREE.Vector2();
  function pick(cx, cy) {
    const r = cv.getBoundingClientRect(); v2.set((cx - r.left) / r.width * 2 - 1, -(cy - r.top) / r.height * 2 + 1);
    ray.setFromCamera(v2, cam);
    const hit = ray.intersectObjects(bgroup.children, true)[0];
    if (hit && hit.object.userData.id && !opts.moving) { onPick(hit.object.userData.id); return; }
    if (!opts.onTile) return;
    // ťuk na políčko: přímý zásah do sloupku šestiúhelníku (přesné i na kopcích)
    const th = ray.intersectObjects(tileMeshes, false)[0];
    if (th && th.instanceId != null) { const t = th.object.userData.tiles[th.instanceId]; if (t) opts.onTile(t.q, t.r); }
  }

  /* vykreslení jen při změně; štítky sledují budovy */
  let raf = 0, alive = true, W = 0, H = 0;
  const v3 = new THREE.Vector3();
  function frame() {
    if (!alive) return;
    raf = requestAnimationFrame(frame);
    const w = el.clientWidth, h = el.clientHeight;
    if (w !== W || h !== H) { W = w; H = h; renderer.setSize(w, h, false); cam.aspect = w / Math.max(1, h); cam.updateProjectionMatrix(); dirty = true; }
    if (!dirty || !w) return;
    dirty = false; renderer.render(scene, cam);
    for (const l of labels.children) {
      v3.copy(l._p).project(cam);
      const show = v3.z < 1 && Math.abs(v3.x) < 1.1 && Math.abs(v3.y) < 1.1;
      l.style.display = show ? '' : 'none';
      if (show) l.style.transform = `translate(${(v3.x + 1) / 2 * w}px, ${(1 - v3.y) / 2 * h}px) translate(-50%, -100%)`;
    }
  }
  place(); frame();
  return {
    update: list => build(list),
    setMoving: v => { opts.moving = v; },
    highlight,
    focus: id => { const p = pos[id]; if (!p) return; [st.tx, st.tz] = axial(...p); st.d = Math.min(st.d, 10); place(); dirty = true; },
    destroy: () => { alive = false; cancelAnimationFrame(raf); renderer.dispose(); el.innerHTML = ''; }
  };
}
