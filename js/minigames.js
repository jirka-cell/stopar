// Minihry z obrázků zvířat ze sbírky: posouvačka, skládačka (prohazování dílků), otáčení dílků, pexeso.
// Odměna šišky s denním stropem, aby minihry nepřebily chůzi; další hry se odemykají počtem chycených druhů.
import { esc } from './config.js';

const num = (v, d = 0) => Number.isFinite(Number(v)) ? Number(v) : d;
export const PUZZLES = [
  { id: 'slide', name: 'Posouvačka', icon: '🔢', need: 1, desc: 'Posouvej dílky do prázdného místa, až složíš obrázek.' },
  { id: 'pexeso', name: 'Pexeso', icon: '🃏', need: 2, desc: 'Najdi dvojice stejných zvířat.' },
  { id: 'rotate', name: 'Otáčení', icon: '🔄', need: 4, desc: 'Ťukáním natoč všechny dílky správně.' },
  { id: 'swap', name: 'Skládačka', icon: '🧩', need: 6, desc: 'Přetáhni dílek na jiný (nebo ťukni na dva) a prohodí se.' },
  { id: 'who', name: 'Kdo to byl?', icon: '🐾', need: 3, desc: 'Podle stop a pobytových znamení poznej zvíře. 5 otázek.' },
  { id: 'rows', name: 'Řady', icon: '↔️', need: 8, desc: 'Táhni prstem po řádku nebo sloupci – celá řada se posune dokola.' },
  { id: 'rings', name: 'Kruhy', icon: '🎯', need: 10, desc: 'Ťukáním otáčej kruhy obrázku, až do sebe zapadnou.' }
];
export const LEVELS = [['easy', 'Lehká'], ['mid', 'Střední'], ['hard', 'Těžká']];
export const SIZES = { slide: [3, 4, 5], swap: [3, 4, 6], rotate: [3, 4, 5], pexeso: [4, 6, 8], who: [3, 3, 4], rows: [3, 4, 5], rings: [3, 4, 5] }; // pexeso = dvojice, who = možnosti, rings = počet kruhů

/* ---------- logika (bez DOM, testuje se) ---------- */
export const solved = t => t.every((v, i) => v === i);
const nbrs = (i, n) => [i - n, i + n, i % n ? i - 1 : -1, (i + 1) % n ? i + 1 : -1].filter(j => j >= 0 && j < n * n);
// Posouvačka: zamíchá se náhodnými platnými tahy od složeného stavu → vždy jde složit
export function slideShuffle(n, rnd = Math.random, steps = n * n * 30) {
  const t = [...Array(n * n).keys()]; let blank = n * n - 1, prev = -1;
  for (let s = 0; s < steps || solved(t); s++) {
    const opts = nbrs(blank, n).filter(j => j !== prev), j = opts[Math.floor(rnd() * opts.length)];
    [t[blank], t[j]] = [t[j], t[blank]]; prev = blank; blank = j;
  }
  return t;
}
// Tah: dílek na pozici i se posune do sousedního prázdného místa (prázdné = n*n-1)
export function slideMove(t, n, i) {
  const b = t.indexOf(n * n - 1);
  if (!nbrs(b, n).includes(i)) return false;
  [t[b], t[i]] = [t[i], t[b]]; return true;
}
export function swapShuffle(m, rnd = Math.random) {
  const t = [...Array(m).keys()];
  do { for (let i = m - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [t[i], t[j]] = [t[j], t[i]]; } } while (solved(t));
  return t;
}
export function rotShuffle(m, rnd = Math.random) {
  let r;
  do r = Array.from({ length: m }, () => Math.floor(rnd() * 4)); while (r.filter(Boolean).length < m / 2);
  return r;
}
// Pexeso: ids = druhy (přednostně ze sbírky); vrací zamíchané karty
export function pexesoDeck(ids, pairs, rnd = Math.random) {
  const pick = ids.slice(0, pairs), cards = [...pick, ...pick];
  for (let i = cards.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [cards[i], cards[j]] = [cards[j], cards[i]]; }
  return cards;
}
// Odměna: podle obtížnosti, nejvýš do denního stropu
export function gameReward(g, cfg, level, day) {
  const want = num(cfg.games['cones' + level[0].toUpperCase() + level.slice(1)]), left = Math.max(0, num(cfg.games.dailyCones) - (g.day === day ? g.cones : 0));
  return Math.min(want, left);
}
export function cleanGames(g) {
  const o = g && typeof g === 'object' ? g : {};
  const best = {};
  if (o.best && typeof o.best === 'object') for (const [k, v] of Object.entries(o.best).slice(0, 40)) if (/^\w+_\w+$/.test(k) && num(v) > 0) best[k] = Math.round(num(v));
  return { day: String(o.day || '').slice(0, 10), cones: Math.max(0, num(o.cones)), plays: Math.max(0, num(o.plays)), best };
}

/* ---------- obrazovky ---------- */
export function gamesHTML(g, caught, cfg, day) {
  const left = Math.max(0, num(cfg.games.dailyCones) - (g.day === day ? g.cones : 0));
  return `<h2>Minihry</h2><p class="msg small">Obrázky jsou zvířata z tvé sbírky. Dnes můžeš ještě získat <b>${left}</b> šišek – víc jich přinese procházka.</p>
  ${PUZZLES.map(p => {
    const open = caught >= p.need;
    return `<div class="mgcard${open ? '' : ' locked'}"><div class="mgtitle"><span class="mgicon" aria-hidden="true">${p.icon}</span><span><b>${esc(p.name)}</b><br><small>${open ? esc(p.desc) : `Odemkne se po ${p.need} chycených druzích (máš ${caught}).`}</small></span></div>
    ${open ? `<div class="chips">${LEVELS.map(([l, n]) => `<button class="chip" data-act="mgPlay" data-g="${p.id}" data-l="${l}">${n}${g.best[p.id + '_' + l] ? ` · rekord ${g.best[p.id + '_' + l]} tahů` : ''}</button>`).join('')}</div>` : ''}</div>`;
  }).join('')}
  <button class="btn full ghost" data-act="close">Zavřít</button>`;
}
export const boardHTML = (p, level) => `<h2>${p.icon} ${esc(p.name)} <small class="sub">${esc((LEVELS.find(l => l[0] === level) || [, ''])[1])}</small></h2>
  <div class="mgboard" id="mgBoard"></div><p class="msg small mginfo" id="mgInfo">${esc(p.desc)}</p>
  <div class="tools"><button class="btn sm" data-act="mgHint">Předloha</button><button class="btn sm ghost" data-act="games">Zpět</button></div>`;

// Obrázek zvířete do čtverce (na světlé pozadí), ať se dílky nedeformují
export function squareImage(url, size = 480) {
  return new Promise(res => {
    const im = new Image();
    im.onload = () => {
      try {
        const c = document.createElement('canvas'); c.width = c.height = size;
        const x = c.getContext('2d'); x.fillStyle = '#eef4e8'; x.fillRect(0, 0, size, size);
        const k = Math.min(size / im.width, size / im.height) * 0.92, w = im.width * k, h = im.height * k;
        x.drawImage(im, (size - w) / 2, (size - h) / 2, w, h);
        res(c.toDataURL('image/png'));
      } catch (e) { res(url); }
    };
    im.onerror = () => res(url);
    im.src = url;
  });
}

const piece = (img, n, idx, extra = '') => `background-image:url(&quot;${esc(img)}&quot;);background-size:${n * 100}% ${n * 100}%;background-position:${(idx % n) / (n - 1) * 100}% ${Math.floor(idx / n) / (n - 1) * 100}%;${extra}`;

// Obrázkové hry; vrací funkci pro ukončení (úklid posluchačů)
export function playPuzzle(el, kind, n, img, info, onWin) {
  const m = n * n, start = Date.now();
  let t = kind === 'slide' ? slideShuffle(n) : kind === 'swap' ? swapShuffle(m) : rotShuffle(m), moves = 0, sel = -1, done = false, down = -1;
  el.style.gridTemplateColumns = `repeat(${n}, 1fr)`;
  const isDone = () => kind === 'rotate' ? t.every(r => r === 0) : solved(t);
  const draw = () => {
    el.innerHTML = t.map((v, i) => {
      if (kind === 'rotate') return `<div class="mgp" data-i="${i}" style="${piece(img, n, i, `transform:rotate(${v * 90}deg)`)}"></div>`;
      if (kind === 'slide' && v === m - 1 && !done) return `<div class="mgp blank" data-i="${i}"></div>`;
      return `<div class="mgp${i === sel ? ' sel' : ''}" data-i="${i}" style="${piece(img, n, v)}"></div>`;
    }).join('');
    info.textContent = done ? '' : `Tahů: ${moves}`;
  };
  const finish = () => { done = true; el.classList.add('won'); draw(); onWin(moves, Math.round((Date.now() - start) / 1000)); };
  const act = (i, j) => {
    if (done) return;
    if (kind === 'slide') { if (!slideMove(t, n, i)) return; }
    else if (kind === 'rotate') t[i] = (t[i] + 1) % 4;
    else { if (j == null || j === i) return; [t[i], t[j]] = [t[j], t[i]]; sel = -1; }
    moves++; isDone() ? finish() : draw();
  };
  const idxAt = e => { const p = (document.elementFromPoint(e.clientX, e.clientY) || e.target).closest('.mgp'); return p && el.contains(p) ? Number(p.dataset.i) : -1; };
  const onDown = e => { down = idxAt(e); if (kind === 'swap' && down >= 0) { try { el.setPointerCapture(e.pointerId); } catch (x) {} } };
  const onUp = e => {
    const i = idxAt(e), d = down; down = -1;
    if (i < 0 || d < 0) return;
    if (kind !== 'swap') { if (i === d) act(i); return; }
    if (i !== d) act(d, i);                                   // přetažení na jiný dílek
    else if (sel < 0) { sel = i; draw(); }                     // první ťuknutí vybere
    else if (sel === i) { sel = -1; draw(); } else act(sel, i); // druhé prohodí
  };
  el.addEventListener('pointerdown', onDown); el.addEventListener('pointerup', onUp);
  draw();
  return () => { el.removeEventListener('pointerdown', onDown); el.removeEventListener('pointerup', onUp); };
}

export function playPexeso(el, cards, urlOf, nameOf, info, onWin) {
  const start = Date.now(), open = [], found = new Set();
  let moves = 0, timer = 0, busy = false;
  el.style.gridTemplateColumns = 'repeat(4, 1fr)';
  el.classList.add('pex');
  const draw = () => {
    el.innerHTML = cards.map((c, i) => {
      const up = open.includes(i) || found.has(c);
      return `<button class="mgc${up ? ' up' : ''}${found.has(c) ? ' ok' : ''}" data-i="${i}" aria-label="${up ? esc(nameOf(c)) : 'Karta'}">${up ? `<img src="${urlOf(c)}" alt="">` : '<span aria-hidden="true">🐾</span>'}</button>`;
    }).join('');
    info.textContent = `Tahů: ${moves} · dvojic ${found.size} z ${cards.length / 2}`;
  };
  const onClick = e => {
    const b = e.target.closest('.mgc'); if (!b || busy) return;
    const i = Number(b.dataset.i);
    if (open.includes(i) || found.has(cards[i])) return;
    open.push(i); draw();
    if (open.length < 2) return;
    moves++;
    if (cards[open[0]] === cards[open[1]]) { found.add(cards[i]); open.length = 0; draw(); if (found.size * 2 === cards.length) onWin(moves, Math.round((Date.now() - start) / 1000)); }
    else { busy = true; timer = setTimeout(() => { open.length = 0; busy = false; draw(); }, 900); }
  };
  el.addEventListener('click', onClick);
  draw();
  return () => { clearTimeout(timer); el.removeEventListener('click', onClick); };
}

/* ---------- Řady: posun řádku nebo sloupce dokola ---------- */
export function shiftLine(t, n, isRow, k, dir) {
  const idx = Array.from({ length: n }, (_, j) => isRow ? k * n + j : j * n + k), vals = idx.map(i => t[i]);
  const moved = dir > 0 ? [vals[n - 1], ...vals.slice(0, n - 1)] : [...vals.slice(1), vals[0]];
  idx.forEach((i, j) => { t[i] = moved[j]; });
}
export function rowsShuffle(n, rnd = Math.random, steps = n * 6) {
  const t = [...Array(n * n).keys()];
  do for (let s = 0; s < steps; s++) shiftLine(t, n, rnd() < .5, Math.floor(rnd() * n), rnd() < .5 ? 1 : -1); while (solved(t));
  return t;
}
export function playRows(el, n, img, info, onWin) {
  const start = Date.now(); let t = rowsShuffle(n), moves = 0, st = null, done = false;
  el.style.gridTemplateColumns = `repeat(${n}, 1fr)`;
  const draw = () => { el.innerHTML = t.map((v, i) => `<div class="mgp" data-i="${i}" style="${piece(img, n, v)}"></div>`).join(''); info.textContent = done ? '' : `Tahů: ${moves}`; };
  const down = e => { const p = e.target.closest('.mgp'); if (!p || done) return; st = { i: Number(p.dataset.i), x: e.clientX, y: e.clientY }; try { el.setPointerCapture(e.pointerId); } catch (x) {} };
  const up = e => {
    if (!st) return; const dx = e.clientX - st.x, dy = e.clientY - st.y, i = st.i; st = null;
    if (Math.max(Math.abs(dx), Math.abs(dy)) < 12) return;
    const row = Math.abs(dx) > Math.abs(dy);
    shiftLine(t, n, row, row ? Math.floor(i / n) : i % n, row ? Math.sign(dx) : Math.sign(dy));
    moves++; if (solved(t)) { done = true; el.classList.add('won'); draw(); onWin(moves, Math.round((Date.now() - start) / 1000)); } else draw();
  };
  el.addEventListener('pointerdown', down); el.addEventListener('pointerup', up);
  draw();
  return () => { el.removeEventListener('pointerdown', down); el.removeEventListener('pointerup', up); };
}

/* ---------- Kruhy: soustředné kruhy obrázku se otáčejí po 45° ---------- */
export function ringsShuffle(k, rnd = Math.random) {
  let r; do r = Array.from({ length: k }, () => Math.floor(rnd() * 8)); while (r.every(v => v === 0) || r.filter(Boolean).length < Math.ceil(k / 2));
  return r;
}
export function playRings(el, k, img, info, onWin) {
  const start = Date.now(); let r = ringsShuffle(k), moves = 0, done = false;
  el.classList.add('rings'); el.style.gridTemplateColumns = '';
  const draw = () => {
    // vnější kruh první (vespod), každý další menší nad ním
    el.innerHTML = r.map((v, i) => { const s = 100 * (k - i) / k; return `<div class="ring" data-i="${i}" style="width:${s}%;height:${s}%;transform:translate(-50%,-50%) rotate(${v * 45}deg)"><div style="background-image:url(&quot;${esc(img)}&quot;);width:${10000 / s}%;height:${10000 / s}%"></div></div>`; }).join('');
    info.textContent = done ? '' : `Tahů: ${moves} · ťukni na kruh`;
  };
  const click = e => {
    if (done) return;
    const b = el.getBoundingClientRect(), d = Math.hypot(e.clientX - b.left - b.width / 2, e.clientY - b.top - b.height / 2) / (b.width / 2);
    if (d > 1) return;
    const i = Math.min(k - 1, Math.floor((1 - d) * k)); // 0 = vnější
    r[i] = (r[i] + 1) % 8; moves++;
    if (r.every(v => v === 0)) { done = true; el.classList.add('won'); draw(); onWin(moves, Math.round((Date.now() - start) / 1000)); } else draw();
  };
  el.addEventListener('click', click);
  draw();
  return () => el.removeEventListener('click', click);
}

/* ---------- Kdo to byl? 5 otázek podle stop a znamení ---------- */
export function playWho(el, rounds, info, onWin) {
  const start = Date.now(); let i = 0, ok = 0, moves = 0, lock = false;
  el.classList.add('pex'); el.style.gridTemplateColumns = '';
  const draw = () => {
    const q = rounds[i];
    el.innerHTML = `<div class="who"><div class="fact">${esc(q.sign)}</div><div class="grid">${q.opts.map((o, j) => `<button class="acard" data-j="${j}"><div class="im"><img src="${o.url}" alt=""></div><div class="nm">${esc(o.name)}</div></button>`).join('')}</div></div>`;
    info.textContent = `Otázka ${i + 1} z ${rounds.length} · správně ${ok}`;
  };
  const click = e => {
    const b = e.target.closest('[data-j]'); if (!b || lock) return;
    const q = rounds[i], j = Number(b.dataset.j); moves++;
    b.classList.add(j === q.correct ? 'right' : 'wrong'); if (j === q.correct) ok++;
    else el.querySelector(`[data-j="${q.correct}"]`).classList.add('right');
    lock = true;
    setTimeout(() => { lock = false; i++; if (i < rounds.length) draw(); else onWin(Math.max(1, rounds.length * 2 - ok), Math.round((Date.now() - start) / 1000), ok); }, 1100);
  };
  el.addEventListener('click', click);
  draw();
  return () => el.removeEventListener('click', click);
}
