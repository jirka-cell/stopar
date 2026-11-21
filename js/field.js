// Poznávání v terénu: stopy a pobytová znamení na mapě, určovací klíč bez AI, deník skutečných pozorování
import { esc, parseMap, MONTH_NAMES } from './config.js';
import { birdImg } from './birds.js';
import { groupIcon } from './collection.js';

const num = (v, d = 0) => Number.isFinite(Number(v)) ? Number(v) : d;
export const hasSigns = sp => !!String((sp.edu || {}).signs || '').trim();

/* ---------- stopy ---------- */
// Místo zvířete jen jeho stopa (deterministicky z hashe buňky, jen u druhů s popsanými znameními)
export const isTrack = (cfg, sp, h) => hasSigns(sp) && h < num(cfg.field.trackChance, 0.25);
// Tři možnosti: správný druh a dva jiné druhy se znameními (nejdřív ze stejné skupiny)
export function trackQuiz(sp, all, rand = Math.random) {
  const others = all.filter(o => o.active && o.id !== sp.id && hasSigns(o));
  const same = others.filter(o => o.group === sp.group).sort(() => rand() - .5), rest = others.filter(o => o.group !== sp.group).sort(() => rand() - .5);
  const opts = [sp, ...[...same, ...rest].slice(0, 2)].sort(() => rand() - .5);
  return { sign: sp.edu.signs, opts: opts.map(o => o.id), correct: opts.indexOf(sp) };
}
export function trackHTML(z, SP) {
  return `<div class="encimg track"><span aria-hidden="true">🐾</span></div><h2>Čí je to stopa?</h2>
  <div class="fact">${esc(z.sign)}</div>
  <div class="grid">${z.opts.map((id, i) => `<button class="acard" data-act="trackAns" data-i="${i}"><div class="im">${birdImg(SP[id])}</div><div class="nm">${esc(SP[id].name)}</div></button>`).join('')}</div>
  <button class="btn full ghost" data-act="close">Nechat být</button>`;
}

/* ---------- určovací klíč ---------- */
// Velikost z textu „11–12 cm“, „1–1,3 m“, „20–25 cm + ocas…“ → cm (první číslo)
export function sizeCm(s) {
  const m = /(\d+(?:[.,]\d+)?)\s*(?:[–-]\s*\d+(?:[.,]\d+)?)?\s*(mm|cm|m)\b/.exec(String(s || ''));
  if (!m) return null;
  const v = parseFloat(m[1].replace(',', '.'));
  return m[2] === 'mm' ? v / 10 : m[2] === 'm' ? v * 100 : v;
}
export const SIZES = [['small', 'Malý', 'menší než dlaň (do 15 cm)', 0, 15], ['mid', 'Střední', 'jako kočka (15–50 cm)', 15, 50], ['big', 'Velký', 'větší než 50 cm', 50, 1e9]];
// Kroky klíče; odpovědi zužují seznam druhů
export const KEY_STEPS = ['group', 'bio', 'size', 'time'];
export function keyFilter(all, ans) {
  return all.filter(s => s.active
    && (!ans.group || (s.group || 'Ostatní') === ans.group)
    && (!ans.bio || num(parseMap(s.bio)[ans.bio]) > 0)
    && (!ans.size || (() => { const c = sizeCm(s.edu && s.edu.length), z = SIZES.find(x => x[0] === ans.size); return c == null || (c >= z[3] && c < z[4]); })())
    && (!ans.time || (ans.time === 'night') === !!s.night));
}
export function keyHTML(cfg, ans, SP) {
  const left = keyFilter(cfg.species, ans), step = KEY_STEPS.find(k => !(k in ans));
  const opt = (k, v, icon, label, sub = '') => `<button class="acard keyopt" data-act="keyAns" data-k="${k}" data-v="${esc(v)}"><div class="kic" aria-hidden="true">${icon}</div><div class="nm">${esc(label)}</div>${sub ? `<div class="rr">${esc(sub)}</div>` : ''}</button>`;
  let q = '';
  if (step === 'group') q = `<h3>Co jsi viděl?</h3><div class="grid">${[...new Set(cfg.species.filter(s => s.active).map(s => s.group || 'Ostatní'))].map(g => opt('group', g, groupIcon(g), g)).join('')}</div>`;
  else if (step === 'bio') q = `<h3>Kde?</h3><div class="grid">${cfg.biotopes.filter(b => left.some(s => num(parseMap(s.bio)[b.id]) > 0)).map(b => opt('bio', b.id, `<i style="background:${esc(b.color)}"></i>`, b.name)).join('')}</div>`;
  else if (step === 'size') q = `<h3>Jak velký?</h3><div class="grid">${SIZES.map(z => opt('size', z[0], ['🐭', '🐈', '🦌'][SIZES.indexOf(z)], z[1], z[2])).join('')}</div>`;
  else if (step === 'time') q = `<h3>Kdy?</h3><div class="grid">${opt('time', 'day', '☀️', 'Ve dne')}${opt('time', 'night', '🌙', 'V noci nebo za šera')}</div>`;
  return `<h2>Určovací klíč</h2><p class="msg small">Odpovídej, co jsi viděl. Možných druhů: ${left.length}.</p>
  ${left.length && step && left.length > 1 ? q : ''}
  ${left.length && (!step || left.length <= 6) ? `<h3>${left.length === 1 ? 'Je to asi:' : 'Může to být:'}</h3><div class="grid">${left.map(s => `<button class="acard" data-act="keyPick" data-sp="${esc(s.id)}"><div class="im">${birdImg(s)}</div><div class="nm">${esc(s.name)}</div></button>`).join('')}</div>` : ''}
  ${!left.length ? '<p class="msg">Žádný druh z atlasu neodpovídá. Zkus to znovu, nebo ho zapiš do deníku jako neznámý.</p>' : ''}
  <div class="tools">${Object.keys(ans).length ? '<button class="btn sm" data-act="keyBack">Krok zpět</button><button class="btn sm" data-act="keyReset">Začít znovu</button>' : ''}</div>
  <button class="btn full ghost" data-act="menu">Zpět</button>`;
}

/* ---------- deník pozorování ---------- */
// Skutečná pozorování (oddělená od herních úlovků): druh nebo vlastní název, čas, poznámka, fotka, místo na ~100 m
export function cleanJournal(j) {
  return (Array.isArray(j) ? j : []).filter(e => e && typeof e === 'object').slice(-5000).map(e => ({
    id: String(e.id || '').slice(0, 30) || String(num(e.date)), sp: String(e.sp || '').slice(0, 60), name: String(e.name || '').slice(0, 60),
    date: num(e.date), note: String(e.note || '').slice(0, 500), photo: e.photo == null ? null : num(e.photo),
    lat: e.lat == null ? null : Math.round(num(e.lat) * 1000) / 1000, lon: e.lon == null ? null : Math.round(num(e.lon) * 1000) / 1000
  }));
}
export const entryName = (e, SP) => (e.sp && SP[e.sp] ? SP[e.sp].name : e.name) || 'Neznámý druh';
export function journalHTML(st, SP, year = new Date().getFullYear()) {
  const list = st.journal.slice().sort((a, b) => b.date - a.date);
  const yr = list.filter(e => new Date(e.date).getFullYear() === year);
  const kinds = new Set(yr.map(e => e.sp || e.name));
  const byMonth = {};
  for (const e of list) { const d = new Date(e.date), k = d.getFullYear() + ' ' + MONTH_NAMES[d.getMonth()]; (byMonth[k] ||= []).push(e); }
  return `<h2>Deník pozorování</h2><p class="msg small">Skutečná zvířata, která jsi viděl venku. Zůstává jen v tomto telefonu.</p>
  <div class="tools"><div class="album"><b>Letos</b><small>${yr.length} pozorování</small></div><div class="album"><b>Druhů</b><small>${kinds.size}</small></div></div>
  <button class="btn primary full" data-act="jNew">Zapsat pozorování</button>
  ${Object.entries(byMonth).map(([m, es]) => `<h3>${esc(m)}</h3>${es.map(e => `<div class="quest"><span><b>${esc(entryName(e, SP))}</b>${e.note ? `<br><small>${esc(e.note)}</small>` : ''}</span><span><small>${new Date(e.date).toLocaleString('cs-CZ', { day: 'numeric', month: 'numeric', hour: '2-digit', minute: '2-digit' })}${e.photo != null ? ' 📷' : ''}</small> <button class="btn sm ghost" data-act="jDel" data-id="${esc(e.id)}" data-confirm="Smazat?" aria-label="Smazat záznam">✕</button></span></div>`).join('')}`).join('') || '<p class="msg">Zatím prázdný.</p>'}
  <button class="btn full ghost" data-act="menu">Zpět</button>`;
}
export function journalFormHTML(cfg, pre = '') {
  const sps = cfg.species.filter(s => s.active).slice().sort((a, b) => a.name.localeCompare(b.name, 'cs'));
  return `<h2>Nové pozorování</h2>
  <div class="fld"><label for="jSp">Druh</label><select id="jSp"><option value="">– jiný nebo neznámý –</option>${sps.map(s => `<option value="${esc(s.id)}"${s.id === pre ? ' selected' : ''}>${esc(s.name)}</option>`).join('')}</select></div>
  <div class="fld"><label for="jName">Vlastní název (když druh není v seznamu)</label><input type="text" id="jName" maxlength="60"></div>
  <div class="fld"><label for="jNote">Poznámka (co dělal, kolik jich bylo…)</label><textarea id="jNote" maxlength="500"></textarea></div>
  <label class="btn full">Přidat fotku<input type="file" accept="image/*" capture="environment" id="jPhoto" hidden></label>
  <p class="msg small" id="jInfo">Uloží se čas a místo (přibližně na 100 m).</p>
  <button class="btn primary full" data-act="jSave">Uložit</button><button class="btn full ghost" data-act="journal">Zpět</button>`;
}
