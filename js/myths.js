// Tajná sekce: bájní tvorové. Objeví se jen 2× ročně (v zimě a v létě, pár dní), u svého biotopu;
// chytit jde jen jedním pokusem do pár sekund s velmi ostrou fotkou. Dny jsou dané rokem → celá rodina má stejné.
import { esc, parseMonths } from './config.js';
import { hash01 } from './geo.js';
import { icOr } from './icons.js';

const num = (v, d = 0) => Number.isFinite(Number(v)) ? Number(v) : d;
const eye = (x, y, r = 5) => `<circle cx="${x}" cy="${y}" r="${r}" fill="#fff"/><circle cx="${x + r * .15}" cy="${y + r * .15}" r="${r * .55}" fill="#1c1c1e"/><circle cx="${x + r * .35}" cy="${y - r * .25}" r="${r * .22}" fill="#fff"/>`;
const sh = '<ellipse cx="80" cy="130" rx="32" ry="5" fill="rgba(0,0,0,.12)"/>';
const ART = {
  snezny: `${sh}<ellipse cx="80" cy="92" rx="34" ry="36" fill="#eef3f8"/><path d="M50 70l-6 -6M60 62l-3 -8M100 62l3 -8M110 70l6 -6" stroke="#dce6ef" stroke-width="5" stroke-linecap="round"/><ellipse cx="80" cy="60" rx="26" ry="24" fill="#f6f9fc"/><ellipse cx="80" cy="66" rx="16" ry="12" fill="#a9c4dc"/>${eye(71, 60, 5)}${eye(89, 60, 5)}<path d="M74 72q6 5 12 0" stroke="#3a4a5a" stroke-width="2" fill="none"/><ellipse cx="52" cy="104" rx="10" ry="18" fill="#eef3f8"/><ellipse cx="108" cy="104" rx="10" ry="18" fill="#eef3f8"/><ellipse cx="66" cy="126" rx="12" ry="6" fill="#dce6ef"/><ellipse cx="94" cy="126" rx="12" ry="6" fill="#dce6ef"/>`,
  vila: `${sh}<ellipse cx="54" cy="70" rx="24" ry="32" fill="#cdeaf7" opacity=".8" transform="rotate(-20 54 70)"/><ellipse cx="106" cy="70" rx="24" ry="32" fill="#cdeaf7" opacity=".8" transform="rotate(20 106 70)"/><path d="M80 66L58 126H102Z" fill="#f4b6d2"/><circle cx="80" cy="52" r="16" fill="#ffe0c8"/><path d="M64 50q16 -26 32 0q-4 -10 -16 -12q-12 2 -16 12z" fill="#f2c94c"/>${eye(74, 54, 3.5)}${eye(86, 54, 3.5)}<circle cx="80" cy="32" r="4" fill="#ff8ac0"/><circle cx="72" cy="34" r="3" fill="#9ad3ff"/><circle cx="88" cy="34" r="3" fill="#fff59d"/><path d="M120 40l4 4M124 30l2 6M36 44l-4 4" stroke="#f2c94c" stroke-width="3" stroke-linecap="round"/>`,
  hejkal: `${sh}<ellipse cx="80" cy="96" rx="32" ry="32" fill="#4f7a3a"/><path d="M48 90l-10 4M50 104l-10 8M112 90l10 4M110 104l10 8M60 66l-6 -10M100 66l6 -10M80 62v-12" stroke="#3a5a2a" stroke-width="5" stroke-linecap="round"/><circle cx="80" cy="74" r="22" fill="#5f8f45"/>${eye(72, 72, 6)}${eye(90, 72, 6)}<path d="M70 86q10 8 20 0" stroke="#2a3a1a" stroke-width="3" fill="none"/><path d="M66 50q4 -12 14 -4q10 -8 14 4" fill="#7a5a3a"/>`,
  vodnik: `${sh}<path d="M58 80h44l6 46H52Z" fill="#3f8f6a"/><rect x="56" y="94" width="48" height="8" fill="#e44"/><circle cx="80" cy="62" r="20" fill="#7ac29a"/><rect x="60" y="30" width="40" height="18" rx="4" fill="#2b2b2b"/><rect x="54" y="44" width="52" height="6" rx="3" fill="#2b2b2b"/>${eye(73, 62, 5)}${eye(87, 62, 5)}<path d="M72 74q8 6 16 0" stroke="#1f4a3a" stroke-width="2.5" fill="none"/><path d="M84 30q4 -8 8 -2" stroke="#4fa3d8" stroke-width="3" fill="none"/><path d="M52 126q-6 -4 -2 -8M108 126q6 -4 2 -8" stroke="#4fa3d8" stroke-width="3" fill="none"/><circle cx="64" cy="114" r="3" fill="#9ad3ff"/>`,
  bludicka: `<circle cx="80" cy="74" r="44" fill="#fff59d" opacity=".25"/><circle cx="80" cy="74" r="30" fill="#ffe57a" opacity=".45"/><circle cx="80" cy="74" r="18" fill="#fff8d0"/>${eye(74, 72, 4)}${eye(86, 72, 4)}<path d="M75 80q5 4 10 0" stroke="#a88a2a" stroke-width="2" fill="none"/><circle cx="40" cy="40" r="4" fill="#fff59d"/><circle cx="124" cy="52" r="3" fill="#fff59d"/><circle cx="118" cy="110" r="3.5" fill="#fff59d"/>${sh}`,
  polednice: `${sh}<path d="M80 60L52 126H108Z" fill="#f4f4f0"/><path d="M60 100h40" stroke="#d8d8d0" stroke-width="3"/><circle cx="80" cy="52" r="16" fill="#e8dcc8"/><path d="M62 52q18 -30 36 0q-6 -16 -18 -16q-12 0 -18 16z" fill="#f4f4f0"/>${eye(74, 54, 3.5)}${eye(86, 54, 3.5)}<path d="M112 70q20 -10 16 10" stroke="#9a9a9a" stroke-width="4" fill="none"/><path d="M110 70v56" stroke="#8a6a44" stroke-width="4"/><circle cx="120" cy="30" r="10" fill="#ffd54f"/>`,
  permonik: `${sh}<rect x="60" y="80" width="40" height="40" rx="10" fill="#8a5a3a"/><circle cx="80" cy="66" r="18" fill="#ffd8b8"/><path d="M62 70q18 30 36 0q-2 18 -18 22q-16 -4 -18 -22z" fill="#f2f2f2"/><path d="M60 56q20 -30 40 0z" fill="#3a4a8a"/><circle cx="80" cy="46" r="5" fill="#ffe57a"/>${eye(74, 62, 3.5)}${eye(86, 62, 3.5)}<path d="M106 84l18 -20M118 60l12 8" stroke="#6a6a6a" stroke-width="5" stroke-linecap="round"/>`,
  rusalka: `${sh}<path d="M66 70q-10 40 14 56q24 -16 14 -56z" fill="#6ac0c8"/><circle cx="80" cy="56" r="15" fill="#d9f0e8"/><path d="M62 54q-4 40 -10 60M98 54q4 40 10 60" stroke="#3a8a6a" stroke-width="6" fill="none" stroke-linecap="round"/><path d="M64 54q16 -24 32 0" fill="#3a8a6a"/>${eye(74, 58, 3.5)}${eye(86, 58, 3.5)}<circle cx="80" cy="40" r="4" fill="#f4f4f4"/><circle cx="72" cy="42" r="3" fill="#f4f4f4"/><circle cx="88" cy="42" r="3" fill="#f4f4f4"/>`,
  bazilisek: `${sh}<path d="M100 104q34 6 40 -14q-14 8 -26 0" fill="#5a8a3a"/><ellipse cx="80" cy="96" rx="30" ry="22" fill="#7a9a3a"/><path d="M60 64l8 -16l6 12l6 -14l6 14l6 -10l2 14z" fill="#d9302a"/><circle cx="74" cy="74" r="16" fill="#9ab84a"/>${eye(70, 72, 5)}<path d="M56 74l-10 4l10 4z" fill="#f2b81b"/><path d="M60 108l-6 16M76 112l-2 14M92 112l2 14" stroke="#5a7a2a" stroke-width="5" stroke-linecap="round"/>`,
  drak: `${sh}<path d="M60 70q-30 -20 -40 10q20 -6 30 10z" fill="#9b5fc0"/><path d="M100 70q30 -20 40 10q-20 -6 -30 10z" fill="#9b5fc0"/><ellipse cx="80" cy="98" rx="30" ry="26" fill="#6ab04a"/><ellipse cx="80" cy="104" rx="18" ry="16" fill="#e8e0a0"/><circle cx="80" cy="62" r="20" fill="#7ac05a"/><path d="M66 46l-4 -12l10 8M94 46l4 -12l-10 8" fill="#f2c94c"/>${eye(72, 60, 5)}${eye(88, 60, 5)}<path d="M72 74q8 6 16 0" stroke="#2a4a1a" stroke-width="2.5" fill="none"/><path d="M110 118q24 4 26 -16" stroke="#6ab04a" stroke-width="8" fill="none" stroke-linecap="round"/>`
};
Object.assign(ART, {
  dynacek: `${sh}<path d="M80 52q-4 -14 6 -18" stroke="#3a7a2a" stroke-width="5" fill="none" stroke-linecap="round"/><ellipse cx="80" cy="92" rx="44" ry="36" fill="#f08a24"/><path d="M60 60q-8 32 0 66M100 60q8 32 0 66M80 56v72" stroke="#d06a14" stroke-width="3" fill="none"/><path d="M58 84l10 -8l8 8zM102 84l-10 -8l-8 8z" fill="#5a2a0a"/><path d="M60 104q20 16 40 0q-6 10 -20 10q-14 0 -20 -10z" fill="#5a2a0a"/>`,
  strasidylko: `${sh}<path d="M50 120V72q0 -34 30 -34t30 34v48l-8 -8l-8 8l-7 -8l-7 8l-8 -8l-8 8z" fill="#f4f6ff" stroke="#c8ccdd" stroke-width="2"/>${eye(70, 74, 6)}${eye(92, 74, 6)}<ellipse cx="81" cy="92" rx="6" ry="5" fill="#ff8fab"/><circle cx="62" cy="86" r="4" fill="#ffc0cf" opacity=".7"/><circle cx="100" cy="86" r="4" fill="#ffc0cf" opacity=".7"/>`,
  cert: `${sh}<path d="M100 110q30 4 30 -16q-6 10 -16 8" stroke="#3a2a2a" stroke-width="4" fill="none"/><ellipse cx="80" cy="100" rx="28" ry="26" fill="#5a3a2a"/><circle cx="80" cy="66" r="22" fill="#7a4a3a"/><path d="M62 50l-8 -18l16 10zM98 50l8 -18l-16 10z" fill="#f2e6c8"/>${eye(72, 64, 5)}${eye(88, 64, 5)}<path d="M70 78q10 8 20 0" stroke="#2a1a1a" stroke-width="3" fill="none" stroke-linecap="round"/><path d="M80 82q-4 14 4 22" stroke="#e44" stroke-width="5" fill="none" stroke-linecap="round"/>`,
  andel: `${sh}<ellipse cx="50" cy="80" rx="20" ry="30" fill="#fff" stroke="#e0e6f0" stroke-width="2" transform="rotate(-25 50 80)"/><ellipse cx="110" cy="80" rx="20" ry="30" fill="#fff" stroke="#e0e6f0" stroke-width="2" transform="rotate(25 110 80)"/><path d="M80 74L56 126H104Z" fill="#fff8e0"/><circle cx="80" cy="60" r="17" fill="#ffe0c8"/><path d="M63 56q17 -24 34 0q-4 -12 -17 -12t-17 12z" fill="#f2c94c"/><ellipse cx="80" cy="34" rx="16" ry="4" fill="none" stroke="#f2c21b" stroke-width="3"/>${eye(74, 62, 3.5)}${eye(86, 62, 3.5)}`,
  skritek: `${sh}<path d="M62 84h36l6 42H56Z" fill="#c0283a"/><rect x="58" y="100" width="44" height="6" fill="#2b2b2b"/><circle cx="80" cy="72" r="16" fill="#ffd8b8"/><path d="M62 66q18 -48 40 -4z" fill="#2f7d4f"/><circle cx="104" cy="60" r="5" fill="#fff"/><path d="M66 78q14 22 28 0q-2 14 -14 16q-12 -2 -14 -16z" fill="#fff"/>${eye(74, 70, 3)}${eye(86, 70, 3)}`,
  bilapani: `${sh}<path d="M80 50L50 128H110Z" fill="#f4f6ff" opacity=".9"/><path d="M80 50L58 128" stroke="#dfe3f2" stroke-width="2"/><circle cx="80" cy="46" r="15" fill="#fbfbff"/><path d="M64 44q16 -26 32 0q-4 -14 -16 -14t-16 14z" fill="#e8e0d0"/>${eye(74, 47, 3)}${eye(86, 47, 3)}<path d="M76 55q4 3 8 0" stroke="#a0a6c0" stroke-width="2" fill="none" stroke-linecap="round"/><circle cx="80" cy="80" r="40" fill="#e8ecff" opacity=".18"/>`,
  rytir: `${sh}<rect x="62" y="74" width="36" height="48" rx="6" fill="#9aa4b0"/><rect x="62" y="96" width="36" height="6" fill="#c0283a"/><circle cx="80" cy="56" r="18" fill="#b8c0ca"/><rect x="66" y="52" width="28" height="6" rx="2" fill="#2b2f36"/><path d="M80 38v-12" stroke="#d9442b" stroke-width="5" stroke-linecap="round"/><path d="M104 70v50" stroke="#c8ccd2" stroke-width="5" stroke-linecap="round"/><path d="M98 76h12" stroke="#8a6a3a" stroke-width="5" stroke-linecap="round"/>`,
  zajicek: `${sh}<ellipse cx="68" cy="40" rx="8" ry="24" fill="#f2ebe2"/><ellipse cx="92" cy="40" rx="8" ry="24" fill="#f2ebe2"/><ellipse cx="68" cy="42" rx="4" ry="16" fill="#ffc0cf"/><ellipse cx="92" cy="42" rx="4" ry="16" fill="#ffc0cf"/><ellipse cx="80" cy="100" rx="28" ry="26" fill="#f2ebe2"/><circle cx="80" cy="70" r="20" fill="#f7f1ea"/>${eye(73, 68, 4)}${eye(87, 68, 4)}<ellipse cx="80" cy="78" rx="4" ry="3" fill="#ff8fab"/><ellipse cx="112" cy="116" rx="9" ry="12" fill="#7ac2e8"/><path d="M104 114h16M104 120h16" stroke="#fff" stroke-width="2"/>`
});
// Obrázky z G (images/myths/{id}.webp); SVG výše zůstává jako záloha pro tvory bez obrázku
const MYTH_IMG = new Set('andel bazilisek bilapani bludicka cert drak dynacek hejkal permonik polednice rusalka rytir skritek snezny strasidylko vila vodnik zajicek'.split(' '));
export const mythURL = m => MYTH_IMG.has(m.id) ? `images/myths/${m.id}.webp` : 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 160 140">${ART[m.id] || ART.bludicka}</svg>`);
export const hasMythArt = id => !!ART[id];

/* ---------- bájné dny ---------- */
// Dvě okna ročně: zimní (5. 1.–20. 2.) a letní (15. 6.–20. 8.), začátek z hashe roku, délka mythDays
export function mythWindows(cfg, year) {
  const days = Math.max(1, num(cfg.world.mythDays, 3)), seed = cfg.spawn.seed;
  return [['zima', [0, 5], [1, 20]], ['leto', [5, 15], [7, 20]]].map(([season, a, b], i) => {
    const from = new Date(year, a[0], a[1]).getTime(), last = new Date(year, b[0], b[1]).getTime() - days * 86400000;
    const start = from + Math.floor(hash01(seed, year, i, 31) * ((last - from) / 86400000 + 1)) * 86400000;
    return { season, from: start, to: start + days * 86400000 - 1 };
  });
}
// Velikonoční neděle (gregoriánský kalendář, Meeus/Jones/Butcher)
export function easter(y) {
  const a = y % 19, b = Math.floor(y / 100), c = y % 100, d = Math.floor(b / 4), e = b % 4, f = Math.floor((b + 8) / 25), g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30, i = Math.floor(c / 4), k = c % 4, l = (32 + 2 * e + 2 * i - h - k) % 7, m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31), day = ((h + l - 7 * m + 114) % 31) + 1;
  return new Date(y, month - 1, day);
}
// Noc na hradech: pátek až neděle kolem poslední soboty v srpnu (shortcut: pevné pravidlo, skutečné datum akcí se může lišit)
export function hradyWindow(year) {
  const d = new Date(year, 7, 31); while (d.getDay() !== 6) d.setDate(d.getDate() - 1);
  const sat = d.getTime();
  return { season: 'fest', fest: 'hrady', name: 'Noc na hradech', from: sat - 86400000, to: sat + 2 * 86400000 - 1 };
}
// Sváteční dny: speciální tvorové pro děti (lehčí na chycení), všude, ne jen u biotopu
export function festWindows(year) {
  const d = (m, day) => new Date(year, m, day).getTime(), e = easter(year).getTime();
  return [
    { season: 'fest', fest: 'dusicky', name: 'Dušičky', from: d(9, 30), to: d(10, 3) - 1 },
    { season: 'fest', fest: 'mikulas', name: 'Mikuláš', from: d(11, 4), to: d(11, 7) - 1 },
    { season: 'fest', fest: 'vanoce', name: 'Vánoce', from: d(11, 23), to: d(11, 27) - 1 },
    { season: 'fest', fest: 'velikonoce', name: 'Velikonoce', from: e - 2 * 86400000, to: e + 2 * 86400000 - 1 },
    hradyWindow(year)
  ];
}
export const activeWindow = (cfg, now = Date.now()) => {
  const y = new Date(now).getFullYear();
  if (cfg.world.festivals !== false) { const f = festWindows(y).find(w => now >= w.from && now <= w.to); if (f) return f; }
  return mythWindows(cfg, y).find(w => now >= w.from && now <= w.to) || null;
};
// Do kolika dní začne další okno (pro tajemné stopy předem), jinak null
export function daysToWindow(cfg, now = Date.now()) {
  const y = new Date(now).getFullYear();
  const next = [...mythWindows(cfg, y), ...mythWindows(cfg, y + 1)].find(w => w.from > now);
  return next ? Math.ceil((next.from - now) / 86400000) : null;
}

// Který tvor se může objevit v buňce (biotop, výškové pásmo, měsíc, noc) – h z hashe buňky
export function mythFor(cfg, ctx, h) {
  const fest = ctx.window && ctx.window.fest, chance = fest ? num(cfg.world.festChance, 0.05) : num(cfg.world.mythChance, 0.02);
  if (!ctx.window || h >= chance) return '';
  const m = new Date(ctx.now).getMonth() + 1;
  const cand = cfg.myths.filter(t => t.active !== false && (fest ? t.fest === fest : !t.fest)
    && (fest || (String(t.bio || '').split(',').map(s => s.trim()).filter(Boolean).some(b => b === ctx.bio || b === ctx.zone) && parseMonths(t.months).has(m)))
    && (!t.night || ctx.night));
  if (!cand.length) return '';
  return cand[Math.floor(h / chance * cand.length) % cand.length].id;
}

export function cleanMyths(m) {
  return Object.fromEntries(Object.entries(m && typeof m === 'object' ? m : {}).slice(0, 100).map(([k, v]) => [String(k).slice(0, 40), num(v)]));
}
// Tajné sekce se ukážou až po prvním nálezu: bájní (tajná sekce + Pověsti), sváteční (vlastní záložka)
export const foundMyth = (cfg, st, fest) => cfg.myths.some(t => !!t.fest === !!fest && st.myths[t.id]);
// Tajná sekce v atlasu: nechycení jako otazníky; kind 'reg' = bájní, 'fest' = sváteční
export function mythsHTML(cfg, st, kind = 'reg') {
  if (!cfg.myths.length || !foundMyth(cfg, st, kind === 'fest')) return '';
  const card = t => st.myths[t.id]
    ? `<div class="acard myth" data-myth="${esc(t.id)}"><div class="im"><img src="${mythURL(t)}" alt="${esc(t.name)}"></div><div class="nm">${esc(t.name)}</div><div class="rr">${new Date(st.myths[t.id]).toLocaleDateString('cs-CZ')}</div></div>`
    : `<div class="acard miss myth"><div class="im"><img src="${mythURL(t)}" alt=""></div><div class="nm">???</div><div class="rr">${t.fest ? esc(FEST_NAMES[t.fest] || 'svátky') : 'tajemství'}</div></div>`;
  const reg = cfg.myths.filter(t => !t.fest), fes = cfg.myths.filter(t => t.fest);
  const n = reg.filter(t => st.myths[t.id]).length, nf = fes.filter(t => st.myths[t.id]).length;
  return kind === 'fest' ? `<div class="grp">${icOr('fest', '🎉')} Sváteční tvorové (${nf} / ${fes.length})</div><div class="grid">${fes.map(card).join('')}</div>`
    : `<div class="grp">${icOr('myth', '🔮')} Tajná sekce – bájní tvorové (${n} / ${reg.length})</div><div class="grid">${reg.map(card).join('')}</div>`;
}
export const FEST_NAMES = { dusicky: 'Dušičky', mikulas: 'Mikuláš', vanoce: 'Vánoce', velikonoce: 'Velikonoce', hrady: 'Noc na hradech' };
// Pověsti: kde a kdy se který tvor ukazuje (z nastavení tvorů)
export function legendsHTML(cfg, st, BIO, daysTo) {
  const reg = cfg.myths.filter(t => !t.fest);
  return `<h2>${icOr('legends', '📜')} Pověsti</h2><p class="msg small">České pověsti o tvorech z tajné sekce. Ukazují se jen 2× ročně na pár dní, každý u svého místa.${daysTo != null ? ` Další bájné dny začnou za <b>${daysTo}</b> dní.` : ''}</p>
  ${reg.map(t => { const where = String(t.bio || '').split(',').map(x => x.trim()).filter(Boolean).map(b => (BIO[b] ? BIO[b].name : b.replace('_', ' '))).join(', ') || 'kdekoli';
    return `<div class="fcard"><div class="fico"><img src="${mythURL(t)}" alt="" style="width:44px;height:38px;object-fit:contain${st.myths[t.id] ? '' : ';filter:grayscale(1) opacity(.5)'}"></div><div class="finfo"><b>${st.myths[t.id] ? esc(t.name) : '???'}</b><small>📍 ${esc(where)}${t.night ? ' · 🌙 jen v noci' : ''}${t.months ? ' · měsíce ' + esc(t.months) : ''}</small><small>${esc(t.fact || '')}</small></div></div>`; }).join('')}
  <button class="btn full ghost" data-act="close">Zavřít</button>`;
}
