// Prompty pro G – obrázky stop a pobytových znamení: node tools/stopy_prompty.mjs
// Výstup outputs/G-zbyva/15-stopy.txt; výsledky outputs/zvirata-predlohy/{id}_stopa.png → python -I tools/zvirata_export.py {id}_stopa …
import { writeFileSync } from 'node:fs';
import { DEFAULTS } from '../js/config.js';
import { hasSigns } from '../js/field.js';

// kde text v datech nejde nakreslit, kreslí se tohle
const DRAW = {
  plch: 'lískový oříšek s hladce ohryzaným oválným otvorem a drobný trus na dřevěném trámu',
  krizak: 'kruhová pavučina mezi stébly s kapkami ranní rosy',
  netopyr: 'drobné tmavé trusinky na parapetu pod škvírou ve dřevě'
};
const list = DEFAULTS.species.filter(s => s.active && hasSigns(s));
const HEAD = `Vytvoř postupně ${list.length} samostatných obrázků a každý mi dej ke stažení přesně pod uvedeným názvem. Na každém je stopa nebo pobytové znamení zvířete – podle toho se dá poznat, že tu zvíře bylo. Styl přesně jako obrázky zvířat z minula (realistické tvary, digitální malba se sytými barvami a světlými odlesky, tenký tmavý obrys). Zvíře samotné na obrázku NENÍ – jen to, co po sobě zanechalo. Stopy a znamení věrně podle skutečnosti (počet prstů, tvar, velikost), aby šly poznat. Malý kousek podkladu (hlína, sníh, kůra, tráva) jako ostrůvek, žádný text, průhledné pozadí, čtverec, motiv uprostřed asi 80 % obrázku, mírně shora.`;
let out = `STOPY A POBYTOVÁ ZNAMENÍ – ${list.length} obrázků v jedné dávce (posílej do stejné konverzace jako zvířata, nic nepřikládej)\nVýsledky do outputs/zvirata-predlohy. Když G skončí dřív: „Pokračuj od čísla X, stejné zadání.“\n\n\n${HEAD}\n`;
list.forEach((s, i) => { out += `\n${String(i + 1).padStart(3, '0')} – ${s.id}_stopa.png\n${s.name}: ${DRAW[s.id] || s.edu.signs}.\n`; });
writeFileSync(new URL('../outputs/G-zbyva/15-stopy.txt', import.meta.url), out);
console.log('stop', list.length);
