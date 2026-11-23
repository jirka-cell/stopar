// Prompty pro G – nové druhy z dávky 5 (js/species-batch5.js): node tools/zvirata_prompty2.mjs
// Výstup outputs/G-zbyva/13-nove-druhy.txt, dávky po 24 obrázcích; výsledky outputs/zvirata-predlohy/{id}_{stádium}.png
import { writeFileSync } from 'node:fs';
import { BATCH5 } from '../js/species-batch5.js';
import { DEFAULTS } from '../js/config.js';
import { stageNames } from '../js/economy.js';

const NYMFA = /Hemiptera|Orthoptera|Mantodea|Odonata/; // proměna bez kukly
const larva = s => /Lepidoptera/.test(s.edu.order) ? 'housenka' : /Odonata/.test(s.edu.order) ? 'larva ve vodě' : NYMFA.test(s.edu.order) ? 'mladá nymfa bez křídel' : /Hymenoptera/.test(s.edu.order) ? 'bílá larva v buňce plástu' : 'larva';
function stages(s) {
  const n = `${s.name} (${s.lat})`, f = s.fact;
  switch (s.group) {
    case 'Ptáci': return [`Mládě – ${n}: mládě tohoto druhu (kuře nebo mladý pták krátce po opuštění hnízda), menší a se zbarvením typickým pro mláďata.`,
      `Dospělý – ${n}: dospělý samec v typickém zbarvení, stojí nebo sedí z boku, celý vidět. ${f}`,
      `Mistr – ${n}: dospělý pták v typické akci (let, lov, zpěv nebo tok) podle toho, čím je druh známý. ${f}`];
    case 'Savci': return [`Mládě – ${n}: mládě tohoto druhu v typickém prostředí (hnízdo, nora nebo u matky).`,
      `Dospělý – ${n}: dospělé zvíře z boku, celé vidět, typické zbarvení. ${f}`,
      `Mistr – ${n}: dospělé zvíře v typické akci (lov, běh, šplh, potrava v tlamě). ${f}`];
    case 'Obojživelníci': return [/Caudata/.test(s.edu.order) ? `Pulec – ${n}: larva ve vodě s vnějšími keříčkovitými žábrami.` : `Pulec – ${n}: pulec tohoto druhu ve vodě.`,
      /Caudata/.test(s.edu.order) ? `Mladý – ${n}: mladý jedinec těsně po proměně, už bez žaber, menší a méně výrazně zbarvený.` : `Mladý – ${n}: malá žabka těsně po proměně, ještě se zbytkem ocásku.`,
      `Dospělý – ${n}: dospělý jedinec z boku, typické zbarvení. ${f}`,
      `Mistr – ${n}: dospělý samec v době rozmnožování v typické akci (kvákání, svatební šat, lov). ${f}`];
    case 'Plazi': return [`Mládě – ${n}: právě vylíhlé nebo narozené mládě, menší a se zbarvením mláďat.`,
      `Dospělý – ${n}: dospělý jedinec celý vidět, typické zbarvení. ${f}`,
      `Mistr – ${n}: dospělý jedinec v typické akci (lov, vyhřívání na kameni, plavání). ${f}`];
    case 'Ryby': return [`Plůdek – ${n}: drobný průsvitný plůdek se žloutkovým váčkem.`,
      `Mladá ryba – ${n}: mladá ryba, menší a štíhlejší než dospělá, už s typickou kresbou.`,
      `Dospělá – ${n}: dospělá ryba z boku, všechny ploutve dobře vidět, typické zbarvení. ${f}`,
      `Mistr – ${n}: velká stará ryba v typické akci (lov, výskok, u dna mezi rostlinami). ${f}`];
    case 'Hmyz': return [`Larva – ${n}: ${larva(s)} tohoto druhu na typické živné rostlině nebo v prostředí.`,
      NYMFA.test(s.edu.order) ? `Kukla – ${n}: starší nymfa těsně před poslední svlékáním, se zárodky křídel (tento druh nemá kuklu).` : `Kukla – ${n}: kukla tohoto druhu.`,
      `Dospělec – ${n}: dospělec v typickém postoji, dobře vidět kresba${/Lepidoptera/.test(s.edu.order) ? ' křídel, pohled shora se souměrně rozloženými křídly (přesně čtyři křídla)' : ''}. ${f}`,
      `Mistr – ${n}: dospělec v typické akci (na květu, v letu, při lovu nebo boji). ${f}${/Lepidoptera|Odonata/.test(s.edu.order) ? ' Přesně čtyři křídla, souměrně.' : ''}`];
    case 'Pavoukovci': return [s.id === 'kliste' ? `Mládě – ${n}: drobná larva klíštěte se šesti nohama na stéble trávy.` : `Mládě – ${n}: malé mládě, menší a světlejší než dospělý.`,
      `Dospělý – ${n}: dospělý jedinec shora, všech osm nohou dobře vidět, typická kresba. ${f}`,
      `Mistr – ${n}: dospělý v typické akci (v síti, s kořistí, číhá na květu). ${f}`];
    case 'Měkkýši': return [`Mládě – ${n}: malé mládě s tenkou průsvitnou ${/Bivalvia/.test(s.edu.cls) ? 'lasturou' : 'ulitou (u slimáka bez ulity)'}.`,
      `Dospělý – ${n}: dospělý jedinec z boku, typický tvar a kresba ${/Bivalvia/.test(s.edu.cls) ? 'lastur' : 'ulity'}. ${f}`,
      `Mistr – ${n}: dospělý v typické akci nebo prostředí (leze po listu, ve vodě u dna). ${f}`];
    default: return [`Mládě – ${n}: malé světlé mládě.`, `Dospělý – ${n}: dospělý jedinec shora, typický tvar. ${f}`, `Mistr – ${n}: dospělý v typické akci (stočený do kuličky, pod kůrou). ${f}`];
  }
}
const items = [];
for (const s of BATCH5) {
  const st = stages(s), want = stageNames(DEFAULTS, s.group).length;
  if (st.length !== want) throw new Error(s.id + ': ' + st.length + ' stádií místo ' + want);
  st.forEach((t, i) => items.push([`${s.id}_${i + 1}.png`, t]));
}
const HEAD = 'Vytvoř postupně {N} samostatných obrázků a každý mi dej ke stažení přesně pod uvedeným názvem. Styl přesně jako na přiložených obrázcích kosa a ledňáčka (realistická anatomie, digitální malba se sytými barvami a světlými odlesky, tenký tmavý obrys). Zbarvení a tvar každého zvířete přesně podle skutečného druhu, aby šlo bezpečně poznat. Jen zvíře (a uvedená drobná podložka, voda či rostlina), žádný text, průhledné pozadí, čtverec, zvíře celé v záběru uprostřed; dospělý a mistr asi 80 % výšky obrázku (u protáhlých zvířat – had, ryba, ještěrka – asi 80 % šířky), mládě, larva, pulec, plůdek a kukla menší, asi 50–60 %. Spodní okraj zvířete asi 8 % nad spodním okrajem obrázku.';
const B = 24, nb = Math.ceil(items.length / B);
let out = `NOVÉ DRUHY (dávka 5) – ${BATCH5.length} druhů, ${items.length} obrázků v ${nb} dávkách po ${B}\n`;
out += 'Ke KAŽDÉ dávce přilož obrázky kosa a ledňáčka (vzor stylu) a pošli ji jako nový požadavek. Výsledky ukládej do outputs/zvirata-predlohy.\n';
out += 'Když G skončí dřív: „Pokračuj od čísla X, stejné zadání.“ Pořadí: ptáci, savci, obojživelníci, plazi, ryby, hmyz, pavoukovci, měkkýši, korýši.\n';
for (let b = 0; b < nb; b++) {
  const part = items.slice(b * B, b * B + B);
  out += `\n\n==================== DÁVKA ${b + 1} / ${nb} ====================\n${HEAD.replace('{N}', part.length)}\n`;
  part.forEach(([f, t], i) => { out += `\n${String(b * B + i + 1).padStart(3, '0')} – ${f}\n${t}\n`; });
}
writeFileSync(new URL('../outputs/G-zbyva/13-nove-druhy.txt', import.meta.url), out);
console.log('druhů', BATCH5.length, 'obrázků', items.length, 'dávek', nb);
