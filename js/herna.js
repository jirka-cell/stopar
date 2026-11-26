// Herna (test): logické minihry z návrhu 100 her – etapa 1 (třídění, dvojice, pořadí, kvíz, paměť, slova, čísla).
// Hry jsou data: gen(ctx) vrací zadání pro společný motor, vlastní hry mají play(el, ctx). Jen pro testery (Admin → Testy).
// ctx = { sp: aktivní druhy, SP, img(sp, stage), ic(name), track(id), hasImg(key), stages(group), done(score, max) }
import { esc, parseMap, parseMonths, formatMonths } from './config.js';
import { keyTraits, KEY_Q } from './keydata.js';

/* ---------- pomůcky ---------- */
const shuffle = a => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
const pick = a => a[Math.floor(Math.random() * a.length)];
const sample = (a, n) => shuffle(a).slice(0, n);
const int = (a, b) => a + Math.floor(Math.random() * (b - a + 1));
const uniqBy = (a, f) => { const s = new Set(); return a.filter(x => { const k = f(x); if (s.has(k)) return false; s.add(k); return true; }); };
const top = m => Object.entries(parseMap(m)).sort((a, b) => b[1] - a[1])[0]?.[0];
const word = sp => String(sp.name).split(' ')[0];
const plain = s => s.normalize('NFD').replace(/[̀-ͯ]/g, '');
const num = (s, units) => { const m = /(\d+(?:[.,]\d+)?)\s*(?:[–-]\s*(\d+(?:[.,]\d+)?))?\s*([a-z]+)/.exec(String(s || '')); if (!m || !(m[3] in units)) return null; const a = parseFloat(m[1].replace(',', '.')), b = m[2] ? parseFloat(m[2].replace(',', '.')) : a; return (a + b) / 2 * units[m[3]]; };
const cm = sp => num(sp.edu?.length, { mm: 0.1, cm: 1, m: 100 });
const grams = sp => num(sp.edu?.weight, { g: 1, kg: 1000 });
const kind = sp => Object.values(keyTraits(sp.id, sp.group) || {})[0]?.[0] || '';
const card = (ctx, sp, stage, name = true) => `<span class="him">${ctx.img(sp, stage)}</span>${name ? `<b>${esc(sp.name)}</b>` : ''}`;
const opt = (ctx, sp) => card(ctx, sp);
const LEGS = { 'Ptáci': 2, 'Savci': 4, 'Hmyz': 6, 'Pavoukovci': 8 };
const HIB = new Set('jezek netopyr netopyrvelky netopyrusaty vrapenec plch plsik sysel krecek jezevec'.split(' '));
const LIVE = new Set(['slepys', 'zmije', 'zivorodka']); // plazi, kteří rodí živá mláďata

/* ---------- společný rámeček a kola ---------- */
function frame(el, info) {
  el.innerHTML = `<div class="hgame"><div class="hbar"><span class="hprog"></span><span class="hscore"></span></div>${info ? `<p class="msg small">${info}</p>` : ''}<div class="hb"></div></div>`;
  const P = el.querySelector('.hprog'), S = el.querySelector('.hscore');
  return { b: el.querySelector('.hb'), set(p, s) { P.textContent = p; S.textContent = s; } };
}
// n kol; make(i, b, answer) – answer(ok) se počítá jen jednou za kolo
function rounds(el, ctx, n, info, make) {
  const f = frame(el, info); let i = 0, ok = 0;
  const next = () => {
    if (!el.isConnected) return;
    if (i >= n) return ctx.done(ok, n);
    f.set(`${i + 1} / ${n}`, `✓ ${ok}`); let answered = false;
    make(i, f.b, good => { if (answered) return; answered = true; if (good) ok++; f.set(`${i + 1} / ${n}`, `✓ ${ok}`); i++; setTimeout(next, good ? 700 : 1500); });
  };
  next();
}
function choose(b, q, opts, okIdx, answer, cls = '') {
  b.innerHTML = `<div class="hq">${q}</div><div class="hopts ${cls}">${opts.map((o, i) => `<button class="hopt" data-i="${i}">${o}</button>`).join('')}</div>`;
  b.querySelectorAll('.hopt').forEach(x => x.onclick = () => {
    const i = +x.dataset.i; b.querySelectorAll('.hopt').forEach(y => y.disabled = true);
    x.classList.add(i === okIdx ? 'good' : 'bad'); b.querySelector(`.hopt[data-i="${okIdx}"]`).classList.add('good'); answer(i === okIdx);
  });
}
// správná odpověď je opts[0], možnosti se zamíchají
function chooseMix(b, q, opts, answer, cls = '') { const o = shuffle(opts.map((_, k) => k)); choose(b, q, o.map(k => opts[k]), o.indexOf(0), answer, cls); }

/* ---------- motory ---------- */
// Třídění: gen → { bins: [[id, popisek, ikona]], items: [[html, id]] }
function playSort(el, ctx, g, info) {
  const items = g.items.slice(0, 8);
  rounds(el, ctx, items.length, info, (i, b, ans) => {
    const [html, bin] = items[i];
    b.innerHTML = `<div class="hcard">${html}</div><div class="hbins">${g.bins.map(([id, l, icon]) => `<button class="hbin" data-b="${esc(id)}">${icon || ''}<span>${esc(l)}</span></button>`).join('')}</div>`;
    b.querySelectorAll('.hbin').forEach(x => x.onclick = () => {
      const good = x.dataset.b === bin; b.querySelectorAll('.hbin').forEach(y => y.disabled = true);
      x.classList.add(good ? 'good' : 'bad'); b.querySelector(`.hbin[data-b="${esc(bin)}"]`).classList.add('good'); ans(good);
    });
  });
}
// Dvojice: gen → [[levý html, pravý html]]
function playMatch(el, ctx, pairs, info) {
  const f = frame(el, info); let sel = null, done = 0, miss = 0;
  f.b.innerHTML = `<div class="hmatch"><div>${shuffle(pairs.map((p, i) => [i, p[0]])).map(([i, h]) => `<button class="hm l" data-i="${i}">${h}</button>`).join('')}</div><div>${shuffle(pairs.map((p, i) => [i, p[1]])).map(([i, h]) => `<button class="hm r" data-i="${i}">${h}</button>`).join('')}</div></div>`;
  const upd = () => f.set(`${done} / ${pairs.length}`, miss ? `✗ ${miss}` : ''); upd();
  f.b.querySelectorAll('.hm').forEach(x => x.onclick = () => {
    if (x.classList.contains('ok')) return;
    if (!sel || sel.classList.contains('l') === x.classList.contains('l')) { if (sel) sel.classList.remove('sel'); sel = x; x.classList.add('sel'); return; }
    if (sel.dataset.i === x.dataset.i) { sel.classList.replace('sel', 'ok'); x.classList.add('ok'); done++; }
    else { miss++; sel.classList.remove('sel'); x.classList.add('bad'); setTimeout(() => x.classList.remove('bad'), 500); }
    sel = null; upd();
    if (done === pairs.length) setTimeout(() => ctx.done(Math.max(0, pairs.length - miss), pairs.length), 600);
  });
}
// Pořadí: gen(ctx, i) → { q, items: [html ve správném pořadí] }
function playOrder(el, ctx, n, info, gen) {
  rounds(el, ctx, n, info, (i, b, ans) => orderRound(b, gen(ctx, i), ans));
}
function orderRound(b, r, ans) {
  {
    const idx = shuffle(r.items.map((_, k) => k)); let at = 0, miss = 0;
    b.innerHTML = `<div class="hq">${r.q}</div><div class="hrow hslots">${r.items.map(() => '<span class="hslot"></span>').join('')}</div><div class="hrow">${idx.map(k => `<button class="hord" data-k="${k}">${r.items[k]}</button>`).join('')}</div>`;
    const slots = b.querySelectorAll('.hslot');
    b.querySelectorAll('.hord').forEach(x => x.onclick = () => {
      if (miss >= 3 || at >= r.items.length) return;
      const k = +x.dataset.k;
      if (k === at) { slots[at].innerHTML = r.items[k]; slots[at].classList.add('ok'); x.disabled = true; x.classList.add('used'); if (++at === r.items.length) ans(miss === 0); }
      else { x.classList.add('bad'); setTimeout(() => x.classList.remove('bad'), 400); if (++miss >= 3) { r.items.forEach((h, j) => { slots[j].innerHTML = h; }); ans(false); } }
    });
  }
}
// Kvíz: gen(ctx, i) → { q, opts: [správná, …], cls }
function playQuiz(el, ctx, n, info, gen) {
  rounds(el, ctx, n, info, (i, b, ans) => {
    const r = gen(ctx, i), order = shuffle(r.opts.map((_, k) => k));
    choose(b, r.q, order.map(k => r.opts[k]), order.indexOf(0), ans, r.cls || '');
    if (r.after) r.after(b);
  });
}

/* ---------- data pro hry ---------- */
const POOL = ctx => ctx.sp;
const byGroup = (ctx, g) => ctx.sp.filter(s => s.group === g);
const otherOpts = (ctx, sp, n, f = s => s.group === sp.group) => sample(ctx.sp.filter(s => s.id !== sp.id && f(s)), n);
const mixItems = (groups, per) => shuffle(groups.flatMap(([list, bin, mk]) => sample(list, per).map(s => [mk(s), bin])));

const PROVERBS = [
  ['Vrána k ___ sedá, rovný rovného si hledá.', 'vráně'], ['Lepší ___ v hrsti než holub na střeše.', 'vrabec'], ['Jedna ___ jaro nedělá.', 'vlaštovka'],
  ['Mlčí jako ___.', 'ryba'], ['Zdravý jako ___.', 'ryba'], ['Tichý jako ___.', 'myš'], ['Hladový jako ___.', 'vlk'], ['Pracovitý jako ___.', 'včela'],
  ['Chytrá jako ___.', 'liška'], ['Pomalý jako ___.', 'šnek'], ['Slepý jako ___.', 'krtek'], ['Spí jako ___.', 'dudek'], ['Krade jako ___.', 'straka'],
  ['Zpívá jako ___.', 'skřivan'], ['Moudrý jako ___.', 'sova'], ['Mokrý jako ___.', 'myš'], ['Vlk se nažral a ___ zůstala celá.', 'koza'], ['Bojí se jako ___.', 'zajíc']
];
const SOUNDS = [['datel', 'ťuk ťuk ťuk'], ['kukacka', 'kuku, kuku'], ['pustik', 'hú-hú-húúú'], ['kachna', 'kvák kvák'], ['vrana', 'krá krá'], ['cmelak', 'bzzzz'], ['cvrcek', 'cvrk cvrk'], ['holub', 'vrků vrků'], ['husa', 'ga ga ga'], ['konadra', 'cí-cí-bé'], ['skokan', 'kuňk kuňk'], ['srnec', 'štěkavé „bé“'], ['jelen', 'troubení'], ['prase', 'chro chro']];
const CHAINS = [['food_rostliny', 'kobylka', 'jesterka', 'kane'], ['food_zrni', 'hrabos', 'postolka'], ['food_rasy', 'plotice', 'stika', 'vydra'], ['food_listi', 'babocka:0', 'konadra', 'krahujec'], ['food_hmyz', 'jesterka', 'zmije', 'kane'], ['food_zizaly', 'jezek', 'vyr'], ['food_drobotina', 'plotice', 'volavka']];
const DAWN = ['rehek', 'kos', 'cervenka', 'konadra', 'penkava', 'vrabec']; // kdo zpívá ráno dřív
const MORSE = { A: '.-', B: '-...', C: '-.-.', D: '-..', E: '.', F: '..-.', G: '--.', H: '....', I: '..', J: '.---', K: '-.-', L: '.-..', M: '--', N: '-.', O: '---', P: '.--.', R: '.-.', S: '...', T: '-', U: '..-', V: '...-', Y: '-.--', Z: '--..' };
const ABC = 'AÁBCČDĎEÉĚFGHIÍJKLMNŇOÓPRŘSŠTŤUÚŮVYÝZŽ';

function chainItems(ctx, ch) {
  return ch.map(x => { if (x.startsWith('food_')) return `<span class="him">${ctx.ic(x)}</span>`; const [id, st] = x.split(':'); const sp = ctx.SP[id]; return sp ? card(ctx, sp, st == null ? undefined : +st) : null; });
}
const svgHills = () => {
  const h = shuffle([2, 3, 4, 5]).slice(0, 3), L = ['A', 'B', 'C'];
  const s = h.map((n, k) => { const cx = 55 + k * 95; return Array.from({ length: n }, (_, j) => `<ellipse cx="${cx}" cy="80" rx="${44 - j * 9}" ry="${34 - j * 7}" fill="none" stroke="#8a5a33" stroke-width="1.6"/>`).join('') + `<text x="${cx}" y="150" text-anchor="middle" font-size="18" font-weight="700" fill="#24301f">${L[k]}</text>`; }).join('');
  const best = h.indexOf(Math.max(...h));
  return { q: `<p>Každá čára je o kus výš. Který kopec je nejvyšší?</p><svg viewBox="0 0 300 160" class="hsvg"><rect width="300" height="160" fill="#eef3e2" rx="10"/>${s}</svg>`, opts: [L[best], ...L.filter((_, k) => k !== best)] };
};
const svgRiver = () => {
  const p = shuffle([0, 1, 2]), xs = [50, 150, 250], L = ['A', 'B', 'C'], start = int(0, 2);
  const paths = p.map((to, k) => `<path d="M${xs[k]} 22 C ${xs[k]} 80, ${xs[to]} 70, ${xs[to]} 128" fill="none" stroke="#4fa3d8" stroke-width="5" stroke-linecap="round"/>`).join('');
  const top = L.map((l, k) => `<text x="${xs[k]}" y="16" text-anchor="middle" font-size="15" font-weight="700" fill="#24301f">${l}</text>`).join('');
  const ponds = xs.map((x, k) => `<ellipse cx="${x}" cy="138" rx="30" ry="12" fill="#7cc0e8"/><text x="${x}" y="143" text-anchor="middle" font-size="14" font-weight="700" fill="#fff">${k + 1}</text>`).join('');
  return { q: `<p>Do kterého rybníka dopluje list hozený do potoka <b>${L[start]}</b>?</p><svg viewBox="0 0 300 160" class="hsvg"><rect width="300" height="160" fill="#eef3e2" rx="10"/>${paths}${ponds}${top}</svg>`, opts: [`rybník ${p[start] + 1}`, ...[0, 1, 2].filter(k => k !== p[start]).map(k => `rybník ${k + 1}`)] };
};
const svgShadow = () => {
  const t = int(0, 2), ans = ['ráno', 'v poledne', 'večer'][t];
  const sun = [[262, 70], [150, 22], [38, 70]][t], sh = [`M150 120 L60 128 L60 134 L150 126Z`, `M144 120 L156 120 L154 104 L146 104Z`, `M150 120 L240 128 L240 134 L150 126Z`][t];
  return { q: `<p>Kolik je asi hodin? (vlevo je západ, vpravo východ)</p><svg viewBox="0 0 300 150" class="hsvg"><rect width="300" height="150" fill="#eef3e2" rx="10"/><path d="${sh}" fill="rgba(0,0,0,.35)"/><rect x="146" y="80" width="8" height="42" fill="#7a5230"/><circle cx="150" cy="70" r="24" fill="#5d9a3a"/><circle cx="${sun[0]}" cy="${sun[1]}" r="12" fill="#f2c21b"/><text x="10" y="144" font-size="13" fill="#24301f">Z</text><text x="282" y="144" font-size="13" fill="#24301f">V</text></svg>`, opts: [ans, ...['ráno', 'v poledne', 'večer'].filter(x => x !== ans)] };
};
const svgPie = (k, n) => `<svg viewBox="-52 -52 104 104" class="hsvg hpie">${Array.from({ length: n }, (_, j) => { const a0 = j / n * 2 * Math.PI - Math.PI / 2, a1 = (j + 1) / n * 2 * Math.PI - Math.PI / 2; return `<path d="M0 0 L${48 * Math.cos(a0)} ${48 * Math.sin(a0)} A48 48 0 0 1 ${48 * Math.cos(a1)} ${48 * Math.sin(a1)}Z" fill="${j < k ? '#d9762b' : '#f3e6c8'}" stroke="#8a5a33" stroke-width="1.5"/>`; }).join('')}</svg>`;
const near = (n, k = 3) => { const s = new Set([n]); let g = 0; while (s.size < k + 1 && g++ < 50) { const v = n + pick([-3, -2, -1, 1, 2, 3, 4, -4]); if (v > 0) s.add(v); } return [...s]; };

/* ---------- vlastní hry (paměť, slova, čísla) ---------- */
function showThen(b, html, ms, then) { b.innerHTML = html; setTimeout(() => { if (b.isConnected) then(); }, ms); }

function playGone(el, ctx) { // 61 Kdo zmizel
  rounds(el, ctx, 5, 'Zapamatuj si zvířata – jedno pak zmizí.', (i, b, ans) => {
    const set = sample(POOL(ctx), 4 + Math.min(i, 3)), gone = pick(set);
    showThen(b, `<div class="hgrid">${set.map(s => `<span class="hcell">${card(ctx, s)}</span>`).join('')}</div>`, 3500, () => {
      const rest = shuffle(set.filter(s => s !== gone)), wrong = sample(rest, 3);
      b.innerHTML = `<div class="hgrid">${rest.map(s => `<span class="hcell">${card(ctx, s)}</span>`).join('')}</div>`;
      const box = document.createElement('div'); b.append(box);
      const order = shuffle([gone, ...wrong]); choose(box, 'Kdo zmizel?', order.map(s => opt(ctx, s)), order.indexOf(gone), ans);
    });
  });
}
function playSimon(el, ctx) { // 63 Opakuj zpěv
  const f = frame(el, 'Ptáci zpívají po sobě. Zopakuj pořadí ťukáním.'), birds = sample(byGroup(ctx, 'Ptáci'), 4), seq = [];
  const tones = [392, 494, 587, 698]; let ac = null;
  const beep = k => { try { ac = ac || new (window.AudioContext || window.webkitAudioContext)(); const o = ac.createOscillator(), g = ac.createGain(); o.frequency.value = tones[k]; g.gain.value = .08; o.connect(g).connect(ac.destination); o.start(); o.stop(ac.currentTime + .25); } catch (e) {} };
  f.b.innerHTML = `<div class="hsimon">${birds.map((s, k) => `<button class="hsb" data-k="${k}">${card(ctx, s, undefined, false)}</button>`).join('')}</div>`;
  const btns = [...f.b.querySelectorAll('.hsb')]; let pos = 0, busy = true;
  const flash = k => { btns[k].classList.add('lit'); beep(k); setTimeout(() => btns[k].classList.remove('lit'), 380); };
  const play = () => { busy = true; seq.push(int(0, 3)); f.set(`délka ${seq.length}`, `✓ ${seq.length - 1}`); seq.forEach((k, j) => setTimeout(() => el.isConnected && flash(k), 700 + j * 650)); setTimeout(() => { busy = false; pos = 0; }, 700 + seq.length * 650); };
  btns.forEach(x => x.onclick = () => {
    if (busy) return; const k = +x.dataset.k; flash(k);
    if (k !== seq[pos]) { busy = true; x.classList.add('bad'); setTimeout(() => ctx.done(Math.min(8, seq.length - 1), 8), 900); return; }
    if (++pos === seq.length) { if (seq.length >= 9) return ctx.done(8, 8); setTimeout(play, 600); }
  });
  play();
}
function playTrail(el, ctx) { // 64 Tichá stezka
  rounds(el, ctx, 4, 'Zvířata jdou po stezce jedno po druhém. Pak je seřaď, jak šla.', (i, b, ans) => {
    const items = sample(POOL(ctx), 3 + Math.min(i, 2)).map(s => card(ctx, s, undefined, false));
    b.innerHTML = '<div class="hcard htrail"></div>';
    items.forEach((h, j) => setTimeout(() => { const t = b.querySelector('.htrail'); if (t) t.innerHTML = h; }, j * 1100));
    setTimeout(() => { if (b.isConnected) orderRound(b, { q: 'V jakém pořadí šla?', items }, ans); }, items.length * 1100);
  });
}
function playKim(el, ctx) { // 65 Kimova hra
  const ALL = ['food_bobule', 'food_drevo', 'food_hmyz', 'food_listi', 'food_maso', 'food_nektar', 'food_orisky', 'food_ryba', 'food_slimaci', 'food_zizaly', 'food_zrni', 'food_larvy', 'food_rasy', 'food_korinky', 'res_wood', 'res_stone', 'res_seeds', 'feeder'];
  rounds(el, ctx, 3, 'Podívej se, co je v batohu. Pak najdi všechny věci.', (i, b, ans) => {
    const n = 4 + i, bag = sample(ALL, n), grid = shuffle([...bag, ...sample(ALL.filter(x => !bag.includes(x)), n + 2)]);
    showThen(b, `<div class="hgrid kim">${bag.map(x => `<span class="hcell">${ctx.ic(x)}</span>`).join('')}</div>`, 4000, () => {
      let found = 0, wrong = 0;
      b.innerHTML = `<p class="hq">Ťukni na všech ${n} věcí z batohu.</p><div class="hgrid kim">${grid.map(x => `<button class="hcell" data-x="${x}">${ctx.ic(x)}</button>`).join('')}</div>`;
      b.querySelectorAll('button.hcell').forEach(x => x.onclick = () => {
        x.disabled = true; if (bag.includes(x.dataset.x)) { x.classList.add('good'); found++; } else { x.classList.add('bad'); wrong++; }
        if (found === n || wrong >= 3) ans(found === n && wrong <= 1);
      });
    });
  });
}
function playCount(el, ctx) { // 67 Rychlé počítání
  rounds(el, ctx, 6, 'Na krmítko přiletěli ptáci. Kolik jich bylo?', (i, b, ans) => {
    const n = int(2, 5 + i), sp = pick(byGroup(ctx, 'Ptáci'));
    const pos = shuffle(Array.from({ length: 12 }, (_, k) => k)).slice(0, n);
    showThen(b, `<div class="hfeed">${pos.map(k => `<span style="left:${(k % 4) * 24 + 4}%;top:${Math.floor(k / 4) * 30 + 6}%">${ctx.img(sp)}</span>`).join('')}</div>`, 1300 - i * 80, () => {
      chooseMix(b, 'Kolik jich bylo?', near(n).map(String), ans);
    });
  });
}
function playMapMem(el, ctx) { // 69 Zapamatuj si mapu
  rounds(el, ctx, 4, 'Zapamatuj si, kde zvířata na mapě jsou.', (i, b, ans) => {
    const k = 2 + Math.min(i, 2), cells = sample(Array.from({ length: 16 }, (_, j) => j), k), who = sample(POOL(ctx), k);
    const grid = sh => `<div class="hmap">${Array.from({ length: 16 }, (_, j) => { const w = cells.indexOf(j); return `<button class="hmc" data-j="${j}">${sh && w >= 0 ? ctx.img(who[w]) : ''}</button>`; }).join('')}</div>`;
    showThen(b, grid(true), 3000, () => {
      let at = 0, bad = 0;
      const ask = () => { b.querySelector('.hq').innerHTML = `Kde byl(a) <b>${esc(who[at].name)}</b>?`; };
      b.innerHTML = `<p class="hq"></p>${grid(false)}`; ask();
      b.querySelectorAll('.hmc').forEach(x => x.onclick = () => {
        if (at >= k) return; const good = +x.dataset.j === cells[at];
        x.innerHTML = ctx.img(who[at]); x.classList.add(good ? 'good' : 'bad'); if (!good) { bad++; b.querySelector(`.hmc[data-j="${cells[at]}"]`).innerHTML = ctx.img(who[at]); }
        if (++at < k) ask(); else ans(bad === 0);
      });
    });
  });
}
function playColors(el, ctx) { // 70 Barvy peří
  const PAL = Object.fromEntries((KEY_Q['Ptáci'].find(q => q[0] === 'barvy') || [, , []])[2].map(([c, , h]) => [c, h]));
  const birds = byGroup(ctx, 'Ptáci').filter(s => (keyTraits(s.id)?.barvy || []).length >= 2);
  const sw = cs => `<span class="hsw">${cs.map(c => `<i style="background:${PAL[c] || '#ccc'}"></i>`).join('')}</span>`;
  rounds(el, ctx, 5, 'Prohlédni si ptáka. Pak vyber jeho barvy.', (i, b, ans) => {
    const sp = pick(birds), mine = keyTraits(sp.id).barvy, key = x => [...x].sort().join('');
    const others = uniqBy(sample(birds, 12).map(s => keyTraits(s.id).barvy).filter(c => key(c) !== key(mine)), key).slice(0, 2);
    showThen(b, `<div class="hcard">${card(ctx, sp)}</div>`, 2500, () => chooseMix(b, `Jaké barvy měl <b>${esc(sp.name)}</b>?`, [mine, ...others].map(sw), ans));
  });
}
function lettersGame(el, ctx, info, n, make) { // tap písmen ve správném pořadí
  rounds(el, ctx, n, info, (i, b, ans) => {
    const r = make(ctx, i), target = [...r.word], keys = r.keys || shuffle(target); let at = r.given || 0, miss = 0;
    const show = () => target.map((ch, j) => `<span class="hl${j < at ? ' on' : ''}">${j < at || (r.reveal && r.reveal.has(j)) ? ch : '_'}</span>`).join('');
    b.innerHTML = `<div class="hq">${r.q}</div><div class="hword">${show()}</div><div class="hkeys">${keys.map((ch, j) => `<button class="hk" data-j="${j}">${ch}</button>`).join('')}</div>`;
    const w = b.querySelector('.hword');
    b.querySelectorAll('.hk').forEach(x => x.onclick = () => {
      if (at >= target.length || miss >= 3) return;
      while (r.reveal && r.reveal.has(at)) at++;
      if (x.textContent === target[at]) { if (!r.keys) { x.disabled = true; x.classList.add('used'); } at++; while (r.reveal && r.reveal.has(at)) at++; w.innerHTML = show(); if (at >= target.length) ans(miss <= 1); }
      else { x.classList.add('bad'); setTimeout(() => x.classList.remove('bad'), 400); if (++miss >= 3) { at = target.length; w.innerHTML = show(); ans(false); } }
    });
  });
}
const shortWords = ctx => uniqBy(POOL(ctx).filter(s => { const w = word(s); return w.length >= 3 && w.length <= 8 && !/\s|-/.test(w); }), word);
function playAnagram(el, ctx) { // 86
  lettersGame(el, ctx, 'Slož název zvířete ze zpřeházených písmen.', 5, c => { const sp = pick(shortWords(c)); return { word: word(sp).toUpperCase(), q: `<span class="him small">${c.img(sp)}</span>` }; });
}
function playFill(el, ctx) { // 87 doplňovačka
  lettersGame(el, ctx, 'Podle nápovědy doplň chybějící písmena.', 5, c => {
    const sp = pick(shortWords(c).filter(s => s.fact)), w = word(sp).toUpperCase(), reveal = new Set([...w].map((_, j) => j).filter(j => j % 2 === 0));
    const fact = esc(String(sp.fact).replace(new RegExp(word(sp), 'gi'), '…'));
    const miss = [...w].filter((_, j) => !reveal.has(j));
    return { word: w, reveal, keys: shuffle([...new Set([...miss, ...sample([...ABC], 4)])]), q: `<p><b>${esc(sp.group)}</b> · ${fact}</p>` };
  });
}
function playHangman(el, ctx) { // 89 Šibenice
  rounds(el, ctx, 3, 'Hádej písmena. Máš 7 omylů.', (i, b, ans) => {
    const sp = pick(shortWords(ctx)), w = word(sp).toUpperCase(), got = new Set(); let bad = 0;
    const draw = () => { b.querySelector('.hword').innerHTML = [...w].map(ch => `<span class="hl${got.has(ch) ? ' on' : ''}">${got.has(ch) ? ch : '_'}</span>`).join(''); b.querySelector('.hmiss').textContent = '✗'.repeat(bad) + '·'.repeat(7 - bad); };
    b.innerHTML = `<div class="hq">${esc(sp.group)}</div><div class="hword"></div><p class="hmiss"></p><div class="hkeys abc">${[...ABC].map(ch => `<button class="hk">${ch}</button>`).join('')}</div>`; draw();
    b.querySelectorAll('.hk').forEach(x => x.onclick = () => {
      x.disabled = true; const ch = x.textContent;
      if (w.includes(ch)) { got.add(ch); x.classList.add('good'); } else { bad++; x.classList.add('bad'); }
      draw();
      if ([...w].every(c => got.has(c))) { b.querySelector('.hq').innerHTML = card(ctx, sp); ans(true); }
      else if (bad >= 7) { [...w].forEach(c => got.add(c)); draw(); b.querySelector('.hq').innerHTML = card(ctx, sp); ans(false); }
    });
  });
}
function playWordSearch(el, ctx) { // 88 Osmisměrka
  const f = frame(el, 'Najdi názvy zvířat. Ťukni na první a poslední písmeno slova.'), N = 9, D = [[0, 1], [1, 0], [1, 1], [-1, 1], [0, -1], [-1, 0], [-1, -1], [1, -1]];
  const grid = Array.from({ length: N }, () => Array(N).fill('')), words = [];
  for (const sp of shuffle(shortWords(ctx)).filter(s => word(s).length <= 7)) {
    if (words.length >= 6) break; const w = word(sp).toUpperCase();
    for (let t = 0; t < 60; t++) {
      const [dr, dc] = pick(D), r0 = int(0, N - 1), c0 = int(0, N - 1), cells = [...w].map((_, j) => [r0 + dr * j, c0 + dc * j]);
      if (cells.every(([r, c], j) => r >= 0 && c >= 0 && r < N && c < N && (!grid[r][c] || grid[r][c] === w[j]))) { cells.forEach(([r, c], j) => grid[r][c] = w[j]); words.push({ w, sp, cells }); break; }
    }
  }
  const FILL = 'AAEEIIOOUYLLNNRRSSTTKKMMPPVVDHCZJBÁÍÉŘŠČŽ'; // běžná písmena, ať slova nejsou vidět podle vzácných háčků
  grid.forEach(row => row.forEach((ch, c) => { if (!ch) row[c] = pick([...FILL]); }));
  let first = null, found = 0;
  f.b.innerHTML = `<div class="hws" style="--n:${N}">${grid.map((row, r) => row.map((ch, c) => `<button class="hwc" data-r="${r}" data-c="${c}">${ch}</button>`).join('')).join('')}</div><div class="hwl">${words.map((x, j) => `<span data-j="${j}">${esc(x.w)}</span>`).join('')}</div><button class="btn sm hgive">Vzdát</button>`;
  const cell = (r, c) => f.b.querySelector(`.hwc[data-r="${r}"][data-c="${c}"]`);
  const upd = () => f.set(`${found} / ${words.length}`, ''); upd();
  f.b.querySelectorAll('.hwc').forEach(x => x.onclick = () => {
    const rc = [+x.dataset.r, +x.dataset.c];
    if (!first) { first = rc; x.classList.add('sel'); return; }
    cell(...first).classList.remove('sel');
    const j = words.findIndex(w => !w.done && ((w.cells[0] + '' === first + '' && w.cells.at(-1) + '' === rc + '') || (w.cells.at(-1) + '' === first + '' && w.cells[0] + '' === rc + '')));
    first = null; if (j < 0) return;
    words[j].done = true; found++; words[j].cells.forEach(p => cell(...p).classList.add('ok')); f.b.querySelector(`.hwl [data-j="${j}"]`).classList.add('ok'); upd();
    if (found === words.length) setTimeout(() => ctx.done(found, words.length), 600);
  });
  f.b.querySelector('.hgive').onclick = () => { words.forEach(w => w.cells.forEach(p => cell(...p).classList.add(w.done ? 'ok' : 'miss'))); setTimeout(() => ctx.done(found, words.length), 1500); };
}
function playChain(el, ctx) { // 91 Slovní řetěz
  const ws = shortWords(ctx); let prev = pick(ws);
  rounds(el, ctx, 6, 'Další zvíře musí začínat posledním písmenem předchozího.', (i, b, ans) => {
    const last = plain(word(prev).slice(-1)).toUpperCase(), good = ws.filter(s => s !== prev && plain(word(s)[0]).toUpperCase() === last);
    if (!good.length) { prev = pick(ws); return ans(true); }
    const right = pick(good), wrong = sample(ws.filter(s => plain(word(s)[0]).toUpperCase() !== last), 3);
    const order = shuffle([right, ...wrong]);
    choose(b, `Předchozí: <b>${esc(word(prev))}</b> → hledáme na <b>${last}</b>`, order.map(s => opt(ctx, s)), order.indexOf(right), ok => { prev = right; ans(ok); });
  });
}
// políčka, jejichž zvíře se opakuje v řádku, sloupci nebo čtverci 2×2
export function sudokuBad(g) {
  const bad = new Set(), groups = [];
  for (let k = 0; k < 4; k++) { groups.push([0, 1, 2, 3].map(c => [k, c]), [0, 1, 2, 3].map(r => [r, k]), [0, 1, 2, 3].map(j => [Math.floor(k / 2) * 2 + Math.floor(j / 2), (k % 2) * 2 + j % 2])); }
  for (const cells of groups) cells.forEach(([r, c]) => { if (g[r][c] >= 0 && cells.some(([r2, c2]) => (r2 !== r || c2 !== c) && g[r2][c2] === g[r][c])) bad.add(r * 4 + c); });
  return bad;
}
function playSudoku(el, ctx) { // 41
  const f = frame(el, 'Doplň zvířata tak, aby v každém řádku, sloupci i čtverci 2×2 bylo každé jednou. Ťukáním měníš zvíře.');
  const base = [[0, 1, 2, 3], [2, 3, 0, 1], [1, 0, 3, 2], [3, 2, 1, 0]], sym = shuffle([0, 1, 2, 3]), sp = sample(POOL(ctx), 4);
  const rows = [...shuffle([0, 1]), ...shuffle([2, 3])], cols = [...shuffle([0, 1]), ...shuffle([2, 3])];
  const sol = rows.map(r => cols.map(c => sym[base[r][c]])), hole = new Set(sample([...Array(16).keys()], 9)), cur = sol.map((row, r) => row.map((v, c) => hole.has(r * 4 + c) ? -1 : v));
  const draw = () => { f.b.querySelector('.hsud').innerHTML = cur.map((row, r) => row.map((v, c) => `<button class="hsc${hole.has(r * 4 + c) ? '' : ' fix'}" data-r="${r}" data-c="${c}">${v >= 0 ? ctx.img(sp[v]) : ''}</button>`).join('')).join(''); bind(); };
  const bind = () => f.b.querySelectorAll('.hsc:not(.fix)').forEach(x => x.onclick = () => { const r = +x.dataset.r, c = +x.dataset.c; cur[r][c] = cur[r][c] >= 3 ? -1 : cur[r][c] + 1; draw(); });
  f.b.innerHTML = `<div class="hsud"></div><button class="btn sm primary hchk">Zkontrolovat</button>`; draw(); f.set('4 × 4', '');
  f.b.querySelector('.hchk').onclick = () => { // podle pravidel (víc správných řešení je v pořádku)
    const bad = sudokuBad(cur), empty = cur.flat().filter(v => v < 0).length;
    if (!bad.size && !empty) return ctx.done(1, 1);
    f.b.querySelectorAll('.hsc').forEach(x => x.classList.toggle('bad', bad.has(+x.dataset.r * 4 + +x.dataset.c)));
    f.set('4 × 4', bad.size ? `chyb: ${bad.size}` : `prázdných: ${empty}`);
  };
}
function playCones(el, ctx) { // 49 Šišky do košíků
  rounds(el, ctx, 4, 'Vyber šišky tak, aby jich v košíku bylo přesně tolik, kolik je napsáno.', (i, b, ans) => {
    const nums = Array.from({ length: 6 }, () => int(1, 9)), pickIdx = sample([0, 1, 2, 3, 4, 5], int(2, 3)), T = pickIdx.reduce((a, k) => a + nums[k], 0), on = new Set();
    b.innerHTML = `<div class="hq">Do košíku patří <b>${T}</b> šišek.</div><div class="hkeys">${nums.map((v, k) => `<button class="hk cone" data-k="${k}">${ctx.ic('res_seeds')}<b>${v}</b></button>`).join('')}</div><p class="hsum">V košíku: 0</p><button class="btn sm hskip">Přeskočit</button>`;
    const sum = () => [...on].reduce((a, k) => a + nums[k], 0);
    b.querySelectorAll('.hk').forEach(x => x.onclick = () => { const k = +x.dataset.k; on.has(k) ? on.delete(k) : on.add(k); x.classList.toggle('on'); b.querySelector('.hsum').textContent = 'V košíku: ' + sum(); if (sum() === T) ans(true); });
    b.querySelector('.hskip').onclick = () => ans(false);
  });
}
function playBinary(el, ctx) { // 57 Binární světlušky
  rounds(el, ctx, 5, 'Každá světluška má číslo. Rozsviť je tak, aby dohromady daly zadané číslo.', (i, b, ans) => {
    const bits = i < 2 ? [8, 4, 2, 1] : [16, 8, 4, 2, 1], N = int(1, bits[0] * 2 - 1), on = new Set();
    b.innerHTML = `<div class="hq">Rozsviť číslo <b>${N}</b></div><div class="hkeys">${bits.map(v => `<button class="hk fly" data-v="${v}"><i></i><b>${v}</b></button>`).join('')}</div><p class="hsum">Svítí: 0</p>`;
    b.querySelectorAll('.hk').forEach(x => x.onclick = () => { const v = +x.dataset.v; on.has(v) ? on.delete(v) : on.add(v); x.classList.toggle('on'); const s = [...on].reduce((a, c) => a + c, 0); b.querySelector('.hsum').textContent = 'Svítí: ' + s; if (s === N) ans(true); });
  });
}
function playCode(el, ctx) { // 58 Barevný kód
  const f = frame(el, 'Krmítko má zámek ze 3 barev (každá jiná). ● = správná barva na správném místě, ○ = barva je v kódu jinde. Máš 8 pokusů.');
  const C = ['#d9442b', '#f2c21b', '#3f8f3a', '#3a74c8', '#8a4fc0'], code = sample([0, 1, 2, 3, 4], 3); let guess = [], tries = 0;
  f.b.innerHTML = `<div class="hcode"></div><div class="hcur"></div><div class="hkeys">${C.map((c, k) => `<button class="hk col" data-k="${k}" style="background:${c}"></button>`).join('')}</div><button class="btn sm hback">Smazat</button>`;
  const cur = () => { f.b.querySelector('.hcur').innerHTML = [0, 1, 2].map(j => `<i style="background:${guess[j] != null ? C[guess[j]] : 'transparent'}"></i>`).join(''); };
  cur(); f.set('pokus 1 / 8', '');
  f.b.querySelectorAll('.hk').forEach(x => x.onclick = () => {
    const k = +x.dataset.k; if (guess.includes(k) || guess.length >= 3) return; guess.push(k); cur();
    if (guess.length < 3) return;
    tries++; const full = guess.filter((g, j) => g === code[j]).length, part = guess.filter(g => code.includes(g)).length - full;
    f.b.querySelector('.hcode').insertAdjacentHTML('beforeend', `<div class="hcrow">${guess.map(g => `<i style="background:${C[g]}"></i>`).join('')}<span>${'●'.repeat(full)}${'○'.repeat(part)}</span></div>`);
    guess = []; cur(); f.set(`pokus ${Math.min(8, tries + 1)} / 8`, '');
    if (full === 3) return setTimeout(() => ctx.done(9 - tries, 8), 600);
    if (tries >= 8) { f.b.querySelector('.hcur').innerHTML = code.map(g => `<i style="background:${C[g]}"></i>`).join(''); setTimeout(() => ctx.done(0, 8), 1500); }
  });
  f.b.querySelector('.hback').onclick = () => { guess.pop(); cur(); };
}

/* ---------- seznam her ---------- */
// kind: sort | match | order | quiz | custom; n = číslo ze seznamu 100 her
export const HERNA_GROUPS = [['sort', 'Třídění do skupin'], ['match', 'Spoj dvojice'], ['order', 'Seřaď'], ['quiz', 'Kvíz'], ['mem', 'Paměť'], ['word', 'Slova'], ['num', 'Čísla a logika']];
export const HERNA = [
  { n: 1, id: 'bio', g: 'sort', name: 'Kdo kam patří', desc: 'Zvířata do biotopů', gen: c => { const b = sample(['voda', 'les', 'pole', 'louka', 'mesto', 'skaly', 'mokrad'], 3); return { bins: b.map(id => [id, (c.cfg.biotopes.find(x => x.id === id) || { name: id }).name, c.ic('bio_' + id)]), items: mixItems(b.map(id => [c.sp.filter(s => top(s.bio) === id && b.every(o => o === id || !(o in parseMap(s.bio)))), id, s => card(c, s)]), 3).slice(0, 8) }; } },
  { n: 4, id: 'noc', g: 'sort', name: 'Noc a den', desc: 'Noční a denní zvířata', gen: c => ({ bins: [['n', 'V noci', c.ic('night')], ['d', 'Ve dne', c.ic('w_clear')]], items: mixItems([[c.sp.filter(s => s.night), 'n', s => card(c, s)], [c.sp.filter(s => !s.night), 'd', s => card(c, s)]], 4) }) },
  { n: 7, id: 'pokryv', g: 'sort', name: 'Peří, srst, šupiny', desc: 'Podle pokryvu těla', gen: c => ({ bins: [['p', 'peří'], ['s', 'srst'], ['u', 'šupiny'], ['k', 'holá kůže']], items: mixItems([[byGroup(c, 'Ptáci'), 'p', s => card(c, s)], [byGroup(c, 'Savci'), 's', s => card(c, s)], [[...byGroup(c, 'Plazi'), ...byGroup(c, 'Ryby')], 'u', s => card(c, s)], [byGroup(c, 'Obojživelníci'), 'k', s => card(c, s)]], 2) }) },
  { n: 8, id: 'lihnuti', g: 'sort', name: 'Kdo se z čeho líhne', desc: 'Vejce, živé mládě, kukla', gen: c => ({ bins: [['v', 'z vejce'], ['z', 'rodí živá mláďata'], ['k', 'přes housenku a kuklu']], items: mixItems([[[...byGroup(c, 'Ptáci'), ...byGroup(c, 'Plazi').filter(s => !LIVE.has(s.id))], 'v', s => card(c, s)], [[...byGroup(c, 'Savci'), ...c.sp.filter(s => LIVE.has(s.id))], 'z', s => card(c, s)], [byGroup(c, 'Hmyz').filter(s => ['motyl', 'mura', 'brouk', 'vcela'].includes(kind(s))), 'k', s => card(c, s)]], 3) }) },
  { n: 15, id: 'zima', g: 'sort', name: 'Co dělá v zimě', desc: 'Spí, odlétá, nebo zůstává', gen: c => { const away = s => s.group === 'Ptáci' && s.months && !parseMonths(s.months).has(1); return { bins: [['o', 'odlétá'], ['z', 'zůstává'], ['s', 'spí']], items: mixItems([[c.sp.filter(away), 'o', s => card(c, s)], [c.sp.filter(s => (s.group === 'Ptáci' || s.group === 'Savci') && !s.months && !HIB.has(s.id)), 'z', s => card(c, s)], [c.sp.filter(s => HIB.has(s.id) || s.group === 'Obojživelníci' || s.group === 'Plazi'), 's', s => card(c, s)]], 3) }; } },
  { n: 18, id: 'ulity', g: 'sort', name: 'Ulity a lastury', desc: 'Plži a mlži', gen: c => { const m = byGroup(c, 'Měkkýši'); return { bins: [['u', 'ulita (plž)'], ['l', 'lastura (mlž)'], ['b', 'bez ulity (slimák)']], items: mixItems([[m.filter(s => ['plz', 'vodni'].includes(kind(s))), 'u', s => card(c, s)], [m.filter(s => kind(s) === 'mlz'), 'l', s => card(c, s)], [m.filter(s => kind(s) === 'slimak'), 'b', s => card(c, s)]], 3) }; } },
  { n: 19, id: 'nohy', g: 'sort', name: 'Kolik nohou', desc: 'Hmyz, pavouci, ostatní', gen: c => ({ bins: [['6', '6 nohou'], ['8', '8 nohou'], ['v', 'víc než 8'], ['0', 'žádné']], items: mixItems([[byGroup(c, 'Hmyz'), '6', s => card(c, s)], [byGroup(c, 'Pavoukovci'), '8', s => card(c, s)], [byGroup(c, 'Ostatní'), 'v', s => card(c, s)], [byGroup(c, 'Měkkýši'), '0', s => card(c, s)]], 2) }) },
  { n: 20, id: 'chranene', g: 'sort', name: 'Chráněné druhy', desc: 'Je zvláště chráněný?', gen: c => ({ bins: [['a', 'chráněný'], ['n', 'není chráněný']], items: mixItems([[c.sp.filter(s => /chrán/i.test(s.edu?.protection || '')), 'a', s => card(c, s)], [c.sp.filter(s => s.edu?.diet && !/chrán/i.test(s.edu?.protection || '')), 'n', s => card(c, s)]], 4) }) },
  { n: 60, id: 'rodokmen', g: 'sort', name: 'Rodič, nebo mládě', desc: 'Dospělý, nebo mládě?', gen: c => { const s = c.sp.filter(x => c.hasImg(x.id + '_1')); return { bins: [['r', 'dospělý'], ['m', 'mládě / larva / pulec']], items: shuffle([...sample(s, 4).map(x => [card(c, x, undefined, false), 'r']), ...sample(s, 4).map(x => [card(c, x, 0, false), 'm'])]) }; } },

  { n: 5, id: 'kalendar', g: 'match', name: 'Kalendář přírody', desc: 'Kdy ho potkáš', gen: c => uniqBy(shuffle(c.sp.filter(s => formatMonths(s.months))), s => formatMonths(s.months)).slice(0, 5).map(s => [card(c, s), esc(formatMonths(s.months))]) },
  { n: 6, id: 'stopy', g: 'match', name: 'Stopy a majitelé', desc: 'Spoj stopu se zvířetem', gen: c => sample(c.sp.filter(s => c.hasImg(s.id + '_stopa')), 4).map(s => [`<span class="him">${c.track(s.id)}</span>`, card(c, s)]) },
  { n: 16, id: 'potrava', g: 'match', name: 'Kdo co jí', desc: 'Pták a jeho potrava', gen: c => uniqBy(shuffle(byGroup(c, 'Ptáci')), s => top(s.food)).slice(0, 5).map(s => [card(c, s), `<span class="him">${c.ic('food_' + top(s.food))}</span><b>${esc((c.cfg.foods.find(f => f.id === top(s.food)) || { name: '' }).name)}</b>`]) },
  { n: 17, id: 'hnizda', g: 'match', name: 'Hnízda', desc: 'Kde hnízdí', gen: c => { const bp = s => String(s.edu.breedPlace).split(/[;,(]/)[0].trim(); return uniqBy(shuffle(byGroup(c, 'Ptáci').filter(s => s.edu?.breedPlace)), bp).slice(0, 4).map(s => [card(c, s), esc(bp(s))]); } },
  { n: 90, id: 'latina', g: 'match', name: 'Latinské jméno', desc: 'Česky a latinsky', gen: c => sample(c.sp, 5).map(s => [esc(s.name), `<i>${esc(s.lat)}</i>`]) },
  { n: 94, id: 'mladata', g: 'match', name: 'Mláďata', desc: 'Dospělý a jeho mládě', gen: c => uniqBy(shuffle(c.sp.filter(s => c.hasImg(s.id + '_1'))), s => s.group).slice(0, 4).map(s => [card(c, s), card(c, s, 0, false)]) },
  { n: 95, id: 'zvuky', g: 'match', name: 'Zvukomalba', desc: 'Kdo dělá „ťuk ťuk“', gen: c => sample(SOUNDS.filter(([id]) => c.SP[id]?.active), 5).map(([id, t]) => [card(c, c.SP[id]), `„${esc(t)}“`]) },

  { n: 2, id: 'retezec', g: 'order', name: 'Potravní řetězec', desc: 'Kdo koho jí', rounds: 4, gen: c => ({ q: 'Seřaď od potravy po toho, kdo je na konci řetězce.', items: chainItems(c, pick(CHAINS.filter(ch => chainItems(c, ch).every(Boolean)))) }) },
  { n: 9, id: 'stadia', g: 'order', name: 'Stádia', desc: 'Od mláděte po dospělce', rounds: 4, gen: c => { const s = pick(c.sp.filter(x => c.hasImg(x.id + '_3') && ['Hmyz', 'Obojživelníci', 'Ryby'].includes(x.group))); return { q: `Seřaď vývoj: <b>${esc(s.name)}</b>`, items: [0, 1, 2].map(k => card(c, s, k, false)) }; } },
  { n: 12, id: 'velikost', g: 'order', name: 'Velikostní řada', desc: 'Od nejmenšího', rounds: 4, gen: c => { const s = []; for (const x of shuffle(c.sp.filter(cm))) { if (s.every(y => Math.max(cm(x), cm(y)) / Math.min(cm(x), cm(y)) > 1.3)) s.push(x); if (s.length === 4) break; } return { q: 'Seřaď od nejmenšího po největší.', items: s.sort((a, b) => cm(a) - cm(b)).map(x => card(c, x)) }; } },
  { n: 50, id: 'rano', g: 'order', name: 'Ranní zpěv', desc: 'Kdo zpívá ráno první', rounds: 3, gen: c => { const ok = DAWN.filter(id => c.SP[id]?.active), k = new Set(sample(ok.map((_, j) => j), 4)); return { q: 'Kdo začíná ráno zpívat dřív? Seřaď od prvního.', items: ok.filter((_, j) => k.has(j)).map(id => card(c, c.SP[id])) }; } },

  { n: 3, id: 'lichy', g: 'quiz', name: 'Lichý ven', desc: 'Které zvíře nepatří do skupiny', rounds: 6, gen: c => { const a = pick(c.sp), same = [a, ...otherOpts(c, a, 2)], odd = pick(c.sp.filter(s => s.group !== a.group)); return { q: 'Které zvíře nepatří k ostatním?', opts: [odd, ...same].map(s => opt(c, s)), cls: 'img' }; } },
  { n: 11, id: 'siluety', g: 'quiz', name: 'Siluety', desc: 'Pozná se podle obrysu', rounds: 6, gen: c => { const s = pick(c.sp); return { q: `<div class="hcard sil"><span class="him">${c.img(s)}</span></div>`, opts: [s, ...otherOpts(c, s, 3)].map(x => esc(x.name)) }; } },
  { n: 14, id: 'dvojnici', g: 'quiz', name: 'Dvojníci', desc: 'Podobné druhy', rounds: 5, gen: c => { const g = {}; c.sp.forEach(s => (g[s.edu?.genus || s.lat.split(' ')[0]] ||= []).push(s)); const pairs = Object.values(g).filter(x => x.length >= 2), p = sample(pick(pairs), 2); return { q: `Který je <b>${esc(p[0].name)}</b>?`, opts: p.map(s => card(c, s, undefined, false)), cls: 'img' }; } },
  { n: 35, id: 'vrstevnice', g: 'quiz', name: 'Vrstevnice', desc: 'Který kopec je nejvyšší', rounds: 5, gen: svgHills },
  { n: 36, id: 'reka', g: 'quiz', name: 'Proud řeky', desc: 'Kam dopluje list', rounds: 5, gen: svgRiver },
  { n: 37, id: 'stin', g: 'quiz', name: 'Stín stromu', desc: 'Kolik je hodin', rounds: 5, gen: svgShadow },
  { n: 44, id: 'stadonohy', g: 'quiz', name: 'Počítání nohou', desc: 'Kolik je nohou', rounds: 6, gen: c => { const gs = sample(Object.keys(LEGS), 2), sp = gs.map(g => pick(byGroup(c, g))), k = gs.map(() => int(1, 4)), t = k[0] * LEGS[gs[0]] + k[1] * LEGS[gs[1]]; return { q: `Na louce je ${k[0]}× <b>${esc(sp[0].name)}</b> a ${k[1]}× <b>${esc(sp[1].name)}</b>. Kolik mají dohromady nohou?`, opts: near(t).map(String) }; } },
  { n: 51, id: 'hejno', g: 'quiz', name: 'Odhad hejna', desc: 'Kolik ptáků je v hejnu', rounds: 5, gen: c => { const n = int(10, 45), sp = pick(byGroup(c, 'Ptáci')), dots = Array.from({ length: n }, () => `<span style="left:${int(2, 90)}%;top:${int(4, 80)}%">${c.img(sp)}</span>`).join(''); return { q: `<div class="hflock">${dots}</div>`, opts: [n, Math.round(n * 0.5), Math.round(n * 1.7), Math.round(n * 2.6)].map(String), after: b => setTimeout(() => { const f = b.querySelector('.hflock'); if (f) f.classList.add('gone'); }, 2200) }; } },
  { n: 52, id: 'graf', g: 'quiz', name: 'Graf pozorování', desc: 'Čti z grafu', rounds: 5, gen: (c, i) => { const s = sample(c.sp, 4), v = sample([1, 2, 3, 4, 5, 6, 7, 8, 9], 4), bars = s.map((x, k) => `<div class="hbarrow"><span class="him small">${c.img(x)}</span><i style="width:${v[k] * 10}%"></i><b>${v[k]}</b></div>`).join(''); const mode = i % 3; const mx = v.indexOf(Math.max(...v)), mn = v.indexOf(Math.min(...v)), k = int(0, 3); return mode === 0 ? { q: `<div class="hchart">${bars}</div><p>Který druh byl nejčastější?</p>`, opts: [s[mx], ...s.filter((_, j) => j !== mx).slice(0, 3)].map(x => esc(x.name)) } : mode === 1 ? { q: `<div class="hchart">${bars}</div><p>Kterého bylo nejméně?</p>`, opts: [s[mn], ...s.filter((_, j) => j !== mn).slice(0, 3)].map(x => esc(x.name)) } : { q: `<div class="hchart">${bars.replace(/<b>\d+<\/b>/g, '')}</div><p>Kolik bylo: <b>${esc(s[k].name)}</b>?</p>`, opts: [v[k], ...near(v[k]).slice(1)].map(String) }; } },
  { n: 53, id: 'pravda', g: 'quiz', name: 'Pravda, nebo lež', desc: 'Tvrzení o zvířatech', rounds: 8, gen: c => { const s = pick(c.sp), t = Math.random() < 0.5, kinds = ['g', 'n', 'b', 'f']; const k = pick(kinds); let txt; const o = pick(c.sp.filter(x => x.group !== s.group));
      if (k === 'g') txt = `${s.name} patří do skupiny ${t ? s.group : o.group}.`;
      else if (k === 'n') txt = `${s.name} je aktivní hlavně ${(t ? s.night : !s.night) ? 'v noci' : 've dne'}.`;
      else if (k === 'b') { const bio = top(s.bio), other = pick(c.cfg.biotopes.filter(b => !(b.id in parseMap(s.bio)))); txt = `${s.name} žije hlavně tady: ${(t || !other ? c.cfg.biotopes.find(b => b.id === bio) : other)?.name}.`; }
      else { const f = top(s.food), of = pick(c.cfg.foods.filter(x => !(x.id in parseMap(s.food)))); txt = `${s.name} jí: ${(t || !of ? c.cfg.foods.find(x => x.id === f) : of)?.name}.`; }
      return { q: `<div class="hcard">${card(c, s, undefined, false)}</div><p class="hstate">„${esc(txt)}“</p>`, opts: t ? ['Pravda', 'Lež'] : ['Lež', 'Pravda'] }; } },
  { n: 92, id: 'hadanka', g: 'quiz', name: 'Hádanka', desc: 'Uhodni zvíře z nápověd', rounds: 5, gen: c => { const s = pick(c.sp.filter(x => x.fact)), clues = [`Patří mezi: ${s.group}`, `Žije hlavně: ${c.cfg.biotopes.find(b => b.id === top(s.bio))?.name || '?'}`, `Jí: ${c.cfg.foods.find(f => f.id === top(s.food))?.name || '?'}`, String(s.fact).replace(new RegExp(word(s), 'gi'), '…')]; return { q: `<ol class="hclues">${clues.map((t, j) => `<li${j ? ' hidden' : ''}>${esc(t)}</li>`).join('')}</ol><button class="btn sm hmore">Další nápověda</button>`, opts: [s, ...otherOpts(c, s, 3)].map(x => opt(c, x)), cls: 'img', after: b => { const m = b.querySelector('.hmore'); m.onclick = () => { const h = b.querySelector('.hclues li[hidden]'); if (h) h.hidden = false; if (!b.querySelector('.hclues li[hidden]')) m.remove(); }; } }; } },
  { n: 93, id: 'prislovi', g: 'quiz', name: 'Přísloví a rčení', desc: 'Doplň zvíře', rounds: 6, gen: () => { const [t, a] = pick(PROVERBS), wrong = sample([...new Set(PROVERBS.map(p => p[1]).filter(x => x !== a))], 3); return { q: `<p class="hstate">${esc(t).replace('___', '<b>…</b>')}</p>`, opts: [a, ...wrong] }; } },

  { n: 61, id: 'zmizel', g: 'mem', name: 'Kdo zmizel', desc: 'Jedno zvíře zmizí', play: playGone },
  { n: 63, id: 'zpev', g: 'mem', name: 'Opakuj zpěv', desc: 'Zapamatuj si pořadí ptáků', play: playSimon },
  { n: 64, id: 'stezka', g: 'mem', name: 'Tichá stezka', desc: 'Pořadí zvířat na cestě', play: playTrail },
  { n: 65, id: 'kim', g: 'mem', name: 'Kimova hra', desc: 'Co bylo v batohu', play: playKim },
  { n: 67, id: 'pocitani', g: 'mem', name: 'Rychlé počítání', desc: 'Kolik ptáků je na krmítku', play: playCount },
  { n: 69, id: 'mapa', g: 'mem', name: 'Zapamatuj si mapu', desc: 'Kde zvířata byla', play: playMapMem },
  { n: 70, id: 'barvy', g: 'mem', name: 'Barvy peří', desc: 'Zapamatuj si barvy', play: playColors },

  { n: 86, id: 'presmycka', g: 'word', name: 'Přesmyčka', desc: 'Zpřeházená písmena', play: playAnagram },
  { n: 87, id: 'doplnovacka', g: 'word', name: 'Doplňovačka', desc: 'Místo křížovky: doplň písmena podle nápovědy', play: playFill },
  { n: 88, id: 'osmismerka', g: 'word', name: 'Osmisměrka', desc: 'Najdi názvy v mřížce', play: playWordSearch },
  { n: 89, id: 'sibenice', g: 'word', name: 'Šibenice', desc: 'Hádej písmena', play: playHangman },
  { n: 91, id: 'retez', g: 'word', name: 'Slovní řetěz', desc: 'Poslední písmeno → první', play: playChain },

  { n: 41, id: 'sudoku', g: 'num', name: 'Sudoku se zvířaty', desc: '4 × 4', play: playSudoku },
  { n: 43, id: 'dal', g: 'num', name: 'Co přijde dál', desc: 'Pokračuj v řadě', rounds: 5, kind: 'quiz', gen: c => { const ic = sample(['food_bobule', 'food_hmyz', 'food_orisky', 'food_ryba', 'food_zrni', 'food_listi', 'food_nektar'], 3), pat = pick([[0, 1], [0, 0, 1], [0, 1, 1], [0, 1, 2], [0, 0, 1, 1]]), seq = Array.from({ length: 7 }, (_, j) => pat[j % pat.length]), nx = pat[7 % pat.length]; return { q: `<div class="hseq">${seq.map(k => c.ic(ic[k])).join('')}<b>?</b></div>`, opts: [nx, ...[0, 1, 2].filter(k => k !== nx)].map(k => `<span class="him">${c.ic(ic[k])}</span>`), cls: 'img' }; } },
  { n: 45, id: 'vahy', g: 'num', name: 'Váhy', desc: 'Které zvíře je těžší', rounds: 6, kind: 'quiz', gen: c => { const w = c.sp.filter(grams); let a, b; for (let t = 0; t < 40; t++) { [a, b] = sample(w, 2); if (Math.max(grams(a), grams(b)) / Math.min(grams(a), grams(b)) > 1.6) break; } const h = grams(a) > grams(b) ? a : b; return { q: `<p>Které zvíře je těžší?</p>`, opts: [h, h === a ? b : a].map(s => card(c, s)), cls: 'img' }; } },
  { n: 46, id: 'zaludy', g: 'num', name: 'Spravedlivé krmení', desc: 'Rozděl žaludy', rounds: 5, kind: 'quiz', gen: c => { const k = int(2, 5), each = int(2, 6), rest = int(0, k - 1), n = k * each + rest, sp = pick(byGroup(c, 'Savci')), f = (e, r) => `každý ${e}, zbyde ${r}`; const o = new Set([f(each, rest)]); while (o.size < 4) o.add(f(Math.max(1, each + int(-2, 2)), int(0, k - 1))); return { q: `Máš <b>${n}</b> žaludů a ${k}× <b>${esc(sp.name)}</b>. Kolik dostane každý stejně a kolik zbyde?`, opts: [...o] }; } },
  { n: 47, id: 'ul', g: 'num', name: 'Násobilka v úlu', desc: 'Plástve a buňky', rounds: 6, kind: 'quiz', gen: () => { const a = int(2, 9), b = int(2, 9); return { q: `V úlu je <b>${a}</b> pláství a v každém <b>${b}</b> buněk s medem. Kolik buněk je dohromady?`, opts: near(a * b).map(String) }; } },
  { n: 48, id: 'zlomky', g: 'num', name: 'Zlomky koláče', desc: 'Jaká část je snědená', rounds: 5, kind: 'quiz', gen: () => { const n = int(2, 8), k = int(1, n - 1), o = new Set([`${k}/${n}`]); while (o.size < 4) { const nn = int(2, 8); o.add(`${int(1, nn - 1)}/${nn}`); } return { q: `<p>Jaká část koláče je oranžová?</p>${svgPie(k, n)}`, opts: [...o] }; } },
  { n: 49, id: 'sisky', g: 'num', name: 'Šišky do košíků', desc: 'Přesné součty', play: playCones },
  { n: 55, id: 'sifra', g: 'num', name: 'Šifra ze symbolů', desc: 'Rozlušti slovo', rounds: 5, kind: 'quiz', gen: c => { const ws = shortWords(c).filter(s => word(s).length <= 6), s = pick(ws), w = plain(word(s)).toUpperCase(), sy = ['food_bobule', 'food_drevo', 'food_hmyz', 'food_listi', 'food_maso', 'food_nektar', 'food_orisky', 'food_ryba', 'food_slimaci', 'food_zizaly', 'food_zrni', 'food_larvy', 'food_rasy', 'food_korinky', 'food_mleko', 'food_zaby']; const letters = [...new Set(w)], key = Object.fromEntries(letters.map((l, j) => [l, sy[j]])); const wrong = sample(ws.filter(x => x !== s && plain(word(x)).length === w.length), 3); if (wrong.length < 3) wrong.push(...sample(ws.filter(x => x !== s && !wrong.includes(x)), 3 - wrong.length)); return { q: `<div class="hkey">${letters.map(l => `<span>${c.ic(key[l])}<b>${l}</b></span>`).join('')}</div><div class="hseq">${[...w].map(l => c.ic(key[l])).join('')}</div>`, opts: [s, ...wrong].map(x => esc(word(x))) }; } },
  { n: 56, id: 'morse', g: 'num', name: 'Morseovka datla', desc: 'Datel ťuká písmena', rounds: 5, kind: 'quiz', gen: c => { const ws = shortWords(c).filter(s => word(s).length <= 5 && [...plain(word(s)).toUpperCase()].every(l => MORSE[l])), s = pick(ws), w = plain(word(s)).toUpperCase(), letters = [...new Set(w)]; const wrong = sample(ws.filter(x => x !== s), 3); const m = x => x.replace(/\./g, '•').replace(/-/g, '—'); return { q: `<div class="hkey">${letters.map(l => `<span><b>${l}</b> ${m(MORSE[l])}</span>`).join('')}</div><p class="hstate">${[...w].map(l => m(MORSE[l])).join('  /  ')}</p>`, opts: [s, ...wrong].map(x => esc(word(x))) }; } },
  { n: 57, id: 'svetlusky', g: 'num', name: 'Binární světlušky', desc: 'Rozsviť správné číslo', play: playBinary },
  { n: 58, id: 'kod', g: 'num', name: 'Barevný kód', desc: 'Odemkni krmítko', play: playCode }
];

/* ---------- spuštění hry ---------- */
export function playHerna(id, el, ctx) { const g = HERNA.find(x => x.id === id); if (g) playGame(g, el, ctx); }
export function playGame(g, el, ctx) {
  const info = esc(g.desc);
  if (g.play) return g.play(el, ctx);
  const k = g.kind || g.g;
  if (k === 'sort') return playSort(el, ctx, g.gen(ctx), info);
  if (k === 'match') return playMatch(el, ctx, g.gen(ctx), 'Ťukni na dvojici, která k sobě patří.');
  if (k === 'order') return playOrder(el, ctx, g.rounds || 4, info, g.gen);
  if (k === 'quiz') return playQuiz(el, ctx, g.rounds || 5, info, g.gen);
}

// pomůcky pro další hry (herna2.js)
export { shuffle, pick, sample, int, uniqBy, top, word, plain, card, opt, frame, rounds, choose, chooseMix, orderRound, byGroup, near };
