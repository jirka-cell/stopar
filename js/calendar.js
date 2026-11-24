// Můj kalendář: sám zapisuje dny, kdy jsem hrál, a co jsem ten den chytil; nad měsícem co se v přírodě děje.
import { esc, parseMonths, MONTH_NAMES } from './config.js';
import { activeEvents } from './world.js';

export const dayKey = (d = new Date()) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const DAY_RE = /^\d{4}-\d{2}-\d{2}$/;
// { 'RRRR-MM-DD': { p: 1, c: [id druhů chycených ten den] } } – nejvýš 800 dní, 40 úlovků na den
export function cleanDays(s) {
  const out = {};
  for (const [k, v] of Object.entries(s && typeof s === 'object' ? s : {}).slice(-800)) {
    if (!DAY_RE.test(k) || !v || typeof v !== 'object') continue;
    out[k] = { p: v.p ? 1 : 0, c: (Array.isArray(v.c) ? v.c : []).map(x => String(x).slice(0, 40)).slice(0, 40) };
  }
  return out;
}
export function markPlayed(days, d = new Date()) { const k = dayKey(d); days[k] = days[k] || { p: 0, c: [] }; days[k].p = 1; }
export function addCatch(days, spId, d = new Date()) { const k = dayKey(d); days[k] = days[k] || { p: 1, c: [] }; days[k].p = 1; if (days[k].c.length < 40) days[k].c.push(String(spId)); }

// Co se v přírodě děje v měsíci (krátce): text z nastavení, události, nově se objevují
function natureHTML(cfg, y, m, img) {
  const act = cfg.species.filter(s => s.active), prev = m === 1 ? 12 : m - 1;
  const fresh = act.filter(s => { const ms = parseMonths(s.months); return ms.size < 12 && ms.has(m) && !ms.has(prev); }).slice(0, 8);
  const text = (cfg.calendar.find(c => String(c.id) === String(m)) || {}).text || '';
  const ev = activeEvents(cfg, new Date(y, m - 1, 15));
  return `<div class="calnat">${text ? `<p>${esc(text)}</p>` : ''}${ev.length ? `<p class="calev">${ev.map(e => '🎉 ' + esc(e.name)).join(' · ')}</p>` : ''}
    ${fresh.length ? `<div class="calfresh"><small>Nově se objevují</small><div>${fresh.map(s => `<span title="${esc(s.name)}">${img(s)}</span>`).join('')}</div></div>` : ''}</div>`;
}
// img(sp) = HTML obrázku druhu, km(den) = metry ušlé ten den
export function myCalendarHTML(cfg, st, y, m, { img, km = () => 0, SP = {} }) {
  const first = new Date(y, m - 1, 1), dim = new Date(y, m, 0).getDate(), off = (first.getDay() + 6) % 7, today = dayKey();
  let cells = '';
  for (let i = 0; i < off; i++) cells += '<div class="calc empty"></div>';
  let played = 0, caught = 0;
  for (let d = 1; d <= dim; d++) {
    const k = dayKey(new Date(y, m - 1, d)), r = st.days[k], c = r ? r.c : [], meters = km(k);
    if (r && r.p) played++; caught += c.length;
    const sp = c.length ? SP[c[c.length - 1]] : null;
    cells += `<button class="calc${r && r.p ? ' on' : ''}${k === today ? ' today' : ''}" data-act="calDay" data-day="${k}"${r || meters ? '' : ' disabled'}><b>${d}</b>${sp ? `<span class="calim">${img(sp)}</span>` : ''}${c.length > 1 ? `<small>+${c.length - 1}</small>` : ''}${!c.length && meters >= 100 ? `<small>${(meters / 1000).toFixed(1).replace('.', ',')} km</small>` : ''}</button>`;
  }
  const pm = m === 1 ? [y - 1, 12] : [y, m - 1], nm = m === 12 ? [y + 1, 1] : [y, m + 1];
  return `<h2>Kalendář</h2>
  <div class="calhead"><button class="btn sm" data-act="calMonth" data-y="${pm[0]}" data-m="${pm[1]}" aria-label="Předchozí měsíc">‹</button><b>${esc(MONTH_NAMES[m - 1])} ${y}</b><button class="btn sm" data-act="calMonth" data-y="${nm[0]}" data-m="${nm[1]}" aria-label="Další měsíc">›</button></div>
  ${natureHTML(cfg, y, m, img)}
  <div class="calw">${['Po', 'Út', 'St', 'Čt', 'Pá', 'So', 'Ne'].map(x => `<span>${x}</span>`).join('')}</div>
  <div class="calg">${cells}</div>
  <p class="msg small">Hráno ${played} ${played === 1 ? 'den' : played > 1 && played < 5 ? 'dny' : 'dní'} · chyceno ${caught}. Kalendář se vyplňuje sám.</p>
  <button class="btn full ghost" data-act="close">Zavřít</button>`;
}
export function dayHTML(st, k, { img, km = () => 0, SP = {} }) {
  const r = st.days[k] || { c: [] }, [y, m, d] = k.split('-').map(Number), meters = km(k);
  const list = [...new Set(r.c)].map(id => SP[id]).filter(Boolean);
  return `<h2>${d}. ${esc(MONTH_NAMES[m - 1])} ${y}</h2>${meters >= 100 ? `<p class="msg">Ušel jsi ${(meters / 1000).toFixed(1).replace('.', ',')} km.</p>` : ''}
  ${list.length ? `<div class="grid">${list.map(s => `<div class="acard" data-sp="${esc(s.id)}"><div class="im">${img(s)}</div><div class="nm">${esc(s.name)}</div><div class="rr">×${r.c.filter(x => x === s.id).length}</div></div>`).join('')}</div>` : '<p class="msg small">Ten den sis jen hrál – nic jsi nechytil.</p>'}
  <button class="btn full ghost" data-act="calMonth" data-y="${y}" data-m="${m}">Zpět na kalendář</button>`;
}
