// Pes průvodce Aegon (maďarský ohař s růžovými brýlemi) v rohu mapy.
// Základ: sedí zepředu, občas se podívá doleva/doprava. Když se něco stane, vstane, provede činnost a zase si sedne.
// Zástupná kresba; vlastní obrázky images/dog/{póza}.webp mají přednost (seznam v js/images.js).
import { DOG_IMAGES } from './images.js';

const C = '#c8743a', D = '#a85a2a', L = '#e09a62', G = '#ff6fae', N = '#7a3a2a';
const glasses = (x, y, s = 1) => `<g transform="translate(${x} ${y}) scale(${s})"><rect x="-17" y="-5" width="14" height="10" rx="4" fill="${G}" stroke="#c23b7f" stroke-width="1.5"/><rect x="3" y="-5" width="14" height="10" rx="4" fill="${G}" stroke="#c23b7f" stroke-width="1.5"/><path d="M-3 -1h6" stroke="#c23b7f" stroke-width="2"/><rect x="-14" y="-3" width="4" height="2" rx="1" fill="#fff" opacity=".7"/><rect x="6" y="-3" width="4" height="2" rx="1" fill="#fff" opacity=".7"/></g>`;
const glassesSide = (x, y) => `<g><rect x="${x}" y="${y}" width="15" height="9" rx="4" fill="${G}" stroke="#c23b7f" stroke-width="1.5"/><path d="M${x} ${y + 3}l-7 -1" stroke="#c23b7f" stroke-width="2"/><rect x="${x + 3}" y="${y + 2}" width="4" height="2" rx="1" fill="#fff" opacity=".7"/></g>`;
const splash = () => `<g opacity=".55"><circle cx="20" cy="30" r="9" fill="#7ec8e3"/><circle cx="122" cy="22" r="7" fill="#ffb347"/><circle cx="30" cy="88" r="6" fill="#b39ddb"/><circle cx="118" cy="80" r="8" fill="#81c784"/></g>`;

// Zepředu vsedě; look = −1 vlevo, 0 rovně, 1 vpravo; mood: '' | 'sad'
function front(look = 0, mood = '') {
  const h = look * 6, earDrop = mood === 'sad' ? 8 : 0, headY = mood === 'sad' ? 46 : 40;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 140 120"><ellipse cx="70" cy="114" rx="36" ry="5" fill="rgba(0,0,0,.15)"/>
  <ellipse cx="70" cy="100" rx="34" ry="14" fill="${C}"/><ellipse cx="70" cy="78" rx="22" ry="28" fill="${C}"/><ellipse cx="70" cy="84" rx="12" ry="18" fill="${L}"/>
  <rect x="56" y="86" width="10" height="26" rx="5" fill="${C}"/><rect x="74" y="86" width="10" height="26" rx="5" fill="${C}"/>
  <ellipse cx="61" cy="111" rx="7" ry="4" fill="${L}"/><ellipse cx="79" cy="111" rx="7" ry="4" fill="${L}"/>
  <g transform="translate(${h} 0)"><ellipse cx="${48 - h * .3}" cy="${headY + 6 + earDrop}" rx="8" ry="16" fill="${D}" transform="rotate(${12 + earDrop} ${48 - h * .3} ${headY + 6})"/><ellipse cx="${92 - h * .3}" cy="${headY + 6 + earDrop}" rx="8" ry="16" fill="${D}" transform="rotate(${-12 - earDrop} ${92 - h * .3} ${headY + 6})"/>
  <ellipse cx="70" cy="${headY}" rx="22" ry="20" fill="${C}"/><ellipse cx="${70 + h * .3}" cy="${headY + 12}" rx="12" ry="9" fill="${L}"/>
  <ellipse cx="${70 + h * .5}" cy="${headY + 8}" rx="5" ry="3.5" fill="${N}"/>
  ${mood === 'sad' ? `<path d="M${64 + h * .4} ${headY + 17}q6 -4 12 0" stroke="${N}" stroke-width="2" fill="none"/>` : `<path d="M${64 + h * .4} ${headY + 14}q6 5 12 0" stroke="${N}" stroke-width="2" fill="none"/>`}
  ${glasses(70 + h * .4, headY - 4)}</g></svg>`;
}
// Z boku (hlavou doprava); pose: stand | walk1 | walk2 | point | sniff | joy | jump | lie | sleep
function side(pose) {
  const lie = pose === 'lie' || pose === 'sleep', sniff = pose === 'sniff', jump = pose === 'jump';
  const by = lie ? 84 : 62, hx = lie ? 112 : 110, hy = lie ? 74 : sniff ? 74 : pose === 'point' ? 40 : 38;
  const tail = pose === 'point' ? 'M30 58L6 54' : pose === 'joy' || jump ? 'M30 56Q14 40 18 22' : lie ? 'M30 84Q14 88 8 82' : 'M30 58Q14 52 10 40';
  let legs = '';
  if (lie) legs = `<rect x="84" y="88" width="30" height="8" rx="4" fill="${C}"/><rect x="40" y="88" width="26" height="8" rx="4" fill="${C}"/>`;
  else {
    const L4 = pose === 'walk1' ? [[44, -10], [58, 10], [82, 10], [96, -10]] : pose === 'walk2' ? [[44, 10], [58, -10], [82, -10], [96, 10]] : [[44, 0], [58, 0], [82, 0], [96, 0]];
    legs = L4.map(([x, a], i) => (pose === 'point' && i === 3) ? `<path d="M${x} ${by + 8}l8 10l-6 6" stroke="${C}" stroke-width="9" stroke-linecap="round" fill="none"/>`
      : `<rect x="${x - 4.5}" y="${by + 6}" width="9" height="30" rx="4.5" fill="${C}" transform="rotate(${a} ${x} ${by + 6})"/>`).join('');
  }
  const eyes = glassesSide(hx + 2, hy - 8); // brýle má Aegon na všech snímcích
  const g = `${legs}<path d="${tail}" stroke="${C}" stroke-width="7" stroke-linecap="round" fill="none"/>
  <ellipse cx="70" cy="${by}" rx="40" ry="${lie ? 12 : 16}" fill="${C}"/><ellipse cx="74" cy="${by + 6}" rx="26" ry="8" fill="${L}" opacity=".7"/>
  ${lie ? '' : `<path d="M98 ${by - 6}L${hx - 6} ${hy + 6}L${hx + 4} ${hy + 12}L106 ${by + 4}Z" fill="${C}"/>`}
  <ellipse cx="${hx}" cy="${hy}" rx="16" ry="13" fill="${C}"/><ellipse cx="${hx + 13}" cy="${hy + 5}" rx="11" ry="7" fill="${L}"/>
  <circle cx="${hx + 23}" cy="${hy + 3}" r="3.5" fill="${N}"/><ellipse cx="${hx - 5}" cy="${hy + 6}" rx="6" ry="12" fill="${D}" transform="rotate(${pose === 'joy' || jump ? -20 : 8} ${hx - 5} ${hy})"/>
  ${eyes}${pose === 'joy' || jump ? `<path d="M${hx + 14} ${hy + 10}q2 8 6 2" fill="#ff7b8a"/>` : ''}
  ${pose === 'sleep' ? `<path d="M${hx + 2} ${hy - 3}q5 3 10 0" stroke="${N}" stroke-width="2" fill="none"/><text x="${hx - 4}" y="${hy - 22}" font-size="16" font-weight="700" fill="#5a6a8a">Zzz</text>` : ''}
  ${sniff ? `<text x="${hx + 24}" y="${hy - 4}" font-size="12" fill="#7a6a5a">···</text>` : ''}`;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 140 120">${jump ? splash() : ''}<ellipse cx="70" cy="114" rx="40" ry="5" fill="rgba(0,0,0,.15)"/><g${jump ? ' transform="translate(0 -14) rotate(-12 70 70)"' : ''}>${g}</g></svg>`;
}

export const POSES = ['sit', 'lookL', 'lookR', 'sad', 'stand', 'walk1', 'walk2', 'point', 'sniff', 'joy', 'jump', 'lie', 'sleep'];
const cache = new Map();
export function dogURL(pose) {
  if (DOG_IMAGES.has(pose)) return 'images/dog/' + pose + '.webp';
  if (!cache.has(pose)) {
    const svg = pose === 'sit' ? front(0) : pose === 'lookL' ? front(-1) : pose === 'lookR' ? front(1) : pose === 'sad' ? front(0, 'sad') : side(pose);
    cache.set(pose, 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg));
  }
  return cache.get(pose);
}

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
const FRONT = ['sit', 'lookL', 'lookR', 'sad', 'yawn1', 'yawn', 'scratch', 'scratch2', 'wag'];

export class Dog {
  constructor(el, cfg) { this.el = el; this.cfg = cfg; this.img = el.querySelector('img'); this.event = ''; this.eventUntil = 0; this.dir = 1; this.cur = ''; this.frame = 0; this.look = 'sit'; this.t = 0; this.idle = []; this.el.classList.toggle('real', DOG_IMAGES.has('sit')); }
  // radost (úlovek), skok (nový druh), smutek (zvíře uteklo) – na pár sekund, pak zase sedne
  react(event, ms = 3000) { this.event = event; this.eventUntil = Date.now() + ms; this.render(); }
  update(ctx) { this.ctx = ctx; this.render(); }
  render() {
    if (!this.ctx) return;
    const now = Date.now(), p = dogPose({ ...this.ctx, event: this.event, eventUntil: this.eventUntil, now, sleepMs: this.cfg.dog.sleepMinutes * 60000, lieMs: this.cfg.dog.lieMinutes * 60000 });
    let pose = p.pose;
    if (pose === 'walk') pose = this.frame % 2 ? 'walk2' : 'walk1';
    if (pose === 'sit') pose = this.look; else this.idle = [];
    if (pose === 'jump' && now > this.eventUntil - 1500) pose = 'joy';
    if (pose === 'joy' && !DOG_IMAGES.has('joy') && DOG_IMAGES.has('wag')) pose = this.frame % 2 ? 'wag' : 'sit'; // než bude radost z boku, vrtí ocasem
    let src = pose, flip = p.dir < 0 && !FRONT.includes(pose);
    if (pose === 'lookL' && !DOG_IMAGES.has('lookL') && DOG_IMAGES.has('lookR')) { src = 'lookR'; flip = true; } // doleva = zrcadlo
    this.el.classList.toggle('flip', flip);
    this.el.dataset.pose = pose;
    if (pose !== this.cur) {
      const both = FRONT.includes(this.cur) && FRONT.includes(pose) && DOG_IMAGES.has(src);
      if (both && this.img.src) { // plynulé prolnutí mezi snímky vsedě, bez poskočení
        let prev = this.el.querySelector('img.prev'); if (!prev) { prev = document.createElement('img'); prev.className = 'prev'; prev.alt = ''; prev.draggable = false; this.el.insertBefore(prev, this.img.nextSibling); }
        prev.style.transition = 'none'; prev.src = this.img.src; prev.style.transform = getComputedStyle(this.img).transform; prev.style.opacity = '1'; void prev.offsetWidth; prev.style.transition = ''; prev.style.opacity = '0';
      } else { this.el.classList.remove('hop'); void this.el.offsetWidth; this.el.classList.add('hop'); }
      this.cur = pose; this.img.src = dogURL(src);
    }
  }
  // animace: kroky při chůzi, občasné rozhlédnutí vsedě
  start() {
    this.t = setInterval(() => {
      this.frame++;
      if (this.idle.length) { const step = this.idle[0]; this.look = step[0]; if (--step[1] <= 0) this.idle.shift(); }
      else if (this.look !== 'sit') this.look = 'sit';
      else if (this.frame % 12 === 0 && Math.random() < 0.7) { const ch = idleChoices(), k = ch.length ? ch[Math.floor(Math.random() * ch.length)] : ''; if (k) this.idle = IDLE[k].map(s => s.slice()); else this.look = ['lookL', 'lookR'][this.frame % 2]; }
      this.render();
    }, 350);
  }
  stop() { clearInterval(this.t); }
}
