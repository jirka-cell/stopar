// Výchozí konfigurace. Vše je editovatelné v adminu a ukládá se do IndexedDB.
// Mapy (biotopy, potrava) se zapisují jako text "klic:vaha, klic:vaha", aby šly snadno upravit ve formuláři.

import { SPECIES, EDU_FIELDS, EMPTY_EDU, GROUPS } from './species.js';
import { BATCH1 } from './species-batch1.js';
import { BATCH2 } from './species-batch2.js';
import { BATCH3 } from './species-batch3.js';
import { BATCH4 } from './species-batch4.js';
export { EDU_FIELDS, GROUPS };

export const CONFIG_VERSION = 4;

// Text do HTML: znaky, které by šlo zneužít k vložení kódu, se nahradí
export const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

export const DEFAULTS = {
  version: CONFIG_VERSION,
  general: {
    appName: 'Stopař',
    adminPin: '1234',
    simulation: false,      // chůze ťukáním do mapy místo GPS (pro testování z domova)
    simSpeed: 1.4,          // m/s při simulované chůzi
    showBiotopes: false,    // ladicí vrstva s biotopy z OSM
    monthOverride: 0,       // simulovaný měsíc 1–12 pro testování sezónnosti (0 = skutečný měsíc)
    author: 'Jiří Oboznenko',     // autor aplikace (stránka O aplikaci)
    controller: 'Jiří Oboznenko', // správce osobních údajů (zásady)
    contact: ''                   // kontaktní e-mail pro dotazy a zpětnou vazbu testerů
  },
  spawn: {
    density: 5,             // očekávaný počet ptáků v okruhu
    radius: 500,            // m – okruh, ve kterém se ptáci zobrazují
    minDistance: 25,        // m – minimální vzdálenost spawnu od hráče
    cellSize: 100,          // m – mřížka deterministických spawnů (stejné pro všechny hráče na místě)
    slotMinutes: 10,        // min – po jaké době se ptáci přeházejí
    jitter: 0.8,            // 0–1 – náhodný posun ptáka uvnitř buňky
    nightFactorDay: 0.25,   // váha denních ptáků v noci
    seed: 20261119,         // změna seedu = jiné rozmístění
    refLat: 50,             // ° – šířka pro převod mřížky na metry; musí být stejná pro všechny hráče (ČR = 50)
    region: 'cz',           // region pro výšková pásma a výběr druhů
    elevZoom: 12            // zoom výškových dlaždic pro výšku (~30 m na pixel); stejný pro všechny hráče
  },
  catch: {
    radius: 100,            // m – dosah pro chytání
    chanceFull: 0.9,        // šance při hlavní potravě
    chanceHalf: 0.5,        // šance při vedlejší potravě
    chanceWrong: 0.1,       // šance při špatné potravě
    fleeWrong: 0.4,         // pravděpodobnost útěku po špatné potravě
    maxFoodTries: 3,
    hintAfter: 2,           // po kolika neúspěších ukázat nápovědu
    shots: 3,               // počet pokusů ve foto minihře
    minQuality: 50,         // % – minimální ostrost pro chycení
    statRandomMin: 0.85,    // náhodný rozptyl statistik (0.85 = 85–100 % základu)
    photoBonus: 0.15,       // max. bonus ze 100% ostrosti
    realPhotoBonus: 10,     // jednorázový bonus za skutečnou fotku
    maxStat: 100,
    gonePrune: 7            // dní – jak dlouho si pamatovat chycené/uprchlé spawny
  },
  gps: {
    maxAccuracy: 50,        // m – horší přesnost se nezapočítává do vzdálenosti
    maxSpeed: 8,            // m/s – vyšší rychlost = auto/skok, nezapočítává se
    minStep: 5,             // m – menší posun se ignoruje (šum)
    highAccuracy: true
  },
  map: {
    style: 'auto',          // auto = herní den/noc podle slunce, jinak hra | noc | data | papir | bio
    compass: true,          // tlačítko režimu kompasu (mapa se otáčí podle telefonu)
    quickLook: true,        // tlačítko „Vzhled“ na mapě (rychlé přepínání bez PINu)
    vectorUrl: 'https://tiles.openfreemap.org/planet',
    glyphsUrl: 'https://tiles.openfreemap.org/fonts/{fontstack}/{range}.pbf',
    demUrl: 'https://s3.amazonaws.com/elevation-tiles-prod/terrarium/{z}/{x}/{y}.png',
    trailsUrl: 'https://tile.waymarkedtrails.org/{type}/{z}/{x}/{y}.png',
    attribution: '© přispěvatelé <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> · <a href="https://openfreemap.org">OpenFreeMap</a>',
    minZoom: 12,            // zoom MapLibre (o 1 menší než dřív v Leafletu pro stejné měřítko)
    maxZoom: 19,
    startZoom: 16,
    startLat: 50.2306,
    startLon: 12.8711,
    tileCacheMax: 3000      // max. počet dlaždic (mapa, terén, trasy) v offline cache
  },
  layers: {                 // volitelné vrstvy mapy
    roadNames: true, waterNames: false, parkNames: false, places: true,
    poiShop: false, poiFood: false, poiTransport: false, poiEdu: false, poiHealth: false, poiTourism: false, poiParking: false, poiNames: false,
    paths: true, rail: false, peaks: false, protected: false, landDetail: false,
    hillshade: false, contours: false, biotopes: false,
    buildings: 'flat',      // off | flat | 3d
    trHiking: false, trCycling: false, trMtb: false, trSkating: false, trRiding: false, trSlopes: false
  },
  // Uložené předvolby vzhledu (styl + vrstvy); vrstvy, které předvolba neuvádí, jsou vypnuté
  mapPresets: [
    { name: 'Úsporný', style: 'auto', layers: { places: true, paths: true, buildings: 'off' } },
    { name: 'Výlet', style: 'auto', layers: { places: true, paths: true, peaks: true, protected: true, waterNames: true, contours: true, hillshade: true, trHiking: true, buildings: 'flat' } },
    { name: 'Město', style: 'data', layers: { roadNames: true, places: true, paths: true, poiShop: true, poiFood: true, poiTransport: true, poiEdu: true, poiHealth: true, poiTourism: true, poiNames: true, buildings: 'flat' } },
    { name: 'Les a hory', style: 'auto', layers: { places: true, paths: true, hillshade: true, contours: true, peaks: true, protected: true, trHiking: true, buildings: 'flat' } },
    { name: 'Hledání zvířat', style: 'bio', layers: { places: true, paths: true, biotopes: true, waterNames: true, parkNames: true, buildings: 'flat' } },
    { name: 'U vody', style: 'auto', layers: { places: true, paths: true, waterNames: true, biotopes: true, protected: true, buildings: 'flat' } },
    { name: 'Na kole', style: 'auto', layers: { roadNames: true, places: true, paths: true, trCycling: true, trMtb: true, buildings: 'flat' } },
    { name: 'Naučná procházka', style: 'papir', layers: { places: true, paths: true, trHiking: true, protected: true, parkNames: true, poiTourism: true, poiNames: true, peaks: true, buildings: 'flat' } },
    { name: 'Zima', style: 'auto', layers: { places: true, paths: true, trSlopes: true, hillshade: true, contours: true, peaks: true, buildings: 'flat' } },
    { name: 'Papírová mapa', style: 'papir', layers: { places: true, paths: true, contours: true, hillshade: true, peaks: true, waterNames: true, trHiking: true, buildings: 'flat' } },
    { name: 'Maximum', style: 'data', layers: { roadNames: true, waterNames: true, parkNames: true, places: true, poiShop: true, poiFood: true, poiTransport: true, poiEdu: true, poiHealth: true, poiTourism: true, poiParking: true, poiNames: true, paths: true, rail: true, peaks: true, protected: true, landDetail: true, hillshade: true, contours: true, trHiking: true, trCycling: true, buildings: '3d' } }
  ],
  osm: {
    // servery Overpass, jeden na řádek; při výpadku se automaticky zkusí další
    overpassUrl: 'https://overpass-api.de/api/interpreter\nhttps://overpass.private.coffee/api/interpreter\nhttps://overpass.kumi.systems/api/interpreter',
    chunkDeg: 0.01,         // velikost stahovaného čtverce ve stupních (~1,1 × 0,7 km)
    cacheDays: 30,
    lineBuffer: 15,         // m – šířka řek/potoků zadaných jako čára
    timeout: 25,            // s
    defaultBiotope: 'louka', // biotop, když OSM nic nemá
    villagePlaces: 'village,hamlet,isolated_dwelling', // place=… vesnice (rozliší vesnici od města)
    townPlaces: 'city,town,suburb,quarter,borough',     // place=… město
    protectedPaths: true,   // v chráněných územích zvířata jen u cest
    pathBuffer: 30,         // m – jak daleko od cesty
    targetTags: 'tourism=viewpoint|Vyhlídka|🔭\nman_made=tower|Rozhledna|🗼\nnatural=peak|Vrchol|⛰️\nhistoric=castle|Hrad nebo zámek|🏰\nhistoric=ruins|Zřícenina|🏚️\nnatural=spring|Pramen|💧\nnatural=cave_entrance|Jeskyně|🕳️',
    villageRadius: 1500     // m – jak daleko hledat nejbližší název obce
  },
  daynight: {
    mode: 'sun',            // sun = podle slunce, hours = podle hodin, day = vždy den, night = vždy noc
    sunAltitude: -6,        // ° – pod touto výškou slunce je noc (−6 = občanský soumrak)
    nightFrom: 19,
    nightTo: 6
  },
  rarities: [
    { id: '1', name: 'Běžný', weight: 1 },
    { id: '2', name: 'Vzácnější', weight: 0.45 },
    { id: '3', name: 'Vzácný', weight: 0.18 }
  ],
  rarityGame: [ // parametry foto minihry podle vzácnosti
    { id: '1', zone: 0.30, speed: 2.3 },
    { id: '2', zone: 0.22, speed: 3.1 },
    { id: '3', zone: 0.15, speed: 3.9 }
  ],
  stats: [
    { id: 'rychlost', name: 'Rychlost' },
    { id: 'sila', name: 'Síla' },
    { id: 'maskovani', name: 'Maskování' },
    { id: 'vydrz', name: 'Výdrž' }
  ],
  biotopes: [               // priorita: nižší vyhrává (malé plochy uvnitř velkých)
    { id: 'voda', name: 'Voda', color: '#6bb6e0', priority: 1,
      tags: 'natural=water\nwaterway=riverbank\nlanduse=reservoir\nlanduse=basin\nwater=*\nwaterway=river|line\nwaterway=stream|line\nwaterway=canal|line' },
    { id: 'mokrad', name: 'Mokřad', color: '#7fc7b8', priority: 2,
      tags: 'natural=wetland\nwetland=*' },
    { id: 'skaly', name: 'Skály a lomy', color: '#b5b0a5', priority: 2,
      tags: 'natural=bare_rock\nnatural=scree\nnatural=cliff|line\nlanduse=quarry' },
    { id: 'park', name: 'Park', color: '#9fd08a', priority: 3,
      tags: 'leisure=park\nleisure=garden\nlanduse=cemetery\nlanduse=recreation_ground\nlanduse=village_green\nleisure=golf_course' },
    { id: 'sad', name: 'Sad a zahrádky', color: '#b9d36b', priority: 3,
      tags: 'landuse=orchard\nlanduse=vineyard\nlanduse=allotments' },
    { id: 'les', name: 'Les', color: '#6fa36b', priority: 4,
      tags: 'landuse=forest\nnatural=wood' },
    { id: 'vesnice', name: 'Vesnice', color: '#e2cfa8', priority: 5, villageFrom: 'mesto',
      tags: 'landuse=farmyard' },
    { id: 'mesto', name: 'Město', color: '#cfc8bd', priority: 5,
      tags: 'landuse=residential\nlanduse=commercial\nlanduse=retail\nlanduse=industrial\nlanduse=railway\nlanduse=construction' },
    { id: 'pole', name: 'Pole', color: '#e8dc8f', priority: 6,
      tags: 'landuse=farmland' },
    { id: 'louka', name: 'Louka', color: '#c8dc8a', priority: 6,
      tags: 'landuse=meadow\nlanduse=grass\nnatural=grassland\nnatural=heath\nnatural=scrub' }
  ],
  foods: [
    { id: 'zrni', name: 'Zrní a semena' },
    { id: 'hmyz', name: 'Hmyz' },
    { id: 'larvy', name: 'Larvy ze dřeva' },
    { id: 'zizaly', name: 'Žížaly' },
    { id: 'bobule', name: 'Bobule' },
    { id: 'ryba', name: 'Ryba' },
    { id: 'hlodavec', name: 'Hlodavec' },
    { id: 'rostliny', name: 'Vodní rostliny' },
    { id: 'listi', name: 'Listí a tráva' },
    { id: 'orisky', name: 'Žaludy a oříšky' },
    { id: 'nektar', name: 'Nektar a květy' },
    { id: 'slimaci', name: 'Slimáci a plži' },
    { id: 'drobotina', name: 'Vodní drobotina' },
    { id: 'zaby', name: 'Žáby a pulci' },
    { id: 'maso', name: 'Kousek masa' }
  ],
  species: [...SPECIES, ...BATCH1, ...BATCH2, ...BATCH3, ...BATCH4],
  regions: [               // výšková pásma: id:od_výšky_m (hranice lesa se liší podle zeměpisné šířky)
    { id: 'cz', name: 'Česko', zones: 'nizina:0, pahorkatina:300, vrchovina:600, hory:900, nad_lesem:1300' }
  ],
  atlas: {                 // kdy se v atlasu odemknou vzdělávací údaje
    basicAt: 1,            // zařazení, poznávání, ochrana, zajímavosti – po kolikátém úlovku
    lifeAt: 3,             // rozmnožování a život – po kolikátém úlovku
    signsNeedPhoto: true   // hlas a pobytová znamení až se skutečnou fotkou (jinak spolu s „život“)
  },
  // Ubikace ve sbírce: do které patří skupiny živočichů (poslední = ostatní)
  enclosures: [
    { id: 'voliera', name: 'Voliéra', icon: '🐦', groups: 'Ptáci' },
    { id: 'vybeh', name: 'Výběh', icon: '🐾', groups: 'Savci' },
    { id: 'rybnik', name: 'Rybník', icon: '🐟', groups: 'Ryby' },
    { id: 'terarium', name: 'Terárium', icon: '🦎', groups: 'Plazi, Obojživelníci' },
    { id: 'insektarium', name: 'Insektárium', icon: '🦋', groups: 'Hmyz, Pavoukovci, Měkkýši, Ostatní' }
  ],
  game: {
    maxBase: 5,             // kolik jedinců druhu smí mít hráč na 1. úrovni
    maxPerLevel: 1,         // + kolik za každou další úroveň
    maxCap: 30,             // strop jedinců jednoho druhu
    levelBase: 100,         // XP na 2. úroveň
    levelGrowth: 1.4,       // každá další úroveň potřebuje tolikrát víc XP
    xpCatch: 10, xpNew: 50, xpVerified: 30, xpPerKm: 20, xpQuiz: 10, xpBadge: 25,
    rarityLevel: '2:3, 3:6',  // vzácnost:úroveň – od které úrovně jde vzácnější zvíře chytit (do té doby silueta)
    unlocks: 'release:2, shop:2, train:3, contests:3, evolve:4, hide:5', // funkce:úroveň
    questsPerDay: 3, questsPerWeek: 2,
    quizBonus: 3,           // kolik bodů přidá správná odpověď v kvízu ke všem vlastnostem jedince
    conesPerKm: 50,         // šišky za 1 km skutečné chůze (simulace se nepočítá)
    trainCost: 20, trainPerDay: 3, trainXp: 10, trainGain: 2,
    stageXp: 60,            // XP jedince na další stádium (× pořadí stádia)
    evolveCost: 30,         // body na další stádium (× pořadí stádia)
    evolveBoost: 10,        // % ke všem vlastnostem za stádium
    progressStyle: 'ring',  // ring = kroužek, stars = hvězdičky, bar = proužek
    // vývojová stádia: řádek bez skupiny = výchozí, jinak „Skupina: stádia“
    stages: ': mládě, dospělý, mistr\nObojživelníci: pulec, mladý, dospělý, mistr\nHmyz: larva, kukla, dospělec, mistr\nRyby: plůdek, mladá ryba, dospělá, mistr',
    releaseBase: 10, releaseRarity: '1:1, 2:2.5, 3:6', // body za vypuštění = základ × vzácnost × (stádium + 1)
    radiusMult: 2, radiusMinutes: 15, lensMult: 1.5,
    xpContest: 10           // XP za odehranou soutěž
  },
  dog: {
    enabled: true,          // pes Aegon v rohu mapy
    size: 96,               // velikost v px
    lieMinutes: 2,          // po kolika minutách klidu si lehne (v noci za polovinu)
    sleepMinutes: 6,        // po kolika minutách klidu usne
    sniffRadius: 200        // m – zvíře blízko, ale mimo dosah → čenichá
  },
  family: {
    kidAge: 8,              // režim pro malé děti „podle věku“: do kolika let
    kidQuality: 80,         // ostrost fotky v režimu pro malé děti (bez minihry)
    vibrate: true           // krátká vibrace, když je v dosahu druh, který hráč ještě nemá
  },
  field: {
    trackChance: 0.25,      // jak často je místo zvířete jen jeho stopa (u druhů s popsanými znameními)
    xpTrack: 10             // XP za správně určenou stopu
  },
  world: {
    weather: true,          // počasí z MET Norway (api.met.no, CC BY 4.0)
    // řádek „stav: druh nebo skupina:násobek, …“; stavy rain (i 3 h po dešti), snow, cold, hot, clear, cloudy
    weatherBoost: 'rain: hlemyzd:3, kos:2, mlok:3, colek:2, Obojživelníci:1.8\nsnow: konadra:2, modrinka:2, vrabec:1.5, zajic:1.5\ncold: konadra:2, modrinka:2, vrabec:1.5\nhot: jesterka:2.5, zmije:2, slepys:1.5, vazka:2, babocka:2, otakarek:2, Hmyz:1.5\nclear: Hmyz:1.3',
    twilightFrom: -8, twilightTo: 4, // šero: výška slunce mezi (°) – víc srnců, zajíců, lišek…
    twilightBoost: 'srnec:3, zajic:2.5, liska:2, jelen:2, netopyr:2, jezek:2, jezevec:1.5, kos:1.5',
    hideMinutes: 2, hideMove: 15, hideBoost: '2:2, 3:3', // skrýš: v klidu (m) X minut → plašší a vzácnější zvířata
    quietMonths: '4-7', quietBiotopes: 'mokrad, skaly', // klidová pásma: v chráněném území v době hnízdění nic v rákosí a na skalách
    variantChance: 0.003, albinGroups: 'Ptáci, Savci, Obojživelníci, Plazi, Ryby', melanGroups: 'Savci, Plazi', melanSpecies: 'zmije:0.08, veverka:0.05',
    stampRadius: 40, xpStamp: 15
  },
  // Sezónní události: od–do jako MM-DD, boost = druh nebo skupina:násobek
  events: [
    { id: 'hodinka', name: 'Ptačí hodinka', from: '01-05', to: '01-12', boost: 'Ptáci:1.5', text: 'Velké sčítání ptáků na krmítkách (Česká společnost ornitologická).' },
    { id: 'zabitah', name: 'Žabí tah', from: '03-10', to: '04-20', boost: 'Obojživelníci:2.5', text: 'Žáby, ropuchy a čolci putují k rybníkům. Na silnicích dávej pozor!' },
    { id: 'prilet', name: 'Jarní přílet ptáků', from: '03-15', to: '05-10', boost: 'cap:3, konipas:2, kukacka:2, rakosnik:2', text: 'Vracejí se tažní ptáci z Afriky a jižní Evropy.' },
    { id: 'rije', name: 'Jelení říje', from: '09-15', to: '10-15', boost: 'jelen:3, srnec:1.5', text: 'Jeleni troubí a soupeří o laně – za šera je slyšet daleko.' },
    { id: 'tah', name: 'Podzimní tah', from: '09-01', to: '10-31', boost: 'Ptáci:1.3', text: 'Ptáci se shromažďují a táhnou na jih.' }
  ],
  // Kalendář přírody: text pro každý měsíc (id = číslo měsíce)
  calendar: [
    { id: '1', text: 'Nejchladnější měsíc. Ptáci se slétají na krmítka, ve sněhu najdeš stopy zajíců, lišek a srnců.' },
    { id: '2', text: 'Ozývají se první sýkory a datli bubnují. Lišky mají páření, ve sněhu jsou vidět jejich stopy v řadě.' },
    { id: '3', text: 'Probouzí se ježci a začíná žabí tah. Vracejí se čápi, kvetou podběly.' },
    { id: '4', text: 'Ptáci zpívají a stavějí hnízda. Kuká kukačka, objevují se první motýli a ještěrky.' },
    { id: '5', text: 'Les je plný zpěvu, rodí se srnčata. Létají chrousti a vážky.' },
    { id: '6', text: 'Ptáci krmí mláďata. Na loukách je spousta hmyzu, v teplých nocích létají netopýři.' },
    { id: '7', text: 'Horko: u vody vážky a skokani, na sluníčku ještěrky. Mláďata se učí létat.' },
    { id: '8', text: 'Dozrávají ostružiny a lískové oříšky. Rorýsi a čápi se chystají k odletu.' },
    { id: '9', text: 'Začíná podzimní tah a jelení říje. Veverky si dělají zásoby.' },
    { id: '10', text: 'Barevné listí, houby. Ptáci táhnou na jih, ježci se vykrmují na zimu.' },
    { id: '11', text: 'Ježci, netopýři a plši usínají zimním spánkem. Přilétají zimní hosté ze severu.' },
    { id: '12', text: 'Zima: stopy ve sněhu, ptáci na krmítkách. Vyvěs lojovou kouli a pozoruj, kdo přiletí.' }
  ],
  // Obchod: effect = feed (XP jedince = value) | lure (zvíře vždy přijde) | lens (širší zelená zóna) | radius (větší dosah chytání)
  shop: [
    { id: 'krmivo', name: 'Krmivo', icon: '🥣', price: 15, effect: 'feed', value: 15, desc: '+15 XP jedinci, kterého nakrmíš' },
    { id: 'pamlsek', name: 'Pamlsek', icon: '🍓', price: 40, effect: 'feed', value: 50, desc: '+50 XP jedinci' },
    { id: 'navnada', name: 'Návnada', icon: '🪱', price: 25, effect: 'lure', value: 1, desc: 'Při setkání zvíře určitě přijde blíž' },
    { id: 'objektiv', name: 'Objektiv', icon: '🔭', price: 60, effect: 'lens', value: 1, desc: 'Širší zelená zóna při focení' },
    { id: 'dalekohled', name: 'Dalekohled', icon: '🔍', price: 80, effect: 'radius', value: 1, desc: 'Na 15 minut dvojnásobný dosah chytání' }
  ],
  // Odznaky: kind = species | catches | km | verified | quiz | level | stamps | released | evolved | album (album = id alba)
  badges: [
    { id: 'druhy5', name: '5 druhů', icon: '🌱', kind: 'species', value: 5, album: '' },
    { id: 'druhy25', name: '25 druhů', icon: '🌿', kind: 'species', value: 25, album: '' },
    { id: 'druhy50', name: '50 druhů', icon: '🌳', kind: 'species', value: 50, album: '' },
    { id: 'druhy100', name: 'Všech 100', icon: '🏆', kind: 'species', value: 100, album: '' },
    { id: 'ulovky10', name: '10 úlovků', icon: '📸', kind: 'catches', value: 10, album: '' },
    { id: 'ulovky100', name: '100 úlovků', icon: '🎞️', kind: 'catches', value: 100, album: '' },
    { id: 'km5', name: '5 km', icon: '👟', kind: 'km', value: 5, album: '' },
    { id: 'km25', name: '25 km', icon: '🥾', kind: 'km', value: 25, album: '' },
    { id: 'km100', name: '100 km', icon: '🗺️', kind: 'km', value: 100, album: '' },
    { id: 'foto3', name: '3 skutečné fotky', icon: '📷', kind: 'verified', value: 3, album: '' },
    { id: 'kviz10', name: '10 správných odpovědí', icon: '🧠', kind: 'quiz', value: 10, album: '' },
    { id: 'uroven5', name: 'Úroveň 5', icon: '⭐', kind: 'level', value: 5, album: '' },
    { id: 'uroven10', name: 'Úroveň 10', icon: '🌟', kind: 'level', value: 10, album: '' },
    { id: 'alb_sovy', name: 'Album Sovy', icon: '🦉', kind: 'album', value: 1, album: 'sovy' },
    { id: 'alb_voda', name: 'Album U vody', icon: '💧', kind: 'album', value: 1, album: 'voda' },
    { id: 'alb_noc', name: 'Album Noční zvířata', icon: '🌙', kind: 'album', value: 1, album: 'noc' }
  ],
  // Sběratelská alba: id druhů oddělená čárkou
  albums: [
    { id: 'sovy', name: 'Sovy', icon: '🦉', species: 'pustik, vyr, sycek' },
    { id: 'datli', name: 'Datlovití', icon: '🪵', species: 'datel, strakapoud, zluna' },
    { id: 'dravci', name: 'Dravci', icon: '🦅', species: 'kane, postolka, krahujec, jestrab' },
    { id: 'voda', name: 'U vody', icon: '💧', species: 'kachna, volavka, lednacek, labut, lyska, kormoran, potapka, bobr, vydra, kapr, stika, pstruh, okoun, lin, sumec' },
    { id: 'zaby', name: 'Obojživelníci', icon: '🐸', species: 'skokan, ropucha, rosnicka, colek, mlok, kunka, ropuchazelena, skokanzeleny' },
    { id: 'hmyz', name: 'Hmyz', icon: '🦋', species: 'babocka, cmelak, rohac, slunecko, vazka, otakarek, mravenec, chroust' },
    { id: 'noc', name: 'Noční zvířata', icon: '🌙', species: 'pustik, jezek, netopyr, vyr, jezevec, kuna, bobr, rak, vydra, plch, ropuchazelena, sycek, mysice, tchor, sumec' }
  ],
  // Šablony úkolů: period day | week; kind catch | catchGroup (param = skupina) | catchBio (param = biotop) | newSpecies | walk (count v m) | photo | quiz
  quests: [
    { id: 'd_catch3', name: 'Chyť 3 zvířata', period: 'day', kind: 'catch', param: '', count: 3, xp: 30, cones: 20 },
    { id: 'd_bird', name: 'Chyť ptáka', period: 'day', kind: 'catchGroup', param: 'Ptáci', count: 1, xp: 20, cones: 10 },
    { id: 'd_mammal', name: 'Chyť savce', period: 'day', kind: 'catchGroup', param: 'Savci', count: 1, xp: 25, cones: 15 },
    { id: 'd_water', name: 'Chyť zvíře u vody', period: 'day', kind: 'catchBio', param: 'voda', count: 1, xp: 25, cones: 15 },
    { id: 'd_forest', name: 'Chyť zvíře v lese', period: 'day', kind: 'catchBio', param: 'les', count: 1, xp: 20, cones: 10 },
    { id: 'd_walk1', name: 'Ujdi 1 km', period: 'day', kind: 'walk', param: '', count: 1000, xp: 25, cones: 20 },
    { id: 'd_quiz', name: 'Správně odpověz v kvízu', period: 'day', kind: 'quiz', param: '', count: 1, xp: 15, cones: 10 },
    { id: 'w_new', name: 'Objev 3 nové druhy', period: 'week', kind: 'newSpecies', param: '', count: 3, xp: 120, cones: 80 },
    { id: 'w_walk5', name: 'Ujdi 5 km', period: 'week', kind: 'walk', param: '', count: 5000, xp: 100, cones: 80 },
    { id: 'w_catch15', name: 'Chyť 15 zvířat', period: 'week', kind: 'catch', param: '', count: 15, xp: 100, cones: 60 },
    { id: 'w_photo', name: 'Vyfoť skutečné zvíře', period: 'week', kind: 'photo', param: '', count: 1, xp: 80, cones: 50 }
  ],
};

// Popis polí pro admin (generický formulář). [klíč, popisek, typ, volby]
export const SCHEMA = [
  { sec: 'general', title: 'Obecné', fields: [
    ['appName', 'Název aplikace', 'text'],
    ['adminPin', 'PIN do adminu', 'text'],
    ['simulation', 'Simulace chůze ťukáním do mapy (bez GPS)', 'bool'],
    ['simSpeed', 'Rychlost simulované chůze (m/s)', 'number', { min: 0.5, max: 30, step: 0.1 }],
    ['showBiotopes', 'Zobrazit vrstvu biotopů z OSM', 'bool'],
    ['monthOverride', 'Simulovaný měsíc pro test sezónnosti (0 = skutečný)', 'number', { min: 0, max: 12, step: 1 }],
    ['author', 'Autor aplikace', 'text'],
    ['controller', 'Správce osobních údajů (jméno nebo firma)', 'text'],
    ['contact', 'Kontaktní e-mail', 'text']
  ] },
  { sec: 'spawn', title: 'Objevování zvířat', fields: [
    ['density', 'Počet zvířat v okruhu (průměr)', 'number', { min: 0, max: 100, step: 1 }],
    ['radius', 'Okruh zobrazení (m)', 'number', { min: 50, max: 3000, step: 10 }],
    ['minDistance', 'Min. vzdálenost od hráče (m)', 'number', { min: 0, max: 500, step: 5 }],
    ['cellSize', 'Velikost buňky spawnu (m)', 'number', { min: 20, max: 1000, step: 10 }],
    ['slotMinutes', 'Přeházení ptáků po (min)', 'number', { min: 1, max: 1440, step: 1 }],
    ['jitter', 'Náhodný posun v buňce (0–1)', 'number', { min: 0, max: 1, step: 0.05 }],
    ['nightFactorDay', 'Váha denních zvířat v noci', 'number', { min: 0, max: 1, step: 0.05 }],
    ['seed', 'Seed rozmístění', 'number', { step: 1 }],
    ['refLat', 'Referenční šířka mřížky (°, změna = jiné rozmístění)', 'number', { min: -80, max: 80, step: 1 }],
    ['region', 'Region (id z Regiony a výšková pásma)', 'text'],
    ['elevZoom', 'Zoom výškových dlaždic (10–14, změna = jiná pásma)', 'number', { min: 10, max: 14, step: 1 }]
  ] },
  { sec: 'catch', title: 'Chytání', fields: [
    ['radius', 'Dosah chytání (m)', 'number', { min: 5, max: 2000, step: 5 }],
    ['chanceFull', 'Šance – hlavní potrava', 'number', { min: 0, max: 1, step: 0.05 }],
    ['chanceHalf', 'Šance – vedlejší potrava', 'number', { min: 0, max: 1, step: 0.05 }],
    ['chanceWrong', 'Šance – špatná potrava', 'number', { min: 0, max: 1, step: 0.05 }],
    ['fleeWrong', 'Útěk po špatné potravě', 'number', { min: 0, max: 1, step: 0.05 }],
    ['maxFoodTries', 'Max. pokusů s potravou', 'number', { min: 1, max: 10, step: 1 }],
    ['hintAfter', 'Nápověda po neúspěších', 'number', { min: 0, max: 10, step: 1 }],
    ['shots', 'Pokusů ve foto minihře', 'number', { min: 1, max: 10, step: 1 }],
    ['minQuality', 'Min. ostrost pro chycení (%)', 'number', { min: 0, max: 100, step: 1 }],
    ['statRandomMin', 'Rozptyl statistik – minimum (0–1)', 'number', { min: 0, max: 1, step: 0.01 }],
    ['photoBonus', 'Bonus ze 100% ostrosti (0–1)', 'number', { min: 0, max: 2, step: 0.01 }],
    ['realPhotoBonus', 'Bonus za skutečnou fotku (body)', 'number', { min: 0, max: 100, step: 1 }],
    ['maxStat', 'Strop statistiky', 'number', { min: 1, max: 1000, step: 1 }],
    ['gonePrune', 'Paměť chycených spawnů (dny)', 'number', { min: 1, max: 365, step: 1 }]
  ] },
  { sec: 'gps', title: 'GPS', fields: [
    ['maxAccuracy', 'Max. nepřesnost pro počítání vzdálenosti (m)', 'number', { min: 5, max: 500, step: 5 }],
    ['maxSpeed', 'Max. rychlost chůze (m/s)', 'number', { min: 1, max: 50, step: 0.5 }],
    ['minStep', 'Min. krok (m)', 'number', { min: 0, max: 100, step: 1 }],
    ['highAccuracy', 'Vysoká přesnost GPS', 'bool']
  ] },
  { sec: 'map', title: 'Mapa', fields: [
    ['style', 'Styl mapy', 'select', { options: [['auto', 'Automaticky (herní den / noc)'], ['hra', 'Herní den'], ['noc', 'Herní noc'], ['data', 'Bohatá data'], ['papir', 'Papír a akvarel'], ['bio', 'Biotopy']] }],
    ['compass', 'Tlačítko režimu kompasu', 'bool'],
    ['quickLook', 'Tlačítko „Vzhled“ na mapě (bez PINu)', 'bool'],
    ['vectorUrl', 'Vektorová mapa (TileJSON URL)', 'text'],
    ['glyphsUrl', 'Písma popisků (URL)', 'text'],
    ['demUrl', 'Výškové dlaždice Terrarium (URL)', 'text'],
    ['trailsUrl', 'Trasy – obrázkové dlaždice ({type} = druh trasy)', 'text'],
    ['attribution', 'Atribuce (HTML, jen odkazy)', 'text'],
    ['minZoom', 'Min. zoom', 'number', { min: 1, max: 20, step: 1 }],
    ['maxZoom', 'Max. zoom', 'number', { min: 1, max: 22, step: 1 }],
    ['startZoom', 'Výchozí zoom', 'number', { min: 1, max: 22, step: 1 }],
    ['startLat', 'Výchozí šířka', 'number', { step: 0.0001 }],
    ['startLon', 'Výchozí délka', 'number', { step: 0.0001 }],
    ['tileCacheMax', 'Max. dlaždic v offline cache', 'number', { min: 0, max: 20000, step: 100 }]
  ] },
  { sec: 'layers', title: 'Vrstvy mapy', fields: [
    ['buildings', 'Budovy', 'select', { options: [['off', 'Bez budov'], ['flat', 'Ploché'], ['3d', '3D']] }],
    ['roadNames', 'Názvy ulic', 'bool'], ['waterNames', 'Názvy vod', 'bool'], ['parkNames', 'Názvy parků', 'bool'], ['places', 'Čtvrti a obce', 'bool'],
    ['poiShop', 'Místa: obchody', 'bool'], ['poiFood', 'Místa: jídlo a pití', 'bool'], ['poiTransport', 'Místa: doprava', 'bool'], ['poiEdu', 'Místa: školy', 'bool'],
    ['poiHealth', 'Místa: zdraví', 'bool'], ['poiTourism', 'Místa: turistika', 'bool'], ['poiParking', 'Místa: parkování', 'bool'], ['poiNames', 'Názvy míst', 'bool'],
    ['paths', 'Pěšiny', 'bool'], ['rail', 'Železnice', 'bool'], ['peaks', 'Vrcholy', 'bool'], ['protected', 'Chráněná území', 'bool'], ['landDetail', 'Skály, písek', 'bool'],
    ['hillshade', 'Stínování terénu', 'bool'], ['contours', 'Vrstevnice', 'bool'], ['biotopes', 'Barvy biotopů', 'bool'],
    ['trHiking', 'Trasy: turistické (KČT)', 'bool'], ['trCycling', 'Trasy: cyklo', 'bool'], ['trMtb', 'Trasy: MTB', 'bool'],
    ['trSkating', 'Trasy: in-line', 'bool'], ['trRiding', 'Trasy: jezdecké', 'bool'], ['trSlopes', 'Trasy: sjezdovky', 'bool']
  ] },
  { sec: 'osm', title: 'OSM / biotopy', fields: [
    ['overpassUrl', 'Servery Overpass API (jeden na řádek, při výpadku další)', 'textarea'],
    ['chunkDeg', 'Velikost čtverce (°)', 'number', { min: 0.002, max: 0.05, step: 0.001 }],
    ['cacheDays', 'Platnost cache (dny)', 'number', { min: 1, max: 365, step: 1 }],
    ['lineBuffer', 'Šířka vodních toků (m)', 'number', { min: 1, max: 200, step: 1 }],
    ['timeout', 'Timeout dotazu (s)', 'number', { min: 5, max: 180, step: 1 }],
    ['defaultBiotope', 'Výchozí biotop (id)', 'text'],
    ['villagePlaces', 'Názvy obcí = vesnice (place=…)', 'text'],
    ['townPlaces', 'Názvy obcí = město (place=…)', 'text'],
    ['villageRadius', 'Hledat název obce do (m)', 'number', { min: 100, max: 5000, step: 100 }],
    ['protectedPaths', 'V chráněných územích zvířata jen u cest', 'bool'],
    ['pathBuffer', 'Vzdálenost od cesty v chráněném území (m)', 'number', { min: 5, max: 200, step: 5 }],
    ['targetTags', 'Turistické cíle (řádek: klíč=hodnota|název|ikona)', 'textarea']
  ] },
  { sec: 'daynight', title: 'Den a noc', fields: [
    ['mode', 'Režim', 'select', { options: [['sun', 'Podle slunce'], ['hours', 'Podle hodin'], ['day', 'Vždy den'], ['night', 'Vždy noc']] }],
    ['sunAltitude', 'Noc pod výškou slunce (°)', 'number', { min: -18, max: 5, step: 0.5 }],
    ['nightFrom', 'Noc od (h)', 'number', { min: 0, max: 23, step: 1 }],
    ['nightTo', 'Noc do (h)', 'number', { min: 0, max: 23, step: 1 }]
  ] },
  { sec: 'dog', title: 'Pes Aegon', fields: [
    ['enabled', 'Zobrazit psa v rohu mapy', 'bool'], ['size', 'Velikost (px)', 'number', { min: 48, max: 200, step: 4 }],
    ['lieMinutes', 'Lehne si po (min klidu)', 'number', { min: 1, max: 60, step: 1 }], ['sleepMinutes', 'Usne po (min klidu)', 'number', { min: 1, max: 120, step: 1 }],
    ['sniffRadius', 'Čenichá, když je zvíře do (m)', 'number', { min: 50, max: 1000, step: 10 }]
  ] },
  { sec: 'family', title: 'Rodina a malé děti', fields: [
    ['kidAge', 'Režim pro malé děti do věku (let)', 'number', { min: 3, max: 14, step: 1 }],
    ['kidQuality', 'Ostrost fotky bez minihry (%)', 'number', { min: 30, max: 100, step: 1 }],
    ['vibrate', 'Vibrace u nového druhu v dosahu', 'bool']
  ] },
  { sec: 'field', title: 'Stopy a poznávání', fields: [
    ['trackChance', 'Stopa místo zvířete: šance (0–1)', 'number', { min: 0, max: 1, step: 0.05 }],
    ['xpTrack', 'XP za určenou stopu', 'number', { min: 0, step: 1 }]
  ] },
  { sec: 'world', title: 'Svět (počasí, šero, skrýše, varianty)', fields: [
    ['weather', 'Počasí z MET Norway', 'bool'],
    ['weatherBoost', 'Počasí: násobky druhů (řádek „stav: druh:násobek, …“)', 'textarea'],
    ['twilightFrom', 'Šero od výšky slunce (°)', 'number', { min: -18, max: 10, step: 1 }], ['twilightTo', 'Šero do výšky slunce (°)', 'number', { min: -18, max: 15, step: 1 }],
    ['twilightBoost', 'Šero: násobky druhů', 'text'],
    ['hideMinutes', 'Skrýš: minut bez pohybu', 'number', { min: 1, max: 30, step: 1 }], ['hideMove', 'Skrýš: pohyb do (m)', 'number', { min: 5, max: 100, step: 1 }],
    ['hideBoost', 'Skrýš: násobek podle vzácnosti (vzácnost:násobek)', 'text'],
    ['quietMonths', 'Klidová pásma: měsíce', 'text'], ['quietBiotopes', 'Klidová pásma: biotopy (v chráněném území)', 'text'],
    ['variantChance', 'Barevné varianty: šance (0–1)', 'number', { min: 0, max: 1, step: 0.001 }],
    ['albinGroups', 'Albíni: skupiny', 'text'], ['melanGroups', 'Tmavá forma: skupiny', 'text'], ['melanSpecies', 'Tmavá forma: druhy se šancí (druh:šance)', 'text'],
    ['stampRadius', 'Razítko: vzdálenost od cíle (m)', 'number', { min: 10, max: 300, step: 5 }], ['xpStamp', 'Razítko: XP', 'number', { min: 0, step: 1 }]
  ] },
  { sec: 'atlas', title: 'Atlas – odemykání údajů', fields: [
    ['basicAt', 'Zařazení, poznávání, ochrana – po úlovku č.', 'number', { min: 1, max: 50, step: 1 }],
    ['lifeAt', 'Rozmnožování a život – po úlovku č.', 'number', { min: 1, max: 50, step: 1 }],
    ['signsNeedPhoto', 'Hlas a pobytová znamení až se skutečnou fotkou', 'bool']
  ] },
  { sec: 'game', title: 'Herní vrstva', fields: [
    ['maxBase', 'Jedinců druhu na 1. úrovni', 'number', { min: 1, max: 100, step: 1 }],
    ['maxPerLevel', 'Jedinců druhu navíc za úroveň', 'number', { min: 0, max: 10, step: 1 }],
    ['maxCap', 'Strop jedinců druhu', 'number', { min: 1, max: 200, step: 1 }],
    ['levelBase', 'XP na 2. úroveň', 'number', { min: 10, max: 10000, step: 10 }],
    ['levelGrowth', 'Růst XP na další úroveň (×)', 'number', { min: 1, max: 3, step: 0.05 }],
    ['xpCatch', 'XP za úlovek', 'number', { min: 0, step: 1 }], ['xpNew', 'XP za nový druh', 'number', { min: 0, step: 1 }],
    ['xpVerified', 'XP za skutečnou fotku', 'number', { min: 0, step: 1 }], ['xpPerKm', 'XP za 1 km chůze', 'number', { min: 0, step: 1 }],
    ['xpQuiz', 'XP za správnou odpověď', 'number', { min: 0, step: 1 }], ['xpBadge', 'XP za odznak', 'number', { min: 0, step: 1 }],
    ['rarityLevel', 'Vzácnost odemčená od úrovně (vzácnost:úroveň, …)', 'text'],
    ['unlocks', 'Funkce od úrovně (funkce:úroveň, …)', 'text'],
    ['questsPerDay', 'Denních úkolů', 'number', { min: 0, max: 10, step: 1 }], ['questsPerWeek', 'Týdenních úkolů', 'number', { min: 0, max: 10, step: 1 }],
    ['quizBonus', 'Bonus za kvíz ke všem vlastnostem', 'number', { min: 0, max: 50, step: 1 }],
    ['conesPerKm', 'Šišky za 1 km chůze', 'number', { min: 0, step: 1 }],
    ['trainCost', 'Trénink: cena (šišky)', 'number', { min: 0, step: 1 }], ['trainPerDay', 'Trénink: max. denně na jedince', 'number', { min: 0, step: 1 }],
    ['trainXp', 'Trénink: XP jedince', 'number', { min: 0, step: 1 }], ['trainGain', 'Trénink: + k nejslabší vlastnosti', 'number', { min: 0, step: 1 }],
    ['stageXp', 'Vývoj: XP jedince na stádium (× pořadí)', 'number', { min: 1, step: 1 }], ['evolveCost', 'Vývoj: body na stádium (× pořadí)', 'number', { min: 0, step: 1 }],
    ['evolveBoost', 'Vývoj: % ke všem vlastnostem', 'number', { min: 0, max: 100, step: 1 }],
    ['progressStyle', 'Postup ke stádiu', 'select', { options: [['ring', 'Kroužek (koláč)'], ['stars', 'Hvězdičky'], ['bar', 'Proužek']] }],
    ['stages', 'Vývojová stádia (řádek „Skupina: stádia“, bez skupiny = výchozí)', 'textarea'],
    ['releaseBase', 'Vypuštění: základ bodů', 'number', { min: 0, step: 1 }], ['releaseRarity', 'Vypuštění: násobek podle vzácnosti (vzácnost:násobek)', 'text'],
    ['radiusMult', 'Dalekohled: násobek dosahu', 'number', { min: 1, max: 10, step: 0.1 }], ['radiusMinutes', 'Dalekohled: minut', 'number', { min: 1, step: 1 }],
    ['lensMult', 'Objektiv: násobek zelené zóny', 'number', { min: 1, max: 5, step: 0.1 }],
    ['xpContest', 'XP za odehranou soutěž', 'number', { min: 0, step: 1 }]
  ] }
];

// Seznamy (pole objektů) v adminu
export const LISTS = [
  { sec: 'species', title: 'Druhy', label: o => o.name || o.id, fields: [
    ['id', 'ID (bez diakritiky)', 'text'], ['name', 'Název', 'text'], ['lat', 'Latinsky', 'text'],
    ['group', 'Skupina', 'select', { options: GROUPS.map(g => [g, g]) }], ['active', 'Aktivní', 'bool'], ['rarity', 'Vzácnost (id)', 'text'],
    ['night', 'Jen v noci', 'bool'], ['bio', 'Biotopy (id:váha, …)', 'text'],
    ['alt', 'Výšková pásma (id:váha, prázdné = všude)', 'text'], ['months', 'Měsíce výskytu (např. 3-10, prázdné = celý rok)', 'text'],
    ['regions', 'Regiony (id oddělená čárkou, prázdné = všude)', 'text'],
    ['food', 'Herní potrava (id:síla 1/0.5, …)', 'text'],
    ['stats', 'Základní statistiky (čísla oddělená čárkou)', 'text'], ['fact', 'Krátká zajímavost (při setkání)', 'textarea'],
    ['image', 'Vlastní obrázek', 'image'], ['imageAuthor', 'Autor obrázku', 'text'], ['imageLicense', 'Licence obrázku', 'text'],
    ['review', 'Údaje čekají na odbornou kontrolu', 'bool']
  ], look: true, edu: true },
  { sec: 'regions', title: 'Regiony a výšková pásma', label: o => o.name || o.id, fields: [
    ['id', 'ID', 'text'], ['name', 'Název', 'text'], ['zones', 'Pásma (id:od výšky v m, …)', 'text']
  ] },
  { sec: 'biotopes', title: 'Biotopy', label: o => o.name || o.id, fields: [
    ['id', 'ID', 'text'], ['name', 'Název', 'text'], ['color', 'Barva', 'color'],
    ['priority', 'Priorita (nižší vyhrává)', 'number', { step: 1 }],
    ['tags', 'OSM tagy (řádek = klíč=hodnota, * = cokoliv, |line = čára)', 'textarea'],
    ['villageFrom', 'U vesnic převzít plochy biotopu (id, např. mesto)', 'text']
  ] },
  { sec: 'foods', title: 'Potrava', label: o => o.name || o.id, fields: [['id', 'ID', 'text'], ['name', 'Název', 'text']] },
  { sec: 'rarities', title: 'Vzácnosti', label: o => o.id + ' – ' + o.name, fields: [['id', 'ID', 'text'], ['name', 'Název', 'text'], ['weight', 'Váha spawnu', 'number', { min: 0, step: 0.01 }]] },
  { sec: 'rarityGame', title: 'Foto minihra podle vzácnosti', label: o => 'Vzácnost ' + o.id, fields: [['id', 'ID vzácnosti', 'text'], ['zone', 'Šířka zelené zóny (0–1)', 'number', { min: 0.02, max: 1, step: 0.01 }], ['speed', 'Rychlost značky', 'number', { min: 0.1, max: 20, step: 0.1 }]] },
  { sec: 'stats', title: 'Statistiky', label: o => o.name || o.id, fields: [['id', 'ID', 'text'], ['name', 'Název', 'text']] },
  { sec: 'badges', title: 'Odznaky', label: o => (o.icon || '') + ' ' + (o.name || o.id), fields: [
    ['id', 'ID', 'text'], ['name', 'Název', 'text'], ['icon', 'Ikona (emoji)', 'text'],
    ['kind', 'Co se počítá', 'select', { options: [['species', 'druhy'], ['catches', 'úlovky'], ['km', 'km chůze'], ['verified', 'skutečné fotky'], ['quiz', 'správné odpovědi'], ['level', 'úroveň'], ['stamps', 'razítka'], ['released', 'vypuštěná zvířata'], ['evolved', 'vývoj zvířat'], ['album', 'hotové album']] }],
    ['value', 'Kolik', 'number', { min: 1, step: 1 }], ['album', 'Album (id, jen u „hotové album“)', 'text']
  ] },
  { sec: 'albums', title: 'Sběratelská alba', label: o => (o.icon || '') + ' ' + (o.name || o.id), fields: [
    ['id', 'ID', 'text'], ['name', 'Název', 'text'], ['icon', 'Ikona (emoji)', 'text'], ['species', 'Druhy (id oddělená čárkou)', 'textarea']
  ] },
  { sec: 'quests', title: 'Úkoly (šablony)', label: o => (o.period === 'week' ? '📅 ' : '☀️ ') + (o.name || o.id), fields: [
    ['id', 'ID', 'text'], ['name', 'Název', 'text'], ['period', 'Období', 'select', { options: [['day', 'denní'], ['week', 'týdenní']] }],
    ['kind', 'Co splnit', 'select', { options: [['catch', 'chytit zvíře'], ['catchGroup', 'chytit ze skupiny'], ['catchBio', 'chytit v biotopu'], ['newSpecies', 'nový druh'], ['walk', 'ujít (m)'], ['photo', 'skutečná fotka'], ['quiz', 'správná odpověď v kvízu']] }],
    ['param', 'Skupina nebo biotop (id)', 'text'], ['count', 'Kolik', 'number', { min: 1, step: 1 }],
    ['xp', 'Odměna XP', 'number', { min: 0, step: 1 }], ['cones', 'Odměna šišky', 'number', { min: 0, step: 1 }]
  ] },
  { sec: 'shop', title: 'Obchod', label: o => (o.icon || '') + ' ' + (o.name || o.id) + ' – ' + o.price, fields: [
    ['id', 'ID', 'text'], ['name', 'Název', 'text'], ['icon', 'Ikona (emoji)', 'text'], ['price', 'Cena (šišky)', 'number', { min: 0, step: 1 }],
    ['effect', 'Účinek', 'select', { options: [['feed', 'krmení (XP jedince)'], ['lure', 'návnada'], ['lens', 'objektiv'], ['radius', 'dalekohled']] }],
    ['value', 'Hodnota (XP u krmení)', 'number', { min: 0, step: 1 }], ['desc', 'Popis', 'text']
  ] },
  { sec: 'events', title: 'Sezónní události', label: o => o.name || o.id, fields: [
    ['id', 'ID', 'text'], ['name', 'Název', 'text'], ['from', 'Od (MM-DD)', 'text'], ['to', 'Do (MM-DD)', 'text'],
    ['boost', 'Násobky (druh nebo skupina:násobek, …)', 'text'], ['text', 'Popis', 'textarea']
  ] },
  { sec: 'calendar', title: 'Kalendář přírody', label: o => 'Měsíc ' + o.id, fields: [['id', 'Měsíc (1–12)', 'text'], ['text', 'Text', 'textarea']] },
  { sec: 'enclosures', title: 'Ubikace ve sbírce', label: o => (o.icon || '') + ' ' + (o.name || o.id), fields: [
    ['id', 'ID', 'text'], ['name', 'Název', 'text'], ['icon', 'Ikona (emoji)', 'text'], ['groups', 'Skupiny (oddělené čárkou)', 'text']
  ] }
];

export const LOOK_FIELDS = [
  ['body', 'Tělo', 'color'], ['wing', 'Křídla', 'color'], ['belly', 'Bříško', 'color'], ['cap', 'Čepička', 'color'],
  ['capY', 'Výška čepičky (60–100)', 'number', { min: 50, max: 110, step: 1 }],
  ['beak', 'Zobák', 'select', { options: [['small', 'Malý'], ['long', 'Dlouhý'], ['flat', 'Plochý'], ['hook', 'Hák']] }],
  ['beakColor', 'Barva zobáku', 'color'], ['feet', 'Nohy', 'color'], ['ring', 'Kroužek kolem oka', 'color'],
  ['crest', 'Chocholka', 'select', { options: [['', 'Žádná'], ['spikes', 'Ostny'], ['plume', 'Pero dozadu']] }],
  ['crestColor', 'Barva chocholky', 'color'],
  ['mark', 'Kresba', 'select', { options: [['', 'Žádná'], ['neck', 'Skvrna na krku'], ['tit', 'Bílé tváře + pruh'], ['bib', 'Náprsenka'], ['collar', 'Bílý obojek'], ['brow', 'Černý proužek'], ['spots', 'Skvrny na břiše'], ['owl', 'Sova (obličej)'], ['kingfisher', 'Ledňáček']] }]
];

// Pomocné parsery textových map
export function parseMap(s) {
  const o = {};
  String(s || '').split(',').forEach(p => {
    const [k, v] = p.split(':').map(x => x && x.trim());
    if (k) o[k] = v === undefined || v === '' ? 1 : Number(v);
  });
  return o;
}
export function parseNums(s) {
  return String(s || '').split(',').map(x => Number(x.trim())).filter(x => !isNaN(x));
}
export function clone(o) { return JSON.parse(JSON.stringify(o)); }

// Výšková pásma regionu: "nizina:0, hory:900" → [['nizina',0],['hory',900]] seřazené podle výšky
export function parseZones(s) {
  return Object.entries(parseMap(s)).filter(([, v]) => Number.isFinite(v)).sort((a, b) => a[1] - b[1]);
}
// Pásmo pro nadmořskou výšku (null, když výšku neznáme)
export function zoneFor(alt, zones) {
  if (alt == null || !Number.isFinite(alt) || !zones.length) return null;
  let z = zones[0][0];
  for (const [id, from] of zones) if (alt >= from) z = id;
  return z;
}
// Měsíce výskytu: "3-10", "11-2" (přes Nový rok), "4,5,9" → množina 1–12; prázdné = celý rok
export function parseMonths(s) {
  const out = new Set();
  for (const part of String(s || '').split(',').map(x => x.trim()).filter(Boolean)) {
    const [a, b] = part.split('-').map(x => Number(x.trim()));
    if (!(a >= 1 && a <= 12)) continue;
    if (!(b >= 1 && b <= 12)) { out.add(a); continue; }
    for (let m = a, i = 0; i < 12; m = m % 12 + 1, i++) { out.add(m); if (m === b) break; }
  }
  return out.size ? out : new Set([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]);
}

// Obrázek z importu/zálohy smí být jen vložený rastrový obrázek (jinak by šlo podstrčit HTML/skript)
export function safeImage(s) {
  return typeof s === 'string' && /^data:image\/(png|jpeg|webp|gif);base64,[A-Za-z0-9+/=]+$/.test(s) ? s : '';
}
const safeUrl = (s, def) => typeof s === 'string' && /^https:\/\/[^\s"'<>]+$/.test(s) ? s : def;

// Vrstvy: jen známé klíče; přepínače jako true/false, budovy jen off/flat/3d
export function cleanLayers(l, base) {
  const out = Object.assign({}, base);
  if (!l || typeof l !== 'object') return out;
  for (const k of Object.keys(DEFAULTS.layers)) {
    if (!(k in l)) continue;
    if (k === 'buildings') { if (['off', 'flat', '3d'].includes(l[k])) out[k] = l[k]; }
    else out[k] = !!l[k];
  }
  return out;
}
// Vrstvy předvolby: co neuvádí, je vypnuté (budovy ploché)
export function presetLayers(p) {
  const all = Object.fromEntries(Object.keys(DEFAULTS.layers).map(k => [k, k === 'buildings' ? 'flat' : false]));
  return cleanLayers(p && p.layers, all);
}

// Seznamy s id: ukládají se jen změny proti výchozím položkám, nové výchozí položky z aktualizací se doplní
export const ID_LISTS = ['species', 'biotopes', 'foods', 'rarities', 'rarityGame', 'stats', 'regions', 'enclosures', 'badges', 'albums', 'quests', 'shop', 'events', 'calendar'];
const isObj = v => v && typeof v === 'object' && !Array.isArray(v);
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);

// Hodnoty výchozích položek z verze 3 (≤ 1.4.0), které 1.5.0 změnila. Staré uložené nastavení je obsahovalo celé,
// takže hodnota shodná se starou výchozí = uživatel ji neměnil → má dostat novou výchozí.
const V3_STALE = {
  species: {
    datel: { bio: 'les:3' }, holub: { bio: 'mesto:3, park:2, louka:1' }, kos: { bio: 'park:3, mesto:2, les:2' },
    konadra: { bio: 'park:3, les:2, mesto:1' }, vrabec: { bio: 'mesto:4, louka:1' }, kachna: { bio: 'voda:4, park:0.5' },
    volavka: { bio: 'voda:3, louka:1' }, kane: { bio: 'louka:3, les:1' }, pustik: { bio: 'les:3, park:1' }, lednacek: { bio: 'voda:2' }
  },
  biotopes: {
    park: { priority: 2 }, les: { priority: 3 }, mesto: { priority: 4 },
    louka: { priority: 5, tags: 'landuse=meadow\nlanduse=farmland\nlanduse=grass\nnatural=grassland\nnatural=heath\nnatural=scrub\nlanduse=orchard\nlanduse=allotments' }
  }
};

function mergeList(k, saved, known, stale) {
  const defs = DEFAULTS[k], byId = Object.fromEntries(defs.map(d => [String(d.id), d]));
  const savedIds = new Set(saved.map(s => String(s.id)));
  const added = defs.filter(d => !savedIds.has(String(d.id)) && !known.has(String(d.id)));
  return [...saved, ...clone(added)].map(s => {
    const d = byId[String(s.id)];
    if (!d) return s;
    const st = stale && stale[String(s.id)];
    if (st) for (const f of Object.keys(st)) if (same(s[f], st[f])) delete s[f];
    const m = Object.assign(clone(d), s);
    for (const f of Object.keys(d)) if (isObj(d[f])) m[f] = Object.assign(clone(d[f]), isObj(s[f]) ? s[f] : {});
    return m;
  });
}

// Rozdíl objektu proti výchozímu (vnořené objekty po klíčích)
function diffObj(v, d) {
  const o = {};
  for (const key of Object.keys(v)) {
    const a = v[key], b = d ? d[key] : undefined;
    if (isObj(a) && isObj(b)) { const sub = diffObj(a, b); if (Object.keys(sub).length) o[key] = sub; }
    else if (!same(a, b)) o[key] = clone(a);
  }
  return o;
}

// Co uložit do telefonu: jen změny proti výchozímu nastavení. Díky tomu se úpravy výchozích dat
// (nové biotopy, opravené údaje o druzích…) dostanou i k hráčům, kteří si nastavení někdy uložili.
export function compactConfig(cfg) {
  const out = { version: CONFIG_VERSION, listsKnown: {} };
  for (const k of Object.keys(DEFAULTS)) {
    if (k === 'version' || cfg[k] === undefined) continue;
    const d = DEFAULTS[k], v = cfg[k];
    if (ID_LISTS.includes(k)) {
      out.listsKnown[k] = d.map(x => String(x.id));
      const byId = Object.fromEntries(d.map(x => [String(x.id), x]));
      out[k] = v.map(item => { const di = byId[String(item.id)]; return di ? { id: item.id, ...diffObj(item, di) } : clone(item); });
    } else if (Array.isArray(d)) out[k] = clone(v);
    else if (isObj(d)) { const df = diffObj(v, d); if (Object.keys(df).length) out[k] = df; }
    else if (!same(v, d)) out[k] = v;
  }
  return out;
}

// Doplní chybějící klíče z výchozí konfigurace (při upgradu verze).
// Seznamy s id se slučují po položkách: uložené změny přes výchozí položku se stejným id.
export function mergeDefaults(cfg) {
  const out = clone(DEFAULTS);
  if (!cfg || typeof cfg !== 'object') return out;
  for (const k of Object.keys(out)) {
    if (cfg[k] === undefined || cfg[k] === null) continue;
    if (Array.isArray(out[k])) { if (Array.isArray(cfg[k])) out[k] = clone(cfg[k]).filter(o => o && typeof o === 'object'); }
    else if (typeof out[k] === 'object') { if (typeof cfg[k] === 'object') Object.assign(out[k], cfg[k]); }
    else out[k] = cfg[k];
  }
  const old = !(Number(cfg.version) >= 4);
  for (const k of ID_LISTS) {
    const saved = Array.isArray(cfg[k]) ? out[k] : [];
    const kn = cfg.listsKnown && Array.isArray(cfg.listsKnown[k]) ? cfg.listsKnown[k]
      : k === 'species' && Array.isArray(cfg.speciesKnown) ? cfg.speciesKnown
      : saved.map(s => s.id); // starší nastavení: za známé se berou jen uložené položky
    out[k] = mergeList(k, saved, new Set(kn.map(String)), old ? V3_STALE[k] : null);
  }
  // Vlastní druhy (bez výchozí předlohy) dostanou kreslený vzhled a prázdné vzdělávací údaje
  const baseLook = DEFAULTS.species[1].look;
  out.species = out.species.map(s => {
    const m = { ...s, look: Object.assign(clone(baseLook), isObj(s.look) ? s.look : {}), edu: Object.assign(clone(EMPTY_EDU), isObj(s.edu) ? s.edu : {}) };
    m.image = safeImage(m.image);
    return m;
  });
  delete out.listsKnown; delete out.speciesKnown;
  // Verze 2 → 3: doplnit nové výchozí předvolby vzhledu (vlastní předvolby zůstanou)
  if (!(Number(cfg.version) >= 3) && Array.isArray(cfg.mapPresets)) {
    const names = new Set(out.mapPresets.map(p => p && p.name));
    out.mapPresets.push(...clone(DEFAULTS.mapPresets.filter(p => !names.has(p.name))));
  }
  // Verze 1 → 2: přechod z Leafletu na MapLibre (zoom o 1 menší pro stejné měřítko, nová atribuce, bez obrázkových dlaždic)
  if (!(Number(cfg.version) >= 2) && cfg.map && typeof cfg.map === 'object') {
    for (const k of ['minZoom', 'maxZoom', 'startZoom']) if (cfg.map[k] != null) out.map[k] = Math.max(0, Number(cfg.map[k]) - 1);
    out.map.attribution = DEFAULTS.map.attribution;
    if (Number(cfg.map.tileCacheMax) === 1500) out.map.tileCacheMax = DEFAULTS.map.tileCacheMax;
  }
  delete out.map.tileUrl;
  out.layers = cleanLayers(out.layers, DEFAULTS.layers);
  out.mapPresets = out.mapPresets.filter(p => typeof p.name === 'string' && p.name.trim())
    .map(p => ({ name: p.name.trim().slice(0, 40), style: typeof p.style === 'string' ? p.style : 'auto', layers: cleanLayers(p.layers, {}) }));
  for (const k of ['vectorUrl', 'glyphsUrl', 'demUrl', 'trailsUrl']) out.map[k] = safeUrl(out.map[k], DEFAULTS.map[k]);
  out.osm.overpassUrl = String(out.osm.overpassUrl ?? '').split('\n').map(u => safeUrl(u.trim(), '')).filter(Boolean).join('\n') || DEFAULTS.osm.overpassUrl;
  out.general.contact = /^[^\s@<>"']+@[^\s@<>"']+\.[a-z]{2,}$/i.test(String(out.general.contact || '').trim()) ? String(out.general.contact).trim() : '';
  out.version = CONFIG_VERSION;
  return out;
}

// Čitelné názvy výškových pásem (id z regionu; neznámé id se ukáže tak, jak je)
export const ZONE_NAMES = { nizina: 'nížina', pahorkatina: 'pahorkatina', vrchovina: 'vrchovina', hory: 'hory', nad_lesem: 'nad hranicí lesa' };
export const zoneName = id => ZONE_NAMES[id] || String(id || '').replace(/_/g, ' ');

// Měsíce výskytu čitelně: "3-10" → "březen–říjen"; celý rok → ''
export const MONTH_NAMES = ['leden', 'únor', 'březen', 'duben', 'květen', 'červen', 'červenec', 'srpen', 'září', 'říjen', 'listopad', 'prosinec'];
export function formatMonths(s) {
  const set = parseMonths(s);
  if (set.size === 12) return '';
  const on = m => set.has(((m - 1 + 12) % 12) + 1);
  // začít od měsíce, před kterým je mezera, aby se úsek přes Nový rok nerozdělil
  let start = 1; while (on(start - 1) && start < 13) start++;
  const parts = [];
  for (let i = 0; i < 12; i++) {
    const m = ((start - 1 + i) % 12) + 1;
    if (!on(m) || on(m - 1) && i > 0) continue;
    let e = m; while (on(e + 1) && ((e % 12) + 1) !== m) e = (e % 12) + 1;
    parts.push(e === m ? MONTH_NAMES[m - 1] : MONTH_NAMES[m - 1] + '–' + MONTH_NAMES[e - 1]);
  }
  return parts.join(', ');
}
