// Atlas – pomocníci pro přehledné Druhy: hashtagy z dat, pruh měsíců, barva biotopu za zvířetem, řazení
import { esc, parseMap, parseMonths } from './config.js';

const has = (map, ids) => ids.some(k => Number(map[k]) > 0);
// Hashtagy se tvoří samy z dat druhu (nic se nepíše ručně); ťuk = filtr v atlasu
export function tagsFor(sp) {
  const bio = parseMap(sp.bio), food = parseMap(sp.food), m = parseMonths(sp.months), e = sp.edu || {}, t = [];
  if (sp.night) t.push('noční');
  if (m.size && m.size < 12) { const winter = [12, 1, 2].filter(x => m.has(x)).length; if (!winter) t.push('tažný'); else if (winter === 3 && m.size <= 6) t.push('zimní_host'); }
  if (String(sp.rarity) === '3') t.push('vzácný');
  if (/chrán|ohrožen/i.test(e.protection || '')) t.push('chráněný');
  if (has(bio, ['voda', 'mokrad'])) t.push('u_vody');
  if (has(bio, ['les', 'park'])) t.push('v_lese');
  if (has(bio, ['mesto', 'vesnice'])) t.push('ve_městě');
  if (has(bio, ['louka', 'pole', 'sad'])) t.push('na_louce');
  if (has(bio, ['skaly'])) t.push('na_skalách');
  if (has(food, ['hmyz', 'larvy'])) t.push('hmyzožravec');
  if (has(food, ['hlodavec', 'ryba', 'maso', 'zaby'])) t.push('lovec');
  if (has(food, ['listi', 'rostliny', 'zrni', 'korinky', 'rasy']) && !has(food, ['hmyz', 'hlodavec', 'ryba', 'maso', 'zaby', 'larvy', 'zizaly', 'slimaci'])) t.push('býložravec');
  return t;
}
export const tagChips = (tags, on = new Set()) => `<div class="tags">${tags.map(t => `<button class="tag${on.has(t) ? ' on' : ''}" data-tag="${esc(t)}">#${esc(t)}</button>`).join('')}</div>`;

// Hlavní biotop (největší váha) → barva akvarelové skvrny za zvířetem
export function bioColor(sp, BIO) {
  const best = Object.entries(parseMap(sp.bio)).sort((a, b) => Number(b[1]) - Number(a[1]))[0];
  return (best && BIO[best[0]] && BIO[best[0]].color) || '#a9c79a';
}
// Pruh 12 měsíců: kdy je druh u nás
export function monthsBar(sp) {
  const m = parseMonths(sp.months), all = !m.size;
  return `<div class="mbar" aria-label="Kdy je u nás">${'LÚBDKČČSZŘLP'.split('').map((l, i) => `<span class="${all || m.has(i + 1) ? 'on' : ''}">${l}</span>`).join('')}</div>`;
}
export const SORTS = [['new', 'Nově chycené'], ['group', 'Podle skupin'], ['az', 'Od A do Z'], ['rare', 'Nejvzácnější'], ['count', 'Nejčastěji chycené']];
// Řazení: chycené podle zvoleného klíče, nechycené vždy na konci
export function sortSpecies(list, st, how) {
  const c = s => st.caught[s.id], ok = s => !!(c(s) && c(s).count), last = s => (c(s) && c(s).best && c(s).best.date) || 0;
  const key = { new: (a, b) => last(b) - last(a), az: (a, b) => a.name.localeCompare(b.name, 'cs'), rare: (a, b) => Number(b.rarity) - Number(a.rarity) || a.name.localeCompare(b.name, 'cs'), count: (a, b) => (c(b)?.count || 0) - (c(a)?.count || 0) }[how];
  const done = list.filter(ok), miss = list.filter(s => !ok(s));
  return key ? [...done.sort(key), ...miss] : [...done, ...miss];
}
