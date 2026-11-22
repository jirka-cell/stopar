// Pes průvodce Aegon (maďarský ohař s růžovými brýlemi) v rohu mapy.
// Základ: sedí zepředu, občas se rozhlédne, zívne, podrbe se nebo zavrtí ocasem. Když se něco stane, zareaguje a zase si sedne.
// Obrázky images/dog/{póza}.webp (seznam v js/images.js). Pózy, které ještě nejsou nakreslené, nahradí nejbližší hotová.
import { DOG_IMAGES } from './images.js';

export const POSES = ['sit', 'lookL', 'lookR', 'sad', 'stand', 'walk1', 'walk2', 'point', 'sniff', 'joy', 'jump', 'lie', 'sleep'];
const SIDE = ['stand', 'walk1', 'walk2', 'point', 'sniff', 'sniff2', 'joy', 'jump', 'lie', 'sleep']; // z boku hlavou doprava, doleva zrcadlem
const FRONT = ['sit', 'lookL', 'lookR', 'sad', 'yawn1', 'yawn', 'scratch', 'scratch2', 'wag'];

// Která hotová póza se ukáže a zda zrcadlit (dir < 0 = doleva)
export function realPose(pose, dir = 1, frame = 0) {
  if (DOG_IMAGES.has(pose)) return { src: pose, flip: dir < 0 && SIDE.includes(pose) };
  if (pose === 'lookL') return { src: 'lookR', flip: true };
  if (pose === 'point' || pose === 'sniff') return { src: 'lookR', flip: dir < 0 }; // dívá se ke zvířeti
  if ((pose === 'joy' || pose === 'jump') && DOG_IMAGES.has('wag')) return { src: frame % 2 ? 'wag' : 'sit', flip: false }; // radost = vrtí ocasem
  return { src: 'sit', flip: false };
}
export const dogURL = pose => 'images/dog/' + realPose(pose).src + '.webp';

// Rozhodnutí, co pes dělá: událost (radost, skok, smutek) má přednost, pak okolí, nakonec odpočinek
export function dogPose(ctx) {
  if (ctx.event && ctx.now < ctx.eventUntil) return { pose: ctx.event, dir: ctx.dir };
  if (ctx.inRange) return { pose: 'point', dir: ctx.dir };
  if (ctx.near) return { pose: 'sniff', dir: ctx.dir };
  if (ctx.walking) return { pose: 'walk', dir: 1 };
  const sleepAfter = ctx.sleepMs * (ctx.night ? 0.5 : 1);
  if (ctx.idleMs > sleepAfter) return { pose: 'sleep', dir: 1 };
  if (ctx.idleMs > ctx.lieMs * (ctx.night ? 0.5 : 1)) return { pose: 'lie', dir: 1 };
  return { pose: 'sit', dir: 1 };
}

// Klidové chvilky vsedě: [póza, počet kroků po 350 ms]; nabízí se jen ty, jejichž obrázky existují
const IDLE = {
  lookL: [['lookL', 6]], lookR: [['lookR', 6]],
  yawn: [['yawn1', 1], ['yawn', 4], ['yawn1', 1]],
  scratch: [['scratch', 1], ['scratch2', 1], ['scratch', 1], ['scratch2', 1], ['scratch', 1], ['scratch2', 1]],
  wag: [['wag', 1], ['sit', 1], ['wag', 1], ['sit', 1], ['wag', 1]]
};
const hasImg = p => DOG_IMAGES.has(p) || (p === 'lookL' && DOG_IMAGES.has('lookR'));
export const idleChoices = () => Object.keys(IDLE).filter(k => IDLE[k].every(([p]) => p === 'sit' || hasImg(p)));

export class Dog {
  constructor(el, cfg) { this.el = el; this.cfg = cfg; this.img = el.querySelector('img'); this.event = ''; this.eventUntil = 0; this.cur = ''; this.frame = 0; this.look = 'sit'; this.t = 0; this.idle = []; this.demo = 0; this.el.classList.add('real'); }
  // radost (úlovek), skok (nový druh), smutek (zvíře uteklo) – na pár sekund, pak zase sedne
  react(event, ms = 3000) { this.event = event; this.eventUntil = Date.now() + ms; this.render(); }
  update(ctx) { this.ctx = ctx; this.render(); }
  // kontrolní smyčka: všechny klidové chvilky dokola, nic jiného
  setDemo(on) { this.demo = on ? 1 : 0; this.idle = []; this.look = 'sit'; this.render(); }
  render() {
    if (!this.ctx) return;
    const now = Date.now();
    let pose = this.look, dir = 1;
    if (!this.demo) {
      const p = dogPose({ ...this.ctx, event: this.event, eventUntil: this.eventUntil, now, sleepMs: this.cfg.dog.sleepMinutes * 60000, lieMs: this.cfg.dog.lieMinutes * 60000 });
      dir = p.dir; pose = p.pose === 'sit' ? this.look : p.pose === 'walk' ? (this.frame % 2 ? 'walk2' : 'walk1') : p.pose;
      if (p.pose !== 'sit') this.idle = [];
    }
    const { src, flip } = realPose(pose, dir, this.frame);
    this.el.classList.toggle('flip', flip);
    this.el.dataset.pose = pose;
    const key = src + (flip ? '~' : '');
    if (key !== this.cur) {
      if (this.cur && FRONT.includes(this.cur.replace('~', '')) && FRONT.includes(src)) { // plynulé prolnutí mezi snímky vsedě, bez poskočení
        let prev = this.el.querySelector('img.dogfade'); if (!prev) { prev = document.createElement('img'); prev.className = 'dogfade'; prev.alt = ''; prev.draggable = false; this.el.insertBefore(prev, this.img.nextSibling); }
        prev.style.transition = 'none'; prev.src = this.img.src; prev.style.transform = getComputedStyle(this.img).transform; prev.style.opacity = '1'; void prev.offsetWidth; prev.style.transition = ''; prev.style.opacity = '0';
      } else { this.el.classList.remove('hop'); void this.el.offsetWidth; this.el.classList.add('hop'); }
      this.cur = key; this.img.src = 'images/dog/' + src + '.webp';
    }
  }
  // klidové chvilky vsedě (v kontrolní smyčce všechny po řadě)
  start() {
    this.t = setInterval(() => {
      this.frame++;
      if (this.idle.length) { const step = this.idle[0]; this.look = step[0]; if (--step[1] <= 0) this.idle.shift(); }
      else if (this.look !== 'sit') this.look = 'sit';
      else if (this.demo) { const ch = idleChoices(); if (ch.length) { this.idle = [['sit', 3], ...IDLE[ch[this.demo % ch.length]].map(s => s.slice())]; this.demo++; } }
      else if (this.frame % 12 === 0 && Math.random() < 0.7) { const ch = idleChoices(), k = ch[Math.floor(Math.random() * ch.length)]; if (k) this.idle = IDLE[k].map(s => s.slice()); }
      this.render();
    }, 350);
  }
  stop() { clearInterval(this.t); }
}
