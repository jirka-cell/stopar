// Vygeneruje prompty pro obrázky všech druhů z dat aplikace: node tools/prompty.mjs
// Výstup: design/obrazky/prompty.csv (oddělovač ; – otevře se v Excelu)
import { writeFileSync } from 'node:fs';
import { DEFAULTS } from '../js/config.js';

const GROUP_EN = { 'Ptáci': 'bird', 'Savci': 'mammal', 'Obojživelníci': 'amphibian', 'Plazi': 'reptile', 'Ryby': 'fish', 'Hmyz': 'insect', 'Pavoukovci': 'spider', 'Měkkýši': 'snail', 'Ostatní': 'crayfish' };
const q = s => '"' + String(s ?? '').replace(/"/g, '""').replace(/\s*\n\s*/g, ' ') + '"';

const rows = [['id', 'soubor', 'nazev', 'latinsky', 'skupina', 'znaky', 'prompt']];
for (const s of DEFAULTS.species) {
  const e = s.edu || {};
  const features = [e.male, e.length && 'size ' + e.length].filter(Boolean).join('; ');
  const prompt = `Cute Japanese-style nature illustration of ${s.lat} (${GROUP_EN[s.group] || 'animal'}), Central European wildlife. `
    + 'Soft kawaii proportions (slightly larger head and eyes) but anatomically recognizable: keep the real colors, markings and body shape so the species can be identified. '
    + `Key features: ${features}. `
    + 'Clean thin outlines, flat colors with gentle cel shading, warm natural palette. Full body, side 3/4 view facing left, standing on an invisible ground line, centered, filling about 80% of the frame height. '
    + 'Transparent background, no shadow, no text, no frame, no other objects. Not resembling any existing game or cartoon character.';
  rows.push([s.id, s.id + '.png', s.name, s.lat, s.group, features, prompt]);
}
const out = '﻿' + rows.map(r => r.map(q).join(';')).join('\r\n') + '\r\n'; // BOM, ať Excel pozná UTF-8
writeFileSync(new URL('../design/obrazky/prompty.csv', import.meta.url), out);
console.log('prompty.csv:', rows.length - 1, 'druhů');
