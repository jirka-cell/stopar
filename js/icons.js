// Ikony rozhraní na jednom místě – připravené na výměnu za kreslené (ChatGPT).
// Výměna: ulož obrázek do icons/ui/<název>.svg (nebo .png – viz ICON_EXT) a název přidej do ICON_FILES.
// Dokud obrázek není, použije se emoji níže. Názvy používá app.js i index.html (data-ic="…").
export const ICON_EXT = 'svg';
export const ICON_FILES = new Set([/* např. 'map', 'atlas' */]);
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
