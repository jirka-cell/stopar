// Moje farma: budovatelská vrstva s výraznou automatizací, málo návyková.
// Suroviny: dřevo, kámen, semínka. Farma je vyrábí sama jen pomalu, chůze přinese víc (podle biotopu).
// Pole, sad a záhon dávají krmivo, pamlsky a návnady do batohu. Kapacitu zvířat určují příbytky a spižírna.
// Nic se nekazí a nic se neztrácí, když hra týden neběží (jen se naplní sklad).
import { esc } from './config.js';
import { canPlace } from './farm3d.js';

const num = (v, d = 0) => Number.isFinite(Number(v)) ? Number(v) : d;
export const RES = { wood: ['🪵', 'Dřevo'], stone: ['🪨', 'Kámen'], seeds: ['🌱', 'Semínka'] };
// typ: res = surovina za hodinu na úroveň, item = věc do batohu za hodinu na úroveň, cap = kapacita
export const BUILDINGS = [
  { id: 'lumber', name: 'Dřevník', icon: '🪓', kind: 'res', res: 'wood', rate: 1, desc: 'Pomalu přidává dřevo. Víc ho nasbíráš chůzí lesem.' },
  { id: 'quarry', name: 'Lom', icon: '⛏️', kind: 'res', res: 'stone', rate: 0.6, desc: 'Pomalu přidává kámen. Víc ho najdeš na výletech mimo les a louky.' },
  { id: 'nursery', name: 'Semeniště', icon: '🌱', kind: 'res', res: 'seeds', rate: 0.8, desc: 'Pomalu přidává semínka. Víc jich nasbíráš chůzí po loukách a polích.' },
  { id: 'field', name: 'Pole', icon: '🌾', kind: 'item', item: 'krmivo', rate: 0.25, use: { seeds: 1 }, desc: 'Pěstuje krmivo pro zvířata (spotřebuje semínka).' },
  { id: 'orchard', name: 'Sad', icon: '🍓', kind: 'item', item: 'pamlsek', rate: 0.08, use: { seeds: 2 }, desc: 'Pěstuje pamlsky (spotřebuje semínka).' },
  { id: 'worms', name: 'Záhon s žížalami', icon: '🪱', kind: 'item', item: 'navnada', rate: 0.1, use: { seeds: 1 }, desc: 'Chová návnady na zvířata.' },
  { id: 'store', name: 'Sklad', icon: '🏚️', kind: 'cap', desc: 'Kolik surovin se vejde (každá úroveň +100).' },
  { id: 'pantry', name: 'Spižírna', icon: '🧺', kind: 'cap', desc: 'Zásoby jídla: každá úroveň +2 místa pro každý druh zvířete.' }
];
export const ENC_DESC = 'Velikost příbytku: každá úroveň +5 míst pro každý druh zvířete této skupiny.';
const MAXLV = 10;

export const storeCap = f => 100 + 100 * (f.lv.store || 0);
// Kapacita jednoho druhu v příbytku: úroveň příbytku × 5 + spižírna × 2 (strop z nastavení)
export const encCap = (f, encId, maxCap = 60) => Math.min(maxCap, 5 * Math.max(1, f.lv['enc_' + encId] || 1) + 2 * (f.lv.pantry || 0));
// Cena a doba stavby další úrovně
export function cost(id, lv) {
  const n = lv + 1, enc = id.startsWith('enc_');
  // lineárně: každá další úroveň stojí o stejný kus víc (příbytek úr. n = 15n dřeva, 9n kamene, 10n šišek)
  return { wood: (enc ? 15 : 8) * n, stone: (enc ? 9 : 4) * n, cones: enc ? 10 * n : 0 };
}
export const buildMinutes = lv => 5 * (lv + 1); // lineárně: úr. n = 5n minut
export const canAfford = (f, c, cones) => f.res.wood >= c.wood && f.res.stone >= c.stone && cones >= c.cones;

// Nová farma je prázdná (jen statek), krajina z náhodného seedu; staví se postupně u cest
export function newFarm(encIds, need = 5, now = Date.now(), seed = 1 + Math.floor(Math.random() * 99999)) {
  const lv = Object.fromEntries(BUILDINGS.map(b => [b.id, 0]));
  for (const id of encIds) lv['enc_' + id] = 0;
  return { t: now, res: { wood: 40, stone: 20, seeds: 10 }, lv, build: null, auto: true, frac: {}, walk: 0, made: {}, pos: {}, moved: 0, seed, guests: {}, deeds: {} };
}
export const isEmpty = f => Object.values(f.lv).every(v => !v) && !f.build;
export function cleanFarm(f, encIds) {
  if (!f || typeof f !== 'object' || !f.lv) return null;
  const out = newFarm(encIds, 5, num(f.t, Date.now()));
  for (const k of Object.keys(out.res)) out.res[k] = Math.max(0, num(f.res && f.res[k]));
  for (const k of Object.keys(f.lv)) if (/^(enc_)?\w+$/.test(k) && (k.startsWith('enc_') || BUILDINGS.some(b => b.id === k))) out.lv[k] = Math.max(0, Math.min(MAXLV, Math.round(num(f.lv[k]))));
  out.build = f.build && typeof f.build.id === 'string' && (f.build.id in out.lv) ? { id: f.build.id, until: num(f.build.until) } : null;
  out.auto = f.auto !== false; out.walk = Math.max(0, num(f.walk));
  out.frac = Object.fromEntries(Object.entries(f.frac || {}).map(([k, v]) => [String(k).slice(0, 20), Math.max(0, Math.min(1, num(v)))]));
  out.pos = Object.fromEntries(Object.entries(f.pos && typeof f.pos === 'object' ? f.pos : {}).filter(([k, v]) => k in out.lv && Array.isArray(v) && v.length === 2 && v.every(Number.isInteger)).map(([k, v]) => [k, [v[0], v[1]]]));
  out.moved = Math.max(0, num(f.moved));
  out.seed = Math.max(1, Math.round(num(f.seed, 1 + (Math.round(num(f.t)) % 99991))));
  out.guests = Object.fromEntries(Object.entries(f.guests || {}).map(([k, v]) => [String(k).slice(0, 30), (Array.isArray(v) ? v : []).map(String).slice(0, 8)]));
  out.guestDay = String(f.guestDay || '').slice(0, 10);
  out.deeds = Object.fromEntries(Object.entries(f.deeds || {}).map(([k, v]) => [String(k).slice(0, 20), Math.max(0, num(v))]));
  out.made = Object.fromEntries(Object.entries(f.made || {}).map(([k, v]) => [String(k).slice(0, 20), Math.max(0, Math.round(num(v)))]));
  return out;
}

// Posun času: dokončení stavby, pasivní výroba (strop skladu), pěstování do batohu; vrací, co přibylo do batohu
export function advance(f, now, inv) {
  const got = {};
  if (f.build && now >= f.build.until) { f.lv[f.build.id] = (f.lv[f.build.id] || 0) + 1; got.built = f.build.id; f.build = null; }
  const h = Math.max(0, Math.min(72, (now - f.t) / 3600000)); f.t = now;
  if (!h) return got;
  const cap = storeCap(f);
  for (const b of BUILDINGS) {
    const lv = f.lv[b.id] || 0; if (!lv) continue;
    if (b.kind === 'res') f.res[b.res] = Math.min(cap, f.res[b.res] + b.rate * lv * h);
    if (b.kind === 'item') {
      let x = (f.frac[b.id] || 0) + b.rate * lv * h;
      while (x >= 1) {
        const use = b.use || {};
        if (Object.entries(use).some(([r, n]) => f.res[r] < n)) { x = Math.min(x, 1); break; } // bez semínek se čeká, nic se neztratí
        Object.entries(use).forEach(([r, n]) => { f.res[r] -= n; });
        inv[b.item] = (inv[b.item] || 0) + 1; got[b.item] = (got[b.item] || 0) + 1; f.made[b.item] = (f.made[b.item] || 0) + 1; x -= 1;
      }
      f.frac[b.id] = Math.min(1, x);
    }
  }
  return got;
}
// Chůze: každých 100 m jedna surovina podle biotopu (les = dřevo, louka/pole/sad = semínka, jinde kámen) + bonus 2×
export function walkGain(f, meters, bio) {
  f.walk += meters; let n = 0;
  const res = bio === 'les' ? 'wood' : ['louka', 'pole', 'sad', 'park'].includes(bio) ? 'seeds' : 'stone';
  while (f.walk >= 100) { f.walk -= 100; f.res[res] = Math.min(storeCap(f), f.res[res] + 2); n += 2; }
  return n ? { res, n } : null;
}
export function startBuild(f, id, cones, now = Date.now()) {
  if (f.build) return { err: 'Už se staví.' };
  const lv = f.lv[id] || 0; if (lv >= MAXLV) return { err: 'Nejvyšší úroveň.' };
  const c = cost(id, lv); if (!canAfford(f, c, cones)) return { err: 'Chybí suroviny.' };
  f.res.wood -= c.wood; f.res.stone -= c.stone;
  f.build = { id, until: now + buildMinutes(lv) * 60000 };
  return { cones: c.cones };
}
// Automatická stavba: když nic nestaví, vylepší nejnižší úroveň, na kterou jsou suroviny (šišky nebere – příbytky staví hráč)
export function autoPick(f, ids) {
  if (!f.auto || f.build) return null;
  const opts = ids.filter(id => !id.startsWith('enc_') && (f.lv[id] || 0) >= 1 && f.pos[id] && (f.lv[id] || 0) < MAXLV && canAfford(f, cost(id, f.lv[id] || 0), 0)).sort((a, b) => (f.lv[a] || 0) - (f.lv[b] || 0));
  return opts[0] || null;
}

/* ---------- obrazovka ---------- */
const fmt = v => Math.floor(v);
const mins = m => m < 60 ? m + ' min' : Math.floor(m / 60) + ' h ' + (m % 60 ? m % 60 + ' min' : '');
export function farmHTML(f, cfg, cones, now = Date.now()) {
  const cap = storeCap(f), card = (id, name, icon, desc, extra = '') => {
    const lv = f.lv[id] || 0, c = cost(id, lv), b = f.build && f.build.id === id;
    const pr = b ? Math.max(0, Math.min(100, 100 - (f.build.until - now) / (buildMinutes(lv) * 600))) : 0;
    return `<div class="fcard"><div class="fico">${icon}</div><div class="finfo"><b>${esc(name)} <small>úr. ${lv}</small></b><small>${esc(desc)}</small>${extra}
    ${b ? `<div class="prog"><div style="width:${pr.toFixed(0)}%"></div></div><small>Staví se – hotovo za ${mins(Math.max(1, Math.ceil((f.build.until - now) / 60000)))}</small>`
      : lv >= MAXLV ? '<small>Nejvyšší úroveň</small>' : `<button class="btn sm${canAfford(f, c, cones) && !f.build ? ' primary' : ''}" data-act="farmBuild" data-id="${esc(id)}"${f.build ? ' disabled' : ''}>${lv ? 'Vylepšit' : 'Postavit'}: 🪵 ${c.wood} · 🪨 ${c.stone}${c.cones ? ' · 🌰 ' + c.cones : ''} · ${mins(buildMinutes(lv))}</button>`}</div></div>`;
  };
  return `<h2>🏡 Moje farma</h2>
  <div class="fres">${Object.entries(RES).map(([k, [i, n]]) => `<span title="${n}">${i} <b>${fmt(f.res[k])}</b><small>/${cap}</small></span>`).join('')}</div>
  <p class="msg small">Farma pracuje sama, ale pomalu. Víc surovin přinese procházka: les dá dřevo, louky semínka, jinde kámen.</p>
  <label class="fld row">Automatická stavba (vylepšuje sama, příbytky staví hráč)<input type="checkbox" data-farm="auto"${f.auto ? ' checked' : ''}></label>
  <h3>Příbytky zvířat</h3>${cfg.enclosures.map(e => card('enc_' + e.id, e.name, e.icon, ENC_DESC, `<small>Místa pro každý druh: <b>${encCap(f, e.id, cfg.farm.maxCap)}</b></small>`)).join('')}
  <h3>Hospodářství</h3>${BUILDINGS.map(b => card(b.id, b.name, b.icon, b.desc, b.kind === 'item' && f.made[b.item] ? `<small>Vypěstováno celkem: ${f.made[b.item]}</small>` : '')).join('')}
  <button class="btn full ghost" data-act="close">Zavřít</button>`;
}

// Souhrn výroby za hodinu (bez chůze): suroviny a věci do batohu
export function rates(f) {
  const out = { wood: 0, stone: 0, seeds: 0, items: {} };
  for (const b of BUILDINGS) { const lv = f.lv[b.id] || 0; if (!lv) continue; if (b.kind === 'res') out[b.res] += b.rate * lv; if (b.kind === 'item') out.items[b.item] = (out.items[b.item] || 0) + b.rate * lv; }
  return out;
}

// Přesun budovy na políčko u cesty; obsazené políčko = výměna míst. moveDays: 0 = kdykoli, jinak jednou za tolik dní
export function moveBuilding(f, id, q, r, T, moveDays = 0, now = Date.now()) {
  if (moveDays > 0 && f.moved && now - f.moved < moveDays * 86400000) return { err: 'Další přesun za ' + Math.ceil((f.moved + moveDays * 86400000 - now) / 86400000) + ' dní.' };
  const other = Object.keys(f.pos).find(k => k !== id && f.pos[k][0] === q && f.pos[k][1] === r);
  const taken = new Set(Object.entries(f.pos).filter(([k]) => k !== id && k !== other).map(([, p]) => p.join()));
  if (!other && !canPlace(T, q, r, taken)) return { err: 'Sem stavět nejde – budova potřebuje volné políčko u cesty (ne na vodě).' };
  if (other) f.pos[other] = f.pos[id].slice();
  f.pos[id] = [q, r]; f.moved = now;
  return { swapped: other || '' };
}
// Nová budova: místo u cesty + zahájení stavby úrovně 1
export function placeBuilding(f, id, q, r, T, cones, now = Date.now()) {
  if ((f.lv[id] || 0) > 0 || f.pos[id]) return { err: 'Už stojí.' };
  const taken = new Set(Object.values(f.pos).map(p => p.join()));
  if (!canPlace(T, q, r, taken)) return { err: 'Sem stavět nejde – vyber zvýrazněné políčko u cesty.' };
  const res = startBuild(f, id, cones, now); if (res.err) return res;
  f.pos[id] = [q, r];
  return res;
}
