// Výchozí konfigurace. Vše je editovatelné v adminu a ukládá se do IndexedDB.
// Mapy (biotopy, potrava) se zapisují jako text "klic:vaha, klic:vaha", aby šly snadno upravit ve formuláři.

export const CONFIG_VERSION = 2;

export const DEFAULTS = {
  version: CONFIG_VERSION,
  general: {
    appName: 'Stopař',
    adminPin: '1234',
    simulation: false,      // chůze ťukáním do mapy místo GPS (pro testování z domova)
    simSpeed: 1.4,          // m/s při simulované chůzi
    showBiotopes: false     // ladicí vrstva s biotopy z OSM
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
    refLat: 50              // ° – šířka pro převod mřížky na metry; musí být stejná pro všechny hráče (ČR = 50)
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
  osm: {
    overpassUrl: 'https://overpass-api.de/api/interpreter',
    chunkDeg: 0.01,         // velikost stahovaného čtverce ve stupních (~1,1 × 0,7 km)
    cacheDays: 30,
    lineBuffer: 15,         // m – šířka řek/potoků zadaných jako čára
    timeout: 25,            // s
    defaultBiotope: 'louka' // biotop, když OSM nic nemá
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
  biotopes: [
    { id: 'voda', name: 'Voda', color: '#6bb6e0', priority: 1,
      tags: 'natural=water\nwaterway=riverbank\nlanduse=reservoir\nlanduse=basin\nwater=*\nwaterway=river|line\nwaterway=stream|line\nwaterway=canal|line' },
    { id: 'park', name: 'Park', color: '#9fd08a', priority: 2,
      tags: 'leisure=park\nleisure=garden\nlanduse=cemetery\nlanduse=recreation_ground\nlanduse=village_green\nleisure=golf_course' },
    { id: 'les', name: 'Les', color: '#6fa36b', priority: 3,
      tags: 'landuse=forest\nnatural=wood' },
    { id: 'mesto', name: 'Město', color: '#cfc8bd', priority: 4,
      tags: 'landuse=residential\nlanduse=commercial\nlanduse=retail\nlanduse=industrial\nlanduse=railway\nlanduse=construction' },
    { id: 'louka', name: 'Louka', color: '#c8dc8a', priority: 5,
      tags: 'landuse=meadow\nlanduse=farmland\nlanduse=grass\nnatural=grassland\nnatural=heath\nnatural=scrub\nlanduse=orchard\nlanduse=allotments' }
  ],
  foods: [
    { id: 'zrni', name: 'Zrní a semena' },
    { id: 'hmyz', name: 'Hmyz' },
    { id: 'larvy', name: 'Larvy ze dřeva' },
    { id: 'zizaly', name: 'Žížaly' },
    { id: 'bobule', name: 'Bobule' },
    { id: 'ryba', name: 'Ryba' },
    { id: 'hlodavec', name: 'Hlodavec' },
    { id: 'rostliny', name: 'Vodní rostliny' }
  ],
  species: [
    { id: 'datel', name: 'Datel černý', lat: 'Dryocopus martius', group: 'Ptáci', active: true, rarity: '2', night: false,
      bio: 'les:3', food: 'larvy:1, hmyz:0.5', stats: '55, 70, 40, 65', image: '',
      fact: 'Největší evropský datel. Jeho opuštěné dutiny obsazují sovy, holubi doupňáci i netopýři.',
      look: { body: '#1f1f22', wing: '#151517', belly: '#2a2a2e', cap: '', capY: 64, beak: 'long', beakColor: '#efe2c2', feet: '#7d7d7d', ring: '', crest: 'spikes', crestColor: '#e53935', mark: '' } },
    { id: 'holub', name: 'Holub hřivnáč', lat: 'Columba palumbus', group: 'Ptáci', active: true, rarity: '1', night: false,
      bio: 'mesto:3, park:2, louka:1', food: 'zrni:1, bobule:0.5', stats: '70, 40, 35, 75', image: '',
      fact: 'Náš největší holub. Pozná se podle bílé skvrny na krku a bílého pruhu na křídle.',
      look: { body: '#9aa3b4', wing: '#858ea0', belly: '#d6a9b1', cap: '', capY: 64, beak: 'small', beakColor: '#f0a53a', feet: '#e07a7a', ring: '', crest: '', crestColor: '', mark: 'neck' } },
    { id: 'kos', name: 'Kos černý', lat: 'Turdus merula', group: 'Ptáci', active: true, rarity: '1', night: false,
      bio: 'park:3, mesto:2, les:2', food: 'zizaly:1, bobule:1, hmyz:0.5', stats: '50, 35, 55, 50', image: '',
      fact: 'Samec je černý se žlutým zobákem, samice hnědá. Zpívá už za šera.',
      look: { body: '#232325', wing: '#18181a', belly: '#2d2d30', cap: '', capY: 64, beak: 'small', beakColor: '#f39c12', feet: '#4a4a4a', ring: '#f39c12', crest: '', crestColor: '', mark: '' } },
    { id: 'konadra', name: 'Sýkora koňadra', lat: 'Parus major', group: 'Ptáci', active: true, rarity: '1', night: false,
      bio: 'park:3, les:2, mesto:1', food: 'zrni:1, hmyz:1', stats: '60, 25, 50, 45', image: '',
      fact: 'Nejběžnější sýkora. Samec má černý pruh na břiše širší než samice.',
      look: { body: '#93b25e', wing: '#6d8fae', belly: '#f6d846', cap: '#1d1d1f', capY: 88, beak: 'small', beakColor: '#2b2b2b', feet: '#7a8a99', ring: '', crest: '', crestColor: '', mark: 'tit' } },
    { id: 'vrabec', name: 'Vrabec domácí', lat: 'Passer domesticus', group: 'Ptáci', active: true, rarity: '1', night: false,
      bio: 'mesto:4, louka:1', food: 'zrni:1, hmyz:0.5', stats: '55, 20, 60, 45', image: '',
      fact: 'Žije jen u lidí. Samec má šedou čepičku a černou náprsenku.',
      look: { body: '#a57b50', wing: '#7a5530', belly: '#d3cabb', cap: '#8d8d8d', capY: 66, beak: 'small', beakColor: '#4a4a4a', feet: '#c99a6a', ring: '', crest: '', crestColor: '', mark: 'bib' } },
    { id: 'kachna', name: 'Kachna divoká', lat: 'Anas platyrhynchos', group: 'Ptáci', active: true, rarity: '1', night: false,
      bio: 'voda:4, park:0.5', food: 'rostliny:1, zrni:0.5', stats: '65, 40, 45, 80', image: '',
      fact: 'Nejběžnější kachna. Pečivem ji nekrm – škodí jí.',
      look: { body: '#b9b2a6', wing: '#8a7f70', belly: '#7b4a33', cap: '#2f7a46', capY: 98, beak: 'flat', beakColor: '#e8c22a', feet: '#f08a24', ring: '', crest: '', crestColor: '', mark: 'collar' } },
    { id: 'volavka', name: 'Volavka popelavá', lat: 'Ardea cinerea', group: 'Ptáci', active: true, rarity: '2', night: false,
      bio: 'voda:3, louka:1', food: 'ryba:1, hlodavec:0.5', stats: '45, 60, 50, 70', image: '',
      fact: 'Na kořist čeká bez hnutí v mělké vodě. Hnízdí v koloniích na stromech.',
      look: { body: '#b8bdc4', wing: '#8e949c', belly: '#ececec', cap: '', capY: 64, beak: 'long', beakColor: '#e0b23a', feet: '#c9a24a', ring: '', crest: 'plume', crestColor: '#222222', mark: 'brow' } },
    { id: 'kane', name: 'Káně lesní', lat: 'Buteo buteo', group: 'Ptáci', active: true, rarity: '1', night: false,
      bio: 'louka:3, les:1', food: 'hlodavec:1, zizaly:0.5', stats: '70, 80, 45, 75', image: '',
      fact: 'Nejběžnější dravec. Často sedí na sloupech u silnic a vyhlíží hraboše.',
      look: { body: '#7b5535', wing: '#5c3e24', belly: '#e9dbbd', cap: '', capY: 64, beak: 'hook', beakColor: '#f2c94c', feet: '#f2c94c', ring: '', crest: '', crestColor: '', mark: 'spots' } },
    { id: 'pustik', name: 'Puštík obecný', lat: 'Strix aluco', group: 'Ptáci', active: true, rarity: '2', night: true,
      bio: 'les:3, park:1', food: 'hlodavec:1', stats: '50, 70, 90, 55', image: '',
      fact: 'Nejhojnější sova. Ozývá se známým houkáním a loví hlavně v noci.',
      look: { body: '#8a6a48', wing: '#6b4f34', belly: '#c9a77c', cap: '', capY: 64, beak: 'hook', beakColor: '#efe0a8', feet: '#cdb48a', ring: '', crest: '', crestColor: '', mark: 'owl' } },
    { id: 'lednacek', name: 'Ledňáček říční', lat: 'Alcedo atthis', group: 'Ptáci', active: true, rarity: '3', night: false,
      bio: 'voda:2', food: 'ryba:1', stats: '90, 30, 40, 40', image: '',
      fact: 'Loví ryby střemhlavým skokem do vody. Hnízdí v norách v kolmých březích.',
      look: { body: '#1e8ec4', wing: '#16729f', belly: '#f08a24', cap: '#2aa7e0', capY: 70, beak: 'long', beakColor: '#1d1d1f', feet: '#e2523a', ring: '', crest: '', crestColor: '', mark: 'kingfisher' } }
  ]
};

// Popis polí pro admin (generický formulář). [klíč, popisek, typ, volby]
export const SCHEMA = [
  { sec: 'general', title: 'Obecné', fields: [
    ['appName', 'Název aplikace', 'text'],
    ['adminPin', 'PIN do adminu', 'text'],
    ['simulation', 'Simulace chůze ťukáním do mapy (bez GPS)', 'bool'],
    ['simSpeed', 'Rychlost simulované chůze (m/s)', 'number', { min: 0.5, max: 30, step: 0.1 }],
    ['showBiotopes', 'Zobrazit vrstvu biotopů z OSM', 'bool']
  ] },
  { sec: 'spawn', title: 'Objevování ptáků', fields: [
    ['density', 'Počet ptáků v okruhu (průměr)', 'number', { min: 0, max: 100, step: 1 }],
    ['radius', 'Okruh zobrazení (m)', 'number', { min: 50, max: 3000, step: 10 }],
    ['minDistance', 'Min. vzdálenost od hráče (m)', 'number', { min: 0, max: 500, step: 5 }],
    ['cellSize', 'Velikost buňky spawnu (m)', 'number', { min: 20, max: 1000, step: 10 }],
    ['slotMinutes', 'Přeházení ptáků po (min)', 'number', { min: 1, max: 1440, step: 1 }],
    ['jitter', 'Náhodný posun v buňce (0–1)', 'number', { min: 0, max: 1, step: 0.05 }],
    ['nightFactorDay', 'Váha denních ptáků v noci', 'number', { min: 0, max: 1, step: 0.05 }],
    ['seed', 'Seed rozmístění', 'number', { step: 1 }],
    ['refLat', 'Referenční šířka mřížky (°, změna = jiné rozmístění)', 'number', { min: -80, max: 80, step: 1 }]
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
    ['overpassUrl', 'Overpass API URL', 'text'],
    ['chunkDeg', 'Velikost čtverce (°)', 'number', { min: 0.002, max: 0.05, step: 0.001 }],
    ['cacheDays', 'Platnost cache (dny)', 'number', { min: 1, max: 365, step: 1 }],
    ['lineBuffer', 'Šířka vodních toků (m)', 'number', { min: 1, max: 200, step: 1 }],
    ['timeout', 'Timeout dotazu (s)', 'number', { min: 5, max: 180, step: 1 }],
    ['defaultBiotope', 'Výchozí biotop (id)', 'text']
  ] },
  { sec: 'daynight', title: 'Den a noc', fields: [
    ['mode', 'Režim', 'select', { options: [['sun', 'Podle slunce'], ['hours', 'Podle hodin'], ['day', 'Vždy den'], ['night', 'Vždy noc']] }],
    ['sunAltitude', 'Noc pod výškou slunce (°)', 'number', { min: -18, max: 5, step: 0.5 }],
    ['nightFrom', 'Noc od (h)', 'number', { min: 0, max: 23, step: 1 }],
    ['nightTo', 'Noc do (h)', 'number', { min: 0, max: 23, step: 1 }]
  ] }
];

// Seznamy (pole objektů) v adminu
export const LISTS = [
  { sec: 'species', title: 'Druhy', label: o => o.name || o.id, fields: [
    ['id', 'ID (bez diakritiky)', 'text'], ['name', 'Název', 'text'], ['lat', 'Latinsky', 'text'],
    ['group', 'Skupina', 'text'], ['active', 'Aktivní', 'bool'], ['rarity', 'Vzácnost (id)', 'text'],
    ['night', 'Jen v noci', 'bool'], ['bio', 'Biotopy (id:váha, …)', 'text'], ['food', 'Potrava (id:síla 1/0.5, …)', 'text'],
    ['stats', 'Základní statistiky (čísla oddělená čárkou)', 'text'], ['fact', 'Zajímavost', 'textarea'],
    ['image', 'Vlastní obrázek', 'image']
  ], look: true },
  { sec: 'biotopes', title: 'Biotopy', label: o => o.name || o.id, fields: [
    ['id', 'ID', 'text'], ['name', 'Název', 'text'], ['color', 'Barva', 'color'],
    ['priority', 'Priorita (nižší vyhrává)', 'number', { step: 1 }],
    ['tags', 'OSM tagy (řádek = klíč=hodnota, * = cokoliv, |line = čára)', 'textarea']
  ] },
  { sec: 'foods', title: 'Potrava', label: o => o.name || o.id, fields: [['id', 'ID', 'text'], ['name', 'Název', 'text']] },
  { sec: 'rarities', title: 'Vzácnosti', label: o => o.id + ' – ' + o.name, fields: [['id', 'ID', 'text'], ['name', 'Název', 'text'], ['weight', 'Váha spawnu', 'number', { min: 0, step: 0.01 }]] },
  { sec: 'rarityGame', title: 'Foto minihra podle vzácnosti', label: o => 'Vzácnost ' + o.id, fields: [['id', 'ID vzácnosti', 'text'], ['zone', 'Šířka zelené zóny (0–1)', 'number', { min: 0.02, max: 1, step: 0.01 }], ['speed', 'Rychlost značky', 'number', { min: 0.1, max: 20, step: 0.1 }]] },
  { sec: 'stats', title: 'Statistiky', label: o => o.name || o.id, fields: [['id', 'ID', 'text'], ['name', 'Název', 'text']] }
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

// Obrázek z importu/zálohy smí být jen vložený rastrový obrázek (jinak by šlo podstrčit HTML/skript)
export function safeImage(s) {
  return typeof s === 'string' && /^data:image\/(png|jpeg|webp|gif);base64,[A-Za-z0-9+/=]+$/.test(s) ? s : '';
}
const safeUrl = (s, def) => typeof s === 'string' && /^https:\/\/[^\s"'<>]+$/.test(s) ? s : def;

// Doplní chybějící klíče z výchozí konfigurace (při upgradu verze).
// Druhy se slučují po položkách: uložený druh dostane nová pole (i v "look") z výchozího druhu se stejným id.
export function mergeDefaults(cfg) {
  const out = clone(DEFAULTS);
  if (!cfg || typeof cfg !== 'object') return out;
  for (const k of Object.keys(out)) {
    if (cfg[k] === undefined || cfg[k] === null) continue;
    if (Array.isArray(out[k])) { if (Array.isArray(cfg[k])) out[k] = clone(cfg[k]).filter(o => o && typeof o === 'object'); }
    else if (typeof out[k] === 'object') { if (typeof cfg[k] === 'object') Object.assign(out[k], cfg[k]); }
    else out[k] = cfg[k];
  }
  const defSp = Object.fromEntries(DEFAULTS.species.map(s => [s.id, s]));
  const baseLook = DEFAULTS.species[1].look;
  out.species = out.species.map(s => {
    const d = defSp[s.id];
    const m = Object.assign(d ? clone(d) : {}, s, { look: Object.assign(clone(d ? d.look : baseLook), s.look && typeof s.look === 'object' ? s.look : {}) });
    m.image = safeImage(m.image);
    return m;
  });
  // Verze 1 → 2: přechod z Leafletu na MapLibre (zoom o 1 menší pro stejné měřítko, nová atribuce, bez obrázkových dlaždic)
  if (!(Number(cfg.version) >= 2) && cfg.map && typeof cfg.map === 'object') {
    for (const k of ['minZoom', 'maxZoom', 'startZoom']) if (cfg.map[k] != null) out.map[k] = Math.max(0, Number(cfg.map[k]) - 1);
    out.map.attribution = DEFAULTS.map.attribution;
    if (Number(cfg.map.tileCacheMax) === 1500) out.map.tileCacheMax = DEFAULTS.map.tileCacheMax;
  }
  delete out.map.tileUrl;
  for (const k of ['vectorUrl', 'glyphsUrl', 'demUrl', 'trailsUrl']) out.map[k] = safeUrl(out.map[k], DEFAULTS.map[k]);
  out.osm.overpassUrl = safeUrl(out.osm.overpassUrl, DEFAULTS.osm.overpassUrl);
  out.version = CONFIG_VERSION;
  return out;
}
