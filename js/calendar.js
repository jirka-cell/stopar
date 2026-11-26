// Můj kalendář: sám zapisuje dny, kdy jsem hrál, a co jsem ten den chytil; nad měsícem co se v přírodě děje.
import { esc, parseMonths, MONTH_NAMES } from './config.js';
import { activeEvents } from './world.js';
import { icOr } from './icons.js';

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
// Řada dní v kuse: hrané dny zpět od dneška; v každém měsíci se smí vynechat nejvýš `skip` dní (výchozí 3)
export function streak(days, today = new Date(), skip = 3) {
  const d = new Date(today.getFullYear(), today.getMonth(), today.getDate()), miss = {};
  let n = 0;
  for (let i = 0; i < 1000; i++) {
    const k = dayKey(d), r = days[k];
    if (r && r.p) n++;
    else if (i > 0) { const mk = k.slice(0, 7); miss[mk] = (miss[mk] || 0) + 1; if (miss[mk] > skip) break; } // dnešek ještě není prohraný
    d.setDate(d.getDate() - 1);
  }
  return n;
}
export function markPlayed(days, d = new Date()) { const k = dayKey(d); days[k] = days[k] || { p: 0, c: [] }; days[k].p = 1; }
export function addCatch(days, spId, d = new Date()) { const k = dayKey(d); days[k] = days[k] || { p: 1, c: [] }; days[k].p = 1; if (days[k].c.length < 40) days[k].c.push(String(spId)); }

// Co se v přírodě děje v měsíci (krátce): text z nastavení, události, nově se objevují
function natureHTML(cfg, y, m, img) {
  const act = cfg.species.filter(s => s.active), prev = m === 1 ? 12 : m - 1;
  const fresh = act.filter(s => { const ms = parseMonths(s.months); return ms.size < 12 && ms.has(m) && !ms.has(prev); }).slice(0, 8);
  const text = (cfg.calendar.find(c => String(c.id) === String(m)) || {}).text || '';
  const ev = activeEvents(cfg, new Date(y, m - 1, 15));
  return `<div class="calnat">${text ? `<p>${esc(text)}</p>` : ''}${ev.length ? `<p class="calev">${ev.map(e => icOr('fest', '') + ' ' + esc(e.name)).join(' · ')}</p>` : ''}
    ${fresh.length ? `<div class="calfresh"><small>Nově se objevují</small><div>${fresh.map(s => `<span title="${esc(s.name)}">${img(s)}</span>`).join('')}</div></div>` : ''}</div>`;
}
// img(sp) = HTML obrázku druhu, km(den) = metry ušlé ten den
export function myCalendarHTML(cfg, st, y, m, { img, km = () => 0, SP = {}, skip = 3 }) {
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
  const rada = streak(st.days, new Date(), skip);
  return `<h2>Kalendář</h2>
  <div class="calhead"><button class="btn sm" data-act="calMonth" data-y="${pm[0]}" data-m="${pm[1]}" aria-label="Předchozí měsíc">‹</button><b>${esc(MONTH_NAMES[m - 1])} ${y}</b><button class="btn sm" data-act="calMonth" data-y="${nm[0]}" data-m="${nm[1]}" aria-label="Další měsíc">›</button></div>
  ${natureHTML(cfg, y, m, img)}
  <div class="calw">${['Po', 'Út', 'St', 'Čt', 'Pá', 'So', 'Ne'].map(x => `<span>${x}</span>`).join('')}</div>
  <div class="calg">${cells}</div>
  <p class="msg small">Hráno ${played} ${played === 1 ? 'den' : played > 1 && played < 5 ? 'dny' : 'dní'} · chyceno ${caught}. Kalendář se vyplňuje sám.</p>
  <p class="msg"><b>Řada: ${rada} ${rada === 1 ? 'den' : rada > 1 && rada < 5 ? 'dny' : 'dní'}</b> v kuse <small>(v měsíci můžeš ${skip}× vynechat)</small></p>
  <button class="btn full ghost" data-act="close">Zavřít</button>`;
}
export function dayHTML(st, k, { img, km = () => 0, SP = {}, badges = [] }) {
  const r = st.days[k] || { c: [] }, [y, m, d] = k.split('-').map(Number), meters = km(k);
  const list = [...new Set(r.c)].map(id => SP[id]).filter(Boolean);
  const got = [...badges.filter(b => st.badges[b.id] && dayKey(new Date(st.badges[b.id])) === k), ...Object.values(st.stamps || {}).filter(s => dayKey(new Date(s.d)) === k).map(s => ({ icon: '', name: s.n }))]; // i odznaky míst
  const notes = (st.journal || []).filter(e => dayKey(new Date(e.date)) === k);
  const extra = (got.length ? `<h3>Odznaky</h3><p class="msg">${got.map(b => esc(b.icon + ' ' + b.name)).join(' · ')}</p>` : '')
    + (notes.length ? `<h3>Deník</h3>${notes.map(e => `<div class="quest"><span><b>${esc((e.sp && SP[e.sp] ? SP[e.sp].name : e.name) || 'Neznámý druh')}</b>${e.note ? `<br><small>${esc(e.note)}</small>` : ''}</span><span>${e.photo != null ? icOr('photo', '📷') : ''}</span></div>`).join('')}` : '');
  return `<h2>${d}. ${esc(MONTH_NAMES[m - 1])} ${y}</h2>${meters >= 100 ? `<p class="msg">Ušel jsi ${(meters / 1000).toFixed(1).replace('.', ',')} km.</p>` : ''}
  ${list.length ? `<div class="grid">${list.map(s => `<div class="acard" data-sp="${esc(s.id)}"><div class="im">${img(s)}</div><div class="nm">${esc(s.name)}</div><div class="rr">×${r.c.filter(x => x === s.id).length}</div></div>`).join('')}</div>` : '<p class="msg small">Ten den sis jen hrál – nic jsi nechytil.</p>'}
  ${extra}
  <button class="btn full ghost" data-act="calMonth" data-y="${y}" data-m="${m}">Zpět na kalendář</button>`;
}
