// 3D farma: šestiúhelníková krajina (Three.js), budovy podle úrovně, nad nimi štítky stavu výroby.
// Ovládání: táhni = otáčení, dva prsty / kolečko = zoom, dva prsty táhnout = posun, ťuk = výběr budovy.
// Tvary jsou zatím jednoduché (low-poly); realistické modely (.glb) se dají později vyměnit ve funkci model().
const HEX = 1, SQ3 = Math.sqrt(3);
const axial = (q, r) => [HEX * SQ3 * (q + r / 2), HEX * 1.5 * r];
const DIRS = [[1, 0], [1, -1], [0, -1], [-1, 0], [-1, 1], [0, 1]];
function ring(n) {
  if (!n) return [[0, 0]];
  const out = []; let q = -n, r = n; // start: směr 4 × n
  for (let d = 0; d < 6; d++) for (let i = 0; i < n; i++) { out.push([q, r]); q += DIRS[d][0]; r += DIRS[d][1]; }
  return out;
}
const hash = (q, r, s = 0) => { let h = (q * 374761393 + r * 668265263 + s * 2147483647) | 0; h = Math.imul(h ^ (h >>> 13), 1274126177); return ((h ^ (h >>> 16)) >>> 0) / 4294967296; };
// Rozmístění: statek uprostřed, cesty v 1. kruhu, budovy ve 2. kruhu (a dál), okolí podle sousední budovy
export const SLOT_ORDER = ['enc_voliera', 'enc_vybeh', 'enc_rybnik', 'enc_terarium', 'enc_insektarium', 'pantry', 'store', 'field', 'orchard', 'worms', 'nursery', 'lumber', 'quarry'];
export const MAX_RING = 5;
export const hexDist = (q, r) => (Math.abs(q) + Math.abs(r) + Math.abs(q + r)) / 2;
// Kam smí budova: 2. až 5. kruh (střed je statek, 1. kruh cesty)
export const placeable = (q, r) => { const d = hexDist(q, r); return d >= 2 && d <= MAX_RING; };
export function layout(ids, custom = {}) {
  const order = [...SLOT_ORDER.filter(i => ids.includes(i)), ...ids.filter(i => !SLOT_ORDER.includes(i))];
  const slots = [...ring(2), ...ring(3).filter((_, i) => i % 3 === 0), ...ring(3), ...ring(4)], pos = {}, used = new Set();
  for (const id of order) { const c = custom[id]; if (c && placeable(c[0], c[1]) && !used.has(c.join())) { pos[id] = [c[0], c[1]]; used.add(c.join()); } }
  for (const id of order) { if (pos[id]) continue; const s = slots.find(p => !used.has(p.join())); if (s) { pos[id] = s; used.add(s.join()); } }
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
const NEAR = { lumber: 'forest', nursery: 'meadow', field: 'crop', orchard: 'orchard', quarry: 'rock', enc_rybnik: 'water', worms: 'soil' };
export function terrainAt(q, r, pos) {
  const d = (Math.abs(q) + Math.abs(r) + Math.abs(q + r)) / 2;
  if (d === 0) return 'yard';
  if (d === 1) return 'path';
  for (const [id, [bq, br]] of Object.entries(pos)) if (bq === q && br === r) return 'base';
  for (const [id, [bq, br]] of Object.entries(pos)) {
    const dd = (Math.abs(q - bq) + Math.abs(r - br) + Math.abs(q + r - bq - br)) / 2;
    if (dd === 1 && NEAR[id] && hash(q, r, 1) < 0.7) return NEAR[id];
  }
  const h = hash(q, r, 2);
  return d >= 5 ? (h < 0.55 ? 'forest' : 'meadow') : h < 0.12 ? 'forest' : h < 0.2 ? 'water' : 'meadow';
}
const TCOL = { yard: 0xc9b58a, path: 0xd8c79f, base: 0x9ccf7a, meadow: 0x8cc66a, forest: 0x5f9a4c, crop: 0xd9c25a, orchard: 0x86bd62, rock: 0x9a958a, water: 0x5aa6d6, soil: 0x7a5a3a };

export async function mountFarm(el, items, onPick, opts = {}) {
  const THREE = await import('../vendor/three/three.module.min.js');
  const R = 6;
  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
  renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  el.appendChild(renderer.domElement);
  const labels = document.createElement('div'); labels.className = 'flabels'; el.appendChild(labels);
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0xbfe0f2); scene.fog = new THREE.Fog(0xbfe0f2, 18, 34);
  const cam = new THREE.PerspectiveCamera(42, 1, 0.1, 100);
  scene.add(new THREE.HemisphereLight(0xffffff, 0x6a8a4a, 0.85));
  const sun = new THREE.DirectionalLight(0xfff2d8, 1.5); sun.position.set(8, 14, 6); sun.castShadow = true;
  sun.shadow.mapSize.set(1024, 1024); Object.assign(sun.shadow.camera, { left: -12, right: 12, top: 12, bottom: -12 }); scene.add(sun);
  const M = c => new THREE.MeshStandardMaterial({ color: c, roughness: 0.85, flatShading: true });
  const mats = {};
  const mat = c => mats[c] || (mats[c] = M(c));

  /* krajina z šestiúhelníků (InstancedMesh na typ terénu) */
  const ids = items.map(i => i.id), pos = layout(ids, opts.pos || {}), tiles = {};
  for (let n = 0; n <= R; n++) for (const [q, r] of ring(n)) { const t = terrainAt(q, r, pos); (tiles[t] ||= []).push([q, r]); }
  const hexGeo = new THREE.CylinderGeometry(HEX * 0.98, HEX * 0.98, 0.3, 6); // špička k ±z = stejně jako axial() → sousedé sdílí stranu
  const dummy = new THREE.Object3D(), deco = new THREE.Group(); scene.add(deco);
  for (const [t, list] of Object.entries(tiles)) {
    const im = new THREE.InstancedMesh(hexGeo, mat(TCOL[t]), list.length); im.receiveShadow = true;
    list.forEach(([q, r], i) => {
      const [x, z] = axial(q, r), y = t === 'water' ? -0.08 : (hash(q, r, 3) - 0.5) * 0.06;
      dummy.position.set(x, y, z); dummy.updateMatrix(); im.setMatrixAt(i, dummy.matrix);
      decorate(t, x, z, q, r);
    });
    scene.add(im);
  }
  function tree(x, z, s = 1, c = 0x3f7a3a) {
    const g = new THREE.Group();
    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.05 * s, 0.07 * s, 0.3 * s, 6), mat(0x7a5232)); trunk.position.y = 0.3 * s;
    const top = new THREE.Mesh(new THREE.ConeGeometry(0.28 * s, 0.7 * s, 7), mat(c)); top.position.y = 0.75 * s;
    top.castShadow = trunk.castShadow = true; g.add(trunk, top); g.position.set(x, 0.15, z); return g;
  }
  function decorate(t, x, z, q, r) {
    const h = hash(q, r, 4);
    if (t === 'forest') for (let i = 0; i < 3; i++) deco.add(tree(x + (hash(q, r, 10 + i) - .5) * 1.1, z + (hash(q, r, 20 + i) - .5) * 1.1, 0.8 + hash(q, r, 30 + i) * 0.5));
    if (t === 'meadow' && h < 0.35) { const f = new THREE.Mesh(new THREE.SphereGeometry(0.05, 6, 4), mat([0xf2d64b, 0xf48fb1, 0xffffff][Math.floor(h * 9) % 3])); f.position.set(x + (h - .2) * 1.2, 0.18, z + (hash(q, r, 5) - .5)); deco.add(f); }
    if (t === 'rock') for (let i = 0; i < 2; i++) { const s = new THREE.Mesh(new THREE.DodecahedronGeometry(0.18 + hash(q, r, 40 + i) * 0.15), mat(0x8a857a)); s.position.set(x + (hash(q, r, 50 + i) - .5), 0.25, z + (hash(q, r, 60 + i) - .5)); s.castShadow = true; deco.add(s); }
    if (t === 'crop') for (let i = -2; i <= 2; i++) { const b = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.12, 0.14), mat(0xc9a83a)); b.position.set(x, 0.2, z + i * 0.3); deco.add(b); }
    if (t === 'orchard') deco.add(tree(x, z, 0.8, 0x6aa84a));
    if (t === 'water') { const w = new THREE.Mesh(new THREE.CylinderGeometry(HEX * 0.9, HEX * 0.9, 0.05, 6), new THREE.MeshStandardMaterial({ color: 0x6ab8e8, roughness: 0.2, metalness: 0.1, transparent: true, opacity: 0.9 })); w.position.set(x, 0.1, z); deco.add(w); }
  }
  // statek uprostřed (dekorace)
  scene.add(model('home', 2, ...axial(0, 0)));

  /* budovy */
  const bgroup = new THREE.Group(); scene.add(bgroup);
  let cur = [], dirty = true;
  function model(kind, lv, x, z) {
    const g = new THREE.Group(), s = 0.75 + 0.05 * Math.min(10, lv);
    const box = (w, h, d, c, y = h / 2, ox = 0, oz = 0) => { const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat(c)); m.position.set(ox, y, oz); m.castShadow = m.receiveShadow = true; g.add(m); return m; };
    const roof = (w, d, h, c, y) => { const m = new THREE.Mesh(new THREE.CylinderGeometry(0.001, w * 0.75, h, 4), mat(c)); m.rotation.y = Math.PI / 4; m.scale.set(1, 1, d / w); m.position.y = y + h / 2; m.castShadow = true; g.add(m); };
    const fence = (rad, c = 0xc9a16a) => { for (let i = 0; i < 12; i++) { const a = i / 12 * Math.PI * 2; box(0.05, 0.3, 0.05, c, 0.15, Math.cos(a) * rad, Math.sin(a) * rad); } const t = new THREE.Mesh(new THREE.TorusGeometry(rad, 0.02, 4, 24), mat(c)); t.rotation.x = Math.PI / 2; t.position.y = 0.26; g.add(t); };
    if (!lv) { box(0.6, 0.05, 0.6, 0xb08a5a, 0.03); for (const [ox, oz] of [[-.25, -.25], [.25, -.25], [-.25, .25], [.25, .25]]) box(0.04, 0.5, 0.04, 0xc9a16a, 0.25, ox, oz); }
    else if (kind === 'home') { box(0.9, 0.5, 0.7, 0xf2e6cc); roof(0.9, 0.7, 0.4, 0xb8442e, 0.5); box(0.15, 0.25, 0.02, 0x7a4a2a, 0.13, 0, 0.36); }
    else if (kind === 'enc_voliera') { const c = new THREE.Mesh(new THREE.CylinderGeometry(0.45, 0.45, 0.7, 10, 1, true), new THREE.MeshStandardMaterial({ color: 0x9aa0a6, wireframe: true })); c.position.y = 0.35; g.add(c); const t = new THREE.Mesh(new THREE.ConeGeometry(0.5, 0.3, 10), mat(0x6a8a4a)); t.position.y = 0.85; g.add(t); box(0.1, 0.4, 0.1, 0x8a5a3a, 0.2); }
    else if (kind === 'enc_vybeh') { fence(0.6); box(0.35, 0.3, 0.3, 0xb07a4a, 0.15, 0.15, -0.1); roof(0.35, 0.3, 0.18, 0x7a4a2a, 0.3); }
    else if (kind === 'enc_rybnik') { const w = new THREE.Mesh(new THREE.CylinderGeometry(0.6, 0.6, 0.06, 16), new THREE.MeshStandardMaterial({ color: 0x4f9ad0, roughness: 0.15 })); w.position.y = 0.05; g.add(w); for (let i = 0; i < 6; i++) { const a = i; box(0.03, 0.35, 0.03, 0x6a8a3a, 0.2, Math.cos(a) * 0.62, Math.sin(a) * 0.62); } }
    else if (kind === 'enc_terarium') { const gl = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.45, 0.55), new THREE.MeshStandardMaterial({ color: 0xbfe6f0, transparent: true, opacity: 0.45, roughness: 0.1 })); gl.position.y = 0.3; g.add(gl); box(0.82, 0.08, 0.57, 0x7a5a3a, 0.04); }
    else if (kind === 'enc_insektarium') { box(0.5, 0.6, 0.25, 0xc98a4a, 0.3); roof(0.55, 0.3, 0.25, 0x8a5a2a, 0.6); for (let i = 0; i < 3; i++) box(0.12, 0.1, 0.02, 0x5a3a1a, 0.15 + i * 0.15, 0, 0.13); }
    else if (kind === 'lumber') { for (let i = 0; i < 3; i++) { const l = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 0.7, 8), mat(0x9a6a3a)); l.rotation.z = Math.PI / 2; l.position.set(0, 0.1 + i * 0.15, (i - 1) * 0.12); l.castShadow = true; g.add(l); } g.add(tree(0.45, 0.35, 0.8)); }
    else if (kind === 'quarry') { for (let i = 0; i < 4; i++) { const r = new THREE.Mesh(new THREE.DodecahedronGeometry(0.2 + 0.05 * i), mat(0x8f8a80)); r.position.set((i % 2 - .5) * 0.4, 0.15 + (i > 1 ? 0.15 : 0), (i < 2 ? -0.15 : 0.15)); r.castShadow = true; g.add(r); } }
    else if (kind === 'nursery') { const gh = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.3, 0.8, 12, 1, false, 0, Math.PI), new THREE.MeshStandardMaterial({ color: 0xdff2f8, transparent: true, opacity: 0.55, side: THREE.DoubleSide })); gh.rotation.z = Math.PI / 2; gh.position.y = 0.05; g.add(gh); box(0.7, 0.05, 0.55, 0x6a4a2a, 0.03); }
    else if (kind === 'field') { for (let i = -2; i <= 2; i++) box(0.9, 0.18, 0.12, 0xe0c24a, 0.1, 0, i * 0.18); }
    else if (kind === 'orchard') { for (const [ox, oz] of [[-.3, -.2], [.3, -.2], [0, .3]]) { const t = tree(ox, oz, 0.75, 0x5a9a3a); t.position.y = 0; g.add(t); const a = new THREE.Mesh(new THREE.SphereGeometry(0.05, 6, 4), mat(0xd9304a)); a.position.set(ox + 0.1, 0.65, oz + 0.1); g.add(a); } }
    else if (kind === 'worms') { box(0.8, 0.12, 0.5, 0x5a3a22, 0.06); box(0.84, 0.16, 0.04, 0x9a6a3a, 0.08, 0, 0.26); box(0.84, 0.16, 0.04, 0x9a6a3a, 0.08, 0, -0.26); }
    else if (kind === 'store') { box(0.8, 0.5, 0.6, 0xa8673a); roof(0.85, 0.65, 0.35, 0x6a3a22, 0.5); box(0.3, 0.32, 0.02, 0x5a2a12, 0.16, 0, 0.31); }
    else if (kind === 'pantry') { box(0.55, 0.45, 0.45, 0xe8d6a8); roof(0.6, 0.5, 0.3, 0x9a5a2a, 0.45); }
    else box(0.5, 0.4, 0.5, 0xcccccc);
    g.scale.setScalar(s); g.position.set(x, 0.15, z); return g;
  }
  function build(list) {
    cur = list;
    bgroup.clear(); labels.innerHTML = '';
    for (const it of list) {
      const p = pos[it.id]; if (!p) continue;
      const [x, z] = axial(...p), g = model(it.id, it.level, x, z); g.userData.id = it.id; g.traverse(o => { o.userData.id = it.id; });
      bgroup.add(g);
      const l = document.createElement('button'); l.className = 'flabel s-' + it.status; l.dataset.id = it.id;
      l.innerHTML = `<span>${it.icon}</span><b>${it.level}</b>${it.text ? `<small>${it.text}</small>` : ''}`; l.setAttribute('aria-label', it.name + ', úroveň ' + it.level + (it.text ? ', ' + it.text : ''));
      l._p = new THREE.Vector3(x, 1.25, z); labels.appendChild(l);
    }
    dirty = true;
  }
  build(items);

  /* kamera: otáčení, zoom, posun */
  const st = { th: 0.6, ph: 0.9, d: 15, tx: 0, tz: 0 };
  const place = () => {
    st.ph = Math.max(0.35, Math.min(1.35, st.ph)); st.d = Math.max(5, Math.min(22, st.d));
    st.tx = Math.max(-6, Math.min(6, st.tx)); st.tz = Math.max(-6, Math.min(6, st.tz));
    cam.position.set(st.tx + st.d * Math.sin(st.ph) * Math.sin(st.th), st.d * Math.cos(st.ph), st.tz + st.d * Math.sin(st.ph) * Math.cos(st.th));
    cam.lookAt(st.tx, 0, st.tz);
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
  const up = e => {
    const was = pts.size; pts.delete(e.pointerId); if (pts.size < 2) gest = null;
    if (was === 1 && moved < 8) pick(e.clientX, e.clientY);
  };
  cv.addEventListener('pointerup', up); cv.addEventListener('pointercancel', up);
  cv.addEventListener('wheel', e => { e.preventDefault(); st.d *= e.deltaY > 0 ? 1.1 : 0.9; place(); dirty = true; }, { passive: false });
  labels.addEventListener('click', e => { const b = e.target.closest('.flabel'); if (b) onPick(b.dataset.id); });
  const ray = new THREE.Raycaster(), v2 = new THREE.Vector2();
  function pick(cx, cy) {
    const r = cv.getBoundingClientRect(); v2.set((cx - r.left) / r.width * 2 - 1, -(cy - r.top) / r.height * 2 + 1);
    ray.setFromCamera(v2, cam);
    const hit = ray.intersectObjects(bgroup.children, true)[0];
    if (hit && hit.object.userData.id && !opts.moving) { onPick(hit.object.userData.id); return; }
    // ťuk na políčko (přesouvání budovy): průsečík se zemí → šestiúhelník
    if (opts.onTile && ray.ray.direction.y < 0) { const t = (0.15 - ray.ray.origin.y) / ray.ray.direction.y, x = ray.ray.origin.x + ray.ray.direction.x * t, z = ray.ray.origin.z + ray.ray.direction.z * t; opts.onTile(...hexAt(x, z)); }
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
    focus: id => { const p = pos[id]; if (!p) return; [st.tx, st.tz] = axial(...p); st.d = Math.min(st.d, 9); place(); dirty = true; },
    destroy: () => { alive = false; cancelAnimationFrame(raf); renderer.dispose(); el.innerHTML = ''; }
  };
}
