// Ikony rozhraní na jednom místě – připravené na výměnu za kreslené (ChatGPT).
// Výměna: ulož obrázek do icons/ui/<název>.webp (převod: python -I tools/ikony_export.py) a název přidej do ICON_FILES.
// Dokud obrázek není, použije se emoji níže. Názvy používá app.js i index.html (data-ic="…").
export const ICON_EXT = 'webp';
export const ICON_FILES = new Set(('map atlas dial catch route plan center compass layers offline tester planner treasure trip family quests shop games contests key journal calendar ' +
  'parent pin backup restore legal wipe clBird clMammal clAmph clRept clFish clInsect clSpider clMollusc clOther ' +
  'bio_voda bio_mokrad bio_skaly bio_park bio_sad bio_les bio_vesnice bio_mesto bio_pole bio_louka s_jaro s_leto s_podzim s_zima ' +
  'night kennel injured farm filter feeder myth reward finish cone level res_wood res_stone res_seeds ' +
  'b_lumber b_quarry b_nursery b_field b_orchard b_worms b_store b_pantry e_voliera e_vybeh e_rybnik e_terarium e_insektarium ' +
  'd_barn d_mill d_well d_chapel d_beehive d_scarecrow d_bench d_hay t_meadow t_field t_forest t_pond ' +
  'w_rain w_snow w_cold w_hot w_clear w_cloudy shop_food shop_treat shop_bait shop_lens shop_scope badge').split(' '));
// Ikony věcí farmy a obchodu podle jejich id (emoji v datech zůstává jako záloha a pro texty v hláškách)
const ID_IC = { wood: 'res_wood', stone: 'res_stone', seeds: 'res_seeds',
  lumber: 'b_lumber', quarry: 'b_quarry', nursery: 'b_nursery', field: 'b_field', orchard: 'b_orchard', worms: 'b_worms', store: 'b_store', pantry: 'b_pantry',
  enc_voliera: 'e_voliera', enc_vybeh: 'e_vybeh', enc_rybnik: 'e_rybnik', enc_terarium: 'e_terarium', enc_insektarium: 'e_insektarium',
  barn: 'd_barn', mill: 'd_mill', well: 'd_well', chapel: 'd_chapel', beehive: 'd_beehive', scarecrow: 'd_scarecrow', bench: 'd_bench', hay: 'd_hay',
  t_meadow: 't_meadow', t_field: 't_field', t_forest: 't_forest', t_pond: 't_pond',
  krmivo: 'shop_food', pamlsek: 'shop_treat', navnada: 'shop_bait', objektiv: 'shop_lens', dalekohled: 'shop_scope' };
// Ikona podle id věci, jinak předané emoji (už escapované)
export const icId = (id, emoji, cls = '') => ICON_FILES.has(ID_IC[id]) ? ic(ID_IC[id], cls) : emoji;
export const IC = {
  // spodní lišta a hlavní tlačítka
  map: '🗺️', collection: '🐾', atlas: '📖', me: '🐕', dial: '✚', close: '✕',
  catch: '📷', route: '🥾', plan: '🧭',
  center: '<svg viewBox="0 0 24 24" width="1em" height="1em" aria-hidden="true"><path d="M12 2.5 4.6 20.2l.8.8L12 18.2l6.6 2.8.8-.8z" fill="currentColor"/></svg>',
  // nástroje mapy
  compass: '🧭', layers: '🗂️', measure: '📏', offline: '⬇️', data: '📶', tester: '📋',
  // Já – Ven
  planner: '🥾', treasure: '💎', trip: '🖼️', family: '👪',
  // Já – Hraj
  quests: '🎯', shop: '🛒', games: '🧩', contests: '🏁',
  // Já – Poznávej
  key: '🔑', journal: '📓', calendar: '📅',
  // Já – Rodina a nastavení
  parent: '🛡️', pin: '🔒', backup: '💾', restore: '📂', install: '📲', about: 'ℹ️', legal: '📄', wipe: '🗑️',
  // karty na mapě
  // třídy zvířat na mapě (druh se ukáže až při setkání)
  clBird: '🐦', clMammal: '🦌', clAmph: '🐸', clRept: '🦎', clFish: '🐟', clInsect: '🦋', clSpider: '🕷️', clMollusc: '🐌', clOther: '🐾',
  // biotopy a roční období pro třídění
  bio_voda: '🌊', bio_mokrad: '🌾', bio_skaly: '🪨', bio_park: '🌳', bio_sad: '🍎', bio_les: '🌲', bio_vesnice: '🏡', bio_mesto: '🏙️', bio_pole: '🌻', bio_louka: '🌼',
  s_jaro: '🌸', s_leto: '☀️', s_podzim: '🍂', s_zima: '❄️',
  night: '🌙', kennel: '🏠', injured: '🩹', farm: '🏡', filter: '🔎',
  feeder: '🏠', myth: '✨', reward: '🎁', finish: '🏁', dog: '🐕', cone: '🌰', level: '⭐'
};
// HTML ikony; cls = další třída (velikost řeší CSS .ic)
export function ic(name, cls = '') {
  const c = 'ic ic-' + name + (cls ? ' ' + cls : '');
  if (ICON_FILES.has(name)) return `<img class="${c}" src="icons/ui/${name}.${ICON_EXT}" alt="" aria-hidden="true">`;
  return `<span class="${c}" aria-hidden="true">${IC[name] || '•'}</span>`;
}
// Doplní ikony do prvků s data-ic v HTML (index.html)
export function fillIcons(root = document) { root.querySelectorAll('[data-ic]').forEach(el => { el.innerHTML = ic(el.dataset.ic); }); }
const CLASS = { 'Ptáci': 'clBird', 'Savci': 'clMammal', 'Obojživelníci': 'clAmph', 'Plazi': 'clRept', 'Ryby': 'clFish', 'Hmyz': 'clInsect', 'Pavoukovci': 'clSpider', 'Měkkýši': 'clMollusc' };
export const classIcon = group => CLASS[group] || 'clOther';
