// Herna (test), etapy 2–5: mřížkové hádanky, strategie, obrázky a prostor, hry venku s polohou.
// Stejné ctx jako herna.js, navíc pos() → {lat, lon} | null a bioHere() → id biotopu | null.
import { esc, parseMonths } from './config.js';
import { dist } from './geo.js';
import { squareImage, playPuzzle } from './minigames.js';
import { HERNA, shuffle, pick, sample, int, uniqBy, top, word, card, frame, rounds, choose, chooseMix, byGroup, near } from './herna.js';

/* ---------- mřížka ---------- */
const N4 = [[1, 0], [-1, 0], [0, 1], [0, -1]], N8 = [...N4, [1, 1], [1, -1], [-1, 1], [-1, -1]];
const grid = (R, C, f, cls = '') => `<div class="hgr ${cls}" style="--c:${C}">${Array.from({ length: R * C }, (_, k) => { const r = Math.floor(k / C), c = k % C; return `<button class="hgc" data-r="${r}" data-c="${c}">${f(r, c)}</button>`; }).join('')}</div>`;
const cellOf = (b, r, c) => b.querySelector(`.hgc[data-r="${r}"][data-c="${c}"]`);
const onCells = (b, fn) => b.querySelectorAll('.hgc').forEach(x => x.onclick = () => fn(+x.dataset.r, +x.dataset.c, x));
const inside = (R, C) => (r, c) => r >= 0 && c >= 0 && r < R && c < C;
// nejkratší cesta po polích (BFS); ok(r, c) = dá se tam vstoupit
export function bfs(R, C, from, isGoal, ok, nb = N4) {
  const seen = new Map([[from + '', 0]]), q = [from], In = inside(R, C);
  while (q.length) { const [r, c] = q.shift(), d = seen.get(r + ',' + c); if (isGoal(r, c)) return d; for (const [dr, dc] of nb) { const k = [r + dr, c + dc]; if (In(...k) && ok(...k) && !seen.has(k + '')) { seen.set(k + '', d + 1); q.push(k); } } }
  return -1;
}
const arrows = () => `<div class="harr"><span></span><button class="hk" data-d="0">↑</button><span></span><button class="hk" data-d="3">←</button><span></span><button class="hk" data-d="1">→</button><span></span><button class="hk" data-d="2">↓</button><span></span></div>`;
const DIRS = [[-1, 0], [0, 1], [1, 0], [0, -1]];
const IC = (ctx, n) => ctx.ic(n);

/* ---------- etapa 2: mřížkové hádanky ---------- */
function maze(n) { // n liché; true = zeď
  const g = Array.from({ length: n }, () => Array(n).fill(true)), st = [[1, 1]]; g[1][1] = false;
  while (st.length) { const [r, c] = st.at(-1), nb = shuffle(N4).map(([dr, dc]) => [r + dr * 2, c + dc * 2, r + dr, c + dc]).filter(([a, b]) => a > 0 && b > 0 && a < n - 1 && b < n - 1 && g[a][b]); if (!nb.length) { st.pop(); continue; } const [a, b, wr, wc] = nb[0]; g[wr][wc] = g[a][b] = false; st.push([a, b]); }
  return g;
}
function playMaze(el, ctx) { // 21
  rounds(el, ctx, 3, 'Doveď lišku do nory. Ťukej na pole vedle ní.', (i, b, ans) => {
    const n = [7, 9, 11][i], g = maze(n), goal = [n - 2, n - 2], best = bfs(n, n, [1, 1], (r, c) => r === goal[0] && c === goal[1], (r, c) => !g[r][c]);
    let at = [1, 1], steps = 0;
    const draw = () => { b.innerHTML = `<p class="hq">Kroků: ${steps} (nejkratší ${best})</p>` + grid(n, n, (r, c) => g[r][c] ? '' : r === at[0] && c === at[1] ? '🦊' : r === goal[0] && c === goal[1] ? '🕳️' : '', 'maze'); b.querySelectorAll('.hgc').forEach(x => { if (g[+x.dataset.r][+x.dataset.c]) x.classList.add('wall'); }); onCells(b, move); };
    const move = (r, c) => { if (g[r][c] || Math.abs(r - at[0]) + Math.abs(c - at[1]) !== 1) return; at = [r, c]; steps++; draw(); if (r === goal[0] && c === goal[1]) ans(steps <= best + 4); };
    draw();
  });
}
function playAnts(el, ctx) { // 22
  rounds(el, ctx, 3, 'Mravenec jde z levého horního rohu do pravého dolního, jen doprava nebo dolů. Na každém listu ztratí tolik sil, kolik je na něm. Najdi nejlehčí cestu.', (i, b, ans) => {
    const n = 4 + Math.min(i, 1), v = Array.from({ length: n }, () => Array.from({ length: n }, () => int(1, 9)));
    const dp = v.map(row => row.slice()); for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) if (r || c) dp[r][c] += Math.min(r ? dp[r - 1][c] : Infinity, c ? dp[r][c - 1] : Infinity);
    const path = [[0, 0]]; let sum = v[0][0];
    const draw = () => { b.innerHTML = `<p class="hq">Síly: ${sum}</p>` + grid(n, n, (r, c) => `<b>${v[r][c]}</b>`, 'leaf'); path.forEach(([r, c]) => cellOf(b, r, c).classList.add('sel')); onCells(b, step); };
    const step = (r, c) => { const [pr, pc] = path.at(-1); if (!((r === pr + 1 && c === pc) || (r === pr && c === pc + 1))) return; path.push([r, c]); sum += v[r][c]; draw(); if (r === n - 1 && c === n - 1) { b.querySelector('.hq').textContent = `Síly: ${sum} · nejlehčí cesta: ${dp[n - 1][n - 1]}`; ans(sum === dp[n - 1][n - 1]); } };
    draw();
  });
}
function playFord(el, ctx) { // 23
  rounds(el, ctx, 3, 'Přejdi potok zleva doprava po kamenech. Skákat jde i šikmo, ale jen o jedno pole.', (i, b, ans) => {
    const R = 5, C = 7; let st, best;
    for (let t = 0; t < 200; t++) { st = Array.from({ length: R }, (_, r) => Array.from({ length: C }, (_, c) => c === 0 || c === C - 1 || Math.random() < 0.38)); const s0 = int(0, R - 1); best = bfs(R, C, [s0, 0], (r, c) => c === C - 1, (r, c) => st[r][c], N8); if (best > 0) { st.start = s0; break; } }
    let at = [st.start, 0], jumps = 0;
    const draw = () => { b.innerHTML = `<p class="hq">Skoků: ${jumps}</p>` + grid(R, C, (r, c) => r === at[0] && c === at[1] ? '🐸' : st[r][c] && c > 0 && c < C - 1 ? '🪨' : '', 'ford'); b.querySelectorAll('.hgc').forEach(x => { const c = +x.dataset.c; x.classList.add(c === 0 || c === C - 1 ? 'bank' : st[+x.dataset.r][c] ? 'stone' : 'water'); }); onCells(b, hop); };
    const hop = (r, c) => { if (!st[r][c] || Math.max(Math.abs(r - at[0]), Math.abs(c - at[1])) !== 1) return; at = [r, c]; jumps++; draw(); if (c === C - 1) ans(jumps <= best + 1); };
    draw();
  });
}
// Hráz bobra: minimální řez (kolik klád je potřeba) – max-flow přes rozdělená políčka
export function minCut(R, C, rock) {
  const N = R * C, S = 2 * N, T = S + 1, cap = new Map(), adj = Array.from({ length: T + 1 }, () => new Set());
  const add = (u, v, w) => { cap.set(u + '>' + v, (cap.get(u + '>' + v) || 0) + w); cap.set(v + '>' + u, cap.get(v + '>' + u) || 0); adj[u].add(v); adj[v].add(u); };
  for (let r = 0; r < R; r++) for (let c = 0; c < C; c++) {
    if (rock[r][c]) continue; const k = r * C + c; add(2 * k, 2 * k + 1, 1);
    if (r === 0) add(S, 2 * k, 99); if (r === R - 1) add(2 * k + 1, T, 99);
    for (const [dr, dc] of N4) { const a = r + dr, b2 = c + dc; if (a >= 0 && b2 >= 0 && a < R && b2 < C && !rock[a][b2]) add(2 * k + 1, 2 * (a * C + b2), 99); }
  }
  let flow = 0;
  while (true) {
    const prev = new Map([[S, -1]]), q = [S];
    while (q.length && !prev.has(T)) { const u = q.shift(); for (const v of adj[u]) if (!prev.has(v) && cap.get(u + '>' + v) > 0) { prev.set(v, u); q.push(v); } }
    if (!prev.has(T)) return flow;
    for (let v = T; v !== S; v = prev.get(v)) { const u = prev.get(v); cap.set(u + '>' + v, cap.get(u + '>' + v) - 1); cap.set(v + '>' + u, cap.get(v + '>' + u) + 1); }
    if (++flow > 20) return flow;
  }
}
function playDam(el, ctx) { // 29
  rounds(el, ctx, 3, 'Voda teče shora dolů na louku. Polož klády (ťuknutím) tak, aby na louku nedotekla. Kamenem voda neproteče.', (i, b, ans) => {
    const R = 6, C = 6; let rock, L;
    for (let t = 0; t < 100; t++) { rock = Array.from({ length: R }, () => Array.from({ length: C }, () => Math.random() < 0.3)); L = minCut(R, C, rock); if (L >= 2 && L <= 4) break; }
    const log = new Set(); let done = false;
    const draw = (wet = new Set()) => { b.innerHTML = `<p class="hq">Klády: ${log.size} / ${L}</p>` + grid(R, C, (r, c) => rock[r][c] ? '🪨' : log.has(r + ',' + c) ? '🪵' : '', 'dam') + '<button class="btn sm primary hgo">Pustit vodu</button>'; b.querySelectorAll('.hgc').forEach(x => { if (wet.has(x.dataset.r + ',' + x.dataset.c)) x.classList.add('wet'); }); onCells(b, tap); b.querySelector('.hgo').onclick = flood; };
    const tap = (r, c) => { if (done || rock[r][c]) return; const k = r + ',' + c; if (log.has(k)) log.delete(k); else if (log.size < L) log.add(k); draw(); };
    const flood = () => {
      const wet = new Set(), q = []; for (let c = 0; c < C; c++) if (!rock[0][c] && !log.has('0,' + c)) { wet.add('0,' + c); q.push([0, c]); }
      while (q.length) { const [r, c] = q.shift(); for (const [dr, dc] of N4) { const a = r + dr, d = c + dc, k = a + ',' + d; if (a >= 0 && d >= 0 && a < R && d < C && !rock[a][d] && !log.has(k) && !wet.has(k)) { wet.add(k); q.push([a, d]); } } }
      done = true; draw(wet); ans(![...wet].some(k => k.startsWith(R - 1 + ',')));
    };
    draw();
  });
}
function playWeb(el, ctx) { // 30 Pavučina jedním tahem
  rounds(el, ctx, 3, 'Obtáhni celou pavučinu jedním tahem: ťukej na body, každou nitku smíš projít jen jednou.', (i, b, ans) => {
    const n = 5 + Math.min(i, 1), E = 6 + i * 2, used = new Set(), edges = []; let cur = int(0, n - 1);
    for (let t = 0; t < 200 && edges.length < E; t++) { const nx = int(0, n - 1), k = [Math.min(cur, nx), Math.max(cur, nx)] + ''; if (nx === cur || used.has(k)) continue; used.add(k); edges.push(k); cur = nx; }
    const P = Array.from({ length: n }, (_, k) => [150 + 110 * Math.cos(k / n * 2 * Math.PI - 1.57), 120 + 95 * Math.sin(k / n * 2 * Math.PI - 1.57)]);
    const done = new Set(); let at = null, fail = false;
    const draw = () => {
      b.innerHTML = `<p class="hq">Nitky: ${done.size} / ${edges.length}</p><svg viewBox="0 0 300 240" class="hsvg hweb">${edges.map(k => { const [a, c] = k.split(',').map(Number); return `<line x1="${P[a][0]}" y1="${P[a][1]}" x2="${P[c][0]}" y2="${P[c][1]}" stroke="${done.has(k) ? '#d9762b' : '#c9c4b8'}" stroke-width="${done.has(k) ? 5 : 3}"/>`; }).join('')}${P.map(([x, y], k) => `<circle cx="${x}" cy="${y}" r="15" data-n="${k}" fill="${k === at ? '#d9762b' : '#fff'}" stroke="#24301f" stroke-width="2"/>`).join('')}</svg><button class="btn sm hagain">Začít znovu</button>`;
      b.querySelectorAll('circle').forEach(x => x.onclick = () => tap(+x.dataset.n));
      b.querySelector('.hagain').onclick = () => { done.clear(); at = null; draw(); };
    };
    const tap = k => { if (fail) return; if (at == null) { at = k; return draw(); } const e = [Math.min(at, k), Math.max(at, k)] + ''; if (!edges.includes(e) || done.has(e)) return; done.add(e); at = k; draw(); if (done.size === edges.length) ans(true); };
    draw();
  });
}
function jugsBest(A, B, T) { const seen = new Map([['0,0', 0]]), q = [[0, 0]]; while (q.length) { const [a, b] = q.shift(), d = seen.get(a + ',' + b); if (a === T || b === T) return d; const p1 = Math.min(a, B - b), p2 = Math.min(b, A - a); for (const s of [[A, b], [a, B], [0, b], [a, 0], [a - p1, b + p1], [a + p2, b - p2]]) if (!seen.has(s + '')) { seen.set(s + '', d + 1); q.push(s); } } return -1; }
function playJugs(el, ctx) { // 31
  const SETS = [[3, 5, 4], [4, 7, 5], [5, 8, 3], [3, 7, 5], [4, 9, 6], [5, 7, 6]];
  rounds(el, ctx, 3, 'Máš dvě tůňky (A a B). Napouštěj, vylévej a přelévej, až bude v jedné přesně zadané množství vody.', (i, b, ans) => {
    const [A, B, T] = pick(SETS), best = jugsBest(A, B, T); let a = 0, c = 0, moves = 0;
    const bar = (v, m, n) => `<div class="hjug"><b>${n}</b><div class="hjb"><i style="height:${v / m * 100}%"></i></div><small>${v} / ${m}</small></div>`;
    const draw = () => { b.innerHTML = `<p class="hq">Potřebuješ <b>${T}</b> kbelíků · tahů ${moves} (nejméně ${best})</p><div class="hjugs">${bar(a, A, 'A')}${bar(c, B, 'B')}</div><div class="hkeys">${[['fa', 'Napustit A'], ['fb', 'Napustit B'], ['ea', 'Vylít A'], ['eb', 'Vylít B'], ['ab', 'A → B'], ['ba', 'B → A']].map(([k, l]) => `<button class="hk sm" data-k="${k}">${l}</button>`).join('')}</div>`;
      b.querySelectorAll('.hk').forEach(x => x.onclick = () => { const k = x.dataset.k, p1 = Math.min(a, B - c), p2 = Math.min(c, A - a); if (k === 'fa') a = A; if (k === 'fb') c = B; if (k === 'ea') a = 0; if (k === 'eb') c = 0; if (k === 'ab') { a -= p1; c += p1; } if (k === 'ba') { a += p2; c -= p2; } moves++; draw(); if (a === T || c === T) ans(moves <= best + 2); }); };
    draw();
  });
}
function slide(R, C, rock, [r, c], [dr, dc], goal) { while (true) { const a = r + dr, d = c + dc; if (a < 0 || d < 0 || a >= R || d >= C || rock[a][d]) return [r, c]; r = a; c = d; if (r === goal[0] && c === goal[1]) return [r, c]; } }
function iceBest(R, C, rock, s, goal) { const seen = new Map([[s + '', 0]]), q = [s]; while (q.length) { const p = q.shift(), d = seen.get(p + ''); if (p[0] === goal[0] && p[1] === goal[1]) return d; for (const dd of DIRS) { const n = slide(R, C, rock, p, dd, goal); if (!seen.has(n + '')) { seen.set(n + '', d + 1); q.push(n); } } } return -1; }
function playIce(el, ctx) { // 39
  rounds(el, ctx, 3, 'Tuleň klouže po ledu, dokud nenarazí na kámen nebo okraj. Dostaň ho do díry ve ledu (🕳️).', (i, b, ans) => {
    const R = 6, C = 6; let rock, s, goal, best = -1;
    for (let t = 0; t < 300; t++) { rock = Array.from({ length: R }, () => Array.from({ length: C }, () => Math.random() < 0.18)); s = [int(0, R - 1), int(0, C - 1)]; goal = [int(0, R - 1), int(0, C - 1)]; rock[s[0]][s[1]] = rock[goal[0]][goal[1]] = false; best = iceBest(R, C, rock, s, goal); if (best >= 3 + i && best <= 7) break; }
    let at = s, moves = 0;
    const draw = () => { b.innerHTML = `<p class="hq">Tahů: ${moves} (nejméně ${best})</p>` + grid(R, C, (r, c) => r === at[0] && c === at[1] ? '🦭' : rock[r][c] ? '🪨' : r === goal[0] && c === goal[1] ? '🕳️' : '', 'ice') + arrows() + '<button class="btn sm hreset">Znovu od začátku</button>';
      b.querySelectorAll('.harr .hk').forEach(x => x.onclick = () => { at = slide(R, C, rock, at, DIRS[+x.dataset.d], goal); moves++; draw(); if (at[0] === goal[0] && at[1] === goal[1]) ans(moves <= best + 2); });
      b.querySelector('.hreset').onclick = () => { at = s; draw(); }; };
    draw();
  });
}
function playBoxes(el, ctx) { // 40
  rounds(el, ctx, 3, 'Na stromy (🌳) rozvěs budky tak, aby žádné dvě nebyly vedle sebe (ani šikmo) – ptáci by se rušili.', (i, b, ans) => {
    const R = 5, C = 5, K = 3 + Math.min(i, 2), sol = [];
    for (const k of shuffle([...Array(R * C).keys()])) { const r = Math.floor(k / C), c = k % C; if (sol.every(([a, d]) => Math.max(Math.abs(a - r), Math.abs(d - c)) > 1)) sol.push([r, c]); if (sol.length === K) break; }
    const trees = new Set([...sol.map(p => p + ''), ...sample([...Array(R * C).keys()].map(k => [Math.floor(k / C), k % C] + ''), 6)]), box = new Set();
    const draw = (bad = new Set()) => { b.innerHTML = `<p class="hq">Budky: ${box.size} / ${K}</p>` + grid(R, C, (r, c) => box.has(r + ',' + c) ? '🏠' : trees.has(r + ',' + c) ? '🌳' : '', 'boxes') + '<button class="btn sm primary hgo">Hotovo</button>'; b.querySelectorAll('.hgc').forEach(x => { if (bad.has(x.dataset.r + ',' + x.dataset.c)) x.classList.add('bad'); }); onCells(b, tap); b.querySelector('.hgo').onclick = check; };
    const tap = (r, c) => { const k = r + ',' + c; if (!trees.has(k)) return; box.has(k) ? box.delete(k) : box.size < K && box.add(k); draw(); };
    const check = () => { const P = [...box].map(k => k.split(',').map(Number)), bad = new Set(); P.forEach((p, j) => P.forEach((q, m) => { if (j !== m && Math.max(Math.abs(p[0] - q[0]), Math.abs(p[1] - q[1])) <= 1) bad.add(p + ''); })); draw(bad); if (box.size === K) ans(!bad.size); else b.querySelector('.hq').textContent = `Rozvěs všech ${K} budek.`; };
    draw();
  });
}
// Logická mřížka: kdo bydlí ve které noře (3 zvířata, nory 1–3 zleva)
const PERMS = [[0, 1, 2], [0, 2, 1], [1, 0, 2], [1, 2, 0], [2, 0, 1], [2, 1, 0]];
export function gridClues(names, perm) {
  const pool = [];
  names.forEach((x, a) => { [0, 1, 2].forEach(n => pool.push(perm[a] === n ? { t: `${x} bydlí v noře ${n + 1}.`, f: p => p[a] === n, w: 1 } : { t: `${x} nebydlí v noře ${n + 1}.`, f: p => p[a] !== n, w: 2 })); names.forEach((y, b) => { if (a === b) return; if (perm[a] < perm[b]) pool.push({ t: `${x} bydlí víc vlevo než ${y}.`, f: p => p[a] < p[b], w: 3 }); if (Math.abs(perm[a] - perm[b]) === 1) pool.push({ t: `${x} bydlí hned vedle: ${y}.`, f: p => Math.abs(p[a] - p[b]) === 1, w: 3 }); }); });
  for (let t = 0; t < 200; t++) {
    const cl = []; for (const c of shuffle(pool.filter(c => c.w > 1))) { cl.push(c); if (PERMS.filter(p => cl.every(k => k.f(p))).length === 1) return cl; if (cl.length >= 4) break; }
  }
  return [pool.find(c => c.w === 1), ...pool.filter(c => c.w > 1).slice(0, 2)];
}
function playLogic(el, ctx) { // 42
  rounds(el, ctx, 3, 'Podle nápověd přiřaď každé zvíře jeho noru (1–3 zleva).', (i, b, ans) => {
    const sp = sample(byGroup(ctx, 'Savci'), 3), perm = pick(PERMS), clues = gridClues(sp.map(s => word(s)), perm), mine = [null, null, null];
    const draw = () => { b.innerHTML = `<ol class="hclues">${clues.map(c => `<li>${esc(c.t)}</li>`).join('')}</ol>${sp.map((s, a) => `<div class="hlrow"><span class="him small">${ctx.img(s)}</span><b>${esc(word(s))}</b>${[0, 1, 2].map(n => `<button class="hk${mine[a] === n ? ' on' : ''}" data-a="${a}" data-n="${n}">${n + 1}</button>`).join('')}</div>`).join('')}<button class="btn sm primary hgo">Hotovo</button>`;
      b.querySelectorAll('.hk').forEach(x => x.onclick = () => { mine[+x.dataset.a] = +x.dataset.n; draw(); });
      b.querySelector('.hgo').onclick = () => { if (mine.includes(null)) return; const ok = mine.every((n, a) => n === perm[a]); sp.forEach((_, a) => b.querySelector(`.hk[data-a="${a}"][data-n="${perm[a]}"]`).classList.add('good')); ans(ok); }; };
    draw();
  });
}
function mst(n, E) { const p = [...Array(n).keys()], f = x => p[x] === x ? x : (p[x] = f(p[x])); let s = 0; for (const [a, b, w] of E.slice().sort((x, y) => x[2] - y[2])) if (f(a) !== f(b)) { p[f(a)] = f(b); s += w; } return s; }
function playBurrow(el, ctx) { // 79
  rounds(el, ctx, 3, 'Propoj všechny komůrky nory chodbami. Číslo je pracnost chodby – vyber chodby tak, aby byly propojené a práce bylo co nejméně.', (i, b, ans) => {
    const n = 5 + Math.min(i, 1), P = []; while (P.length < n) { const p = [int(30, 270), int(30, 190)]; if (P.every(q => Math.hypot(p[0] - q[0], p[1] - q[1]) > 60)) P.push(p); }
    const E = []; for (let a = 0; a < n; a++) for (let c = a + 1; c < n; c++) { const d = Math.hypot(P[a][0] - P[c][0], P[a][1] - P[c][1]); if (d < 170) E.push([a, c, Math.max(1, Math.round(d / 20))]); }
    const best = mst(n, E), on = new Set();
    const conn = () => { const p = [...Array(n).keys()], f = x => p[x] === x ? x : (p[x] = f(p[x])); [...on].forEach(j => { p[f(E[j][0])] = f(E[j][1]); }); return new Set([...Array(n).keys()].map(f)).size === 1; };
    const draw = () => { const cost = [...on].reduce((s, j) => s + E[j][2], 0);
      b.innerHTML = `<p class="hq">Práce: ${cost}</p><svg viewBox="0 0 300 220" class="hsvg hburrow"><rect width="300" height="220" rx="10" fill="#c9a77a"/>${E.map(([a, c, w], j) => `<g data-j="${j}"><line x1="${P[a][0]}" y1="${P[a][1]}" x2="${P[c][0]}" y2="${P[c][1]}" stroke="${on.has(j) ? '#5a3a1f' : 'rgba(90,58,31,.25)'}" stroke-width="${on.has(j) ? 7 : 3}" stroke-dasharray="${on.has(j) ? '' : '5 4'}"/><line x1="${P[a][0]}" y1="${P[a][1]}" x2="${P[c][0]}" y2="${P[c][1]}" stroke="transparent" stroke-width="18"/><text x="${(P[a][0] + P[c][0]) / 2}" y="${(P[a][1] + P[c][1]) / 2 - 4}" font-size="13" font-weight="700" fill="#24301f" text-anchor="middle">${w}</text></g>`).join('')}${P.map(([x, y]) => `<circle cx="${x}" cy="${y}" r="13" fill="#7a5230" stroke="#fff" stroke-width="2"/>`).join('')}</svg><button class="btn sm primary hgo">Hotovo</button>`;
      b.querySelectorAll('g[data-j]').forEach(g => g.onclick = () => { const j = +g.dataset.j; on.has(j) ? on.delete(j) : on.add(j); draw(); });
      b.querySelector('.hgo').onclick = () => { if (!conn()) { b.querySelector('.hq').textContent = 'Ještě nejsou propojené všechny komůrky.'; return; } b.querySelector('.hq').textContent = `Práce ${cost} · nejméně jde ${best}`; ans(cost === best); }; };
    draw();
  });
}
function playFire(el, ctx) { // 80
  const f = frame(el, 'V lese hoří. Každé kolo smíš vykácet 2 stromy (průsek), pak se oheň rozšíří na sousední stromy. Zachraň co nejvíc lesa.');
  const R = 7, C = 7, g = Array.from({ length: R }, () => Array.from({ length: C }, () => Math.random() < 0.85 ? 'T' : '.')); const s = [int(1, 5), int(1, 5)]; g[s[0]][s[1]] = 'F';
  const total = g.flat().filter(x => x === 'T').length; let cuts = 2, round = 1;
  const draw = () => { f.set(`kolo ${round}`, `průseky: ${cuts}`); f.b.innerHTML = grid(R, C, (r, c) => ({ T: '🌲', F: '🔥', B: '⬛', X: '🪓', '.': '' })[g[r][c]], 'fire') + '<button class="btn sm primary hgo">Další kolo</button>'; onCells(f.b, (r, c) => { if (cuts && g[r][c] === 'T') { g[r][c] = 'X'; cuts--; draw(); } }); f.b.querySelector('.hgo').onclick = spread; };
  const spread = () => {
    const nx = []; for (let r = 0; r < R; r++) for (let c = 0; c < C; c++) if (g[r][c] === 'F') { g[r][c] = 'B'; for (const [dr, dc] of N4) { const a = r + dr, d = c + dc; if (a >= 0 && d >= 0 && a < R && d < C && g[a][d] === 'T') nx.push([a, d]); } }
    nx.forEach(([a, d]) => { g[a][d] = 'F'; }); round++; cuts = 2;
    if (!nx.length) { draw(); const saved = g.flat().filter(x => x === 'T').length; f.b.querySelector('.hgo').remove(); setTimeout(() => ctx.done(saved, total), 900); return; }
    draw();
  };
  draw();
}
function playChase(el, ctx) { // 83
  const f = frame(el, 'Jsi liška 🦊. Chyť zajíce 🐇 – oba chodíte o jedno pole (i šikmo), zajíc utíká. Do keřů (🌳) se nedá. Máš 20 tahů.');
  const R = 6, C = 6, bush = new Set(sample([...Array(36).keys()], 5).map(k => [Math.floor(k / C), k % C] + ''));
  let fox = [0, 0], hare = [5, 5], moves = 0; bush.delete('0,0'); bush.delete('5,5');
  const free = (r, c) => r >= 0 && c >= 0 && r < R && c < C && !bush.has(r + ',' + c);
  const dFox = (r, c) => bfs(R, C, [r, c], (a, b) => a === fox[0] && b === fox[1], free, N8);
  const draw = () => { f.set(`tah ${moves} / 20`, ''); f.b.innerHTML = grid(R, C, (r, c) => r === fox[0] && c === fox[1] ? '🦊' : r === hare[0] && c === hare[1] ? '🐇' : bush.has(r + ',' + c) ? '🌳' : '', 'chase'); onCells(f.b, go); };
  const go = (r, c) => {
    if (!free(r, c) || Math.max(Math.abs(r - fox[0]), Math.abs(c - fox[1])) !== 1) return; fox = [r, c]; moves++;
    if (fox + '' === hare + '') { draw(); return setTimeout(() => ctx.done(1, 1), 600); }
    const opts = N8.map(([dr, dc]) => [hare[0] + dr, hare[1] + dc]).filter(p => free(...p) && p + '' !== fox + ''); opts.push(hare);
    const best = Math.max(...opts.map(p => dFox(...p))); hare = pick(opts.filter(p => dFox(...p) === best));
    draw(); if (moves >= 20) setTimeout(() => ctx.done(0, 1), 600);
  };
  draw();
}
function sokoBest(R, C, wall, dog, sheep, pen) {
  const key = (d, s) => d + '|' + s, seen = new Map([[key(dog, sheep), 0]]), q = [[dog, sheep]];
  while (q.length) { const [d, s] = q.shift(), k = seen.get(key(d, s)); if (s[0] === pen[0] && s[1] === pen[1]) return k;
    for (const [dr, dc] of DIRS) { const nd = [d[0] + dr, d[1] + dc]; if (!free(nd)) continue; let ns = s; if (nd + '' === s + '') { ns = [s[0] + dr, s[1] + dc]; if (!free(ns)) continue; } const kk = key(nd, ns); if (!seen.has(kk)) { seen.set(kk, k + 1); q.push([nd, ns]); } } }
  return -1;
  function free(p) { return p[0] >= 0 && p[1] >= 0 && p[0] < R && p[1] < C && !wall.has(p + ''); }
}
function playSheep(el, ctx) { // 84
  rounds(el, ctx, 3, 'Pes 🐕 tlačí ovci 🐑 před sebou. Dostaň ji do ohrady (🟩). Ovce se jen tlačí, tahat ji nejde.', (i, b, ans) => {
    const R = 6, C = 6; let wall, dog, sheep, pen, best = -1;
    for (let t = 0; t < 300; t++) { wall = new Set(sample([...Array(36).keys()], 6).map(k => [Math.floor(k / C), k % C] + '')); const cells = shuffle([...Array(36).keys()].map(k => [Math.floor(k / C), k % C]).filter(p => !wall.has(p + ''))); [dog, sheep, pen] = cells; if (sheep[0] === 0 || sheep[1] === 0 || sheep[0] === R - 1 || sheep[1] === C - 1) continue; best = sokoBest(R, C, wall, dog, sheep, pen); if (best >= 4 + i) break; }
    const start = [dog, sheep]; let moves = 0;
    const free = p => p[0] >= 0 && p[1] >= 0 && p[0] < R && p[1] < C && !wall.has(p + '');
    const draw = () => { b.innerHTML = `<p class="hq">Tahů: ${moves} (nejméně ${best})</p>` + grid(R, C, (r, c) => r === dog[0] && c === dog[1] ? '🐕' : r === sheep[0] && c === sheep[1] ? '🐑' : wall.has(r + ',' + c) ? '🪵' : '', 'sheep') + arrows() + '<button class="btn sm hreset">Znovu od začátku</button>'; const pc = cellOf(b, ...pen); if (pc) pc.classList.add('pen');
      b.querySelectorAll('.harr .hk').forEach(x => x.onclick = () => { const [dr, dc] = DIRS[+x.dataset.d], nd = [dog[0] + dr, dog[1] + dc]; if (!free(nd)) return; if (nd + '' === sheep + '') { const ns = [sheep[0] + dr, sheep[1] + dc]; if (!free(ns)) return; sheep = ns; } dog = nd; moves++; draw(); if (sheep + '' === pen + '') ans(moves <= best * 2); });
      b.querySelector('.hreset').onclick = () => { [dog, sheep] = start; draw(); }; };
    draw();
  });
}

/* ---------- etapa 3: strategie a plánování ---------- */
const NEST = [
  { who: 'kuna', c: ['Vejce zmizela celá, i se skořápkami.', 'Na kmeni jsou škrábance od drápů.', 'Stalo se v noci.'] },
  { who: 'straka', c: ['Skořápky jsou rozklované zobákem.', 'Stalo se ve dne.', 'Ráno bylo slyšet hlasité „šak šak šak“.'] },
  { who: 'jezek', c: ['Hnízdo bylo nízko na zemi v trávě.', 'Stalo se v noci.', 'Kolem bylo slyšet hlasité funění.'] },
  { who: 'veverka', c: ['Hnízdo bylo vysoko na smrku.', 'Stalo se ve dne.', 'Pod stromem leží ohryzané šišky.'] },
  { who: 'krkavec', c: ['Hnízdo bylo na kraji lesa na skále.', 'Stalo se ve dne.', 'Nad lesem kroužil velký černý pták a volal „krok krok“.'] },
  { who: 'norek', c: ['Hnízdo bylo v rákosí u vody.', 'Na bahně jsou stopy s pěti prsty.', 'Stalo se za soumraku.'] }
];
function playFarm(el, ctx) { // 71 Hospodář
  const f = frame(el, 'Vedeš malou farmu 10 dní. Každý den vyber jednu práci. Zvířata potřebují jídlo, výběh a péči.');
  const s = { food: 6, wood: 3, room: 3, animals: 3, happy: 5, planted: 0, day: 1 };
  const EV = [['Sucho – úroda je menší.', () => { s.planted = Math.max(0, s.planted - 1); }], ['Bouřka poničila plot.', () => { s.room = Math.max(1, s.room - 1); }], ['Klidný den.', () => {}], ['Klidný den.', () => {}], ['Přišlo mládě!', () => { s.animals++; }]];
  let msg = '';
  const draw = () => { f.set(`den ${s.day} / 10`, `spokojenost ${s.happy}`); f.b.innerHTML = `<div class="hstats"><span>🥕 jídlo ${s.food}</span><span>🪵 dřevo ${s.wood}</span><span>🏡 místo ${s.room}</span><span>🐑 zvířata ${s.animals}</span><span>🌱 zaseto ${s.planted}</span></div><p class="msg small">${msg}</p><div class="hkeys">${[['sow', 'Zasít (+jídlo za 2 dny)'], ['cut', 'Nasekat dřevo'], ['build', 'Rozšířit výběh (−2 dřeva)'], ['feed', 'Nakrmit a pohladit']].map(([k, l]) => `<button class="hk sm" data-k="${k}">${l}</button>`).join('')}</div>`; f.b.querySelectorAll('.hk').forEach(x => x.onclick = () => act(x.dataset.k)); };
  const act = k => {
    if (k === 'sow') s.planted += 2; if (k === 'cut') s.wood += 2; if (k === 'build' && s.wood >= 2) { s.wood -= 2; s.room += 2; } if (k === 'feed') { const e = Math.min(s.food, s.animals); s.food -= e; s.happy += e >= s.animals ? 2 : 0; }
    s.food += Math.floor(s.planted / 2); s.food -= Math.ceil(s.animals / 3);
    if (s.food < 0) { s.food = 0; s.happy -= 2; } if (s.animals > s.room) s.happy -= 1;
    const [t, fn] = pick(EV); fn(); msg = t; s.happy = Math.max(0, Math.min(20, s.happy)); s.day++;
    if (s.day > 10) return ctx.done(s.happy, 20); draw();
  };
  draw();
}
function playEco(el, ctx) { // 72
  const f = frame(el, 'Udrž v krajině zajíce i lišky 12 let. Moc zajíců spase louku, moc lišek sní zajíce.');
  let H = 30, F = 6, G = 60, y = 1;
  const draw = (m = '') => { f.set(`rok ${y} / 12`, ''); f.b.innerHTML = `<div class="hstats"><span>🌿 louka ${Math.round(G)}</span><span>🐇 zajíci ${Math.round(H)}</span><span>🦊 lišky ${Math.round(F)}</span></div><p class="msg small">${m}</p><div class="hkeys"><button class="hk sm" data-k="m">Rozšířit louku</button><button class="hk sm" data-k="h">Chránit zajíce</button><button class="hk sm" data-k="f">Lišky přestěhovat jinam</button><button class="hk sm" data-k="n">Nic nedělat</button></div>`; f.b.querySelectorAll('.hk').forEach(x => x.onclick = () => step(x.dataset.k)); };
  const step = k => {
    if (k === 'm') G += 25; const prot = k === 'h' ? 0.5 : 1; if (k === 'f') F = Math.max(1, F * 0.6);
    const eaten = Math.min(H, 0.06 * H * F * prot), born = 0.45 * H * Math.min(1, G / (H * 1.5 + 1));
    H = Math.min(200, Math.max(0, H + born - eaten - 0.1 * H)); F = Math.min(60, Math.max(0, F + 0.25 * eaten - 0.18 * F)); G = Math.max(0, Math.min(150, G + 20 - 0.6 * H));
    y++; const ok = H >= 5 && F >= 1;
    if (!ok || y > 12) return ctx.done(ok ? 12 : y - 1, 12);
    draw(H > 120 ? 'Zajíců je moc, louka mizí.' : F > 25 ? 'Lišek je moc.' : H < 12 ? 'Zajíců ubývá!' : 'Krajina je v rovnováze.');
  };
  draw();
}
function playFeeder(el, ctx) { // 73
  const f = frame(el, 'Máš zásobu 60 hrstí zrní na 10 týdnů zimy. V mrazu ptáci potřebují 8 hrstí, v mírném týdnu 4. Když dáš málo, část ptáků odletí.');
  let stock = 60, birds = 12, w = 1, cold = Math.random() < 0.45;
  const draw = (m = '') => { f.set(`týden ${w} / 10`, `ptáci ${birds}`); f.b.innerHTML = `<div class="hstats"><span>🌾 zásoba ${stock}</span><span>${cold ? '❄️ mráz' : '🌥️ mírno'}</span><span>🐦 ptáci ${birds}</span></div><p class="msg small">${m}</p><div class="hkeys">${[2, 4, 6, 8].map(v => `<button class="hk" data-v="${v}">${v} hrstí</button>`).join('')}</div>`; f.b.querySelectorAll('.hk').forEach(x => x.onclick = () => give(+x.dataset.v)); };
  const give = v => { v = Math.min(v, stock); stock -= v; const need = cold ? 8 : 4; let m = 'Ptáci jsou sytí.'; if (v < need) { birds = Math.max(0, birds - Math.ceil((need - v) / 2)); m = 'Bylo málo – část ptáků odletěla.'; } else if (v > need) m = 'Zbytek zrní sezobali hraboši.'; w++; cold = Math.random() < 0.45; if (w > 10) return ctx.done(birds, 12); draw(m); };
  draw();
}
function playMigr(el, ctx) { // 74
  const LEGS = [['Maďarsko', 'Rakousko', 'Slovensko'], ['Srbsko', 'Bulharsko', 'Rumunsko'], ['Turecko', 'Řecko', 'Kypr'], ['Izrael', 'Libanon', 'Egypt'], ['Súdán', 'Etiopie', 'Čad']];
  rounds(el, ctx, 2, 'Naplánuj let čápa z Česka do Afriky. Každá zastávka stojí síly (−) a dá potravu (+). Síly nesmí klesnout pod nulu. Doleť s co nejvíc silami.', (i, b, ans) => {
    let L, dp = -1;
    for (let t = 0; t < 50 && dp < 0; t++) { L = LEGS.map(names => names.map(n => ({ n, cost: int(2, 6), gain: int(0, 5) }))); let S = new Set([8]); for (const leg of L) { const nx = new Set(); S.forEach(e => leg.forEach(o => { if (e - o.cost >= 0) nx.add(e - o.cost + o.gain); })); S = nx; } dp = S.size ? Math.max(...S) : -1; }
    let e = 8, at = 0;
    const draw = () => { b.innerHTML = `<p class="hq">Síly: <b>${e}</b> · zastávka ${Math.min(at + 1, L.length)} / ${L.length}</p><div class="hopts">${L[at].map((o, k) => `<button class="hopt" data-k="${k}"><b>${o.n}</b><small>−${o.cost} sil, +${o.gain} potravy</small></button>`).join('')}</div>`; b.querySelectorAll('.hopt').forEach(x => x.onclick = () => go(L[at][+x.dataset.k])); };
    const go = o => { e = e - o.cost; if (e < 0) { b.querySelector('.hq').innerHTML = 'Čápovi došly síly…'; return ans(false); } e += o.gain; at++; if (at >= L.length) { b.innerHTML = `<p class="hq">Doletěl s ${e} silami (nejvíc šlo ${dp}).</p>`; return ans(e >= dp - 1); } draw(); };
    draw();
  });
}
function playNestBuild(el, ctx) { // 75
  const MAT = [['vetvicky', 'větvičky', { p: 3 }], ['mech', 'mech', { t: 2 }], ['peri', 'peří', { t: 3 }], ['blato', 'bláto', { v: 3, p: 1 }], ['trava', 'tráva', { t: 1, p: 1 }], ['pavucina', 'pavučina', { p: 2, v: 1 }], ['list', 'listí', { v: 2 }]];
  const W = [['dest', '🌧️ Bude hodně pršet', 'v'], ['zima', '❄️ Přijdou mrazivé noci', 't'], ['vitr', '🌬️ Bude silný vítr', 'p']];
  rounds(el, ctx, 4, 'Podle předpovědi vyber 3 materiály na hnízdo.', (i, b, ans) => {
    const [, txt, need] = pick(W), on = new Set(), best = MAT.map(m => m[2][need] || 0).sort((a, c) => c - a).slice(0, 3).reduce((a, c) => a + c, 0);
    b.innerHTML = `<p class="hq">${txt}</p><div class="hkeys">${MAT.map(([k, n]) => `<button class="hk sm" data-k="${k}">${n}</button>`).join('')}</div><button class="btn sm primary hgo">Postavit</button>`;
    b.querySelectorAll('.hk').forEach(x => x.onclick = () => { const k = x.dataset.k; if (on.has(k)) on.delete(k); else if (on.size < 3) on.add(k); x.classList.toggle('on', on.has(k)); });
    b.querySelector('.hgo').onclick = () => { if (on.size < 3) return; const sc = [...on].reduce((a, k) => a + (MAT.find(m => m[0] === k)[2][need] || 0), 0); b.querySelector('.hq').innerHTML = `${txt}<br>Hnízdo vydrží na ${sc} z ${best}.`; ans(sc >= best - 1); };
  });
}
function playRangers(el, ctx) { // 76
  rounds(el, ctx, 3, 'Pytláci jdou k hnízdu po vyznačených cestách. Rozmísti strážce (hlídá své pole a 4 sousední) tak, aby hlídali každou cestu.', (i, b, ans) => {
    const R = 7, C = 7, nest = [3, 3], routes = [];
    for (const [sr, sc] of shuffle([[0, int(0, 6)], [6, int(0, 6)], [int(0, 6), 0], [int(0, 6), 6]]).slice(0, 3 + Math.min(i, 1))) { const p = [[sr, sc]]; let [r, c] = [sr, sc]; while (r !== nest[0] || c !== nest[1]) { if (r !== nest[0] && (c === nest[1] || Math.random() < 0.5)) r += Math.sign(nest[0] - r); else c += Math.sign(nest[1] - c); if (r !== nest[0] || c !== nest[1]) p.push([r, c]); } routes.push(p.map(x => x + '')); }
    const covers = (g, cell) => { const [a, d] = g.split(',').map(Number), [r, c] = cell.split(',').map(Number); return Math.abs(a - r) + Math.abs(d - c) <= 1; };
    const cand = [...Array(49).keys()].map(k => [Math.floor(k / 7), k % 7] + '').filter(x => x !== nest + '');
    // nejmenší počet strážců (hrubou silou – cest je málo): strážce musí hlídat aspoň jedno pole první nehlídané cesty
    const tryK = (left, kk) => !left.length || (kk > 0 && [...new Set(left[0].flatMap(c => cand.filter(g => covers(g, c))))].some(g => tryK(left.filter(rt => !rt.some(c => covers(g, c))), kk - 1)));
    const K = [1, 2, 3, 4].find(k => tryK(routes, k)) || 4;
    const on = new Set(), onRoute = new Set(routes.flat());
    const draw = () => { b.innerHTML = `<p class="hq">Strážci: ${on.size} / ${K}</p>` + grid(R, C, (r, c) => r === nest[0] && c === nest[1] ? '🪺' : on.has(r + ',' + c) ? '💂' : onRoute.has(r + ',' + c) ? '·' : '', 'rangers') + '<button class="btn sm primary hgo">Hotovo</button>'; b.querySelectorAll('.hgc').forEach(x => { const k = x.dataset.r + ',' + x.dataset.c; if (onRoute.has(k)) x.classList.add('route'); if ([...on].some(g => covers(g, k))) x.classList.add('cov'); }); onCells(b, (r, c) => { const k = r + ',' + c; if (k === nest + '') return; on.has(k) ? on.delete(k) : on.size < K && on.add(k); draw(); }); b.querySelector('.hgo').onclick = () => { const ok = routes.every(rt => rt.some(c => [...on].some(g => covers(g, c)))); b.querySelector('.hq').textContent = ok ? 'Všechny cesty jsou hlídané!' : 'Některá cesta zůstala volná.'; ans(ok); }; };
    draw();
  });
}
function shade(R, C, house, trees) { const s = new Set(); trees.forEach(k => { const [r, c] = k.split(',').map(Number); for (let a = r - 1; a <= r + 1; a++) for (let d = c - 1; d <= c + 1; d++) if (a >= 0 && d >= 0 && a < R && d < C && !house.has(a + ',' + d)) s.add(a + ',' + d); }); return s.size; }
function playShade(el, ctx) { // 77
  rounds(el, ctx, 3, 'Zasaď 3 stromy tak, aby udělaly co nejvíc stínu (strom stíní své pole a všech 8 okolo). Na domy (🏠) sázet nejde a stín na nich se nepočítá.', (i, b, ans) => {
    const R = 6, C = 6, cells = [...Array(36).keys()].map(k => [Math.floor(k / C), k % C] + ''), house = new Set(sample(cells, 5 + i * 2)), free = cells.filter(k => !house.has(k));
    let best = 0; for (let a = 0; a < free.length; a++) for (let d = a + 1; d < free.length; d++) for (let e = d + 1; e < free.length; e++) best = Math.max(best, shade(R, C, house, [free[a], free[d], free[e]]));
    const on = new Set();
    const draw = () => { const sh = shade(R, C, house, [...on]); b.innerHTML = `<p class="hq">Stín: ${sh} polí</p>` + grid(R, C, (r, c) => house.has(r + ',' + c) ? '🏠' : on.has(r + ',' + c) ? '🌳' : '', 'shade') + '<button class="btn sm primary hgo">Hotovo</button>'; const S = new Set(); on.forEach(k => { const [r, c] = k.split(',').map(Number); for (let a = r - 1; a <= r + 1; a++) for (let d = c - 1; d <= c + 1; d++) S.add(a + ',' + d); }); b.querySelectorAll('.hgc').forEach(x => { const k = x.dataset.r + ',' + x.dataset.c; if (S.has(k) && !house.has(k)) x.classList.add('cov'); }); onCells(b, (r, c) => { const k = r + ',' + c; if (house.has(k)) return; on.has(k) ? on.delete(k) : on.size < 3 && on.add(k); draw(); }); b.querySelector('.hgo').onclick = () => { if (on.size < 3) return; b.querySelector('.hq').textContent = `Stín ${sh} polí · nejvíc jde ${best}`; ans(sh >= best - 1); }; };
    draw();
  });
}
function playNim(el, ctx) { // 78
  rounds(el, ctx, 3, 'V rybníku je 15 ryb. Střídáš se s rybářem, každý chytí 1, 2 nebo 3. Kdo chytí poslední rybu, vyhrává.', (i, b, ans) => {
    let n = 15, log = '';
    const draw = () => { b.innerHTML = `<p class="hq">Ryb v rybníku: <b>${n}</b></p><div class="hfish">${'🐟'.repeat(n)}</div><p class="msg small">${log}</p><div class="hkeys">${[1, 2, 3].filter(k => k <= n).map(k => `<button class="hk" data-k="${k}">Chytit ${k}</button>`).join('')}</div>`; b.querySelectorAll('.hk').forEach(x => x.onclick = () => me(+x.dataset.k)); };
    const me = k => { n -= k; if (!n) { log = 'Chytil jsi poslední rybu!'; draw(); return ans(true); } const ai = n % 4 && Math.random() > 0.25 ? n % 4 : int(1, Math.min(3, n)); n -= ai; log = `Rybář chytil ${ai}.`; if (!n) { log += ' A byla to poslední ryba.'; draw(); return ans(false); } draw(); };
    draw();
  });
}
function playHive(el, ctx) { // 81
  const f = frame(el, 'Rozděl 12 včel na práce na 5 dní. Pozor na události dne!');
  const T = [['sber', 'sběr nektaru'], ['stavba', 'stavba pláství'], ['krmeni', 'krmení larev'], ['straz', 'stráž']];
  const EV = [['Prší – sběr jde napůl.', { rain: 1 }], ['Útočí vosy – stráž aspoň 4!', { straz: 4 }], ['Vylíhlo se hodně larev – krmení aspoň 4!', { krmeni: 4 }], ['Krásný den.', {}]];
  let day = 1, med = 0, plast = 0, ok = 0; const a = { sber: 3, stavba: 3, krmeni: 3, straz: 3 }; let ev = pick(EV);
  const draw = (m = '') => { const used = Object.values(a).reduce((x, y) => x + y, 0); f.set(`den ${day} / 5`, `med ${med} · plástve ${plast}`); f.b.innerHTML = `<p class="hq">${ev[0]}</p><p class="msg small">${m}</p>${T.map(([k, n]) => `<div class="hlrow"><b>${n}</b><button class="hk" data-k="${k}" data-v="-1">−</button><span class="hcnt">${a[k]}</span><button class="hk" data-k="${k}" data-v="1">+</button></div>`).join('')}<p class="msg small">Volné včely: ${12 - used}</p><button class="btn sm primary hgo">Odpracovat den</button>`;
    f.b.querySelectorAll('.hk').forEach(x => x.onclick = () => { const k = x.dataset.k, v = +x.dataset.v; if (v > 0 && Object.values(a).reduce((p, q) => p + q, 0) >= 12) return; a[k] = Math.max(0, a[k] + v); draw(m); });
    f.b.querySelector('.hgo').onclick = work; };
  const work = () => { const e = ev[1]; let m = ''; med += e.rain ? Math.floor(a.sber / 2) : a.sber; plast += Math.floor(a.stavba / 2); const good = (!e.straz || a.straz >= e.straz) && (!e.krmeni || a.krmeni >= e.krmeni); if (good) ok++; else { med = Math.max(0, med - 3); m = 'To nestačilo – úl přišel o kus medu.'; } day++; ev = pick(EV); if (day > 5) return ctx.done(Math.min(10, ok + Math.floor(med / 5)), 10); draw(m || 'Den se vydařil.'); };
  draw();
}
function playPigeon(el, ctx) { // 82
  rounds(el, ctx, 3, 'Holub z holubníku (🏠) doručí dopisy do všech domků a vrátí se. Ťukej na domky v pořadí, jak poletí – co nejkratší cestou.', (i, b, ans) => {
    const n = 4 + Math.min(i, 1), P = [[150, 110]]; while (P.length <= n) { const p = [int(25, 275), int(25, 195)]; if (P.every(q => Math.hypot(p[0] - q[0], p[1] - q[1]) > 55)) P.push(p); }
    const D = (a, c) => Math.hypot(P[a][0] - P[c][0], P[a][1] - P[c][1]), len = r => r.reduce((s, v, k) => s + D(k ? r[k - 1] : 0, v), 0) + D(r.at(-1), 0);
    const perms = a => a.length <= 1 ? [a] : a.flatMap((x, k) => perms([...a.slice(0, k), ...a.slice(k + 1)]).map(p => [x, ...p]));
    const best = Math.min(...perms([...Array(n).keys()].map(k => k + 1)).map(len)), route = [];
    const draw = () => { const pts = [0, ...route, ...(route.length === n ? [0] : [])]; b.innerHTML = `<p class="hq">Doručeno ${route.length} / ${n}</p><svg viewBox="0 0 300 220" class="hsvg"><rect width="300" height="220" rx="10" fill="#eef3e2"/><polyline points="${pts.map(k => P[k].join(',')).join(' ')}" fill="none" stroke="#3a74c8" stroke-width="3"/>${P.map(([x, y], k) => `<g data-k="${k}"><circle cx="${x}" cy="${y}" r="16" fill="${k === 0 ? '#d9762b' : route.includes(k) ? '#cfe3c4' : '#fff'}" stroke="#24301f" stroke-width="2"/><text x="${x}" y="${y + 5}" text-anchor="middle" font-size="14">${k === 0 ? '🏠' : route.includes(k) ? route.indexOf(k) + 1 : '✉'}</text></g>`).join('')}</svg>`; b.querySelectorAll('g[data-k]').forEach(g => g.onclick = () => { const k = +g.dataset.k; if (!k || route.includes(k)) return; route.push(k); draw(); if (route.length === n) { const l = len(route); b.querySelector('.hq').textContent = `Délka cesty ${Math.round(l / 10)} · nejkratší ${Math.round(best / 10)}`; ans(l <= best * 1.05); } }); };
    draw();
  });
}
function playPonds(el, ctx) { // 85
  const f = frame(el, 'Tři rybníky jsou pod sebou. Prší do horního. Otevírej stavidla tak, aby v žádném rybníku nebylo moc ani málo vody (2–8) po 8 dní.');
  const lv = [5, 5, 5], gate = [false, false, false]; let day = 1;
  const draw = (m = '') => { f.set(`den ${day} / 8`, ''); f.b.innerHTML = `<div class="hjugs">${lv.map((v, k) => `<div class="hjug"><b>${k + 1}</b><div class="hjb${v < 2 || v > 8 ? ' badlv' : ''}"><i style="height:${v * 10}%"></i></div><small>${v}</small><button class="hk sm${gate[k] ? ' on' : ''}" data-k="${k}">${gate[k] ? 'stavidlo otevřené' : 'stavidlo zavřené'}</button></div>`).join('')}</div><p class="msg small">${m}</p><button class="btn sm primary hgo">Další den</button>`;
    f.b.querySelectorAll('.hk').forEach(x => x.onclick = () => { gate[+x.dataset.k] = !gate[+x.dataset.k]; draw(m); }); f.b.querySelector('.hgo').onclick = next; };
  const next = () => { const rain = int(0, 4); lv[0] += rain; for (let k = 2; k >= 0; k--) if (gate[k]) { const out = Math.min(3, lv[k]); lv[k] -= out; if (k < 2) lv[k + 1] += out; } for (let k = 0; k < 3; k++) lv[k] = Math.max(0, lv[k] - (Math.random() < 0.3 ? 1 : 0)); day++; const bad = lv.some(v => v < 2 || v > 8); if (bad) { const sc = day - 2; draw('Rybník přetekl nebo vyschl!'); f.b.querySelector('.hgo').remove(); return setTimeout(() => ctx.done(sc, 8), 1200); } if (day > 8) return ctx.done(8, 8); draw(`Napršelo ${rain}.`); };
  draw();
}

/* ---------- etapa 4: obrázky a prostor ---------- */
const PAL3 = ['#d9762b', '#3a74c8', '#f2c21b', '#24301f'];
function playWing(el, ctx) { // 25
  rounds(el, ctx, 2, 'Křídla motýla jsou souměrná. Dobarvi pravé křídlo podle levého (ťukáním měníš barvu).', (i, b, ans) => {
    const R = 6, H = 3, left = Array.from({ length: R }, () => Array.from({ length: H }, () => int(0, 3))), right = Array.from({ length: R }, () => Array(H).fill(-1));
    const draw = () => { b.innerHTML = `<div class="hwing">${grid(R, H, (r, c) => `<i style="background:${PAL3[left[r][c]]}"></i>`, 'wl')}<span class="hbody"></span>${grid(R, H, (r, c) => `<i style="background:${right[r][c] < 0 ? 'transparent' : PAL3[right[r][c]]}"></i>`, 'wr')}</div><button class="btn sm primary hgo">Hotovo</button>`; b.querySelectorAll('.wr .hgc').forEach(x => x.onclick = () => { const r = +x.dataset.r, c = +x.dataset.c; right[r][c] = (right[r][c] + 1) % 4; draw(); }); b.querySelector('.hgo').onclick = () => { const bad = []; for (let r = 0; r < R; r++) for (let c = 0; c < H; c++) if (right[r][c] !== left[r][H - 1 - c]) bad.push([r, c]); bad.forEach(([r, c]) => b.querySelector(`.wr .hgc[data-r="${r}"][data-c="${c}"]`).classList.add('bad')); ans(!bad.length); }; };
    draw();
  });
}
function playLandPuzzle(el, ctx) { // 28
  const f = frame(el, 'Poskládej výřez krajiny – přetáhni dílek na jiný (nebo ťukni na dva) a prohodí se.');
  const id = String(int(1, 35)).padStart(2, '0');
  f.b.innerHTML = '<div class="mgboard"></div><p class="msg small hinfo2"></p>';
  squareImage(`images/splash/${id}.webp`).then(img => { if (!el.isConnected) return; playPuzzle(f.b.querySelector('.mgboard'), 'swap', 3, img, f.b.querySelector('.hinfo2'), moves => ctx.done(moves <= 12 ? 3 : moves <= 20 ? 2 : 1, 3)); });
}
const LMK = [['t_pond', 'rybníka'], ['t_forest', 'lesíka'], ['res_stone', 'velkého kamene'], ['d_well', 'studny'], ['d_barn', 'stodoly']];
const SIDE = { s: 'na sever', j: 'na jih', v: 'na východ', z: 'na západ' };
function playAerial(el, ctx) { // 32
  rounds(el, ctx, 5, 'Mapa je viděná shora, sever je nahoře. Najdi zvíře podle popisu.', (i, b, ans) => {
    const R = 5, C = 5, cells = shuffle([...Array(25).keys()].map(k => [Math.floor(k / C), k % C])), mk = LMK.slice(0, 3).map((l, k) => ({ l, p: cells[k] }));
    let target, desc;
    for (const m of shuffle(mk)) { const dr = int(-2, 2), dc = int(-2, 2); if (!dr && !dc) continue; const t = [m.p[0] + dr, m.p[1] + dc]; if (t[0] < 0 || t[1] < 0 || t[0] >= R || t[1] >= C || mk.some(x => x.p + '' === t + '')) continue; target = t; const part = []; if (dr) part.push(`${Math.abs(dr)} ${Math.abs(dr) === 1 ? 'pole' : 'pole'} ${dr < 0 ? SIDE.s : SIDE.j}`); if (dc) part.push(`${Math.abs(dc)} ${dc < 0 ? SIDE.z : SIDE.v}`); desc = `Zvíře je ${part.join(' a ')} od ${m.l[1]}.`; break; }
    if (!target) return ans(true);
    const sp = pick(ctx.sp);
    b.innerHTML = `<p class="hq">${esc(desc).replace('Zvíře', `<b>${esc(sp.name)}</b>`)}</p>` + grid(R, C, (r, c) => { const m = mk.find(x => x.p[0] === r && x.p[1] === c); return m ? IC(ctx, m.l[0]) : ''; }, 'aerial');
    onCells(b, (r, c, x) => { b.querySelectorAll('.hgc').forEach(y => y.disabled = true); const good = r === target[0] && c === target[1]; x.classList.add(good ? 'good' : 'bad'); const t = cellOf(b, ...target); t.classList.add('good'); t.innerHTML = ctx.img(sp); ans(good); });
  });
}
function playCompass(el, ctx) { // 33
  rounds(el, ctx, 5, 'Aegon jde podle pokynů (sever je nahoře). Ťukni, kde skončí.', (i, b, ans) => {
    const R = 6, C = 6; let at = [int(1, 4), int(1, 4)]; const s = at.slice(), steps = [];
    for (let k = 0; k < 3 + Math.min(i, 2); k++) { const opts = Object.entries({ s: [-1, 0], j: [1, 0], v: [0, 1], z: [0, -1] }).flatMap(([d, [dr, dc]]) => [1, 2, 3].map(n => [d, n, [at[0] + dr * n, at[1] + dc * n]])).filter(([, , p]) => p[0] >= 0 && p[1] >= 0 && p[0] < R && p[1] < C); const [d, n, p] = pick(opts); steps.push(`${n} ${SIDE[d]}`); at = p; }
    b.innerHTML = `<p class="hq">${steps.join(', ')}</p>` + grid(R, C, (r, c) => r === s[0] && c === s[1] ? '🐕' : '', 'compass');
    onCells(b, (r, c, x) => { b.querySelectorAll('.hgc').forEach(y => y.disabled = true); const good = r === at[0] && c === at[1]; x.classList.add(good ? 'good' : 'bad'); cellOf(b, ...at).classList.add('good'); ans(good); });
  });
}
const svgScale = () => { const L = int(50, 90), a = [int(20, 120), int(30, 120)], d = L * (int(2, 9) / 2), ang = Math.random() * Math.PI / 2, bb = [a[0] + d * Math.cos(ang), a[1] + d * Math.sin(ang) * 0.4], m = Math.round(d / L * 100 / 50) * 50; return { q: `<p>Jak daleko je od hnízda ke krmítku?</p><svg viewBox="0 0 340 200" class="hsvg"><rect width="340" height="200" rx="10" fill="#eef3e2"/><line x1="${a[0]}" y1="${a[1]}" x2="${bb[0]}" y2="${bb[1]}" stroke="#8a5a33" stroke-dasharray="4 4" stroke-width="2"/><circle cx="${a[0]}" cy="${a[1]}" r="8" fill="#d9762b"/><circle cx="${bb[0]}" cy="${bb[1]}" r="8" fill="#3a74c8"/><line x1="20" y1="180" x2="${20 + L}" y2="180" stroke="#24301f" stroke-width="4"/><text x="${20 + L + 6}" y="185" font-size="13" fill="#24301f">100 m</text></svg>`, opts: [m, m + 100, Math.max(50, m - 100), m + 200].filter((v, k, x) => x.indexOf(v) === k).map(v => v + ' m') }; };
const STARS = { 'Velký vůz': [[40, 60], [85, 70], [120, 85], [160, 95], [175, 140], [235, 145], [245, 100]], 'Kasiopeja': [[40, 70], [95, 120], [150, 80], [205, 125], [260, 75]], 'Labuť': [[150, 30], [150, 80], [150, 130], [150, 175], [90, 95], [210, 70]] };
const STAR_ORDER = { 'Velký vůz': [0, 1, 2, 3, 4, 5, 6, 3], 'Kasiopeja': [0, 1, 2, 3, 4], 'Labuť': [0, 1, 2, 3, -1, 4, 1, 5] };
function playStars(el, ctx) { // 38
  rounds(el, ctx, 3, 'Spoj hvězdy v souhvězdí. Začni u svítící hvězdy a ťukej v pořadí podle obrázku vlevo nahoře.', (i, b, ans) => {
    const name = Object.keys(STARS)[i], S = STARS[name], ord = STAR_ORDER[name], extra = Array.from({ length: 8 }, () => [int(15, 285), int(15, 190)]).filter(p => S.every(q => Math.hypot(p[0] - q[0], p[1] - q[1]) > 25));
    let at = 0, miss = 0; const steps = ord.filter(k => k >= 0); const segs = []; for (let k = 1; k < ord.length; k++) if (ord[k] >= 0 && ord[k - 1] >= 0) segs.push([ord[k - 1], ord[k]]);
    const all = [...S.map((p, k) => [p, k]), ...extra.map(p => [p, -1])];
    // pořadí ťukání: segmenty po sobě (u Labutě druhá čára začíná znovu)
    const seq = []; ord.forEach((k, j) => { if (k >= 0) seq.push({ k, jump: j > 0 && ord[j - 1] < 0 }); });
    const done = [];
    const draw = () => { b.innerHTML = `<p class="hq">${name}</p><svg viewBox="0 0 300 205" class="hsvg hsky"><rect width="300" height="205" rx="10" fill="#1d2440"/><g transform="translate(6,6) scale(.22)" opacity=".7">${segs.map(([a, c]) => `<line x1="${S[a][0]}" y1="${S[a][1]}" x2="${S[c][0]}" y2="${S[c][1]}" stroke="#fff" stroke-width="6"/>`).join('')}</g>${done.map(([a, c]) => `<line x1="${S[a][0]}" y1="${S[a][1]}" x2="${S[c][0]}" y2="${S[c][1]}" stroke="#f8e45a" stroke-width="3"/>`).join('')}${all.map(([[x, y], k]) => `<circle cx="${x}" cy="${y}" r="${k >= 0 && seq[at] && seq[at].k === k && at === 0 ? 8 : 5}" fill="${k >= 0 && seq[at] && at === 0 && seq[0].k === k ? '#f8e45a' : '#fff'}" data-k="${k}"/><circle cx="${x}" cy="${y}" r="16" fill="transparent" data-k="${k}"/>`).join('')}</svg>`; b.querySelectorAll('circle[data-k]').forEach(c => c.onclick = () => tap(+c.dataset.k)); };
    const tap = k => { if (at >= seq.length) return; if (k !== seq[at].k) { if (++miss >= 4) return ans(false); return; } if (at > 0 && !seq[at].jump) done.push([seq[at - 1].k, k]); at++; draw(); if (at >= seq.length) ans(miss <= 1); };
    void steps; draw();
  });
}
function playDiff(el, ctx) { // 62
  rounds(el, ctx, 3, 'Najdi 3 rozdíly – ťukej na pravý obrázek.', (i, b, ans) => {
    const ICS = ['food_bobule', 'food_hmyz', 'food_orisky', 'food_ryba', 'food_zrni', 'food_listi', 'food_nektar', 'food_slimaci', 'res_wood', 'res_stone', 'feeder', 'bio_les', 'bio_louka', 't_pond', 'd_well', 'd_bench'];
    const L = Array.from({ length: 12 }, () => pick(ICS)), Rt = L.slice(), diff = sample([...Array(12).keys()], 3); diff.forEach(k => { Rt[k] = pick(ICS.filter(x => x !== L[k])); });
    let found = 0, miss = 0;
    b.innerHTML = `<div class="hdiff">${grid(3, 4, (r, c) => IC(ctx, L[r * 4 + c]), 'dl')}${grid(3, 4, (r, c) => IC(ctx, Rt[r * 4 + c]), 'dr')}</div>`;
    b.querySelectorAll('.dl .hgc').forEach(x => x.disabled = true);
    b.querySelectorAll('.dr .hgc').forEach(x => x.onclick = () => { const k = +x.dataset.r * 4 + +x.dataset.c; if (x.classList.contains('good')) return; if (diff.includes(k)) { x.classList.add('good'); b.querySelector(`.dl .hgc[data-r="${x.dataset.r}"][data-c="${x.dataset.c}"]`).classList.add('good'); if (++found === 3) ans(miss <= 2); } else { x.classList.add('bad'); setTimeout(() => x.classList.remove('bad'), 400); if (++miss > 4) { diff.forEach(d => b.querySelector(`.dr .hgc[data-r="${Math.floor(d / 4)}"][data-c="${d % 4}"]`).classList.add('good')); ans(false); } } });
  });
}
function playCamo(el, ctx) { // 66
  rounds(el, ctx, 5, 'Někde v listí se schovalo zvíře. Najdi ho!', (i, b, ans) => {
    const R = 7, C = 6, t = [int(0, R - 1), int(0, C - 1)], sp = pick(ctx.sp.filter(s => ['Hmyz', 'Obojživelníci', 'Plazi', 'Pavoukovci', 'Ptáci'].includes(s.group))); let tries = 0;
    b.innerHTML = grid(R, C, (r, c) => r === t[0] && c === t[1] ? `<span class="hcamo">${ctx.img(sp)}</span>` : `<span class="hleaf" style="transform:rotate(${int(0, 359)}deg)">${IC(ctx, pick(['food_listi', 'food_listi', 'bio_les', 'food_drevo']))}</span>`, 'camo');
    onCells(b, (r, c, x) => { if (r === t[0] && c === t[1]) { x.classList.add('good'); x.querySelector('.hcamo').classList.add('show'); return ans(tries < 3); } x.classList.add('bad'); if (++tries >= 5) { const g = cellOf(b, ...t); g.classList.add('good'); g.querySelector('.hcamo').classList.add('show'); ans(false); } });
  });
}
const svgSnow = (ctx) => {
  const sp = pick(ctx.sp.filter(s => ctx.hasImg(s.id + '_stopa'))), others = sample(ctx.sp.filter(s => s !== sp && ctx.hasImg(s.id + '_stopa')), 2), who = shuffle([sp, ...others]), p = shuffle([0, 1, 2]), xs = [50, 150, 250], SP = ['keř', 'nora', 'strom'], EM = ['🌳', '🕳️', '🌲'];
  const paths = p.map((to, k) => `<path d="M${xs[k]} 185 C ${xs[k]} 110, ${xs[to]} 120, ${xs[to]} 40" fill="none" stroke="#9fb3c8" stroke-width="4" stroke-dasharray="2 9" stroke-linecap="round"/>`).join('');
  const ends = xs.map((x, k) => `<text x="${x}" y="30" text-anchor="middle" font-size="24">${EM[k]}</text>`).join('');
  const k = who.indexOf(sp);
  return { q: `<p>Kam došlo zvíře, které nechalo stopu <b>${esc(sp.name)}</b>? (stopy jsou dole)</p><svg viewBox="0 0 300 195" class="hsvg"><rect width="300" height="195" rx="10" fill="#f4f8fc"/>${paths}${ends}</svg><div class="hsnow">${who.map(s => `<span class="him small">${ctx.track(s.id)}</span>`).join('')}</div>`, opts: [`${EM[p[k]]} ${SP[p[k]]}`, ...[0, 1, 2].filter(j => j !== p[k]).map(j => `${EM[j]} ${SP[j]}`)] };
};

/* ---------- etapa 5: venku s polohou ---------- */
const offset = (p, bearing, d) => ({ lat: p.lat + d * Math.cos(bearing) / 111320, lon: p.lon + d * Math.sin(bearing) / (111320 * Math.cos(p.lat * Math.PI / 180)) });
const bear = (a, b) => (Math.atan2((b.lon - a.lon) * Math.cos(a.lat * Math.PI / 180), b.lat - a.lat) + 2 * Math.PI) % (2 * Math.PI);
const DIR8 = ['sever', 'severovýchod', 'východ', 'jihovýchod', 'jih', 'jihozápad', 'západ', 'severozápad'];
const dirName = b => DIR8[Math.round(b / (Math.PI / 4)) % 8];
function walk(el, ctx, info, targets, onReach, onEnd) { // společné chození k bodům
  const f = frame(el, info); let k = 0, last = null, timer = null;
  f.b.innerHTML = `<div class="hwalk"><div class="harrow">⬆</div><p class="hbig hdist">…</p><p class="hdir"></p><p class="msg small htrend"></p></div><div class="hwextra"></div><button class="btn sm hgive">Ukončit</button>`;
  const tick = () => {
    if (!el.isConnected) return clearInterval(timer);
    const p = ctx.pos(); if (!p) { f.b.querySelector('.hdist').textContent = '?'; f.b.querySelector('.hdir').textContent = 'Zapni polohu (GPS).'; return; }
    const t = targets[k], d = Math.round(dist(p.lat, p.lon, t.lat, t.lon)), br = bear(p, t);
    f.set(`bod ${k + 1} / ${targets.length}`, ''); f.b.querySelector('.hdist').textContent = d + ' m'; f.b.querySelector('.hdir').textContent = 'směr: ' + dirName(br); f.b.querySelector('.harrow').style.transform = `rotate(${br}rad)`;
    if (last != null) f.b.querySelector('.htrend').textContent = d < last - 2 ? 'Tepleji!' : d > last + 2 ? 'Studeněji…' : ''; last = d;
    if (d <= 15) { clearInterval(timer); onReach(k, f.b.querySelector('.hwextra'), () => { k++; last = null; if (k >= targets.length) return onEnd(k); timer = setInterval(tick, 2000); tick(); }); }
  };
  f.b.querySelector('.hgive').onclick = () => { clearInterval(timer); onEnd(k); };
  timer = setInterval(tick, 2000); tick();
}
const noPos = (el, ctx) => { el.innerHTML = '<p class="msg">Tahle hra potřebuje polohu. Zapni GPS a jdi ven (nebo zkus Admin → Testy → Simulace chůze, pak mapu zavři a hru spusť znovu).</p>'; ctx.done(0, 1); };
function playFind(el, ctx) { // 96
  const p = ctx.pos(); if (!p) return noPos(el, ctx);
  walk(el, ctx, 'Někde v okolí je schované místo. Jdi podle šipky (sever je nahoře) a vzdálenosti.', [offset(p, Math.random() * 2 * Math.PI, int(60, 120))], (k, x, next) => { x.innerHTML = '<p class="hbig">Našel jsi to! 🎉</p>'; next(); }, k => ctx.done(k, 1));
}
function playTrailOut(el, ctx) { // 98
  const p = ctx.pos(); if (!p) return noPos(el, ctx);
  const t = []; let cur = p; for (let k = 0; k < 3; k++) { cur = offset(cur, Math.random() * 2 * Math.PI, int(40, 80)); t.push(cur); }
  walk(el, ctx, 'Aegon ti nechal na mapě šipky. Dojdi ke každé – pak ukáže další.', t, (k, x, next) => { x.innerHTML = `<p class="msg">Šipka ${k + 1} nalezena! 🐾</p>`; setTimeout(next, 1200); }, k => ctx.done(k, 3));
}
function playQuizOut(el, ctx) { // 99
  const p = ctx.pos(); if (!p) return noPos(el, ctx);
  const Q = HERNA.filter(g => ['pravda', 'lichy', 'prislovi', 'stadonohy'].includes(g.id)), t = [0, 1, 2].map(() => offset(p, Math.random() * 2 * Math.PI, int(40, 90))); let good = 0;
  walk(el, ctx, 'Na trase jsou 3 místa s hádankou. Dojdi k místu a odpověz.', t, (k, x, next) => { const r = pick(Q).gen(ctx, k); chooseMix(x, r.q, r.opts, ok => { if (ok) good++; setTimeout(next, 1500); }, r.cls || ''); }, () => ctx.done(good, 3));
}
function playSurvey(el, ctx) { // 100
  if (!ctx.pos()) return noPos(el, ctx);
  const f = frame(el, 'Projdi za 15 minut co nejvíc různých typů krajiny (biotopů). Počítá se, kudy jdeš.'), seen = new Set(), end = Date.now() + 15 * 60000;
  f.b.innerHTML = `<p class="hbig htime">15:00</p><div class="hkeys hbios"></div><button class="btn sm hgive">Ukončit</button>`;
  const tick = () => { if (!el.isConnected) return clearInterval(timer); const b2 = ctx.bioHere(); if (b2) seen.add(b2); const left = Math.max(0, end - Date.now()); f.b.querySelector('.htime').textContent = `${Math.floor(left / 60000)}:${String(Math.floor(left / 1000) % 60).padStart(2, '0')}`; f.set('', `biotopů: ${seen.size}`); f.b.querySelector('.hbios').innerHTML = [...seen].map(x => `<span class="hk">${IC(ctx, 'bio_' + x)}<small>${esc(ctx.cfg.biotopes.find(y => y.id === x)?.name || x)}</small></span>`).join(''); if (!left) { clearInterval(timer); ctx.done(seen.size, 10); } };
  const timer = setInterval(tick, 5000); tick();
  f.b.querySelector('.hgive').onclick = () => { clearInterval(timer); ctx.done(seen.size, 10); };
}
function playBingo(el, ctx) { // 97
  const f = frame(el, 'Bingo na procházku: když zvíře uvidíš (nebo jeho stopu), ťukni na něj. Tři v řadě = bingo!');
  const m = new Date().getMonth() + 1, list = sample(ctx.sp.filter(s => String(s.rarity) === '1' && (!s.months || parseMonths(s.months).has(m))), 9), on = new Set();
  const LINES = [[0, 1, 2], [3, 4, 5], [6, 7, 8], [0, 3, 6], [1, 4, 7], [2, 5, 8], [0, 4, 8], [2, 4, 6]];
  const draw = () => { const lines = LINES.filter(l => l.every(k => on.has(k))).length; f.set(`${on.size} / 9`, lines ? `bingo ×${lines}` : ''); f.b.innerHTML = `<div class="hbingo">${list.map((s, k) => `<button class="hcell${on.has(k) ? ' good' : ''}" data-k="${k}">${card(ctx, s)}</button>`).join('')}</div><button class="btn sm primary hgo">Konec procházky</button>`; f.b.querySelectorAll('.hcell').forEach(x => x.onclick = () => { const k = +x.dataset.k; on.has(k) ? on.delete(k) : on.add(k); draw(); }); f.b.querySelector('.hgo').onclick = () => ctx.done(LINES.filter(l => l.every(k => on.has(k))).length, 8); };
  draw();
}

// obrázek do plátna 12 × 12 → po zvětšení jsou vidět hrubé kostky
function pixelate(b) { const cv = b.querySelector('.hpix canvas'); if (!cv) return; const im = new Image(); im.onload = () => { const x = cv.getContext('2d'), k = Math.min(12 / im.width, 12 / im.height); x.fillStyle = '#eef3e2'; x.fillRect(0, 0, 12, 12); x.drawImage(im, (12 - im.width * k) / 2, (12 - im.height * k) / 2, im.width * k, im.height * k); }; im.src = cv.dataset.src; }

/* ---------- seznam ---------- */
export const HERNA2_GROUPS = [['grid', 'Mřížkové hádanky'], ['strat', 'Strategie a plánování'], ['pic', 'Obrázky a prostor'], ['out', 'Venku (s polohou)']];
export const HERNA2 = [
  { n: 21, id: 'bludiste', g: 'grid', name: 'Bludiště nory', desc: 'Doveď lišku domů', play: playMaze },
  { n: 22, id: 'mravenec', g: 'grid', name: 'Mravenčí cesta', desc: 'Nejlehčí cesta přes listy', play: playAnts },
  { n: 23, id: 'brod', g: 'grid', name: 'Brod', desc: 'Přes potok po kamenech', play: playFord },
  { n: 24, id: 'plastev', g: 'grid', name: 'Plástev', desc: 'Doplň číslo v plástvi podle pravidla', kind: 'quiz', rounds: 5, gen: () => { const a = int(1, 9), d = int(2, 6), dbl = Math.random() < 0.3, seq = Array.from({ length: 6 }, (_, k) => dbl ? a * 2 ** k : a + d * k), miss = int(1, 5); return { q: `<div class="hhex">${seq.map((v, k) => `<span>${k === miss ? '?' : v}</span>`).join('')}</div>`, opts: near(seq[miss], 3).map(String) }; } },
  { n: 29, id: 'hraz', g: 'grid', name: 'Hrázka bobra', desc: 'Zastav vodu kládami', play: playDam },
  { n: 30, id: 'pavucina', g: 'grid', name: 'Pavučina', desc: 'Jedním tahem', play: playWeb },
  { n: 31, id: 'tunky', g: 'grid', name: 'Tůňky', desc: 'Přelévej vodu na přesné množství', play: playJugs },
  { n: 39, id: 'led', g: 'grid', name: 'Kry na ledu', desc: 'Klouzající tuleň', play: playIce },
  { n: 40, id: 'budky', g: 'grid', name: 'Hnízdní budky', desc: 'Aby se ptáci nerušili', play: playBoxes },
  { n: 42, id: 'logika', g: 'grid', name: 'Logická mřížka', desc: 'Kdo bydlí ve které noře', play: playLogic },
  { n: 79, id: 'nora', g: 'grid', name: 'Nora pod zemí', desc: 'Propoj komůrky nejlevněji', play: playBurrow },
  { n: 80, id: 'pozar', g: 'grid', name: 'Lesní požár', desc: 'Zastav oheň průseky', play: playFire },
  { n: 83, id: 'honicka', g: 'grid', name: 'Honička', desc: 'Liška a zajíc', play: playChase },
  { n: 84, id: 'ovce', g: 'grid', name: 'Ovce a pes', desc: 'Zažeň ovci do ohrady', play: playSheep },

  { n: 54, id: 'detektiv', g: 'strat', name: 'Detektiv', desc: 'Kdo snědl jahody', kind: 'quiz', rounds: 5, gen: c => { const s = c.sp.filter(x => c.hasImg(x.id + '_stopa') && ['Savci', 'Ptáci'].includes(x.group)), cul = pick(s), o = sample(s.filter(x => x !== cul), 3); return { q: `<p>Ze záhonu zmizely jahody. U plotu jsou tyhle stopy:</p><div class="hcard"><span class="him">${c.track(cul.id)}</span></div><p class="msg small">Stalo se ${cul.night ? 'v noci' : 've dne'}.</p>`, opts: [cul, ...o].map(x => `<span class="him small">${c.img(x)}</span><b>${esc(x.name)}</b>`), cls: 'img' }; } },
  { n: 59, id: 'hnizdo', g: 'strat', name: 'Záhada hnízda', desc: 'Kdo vybral vejce', kind: 'quiz', rounds: 5, gen: c => { const ok = NEST.filter(x => c.SP[x.who]), z = pick(ok), o = sample(ok.filter(x => x !== z), 3); return { q: `<ol class="hclues">${z.c.map(t => `<li>${esc(t)}</li>`).join('')}</ol><p>Kdo to byl?</p>`, opts: [z, ...o].map(x => `<span class="him small">${c.img(c.SP[x.who])}</span><b>${esc(c.SP[x.who].name)}</b>`), cls: 'img' }; } },
  { n: 71, id: 'hospodar', g: 'strat', name: 'Hospodář', desc: '10 dní na farmě', play: playFarm },
  { n: 72, id: 'ekosystem', g: 'strat', name: 'Ekosystém', desc: 'Lišky a zajíci v rovnováze', play: playEco },
  { n: 73, id: 'krmitko', g: 'strat', name: 'Krmítko v zimě', desc: 'Rozplánuj zásoby', play: playFeeder },
  { n: 74, id: 'migrace', g: 'strat', name: 'Migrace', desc: 'Let čápa do Afriky', play: playMigr },
  { n: 75, id: 'stavba', g: 'strat', name: 'Stavba hnízda', desc: 'Materiál podle počasí', play: playNestBuild },
  { n: 76, id: 'ochrance', g: 'strat', name: 'Ochránce', desc: 'Strážci proti pytlákům', play: playRangers },
  { n: 77, id: 'stromy', g: 'strat', name: 'Sázení stromů', desc: 'Nejvíc stínu', play: playShade },
  { n: 78, id: 'rybar', g: 'strat', name: 'Rybník a rybář', desc: 'Kdo chytí poslední rybu', play: playNim },
  { n: 81, id: 'ul2', g: 'strat', name: 'Úl', desc: 'Rozděl práci včel', play: playHive },
  { n: 82, id: 'holub', g: 'strat', name: 'Poštovní holub', desc: 'Nejkratší cesta', play: playPigeon },
  { n: 85, id: 'rybniky', g: 'strat', name: 'Hráz a stavidla', desc: 'Voda mezi rybníky', play: playPonds },

  { n: 25, id: 'kridlo', g: 'pic', name: 'Křídlo motýla', desc: 'Dobarvi souměrně', play: playWing },
  { n: 26, id: 'zrcadlo', g: 'pic', name: 'Zrcadlo', desc: 'Najdi druhou polovinu zvířete', kind: 'quiz', rounds: 5, gen: c => { const s = pick(c.sp), o = sample(c.sp.filter(x => x !== s && x.group === s.group), 3); return { q: `<div class="hhalf"><span class="hl1">${c.img(s)}</span><span class="hl2">?</span></div>`, opts: [s, ...o].map(x => `<span class="hr2">${c.img(x)}</span>`), cls: 'img' }; } },
  { n: 27, id: 'kosticky', g: 'pic', name: 'Zvíře z kostiček', desc: 'Místo tangramu: poznej zvíře z hrubých kostek', kind: 'quiz', rounds: 6, gen: c => { const s = pick(c.sp), src = (/src="([^"]+)"/.exec(c.img(s)) || [])[1] || ''; return { q: `<div class="hpix"><canvas width="12" height="12" data-src="${esc(src)}"></canvas></div>`, opts: [s, ...sample(c.sp.filter(x => x !== s && x.group === s.group), 3)].map(x => esc(x.name)), after: pixelate }; } },
  { n: 28, id: 'krajina', g: 'pic', name: 'Puzzle krajiny', desc: 'Poskládej výřez krajiny', play: playLandPuzzle },
  { n: 32, id: 'shora', g: 'pic', name: 'Les z výšky', desc: 'Najdi zvíře podle popisu', play: playAerial },
  { n: 33, id: 'kompas', g: 'pic', name: 'Kompasová procházka', desc: 'Kam dojde Aegon', play: playCompass },
  { n: 34, id: 'meritko', g: 'pic', name: 'Měřítko', desc: 'Odhadni vzdálenost', kind: 'quiz', rounds: 5, gen: svgScale },
  { n: 38, id: 'hvezdy', g: 'pic', name: 'Hvězdná obloha', desc: 'Spoj souhvězdí', play: playStars },
  { n: 62, id: 'rozdily', g: 'pic', name: 'Najdi rozdíly', desc: '3 rozdíly', play: playDiff },
  { n: 66, id: 'maskovani', g: 'pic', name: 'Maskování', desc: 'Zvíře schované v listí', play: playCamo },
  { n: 68, id: 'snih', g: 'pic', name: 'Stopy ve sněhu', desc: 'Kdo tudy šel a kam', kind: 'quiz', rounds: 5, gen: svgSnow },

  { n: 96, id: 'najdi', g: 'out', name: 'Najdi místo', desc: 'Jdi podle šipky a vzdálenosti', play: playFind },
  { n: 97, id: 'bingo', g: 'out', name: 'Bingo pozorování', desc: 'Na procházku', play: playBingo },
  { n: 98, id: 'stopovana', g: 'out', name: 'Stopovaná', desc: 'Aegonovy šipky', play: playTrailOut },
  { n: 99, id: 'otazky', g: 'out', name: 'Otázky po trase', desc: 'Hádanka na každém místě', play: playQuizOut },
  { n: 100, id: 'pruzkum', g: 'out', name: 'Průzkum biotopu', desc: '15 minut, co nejvíc krajin', play: playSurvey }
];
