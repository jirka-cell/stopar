// Soutěže: 4 minihry, každá na jednu vlastnost zvířete. Výsledek = půl dovednost hráče, půl vlastnost zvířete.
// Bez serveru: vlastní rekordy a porovnání s rodinou krátkým kódem výsledku.
import { esc } from './config.js';
import { birdImg } from './birds.js';

const num = (v, d = 0) => Number.isFinite(Number(v)) ? Number(v) : d;
const clamp = v => Math.max(0, Math.min(1, v));
export const GAMES = [
  { id: 'sprint', name: 'Sprint', stat: 'rychlost', icon: '⚡', desc: 'Ťukej co nejrychleji na kruhy, jak se objevují.' },
  { id: 'tah', name: 'Přetahování', stat: 'sila', icon: '💪', desc: 'Obtáhni prstem ležatou osmičku – přesně a rychle.' },
  { id: 'schovka', name: 'Schovávaná', stat: 'maskovani', icon: '🌿', desc: 'Zapamatuj si, za kterým keřem se zvíře schovalo.' },
  { id: 'rytmus', name: 'Rytmus', stat: 'vydrz', icon: '🥁', desc: 'Ťukej přesně do rytmu bubínku.' }
];

/* ---------- hodnocení (čisté funkce, testované) ---------- */
// Sprint: průměrná reakce 250 ms = 1, 1000 ms a víc = 0; každé minutí −10 %
export const sprintSkill = (times, misses) => times.length ? clamp((1 - (times.reduce((a, b) => a + b, 0) / times.length - 250) / 750) * (1 - 0.1 * misses)) : 0;
// Přetahování: přesnost (průměrná odchylka od křivky v px) × rychlost (čas na celou osmičku)
export const tahSkill = (meanDist, secs) => clamp(1 - meanDist / 40) * clamp((15 - secs) / 11);
// Schovávaná: správné tipy z kol, rychlost ťuknutí
export const schovkaSkill = (right, rounds, avgMs) => rounds ? clamp(right / rounds) * clamp(1.2 - avgMs / 4000) : 0;
// Rytmus: průměrná odchylka od úderu 0 ms = 1, 200 ms a víc = 0
export const rytmusSkill = errs => errs.length ? clamp(1 - errs.reduce((a, b) => a + Math.abs(b), 0) / errs.length / 200) : 0;
export function contestScore(skill, stat, maxStat) { return Math.round(1000 * (0.5 * clamp(skill) + 0.5 * clamp(num(stat) / Math.max(1, num(maxStat, 100))))); }

// Lemniskáta (ležatá osmička) v poli w × h
export function lemniscate(w, h, n = 240) {
  const pts = [], a = w * 0.42;
  for (let i = 0; i < n; i++) { const t = i / n * Math.PI * 2, d = 1 + Math.sin(t) ** 2; pts.push([w / 2 + a * Math.cos(t) / d, h / 2 + a * Math.sin(t) * Math.cos(t) / d * 1.25]); }
  return pts;
}

/* ---------- kód výsledku ---------- */
const A = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
const enc = (v, len) => { let s = ''; for (let i = 0; i < len; i++) { s = A[v % 32] + s; v = Math.floor(v / 32); } return s; };
const dec = s => [...s].reduce((v, ch) => { const i = A.indexOf(ch); if (i < 0) throw new Error('bad'); return v * 32 + i; }, 0);
const DAY0 = Date.UTC(2026, 0, 1);
// kontrolní znaky: promíchané všechny bity (pozná překlep v kterémkoli znaku)
const check = v => Math.imul((v ^ (v >>> 15)) >>> 0, 0x2c1b3c6d) >>> 22;
// hra (2 bity) + skóre (0–1000) + den → 6 znaků + 2 znaky kontrola, např. „S4KQ-9MZ7“
export function scoreCode(game, score, when = Date.now()) {
  const g = GAMES.findIndex(x => x.id === game), day = Math.max(0, Math.min(32767, Math.floor((when - DAY0) / 86400000)));
  const v = (g * 1024 + Math.max(0, Math.min(1000, Math.round(score)))) * 32768 + day;
  const ch = check(v);
  const s = enc(v, 6) + enc(ch, 2);
  return s.slice(0, 4) + '-' + s.slice(4);
}
export function readScoreCode(code) {
  try {
    const s = String(code).toUpperCase().replace(/[^0-9A-Z]/g, '').replace(/[O0]/g, '0').replace(/I/g, '1');
    if (s.length !== 8) return null;
    const v = dec(s.slice(0, 6)), ch = dec(s.slice(6));
    if (check(v) !== ch) return null;
    const day = v % 32768, rest = Math.floor(v / 32768), score = rest % 1024, g = Math.floor(rest / 1024);
    if (!GAMES[g] || score > 1000) return null;
    return { game: GAMES[g].id, score, date: DAY0 + day * 86400000 };
  } catch (e) { return null; }
}

export function cleanRecords(r) {
  return Object.fromEntries(GAMES.map(g => [g.id, r && r[g.id] && typeof r[g.id] === 'object' ? { score: Math.max(0, Math.min(1000, Math.round(num(r[g.id].score)))), sp: String(r[g.id].sp || '').slice(0, 60), date: num(r[g.id].date) } : null]).filter(([, v]) => v));
}

/* ---------- obrazovky ---------- */
export function contestsHTML(cfg, st, SP) {
  return `<h2>Soutěže</h2><p class="msg small">Výsledek je půl tvoje šikovnost a půl vlastnost zvířete, které vybereš.</p>
  ${GAMES.map(g => { const r = st.records[g.id]; return `<div class="shopit"><span class="aic" aria-hidden="true">${g.icon}</span><span><b>${g.name}</b> <small>(${esc((cfg.stats.find(s => s.id === g.stat) || {}).name || g.stat)})</small><br><small>${esc(g.desc)}</small>${r ? `<br><small>Rekord: <b>${r.score}</b>${SP[r.sp] ? ' · ' + esc(SP[r.sp].name) : ''}</small>` : ''}</span><button class="btn sm primary" data-act="cPick" data-g="${g.id}">Hrát</button></div>`; }).join('')}
  <h3>Porovnat s rodinou</h3><p class="msg small">Po hře dostaneš kód výsledku. Kód od ostatních zadej sem:</p>
  <div class="presetnew"><input type="text" id="cCode" maxlength="12" placeholder="např. S4KQ-9MZ7" aria-label="Kód výsledku"><button class="btn" data-act="cCompare">Porovnat</button></div>
  <p class="msg" id="cCmp"></p>
  <button class="btn full ghost" data-act="close">Zavřít</button>`;
}
export function pickHTML(cfg, st, SP, game) {
  const g = GAMES.find(x => x.id === game), si = cfg.stats.findIndex(s => s.id === g.stat);
  const list = st.animals.filter(a => SP[a.sp]).sort((a, b) => (b.stats[si] || 0) - (a.stats[si] || 0)).slice(0, 30);
  return `<h2>${g.icon} ${g.name}</h2><p class="msg small">Vyber zvíře – počítá se jeho ${esc((cfg.stats[si] || {}).name || '').toLowerCase()}.</p>
  ${list.length ? `<div class="grid">${list.map(a => `<button class="acard" data-act="cStart" data-uid="${esc(a.uid)}"><div class="im">${birdImg(SP[a.sp])}</div><div class="nm">${esc(a.nick || SP[a.sp].name)}</div><div class="rr">${esc((cfg.stats[si] || {}).name || '')} ${a.stats[si] || 0}</div></button>`).join('')}</div>` : '<p class="msg">Nejdřív chyť nějaké zvíře.</p>'}
  <button class="btn full ghost" data-act="contests">Zpět</button>`;
}
export function compareText(code, st) {
  const r = readScoreCode(code);
  if (!r) return 'Kód nesedí – zkontroluj ho.';
  const g = GAMES.find(x => x.id === r.game), mine = st.records[r.game];
  const d = new Date(r.date).toLocaleDateString('cs-CZ');
  if (!mine) return `${g.name}: ${r.score} bodů (${d}). Ty tuhle soutěž ještě nemáš.`;
  return `${g.name}: kód ${r.score} bodů (${d}) × tvůj rekord ${mine.score}. ${mine.score > r.score ? 'Vedeš!' : mine.score === r.score ? 'Remíza!' : 'Zkus to překonat!'}`;
}

/* ---------- hry v okně (DOM) ---------- */
// Spustí hru v elementu root; po skončení zavolá done(skill 0–1)
export function runGame(game, root, done) {
  root.innerHTML = '<div class="arena" id="arena"></div><p class="msg" id="gMsg"></p>';
  const ar = root.querySelector('#arena'), msg = root.querySelector('#gMsg');
  const W = ar.clientWidth || 320, H = ar.clientHeight || 360;
  let stop = false; const timers = [];
  const later = (fn, ms) => timers.push(setTimeout(() => { if (!stop) fn(); }, ms));
  const end = skill => { stop = true; timers.forEach(clearTimeout); done(skill); };
  if (game === 'sprint') {
    const times = []; let misses = 0, shown = 0;
    msg.textContent = 'Ťukej na kruhy!';
    const next = () => {
      if (shown >= 10) return end(sprintSkill(times, misses));
      shown++;
      const b = document.createElement('button'); b.className = 'tgt'; b.setAttribute('aria-label', 'Kruh');
      b.style.left = Math.round(Math.random() * (W - 60)) + 'px'; b.style.top = Math.round(Math.random() * (H - 60)) + 'px';
      const t0 = performance.now(); let hit = false;
      b.onpointerdown = e => { e.stopPropagation(); hit = true; times.push(performance.now() - t0); b.remove(); later(next, 150 + Math.random() * 400); };
      ar.appendChild(b);
      later(() => { if (!hit) { misses++; b.remove(); next(); } }, 1500);
    };
    later(next, 600);
  } else if (game === 'tah') {
    const pts = lemniscate(W, H), bins = new Set(); let sum = 0, n = 0, t0 = 0;
    ar.innerHTML = `<svg viewBox="0 0 ${W} ${H}" width="${W}" height="${H}"><polyline points="${pts.map(p => p.join(',')).join(' ')} ${pts[0].join(',')}" fill="none" stroke="#9fd3ad" stroke-width="22" stroke-linecap="round" stroke-linejoin="round"/><polyline id="trace" fill="none" stroke="#2f7d4f" stroke-width="4"/></svg>`;
    msg.textContent = 'Obtáhni prstem celou osmičku (max. 15 s).';
    const trace = ar.querySelector('#trace'), drawn = [];
    const at = e => { const r = ar.getBoundingClientRect(); return [e.clientX - r.left, e.clientY - r.top]; };
    ar.onpointerdown = e => { if (!t0) t0 = performance.now(); ar.setPointerCapture?.(e.pointerId); };
    ar.onpointermove = e => {
      if (!t0 || !(e.buttons || e.pointerType === 'touch')) return;
      const p = at(e); let bi = 0, bd = 1e9;
      pts.forEach((q, i) => { const d = Math.hypot(q[0] - p[0], q[1] - p[1]); if (d < bd) { bd = d; bi = i; } });
      sum += bd; n++; bins.add(Math.floor(bi / pts.length * 40));
      drawn.push(p.join(',')); trace.setAttribute('points', drawn.join(' '));
      const secs = (performance.now() - t0) / 1000;
      msg.textContent = `Hotovo ${Math.round(bins.size / 40 * 100)} %`;
      if (bins.size >= 37 || secs > 15) end(tahSkill(sum / n, secs));
    };
    later(() => { if (!stop) end(n ? tahSkill(sum / n, 15) * bins.size / 40 : 0); }, 20000);
  } else if (game === 'schovka') {
    const ROUNDS = 5; let round = 0, right = 0, ms = 0;
    const play = () => {
      if (round >= ROUNDS) return end(schovkaSkill(right, ROUNDS, ms / ROUNDS));
      round++; ar.innerHTML = '';
      const k = Math.floor(Math.random() * 12);
      const bushes = Array.from({ length: 12 }, (_, i) => { const b = document.createElement('button'); b.className = 'bush'; b.textContent = i === k ? '🐾' : '🌿'; b.setAttribute('aria-label', 'Keř ' + (i + 1)); ar.appendChild(b); return b; });
      msg.textContent = `Kolo ${round}/${ROUNDS}: dívej se!`;
      later(() => {
        bushes[k].textContent = '🌿'; msg.textContent = 'Kde je schované?'; const t0 = performance.now();
        bushes.forEach((b, i) => { b.onclick = () => { if (stop) return; ms += performance.now() - t0; if (i === k) { right++; b.textContent = '✔'; } else { b.textContent = '✖'; bushes[k].textContent = '🐾'; } bushes.forEach(x => { x.onclick = null; }); later(play, 700); }; });
      }, Math.max(350, 900 - round * 100));
    };
    later(play, 500);
  } else if (game === 'rytmus') {
    const BEAT = 600, N = 16, errs = []; let start = 0;
    ar.innerHTML = '<button class="drum" id="drum" aria-label="Bubínek">🥁</button>';
    const drum = ar.querySelector('#drum');
    msg.textContent = 'Poslouchej a ťukej do rytmu (první 4 údery jen sleduj).';
    for (let i = 0; i < N + 4; i++) later(() => { drum.classList.add('beat'); later(() => drum.classList.remove('beat'), 120); if (i === 4) msg.textContent = 'Teď ťukej!'; }, 500 + i * BEAT);
    start = performance.now() + 500;
    drum.onpointerdown = () => {
      const t = performance.now() - start, i = Math.round(t / BEAT);
      if (i < 4 || i >= N + 4) return;
      errs.push(t - i * BEAT);
    };
    later(() => end(errs.length >= N / 2 ? rytmusSkill(errs) * Math.min(1, errs.length / N) : 0), 500 + (N + 4) * BEAT + 300);
  }
  return () => { stop = true; timers.forEach(clearTimeout); };
}
