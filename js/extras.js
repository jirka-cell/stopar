// Drobnosti: obrázky potravin při krmení, karta výletu (bez polohy), rodinná výprava (týdenní součet přes kódy)
import { esc } from './config.js';
import { hash01 } from './geo.js';

const num = (v, d = 0) => Number.isFinite(Number(v)) ? Number(v) : d;

/* ---------- obrázky potravin ---------- */
const F = {
  zrni: '<ellipse cx="18" cy="26" rx="5" ry="7" fill="#d9a441" transform="rotate(-20 18 26)"/><ellipse cx="30" cy="22" rx="5" ry="7" fill="#e8b84f" transform="rotate(15 30 22)"/><ellipse cx="25" cy="34" rx="5" ry="7" fill="#c99234"/><ellipse cx="36" cy="33" rx="4" ry="6" fill="#e0ad48" transform="rotate(30 36 33)"/>',
  hmyz: '<ellipse cx="24" cy="28" rx="8" ry="11" fill="#3a6a2a"/><circle cx="24" cy="15" r="6" fill="#2b4a1e"/><path d="M16 22l-7-4M16 30l-8 0M16 36l-6 5M32 22l7-4M32 30l8 0M32 36l6 5M21 10l-3-6M27 10l3-6" stroke="#2b2b2b" stroke-width="2" stroke-linecap="round"/>',
  larvy: '<path d="M10 30q6-12 14-4t14-4" stroke="#f0e2c0" stroke-width="9" fill="none" stroke-linecap="round"/><path d="M14 26v6M19 24v6M24 26v6M29 24v6M34 22v6" stroke="#cdb88a" stroke-width="1.5"/><circle cx="38" cy="22" r="3" fill="#8a5a2a"/>',
  zizaly: '<path d="M8 30q8-14 16-2t16-4" stroke="#d98a8a" stroke-width="6" fill="none" stroke-linecap="round"/><path d="M12 38q10-8 22 0" stroke="#c97878" stroke-width="5" fill="none" stroke-linecap="round"/>',
  bobule: '<path d="M24 8v10" stroke="#3a7a2a" stroke-width="2"/><circle cx="18" cy="26" r="7" fill="#c0283a"/><circle cx="30" cy="26" r="7" fill="#d9304a"/><circle cx="24" cy="36" r="7" fill="#b0202f"/><circle cx="16" cy="24" r="2" fill="#fff" opacity=".6"/>',
  ryba: '<ellipse cx="22" cy="26" rx="14" ry="8" fill="#7a9ab8"/><path d="M34 26l10-8v16z" fill="#5a7a98"/><circle cx="14" cy="24" r="2" fill="#1c1c1e"/>',
  hlodavec: '<ellipse cx="26" cy="30" rx="12" ry="9" fill="#9a8466"/><circle cx="15" cy="26" r="7" fill="#9a8466"/><circle cx="13" cy="19" r="3.5" fill="#c9a090"/><circle cx="10" cy="27" r="1.5" fill="#1c1c1e"/><path d="M38 32q6 2 8-4" stroke="#c9a090" stroke-width="2" fill="none"/>',
  rostliny: '<path d="M24 42V20M24 30q-10-4-12-14M24 26q10-4 12-14M24 36q-8-2-10-10M24 34q8-2 12-8" stroke="#3a8a5a" stroke-width="4" fill="none" stroke-linecap="round"/><path d="M8 42q16-6 32 0" stroke="#4fa3d8" stroke-width="3" fill="none"/>',
  listi: '<path d="M12 38q0-24 26-28q-2 26-26 28z" fill="#6ab04a"/><path d="M12 38L34 14" stroke="#3a7a2a" stroke-width="2"/><path d="M30 42V28M34 42v-10M26 42v-8" stroke="#8ac05a" stroke-width="3" stroke-linecap="round"/>',
  orisky: '<ellipse cx="18" cy="28" rx="7" ry="10" fill="#a8742a"/><path d="M11 22q7-8 14 0z" fill="#6a4a2a"/><circle cx="32" cy="30" r="9" fill="#c99a5a"/><path d="M26 26q6-6 12 0" stroke="#8a5a2a" stroke-width="2" fill="none"/>',
  nektar: '<g transform="translate(24 24)"><circle r="5" fill="#f2c21b"/>' + [0, 72, 144, 216, 288].map(a => `<ellipse cx="0" cy="-11" rx="6" ry="8" fill="#f48fb1" transform="rotate(${a})"/>`).join('') + '<circle r="5" fill="#f2c21b"/></g>',
  slimaci: '<path d="M8 36h26q8 0 8-6" stroke="#b07a4a" stroke-width="7" fill="none" stroke-linecap="round"/><circle cx="26" cy="26" r="9" fill="#c49a5a"/><path d="M26 26m-5 0a5 5 0 1 0 5 -5" stroke="#7a4f2a" stroke-width="2" fill="none"/><path d="M10 34l-3-8M14 34l-1-8" stroke="#b07a4a" stroke-width="2"/>',
  drobotina: '<circle cx="16" cy="22" r="4" fill="#9ad3ff" stroke="#4fa3d8"/><circle cx="30" cy="18" r="3" fill="#9ad3ff" stroke="#4fa3d8"/><path d="M14 34q4-4 8 0t8 0" stroke="#7a5a3a" stroke-width="3" fill="none"/><ellipse cx="32" cy="32" rx="5" ry="3" fill="#6a8a3a"/>',
  zaby: '<ellipse cx="24" cy="30" rx="12" ry="8" fill="#5cb848"/><circle cx="18" cy="21" r="4" fill="#5cb848"/><circle cx="30" cy="21" r="4" fill="#5cb848"/><circle cx="18" cy="20" r="2" fill="#1c1c1e"/><circle cx="30" cy="20" r="2" fill="#1c1c1e"/><path d="M38 38q6 2 6-4" stroke="#4a3a2a" stroke-width="3" fill="none"/><circle cx="40" cy="40" r="3" fill="#4a3a2a"/>',
  rasy: '<path d="M14 42q-6-12 2-20t0-16M24 42q-4-14 4-22t-2-14M34 42q-6-10 2-18t0-14" stroke="#3f9a4a" stroke-width="4" fill="none" stroke-linecap="round"/>',
  drevo: '<rect x="8" y="20" width="32" height="14" rx="7" fill="#8a6a44"/><ellipse cx="40" cy="27" rx="4" ry="7" fill="#c9a77a"/><path d="M14 24q6 4 14 0M16 30q8-3 16 1" stroke="#5e4630" stroke-width="2" fill="none"/><circle cx="20" cy="27" r="2" fill="#6ab04a"/>',
  mleko: '<path d="M18 10h12l2 8v20q0 4-4 4H20q-4 0-4-4V18z" fill="#f6f2ea" stroke="#c9bfae" stroke-width="2"/><path d="M16 22h16" stroke="#8ac0e8" stroke-width="3"/><circle cx="24" cy="31" r="3" fill="#f2c21b"/>',
  korinky: '<path d="M24 8v10M24 18q-8 6-10 18M24 18q8 6 10 18M24 18v22M24 26q-6 4-14 4M24 26q6 4 14 4" stroke="#b08a5a" stroke-width="3" fill="none" stroke-linecap="round"/><path d="M18 8q6-6 12 0" fill="#6ab04a"/>',
  maso: '<path d="M10 30q0-14 16-14t14 12q-2 12-16 12t-14-10z" fill="#c0504a"/><path d="M16 28q8-6 18 0" stroke="#f2d0c8" stroke-width="3" fill="none"/><circle cx="36" cy="22" r="4" fill="#f4ead8"/>'
};
export const foodIcon = id => F[id] ? `<svg viewBox="0 0 48 48" class="ficon" aria-hidden="true">${F[id]}</svg>` : '';
export const hasFoodIcon = id => !!F[id];

/* ---------- karta výletu ---------- */
// Obrázek bez polohy: km, nové druhy a úlovky dne, razítka, tvar trasy bez mapy
export async function tripCardBlob(o) {
  const c = document.createElement('canvas'); c.width = 600; c.height = 820;
  const x = c.getContext('2d');
  x.fillStyle = '#f6f3ec'; x.fillRect(0, 0, 600, 820);
  x.fillStyle = '#2f7d4f'; x.fillRect(0, 0, 600, 80);
  x.fillStyle = '#fff'; x.font = 'bold 32px system-ui, sans-serif'; x.fillText('Stopař – výlet', 24, 52);
  x.font = '20px system-ui, sans-serif'; x.fillText(o.date, 420, 52);
  x.fillStyle = '#24301f'; x.font = 'bold 56px system-ui, sans-serif'; x.fillText(o.km + ' km', 30, 160);
  x.font = '24px system-ui, sans-serif'; x.fillStyle = '#6b7466';
  x.fillText(`${o.catches} úlovků · ${o.newSp} nových druhů · ${o.stamps} razítek`, 30, 200);
  if (o.shape && o.shape.length > 1) { // tvar trasy zmenšený do rámečku, bez souřadnic a podkladu
    const xs = o.shape.map(p => p[1]), ys = o.shape.map(p => p[0]), w = Math.max(...xs) - Math.min(...xs) || 1, h = Math.max(...ys) - Math.min(...ys) || 1, k = Math.min(520 / w, 220 / h);
    x.strokeStyle = '#e2602a'; x.lineWidth = 6; x.lineJoin = x.lineCap = 'round'; x.beginPath();
    o.shape.forEach((p, i) => { const px = 40 + (p[1] - Math.min(...xs)) * k, py = 470 - (p[0] - Math.min(...ys)) * k; i ? x.lineTo(px, py) : x.moveTo(px, py); }); x.stroke();
  }
  const imgs = await Promise.all(o.animals.slice(0, 6).map(a => new Promise(res => { const im = new Image(); im.onload = () => res([im, a.name]); im.onerror = () => res(null); im.src = a.url; })));
  imgs.filter(Boolean).forEach(([im, n], i) => { const cx = 30 + (i % 3) * 190, cy = 500 + Math.floor(i / 3) * 150; try { x.drawImage(im, cx, cy, 170, 120); } catch (e) {} x.fillStyle = '#24301f'; x.font = '18px system-ui, sans-serif'; x.fillText(n.slice(0, 18), cx, cy + 140); });
  return new Promise(res => c.toBlob(res, 'image/png'));
}

/* ---------- rodinná výprava ---------- */
const A = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
const enc = (v, len) => { let s = ''; for (let i = 0; i < len; i++) { s = A[v % 32] + s; v = Math.floor(v / 32); } return s; };
const dec = s => [...s].reduce((v, ch) => { const i = A.indexOf(ch); if (i < 0) throw new Error('bad'); return v * 32 + i; }, 0);
const check = v => Math.imul((v ^ (v >>> 15)) >>> 0, 0x2c1b3c6d) >>> 22;
// týden (číslo od 2026) + desítky metrů (0–9999 = do 99,99 km) + druhy (0–127) → 8 znaků + 2 kontrola
export function weekCode(week, meters, species) {
  const v = ((Math.max(0, Math.min(1023, week)) * 10000 + Math.max(0, Math.min(9999, Math.round(meters / 10)))) * 128) + Math.max(0, Math.min(127, species));
  const s = enc(v, 7) + enc(check(Math.imul(Math.floor(v / 1073741824) + 1, 0x9e3779b1) ^ (v % 1073741824)), 2);
  return s.slice(0, 3) + '-' + s.slice(3, 6) + '-' + s.slice(6);
}
export function readWeekCode(code) {
  try {
    const s = String(code).toUpperCase().replace(/[^0-9A-Z]/g, '');
    if (s.length !== 9) return null;
    const v = dec(s.slice(0, 7));
    if (check(Math.imul(Math.floor(v / 1073741824) + 1, 0x9e3779b1) ^ (v % 1073741824)) !== dec(s.slice(7))) return null;
    return { week: Math.floor(v / 128 / 10000), meters: Math.floor(v / 128) % 10000 * 10, species: v % 128 };
  } catch (e) { return null; }
}
export const weekNumber = (d = new Date()) => Math.floor((Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()) - Date.UTC(2026, 0, 5)) / (7 * 86400000)); // týdny od pondělí 5. 1. 2026
export function familyHTML(mine, codes, week) {
  const list = codes.map(readWeekCode).filter(r => r && r.week === week);
  const km = m => (m / 1000).toFixed(1).replace('.', ',');
  const tot = list.reduce((a, r) => ({ m: a.m + r.meters, s: a.s + r.species }), { m: mine.meters, s: mine.species });
  return `<h2>Rodinná výprava</h2><p class="msg small">Sečtěte km a druhy celé rodiny za tento týden. Pošli svůj kód ostatním a jejich kódy zadej sem.</p>
  <div class="tools"><div class="album"><b>Rodina</b><small>${km(tot.m)} km</small></div><div class="album"><b>Druhů</b><small>${tot.s}</small></div></div>
  <p class="msg">Můj kód: <b class="code">${esc(mine.code)}</b></p><button class="btn full" data-act="famShare">Poslat můj kód</button>
  <div class="presetnew"><input type="text" id="famCode" maxlength="14" placeholder="Kód od člena rodiny" aria-label="Kód od člena rodiny"><button class="btn" data-act="famAdd">Přidat</button></div>
  <p class="msg small" id="famErr"></p>
  ${list.map((r, i) => `<div class="quest"><span>Člen ${i + 1}</span><span>${km(r.meters)} km · ${r.species} druhů</span></div>`).join('')}
  <button class="btn full ghost" data-act="close">Zavřít</button>`;
}
