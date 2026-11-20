// Výchozí konfigurace. Vše je editovatelné v adminu a ukládá se do IndexedDB.
// Mapy (biotopy, potrava) se zapisují jako text "klic:vaha, klic:vaha", aby šly snadno upravit ve formuláři.

import { SPECIES, EDU_FIELDS, EMPTY_EDU, GROUPS } from './species.js';
export { EDU_FIELDS, GROUPS };

export const CONFIG_VERSION = 3;

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
  species: SPECIES,
  speciesKnown: SPECIES.map(s => s.id), // id výchozích druhů známá při uložení (smazané výchozí se nevrátí, nové se doplní)
  regions: [               // výšková pásma: id:od_výšky_m (hranice lesa se liší podle zeměpisné šířky)
    { id: 'cz', name: 'Česko', zones: 'nizina:0, pahorkatina:300, vrchovina:600, hory:900, nad_lesem:1300' }
  ],
  atlas: {                 // kdy se v atlasu odemknou vzdělávací údaje
    basicAt: 1,            // zařazení, poznávání, ochrana, zajímavosti – po kolikátém úlovku
    lifeAt: 3,             // rozmnožování a život – po kolikátém úlovku
    signsNeedPhoto: true   // hlas a pobytová znamení až se skutečnou fotkou (jinak spolu s „život“)
  },
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
  { sec: 'spawn', title: 'Objevování zvířat', fields: [
    ['density', 'Počet zvířat v okruhu (průměr)', 'number', { min: 0, max: 100, step: 1 }],
    ['radius', 'Okruh zobrazení (m)', 'number', { min: 50, max: 3000, step: 10 }],
    ['minDistance', 'Min. vzdálenost od hráče (m)', 'number', { min: 0, max: 500, step: 5 }],
    ['cellSize', 'Velikost buňky spawnu (m)', 'number', { min: 20, max: 1000, step: 10 }],
    ['slotMinutes', 'Přeházení ptáků po (min)', 'number', { min: 1, max: 1440, step: 1 }],
    ['jitter', 'Náhodný posun v buňce (0–1)', 'number', { min: 0, max: 1, step: 0.05 }],
    ['nightFactorDay', 'Váha denních zvířat v noci', 'number', { min: 0, max: 1, step: 0.05 }],
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
  ] },
  { sec: 'atlas', title: 'Atlas – odemykání údajů', fields: [
    ['basicAt', 'Zařazení, poznávání, ochrana – po úlovku č.', 'number', { min: 1, max: 50, step: 1 }],
    ['lifeAt', 'Rozmnožování a život – po úlovku č.', 'number', { min: 1, max: 50, step: 1 }],
    ['signsNeedPhoto', 'Hlas a pobytová znamení až se skutečnou fotkou', 'bool']
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
  // Druhy: uložené úpravy + výchozí druhy, které v uloženém nastavení ještě nebyly (přišly s aktualizací).
  // Výchozí druh, který uživatel znal a smazal (je ve speciesKnown, ale chybí), se nevrátí.
  const defSp = Object.fromEntries(DEFAULTS.species.map(s => [s.id, s]));
  const baseLook = DEFAULTS.species[1].look;
  const saved = Array.isArray(cfg.species) ? out.species : [];
  const savedIds = new Set(saved.map(s => s.id));
  const known = new Set(Array.isArray(cfg.speciesKnown) ? cfg.speciesKnown : (Array.isArray(cfg.species) ? [...savedIds] : []));
  const added = DEFAULTS.species.filter(d => !savedIds.has(d.id) && !known.has(d.id));
  out.species = [...saved, ...clone(added)].map(s => {
    const d = defSp[s.id];
    const obj = v => v && typeof v === 'object' ? v : {};
    const m = Object.assign(d ? clone(d) : {}, s, {
      look: Object.assign(clone(d ? d.look : baseLook), obj(s.look)),
      edu: Object.assign(clone(d ? d.edu : EMPTY_EDU), obj(s.edu))
    });
    m.image = safeImage(m.image);
    return m;
  });
  out.speciesKnown = DEFAULTS.species.map(s => s.id);
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
  out.osm.overpassUrl = safeUrl(out.osm.overpassUrl, DEFAULTS.osm.overpassUrl);
  out.version = CONFIG_VERSION;
  return out;
}
