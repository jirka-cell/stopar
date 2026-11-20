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

// Zástupné obrázky pro skupiny, které kreslený vzhled neumí (do doby, než budou ilustrace z kroku 2.6)
const GROUP_ICON = {
  'Savci': ['#8a5a36', '<ellipse cx="80" cy="88" rx="26" ry="22"/><ellipse cx="50" cy="56" rx="10" ry="13"/><ellipse cx="70" cy="42" rx="10" ry="13"/><ellipse cx="92" cy="42" rx="10" ry="13"/><ellipse cx="112" cy="56" rx="10" ry="13"/>'],
  'Ryby': ['#3a86c8', '<ellipse cx="74" cy="72" rx="44" ry="24"/><path d="M114 72L146 48V96Z"/><circle cx="52" cy="66" r="5" fill="#fff"/><circle cx="52" cy="66" r="2.5" fill="#123"/>'],
  'Obojživelníci': ['#4f9a3a', '<ellipse cx="80" cy="80" rx="40" ry="26"/><circle cx="62" cy="54" r="12"/><circle cx="98" cy="54" r="12"/><circle cx="62" cy="52" r="5" fill="#fff"/><circle cx="98" cy="52" r="5" fill="#fff"/><path d="M42 96L24 116M118 96L136 116" stroke="#4f9a3a" stroke-width="9" stroke-linecap="round"/>'],
  'Plazi': ['#7d8a3a', '<path d="M30 92C50 60 90 100 120 70C130 60 140 58 148 62" fill="none" stroke="#7d8a3a" stroke-width="16" stroke-linecap="round"/><path d="M58 84L48 104M70 84L82 102M104 80L96 60M116 74L128 92" stroke="#7d8a3a" stroke-width="7" stroke-linecap="round"/>'],
  'Hmyz': ['#e0802a', '<ellipse cx="54" cy="56" rx="26" ry="20"/><ellipse cx="106" cy="56" rx="26" ry="20"/><ellipse cx="60" cy="92" rx="18" ry="14"/><ellipse cx="100" cy="92" rx="18" ry="14"/><rect x="74" y="40" width="12" height="70" rx="6" fill="#3a2a1e"/>'],
  'Pavoukovci': ['#5a4a3a', '<circle cx="80" cy="74" r="20"/><circle cx="80" cy="48" r="12"/><path d="M62 66L30 46M62 74L26 74M62 82L30 104M66 90L44 120M98 66L130 46M98 74L134 74M98 82L130 104M94 90L116 120" stroke="#5a4a3a" stroke-width="5" stroke-linecap="round"/>'],
  'Měkkýši': ['#b07a4a', '<path d="M24 104H130C140 104 146 96 140 90L120 84" fill="#d9b88a"/><circle cx="84" cy="70" r="30"/><path d="M84 70m-18 0a18 18 0 1 0 18 -18a10 10 0 1 0 6 10" fill="none" stroke="#7a4f2a" stroke-width="4"/>'],
  'Ostatní': ['#5f8f5a', '<path d="M40 110C40 50 90 30 130 30C130 80 100 120 40 110Z"/><path d="M40 110L110 50" stroke="#fff" stroke-width="4"/>']
};
function groupSVG(group) {
  const [col, shapes] = GROUP_ICON[group] || GROUP_ICON['Ostatní'];
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 160 140"><ellipse cx="80" cy="128" rx="30" ry="5" fill="rgba(0,0,0,.12)"/><g fill="${col}">${shapes}</g></svg>`;
}

const cache = new Map();
// URL obrázku druhu (vlastní obrázek, kreslený pták, nebo zástupný obrázek skupiny)
export function birdURL(sp) {
  if (safeImage(sp.image)) return sp.image;
  const bird = !sp.group || sp.group === 'Ptáci';
  const key = sp.id + (bird ? JSON.stringify(sp.look) : '|' + sp.group);
  if (!cache.has(key)) cache.set(key, 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(bird ? birdSVG(sp.look) : groupSVG(sp.group)));
  return cache.get(key);
}
export function birdImg(sp, cls = '') {
  return `<img class="${cls}" src="${birdURL(sp)}" alt="${(sp.name || '').replace(/"/g, '')}" draggable="false">`;
}
