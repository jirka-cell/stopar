// Kreslený vzhled ptáků generovaný z parametrů "look". Vlastní obrázek (sp.image) má přednost.
import { safeImage } from './config.js';
const MARKS = {
  neck: '<path d="M56 100Q80 112 104 100" stroke="#6aa585" stroke-width="4" fill="none"/><ellipse cx="53" cy="92" rx="5" ry="3.5" fill="#fff"/><ellipse cx="107" cy="92" rx="5" ry="3.5" fill="#fff"/>',
  tit: '<ellipse cx="55" cy="88" rx="10" ry="8" fill="#fff"/><ellipse cx="105" cy="88" rx="10" ry="8" fill="#fff"/><rect x="76" y="96" width="8" height="22" rx="4" fill="#1d1d1f"/>',
  bib: '<path d="M70 94Q80 114 90 94Z" fill="#222"/><ellipse cx="55" cy="88" rx="8" ry="6" fill="#ece6da"/><ellipse cx="105" cy="88" rx="8" ry="6" fill="#ece6da"/>',
  collar: '<path d="M45 96Q80 110 115 96" stroke="#fff" stroke-width="3.5" fill="none"/>',
  brow: '<path d="M58 66Q80 59 102 66" stroke="#222" stroke-width="4" fill="none" stroke-linecap="round"/>',
  spots: '<g fill="#8a6440"><ellipse cx="68" cy="104" rx="3" ry="2"/><ellipse cx="92" cy="104" rx="3" ry="2"/><ellipse cx="80" cy="112" rx="3" ry="2"/><ellipse cx="96" cy="112" rx="3" ry="2"/><ellipse cx="64" cy="112" rx="3" ry="2"/></g>',
  kingfisher: '<ellipse cx="54" cy="88" rx="9" ry="6" fill="#f08a24"/><ellipse cx="106" cy="88" rx="9" ry="6" fill="#f08a24"/><ellipse cx="80" cy="100" rx="9" ry="5" fill="#fff"/>'
};

export function birdSVG(look) {
  const d = Object.assign({ body: '#999', wing: '#777', beak: 'small', beakColor: '#f0a53a', feet: '#e0a050', capY: 64 }, look || {});
  const owl = d.mark === 'owl';
  let s = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 160 140">';
  s += '<ellipse cx="80" cy="128" rx="24" ry="5" fill="rgba(0,0,0,.12)"/>';
  s += `<ellipse cx="42" cy="88" rx="11" ry="21" fill="${d.wing}" transform="rotate(15 42 88)"/><ellipse cx="118" cy="88" rx="11" ry="21" fill="${d.wing}" transform="rotate(-15 118 88)"/>`;
  if (d.crest === 'spikes') s += `<path d="M58 52L64 30L72 46L80 24L88 46L96 30L102 52Z" fill="${d.crestColor || '#e53935'}"/>`;
  if (d.crest === 'plume') s += `<path d="M86 46Q112 32 128 40Q110 44 90 54Z" fill="${d.crestColor || '#222'}"/>`;
  s += `<circle cx="80" cy="82" r="38" fill="${d.body}"/>`;
  if (d.cap) s += `<path d="M42 80A38 38 0 0 1 118 80Q80 ${Number(d.capY) || 64} 42 80Z" fill="${d.cap}"/>`;
  if (d.belly) s += `<ellipse cx="80" cy="102" rx="25" ry="17" fill="${d.belly}"/>`;
  if (owl) s += `<ellipse cx="80" cy="80" rx="30" ry="23" fill="${shade(d.body, 1.4)}"/>`;
  if (MARKS[d.mark]) s += MARKS[d.mark];
  if (owl) {
    s += '<circle cx="67" cy="79" r="11" fill="#2b1d12"/><circle cx="93" cy="79" r="11" fill="#2b1d12"/><circle cx="70" cy="75" r="3" fill="#fff"/><circle cx="96" cy="75" r="3" fill="#fff"/>';
  } else {
    const rg = d.ring ? ` stroke="${d.ring}" stroke-width="3"` : '';
    s += `<circle cx="67" cy="79" r="9" fill="#fff"${rg}/><circle cx="93" cy="79" r="9" fill="#fff"${rg}/><circle cx="68.5" cy="80.5" r="4.6" fill="#1c1c1e"/><circle cx="94.5" cy="80.5" r="4.6" fill="#1c1c1e"/><circle cx="70.5" cy="78" r="1.8" fill="#fff"/><circle cx="96.5" cy="78" r="1.8" fill="#fff"/>`;
  }
  const bc = d.beakColor;
  if (d.beak === 'long') s += `<path d="M75 89H85L80 112Z" fill="${bc}"/>`;
  else if (d.beak === 'flat') s += `<ellipse cx="80" cy="94" rx="11" ry="5.5" fill="${bc}"/>`;
  else if (d.beak === 'hook') s += `<path d="M74 88H86L85 95Q82 101 79 99L76 95Z" fill="${bc}"/>`;
  else s += `<path d="M75 89H85L80 98Z" fill="${bc}"/>`;
  s += '<ellipse cx="54" cy="98" rx="6" ry="3" fill="#ff8a9a" opacity=".55"/><ellipse cx="106" cy="98" rx="6" ry="3" fill="#ff8a9a" opacity=".55"/>';
  s += `<path d="M70 118L66 126M90 118L94 126" stroke="${d.feet}" stroke-width="3" stroke-linecap="round"/>`;
  return s + '</svg>';
}

function shade(hex, k) {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex || '');
  if (!m) return hex;
  const n = parseInt(m[1], 16);
  const c = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map(v => Math.min(255, Math.round(v * k)));
  return '#' + c.map(v => v.toString(16).padStart(2, '0')).join('');
}

const cache = new Map();
// URL obrázku druhu (vlastní obrázek nebo vygenerované SVG)
export function birdURL(sp) {
  if (safeImage(sp.image)) return sp.image;
  const key = sp.id + JSON.stringify(sp.look);
  if (!cache.has(key)) cache.set(key, 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(birdSVG(sp.look)));
  return cache.get(key);
}
export function birdImg(sp, cls = '') {
  return `<img class="${cls}" src="${birdURL(sp)}" alt="${(sp.name || '').replace(/"/g, '')}" draggable="false">`;
}
