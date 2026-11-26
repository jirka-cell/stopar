// Sbírka: každý úlovek je samostatný jedinec (druh, stádium, datum), roztříděný podle skupiny
import { esc } from './config.js';
import { icId } from './icons.js';
import { birdImg } from './birds.js';
import { stageNames } from './economy.js';

// Ikony skupin pro obrázkové třídění (zástupné, dokud nebudou ikony z kroku 2.6)
export const GROUP_ICON = { 'Ptáci': '🐦', 'Savci': '🐾', 'Ryby': '🐟', 'Obojživelníci': '🐸', 'Plazi': '🦎', 'Hmyz': '🦋', 'Pavoukovci': '🕷️', 'Měkkýši': '🐌', 'Ostatní': '🌿' };
export const groupIcon = g => GROUP_ICON[g] || GROUP_ICON['Ostatní'];

const num = (v, d = 0) => Number.isFinite(Number(v)) ? Number(v) : d;
export const power = a => (a.stats || []).reduce((x, y) => x + num(y), 0);

let seq = 0;
export function animalFrom(spId, stats, q, bio, now = Date.now()) {
  return { uid: now.toString(36) + '-' + (seq++).toString(36) + Math.floor(Math.random() * 1296).toString(36), sp: spId, stats: stats.slice(), q: num(q), date: now, bio: String(bio ?? ''), stage: 0, trained: 0, variant: '', axp: 0 };
}

// Jedinec ze zálohy nebo starého uložení je nedůvěryhodný: jen známá pole se správnými typy
export function cleanAnimal(a) {
  if (!a || typeof a !== 'object' || !a.sp) return null;
  return {
    uid: String(a.uid || animalFrom(a.sp, [], 0, '').uid).slice(0, 40), sp: String(a.sp).slice(0, 60),
    stats: Array.isArray(a.stats) ? a.stats.map(v => num(v)) : [], q: num(a.q), date: num(a.date), bio: String(a.bio ?? '').slice(0, 40),
    stage: Math.max(0, Math.round(num(a.stage))), from: Math.max(0, Math.min(Math.round(num(a.stage)), Math.round(num(a.from)))), trained: Math.max(0, Math.round(num(a.trained))), variant: String(a.variant ?? '').slice(0, 20), axp: Math.max(0, num(a.axp)),
    ...(a.nick && cleanNick(a.nick) ? { nick: cleanNick(a.nick) } : {}),
    ...(a.trainedOn ? { trainedOn: String(a.trainedOn).slice(0, 10), trainedToday: Math.max(0, Math.round(num(a.trainedToday))) } : {})
  };
}

// Starší uložení měla jen nejlepší kus druhu → z něj se stane první jedinec
export function migrateAnimals(state) {
  if (Array.isArray(state.animals)) return state;
  state.animals = Object.entries(state.caught || {}).filter(([, c]) => c && c.count && c.best)
    .map(([id, c]) => Object.assign(animalFrom(id, c.best.stats || [], c.best.q, c.best.bio, c.best.date || Date.now()), { uid: 'm-' + id }));
  return state;
}

// Přidá jedince; když je druhů plno, nahradí nejslabšího (jen když je nový silnější), jinak ho pustí
export function addAnimal(state, a, max) {
  const same = state.animals.filter(x => x.sp === a.sp);
  if (same.length < max) { state.animals.push(a); return { kept: true }; }
  const weakest = same.reduce((w, x) => power(x) < power(w) ? x : w);
  if (power(a) <= power(weakest)) return { released: true };
  state.animals[state.animals.indexOf(weakest)] = a;
  return { kept: true, replaced: weakest };
}

export function enclosureOf(cfg, group) {
  const g = group || 'Ostatní';
  return cfg.enclosures.find(e => String(e.groups || '').split(',').map(s => s.trim()).includes(g)) || cfg.enclosures[cfg.enclosures.length - 1] || { id: '', name: 'Sbírka', icon: '' };
}

export const SORTS = [['new', 'Nejnovější'], ['stage', 'Nejvyvinutější'], ['species', 'Podle druhu']];
export function sortAnimals(list, by, SP) {
  const l = list.slice();
  if (by === 'stage' || by === 'power') l.sort((a, b) => b.stage - a.stage || b.date - a.date);
  else if (by === 'species') l.sort((a, b) => String(SP[a.sp]?.name || a.sp).localeCompare(String(SP[b.sp]?.name || b.sp), 'cs') || power(b) - power(a));
  else l.sort((a, b) => b.date - a.date);
  return l;
}

// Hvězdy podle stádia: poslední tři stádia = 1–3 hvězdy (mládě/dospělý/mistr); larva u 4 stádií je bez hvězdy
export const starCount = (stage, n = 3) => Math.max(0, Math.min(3, stage - (n - 3) + 1));
export const stars = (stage, n = 3) => { const k = starCount(stage, n); return k ? ` <span class="stars" aria-label="${k} z 3 hvězd">${'★'.repeat(k)}<span class="off">${'★'.repeat(3 - k)}</span></span>` : ''; };

// Obrazovka Sbírka: řada ikon ubikací, řazení a karty jedinců
export function collectionHTML(cfg, state, SP, view) {
  const encs = cfg.enclosures.map(e => ({ e, list: state.animals.filter(a => SP[a.sp] && enclosureOf(cfg, SP[a.sp].group).id === e.id) }));
  const cur = encs.find(x => x.e.id === view.enc) || encs.find(x => x.list.length) || encs[0];
  if (!cur) return '<p class="msg">Žádné ubikace (Admin → Ubikace).</p>';
  const list = sortAnimals(cur.list, view.sort, SP);
  return `<div class="ahead"><b>Sbírka</b><span>${state.animals.length} zvířat</span></div>
  <div class="iconbar" role="tablist">${encs.map(({ e, list }) => `<button class="ico${e.id === cur.e.id ? ' on' : ''}" data-enc="${esc(e.id)}" role="tab" aria-selected="${e.id === cur.e.id}" aria-label="${esc(e.name)}, ${list.length}"><span aria-hidden="true">${icId('enc_' + e.id, esc(e.icon))}</span><small>${list.length}</small></button>`).join('')}</div>
  <div class="ahead"><b>${icId('enc_' + cur.e.id, esc(cur.e.icon))} ${esc(cur.e.name)}</b><select data-sort aria-label="Řazení">${SORTS.map(([k, n]) => `<option value="${k}"${view.sort === k ? ' selected' : ''}>${n}</option>`).join('')}</select></div>
  ${list.length ? `<div class="grid">${list.map(a => {
    const sp = SP[a.sp];
    return `<div class="acard" data-animal="${esc(a.uid)}"><div class="im${a.variant ? ' var-' + esc(a.variant) : ''}">${birdImg(sp, '', a.stage)}</div><div class="nm">${esc(a.nick || sp.name)}${stars(a.stage, stageNames(cfg, sp.group, sp.id).length)}</div><div class="rr">${a.variant ? esc(variantName(a.variant)) : new Date(a.date).toLocaleDateString('cs-CZ')}</div></div>`;
  }).join('')}</div>` : `<p class="msg">${esc(cur.e.name)} je zatím prázdná. Chyť zvíře z této skupiny.</p>`}`;
}
// Přezdívka: krátká, jen písmena, číslice, mezera a pomlčka
export const cleanNick = s => String(s ?? '').replace(/[^\p{L}\p{N} \-]/gu, '').replace(/\s+/g, ' ').trim().slice(0, 20);
// shortcut: krátký seznam kořenů sprostých slov (cz/en) – zachytí běžné případy i s diakritikou a „l33t“ znaky; pro veřejné vydání rozšířit
const BAD = ['kurv', 'pica', 'pice', 'picu', 'pici', 'picus', 'prdel', 'hovn', 'srac', 'srat', 'sere', 'chcan', 'mrdat', 'mrdk', 'zmrd', 'jebat', 'jebn', 'jebe', 'jebk', 'kokot', 'debil', 'idiot', 'kretin', 'buzn', 'teplous', 'cikan', 'negr', 'curak', 'kunda', 'fuck', 'shit', 'bitch', 'cunt', 'dick', 'penis', 'vagin', 'nazi', 'hitler', 'porn', 'sex'];
export function badWord(s) {
  const t = String(s).normalize('NFD').replace(/\p{M}/gu, '').toLowerCase()
    .replace(/[0134578@$]/g, ch => ({ 0: 'o', 1: 'i', 3: 'e', 4: 'a', 5: 's', 7: 't', 8: 'b', '@': 'a', $: 's' }[ch])).replace(/[^a-z]/g, '');
  return BAD.some(w => t.includes(w));
}
export const VARIANTS = { albin: 'albín', melan: 'tmavá forma' };
export const variantName = v => VARIANTS[v] || v;
