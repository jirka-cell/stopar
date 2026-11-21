// Zapíše seznam hotových obrázků do js/images.js: node tools/obrazky.mjs
//   images/species/{id}.png – ilustrace druhů, images/dog/{póza}.png – pes Aegon (sit, lookL, lookR, walk1, walk2, point, sniff, joy, jump, sad, lie, sleep, stand)
// Aplikace pak načítá jen obrázky, které opravdu existují (žádné zbytečné dotazy na chybějící soubory).
import { readdirSync, writeFileSync, existsSync } from 'node:fs';

const list = (folder, re) => { const dir = new URL('../images/' + folder + '/', import.meta.url); return existsSync(dir) ? readdirSync(dir).filter(f => re.test(f)).map(f => f.slice(0, -4)).sort() : []; };
const species = list('species', /^[a-z0-9_]+\.png$/), dog = list('dog', /^[a-zA-Z0-9]+\.png$/);
writeFileSync(new URL('../js/images.js', import.meta.url),
  `// Vygenerováno příkazem node tools/obrazky.mjs – neupravovat ručně\nexport const SPECIES_IMAGES = new Set(${JSON.stringify(species)});\nexport const DOG_IMAGES = new Set(${JSON.stringify(dog)});\n`);
console.log('obrázků druhů:', species.length, '· psa:', dog.length);
