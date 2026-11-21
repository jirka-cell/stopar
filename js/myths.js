// Tajná sekce: bájní tvorové. Objeví se jen 2× ročně (v zimě a v létě, pár dní), u svého biotopu;
// chytit jde jen jedním pokusem do pár sekund s velmi ostrou fotkou. Dny jsou dané rokem → celá rodina má stejné.
import { esc, parseMonths } from './config.js';
import { hash01 } from './geo.js';

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
export const mythURL = m => 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 160 140">${ART[m.id] || ART.bludicka}</svg>`);
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
export const activeWindow = (cfg, now = Date.now()) => mythWindows(cfg, new Date(now).getFullYear()).find(w => now >= w.from && now <= w.to) || null;
// Do kolika dní začne další okno (pro tajemné stopy předem), jinak null
export function daysToWindow(cfg, now = Date.now()) {
  const y = new Date(now).getFullYear();
  const next = [...mythWindows(cfg, y), ...mythWindows(cfg, y + 1)].find(w => w.from > now);
  return next ? Math.ceil((next.from - now) / 86400000) : null;
}

// Který tvor se může objevit v buňce (biotop, výškové pásmo, měsíc, noc) – h z hashe buňky
export function mythFor(cfg, ctx, h) {
  if (!ctx.window || h >= num(cfg.world.mythChance, 0.02)) return '';
  const m = new Date(ctx.now).getMonth() + 1;
  const cand = cfg.myths.filter(t => t.active !== false
    && String(t.bio || '').split(',').map(s => s.trim()).filter(Boolean).some(b => b === ctx.bio || b === ctx.zone)
    && parseMonths(t.months).has(m) && (!t.night || ctx.night));
  if (!cand.length) return '';
  return cand[Math.floor(h / num(cfg.world.mythChance, 0.02) * cand.length) % cand.length].id;
}

export function cleanMyths(m) {
  return Object.fromEntries(Object.entries(m && typeof m === 'object' ? m : {}).slice(0, 100).map(([k, v]) => [String(k).slice(0, 40), num(v)]));
}
// Tajná sekce v atlasu: nechycení jako otazníky
export function mythsHTML(cfg, st) {
  if (!cfg.myths.length) return '';
  const n = cfg.myths.filter(t => st.myths[t.id]).length;
  return `<div class="grp">🔮 Tajná sekce – bájní tvorové (${n} / ${cfg.myths.length})</div><div class="grid">${cfg.myths.map(t => st.myths[t.id]
    ? `<div class="acard myth" data-myth="${esc(t.id)}"><div class="im"><img src="${mythURL(t)}" alt="${esc(t.name)}"></div><div class="nm">${esc(t.name)}</div><div class="rr">${new Date(st.myths[t.id]).toLocaleDateString('cs-CZ')}</div></div>`
    : `<div class="acard miss myth"><div class="im"><img src="${mythURL(t)}" alt=""></div><div class="nm">???</div><div class="rr">tajemství</div></div>`).join('')}</div>`;
}
