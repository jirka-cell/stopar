// Moje farma: budovatelská vrstva s výraznou automatizací, málo návyková.
// Suroviny: dřevo, kámen, semínka. Farma je vyrábí sama jen pomalu, chůze přinese víc (podle biotopu).
// Pole, sad a záhon dávají krmivo, pamlsky a návnady do batohu. Kapacitu zvířat určují příbytky a spižírna.
// Nic se nekazí a nic se neztrácí, když hra týden neběží (jen se naplní sklad).
import { esc } from './config.js';

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
  // cena roste mírně, aby se vždy vešla do skladu o úroveň výš (příbytek úr. 10 ≈ 470 dřeva)
  return { wood: Math.round((enc ? 15 : 8) * n ** 1.5), stone: Math.round((enc ? 9 : 4) * n ** 1.5), cones: enc ? 10 * n : 0 };
}
export const buildMinutes = lv => Math.round(5 * (lv + 1) * 1.35 ** lv); // úr. 10 ≈ 12 h
export const canAfford = (f, c, cones) => f.res.wood >= c.wood && f.res.stone >= c.stone && cones >= c.cones;

// Nová farma: příbytky tak velké, aby se vešlo, co už hráč má (nikdo o zvířata nepřijde)
export function newFarm(encIds, need = 5, now = Date.now()) {
  const lv = { lumber: 1, quarry: 1, nursery: 1, field: 1, orchard: 0, worms: 0, store: 1, pantry: 0 };
  for (const id of encIds) lv['enc_' + id] = Math.max(1, Math.ceil(need / 5));
  return { t: now, res: { wood: 20, stone: 10, seeds: 10 }, lv, build: null, auto: true, frac: {}, walk: 0, made: {} };
}
export function cleanFarm(f, encIds) {
  if (!f || typeof f !== 'object' || !f.lv) return null;
  const out = newFarm(encIds, 5, num(f.t, Date.now()));
  for (const k of Object.keys(out.res)) out.res[k] = Math.max(0, num(f.res && f.res[k]));
  for (const k of Object.keys(f.lv)) if (/^(enc_)?\w+$/.test(k) && (k.startsWith('enc_') || BUILDINGS.some(b => b.id === k))) out.lv[k] = Math.max(0, Math.min(MAXLV, Math.round(num(f.lv[k]))));
  out.build = f.build && typeof f.build.id === 'string' && (f.build.id in out.lv) ? { id: f.build.id, until: num(f.build.until) } : null;
  out.auto = f.auto !== false; out.walk = Math.max(0, num(f.walk));
  out.frac = Object.fromEntries(Object.entries(f.frac || {}).map(([k, v]) => [String(k).slice(0, 20), Math.max(0, Math.min(1, num(v)))]));
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
  const opts = ids.filter(id => !id.startsWith('enc_') && (f.lv[id] || 0) < MAXLV && canAfford(f, cost(id, f.lv[id] || 0), 0)).sort((a, b) => (f.lv[a] || 0) - (f.lv[b] || 0));
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
