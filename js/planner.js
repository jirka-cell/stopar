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
export function loopThrough(g, ids, closed = true) {
  const used = new Set(), out = [], cuts = [0];
  if (ids.length < 2) return null;
  for (let i = 0; i < (closed ? ids.length : ids.length - 1); i++) {
    const seg = route(g, ids[i], ids[(i + 1) % ids.length], used);
    if (!seg) return null;
    for (let j = 1; j < seg.length; j++) used.add(seg[j - 1] + '>' + seg[j]), used.add(seg[j] + '>' + seg[j - 1]);
    out.push(...(out.length ? seg.slice(1) : seg));
    cuts.push(out.length - 1);
  }
  let len = 0, nice = 0, again = 0; const seen = new Set();
  for (let i = 1; i < out.length; i++) {
    const a = out[i - 1], b = out[i], e = (g.adj.get(a) || []).find(x => x[0] === b), d = dist(g.nodes.get(a), g.nodes.get(b));
    len += d; if (e && e[2]) nice += d;
    const k = a < b ? a + '_' + b : b + '_' + a; if (seen.has(k)) again += d; seen.add(k);
  }
  return { coords: out.map(id => g.nodes.get(id)), len, nice: len ? nice / len : 0, again: len ? again / len : 0, ids, cuts, closed };
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
export function choiceHTML(loops, sel, info) {
  const pr = info.prof, L = loops[sel], mins = L ? walkMinutes(L.len, pr ? pr.up : 0, pr ? pr.down : 0, info.kmh) : 0;
  const eta = new Date(Date.now() + mins * 60000).toLocaleTimeString('cs-CZ', { hour: '2-digit', minute: '2-digit' });
  // sbalený panel: jen souhrn, ať je vidět mapa a jde přidávat body
  if (info.mini && L) return `<div class="plmini"><span><b style="color:${ROUTE_COLORS[sel]}">●</b> ${(L.len / 1000).toFixed(1).replace('.', ',')} km · ${fmtMin(mins)}${pr ? ' · ↑ ' + pr.up + ' m' : ''}</span><button class="btn sm primary" data-act="plStart">Jít</button><button class="btn sm" data-act="plMini" aria-label="Rozbalit panel">▾</button></div>`;
  return `<button class="btn sm plfold" data-act="plMini" aria-label="Sbalit panel">▴</button><div class="plchoice">${loops.map((L, i) => `<button class="chip${i === sel ? ' on' : ''}" data-act="plSel" data-i="${i}" style="border-color:${ROUTE_COLORS[i]}"><b style="color:${ROUTE_COLORS[i]}">●</b> ${(L.len / 1000).toFixed(1).replace('.', ',')} km · ${Math.round(L.nice * 100)} % pěšin${i === sel ? ' · ' + fmtMin(mins) : ''}</button>`).join('')}</div>
  ${pr ? `<p class="msg small plsum">↑ ${pr.up} m · ↓ ${pr.down} m · nejvýš ${pr.max} m n. m. · příchod kolem ${eta}</p>${profileSVG(pr, info.mark)}` : ''}
  <div class="chips plpace">${PACES.map(([v, n]) => `<button class="chip${Number(info.kmh) === v ? ' on' : ''}" data-act="plKmh" data-v="${v}">${n}</button>`).join('')}<label class="chip">vlastní <input type="number" id="plKmhIn" min="1" max="8" step="0.5" value="${info.kmh}" aria-label="Vlastní tempo v km/h"> km/h</label></div>
  <p class="msg small">Body posuneš prstem, nový přidáš podržením prstu na čáře.</p>
  <div class="tools"><button class="btn sm" data-act="plPoints">Body (${L ? L.ids.length : 0})</button><button class="btn sm" data-act="plClosed">Typ: ${L && L.closed ? 'okruh ↻' : 'do cíle →'}</button></div>
  <div class="tools"><button class="btn sm primary" data-act="plStart">Jít po trase</button><button class="btn sm" data-act="plSave">Uložit</button><button class="btn sm" data-act="plCancel">Zrušit</button></div>`;
}

/* ---------- úpravy trasy, profil a čas ---------- */
// Kam vložit nový průchozí bod: za bod trasy, v jehož úseku leží nejbližší místo čáry
export function viaIndex(L, p) {
  let bi = 0, bd = Infinity;
  L.coords.forEach((c, i) => { const d = dist(p, c); if (d < bd) { bd = d; bi = i; } });
  let k = 0; while (k + 1 < L.cuts.length && L.cuts[k + 1] <= bi) k++;
  return { at: Math.min(k + 1, L.ids.length), d: bd };
}
// Body podél trasy po stejných vzdálenostech (pro profil)
export function samplesAlong(pts, n) {
  const total = pathLength(pts), out = [[0, pts[0]]];
  let i = 1, acc = 0;
  for (let k = 1; k <= n; k++) {
    const goal = total * k / n;
    while (i < pts.length && acc + dist(pts[i - 1], pts[i]) < goal - 1e-6) { acc += dist(pts[i - 1], pts[i]); i++; }
    if (i >= pts.length) { out.push([total, pts[pts.length - 1]]); continue; }
    const d = dist(pts[i - 1], pts[i]), t = d ? (goal - acc) / d : 0;
    out.push([goal, [pts[i - 1][0] + (pts[i][0] - pts[i - 1][0]) * t, pts[i - 1][1] + (pts[i][1] - pts[i - 1][1]) * t]]);
  }
  return out;
}
// Podélný profil: výšky ve vzorcích (null = dlaždice se načítá), stoupání a klesání s tolerancí 3 m proti šumu
export function profile(pts, elevAt, n = 80) {
  const s = samplesAlong(pts, n), h = s.map(([, p]) => { const v = elevAt(p[0], p[1]); return Number.isFinite(v) ? v : null; });
  const known = h.filter(v => v != null);
  let up = 0, down = 0, last = known.length ? known[0] : 0;
  for (const v of known) { if (v - last >= 3) { up += v - last; last = v; } else if (last - v >= 3) { down += last - v; last = v; } }
  return { d: s.map(x => x[0]), p: s.map(x => x[1]), h, up: Math.round(up), down: Math.round(down), min: known.length ? Math.min(...known) : 0, max: known.length ? Math.max(...known) : 0, ready: known.length === h.length };
}
// Čas chůze (min) jako u turistických značek: vodorovně tempem kmh, nahoru 300 m/h a dolů 500 m/h (pro tempo 4 km/h);
// celkem = delší z obou + polovina kratšího
export function walkMinutes(lenM, up, down, kmh) {
  const k = Math.max(0.5, Number(kmh) || 4), th = lenM / 1000 / k, tv = up / (300 * k / 4) + down / (500 * k / 4);
  return Math.round((Math.max(th, tv) + Math.min(th, tv) / 2) * 60);
}
export const fmtMin = m => m < 60 ? m + ' min' : Math.floor(m / 60) + ' h ' + String(m % 60).padStart(2, '0') + ' min';
export function profileSVG(pr, mark = -1) {
  const W = 300, H = 64, total = pr.d[pr.d.length - 1] || 1, lo = pr.min - 5, span = Math.max(20, pr.max - lo + 5);
  const pts = pr.h.map((v, i) => v == null ? null : [pr.d[i] / total * W, H - (v - lo) / span * (H - 4)]).filter(Boolean);
  if (pts.length < 2) return '<div class="plprof empty">Výškový profil se načítá…</div>';
  const line = pts.map((p, i) => (i ? 'L' : 'M') + p[0].toFixed(1) + ' ' + p[1].toFixed(1)).join('');
  const x = mark >= 0 ? (pr.d[mark] / total * W).toFixed(1) : null;
  const m = x != null ? `<line x1="${x}" x2="${x}" y1="0" y2="${H}" stroke="#24301f" stroke-width="1.5" vector-effect="non-scaling-stroke"/>` : '';
  return `<svg class="plprof" viewBox="0 0 ${W} ${H}" preserveAspectRatio="none" data-act="plProf" role="img" aria-label="Výškový profil trasy"><path d="${line}L${W} ${H}L0 ${H}Z" fill="#cfe3c4"/><path d="${line}" fill="none" stroke="#2f7d4f" stroke-width="2" vector-effect="non-scaling-stroke"/>${m}</svg>`;
}
export const PACES = [[2.5, '🧒 S dětmi'], [3.5, '🚶 Pohodově'], [5, '⚡ Svižně']];
// Seznam bodů trasy: posun, smazání, název; čas k bodu podle podílu délky
export function pointsHTML(L, names, minutes) {
  const total = L.coords.length > 1 ? pathLength(L.coords) : 0;
  const at = k => total ? Math.round(minutes * pathLength(L.coords.slice(0, L.cuts[k] + 1)) / total) : 0;
  const n = L.ids.length;
  return `<h2>Body trasy</h2><p class="msg small">${L.closed ? 'Okruh se vrací na start.' : 'Trasa končí v posledním bodě.'} Nový bod přidáš podržením prstu na čáře trasy.</p>
  ${L.ids.map((id, k) => `<div class="quest"><span class="ptrow"><b>${k ? (!L.closed && k === n - 1 ? '🏁' : k) : '🚩'}</b><input type="text" maxlength="30" data-pt="${id}" value="${esc(names[id] || '')}" placeholder="${k ? 'Bod ' + k : 'Start'}" aria-label="Název bodu"><small>${k ? '+' + fmtMin(at(k)) : ''}</small></span>
    <span>${k ? `<button class="btn sm" data-act="ptUp" data-k="${k}" aria-label="Posunout dřív"${k < 2 ? ' disabled' : ''}>↑</button> <button class="btn sm" data-act="ptDown" data-k="${k}" aria-label="Posunout později"${k === n - 1 ? ' disabled' : ''}>↓</button> <button class="btn sm ghost" data-act="ptDel" data-k="${k}" aria-label="Smazat bod"${n <= 2 ? ' disabled' : ''}>✕</button>` : ''}</span></div>`).join('')}
  <button class="btn full ghost" data-act="close">Hotovo</button>`;
}
// Průběh po trase: kolik metrů od startu je místo nejblíž hráči (kolmý průmět na úseky) a jak daleko je od trasy
export function progressAlong(pts, p) {
  let acc = 0, best = { along: 0, off: Infinity };
  for (let i = 1; i < pts.length; i++) {
    const a = pts[i - 1], b = pts[i], d = dist(a, b);
    const k = mPerDegLon(a[0]), bx = (b[1] - a[1]) * k, by = (b[0] - a[0]) * mPerDegLat, px = (p[1] - a[1]) * k, py = (p[0] - a[0]) * mPerDegLat;
    const t = bx || by ? Math.max(0, Math.min(1, (px * bx + py * by) / (bx * bx + by * by))) : 0, off = Math.hypot(px - t * bx, py - t * by);
    if (off < best.off) best = { along: acc + t * d, off };
    acc += d;
  }
  return { along: best.along, off: best.off, total: acc };
}
