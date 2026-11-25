// Správa dat: kolik aplikace stahuje (měří service worker), průběh za poslední minutu, součty za dnešek a úložiště v telefonu
import { esc } from './config.js';

export const CAT_NAMES = { map: 'Mapa', dem: 'Výškopis', osm: 'Biotopy a trasy', trails: 'Trasy (obrázky)', weather: 'Počasí', wiki: 'Popisy zvířat', search: 'Hledání míst', app: 'Aplikace', other: 'Ostatní' };
export const CAT_COLORS = { map: '#2f7d4f', dem: '#8a6a3a', osm: '#2b7bb9', trails: '#7b4fd8', weather: '#e9a23b', wiki: '#c0504a', search: '#3aa6a0', app: '#6b7466', other: '#a3a3a3' };
const KEYS = ['bytes', 'req', 'hit', 'saved'];
const HIST = 60;

export function fmtBytes(b) {
  if (b < 1024) return Math.round(b) + ' B';
  if (b < 1024 * 1024) return (b / 1024).toFixed(b < 10240 ? 1 : 0).replace('.', ',') + ' kB';
  return (b / 1048576).toFixed(b < 10485760 ? 1 : 0).replace('.', ',') + ' MB';
}
const empty = () => ({ bytes: 0, req: 0, hit: 0, saved: 0 });

// Měřič: z průběžných součtů SW dělá přírůstky (SW se může uspat a začít od nuly), historii po sekundách
export function createMeter() {
  return { last: {}, session: {}, hist: new Array(HIST).fill(0), cur: 0, quiet: 0 };
}
export function ingest(m, stats) {
  let added = 0; const delta = {};
  for (const [cat, v] of Object.entries(stats || {})) {
    const prev = m.last[cat] || empty(), s = m.session[cat] || (m.session[cat] = empty()), d = delta[cat] = empty();
    for (const k of KEYS) {
      const now = Number(v[k]) || 0, inc = now >= prev[k] ? now - prev[k] : now; // menší než minule = SW začal znovu
      d[k] = inc; s[k] += inc;
    }
    added += d.bytes;
    m.last[cat] = { ...empty(), ...Object.fromEntries(KEYS.map(k => [k, Number(v[k]) || 0])) };
  }
  m.cur += added;
  return delta;
}
// Jednou za sekundu: posun historie; vrací rychlost (B/s)
export function tickMeter(m) {
  m.hist.push(m.cur); m.hist.shift();
  m.quiet = m.cur ? 0 : m.quiet + 1;
  const r = m.cur; m.cur = 0; return r;
}
export const totalOf = cats => Object.values(cats || {}).reduce((a, c) => a + (c.bytes || 0), 0);
export function addDay(day, today, delta) {
  const d = day && day.day === today ? day : { day: today, cats: {} };
  for (const [cat, v] of Object.entries(delta)) { const c = d.cats[cat] || (d.cats[cat] = empty()); for (const k of KEYS) c[k] += v[k] || 0; }
  return d;
}
export function cleanDay(d) {
  if (!d || typeof d !== 'object' || typeof d.day !== 'string') return null;
  const cats = {};
  for (const [k, v] of Object.entries(d.cats || {})) if (CAT_NAMES[k] && v) cats[k] = Object.fromEntries(KEYS.map(x => [x, Math.max(0, Number(v[x]) || 0)]));
  return { day: d.day.slice(0, 10), cats };
}

/* ---------- zobrazení ---------- */
export function sparkSVG(hist, w = 180, h = 36) {
  const max = Math.max(2048, ...hist), step = w / (hist.length - 1);
  const pts = hist.map((v, i) => (i * step).toFixed(1) + ',' + (h - v / max * (h - 2)).toFixed(1)).join(' ');
  return `<svg class="nmspark" viewBox="0 0 ${w} ${h}" preserveAspectRatio="none" aria-hidden="true"><polygon points="0,${h} ${pts} ${w},${h}" fill="#cfe3c4"/><polyline points="${pts}" fill="none" stroke="#2f7d4f" stroke-width="1.5" vector-effect="non-scaling-stroke"/></svg>`;
}
function bars(cats) {
  const tot = totalOf(cats) || 1, list = Object.entries(cats).filter(([, c]) => c.bytes || c.req || c.hit).sort((a, b) => b[1].bytes - a[1].bytes);
  if (!list.length) return '<p class="msg small">Zatím nic.</p>';
  return `<div class="nmbar">${list.map(([k, c]) => `<i style="width:${(c.bytes / tot * 100).toFixed(1)}%;background:${CAT_COLORS[k]}"></i>`).join('')}</div>
  ${list.map(([k, c]) => `<div class="nmrow"><span><b style="color:${CAT_COLORS[k]}">●</b> ${esc(CAT_NAMES[k])}</span><span>${fmtBytes(c.bytes)} <small>· ${c.req}×${c.hit ? ' · z paměti ' + c.hit + '×' : ''}</small></span></div>`).join('')}`;
}
// Malý ukazatel v rohu mapy; rozbalený s grafem
export function chipHTML(m, rate, open) {
  const tot = totalOf(m.session);
  if (!open) return `<span class="nmdot${rate ? ' on' : ''}"></span>⇣ ${fmtBytes(rate)}/s · ${fmtBytes(tot)}`;
  return `<div class="nmhead"><b>⇣ ${fmtBytes(rate)}/s</b><span>od spuštění ${fmtBytes(tot)}</span></div>${sparkSVG(m.hist)}${bars(m.session)}
  <button class="btn sm full" data-act="dataMgr">Správa dat</button>`;
}
export function dataHTML(m, day, storage, rate) {
  const st = storage && storage.quota ? `${fmtBytes(storage.usage)} z dostupných ${fmtBytes(storage.quota)}` : 'nezjištěno';
  return `<h2>Správa dat</h2><p class="msg small">Co aplikace stahuje z internetu. Na mobilních datech pomůže stáhnout okolí dopředu přes Wi-Fi (Offline mapy).</p>
  <button class="btn full" data-act="offline">Offline mapy – stáhnout okolí</button>
  <div class="tools"><div class="album"><b>Teď</b><small>${fmtBytes(rate)}/s</small></div><div class="album"><b>Dnes</b><small>${fmtBytes(totalOf(day && day.cats))}</small></div><div class="album"><b>Od spuštění</b><small>${fmtBytes(totalOf(m.session))}</small></div></div>
  ${sparkSVG(m.hist, 300, 54)}
  <h3>Dnes podle druhu</h3>${bars(day ? day.cats : {})}
  <h3>Uloženo v telefonu</h3><p class="msg small">${st}<br>Mapa, výškopis a biotopy se ukládají, aby se nestahovaly znovu.</p>
  <button class="btn full" data-act="offline">Offline mapy</button>
  <button class="btn full ghost" data-act="dataClearTiles" data-confirm="Opravdu smazat?">Smazat uloženou mapu (stáhne se znovu)</button>
  <button class="btn full ghost" data-act="dataClearOsm" data-confirm="Opravdu smazat?">Smazat uložené biotopy (stáhnou se znovu)</button>
  <p class="msg small">Měří se jen přenosy aplikace, ne celého telefonu. Údaje zůstávají v telefonu.</p>
  <button class="btn full ghost" data-act="close">Zavřít</button>`;
}
