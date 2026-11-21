// Zapíše seznam hotových obrázků druhů (images/species/{id}.png) do js/images.js: node tools/obrazky.mjs
// Aplikace pak načítá jen obrázky, které opravdu existují (žádné zbytečné dotazy na chybějící soubory).
import { readdirSync, writeFileSync, existsSync } from 'node:fs';

const dir = new URL('../images/species/', import.meta.url);
const ids = existsSync(dir) ? readdirSync(dir).filter(f => /^[a-z0-9_]+\.png$/.test(f)).map(f => f.slice(0, -4)).sort() : [];
writeFileSync(new URL('../js/images.js', import.meta.url),
  `// Vygenerováno příkazem node tools/obrazky.mjs – neupravovat ručně\nexport const SPECIES_IMAGES = new Set(${JSON.stringify(ids)});\n`);
console.log('obrázků druhů:', ids.length);
