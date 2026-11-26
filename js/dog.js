// Pes průvodce Aegon (maďarský ohař s růžovými brýlemi) v rohu mapy.
// Základ: sedí zepředu, občas se rozhlédne, zívne, podrbe se nebo zavrtí ocasem. Když se něco stane, zareaguje a zase si sedne.
// Obrázky images/dog/{póza}.webp (seznam v js/images.js). Pózy, které ještě nejsou nakreslené, nahradí nejbližší hotová.
import { DOG_IMAGES } from './images.js';

export const POSES = ['sit', 'lookL', 'lookR', 'sad', 'stand', 'walk1', 'walk2', 'point', 'sniff', 'joy', 'jump', 'lie', 'sleep'];
const SIDE = ['stand', 'walk1', 'walk1b', 'walk2', 'walk2b', 'point', 'sniff', 'sniff2', 'joy', 'joy2', 'jump', 'lie', 'sleep', 'sleep2', 'run1', 'run2', 'offline', 'car1', 'car2']; // z boku hlavou doprava, doleva zrcadlem
// Cvičák: Aegon s kamarádkou Hestiá (fenka československého vlčáka), každý čtvrtek 17:30–18:15 podle hodin telefonu
const DUO = ['cvicak-sedi', 'cvicak-lezi', 'cvicak-beh1', 'cvicak-beh2', 'cvicak-aport', 'cvicak-skok', 'cvicak-hra1', 'cvicak-hra2'];
const DRILL = [['cvicak-sedi', 14], ['beh', 14], ['cvicak-lezi', 14], ['cvicak-aport', 12], ['cvicak-skok', 6], ['hra', 14]]; // [póza, kroků po 350 ms]
const DRILL_LEN = DRILL.reduce((a, d) => a + d[1], 0);
export const DRILL_TOPICS = ['aport', 'skok přes překážku', 'sedni a lehni', 'chůzi u nohy', 'přivolání', 'přetahování'];
export const drillNow = (d = new Date()) => { const m = d.getHours() * 60 + d.getMinutes(); return d.getDay() === 4 && m >= 17 * 60 + 30 && m < 18 * 60 + 15; };
export function drillPose(frame) {
  let i = frame % DRILL_LEN, k = 0;
  while (i >= DRILL[k][1]) i -= DRILL[k++][1];
  const p = DRILL[k][0];
  return p === 'beh' ? (frame % 2 ? 'cvicak-beh2' : 'cvicak-beh1') : p === 'hra' ? (Math.floor(frame / 2) % 2 ? 'cvicak-hra2' : 'cvicak-hra1') : p;
}
const FRONT = ['sit', 'lookL', 'lookR', 'sad', 'yawn1', 'yawn', 'scratch', 'scratch2', 'wag', 'think', 'cone', 'pant', 'pant2', 'cold', 'shake', 'shake2', 'night', 'wave', 'trophy'];
// když obrázek chybí, nejbližší náhrada (řetězí se až k sit)
const FALLBACK = { run1: 'walk1', run2: 'walk2', walk1b: 'walk1', walk2b: 'walk2', joy2: 'joy', sleep2: 'sleep', car1: 'stand', car2: 'car1', pant2: 'pant', shake2: 'shake', cone: 'wag', wave: 'wag', trophy: 'wag', offline: 'lie' };

// Která hotová póza se ukáže a zda zrcadlit (dir < 0 = doleva)
export function realPose(pose, dir = 1, frame = 0) {
  for (let p = pose, i = 0; p && i < 5; p = FALLBACK[p], i++) if (DOG_IMAGES.has(p)) return { src: p, flip: dir < 0 && SIDE.includes(p) && !p.startsWith('car') };
  if (pose === 'lookL') return { src: 'lookR', flip: true };
  if (pose === 'point' || pose === 'sniff') return { src: 'lookR', flip: dir < 0 }; // dívá se ke zvířeti
  if ((pose === 'joy' || pose === 'jump') && DOG_IMAGES.has('wag')) return { src: frame % 2 ? 'wag' : 'sit', flip: false }; // radost = vrtí ocasem
  return { src: 'sit', flip: false };
}
export const dogURL = pose => 'images/dog/' + realPose(pose).src + '.webp';

// Rozhodnutí, co pes dělá: událost má přednost, pak pohyb a okolí, nakonec odpočinek
export function dogPose(ctx) {
  if (ctx.event && ctx.now < ctx.eventUntil) return { pose: ctx.event, dir: ctx.dir };
  if (ctx.speed > 7) return { pose: 'car', dir: 1 }; // nad ~25 km/h jede autem
  if (ctx.inRange) return { pose: 'point', dir: ctx.dir };
  if (ctx.drill && DOG_IMAGES.has('cvicak-sedi')) return { pose: 'drill', dir: 1 }; // na cvičáku; jen zvíře v dosahu focení ho přeruší (Aegon odběhne a vystaví)
  if (ctx.near) return { pose: 'sniff', dir: ctx.dir };
  if (ctx.walking) return { pose: ctx.speed > 2 ? 'run' : 'walk', dir: 1 };
  const sleepAfter = ctx.sleepMs * (ctx.night ? 0.5 : 1);
  if (ctx.idleMs > sleepAfter) return { pose: 'sleep', dir: 1 };
  if (ctx.idleMs > ctx.lieMs * (ctx.night ? 0.5 : 1)) return { pose: ctx.offline ? 'offline' : 'lie', dir: 1 };
  if (ctx.busy) return { pose: 'think', dir: 1 };
  if (ctx.offline) return { pose: 'offline', dir: 1 };
  return { pose: 'sit', dir: 1 };
}
// Vsedě podle počasí a denní doby: v noci čelovka, v zimě šála, v horku funí (klidové chvilky pak nejsou)
export function sitMood(ctx = {}) {
  if (ctx.night && DOG_IMAGES.has('night')) return 'night';
  if ((ctx.weather === 'snow' || ctx.weather === 'cold') && DOG_IMAGES.has('cold')) return 'cold';
  if (ctx.weather === 'hot' && DOG_IMAGES.has('pant')) return 'pant';
  return '';
}

// Klidové chvilky vsedě: [póza, počet kroků po 350 ms]; nabízí se jen ty, jejichž obrázky existují
const IDLE = {
  lookL: [['lookL', 6]], lookR: [['lookR', 6]],
  yawn: [['yawn1', 1], ['yawn', 4], ['yawn1', 1]],
  scratch: [['scratch', 1], ['scratch2', 1], ['scratch', 1], ['scratch2', 1], ['scratch', 1], ['scratch2', 1]],
  wag: [['wag', 1], ['sit', 1], ['wag', 1], ['sit', 1], ['wag', 1]],
  shake: [['shake', 1], ['shake2', 1], ['shake', 1], ['shake2', 1], ['shake', 1], ['shake2', 1]] // jen v dešti
};
const hasImg = p => DOG_IMAGES.has(p) || (p === 'lookL' && DOG_IMAGES.has('lookR'));
export const idleChoices = (ctx = {}) => Object.keys(IDLE).filter(k => (k !== 'shake' || ctx.weather === 'rain') && IDLE[k].every(([p]) => p === 'sit' || hasImg(p)));
const WALK4 = ['walk1', 'walk1b', 'walk2', 'walk2b'];

export class Dog {
  constructor(el, cfg) { this.el = el; this.cfg = cfg; this.img = el.querySelector('img'); this.event = ''; this.eventUntil = 0; this.cur = ''; this.frame = 0; this.look = 'sit'; this.t = 0; this.idle = []; this.demo = 0; this.el.classList.add('real'); }
  // radost (úlovek), skok (nový druh), smutek (zvíře uteklo), šiška, pohár, mávání – na pár sekund, pak zase sedne
  react(event, ms = 3000) { this.event = event; this.eventUntil = Date.now() + ms; this.render(); }
  update(ctx) { this.ctx = ctx; this.render(); }
  // kontrolní smyčka: všechny klidové chvilky dokola, nic jiného
  setDemo(on) { this.demo = on ? 1 : 0; this.idle = []; this.look = 'sit'; this.render(); }
  render() {
    if (!this.ctx) return;
    const now = Date.now(), f = this.frame;
    let pose = this.look, dir = 1;
    if (this.rand) { pose = this.randPose || 'sit'; dir = this.randDir || 1; }
    else if (!this.demo) {
      const p = dogPose({ ...this.ctx, drill: this.ctx.drill || this.drillTest || drillNow(), event: this.event, eventUntil: this.eventUntil, now, sleepMs: this.cfg.dog.sleepMinutes * 60000, lieMs: this.cfg.dog.lieMinutes * 60000 });
      dir = p.dir; pose = p.pose;
      const mood = pose === 'sit' && sitMood(this.ctx);
      if (mood) { this.idle = []; pose = mood === 'pant' && Math.floor(f / 2) % 2 ? 'pant2' : mood; }
      else if (pose === 'sit') pose = this.look;
      else this.idle = [];
      if (pose === 'drill') pose = drillPose(f);
      if (pose === 'walk') pose = DOG_IMAGES.has('walk1b') ? WALK4[f % 4] : (f % 2 ? 'walk2' : 'walk1');
      if (pose === 'run') pose = f % 2 ? 'run2' : 'run1';
      if (pose === 'car') pose = Math.floor(f / 2) % 2 ? 'car2' : 'car1';
      if (pose === 'sniff' && DOG_IMAGES.has('sniff2') && Math.floor(f / 2) % 2) pose = 'sniff2'; // čenichá krok za krokem
      if (pose === 'jump' && now > this.eventUntil - 1500) pose = 'joy'; // po skoku radost
      if (pose === 'joy' && DOG_IMAGES.has('joy2') && f % 2) pose = 'joy2';
      if (pose === 'sleep' && DOG_IMAGES.has('sleep2') && Math.floor(f / 4) % 2) pose = 'sleep2'; // dýchá ve spánku
    }
    const { src, flip } = realPose(pose, dir, f), oldT = getComputedStyle(this.img).transform; // natočení starého snímku ještě před přepnutím zrcadla
    this.el.classList.toggle('flip', flip);
    this.el.classList.toggle('side', SIDE.includes(src) || DUO.includes(src)); // z boku je rámeček na šířku
    this.el.dataset.pose = pose;
    const key = src + (flip ? '~' : '');
    if (key !== this.cur) {
      const old = this.cur.replace('~', ''), base = s => s.replace(/\d?b?$/, ''), cycle = old && base(old) === base(src) && /\d|b$/.test(old + src) && !/^(sit|yawn)/.test(src);
      const same = old && ((FRONT.includes(old) && FRONT.includes(src)) || (SIDE.includes(old) && SIDE.includes(src)) || (DUO.includes(old) && DUO.includes(src)));
      if (cycle) { /* chůze, běh, auto, čenichání…: snímky jen přepnout – prolnutí by rozmazalo nohy */ }
      else if (same) { // plynulé prolnutí mezi snímky ve stejném pohledu, bez poskočení
        let prev = this.el.querySelector('img.dogfade'); if (!prev) { prev = document.createElement('img'); prev.className = 'dogfade'; prev.alt = ''; prev.draggable = false; this.el.insertBefore(prev, this.img.nextSibling); }
        prev.style.transition = 'none'; prev.src = this.img.src; prev.style.transform = oldT; prev.style.opacity = '1'; void prev.offsetWidth; prev.style.transition = ''; prev.style.opacity = '0';
      } else { this.el.classList.remove('hop'); void this.el.offsetWidth; this.el.classList.add('hop'); }
      this.cur = key; this.img.src = 'images/dog/' + src + '.webp';
    }
  }
  // klidové chvilky vsedě (v kontrolní smyčce všechny po řadě)
  start() {
    this.t = setInterval(() => {
      this.frame++;
      if (this.rand && this.frame % 8 === 1) { const all = [...DOG_IMAGES].filter(p => p !== 'portrait'); this.randPose = all[Math.floor(Math.random() * all.length)]; this.randDir = Math.random() < 0.5 ? -1 : 1; } // náhodná smyčka: nová póza po ~3 s
      const ch = idleChoices(this.ctx || {});
      if (this.idle.length) { const step = this.idle[0]; this.look = step[0]; if (--step[1] <= 0) this.idle.shift(); }
      else if (this.look !== 'sit') this.look = 'sit';
      else if (this.demo) { if (ch.length) { this.idle = [['sit', 3], ...IDLE[ch[this.demo % ch.length]].map(s => s.slice())]; this.demo++; } }
      else if (this.frame % 12 === 0 && Math.random() < 0.7) { const k = ch[Math.floor(Math.random() * ch.length)]; if (k) this.idle = IDLE[k].map(s => s.slice()); }
      this.render();
    }, 350);
  }
  stop() { clearInterval(this.t); }
}
