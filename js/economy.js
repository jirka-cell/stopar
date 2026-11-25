// Ekonomika: šišky za chůzi a úkoly, obchod, vypouštění zvířat do přírody za body, trénink a vývojová stádia
import { esc, parseMap } from './config.js';
import { icId } from './icons.js';
import { power } from './collection.js';

const num = (v, d = 0) => Number.isFinite(Number(v)) ? Number(v) : d;

/* ---------- vývojová stádia ---------- */
// Admin: řádek „Skupina: stádium, stádium, …“, výchozí řádek bez skupiny
export function stageNames(cfg, group) {
  let def = ['mládě', 'dospělý', 'mistr'];
  for (const line of String(cfg.game.stages || '').split('\n')) {
    const m = /^\s*([^:]*):\s*(.+)$/.exec(line); if (!m) continue;
    const names = m[2].split(',').map(s => s.trim()).filter(Boolean);
    if (names.length < 2) continue;
    if (!m[1].trim()) def = names; else if (m[1].trim() === group) return names;
  }
  return def;
}
// Co je potřeba na další stádium: šišky (cena × pořadí stádia)
export function evolveNeed(cfg, a) {
  return { cones: Math.round(num(cfg.game.evolveCost, 100) * (a.stage + 1)) };
}
export const isMaster = (cfg, a, group) => a.stage >= stageNames(cfg, group).length - 1;
export function evolve(cfg, st, a, group) {
  if (isMaster(cfg, a, group)) return 'max';
  const n = evolveNeed(cfg, a);
  if (st.cones < n.cones) return 'cones';
  st.cones -= n.cones; a.stage++;
  st.counters.evolved++;
  return 'ok';
}

/* ---------- trénink a krmení ---------- */
// Trénink v závodech: za dobrý výkon (šikovnost ≥ 50 %) +trainGain k vlastnosti hry, sdílí denní limit s tréninkem za šišky
export function trainStat(cfg, a, si, skill, day, maxStat = 100) {
  const G = cfg.game;
  if (a.trainedOn !== day) { a.trainedOn = day; a.trainedToday = 0; }
  if (a.trainedToday >= num(G.trainPerDay, 3)) return 'limit';
  if (skill < 0.5) return 'weak';
  a.trainedToday++; a.axp += num(G.trainXp, 10);
  a.stats[si] = Math.min(maxStat, (a.stats[si] || 0) + num(G.trainGain, 2));
  return 'ok';
}
// Trénink: za šišky, nejvýš trainPerDay× denně na jedince; přidá XP jedince a zvedne nejslabší vlastnost
export function train(cfg, st, a, day) {
  const G = cfg.game;
  if (a.trainedOn !== day) { a.trainedOn = day; a.trainedToday = 0; }
  if (a.trainedToday >= num(G.trainPerDay, 3)) return 'limit';
  if (st.cones < num(G.trainCost, 20)) return 'cones';
  st.cones -= num(G.trainCost, 20); a.trainedToday++;
  a.axp += num(G.trainXp, 10);
  const i = a.stats.indexOf(Math.min(...a.stats));
  if (i >= 0) a.stats[i] += num(G.trainGain, 2);
  return 'ok';
}

/* ---------- vypuštění do přírody ---------- */
export function releaseValue(cfg, sp, a) {
  const mult = num(parseMap(cfg.game.releaseRarity)[String(sp.rarity)], 1);
  return Math.max(1, Math.round(num(cfg.game.releaseBase, 10) * mult * (1 + a.stage) * (a.variant ? 3 : 1)));
}
export function release(cfg, st, a, sp) {
  const i = st.animals.indexOf(a); if (i < 0) return 0;
  const v = releaseValue(cfg, sp, a);
  st.animals.splice(i, 1); st.cones += v; st.counters.released++;
  return v;
}

/* ---------- obchod ---------- */
export function buy(cfg, st, id) {
  const it = cfg.shop.find(x => x.id === id); if (!it) return 'none';
  if (st.cones < num(it.price)) return 'cones';
  st.cones -= num(it.price); st.inv[id] = (st.inv[id] || 0) + 1;
  return 'ok';
}
// Spotřebuje kus z batohu; vrátí předmět nebo null
export function useItem(cfg, st, id) {
  const it = cfg.shop.find(x => x.id === id);
  if (!it || !(st.inv[id] > 0)) return null;
  if (--st.inv[id] <= 0) delete st.inv[id];
  return it;
}
export const invOf = (cfg, st, effect) => cfg.shop.filter(it => it.effect === effect && st.inv[it.id] > 0);
export function cleanInv(inv) {
  return Object.fromEntries(Object.entries(inv && typeof inv === 'object' ? inv : {}).map(([k, v]) => [String(k).slice(0, 40), Math.max(0, Math.round(num(v)))]).filter(([, v]) => v > 0));
}

/* ---------- zobrazení ---------- */
// Postup k dalšímu stádiu: kroužek (koláč), hvězdičky nebo proužek – volba v adminu
function stageInfo(cfg, a, group) {
  const names = stageNames(cfg, group), master = isMaster(cfg, a, group);
  const p = master ? 1 : a.stage / Math.max(1, names.length - 1);
  return { p, label: master ? names[a.stage] : `${names[a.stage]} → ${names[a.stage + 1]}: ${evolveNeed(cfg, a).cones} šišek` };
}
// Kroužek postupu (podíl dosažených stádií) do pravého dolního rohu obrázku zvířete
export function stageRingHTML(cfg, a, group) {
  if (cfg.game.progressStyle !== 'stars' && cfg.game.progressStyle !== 'bar') { const { p, label } = stageInfo(cfg, a, group); return `<span class="ring encring" style="--p:${Math.round(p * 100)}%" role="img" aria-label="${esc(label)}"></span>`; }
  return '';
}
export function stageProgressHTML(cfg, a, group) {
  const { p, label } = stageInfo(cfg, a, group);
  const style = cfg.game.progressStyle;
  if (style === 'stars') return `<div class="stage" title="${esc(label)}"><span class="stars5">${'★'.repeat(Math.round(p * 5))}${'☆'.repeat(5 - Math.round(p * 5))}</span> <small>${esc(label)}</small></div>`;
  if (style === 'bar') return `<div class="stage"><div class="prog"><div style="width:${p * 100}%"></div></div><small>${esc(label)}</small></div>`;
  return `<div class="stage"><small>${esc(label)}</small></div>`; // kroužek je v rohu obrázku (stageRingHTML)
}

export function animalActionsHTML(cfg, st, a, sp, can) {
  const names = stageNames(cfg, sp.group), master = isMaster(cfg, a, sp.group), n = evolveNeed(cfg, a);
  let h = stageProgressHTML(cfg, a, sp.group) + '<div class="tools">';
  h += master ? `<button class="btn sm" disabled>${esc(names[a.stage])} – nejvyšší stádium</button>`
    : `<button class="btn sm${st.cones >= n.cones ? ' primary' : ''}" data-act="evolve">Vyvinout na ${esc(names[a.stage + 1])} (${n.cones} ${cone})</button>`;
  h += `<button class="btn sm" data-act="release" data-confirm="Opravdu vypustit? Ťukni znovu">Vypustit do přírody (+${releaseValue(cfg, sp, a)} ${cone})</button>`;
  return h + '</div>';
}

const cone = '<svg class="cone" viewBox="0 0 20 24" aria-hidden="true"><path d="M10 1C6 4 3 9 3 14c0 5 3 9 7 9s7-4 7-9c0-5-3-10-7-13z" fill="#9a6a3a"/><path d="M5 10h10M4 14h12M5 18h10M10 3v19" stroke="#6a4424" stroke-width="1.2" fill="none"/></svg>';
export const coneIcon = cone;
export function shopHTML(cfg, st, can) {
  const inv = Object.entries(st.inv).map(([id, n]) => { const it = cfg.shop.find(x => x.id === id); return it ? `<span class="chip">${icId(it.id, esc(it.icon))} ${esc(it.name)} × ${n}</span>` : ''; }).join('');
  return `<h2>Obchod</h2><p class="msg">${cone} <b>${Math.floor(st.cones)}</b> šišek · 📖 <b>${Math.floor(st.points)}</b> vědomostí</p>
  <p class="msg small">Šišky dostáváš za ujité km a úkoly. Vědomosti za to, co se naučíš (kvízy, stopy, úkoly u krmítek, deník, nové druhy) – jsou na vývoj zvířat.</p>
  ${inv ? `<h3>Batoh</h3><div class="chips">${inv}</div>` : ''}
  ${can('shop') ? `<h3>Nabídka</h3>${cfg.shop.map(it => `<div class="shopit"><span class="aic" aria-hidden="true">${icId(it.id, esc(it.icon))}</span><span><b>${esc(it.name)}</b><br><small>${esc(it.desc)}</small></span><button class="btn sm" data-act="buy" data-item="${esc(it.id)}"${st.cones < num(it.price) ? ' disabled' : ''}>${num(it.price)} ${cone}</button></div>`).join('')}`
    : `<p class="msg">Obchod se otevře na úrovni ${can.level('shop')}.</p>`}
  ${invOf(cfg, st, 'radius').map(it => `<button class="btn full" data-act="useItem" data-item="${esc(it.id)}">Použít: ${icId(it.id, esc(it.icon))} ${esc(it.name)}</button>`).join('')}
  <button class="btn full ghost" data-act="close">Zavřít</button>`;
}
