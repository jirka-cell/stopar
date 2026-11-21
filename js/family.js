// Rodina: rodičovská nastavení (režim pro malé děti, bezpečná oblast), události od rodičů sdílené QR kódem nebo odkazem,
// statistiky chůze a sdílení úlovku jako karta bez polohy
import { esc, MONTH_NAMES } from './config.js';
import { qrSVG } from './qr.js';
import { mPerDegLat, mPerDegLon } from './geo.js';

const num = (v, d = 0) => Number.isFinite(Number(v)) ? Number(v) : d;
const pad = n => String(n).padStart(2, '0');
export const dayStr = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

/* ---------- rodičovská nastavení ---------- */
export function cleanParent(p) {
  p = p && typeof p === 'object' ? p : {};
  const b = p.bound && typeof p.bound === 'object' && Number.isFinite(Number(p.bound.lat)) ? { lat: num(p.bound.lat), lon: num(p.bound.lon), r: Math.max(100, Math.min(20000, num(p.bound.r, 1000))) } : null;
  return { kidMode: ['auto', 'on', 'off'].includes(p.kidMode) ? p.kidMode : 'auto', bound: b };
}
export const kidModeOn = (parent, consent) => parent.kidMode === 'on' || (parent.kidMode === 'auto' && !!(consent && consent.young));
export const distM = (a, b) => Math.hypot((a.lat - b.lat) * mPerDegLat, (a.lon - b.lon) * mPerDegLon(a.lat));
export const insideBound = (parent, lat, lon) => !parent.bound || distM(parent.bound, { lat, lon }) <= parent.bound.r;

export function parentHTML(cfg, parent, events, pos) {
  const b = parent.bound;
  return `<h2>Rodičovská nastavení</h2>
  <h3>Režim pro malé děti</h3><p class="msg small">Velká tlačítka, méně textu a chytání bez foto minihry. „Podle věku“ ho zapne u dětí do ${cfg.family.kidAge} let.</p>
  <div class="look"><div class="chips">${[['auto', 'Podle věku'], ['on', 'Zapnuto'], ['off', 'Vypnuto']].map(([k, n]) => `<button class="chip${parent.kidMode === k ? ' on' : ''}" data-act="pKid" data-v="${k}">${n}</button>`).join('')}</div></div>
  <h3>Bezpečná oblast</h3><p class="msg small">Mimo oblast se dítěti neobjevují žádná zvířata a hra ho upozorní.</p>
  ${b ? `<p class="msg">Kruh ${b.r >= 1000 ? (b.r / 1000).toString().replace('.', ',') + ' km' : b.r + ' m'} kolem místa, kde jsi ji nastavil.</p>` : '<p class="msg">Nenastaveno.</p>'}
  <div class="tools">${[500, 1000, 3000].map(r => `<button class="btn sm" data-act="pBound" data-r="${r}"${pos.lat == null ? ' disabled' : ''}>Tady, ${r >= 1000 ? r / 1000 + ' km' : r + ' m'}</button>`).join('')}${b ? '<button class="btn sm danger" data-act="pBound" data-r="0">Zrušit</button>' : ''}</div>
  <h3>Události pro děti</h3><p class="msg small">Výprava s cíli (např. „najdi 3 ptáky u vody“). Pošli ji QR kódem nebo odkazem.</p>
  <button class="btn primary full" data-act="evNew">Vytvořit událost</button>
  ${events.map(e => `<div class="quest"><span><b>${esc(e.n)}</b><br><small>${new Date(e.f).toLocaleDateString('cs-CZ')} – ${new Date(e.t).toLocaleDateString('cs-CZ')}</small></span><button class="btn sm" data-act="evShare" data-id="${esc(e.id)}">QR</button></div>`).join('')}
  <button class="btn full ghost" data-act="close">Zavřít</button>`;
}

/* ---------- události od rodičů ---------- */
// cíl: [druh úkolu, parametr, počet] – stejné druhy jako u úkolů (catch, catchGroup, catchBio, newSpecies, walk, stamp)
export const GOALS = [['catch', 'Chytit zvířata'], ['catchGroup', 'Chytit ze skupiny'], ['catchBio', 'Chytit v biotopu'], ['walk', 'Ujít (m)'], ['stamp', 'Získat razítko'], ['newSpecies', 'Objevit nový druh']];
export function cleanEvent(e) {
  if (!e || typeof e !== 'object') return null;
  const g = (Array.isArray(e.g) ? e.g : []).slice(0, 5).map(x => Array.isArray(x) ? [String(x[0]), String(x[1] ?? '').slice(0, 40), Math.max(1, Math.min(100000, Math.round(num(x[2], 1))))] : null)
    .filter(x => x && GOALS.some(([k]) => k === x[0]));
  const f = num(e.f), t = num(e.t);
  if (!String(e.n || '').trim() || !g.length || !(t > f)) return null;
  return {
    id: String(e.id || f.toString(36)).slice(0, 20), n: String(e.n).slice(0, 60), m: String(e.m || '').slice(0, 200), f, t,
    la: e.la == null ? null : num(e.la), lo: e.lo == null ? null : num(e.lo), r: Math.max(0, Math.min(50000, num(e.r))), g,
    p: Array.isArray(e.p) ? e.p.slice(0, 5).map(v => Math.max(0, num(v))) : g.map(() => 0), done: !!e.done, own: !!e.own
  };
}
// Událost do odkazu: JSON → UTF-8 → base64url (bez průběžného stavu)
// Objekt do odkazu: JSON → UTF-8 → base64url (a zpět; poškozený kód = null)
export function toCode(obj) {
  let s = ''; new TextEncoder().encode(JSON.stringify(obj)).forEach(b => { s += String.fromCharCode(b); });
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}
export function fromCode(code) {
  try { return JSON.parse(new TextDecoder().decode(Uint8Array.from(atob(String(code).replace(/-/g, '+').replace(/_/g, '/')), c => c.charCodeAt(0)))); } catch (err) { return null; }
}
export function encodeEvent(e) { const { id, n, m, f, t, la, lo, r, g } = e; return toCode({ v: 1, id, n, m, f, t, la, lo, r, g }); }
export function decodeEvent(code) { const e = cleanEvent(fromCode(code)); return e && { ...e, p: e.g.map(() => 0), done: false }; }
export const eventLink = (base, e) => base + '#akce=' + encodeEvent(e);
// Posune cíle aktivních událostí; vrátí nově splněné události
export function eventProgress(events, ev, pos, now = Date.now()) {
  const done = [];
  for (const e of events) {
    if (e.done || now < e.f || now > e.t) continue;
    if (e.r && e.la != null && pos.lat != null && distM({ lat: e.la, lon: e.lo }, pos) > e.r) continue;
    e.g.forEach(([k, param, count], i) => {
      let add = 0;
      if (k === 'catchGroup') add = ev.kind === 'catch' && ev.group === param ? 1 : 0;
      else if (k === 'catchBio') add = ev.kind === 'catch' && ev.bio === param ? 1 : 0;
      else if (k === ev.kind) add = num(ev.n, 1);
      e.p[i] = Math.min(count, (e.p[i] || 0) + add);
    });
    if (e.g.every(([, , c], i) => e.p[i] >= c)) { e.done = true; done.push(e); }
  }
  return done;
}
export function eventFormHTML(cfg) {
  const today = dayStr(new Date());
  const goal = i => `<div class="goal"><select id="evK${i}"><option value="">–</option>${GOALS.map(([k, n]) => `<option value="${k}"${i === 0 && k === 'catch' ? ' selected' : ''}>${n}</option>`).join('')}</select>
    <select id="evP${i}"><option value="">(skupina / biotop)</option>${[...new Set(cfg.species.map(s => s.group))].map(g => `<option value="${esc(g)}">${esc(g)}</option>`).join('')}${cfg.biotopes.map(b => `<option value="${esc(b.id)}">${esc(b.name)}</option>`).join('')}</select>
    <input type="number" id="evC${i}" min="1" value="${i === 0 ? 3 : 1}" aria-label="Počet"></div>`;
  return `<h2>Nová událost</h2>
  <div class="fld"><label for="evN">Název</label><input type="text" id="evN" maxlength="60" placeholder="např. Sobotní výprava k rybníku"></div>
  <div class="fld"><label for="evM">Vzkaz pro děti</label><input type="text" id="evM" maxlength="200"></div>
  <div class="lookgrid"><div class="fld"><label for="evF">Od</label><input type="date" id="evF" value="${today}"></div><div class="fld"><label for="evT">Do</label><input type="date" id="evT" value="${today}"></div></div>
  <div class="fld"><label for="evR">Jen v okolí tohoto místa (m, 0 = kdekoli)</label><input type="number" id="evR" min="0" max="50000" value="0"></div>
  <h3>Cíle</h3>${[0, 1, 2].map(goal).join('')}
  <p class="msg small" id="evErr"></p>
  <button class="btn primary full" data-act="evSave">Vytvořit a sdílet</button><button class="btn full ghost" data-act="parent">Zpět</button>`;
}
export function eventShareHTML(e, link) {
  let qr = '';
  try { qr = qrSVG(link, 4); } catch (err) { qr = '<p class="msg">Událost je na QR kód moc dlouhá – pošli odkaz.</p>'; }
  return `<h2>${esc(e.n)}</h2><p class="msg small">Načti QR kód fotoaparátem telefonu dítěte, nebo pošli odkaz.</p>
  <div class="qr">${qr}</div>
  <button class="btn full" data-act="evLink">Sdílet odkaz</button><button class="btn full ghost" data-act="parent">Zpět</button>`;
}
export const goalText = ([k, p, c], cfg) => {
  const name = (GOALS.find(g => g[0] === k) || [, k])[1];
  const pn = (cfg.biotopes.find(b => b.id === p) || {}).name || p;
  return k === 'walk' ? `Ujít ${(c / 1000).toString().replace('.', ',')} km` : `${name}${p ? ' (' + pn + ')' : ''}: ${c}×`;
};
export function eventsListHTML(cfg, events) {
  const now = Date.now(), list = events.filter(e => now <= e.t + 86400000 * 7);
  return list.length ? `<h3>Události od rodičů</h3>${list.map(e => `<div class="album${e.done ? ' done' : ''}" style="display:block"><b>${esc(e.n)}</b>${e.done ? ' ✔' : now < e.f ? ' (začne ' + new Date(e.f).toLocaleDateString('cs-CZ') + ')' : ''}${e.m ? `<br><small>${esc(e.m)}</small>` : ''}${e.g.map((g, i) => `<div class="kv">${esc(goalText(g, cfg))} – ${Math.min(e.p[i] || 0, g[2])} / ${g[2]}</div>`).join('')}</div>`).join('')}` : '';
}

/* ---------- statistiky chůze ---------- */
export function cleanWalkDays(w) {
  return Object.fromEntries(Object.entries(w && typeof w === 'object' ? w : {}).filter(([k]) => /^\d{4}-\d\d-\d\d$/.test(k)).slice(-400).map(([k, v]) => [k, Math.max(0, Math.round(num(v)))]));
}
export function walkHTML(days, now = new Date()) {
  const last = [];
  for (let i = 13; i >= 0; i--) { const d = new Date(now); d.setDate(d.getDate() - i); last.push([d, days[dayStr(d)] || 0]); }
  const max = Math.max(1000, ...last.map(x => x[1])), vals = Object.values(days), total = vals.reduce((a, b) => a + b, 0);
  const best = Object.entries(days).sort((a, b) => b[1] - a[1])[0];
  const km = m => (m / 1000).toFixed(1).replace('.', ',');
  return `<h3>Chůze</h3><div class="walk" role="img" aria-label="Ujité km za posledních 14 dní">${last.map(([d, m]) => `<div title="${d.getDate()}. ${MONTH_NAMES[d.getMonth()]}: ${km(m)} km"><i style="height:${Math.round(m / max * 100)}%"></i><small>${d.getDate()}</small></div>`).join('')}</div>
  <p class="msg small">Celkem ${km(total)} km · aktivních dní ${vals.filter(v => v > 0).length}${best ? ` · nejdelší výlet ${km(best[1])} km (${new Date(best[0]).toLocaleDateString('cs-CZ')})` : ''}</p>`;
}

/* ---------- karta úlovku ---------- */
// Obrázek karty (bez polohy) – jde sdílet přes Web Share API nebo stáhnout
export async function cardBlob(imgURL, title, sub, stats) {
  const c = document.createElement('canvas'); c.width = 600; c.height = 800;
  const x = c.getContext('2d');
  x.fillStyle = '#f6f3ec'; x.fillRect(0, 0, 600, 800);
  x.fillStyle = '#2f7d4f'; x.fillRect(0, 0, 600, 70);
  x.fillStyle = '#fff'; x.font = 'bold 34px system-ui, sans-serif'; x.fillText('Stopař', 24, 48);
  const im = new Image(); im.src = imgURL; await im.decode().catch(() => {});
  try { x.drawImage(im, 60, 100, 480, 420); } catch (e) {}
  x.fillStyle = '#24301f'; x.font = 'bold 38px system-ui, sans-serif'; x.fillText(title, 30, 580);
  x.font = 'italic 24px system-ui, sans-serif'; x.fillStyle = '#6b7466'; x.fillText(sub, 30, 616);
  stats.forEach(([n, v], i) => { const y = 660 + i * 32; x.fillStyle = '#24301f'; x.font = '22px system-ui, sans-serif'; x.fillText(n, 30, y); x.fillStyle = '#e2ddd1'; x.fillRect(200, y - 16, 340, 14); x.fillStyle = '#2f7d4f'; x.fillRect(200, y - 16, Math.min(340, v * 3.4), 14); });
  return new Promise(res => c.toBlob(res, 'image/png'));
}
