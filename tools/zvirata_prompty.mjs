// Vygeneruje dávky promptů pro G (obrázky druhů po stádiích): node tools/zvirata_prompty.mjs
// Výstup outputs/G-zbyva/9-zvirata-zbytek.txt. Mládě a dospělý z popisu v atlasu (edu.young / edu.male), mistr a čtyřstádiové druhy ručně.
import { writeFileSync } from 'node:fs';
import { BATCH1 } from '../js/species-batch1.js';
import { BATCH2 } from '../js/species-batch2.js';
import { BATCH3 } from '../js/species-batch3.js';
import { BATCH4 } from '../js/species-batch4.js';

const list = [...BATCH1, ...BATCH2, ...BATCH3, ...BATCH4];
const SKIP = new Set(['datel', 'holub', 'kos', 'konadra', 'vrabec', 'kachna', 'volavka', 'kane', 'pustik', 'lednacek']); // hotové

// [mládě (když je popis v atlasu nevizuální, jinak null), mistr – typické skutečné chování]
const T3 = {
  modrinka: [null, 'visí hlavou dolů na tenké větvičce a vyzobává mšice z pupenu'],
  penkava: ['mladá pěnkava hnědavě šedá s bílými pásky na křídle, sedí na větvi', 'samec zpívá na větvi s nadmutou růžovou hrudí a otevřeným zobákem'],
  strakapoud: ['mladý strakapoud s celým červeným temenem šplhá po kmeni', 'bubnuje zobákem do suché větve, od dřeva odletují třísky'],
  straka: [null, 'odnáší v zobáku lesklý předmět (alobalový kousek), dlouhý ocas zdvižený'],
  cap: ['mládě čápa bílé s tmavým zobákem stojí v hnízdě z větví', 'klape zobákem s hlavou zakloněnou dozadu na velkém hnízdě z větví'],
  labut: ['šedohnědé labuťátko plave', 'labuť plave s křídly zvednutými jako plachty nad zády (imponuje), malý kruh vody'],
  postolka: ['mladá poštolka rezavá s hustým skvrněním sedí na sloupku', 'třepetá se ve vzduchu na jednom místě s roztaženým ocasem a hlavou dolů (pátrá po myši)'],
  vlastovka: ['mladá vlaštovka s krátkým ocasem a matným hřbetem sedí na drátě', 'v rychlém letu nízko nad zemí s dlouhým vidlicovitým ocasem, chytá hmyz'],
  rorys: ['mladý rorýs se světlými lemy per sedí na okraji otvoru ve zdi', 've střemhlavém letu se srpovitými křídly'],
  cervenka: ['mladá červenka hnědě skvrnitá bez oranžové hrudi sedí na větvi', 'zpívá na větvi s nadmutou oranžovou hrudí'],
  vyr: ['načechrané béžové mládě výra s oranžovýma očima sedí na skále', 'v letu s roztaženými širokými křídly, oranžové oči, ušní pera'],
  kavka: [null, 'dvě kavky si navzájem čistí peří na komíně'],
  havran: ['mladý havran celý černý bez holé kůže u zobáku', 'kráčí po poli a vytahuje zobákem z hlíny ponravu'],
  drozd: [null, 'rozbíjí ulitu hlemýždě o kámen'],
  rehek: ['mladý rehek šedohnědý s rezavým ocasem', 'samec zpívá na okraji střechy a třese rezavým ocasem'],
  konipas: ['mladý konipas šedobílý bez černé', 'cupitá po zemi a kývá dlouhým ocasem nahoru a dolů'],
  brhlik: [null, 'šplhá po kmeni hlavou dolů'],
  tuhyk: ['mladý ťuhýk hnědý s jemným vlnkováním', 'sedí na trnitém keři a vedle něj je na trnu napíchnutý brouk (spižírna)'],
  skrivan: [null, 'zpívá v letu vysoko ve vzduchu s rychle mávajícími křídly'],
  hyl: ['mladý hýl hnědošedý bez černé čepičky', 'samec s růžovočervenou hrudí ozobává pupeny na zasněžené větvičce'],
  lyska: ['mládě lysky s chmýřím a oranžovočervenou hlavičkou plave', 'běží po hladině s roztaženými křídly a cáká vodu'],
  kormoran: ['mladý kormorán hnědý se světlým břichem sedí na kůlu', 'suší si roztažená křídla na kůlu ve vodě'],
  sojka: [null, 'drží v zobáku žalud'],
  jiricka: ['mladá jiřička matnějších barev vykukuje z kulatého hnízda z bláta', 'staví hnízdo z hrudek bláta pod okrajem střechy'],
  vrabecpolni: [null, 'koupe se v prachu s načepýřeným peřím'],
  zvonek: ['mladý zvonek hnědě čárkovaný', 'louská slunečnicové semínko silným zobákem'],
  stehlik: ['mladý stehlík bez červeného obličeje, šedohnědá hlava, žlutý pruh na křídle', 'vyzobává semena z odkvetlého bodláku'],
  kukacka: ['mladá kukačka hnědá s bílou skvrnou v týlu, velká, s otevřeným zobákem žebrá', 'samec kuká na větvi se svěšenými křídly a zdviženým ocasem'],
  krahujec: ['mladý krahujec hnědý se skvrnitou hrudí sedí na větvi', 'útočí v rychlém letu mezi větvemi s nataženými pařáty'],
  cejka: ['kuře čejky s chmýřím na dlouhých nohách', 'v letu s širokými zaoblenými černobílými křídly'],
  strnad: ['mladý strnad hnědě čárkovaný se žlutavým nádechem', 'samec zpívá na vrcholku keře se žlutou hlavou zvednutou'],
  dudek: ['mladý dudek s kratším zobákem', 'roztahuje vějířovitou chocholku na hlavě, dlouhý zahnutý zobák'],
  potapka: ['mládě potápky s pruhovanou hlavou vozí se na zádech dospělé (jen mládě a kus zad)', 'tokající pár proti sobě s rezavočernými límci a růžky, v zobácích vodní rostliny'],
  jestrab: ['mladý jestřáb hnědý s podélnými skvrnami na hrudi sedí na větvi', 'v letu s širokými křídly a dlouhým ocasem, oranžové oči'],
  sycek: ['načechrané mládě sýčka se žlutýma očima', 'sedí na kůlu a pokyvuje hlavou, žluté oči upřené'],
  zluna: ['mladá žluna zelená skvrnitá', 'vybírá jazykem mravence z mraveniště na zemi'],
  rakosnik: [null, 'zpívá zavěšený na stéble rákosu s rozkročenýma nohama'],
  bazant: ['bažantí kuře hnědě pruhované', 'kohout tokuje: vzpřímený, červené laloky, třepe křídly'],
  koshorsky: [null, 'samec zpívá na balvanu s bílým půlměsícem na hrudi'],
  linduska: [null, 'zpívá v letu s roztaženými křídly a ocasem při sestupu dolů'],
  veverka: ['malá veverka s řidší zrzavou srstí sedí na větvi', 'sedí na zadních s ocasem nad hlavou a v předních tlapkách drží šišku'],
  jezek: ['malý ježek s měkkými bílými ostny', 'je stočený do ostnaté koule, vykukuje jen čumáček'],
  zajic: ['malé osrstěné zajíče s otevřenýma očima krčí se v trávě', 'v rychlém skoku s dlouhými ušima'],
  srnec: ['srnče s bílými skvrnami leží schované v trávě', 'srnec s parůžky stojí ve vysoké trávě a ostražitě poslouchá'],
  liska: ['liščátko šedohnědé s modrými očky sedí u nory', 'myškuje: vysoký skok s předními tlapkami dolů do sněhu nebo trávy'],
  netopyr: ['malé mládě netopýra visí hlavou dolů', 'v letu s roztaženými blanitými křídly loví nočního motýla'],
  jezevec: ['malé jezevčí mládě vykukuje z nory', 'hrabe silnými tlapami u vchodu do nory'],
  krtek: ['holé růžové mládě krtka', 'vyhrabává se z krtiny a lopatovité tlapy odhrnují hlínu'],
  prase: ['podélně pruhované sele', 'kňour s velkými kly se válí v blátě'],
  kuna: ['malá slepá kuní mláďata (jedno)', 'šplhá po kmeni a ohlíží se, bílá náprsenka'],
  bobr: ['malý bobřík s plochým ocasem', 'hlodá kmen stromu oranžovými řezáky, kolem třísky'],
  vydra: ['malé vydří mládě na břehu', 'plave na zádech ve vodě a drží rybu'],
  jelen: ['kolouch s bílými skvrnami', 'troubí: hlava zakloněná, mohutné parohy, hříva'],
  kolcava: ['malá kolčava', 'stojí na zadních a rozhlíží se, štíhlé tělo'],
  hrabos: ['malé mládě hraboše v trávě', 'sedí u vchodu do nory a okusuje stéblo'],
  plch: ['malý plch v dutině', 'spí stočený v klubíčku s ocasem kolem těla'],
  rejsek: ['mláďata rejska v „karavaně“ – drží se zubama za ocásek jedno druhého (tři)', 'loví žížalu, protáhlý čumáček'],
  mysice: ['malá šedivější myšice', 'stojí na zadních s velkýma ušima a drží semínko'],
  tchor: ['malé tchoří mládě', 'stojí na zadních a větří, bílá maska'],
  sysel: ['malý sysel u nory', 'stojí vzpřímeně na zadních u nory a hlídkuje'],
  jesterka: [null, 'samec se zelenými boky se vyhřívá na kameni'],
  slepys: [null, 'leží stočený v trávě a vypláznutým jazýčkem ochutnává vzduch'],
  uzovka: [null, 'plave hadovitě po hladině s hlavou nad vodou, malé vlny'],
  zmije: [null, 'stočená do spirály na kameni se zvednutou hlavou'],
  zivorodka: [null, 'samice se vyhřívá na pařezu vedle drobného mláděte'],
  hlemyzd: [null, 'leze po listu s vysunutými tykadly a očima'],
  krizak: [null, 'sedí uprostřed kruhové pavučiny se světlým křížem na zadečku (pavučina kolem)'],
  rak: [null, 'stojí se zdviženými klepety připravený bránit se']
};
// čtyřstádiové skupiny: [1, 2, 3 dospělý (null = z atlasu), 4 mistr]
const T4 = {
  skokan: ['pulec skokana hnědého, tmavý s ocáskem', 'žabka s ještě krátkým ocáskem a nožičkami vylézá z vody', null, 'skáče s nataženýma nohama'],
  ropucha: ['černý pulec ropuchy', 'drobná ropuška s posledním kouskem ocásku', null, 'samec na jaře putuje k vodě a nese na zádech samici (pár)'],
  rosnicka: ['pulec rosničky', 'drobná zelená žabka s kouskem ocásku', null, 'kváká s nafouknutým hrdelním vakem na listu'],
  colek: ['larva čolka s vnějšími žábrami', 'mladý čolek hnědý bez hřebene', null, 'samec ve svatebním šatu s vysokým vlnitým hřebenem plave ve vodě'],
  mlok: ['larva mloka s vnějšími žábrami ve vodě', 'malý mlok s prvními žlutými skvrnami', null, 'leze po mechu za deště, lesklá kůže'],
  kunka: ['pulec kuňky', 'drobná kuňka', null, 'ukazuje výstražné oranžově skvrnité břicho (prohne se a zvedne nohy)'],
  ropuchazelena: ['černošedý pulec', 'drobná ropucha se zelenými skvrnami', null, 'kváká s nafouknutým hrdelním vakem na kraji vody'],
  skokanzeleny: ['pulec skokana zeleného', 'zelená žabka s kouskem ocásku', null, 'kváká s dvěma bílými nafouknutými vaky po stranách hlavy na listu leknínu'],
  kapr: ['drobný plůdek kapra', 'mladý kapr', null, 'velký starý kapr zvedá tlamu s vousky k hladině'],
  stika: ['drobná štička', 'mladá štika', null, 'útočí s otevřenou tlamou plnou zubů na malou rybku'],
  pstruh: ['plůdek pstruha s tmavými skvrnami na bocích', 'mladý pstruh', null, 'vyskakuje z vody za mouchou, kapky kolem'],
  okoun: ['drobný okounek', 'mladý okoun s pruhy', null, 'se vztyčenou ostnitou hřbetní ploutví'],
  lin: ['plůdek lína', 'mladý lín', null, 'starý lín u dna mezi vodními rostlinami'],
  sumec: ['plůdek sumce', 'mladý sumec s vousy', null, 'obří sumec s širokou tlamou a dlouhými vousy'],
  babocka: ['černá ostnitá housenka na listu kopřivy', 'kukla zavěšená hlavou dolů', null, 'sedí s rozevřenými křídly na květu a ukazuje „oči“'],
  cmelak: ['bílá larva v buňce z vosku', 'kukla v kokonu', null, 'sbírá pyl na květu, žluté rousky pylu na nohách'],
  rohac: ['velká bílá zahnutá larva v tlejícím dřevě', 'kukla v dřevě', null, 'dva samci se přetlačují kusadly na větvi (souboj)'],
  slunecko: ['šedočerná larva se žlutými skvrnami jako krokodýlek', 'oranžová kukla přichycená na listu', null, 'roztahuje krovky a křídla ke vzletu'],
  vazka: ['larva vážky ve vodě', 'larva leze po stéble z vody (svlékání)', null, 'v letu s průhlednými křídly'],
  otakarek: ['zelená housenka s černými pruhy a oranžovými tečkami na fenyklu', 'zelená kukla na stonku přichycená pásem', null, 'pije nektar na květu s rozevřenými křídly'],
  mravenec: ['bílé larvy mravenců (tři)', 'kukly mravenců v kokonech', 'dělnice mravence lesního', 'nese na zádech jehličí k mraveništi'],
  chroust: ['bílá zahnutá ponrava v zemi', 'kukla v zemi', null, 'roztahuje vějířovitá tykadla před vzletem']
};
// dospělý: kde popis v atlasu nepopisuje vzhled
const ADULT = {
  krizak: 'hnědý pavouk s velkým kulatým zadečkem, na něm světlý kříž z teček, dlouhé pruhované nohy',
  jesterka: 'samec s jasně zelenými boky a hnědým hřbetem s tmavou kresbou',
  prase: 'mohutný tmavě hnědý štětinatý divočák s klem',
  netopyr: 'malý tmavě hnědý netopýr se složenými blanitými křídly, visí hlavou dolů',
  kapr: 'šupinatý zlatohnědý kapr se 4 vousky u tlamy',
  srnec: 'srnec s krátkými parůžky, hnědá srst, bílé zrcátko vzadu'
};
const STAGES = { 'Obojživelníci': ['pulec', 'mladý', 'dospělý', 'mistr'], 'Hmyz': ['larva', 'kukla', 'dospělec', 'mistr'], 'Ryby': ['plůdek', 'mladá ryba', 'dospělá', 'mistr'] };
const cap = s => s.charAt(0).toUpperCase() + s.slice(1);

const items = [];
for (const s of list) {
  if (SKIP.has(s.id)) continue;
  const e = s.edu || {}, who = `${s.name} (${s.lat})`;
  if (STAGES[s.group]) {
    const t = T4[s.id]; if (!t) throw new Error('chybí T4: ' + s.id);
    const names = STAGES[s.group];
    const adult = t[2] || ADULT[s.id] || e.male;
    const lines = [t[0], t[1], adult, t[3]];
    lines.forEach((l, i) => items.push({ sp: s.id, file: `${s.id}_${i + 1}.png`, text: `${cap(names[i])} – ${who}: ${l}.` }));
  } else {
    const t = T3[s.id]; if (!t) throw new Error('chybí T3: ' + s.id);
    items.push({ sp: s.id, file: `${s.id}_1.png`, text: `Mládě – ${who}: ${t[0] || e.young}.` });
    items.push({ sp: s.id, file: `${s.id}_2.png`, text: `Dospělý – ${who}${s.group === 'Ptáci' && e.female && !/podobn/.test(e.female) ? ', samec' : ''}: ${ADULT[s.id] || e.male}.` });
    items.push({ sp: s.id, file: `${s.id}_3.png`, text: `Mistr – ${who}: ${t[1]}.` });
  }
}
// dávky po celých druzích, nejvýš 12 obrázků
const batches = []; let cur = [];
for (const sp of [...new Set(items.map(i => i.sp))]) {
  const its = items.filter(i => i.sp === sp);
  if (cur.length + its.length > 12) { batches.push(cur); cur = []; }
  cur.push(...its);
}
if (cur.length) batches.push(cur);

let n = 0, out = `ZVÍŘATA – ZBYTEK (${items.length} obrázků v ${batches.length} dávkách)\n`;
out += 'Ke KAŽDÉ dávce přilož ze složky outputs/zvirata-predlohy: kos_2.png + lednacek_2.png (předloha stylu).\n';
out += 'Výsledky ukládej do outputs/zvirata-predlohy. Každou dávku pošli jako nový požadavek. Když G skončí dřív: „Pokračuj od čísla X, stejné zadání.“\n';
batches.forEach((b, bi) => {
  out += `\n\n==================== DÁVKA ${bi + 1} / ${batches.length} ====================\n`;
  out += `Vytvoř postupně ${b.length} samostatných obrázků a každý mi dej ke stažení přesně pod uvedeným názvem. Styl přesně jako na přiložených obrázcích kosa a ledňáčka (realistická anatomie, digitální malba se sytými barvami a světlými odlesky, tenký tmavý obrys). Zbarvení a tvar každého zvířete přesně podle skutečného druhu, aby šlo bezpečně poznat. Jen zvíře (a uvedená drobná podložka, voda či rostlina), žádný text, průhledné pozadí, čtverec, zvíře celé v záběru uprostřed; dospělý a mistr asi 80 % výšky obrázku (u protáhlých zvířat – had, ryba, ještěrka, slepýš – asi 80 % šířky), mládě, larva, pulec, plůdek a kukla menší, asi 50–60 %. Spodní okraj zvířete asi 8 % nad spodním okrajem obrázku.\n`;
  for (const it of b) out += `\n${String(++n).padStart(3, '0')} – ${it.file}\n${it.text}\n`;
});
writeFileSync(new URL('../outputs/G-zbyva/9-zvirata-zbytek.txt', import.meta.url), out);
console.log('obrázků', items.length, 'dávek', batches.length);
