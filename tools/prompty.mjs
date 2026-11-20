// Vygeneruje anglické prompty pro obrázky všech druhů: node tools/prompty.mjs
// Výstup: design/obrazky/prompty.txt (jeden prompt za druhem, ke kopírování)
//         design/obrazky/prompty.csv (tabulka pro Excel, oddělovač ;)
import { writeFileSync } from 'node:fs';
import { DEFAULTS } from '../js/config.js';
import { VZHLED_EN } from './vzhled-en.mjs';

const STYLE = 'Cute Japanese-style nature illustration. Soft kawaii proportions (slightly larger head and eyes) but anatomically recognizable: '
  + 'keep the real colors, markings and body shape so the species can be identified. Clean thin outlines, flat colors with gentle cel shading, warm natural palette.';
const FRAME = 'Full body, side 3/4 view facing left, standing on an invisible ground line, centered, filling about 80% of the frame height. '
  + 'Transparent background, no shadow, no text, no frame, no other objects. Not resembling any existing game or cartoon character. Square 1024x1024.';

const missing = DEFAULTS.species.filter(s => !VZHLED_EN[s.id]).map(s => s.id);
if (missing.length) { console.error('Chybí anglický popis pro:', missing.join(', ')); process.exit(1); }

const items = DEFAULTS.species.map(s => {
  const [en, look] = VZHLED_EN[s.id];
  return { s, en, prompt: `${STYLE} Subject: ${en} (${s.lat}), Central European wildlife: ${look}. ${FRAME}` };
});

const txt = items.map(({ s, en, prompt }, i) => `${String(i + 1).padStart(3, '0')}  ${s.id}.png  –  ${s.name} / ${en}\n${prompt}\n`).join('\n');
writeFileSync(new URL('../design/obrazky/prompty.txt', import.meta.url), txt);

const q = v => '"' + String(v).replace(/"/g, '""') + '"';
const csv = [['id', 'soubor', 'nazev', 'anglicky', 'latinsky', 'skupina', 'prompt'].map(q).join(';'),
  ...items.map(({ s, en, prompt }) => [s.id, s.id + '.png', s.name, en, s.lat, s.group, prompt].map(q).join(';'))].join('\r\n');
writeFileSync(new URL('../design/obrazky/prompty.csv', import.meta.url), '﻿' + csv + '\r\n');

console.log('prompty:', items.length, 'druhů, nejdelší', Math.max(...items.map(i => i.prompt.length)), 'znaků');
