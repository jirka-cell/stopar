// Plánovač procházek: graf pěšin z OpenStreetMap, okruhy dané délky počítané v telefonu (bez navigační služby),
// úpravy posouváním bodů, odměny na trase, oblíbené trasy a sdílení odkazem/QR.
import { esc } from './config.js';
import { mPerDegLat, mPerDegLon } from './geo.js';

const num = (v, d = 0) => Number.isFinite(Number(v)) ? Number(v) : d;
export const dist = (a, b) => Math.hypot((a[0] - b[0]) * mPerDegLat, (a[1] - b[1]) * mPerDegLon(a[0])); // [lat, lon]

// Cena metru podle typu cesty: pěšiny levné, ulice dražší (ať trasa vede přírodou), schody dražší
export const COST = { footway: 1, path: 0.9, track: 0.95, bridleway: 1, pedestrian: 1.1, steps: 1.6, cycleway: 1.2, living_street: 1.3, service: 1.6, residential: 1.8, unclassified: 1.9, tertiary: 2.6 };
export const HIGHWAYS = Object.keys(COST).join('|');
export const graphQuery = (lat, lon, r) => `[out:json][timeout:25];way["highway"~"^(${HIGHWAYS})$"]["access"!~"^(private|no)$"]["foot"!~"^no$"](around:${Math.round(r)},${lat.toFixed(5)},${lon.toFixed(5)});out body;>;out skel qt;`;

/* ---------- graf ---------- */
export function buildGraph(json) {
  const nodes = new Map(), adj = new Map();
  for (const el of (json && json.elements) || []) if (el.type === 'node') nodes.set(el.id, [el.lat, el.lon]);
  const link = (a, b, w, nice) => { if (!adj.has(a)) adj.set(a, []); adj.get(a).push([b, w, nice]); };
  for (const el of (json && json.elements) || []) {
    if (el.type !== 'way' || !Array.isArray(el.nodes)) continue;
    const c = COST[(el.tags || {}).highway] || 2, nice = c <= 1.1 ? 1 : 0;
    for (let i = 1; i < el.nodes.length; i++) {
      const a = el.nodes[i - 1], b = el.nodes[i], pa = nodes.get(a), pb = nodes.get(b);
      if (!pa || !pb) continue;
      const d = dist(pa, pb);
      link(a, b, d * c, nice ? d : 0); link(b, a, d * c, nice ? d : 0);
    }
  }
  return { nodes, adj };
}
export function nearestNode(g, p) {
  let best = null, bd = Infinity;
  for (const [id, q] of g.nodes) { if (!g.adj.has(id)) continue; const d = dist(p, q); if (d < bd) { bd = d; best = id; } }
  return best;
}
// A* s binární haldou; used = hrany už použité (opakování se trestá), vrací seznam uzlů
export function route(g, from, to, used = null) {
  if (!g.nodes.has(from) || !g.nodes.has(to)) return null;
  if (from === to) return [from];
  const goal = g.nodes.get(to), h = id => dist(g.nodes.get(id), goal);
  const gS = new Map([[from, 0]]), prev = new Map(), heap = [[h(from), from]], closed = new Set();
  const push = x => { heap.push(x); let i = heap.length - 1; while (i) { const p = (i - 1) >> 1; if (heap[p][0] <= heap[i][0]) break; [heap[p], heap[i]] = [heap[i], heap[p]]; i = p; } };
  const pop = () => { const top = heap[0], last = heap.pop(); if (heap.length) { heap[0] = last; let i = 0; for (;;) { const l = 2 * i + 1, r = l + 1; let m = i; if (l < heap.length && heap[l][0] < heap[m][0]) m = l; if (r < heap.length && heap[r][0] < heap[m][0]) m = r; if (m === i) break; [heap[m], heap[i]] = [heap[i], heap[m]]; i = m; } } return top; };
  let guard = 0;
  while (heap.length && guard++ < 200000) {
    const [, u] = pop();
    if (u === to) { const path = [u]; let x = u; while (prev.has(x)) { x = prev.get(x); path.push(x); } return path.reverse(); }
    if (closed.has(u)) continue; closed.add(u);
    for (const [v, w] of g.adj.get(u) || []) {
      const cost = gS.get(u) + w * (used && used.has(u + '>' + v) ? 3 : 1);
      if (cost < (gS.has(v) ? gS.get(v) : Infinity)) { gS.set(v, cost); prev.set(v, u); push([cost + h(v), v]); }
    }
  }
  return null;
}
const destination = (p, bearingDeg, m) => { const b = bearingDeg * Math.PI / 180; return [p[0] + Math.cos(b) * m / mPerDegLat, p[1] + Math.sin(b) * m / mPerDegLon(p[0])]; };

// Okruh přes body (uzly); vrací souřadnice, délku a podíl pěšin
export function loopThrough(g, ids) {
  const used = new Set(), out = [];
  for (let i = 0; i < ids.length; i++) {
    const seg = route(g, ids[i], ids[(i + 1) % ids.length], used);
    if (!seg) return null;
    for (let j = 1; j < seg.length; j++) used.add(seg[j - 1] + '>' + seg[j]), used.add(seg[j] + '>' + seg[j - 1]);
    out.push(...(out.length ? seg.slice(1) : seg));
  }
  let len = 0, nice = 0, again = 0; const seen = new Set();
  for (let i = 1; i < out.length; i++) {
    const a = out[i - 1], b = out[i], e = (g.adj.get(a) || []).find(x => x[0] === b), d = dist(g.nodes.get(a), g.nodes.get(b));
    len += d; if (e && e[2]) nice += d;
    const k = a < b ? a + '_' + b : b + '_' + a; if (seen.has(k)) again += d; seen.add(k);
  }
  return { coords: out.map(id => g.nodes.get(id)), len, nice: len ? nice / len : 0, again: len ? again / len : 0, ids };
}
// Návrhy okruhů: trojúhelník start → P1 → P2 → start pro 12 směrů; skóre = délka, pěšiny, málo opakování, nálada
export function suggestLoops(g, start, lengthM, score = () => 0, count = 3) {
  const s = nearestNode(g, start); if (s == null) return [];
  const side = lengthM / 3.4, out = [];
  for (let k = 0; k < 12; k++) {
    const th = k * 30, p1 = nearestNode(g, destination(start, th, side)), p2 = nearestNode(g, destination(start, th + 60, side));
    if (p1 == null || p2 == null || p1 === s || p2 === s || p1 === p2) continue;
    const L = loopThrough(g, [s, p1, p2]); if (!L || L.len < lengthM * 0.4) continue;
    L.score = -Math.abs(L.len - lengthM) / lengthM * 3 + L.nice * 1.5 - L.again * 2 + score(L);
    out.push(L);
  }
  out.sort((a, b) => b.score - a.score);
  const picked = [];
  for (const L of out) { if (picked.every(p => overlap(p, L) < 0.6)) picked.push(L); if (picked.length >= count) break; }
  return picked;
}
function overlap(a, b) { const sa = new Set(a.coords.map(c => c.join())); return b.coords.filter(c => sa.has(c.join())).length / b.coords.length; }

/* ---------- zjednodušení a odkaz ---------- */
export function simplify(pts, tol) {
  if (pts.length < 3) return pts.slice();
  const keep = new Array(pts.length).fill(false); keep[0] = keep[pts.length - 1] = true;
  const st = [[0, pts.length - 1]];
  while (st.length) {
    const [a, b] = st.pop(); let md = 0, mi = -1;
    for (let i = a + 1; i < b; i++) { const d = segDist(pts[i], pts[a], pts[b]); if (d > md) { md = d; mi = i; } }
    if (md > tol) { keep[mi] = true; st.push([a, mi], [mi, b]); }
  }
  return pts.filter((_, i) => keep[i]);
}
function segDist(p, a, b) {
  const k = mPerDegLon(a[0]), ax = a[1] * k, ay = a[0] * mPerDegLat, bx = b[1] * k - ax, by = b[0] * mPerDegLat - ay, px = p[1] * k - ax, py = p[0] * mPerDegLat - ay;
  const t = bx || by ? Math.max(0, Math.min(1, (px * bx + py * by) / (bx * bx + by * by))) : 0;
  return Math.hypot(px - t * bx, py - t * by);
}
// Kódování polyline (Google, přesnost 1e-5) – krátký zápis trasy do odkazu/QR
export function encodePolyline(pts) {
  let out = '', pl = 0, po = 0;
  const enc = v => { v = v < 0 ? ~(v << 1) : v << 1; let s = ''; while (v >= 0x20) { s += String.fromCharCode((0x20 | (v & 0x1f)) + 63); v >>= 5; } return s + String.fromCharCode(v + 63); };
  for (const [la, lo] of pts) { const a = Math.round(la * 1e5), b = Math.round(lo * 1e5); out += enc(a - pl) + enc(b - po); pl = a; po = b; }
  return out;
}
export function decodePolyline(s) {
  const pts = []; let i = 0, la = 0, lo = 0;
  const dec = () => { let r = 0, sh = 0, b; do { if (i >= s.length) throw new Error('bad'); b = s.charCodeAt(i++) - 63; r |= (b & 0x1f) << sh; sh += 5; } while (b >= 0x20); return r & 1 ? ~(r >> 1) : r >> 1; };
  try { while (i < s.length) { la += dec(); lo += dec(); pts.push([la / 1e5, lo / 1e5]); } } catch (e) { return null; }
  return pts;
}
export const pathLength = pts => pts.reduce((a, p, i) => i ? a + dist(pts[i - 1], p) : 0, 0);
// Odměny na trase: body rozmístěné rovnoměrně podle délky (čtvrtina, polovina, tři čtvrtiny…)
export function checkpointsAlong(pts, n) {
  const total = pathLength(pts), out = [];
  for (let k = 1; k <= n; k++) {
    const goal = total * k / (n + 1); let acc = 0;
    for (let i = 1; i < pts.length; i++) { const d = dist(pts[i - 1], pts[i]); if (acc + d >= goal) { const t = d ? (goal - acc) / d : 0; out.push([pts[i - 1][0] + (pts[i][0] - pts[i - 1][0]) * t, pts[i - 1][1] + (pts[i][1] - pts[i - 1][1]) * t]); break; } acc += d; }
  }
  return out;
}
export function cleanRoute(r) {
  if (!r || typeof r !== 'object' || typeof r.p !== 'string') return null;
  const pts = decodePolyline(r.p); if (!pts || pts.length < 2) return null;
  return { id: String(r.id || '').slice(0, 20) || String(Date.now()), n: String(r.n || 'Trasa').slice(0, 60), p: r.p.slice(0, 4000), len: Math.round(pathLength(pts)), c: num(r.c) };
}

/* ---------- obrazovky ---------- */
export const MOODS = [['any', '🚶', 'Jakkoli'], ['kids', '🧒', 'Krátká s dětmi'], ['water', '💧', 'K vodě'], ['forest', '🌲', 'Lesem'], ['targets', '🔭', 'Kolem cílů']];
export function plannerHTML(p, routes) {
  return `<h2>Naplánovat procházku</h2>
  <div class="presetnew"><input type="search" id="plQ" maxlength="80" placeholder="Hledat místo (např. Stromovka)" aria-label="Hledat místo" value="${esc(p.q || '')}"><button class="btn" data-act="plSearch">Hledat</button></div>
  <div id="plRes">${(p.results || []).map((r, i) => `<button class="btn full" data-act="plPick" data-i="${i}">📍 ${esc(r.name)}</button>`).join('')}</div>
  <p class="msg small">Start: <b>${esc(p.startName || 'kde právě jsem')}</b> · <a href="#" data-act="plHere">moje poloha</a> · <a href="#" data-act="plTap">ťuknout do mapy</a></p>
  <div class="fld"><label for="plLen">Délka: <b id="plLenV">${(p.len / 1000).toFixed(1).replace('.', ',')} km</b></label><input type="range" id="plLen" min="1000" max="10000" step="500" value="${p.len}"></div>
  <div class="look"><div class="chips">${MOODS.map(([k, ic, n]) => `<button class="chip${p.mood === k ? ' on' : ''}" data-act="plMood" data-v="${k}">${ic} ${n}</button>`).join('')}</div></div>
  <label class="fld row">Rozmístit na trase odměny<input type="checkbox" id="plRew"${p.rewards ? ' checked' : ''}></label>
  <p class="msg small" id="plMsg">${esc(p.msg || '')}</p>
  <button class="btn primary full" data-act="plGo">Navrhnout trasy</button>
  ${routes.length ? `<h3>Oblíbené trasy</h3>${routes.map(r => `<div class="quest"><span><b>${esc(r.n)}</b><br><small>${(r.len / 1000).toFixed(1).replace('.', ',')} km</small></span><span><button class="btn sm" data-act="rtWalk" data-id="${esc(r.id)}">Jít</button> <button class="btn sm" data-act="rtShare" data-id="${esc(r.id)}">QR</button> <button class="btn sm ghost" data-act="rtDel" data-id="${esc(r.id)}" data-confirm="Smazat?" aria-label="Smazat trasu">✕</button></span></div>`).join('')}` : ''}
  <button class="btn full ghost" data-act="close">Zavřít</button>`;
}
export const ROUTE_COLORS = ['#e2602a', '#7b4fd8', '#1f8fb0'];
export function choiceHTML(loops, sel, kidsKmh) {
  return `<div class="plchoice">${loops.map((L, i) => `<button class="chip${i === sel ? ' on' : ''}" data-act="plSel" data-i="${i}" style="border-color:${ROUTE_COLORS[i]}"><b style="color:${ROUTE_COLORS[i]}">●</b> ${(L.len / 1000).toFixed(1).replace('.', ',')} km · ${Math.round(L.len / 1000 / kidsKmh * 60)} min · ${Math.round(L.nice * 100)} % pěšin</button>`).join('')}</div>
  <p class="msg small">Body trasy můžeš posunout prstem.</p>
  <div class="tools"><button class="btn sm primary" data-act="plStart">Jít po trase</button><button class="btn sm" data-act="plSave">Uložit</button><button class="btn sm" data-act="plCancel">Zrušit</button></div>`;
}
