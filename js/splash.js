// Úvodní obrazovka: pozadí podle počasí, období a denní doby, běžící Aegon, kroky načítání s vtipnými texty.
// Ukáže se při každém spuštění aspoň min (nastavení, výchozí 10 s), nejdéle o 3 s déle (pak pustí do aplikace i bez všech dat).
import { SPLASH } from './splash-data.js';

export const MIN_MS = 10000, EXTRA_MS = 3000;
const SEASON = m => m >= 3 && m <= 5 ? 'jaro' : m >= 6 && m <= 8 ? 'leto' : m >= 9 && m <= 11 ? 'podzim' : 'zima';

// Výběr pozadí (čistá funkce kvůli testu): počasí (jen čerstvé) > noc > období; drsné jen mimo dětský režim; ne stejné jako minule
export function pickSplash({ month, night = false, weather = '', kid = false, last = '' }, rand = Math.random) {
  const season = SEASON(month), ok = s => !(kid && s.harsh) && s.s.includes(season);
  let pool = [];
  if (night) pool = SPLASH.filter(s => ok(s) && s.night && (!s.w.length || s.w.includes(weather)));
  else if (weather && weather !== 'clear') pool = SPLASH.filter(s => ok(s) && !s.night && s.w.includes(weather));
  if (!pool.length) pool = SPLASH.filter(s => ok(s) && s.night === !!night && !s.w.length);
  if (!pool.length) pool = SPLASH.filter(s => !s.harsh && !s.night && !s.w.length);
  const fresh = pool.filter(s => s.id !== last);
  const from = fresh.length ? fresh : pool;
  return from[Math.floor(rand() * from.length)];
}

export const STEPS = [['gps', 'center', 'Hledám, kde jsi'], ['map', 'map', 'Mapa okolí'], ['animals', 'clBird', 'Zvířata v okolí']];
const TEXTS = {
  gps: ['Aegon čenichá, kde vlastně jsme…', 'Ptám se satelitů na cestu. Jsou trochu daleko.', 'Hledám tě. Schováváš se dobře!', 'Aegon zvedl nos do větru. Sever je tamhle. Asi.', 'Domlouvám se s družicemi. Mluví hrozně pomalu.'],
  map: ['Rozbaluji mapu. Je větší než deka na piknik.', 'Kreslím cestičky. Aegon chce kreslit taky.', 'Rovnám stromy, aby stály rovně.', 'Přidávám řeky. Pozor, ať nenateče do batohu.', 'Mapa se rozkládá. Aegon si na ni právě lehl.'],
  animals: ['Aegon dělá „pst!“. Zvířata se ještě schovávají.', 'Budím ježka. Nechce se mu.', 'Počítám ptáky. Pořád mi přelétají.', 'Domlouvám se s liškou, jestli dnes přijde.', 'Veverka hledá oříšek, hned tu bude.', 'Krajina se dočítá cestou – klidně už vyraž.'],
  slow: ['Ještě chvilku. Aegon si zavazuje tkaničky. Žádné nemá.', 'Nabírám dech jako vydra před ponorem.', 'Pomalu, ale jistě. Jako hlemýžď na výletě.', 'Lepší pomalá stopa než žádná stopa.', 'Internet tu asi chodí pěšky.'],
  done: ['Hotovo! Aegon už vrtí ocasem.', 'Stopa je čerstvá. Jdeme!', 'Batoh sbalen, brýle nasazeny. Vyrážíme!'],
  offline: ['Internet usnul, použiji uloženou mapu.', 'Jsme mimo signál. Aegon to zvládne čuchem.']
};
const pick = a => a[Math.floor(Math.random() * a.length)];

// Ovládání obrazovky; ic = funkce na ikonu, hold = zůstat do ťuknutí (test)
export class Splash {
  constructor(el, { bg, ic, title, sub, hold = false, picker = false, minMs = MIN_MS, onDone }) {
    this.min = minMs; this.el = el; this.done = {}; this.t0 = Date.now(); this.hold = hold || picker; this.onDone = onDone; this.gone = false;
    el.classList.toggle('dark', !!bg.dark);
    el.innerHTML = `<img class="spbg" src="images/splash/${bg.id}.webp" alt="" onerror="this.remove()">
      <div class="sptop"><h1>${title}</h1><p>${sub}</p></div>
      <div class="spdog"><img alt=""></div>
      <div class="spcard"><ul>${STEPS.map(([k, i, n]) => `<li data-k="${k}">${ic(i)}<span>${n}</span><b class="st">…</b></li>`).join('')}</ul>
      <p class="sptxt" aria-live="polite"></p><div class="spbar"><i></i></div></div>`;
    el.hidden = false;
    if (picker) this.addPicker(bg);
    const frames = ['walk1', 'walk1b', 'walk2', 'walk2b'];
    let f = 0; const img = el.querySelector('.spdog img');
    const run = () => { img.src = `images/dog/${frames[f++ % 4]}.webp`; };
    run(); this.runT = setInterval(run, 180);
    this.txtT = setInterval(() => this.say(), 2200); this.say();
    this.maxT = setTimeout(() => this.check(true), this.min + EXTRA_MS);
    this.minT = setTimeout(() => this.check(), this.min);
    el.addEventListener('click', () => { if (Date.now() - this.t0 >= this.min || this.hold) this.hide(); });
  }
  // test: tlačítko Změnit pozadí – projde všech 35 po řadě, ukáže číslo a štítky; obrazovku nezavře
  addPicker(bg) {
    const b = document.createElement('button'), lbl = s => s.id + ' · ' + s.s.join(', ') + (s.night ? ' · noc' : '') + (s.w.length ? ' · ' + s.w.join(', ') : '') + (s.harsh ? ' · drsné' : '');
    let i = SPLASH.findIndex(s => s.id === bg.id);
    b.className = 'sppick'; b.textContent = '🖼 ' + lbl(bg);
    b.addEventListener('click', e => {
      e.stopPropagation(); i = (i + 1) % SPLASH.length; const s = SPLASH[i];
      this.el.querySelector('.spbg').src = 'images/splash/' + s.id + '.webp'; this.el.classList.toggle('dark', !!s.dark); b.textContent = '🖼 ' + lbl(s);
    });
    this.el.appendChild(b);
  }
  say() {
    const k = !navigator.onLine ? 'offline' : STEPS.map(s => s[0]).find(s => !this.done[s]) || 'done';
    const t = Date.now() - this.t0 > 6000 && k !== 'done' ? pick(TEXTS.slow) : pick(TEXTS[k]);
    const p = this.el.querySelector('.sptxt'); if (p) p.textContent = t;
  }
  step(k) {
    if (this.done[k] || this.gone) return;
    this.done[k] = true;
    const li = this.el.querySelector(`li[data-k="${k}"]`); if (li) { li.classList.add('ok'); li.querySelector('.st').textContent = '✓'; }
    const n = STEPS.filter(s => this.done[s[0]]).length;
    const bar = this.el.querySelector('.spbar i'); if (bar) bar.style.width = Math.round(n / STEPS.length * 100) + '%';
    this.say(); this.check();
  }
  // konec: po min, když je poloha i mapa (zvířata nejsou podmínka), nebo o 3 s později; v testu jen ťuknutím
  check(timeout = false) {
    if (this.gone || this.hold) return;
    if (Date.now() - this.t0 < this.min) return;
    if (timeout || (this.done.gps && this.done.map)) this.hide();
  }
  hide() {
    if (this.gone) return; this.gone = true;
    [this.runT, this.txtT].forEach(clearInterval); [this.maxT, this.minT].forEach(clearTimeout);
    this.el.classList.add('out');
    setTimeout(() => { this.el.hidden = true; this.el.classList.remove('out'); this.el.innerHTML = ''; }, 450);
    if (this.onDone) this.onDone();
  }
}
