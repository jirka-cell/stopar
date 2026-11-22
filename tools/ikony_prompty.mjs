// Dávky promptů pro G – ikony aplikace podle formuláře (outputs/ikony-formular.html): node tools/ikony_prompty.mjs
// Výstup outputs/G-zbyva/11-ikony.txt; výsledky icons/ui/<název>.png (názvy = klíče v js/icons.js, farma/počasí/obchod s předponou)
import { writeFileSync } from 'node:fs';

const I = [
  // lišta, mapa, Já
  ['map', 'složená papírová mapa s červeným špendlíkem'], ['atlas', 'otevřená kniha s pírkem a lístkem'], ['dial', 'bílé plus v sytě zeleném kruhu'],
  ['catch', 'fotoaparát s otiskem psí tlapky na objektivu'], ['route', 'turistická bota s tkaničkou'], ['plan', 'kompas s červenou střelkou'],
  ['center', 'kolečko se čtyřmi krátkými šipkami mířícími dovnitř ke středové tečce (vycentrovat na moji polohu)'],
  ['compass', 'větrná růžice s písmenem N nahoře'], ['layers', 'tři listy mapy položené na sobě'], ['offline', 'stylizovaná tlustá šipka dolů a pod ní vodorovná čárka (stáhnout)'],
  ['tester', 'podložka s papírem a zelenou fajfkou'], ['planner', 'turistický batoh'], ['treasure', 'otevřená truhla s pokladem'], ['trip', 'pohlednice s obrázkem kopce'],
  ['family', 'tři siluety vedle sebe: dospělý, dítě a pes'], ['quests', 'terč se zabodnutým šípem'], ['shop', 'malý stánek s pruhovanou markýzou'], ['games', 'dílek puzzle'],
  ['contests', 'cílová šachovnicová vlajka'], ['key', 'lupa nad zeleným listem'],
  ['journal', 'zápisník s tužkou'], ['calendar', 'trhací kalendář s lístkem'], ['parent', 'štít s otiskem tlapky'], ['pin', 'visací zámek'],
  ['backup', 'krabice se šipkou dovnitř'], ['restore', 'krabice se šipkou ven'], ['legal', 'list papíru s pečetí'], ['wipe', 'odpadkový koš'],
  // značky tříd zvířat na mapě (siluety, druh se ukáže až při setkání)
  ['clBird', 'silueta letícího ptáka'], ['clMammal', 'silueta srnce'], ['clAmph', 'silueta žáby'], ['clRept', 'silueta ještěrky'], ['clFish', 'silueta ryby'],
  ['clInsect', 'silueta motýla'], ['clSpider', 'silueta pavouka'], ['clMollusc', 'silueta šneka s ulitou'], ['clOther', 'silueta raka'],
  // biotopy a roční období
  ['bio_voda', 'vlnka vody'], ['bio_mokrad', 'trs rákosu u vody'], ['bio_skaly', 'skalka'], ['bio_park', 'listnatý strom s lavičkou'], ['bio_sad', 'jabloň s jablky'],
  ['bio_les', 'smíšený lesík: smrk, listnatý strom a menší strom'], ['bio_vesnice', 'chalupa'], ['bio_mesto', 'domy s okny'], ['bio_pole', 'klasy obilí'], ['bio_louka', 'kopretina'],
  ['s_jaro', 'rozkvetlá větvička'], ['s_leto', 'slunce'], ['s_podzim', 'barevný javorový list'], ['s_zima', 'sněhová vločka'],
  // ostatní
  ['night', 'srpek měsíce'], ['kennel', 'psí bouda'], ['injured', 'náplast do kříže'], ['farm', 'statek se stodolou'], ['filter', 'lupa'],
  ['feeder', 'ptačí krmítko se stříškou'], ['myth', 'stopa tlapy s jiskrami'], ['reward', 'dárek s mašlí'], ['finish', 'cílová vlajka na tyči'],
  ['cone', 'smrková šiška'], ['level', 'zlatá hvězda'],
  // farma
  ['res_wood', 'polínko'], ['res_stone', 'kámen'], ['res_seeds', 'pytlík semínek'],
  ['b_lumber', 'pila na kozlíku s kládou'], ['b_quarry', 'krumpáč'], ['b_nursery', 'sazenice v květináči'], ['b_field', 'snop obilí'], ['b_orchard', 'košík jahod'],
  ['b_worms', 'žížala vylézající z hlíny'], ['b_store', 'dřevěná kůlna s bednami (sklad surovin – jiná než stodola)'], ['b_pantry', 'police se sklenicemi a pytlem krmení (spižírna – zásoby jídla pro zvířata)'],
  ['e_voliera', 'klec s ptáčkem'], ['e_vybeh', 'dřevěná ohrádka se zajícem'], ['e_rybnik', 'rybníček, ze kterého vyskakuje rybka'], ['e_terarium', 'skleněné terárium s ještěrkou'], ['e_insektarium', 'síťka s motýlem'],
  ['d_barn', 'velká červená stodola se sedlovou střechou'], ['d_mill', 'větrný mlýn'], ['d_well', 'studna s rumpálem'], ['d_chapel', 'kaplička se zvonkem'], ['d_beehive', 'včelí úl'],
  ['d_scarecrow', 'strašák v klobouku'], ['d_bench', 'dřevěná lavička'], ['d_hay', 'kupka sena'],
  ['t_meadow', 'kopretina'], ['t_field', 'klasy obilí'], ['t_forest', 'smíšený lesík: smrk, listnatý strom a menší strom'], ['t_pond', 'malý rybníček s lekníny a trsem rákosu'],
  // počasí
  ['w_rain', 'mrak s kapkami'], ['w_snow', 'mrak s vločkami'], ['w_cold', 'teploměr s modrým sloupcem a rampouchy'], ['w_hot', 'slunce s paprsky'], ['w_clear', 'slunce s malým mráčkem'], ['w_cloudy', 'mrak'],
  // obchod a odznaky
  ['shop_food', 'miska s krmením'], ['shop_treat', 'jahoda'], ['shop_bait', 'žížala'], ['shop_lens', 'objektiv fotoaparátu'], ['shop_scope', 'dalekohled'],
  ['badge', 'zlatá kulatá medaile se stuhou a prázdným středem (do středu aplikace vloží symbol odznaku)']
];
const size = Math.ceil(I.length / 5), batches = [];
for (let i = 0; i < I.length; i += size) batches.push(I.slice(i, i + size));
let n = 0, out = `IKONY APLIKACE (${I.length} ikon v ${batches.length} dávkách) – podle tvých voleb ve formuláři\n`;
out += 'Ke KAŽDÉ dávce přilož ze složky outputs/aegon-predlohy: glasses.png + head.png (předloha stylu ikon).\n';
out += 'Výsledky ukládej do outputs/ikony-predlohy. Každou dávku pošli jako nový požadavek. Když G skončí dřív: „Pokračuj od čísla X, stejné zadání.“\n';
out += 'Nekreslí se: zavřít a „i“ (zůstanou jako znak), měření (zrušeno), správa dat (nechat), instalace (zrušeno); ťapku a hlavu Aegona už máme.\n';
batches.forEach((b, bi) => {
  out += `\n\n==================== DÁVKA ${bi + 1} / ${batches.length} ====================\n`;
  out += `Vytvoř postupně ${b.length} samostatných ikon pro dětskou aplikaci o přírodě a každou mi dej ke stažení přesně pod uvedeným názvem. Styl přesně jako přiložené ikony brýlí a hlavy psa: digitální pop-art, syté barvy, světlý odlesk, tenký tmavě hnědý obrys. Každá ikona: jeden jednoduchý předmět, nejvýš 3 barvy a obrys, čitelná i zmenšená na 24 px, žádný text, žádný rámeček ani kolečko kolem, průhledné pozadí, čtverec, předmět uprostřed asi 80 % obrázku. Všechny ikony stejně výrazné a ve stejném pohledu (mírně zepředu shora).\n`;
  for (const [k, d] of b) out += `\n${String(++n).padStart(3, '0')} – ${k}.png\n${d.charAt(0).toUpperCase() + d.slice(1)}.\n`;
});
writeFileSync(new URL('../outputs/G-zbyva/11-ikony.txt', import.meta.url), out);
console.log('ikon', I.length, 'dávek', batches.length);
