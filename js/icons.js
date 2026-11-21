// Ikony rozhraní na jednom místě – připravené na výměnu za kreslené (ChatGPT).
// Výměna: ulož obrázek do icons/ui/<název>.svg (nebo .png – viz ICON_EXT) a název přidej do ICON_FILES.
// Dokud obrázek není, použije se emoji níže. Názvy používá app.js i index.html (data-ic="…").
export const ICON_EXT = 'svg';
export const ICON_FILES = new Set([/* např. 'map', 'atlas' */]);
export const IC = {
  // spodní lišta a hlavní tlačítka
  map: '🗺️', collection: '🐾', atlas: '📖', me: '🐕', dial: '✚', close: '✕',
  catch: '📷', route: '🥾', plan: '🧭', center: '◎',
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
