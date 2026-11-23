import { esc, parseMonths, DEFAULTS, mergeDefaults, parseMap, parseNums, clone, safeImage, presetLayers, EDU_FIELDS, parseZones, zoneFor, zoneName, formatMonths, compactConfig } from './config.js';
import { store, persist } from './store.js';
import { dist, sunAltitude } from './geo.js';
import { osmSetConfig, ensureArea, biotopeAt, biotopeGuess, tileBiotopes, errorAt, status as osmStatus, loadedFeatures, clearOsmCache, overpassUrls, protectedAt, spawnAllowed, targetsNear, parksNear, parkAt, overpassQuery, chunkProgress, queueSize } from './osm.js';
import { refreshWeather, weatherCond, WEATHER_ICON, WEATHER_NAME, activeEvents, speciesMult, inQuietMonths, variantFor, protectedHTML, protectedType, wikiSummary, calendarHTML, cleanStamps, stampsHTML } from './world.js';
import { visibleBirds, currentSlot, currentRegion, currentMonth, spawnCode } from './spawn.js';
import { elevSetConfig, elevationAt } from './elevation.js';
import { birdImg, birdURL } from './birds.js';
import { openAdmin, download } from './admin.js';
import { makeStyle, styleIdFor, circle, CONTOUR_THRESHOLDS, STYLES } from './mapstyle.js';
import { TERMS_VERSION, APP_VERSION, MIN_AGE, ageFrom, consentValid, consentHTML, privacyHTML, aboutHTML, PIN_RE, newPin, verifyPin, pinSetHTML } from './legal.js';
import { checklistHTML, checklistText, emptyChecklist } from './checklist.js';
import { levelFor, levelNeeded, cleanProgress, checkBadges, questEvent, makeQuiz, profileHTML, unlockName } from './progress.js';
import { evolve, train, trainStat, release, buy, useItem, invOf, cleanInv, isMaster, stageNames, animalActionsHTML, shopHTML, coneIcon } from './economy.js';
import { isTrack, hasSigns, trackQuiz, trackHTML, keyHTML, KEY_STEPS, cleanJournal, journalHTML, journalFormHTML, entryName } from './field.js';
import { qrSVG } from './qr.js';
import { toCode, fromCode } from './family.js';
import { cleanParent, kidModeOn, insideBound, parentHTML, cleanEvent, decodeEvent, eventLink, eventProgress, eventFormHTML, eventShareHTML, eventsListHTML, cleanWalkDays, walkHTML, dayStr, cardBlob, GOALS } from './family.js';
import { GAMES, contestsHTML, pickHTML, compareText, runGame, contestScore, scoreCode, cleanRecords, miniSkill } from './contests.js';
import { Dog, dogURL, drillNow, DRILL_TOPICS } from './dog.js';
import { wildStage, foodFor, isPupa, knownStages } from './stages.js';
import { ic, icId, fillIcons, classIcon } from './icons.js';
import { placeKind, taskFor, taskHTML, RES_FOR } from './tasks.js';
import { newFarm, cleanFarm, advance as farmAdvance, walkGain, startBuild, autoPick, encCap, farmHTML, BUILDINGS, RES, storeCap, cost as farmCost, buildMinutes, canAfford, rates as farmRates, ENC_DESC, moveBuilding, placeBuilding, isEmpty, setTile, toggleRoad, farmBonus, TILE_INFO, BONUS_TILE, DECOR, placeDecor, removeDecor, takenTiles, FARM_TASKS, claimTask, trainDelivery, RAIL_COST, buyRail } from './farm.js';
import { mountFarm, genWorld, validTiles, autoPlace, tileType, BIOMES } from './farm3d.js';
import { createMeter, ingest, tickMeter, addDay, cleanDay, chipHTML, dataHTML } from './datamon.js';
import { PUZZLES, SIZES, boardHTML, squareImage, playPuzzle, playPexeso, pexesoDeck, gameReward, cleanGames, playRows, playRings, playWho } from './minigames.js';
import { foodIcon, tripCardBlob, weekCode, readWeekCode, weekNumber, familyHTML } from './extras.js';
import { planUrls, estimate, download as offlineDownload, removeUrls, cleanAreas, offlineHTML, OFFLINE_CACHE } from './offline.js';
import { buildGraph, graphQuery, suggestLoops, loopThrough, nearestNode, simplify, encodePolyline, decodePolyline, checkpointsAlong, cleanRoute, pathLength, plannerHTML, choiceHTML, ROUTE_COLORS, viaIndex, profile, walkMinutes, pointsHTML, progressAlong, fmtMin } from './planner.js';
import { loadTrails, tilesFor, collection as trailsData, clearTrails } from './trails.js';
import { cleanTreasure, treasureLink, decodeTreasure, searchCircle, treasuresHTML, treasureFormHTML, feedersNear, feederReward, parkCell, cleanPlaces, distM } from './treasure.js';
import { legendsHTML, mythURL, activeWindow, daysToWindow, mythFor, cleanMyths, mythsHTML } from './myths.js';
import { nextSpeed, muteState, attachGestures, whatsHereHTML, stepKind } from './mapui.js';
import { animalFrom, cleanAnimal, migrateAnimals, addAnimal, collectionHTML, enclosureOf, power, stars, groupIcon, cleanNick, badWord, variantName } from './collection.js';

const $ = id => document.getElementById(id);
// Texty pro různé skupiny živočichů
const APPROACH = { 'Ptáci': 'Přiletěl a zobe.', 'Ryby': 'Připlaval a bere.', 'Hmyz': 'Přiletěl na návnadu.', 'Měkkýši': 'Pomalu se připlazil a hoduje.' };
const FLED = { 'Ptáci': 'odletěl', 'Hmyz': 'odletěl', 'Ryby': 'odplaval', 'Obojživelníci': 'odskákal', 'Plazi': 'zmizel v trávě', 'Měkkýši': 'zalezl do ulity' };
const approach = sp => APPROACH[sp.group] || 'Přišel blíž a žere.';
const fled = sp => FLED[sp.group] || 'utekl';
const cap = s => s.charAt(0).toUpperCase() + s.slice(1);
const shortUrl = u => { try { return decodeURIComponent(u.replace(/^https:\/\/(www\.)?/, '')).slice(0, 60); } catch (e) { return u.slice(0, 60); } };
const num = (v, d = 0) => Number.isFinite(Number(v)) ? Number(v) : d;
// Atribuce mapy je HTML z nastavení: propustí jen text a odkazy http(s)
function safeAttribution(html) {
  const t = document.createElement('template'); t.innerHTML = String(html ?? '');
  return [...t.content.childNodes].map(n => {
    if (n.nodeType === 3) return esc(n.textContent);
    if (n.nodeName === 'A' && /^https?:\/\//i.test(n.getAttribute('href') || '')) return `<a href="${esc(n.getAttribute('href'))}" target="_blank" rel="noopener">${esc(n.textContent)}</a>`;
    return esc(n.textContent);
  }).join('');
}
// Stav ze zálohy je nedůvěryhodný: převezme jen známá pole se správnými typy
function cleanState(s) {
  const out = { caught: {}, gone: {}, dist: num(s && s.dist), simDist: num(s && s.simDist), last: null, animals: [] };
  if (!s || typeof s !== 'object') return Object.assign(out, cleanProgress({}), { inv: {}, radiusUntil: 0, stamps: {}, journal: [], events: [], walkDays: {}, records: {}, myths: {}, treasures: [], places: cleanPlaces(null), routes: [], walk: null, fam: { week: -1, codes: [] }, games: cleanGames(null), farm: null, nick: '' });
  if (s.last && Number.isFinite(Number(s.last.lat)) && Number.isFinite(Number(s.last.lon))) out.last = { lat: num(s.last.lat), lon: num(s.last.lon) };
  for (const [k, v] of Object.entries(s.gone || {})) out.gone[String(k)] = num(v);
  for (const [id, c] of Object.entries(s.caught || {})) {
    if (!c || typeof c !== 'object') continue;
    const b = c.best && typeof c.best === 'object' ? c.best : null;
    out.caught[String(id)] = {
      count: Math.max(0, Math.round(num(c.count))), verified: !!c.verified,
      stages: Array.isArray(c.stages) ? [...new Set(c.stages.map(v => Math.round(num(v))).filter(v => v >= 0 && v < 6))] : [],
      photos: Array.isArray(c.photos) ? c.photos.map(Number).filter(Number.isFinite) : [],
      best: b ? { q: num(b.q), stats: Array.isArray(b.stats) ? b.stats.map(v => num(v)) : [], date: num(b.date), lat: b.lat == null ? null : num(b.lat), lon: b.lon == null ? null : num(b.lon), bio: String(b.bio ?? '') } : null
    };
    if (out.caught[id].count && !out.caught[id].best) out.caught[id].count = 0;
  }
  // jedinci: starší uložení je nemá → první jedinec z nejlepšího kusu druhu
  out.animals = Array.isArray(s.animals) ? s.animals.map(cleanAnimal).filter(Boolean) : migrateAnimals({ caught: out.caught }).animals;
  return Object.assign(out, cleanProgress(s), { inv: cleanInv(s.inv), radiusUntil: num(s.radiusUntil), stamps: cleanStamps(s.stamps), journal: cleanJournal(s.journal), events: (Array.isArray(s.events) ? s.events : []).map(cleanEvent).filter(Boolean).slice(-50), walkDays: cleanWalkDays(s.walkDays), records: cleanRecords(s.records), myths: cleanMyths(s.myths), treasures: (Array.isArray(s.treasures) ? s.treasures : []).map(cleanTreasure).filter(Boolean).slice(-100), places: cleanPlaces(s.places), routes: (Array.isArray(s.routes) ? s.routes : []).map(cleanRoute).filter(Boolean).slice(-30), walk: cleanWalk(s.walk), fam: s.fam && typeof s.fam === 'object' ? { week: num(s.fam.week), codes: (Array.isArray(s.fam.codes) ? s.fam.codes : []).map(String).slice(0, 20) } : { week: -1, codes: [] }, games: cleanGames(s.games), farm: s.farm ? cleanFarm(s.farm, (DEFAULTS.enclosures || []).map(e => e.id)) : null, nick: cleanNick(s.nick) });
}
const cleanPhoto = p => p && typeof p === 'object' && safeImage(p.img) && Number.isFinite(Number(p.id))
  ? { id: Number(p.id), sp: String(p.sp ?? ''), img: p.img, date: num(p.date), lat: p.lat == null ? null : num(p.lat), lon: p.lon == null ? null : num(p.lon) } : null;

let cfg = clone(DEFAULTS);
let state = cleanState({});
let SP = {}, FN = {}, BIO = {}, RAR = {};
const pos = { lat: null, lon: null, acc: null, src: 'none', speed: 0 };
let lastGood = null;
let map = null, meMk = null, styleKey = '', demSource = null, contourUrl = null, pitch3d = false;
const NONE = circle(null);
let follow = true, birds = [], markers = new Map(), enc = null, simTarget = null, watchId = null, installEvt = null;

/* ---------- init ---------- */
async function init() {
  let consent = null;
  try {
    const c = await store.get('config');
    cfg = mergeDefaults(c);
    const s = await store.get('state');
    if (s) state = cleanState(s);
    consent = await store.get('consent');
  } catch (e) { toast('Úložiště není dostupné, postup se neuloží.'); }
  registerSW(); // jen vlastní soubory aplikace, nic cizího
  consentRec = consent;
  parentCfg = cleanParent(await store.get('parent').catch(() => null));
  prefs = (await store.get('prefs').catch(() => null)) || {};
  if (consentValid(consent)) start(); else openConsent();
}
// Mapa, GPS a stahování dat se spustí až po souhlasu
function start() {
  persist();
  applyConfig(true);
  initMap();
  bindUI();
  startPosition();
  setInterval(tick, 2000);
  initDataMon();
  setInterval(saveState, 10000);
  setInterval(() => farmTick(false), 30000); setTimeout(() => farmTick(true), 3000);
  tick();
  if (location.hash === '#admin') askAdmin();
  applyKidMode(); checkEventLink(); initDog(); dogDemo(); nickLabel(); setTimeout(() => { if (!modal.classList.contains('on')) askNick(false); }, 4000);
}
/* ---------- pes Aegon ---------- */
// Kontrolní smyčka: odkaz #aegon (skutečná velikost) nebo #aegon-velky (zvětšený) – všechny pózy dokola; stejný odkaz znovu = konec
function dogDemo() {
  const m = /^#aegon(-velky)?$/.exec(location.hash); if (!m || !dog) return false;
  history.replaceState(null, '', location.pathname + location.search);
  const on = !dog.demo; dog.setDemo(on); $('dog').style.setProperty('--dog', (on && m[1] ? 240 : cfg.dog.size) + 'px');
  toast(on ? '🐕 Ukázka Aegona: všechny pózy dokola. Konec: znovu stejný odkaz.' : 'Ukázka Aegona skončila.');
  return true;
}
let dog = null, lastMove = Date.now(), dogPrev = null;
function initDog() {
  const el = $('dog'); if (!el) return;
  el.hidden = !cfg.dog.enabled; el.style.setProperty('--dog', cfg.dog.size + 'px');
  if (!cfg.dog.enabled) { if (dog) { dog.stop(); dog = null; } return; }
  if (!dog) { dog = new Dog(el, cfg); dog.start(); bindDogDrag(); placeDog(); dog.update({ inRange: false, near: false, dir: 1, walking: false, idleMs: 0, night: false }); dog.react('wave', 2500); } // obrázek hned, i bez polohy; na uvítanou zamává
  dog.cfg = cfg; updateDog();
}
// Co pes vidí: zvíře v dosahu (vystaví), blízko (čenichá), chůze hráče, jak dlouho je klid
function updateDog() {
  if (!dog || pos.lat == null) return;
  const moved = dogPrev ? dist(dogPrev.lat, dogPrev.lon, pos.lat, pos.lon) : 0, dt = dogPrev ? (Date.now() - dogPrev.t) / 1000 : 0;
  if (moved > 3) lastMove = Date.now();
  const walking = moved > 3, speed = dt > 0.5 && dt < 30 ? moved / dt : 0; // m/s: běh nad 2, auto nad 7
  dogPrev = { lat: pos.lat, lon: pos.lon, t: Date.now() };
  const live = birds.filter(b => SP[b.sp] && !speciesLocked(SP[b.sp])).map(b => ({ b, d: dist(pos.lat, pos.lon, b.lat, b.lon) })).sort((x, y) => x.d - y.d)[0];
  dog.update({ inRange: !!live && live.d <= catchRadius(), near: !!live && live.d <= cfg.dog.sniffRadius, dir: live && live.b.lon < pos.lon ? -1 : 1, walking, speed, idleMs: Date.now() - lastMove, night: isNight(), busy: $('dog').classList.contains('busy'), offline: !navigator.onLine, weather: cfg.world.weather ? weatherCond(weather) : '' });
}
// Aegon jde posouvat prstem (jako nálepka); puštění na boudu = proběhne se a za chvíli se vrátí
let dogAway = 0, plBusy = false;
function placeDog() {
  const el = $('dog'), p = prefs.dogPos;
  if (p && Number.isFinite(p.l) && Number.isFinite(p.t)) { const m = $('mapv').getBoundingClientRect(); el.style.left = Math.min(p.l, Math.max(0, m.width - 60)) + 'px'; el.style.top = Math.min(p.t, Math.max(0, m.height - 60)) + 'px'; el.style.bottom = 'auto'; }
  else { el.style.left = el.style.top = el.style.bottom = ''; }
}
function bindDogDrag() {
  const el = $('dog'), ken = $('kennel'); let st = null, moved = false;
  const over = e => { const r = ken.getBoundingClientRect(); return r.width > 0 && e.clientX >= r.left - 40 && e.clientX <= r.right + 40 && e.clientY >= r.top - 50 && e.clientY <= r.bottom + 30; };
  // dotyk: bez tohohle si telefon gesto převezme (posun stránky, dlouhé podržení) a puštění na boudu nedojde
  el.addEventListener('touchstart', e => e.preventDefault(), { passive: false });
  el.addEventListener('contextmenu', e => e.preventDefault());
  el.addEventListener('pointerdown', e => { st = { x: e.clientX, y: e.clientY, r: el.getBoundingClientRect(), p: $('mapv').getBoundingClientRect() }; moved = false; try { el.setPointerCapture(e.pointerId); } catch (x) {} });
  el.addEventListener('pointermove', e => {
    if (!st) return;
    const dx = e.clientX - st.x, dy = e.clientY - st.y;
    if (!moved && Math.hypot(dx, dy) < 8) return;
    moved = true; ken.hidden = false; el.classList.add('drag');
    el.style.left = Math.max(0, Math.min(st.p.width - st.r.width, st.r.left - st.p.left + dx)) + 'px';
    el.style.top = Math.max(0, Math.min(st.p.height - st.r.height, st.r.top - st.p.top + dy)) + 'px'; el.style.bottom = 'auto';
    ken.classList.toggle('over', over(e));
  });
  const end = e => {
    if (!st) return;
    st = null; ken.classList.remove('over'); el.classList.remove('drag');
    if (!moved) { ken.hidden = true; if (e.type === 'pointerup') dogTip(); return; }
    const free = over(e); ken.hidden = true;

    if (free) dogFree();
    else { prefs.dogPos = { l: parseFloat(el.style.left), t: parseFloat(el.style.top) }; savePrefs(); }
  };
  el.addEventListener('pointerup', end); el.addEventListener('pointercancel', end);
}
function dogFree() {
  const el = $('dog'); el.hidden = true; prefs.dogPos = null; savePrefs(); placeDog();
  toast('Aegon si běží proběhnout 🐕💨 Za chvíli je zpátky.');
  clearTimeout(dogAway);
  dogAway = setTimeout(() => { if (!cfg.dog.enabled) return; el.hidden = false; if (dog) dog.react('joy', 2500); toast('Aegon je zpátky! 🐕'); }, (Number(cfg.dog.freeMinutes) || 2) * 60000);
}
function dogTip() {
  if (drillNow()) { toast('Aegon: Jsem na cvičáku s Hejsty! Dneska trénujeme ' + DRILL_TOPICS[Math.floor(Date.now() / 6048e5) % DRILL_TOPICS.length] + '.'); return; }
  const n = birds.filter(b => SP[b.sp]).length, inR = birds.filter(b => SP[b.sp] && dist(pos.lat, pos.lon, b.lat, b.lon) <= catchRadius()).length;
  toast('Aegon: ' + (inR ? 'Haf! Něco je v dosahu – ťukni na to!' : n ? 'V okolí cítím ' + n + ' ' + (n === 1 ? 'zvíře' : n < 5 ? 'zvířata' : 'zvířat') + '. Pojďme!' : 'Tady nic necítím, zkusíme jinde?'));
  if (dog) dog.react('joy', 1500);
}
/* ---------- rodina ---------- */
function applyKidMode() { document.body.classList.toggle('kid', kidModeOn(parentCfg, consentRec)); kidLayout(); }
function kidMode() { return document.body.classList.contains('kid'); }
// Odkaz „#akce=…“ z QR kódu: nabídne přidání události
function checkEventLink() {
  const rm = /^#trasa=([\w-]+)$/.exec(location.hash);
  if (rm) {
    history.replaceState(null, '', location.pathname + location.search);
    const o = fromCode(rm[1]), r = o && cleanRoute({ ...o, id: Date.now().toString(36), c: Date.now() });
    if (!r) { toast('Odkaz na trasu je poškozený.'); return; }
    state.routes.push(r); saveState();
    openM(`<h2>Nová trasa</h2><p class="msg"><b>${esc(r.n)}</b><br>${(r.len / 1000).toFixed(1).replace('.', ',')} km</p><button class="btn primary full" data-act="rtWalk" data-id="${esc(r.id)}">Jít po ní</button><button class="btn full ghost" data-act="close">Později (je v oblíbených)</button>`);
    return;
  }
  const fm = /^#farma=([\w-]+)$/.exec(location.hash);
  if (fm) { history.replaceState(null, '', location.pathname + location.search); openVisit(fm[1]); return; }
  const tm = /^#poklad=([\w-]+)$/.exec(location.hash);
  if (tm) {
    history.replaceState(null, '', location.pathname + location.search);
    const t = decodeTreasure(tm[1]);
    if (!t) { toast('Odkaz na poklad je poškozený.'); return; }
    if (!state.treasures.some(x => x.id === t.id)) { state.treasures.push(t); saveState(); }
    toast('💎 Poklad „' + t.n + '“ přidán – hledej ho na mapě.' + (t.h ? ' Nápověda: ' + t.h : ''));
    return;
  }
  const m = /^#akce=([\w-]+)$/.exec(location.hash); if (!m) return;
  history.replaceState(null, '', location.pathname + location.search);
  const e = decodeEvent(m[1]);
  if (!e) { toast('Odkaz na událost je poškozený.'); return; }
  pendingEvent = e;
  openM(`<h2>Nová událost</h2><p class="msg"><b>${esc(e.n)}</b><br>${new Date(e.f).toLocaleDateString('cs-CZ')} – ${new Date(e.t).toLocaleDateString('cs-CZ')}</p>${e.m ? `<div class="fact">${esc(e.m)}</div>` : ''}${eventsListHTML(cfg, [e])}<button class="btn primary full" data-act="evAccept">Přidat</button><button class="btn full ghost" data-act="close">Nechci</button>`);
}
let pendingEvent = null;
async function openParent() {
  if (!await store.get('parentPin').catch(() => null)) { openM(`<h2>Rodičovská nastavení</h2><p class="msg">Nejdřív nastav rodičovský PIN.</p><button class="btn primary full" data-act="pinSet">Nastavit rodičovský PIN</button><button class="btn full ghost" data-act="menu">Zpět</button>`); return; }
  openM(`<h2>Rodičovská nastavení</h2>${await pinFieldIfSet()}<button class="btn primary full" data-act="parentOk">Pokračovat</button><button class="btn full ghost" data-act="menu">Zpět</button>`);
}
let parentOpen = 0; // po zadání PINu 10 minut bez dalšího ptaní
async function parentPanel(check) {
  if (check && Date.now() > parentOpen && !await pinGate()) return;
  parentOpen = Date.now() + 600000;
  openM(parentHTML(cfg, parentCfg, state.events.filter(e => e.own), pos));
}
const saveParent = () => store.set('parent', parentCfg).catch(() => {});
function saveEvent() {
  const v = id => ($(id) || {}).value || '', name = v('evN').trim(), f = new Date(v('evF') + 'T00:00'), t = new Date(v('evT') + 'T23:59');
  const g = [0, 1, 2].map(i => [v('evK' + i), v('evP' + i), Number(v('evC' + i)) || 1]).filter(x => x[0]);
  const r = Number(v('evR')) || 0;
  const e = cleanEvent({ id: Date.now().toString(36), n: name, m: v('evM'), f: f.getTime(), t: t.getTime(), la: r && pos.lat != null ? Math.round(pos.lat * 1e4) / 1e4 : null, lo: r && pos.lon != null ? Math.round(pos.lon * 1e4) / 1e4 : null, r, g });
  if (!e) { $('evErr').textContent = 'Vyplň název, aspoň jeden cíl a správná data.'; return; }
  e.own = true; state.events.push(e); saveState(); shareEvent(e.id);
}
const shareURL = () => location.origin + location.pathname;
function shareEvent(id) { const e = state.events.find(x => x.id === id); if (e) { shareEv = e; openM(eventShareHTML(e, eventLink(shareURL(), e))); } }
let shareEv = null;
async function shareEventLink() {
  const url = eventLink(shareURL(), shareEv);
  try { if (navigator.share) { await navigator.share({ title: shareEv.n, text: 'Událost ve hře Stopař: ' + shareEv.n, url }); return; } } catch (e) { if (e.name === 'AbortError') return; }
  try { await navigator.clipboard.writeText(url); toast('Odkaz zkopírován.'); } catch (e) { prompt('Zkopíruj odkaz:', url); }
}
// Karta úlovku bez polohy – sdílení nebo stažení
async function shareCard(uid) {
  const a = state.animals.find(x => x.uid === uid), sp = a && SP[a.sp]; if (!sp) return;
  const blob = await cardBlob(birdURL(sp, a.stage), a.nick || sp.name, sp.name + ' · síla ' + power(a), cfg.stats.map((st, i) => [st.name, a.stats[i] || 0]));
  if (!blob) { toast('Kartu se nepodařilo vytvořit.'); return; }
  const file = new File([blob], 'stopar-' + sp.id + '.png', { type: 'image/png' });
  try { if (navigator.canShare && navigator.canShare({ files: [file] })) { await navigator.share({ files: [file], title: sp.name }); return; } } catch (e) { if (e.name === 'AbortError') return; }
  const u = URL.createObjectURL(blob), l = document.createElement('a'); l.href = u; l.download = file.name; document.body.appendChild(l); l.click(); l.remove(); setTimeout(() => URL.revokeObjectURL(u), 5000);
  toast('Karta uložena do stažených souborů.');
}

/* ---------- souhlas, zásady, smazání dat ---------- */
let consentYear = '', locked = false, wiping = false, consentRec = null, parentCfg = cleanParent(null);
function openConsent() {
  locked = true;
  openM(consentHTML(cfg));
  $('cYear').value = consentYear;
  onConsentInput();
}
function onConsentInput() {
  if (!$('cYear')) return;
  consentYear = $('cYear').value;
  const age = ageFrom(consentYear);
  $('cParent').hidden = !(age != null && age < MIN_AGE);
}
async function consentOk() {
  const age = ageFrom($('cYear').value);
  const err = m => { $('cErr').textContent = m; };
  if (age == null) return err('Zadej rok narození.');
  if (!$('cOk').checked) return err('Potvrď souhlas s podmínkami a zásadami.');
  const nick = cleanNick($('cNick') ? $('cNick').value : '');
  if (nick && badWord(nick)) return err('Tuhle přezdívku zvol jinou.');
  if (nick) state.nick = nick;
  const parent = age < MIN_AGE;
  if (parent && !$('cParentOk').checked) return err('Souhlas musí potvrdit rodič nebo zákonný zástupce.');
  const pin = parent ? $('cPin').value : '';
  if (parent && !PIN_RE.test(pin)) return err('Rodič nastaví PIN o 4–8 číslicích.');
  if (parent && pin !== $('cPin2').value) return err('PINy se neshodují.');
  // rok narození se neukládá, jen verze podmínek a jestli souhlasil rodič
  try {
    if (parent) await store.set('parentPin', await newPin(pin));
    await store.set('consent', { v: TERMS_VERSION, time: Date.now(), parent, young: age < cfg.family.kidAge });
  } catch (e) {}
  consentRec = await store.get('consent').catch(() => null);
  locked = false; closeM(); start();
}
async function openPinSet() { openM(pinSetHTML(!!await store.get('parentPin').catch(() => null))); }
async function savePin() {
  const err = m => { $('pErr').textContent = m; };
  const rec = await store.get('parentPin').catch(() => null);
  if (rec && !await pinOk(rec, $('pOld').value, err)) return;
  const pin = $('pNew').value;
  if (!PIN_RE.test(pin)) return err('PIN musí mít 4–8 číslic.');
  if (pin !== $('pNew2').value) return err('PINy se neshodují.');
  try { await store.set('parentPin', await newPin(pin)); } catch (e) { return err('PIN se nepodařilo uložit.'); }
  openMenu(); toast('Rodičovský PIN uložen.');
}
// Po 3 špatných pokusech 30 s pauza (proti zkoušení PINu dítětem)
let pinFails = 0, pinWait = 0;
async function pinOk(rec, pin, err) {
  if (Date.now() < pinWait) { err('Moc pokusů, zkus to za chvíli.'); return false; }
  if (await verifyPin(rec, pin)) { pinFails = 0; return true; }
  if (++pinFails >= 3) { pinFails = 0; pinWait = Date.now() + 30000; }
  err('Špatný PIN.'); return false;
}
// Obnova zálohy a Smazat postup v adminu přepisují data → chce rodičovský PIN, pokud je nastavený
async function pinFieldIfSet() {
  return await store.get('parentPin').catch(() => null)
    ? '<div class="fld"><label for="gPin">Rodičovský PIN</label><input type="password" id="gPin" inputmode="numeric" autocomplete="current-password" maxlength="8"></div><p class="msg small" id="gErr"></p>' : '';
}
async function pinGate() {
  const rec = await store.get('parentPin').catch(() => null);
  return !rec || (!!$('gPin') && pinOk(rec, $('gPin').value, m => { $('gErr').textContent = m; }));
}
async function resetProgress() {
  if (!await pinGate()) return;
  state = Object.assign(cleanState({}), { last: state.last });
  await store.clear('photos'); await store.set('state', state);
  closeM(); hudDist(); hudLevel(); hudCones(); toast('Postup smazán.');
}
async function openWipe() {
  if (!await store.get('parentPin').catch(() => null)) {
    openM(`<h2>Smazat všechna data</h2><p class="msg">Mazání chrání rodičovský PIN. Nejdřív ho nastav.</p>
    <button class="btn primary full" data-act="pinSet">Nastavit rodičovský PIN</button><button class="btn full" data-act="menu">Zpět</button>`);
    return;
  }
  openM(`<h2>Smazat všechna data?</h2><p class="msg">Smaže se postup, úlovky, fotky, nastavení, uložené mapy, souhlas i PIN. Vrátit to nejde, jedině ze zálohy.</p>
  <div class="fld"><label for="wPin">Rodičovský PIN</label><input type="password" id="wPin" inputmode="numeric" autocomplete="current-password" maxlength="8"></div>
  <p class="msg small" id="wErr"></p>
  <button class="btn danger full" data-act="wipeOk">Ano, smazat vše</button><button class="btn full" data-act="menu">Zpět</button>`);
}
async function wipeAll() {
  const rec = await store.get('parentPin').catch(() => null);
  if (!rec || !await pinOk(rec, $('wPin').value, m => { $('wErr').textContent = m; })) return;
  wiping = true; clearTimeout(clTimer); // čekající uložení by smazaná data vrátilo
  try { await Promise.all(['kv', 'photos', 'osm'].map(s => store.clear(s))); } catch (e) { wiping = false; toast('Smazání se nepovedlo.'); return; }
  stopGPS(); stopSim();
  // mapové dlaždice prozrazují, kde se hrálo; soubory aplikace zůstanou kvůli offline
  try { for (const k of await caches.keys()) if (k.startsWith('stopar-tiles') || k === 'stopar-static' || k === OFFLINE_CACHE) await caches.delete(k); } catch (e) {}
  location.reload();
}

/* ---------- kontrolní seznam pro testery ---------- */
let checklist = null, clTimer = 0;
let clFromFab = false;
async function openChecklist(fromFab) {
  if (fromFab != null) clFromFab = fromFab;
  if (!checklist) checklist = Object.assign(emptyChecklist(), await store.get('checklist').catch(() => null) || {});
  const y = mbox.scrollTop;
  openM(checklistHTML(checklist, clFromFab));
  mbox.scrollTop = y;
}
function saveChecklist() { clearTimeout(clTimer); clTimer = setTimeout(() => { if (!wiping) store.set('checklist', checklist).catch(() => {}); }, 400); }
function onChecklistInput(t) {
  const k = t.dataset.cl; if (!k || !checklist) return;
  if (k === 'item') (checklist.items[t.dataset.id] ||= {}).n = t.value;
  else checklist[k] = t.value;
  saveChecklist();
}
async function sendChecklist() {
  const info = `Verze ${APP_VERSION} · kód rozmístění ${spawnCode(cfg)} · ${new Date().toLocaleString('cs-CZ')}\n${navigator.userAgent}`;
  const text = checklistText(checklist, info);
  try { if (navigator.share) { await navigator.share({ title: 'Stopař – výsledek testu', text }); return; } }
  catch (e) { if (e.name === 'AbortError') return; }
  location.href = 'mailto:' + encodeURIComponent(cfg.general.contact || '') + '?subject=' + encodeURIComponent('Stopař – výsledek testu') + '&body=' + encodeURIComponent(text);
}

function applyConfig(first) {
  $('clFab').hidden = !cfg.general.testerFab;
  SP = Object.fromEntries(cfg.species.map(s => [s.id, s]));
  FN = Object.fromEntries(cfg.foods.map(f => [f.id, f.name]));
  BIO = Object.fromEntries(cfg.biotopes.map(b => [b.id, b]));
  RAR = Object.fromEntries(cfg.rarities.map(r => [String(r.id), r]));
  osmSetConfig(cfg, () => { refreshBirds(); if (cfg.general.showBiotopes) drawBiotopes(); });
  elevSetConfig(cfg, () => { refreshBirds(); if (pos.lat != null) hudBio(); const L = pl.loops[pl.sel]; if (L && L.prof && !L.prof.ready && !$('plpanel').hidden) showPlanPanel(); });
  $('logo').textContent = cfg.general.headerTitle || cfg.general.appName;
  document.title = cfg.general.appName;
  $('legend').innerHTML = cfg.biotopes.map(b => `<span><i style="background:${esc(b.color)}"></i>${esc(b.name)}</span>`).join('');
  $('legend').classList.toggle('on', !!cfg.general.showBiotopes);
  if (!first && map) {
    map.setMinZoom(cfg.map.minZoom); map.setMaxZoom(cfg.map.maxZoom);
    applyMapStyle(true);
    clearMarkers();
    startPosition();
    refreshBirds();
  }
  updateCompassBtn();
  swConfig();
  if (!first) initDog();
}

async function saveConfig(newCfg) {
  cfg = newCfg;
  try { await store.set('config', compactConfig(cfg)); } catch (e) {}
  applyConfig(false);
}

function saveState() {
  if (wiping) return;
  const now = Date.now(), keep = cfg.catch.gonePrune * 86400000;
  for (const k of Object.keys(state.gone)) if (now - state.gone[k] > keep) delete state.gone[k];
  if (pos.lat != null) state.last = { lat: pos.lat, lon: pos.lon };
  store.set('state', state).catch(() => {});
}

/* ---------- mapa ---------- */
// Herní kruhy kolem hráče jako GeoJSON
function gameData() {
  return {
    range: circle(pos.lon, pos.lat, cfg.spawn.radius),
    catch: circle(pos.lon, pos.lat, catchRadius()),
    acc: pos.src === 'gps' && pos.acc ? circle(pos.lon, pos.lat, pos.acc) : NONE,
    me: pos.lat != null ? { type: 'FeatureCollection', features: [{ type: 'Feature', properties: {}, geometry: { type: 'Point', coordinates: [pos.lon, pos.lat] } }] } : NONE,
    bio: cfg.general.showBiotopes ? biotopeGeo() : NONE
  };
}
function mapCtx() {
  return {
    vectorUrl: cfg.map.vectorUrl, glyphsUrl: cfg.map.glyphsUrl, trailsUrl: cfg.map.trailsUrl,
    demUrl: demSource ? demSource.sharedDemProtocolUrl : cfg.map.demUrl, contourUrl,
    attribution: safeAttribution(cfg.map.attribution), biotopes: cfg.biotopes, game: gameData(), kct: trailsData(), plan: planGeo(), walk: walkGeo()
  };
}
// Přepne styl jen při změně (den/noc, nastavení vrstev); force = po uložení adminu
function applyMapStyle(force) {
  if (!map) return;
  const id = styleIdFor(cfg.map.style, isNight());
  const key = id + JSON.stringify([cfg.layers, cfg.map.vectorUrl, cfg.map.glyphsUrl, cfg.map.trailsUrl, cfg.biotopes.map(b => b.color)]);
  if (key === styleKey && !force) return;
  if (!force && !map.isStyleLoaded()) return; // den/noc přepne při dalším ticku
  styleKey = key;
  map.setStyle(makeStyle(id, cfg.layers, mapCtx()));
  gamePending = bioPending = kctPending = planPending = true;
  const want3d = cfg.layers.buildings === '3d';
  if (want3d !== pitch3d) { pitch3d = want3d; map.easeTo({ pitch: want3d ? 45 : 0, duration: 500 }); }
}
// Kruhy a ladicí biotopy se zapíšou, až je styl připravený (poloha může přijít dřív než styl)
let gamePending = false, bioPending = false, kctPending = false, planPending = false;
// Turistické trasy pro výřez mapy (od zoomu 11)
function refreshTrails() {
  if (!map || !cfg.layers.trHiking || map.getZoom() < 11) return;
  const b = map.getBounds();
  loadTrails(tilesFor([b.getSouth(), b.getWest(), b.getNorth(), b.getEast()]), overpassQuery, cfg.osm.cacheDays, () => { kctPending = true; flushMap(); });
}
function updateGame() { gamePending = true; flushMap(); }
// Zakrytí budovami (HTML značky jsou vždy navrchu): budova vykreslená v místě značky, která zvíře neobsahuje, je před ním
const inRing = (x, y, ring) => { let c = false; for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) { const [xi, yi] = ring[i], [xj, yj] = ring[j]; if ((yi > y) !== (yj > y) && x < (xj - xi) * (y - yi) / (yj - yi) + xi) c = !c; } return c; };
let occT = 0;
function occludeMarkers() {
  if (!map || !map.getLayer('building-3d') || map.getPitch() < 15) { markers.forEach(m => m.el.classList.remove('behind')); return; }
  markers.forEach((m) => {
    const ll = m.mk.getLngLat(), pt = map.project(ll);
    const fs2 = map.queryRenderedFeatures([pt.x, pt.y], { layers: ['building-3d'] });
    const behind = fs2.some(f => { const g = f.geometry, polys = g.type === 'Polygon' ? [g.coordinates] : g.type === 'MultiPolygon' ? g.coordinates : []; return !polys.some(p => inRing(ll.lng, ll.lat, p[0])); });
    m.el.classList.toggle('behind', behind);
  });
}
const occSoon = () => { clearTimeout(occT); occT = setTimeout(occludeMarkers, 120); };
function flushMap() {
  if (!map) return;
  try {
    if (gamePending) {
      const g = gameData(), src = ['range', 'catch', 'acc', 'me'].map(k => [k, map.getSource(k)]);
      if (src.every(([, s]) => s)) { src.forEach(([k, s]) => s.setData(g[k])); gamePending = false; }
    }
    if (planPending) { const a = map.getSource('plan'), b = map.getSource('walk'); if (a && b) { a.setData(planGeo()); b.setData(walkGeo()); planPending = false; } }
    if (kctPending) { const s = map.getSource('kct'); if (s) { s.setData(trailsData()); kctPending = false; } }
    if (bioPending) { const s = map.getSource('biodebug'); if (s) { s.setData(cfg.general.showBiotopes ? biotopeGeo() : NONE); bioPending = false; } }
  } catch (e) { /* styl se ještě načítá, zkusí se při dalším styledata/idle */ }
}

function initMap() {
  const start = state.last || { lat: cfg.map.startLat, lon: cfg.map.startLon };
  if (!window.maplibregl) { banner('Mapu se nepodařilo načíst. Zkontroluj připojení a otevři aplikaci znovu.'); return; }
  // Vrstevnice se počítají v telefonu z výškových dlaždic (na pozadí, ve workeru)
  if (window.mlcontour) {
    try {
      demSource = new mlcontour.DemSource({ url: cfg.map.demUrl, encoding: 'terrarium', maxzoom: 13, worker: true });
      demSource.setupMaplibre(maplibregl);
      contourUrl = demSource.contourProtocolUrl({ thresholds: CONTOUR_THRESHOLDS, elevationKey: 'ele', levelKey: 'level', contourLayer: 'contours' });
    } catch (e) { demSource = null; contourUrl = null; }
  }
  cfg.layers.hillshade = false; cfg.layers.biotopes = false;
  const id = styleIdFor(cfg.map.style, isNight());
  try {
    map = new maplibregl.Map({
      container: 'map', style: makeStyle(id, cfg.layers, mapCtx()), center: [start.lon, start.lat], zoom: cfg.map.startZoom,
      minZoom: cfg.map.minZoom, maxZoom: cfg.map.maxZoom, attributionControl: false, fadeDuration: 0, pitch: cfg.layers.buildings === '3d' ? 45 : 0
    });
  } catch (e) { map = null; banner('Mapa se nedá zobrazit: prohlížeč nepodporuje WebGL. Zkus aktualizovat Chrome nebo Safari.'); return; }
  styleKey = id + JSON.stringify([cfg.layers, cfg.map.vectorUrl, cfg.map.glyphsUrl, cfg.map.trailsUrl, cfg.biotopes.map(b => b.color)]);
  pitch3d = cfg.layers.buildings === '3d';
  map.addControl(new maplibregl.AttributionControl({ compact: true }), 'bottom-left');
  // atribuce sbalená do (i), ať nezakrývá mapu ani Aegona
  map.once('load', () => document.querySelectorAll('.maplibregl-ctrl-attrib').forEach(el => el.classList.remove('maplibregl-compact-show')));
  // růžice v horní liště: ukazuje sever; ťuk = zpět na sever, druhý ťuk = kompas (pokud je zapnutý v nastavení)
  const rose = () => { const n = $('roseN'); if (n) n.setAttribute('transform', 'rotate(' + (-map.getBearing()) + ' 20 20)'); document.body.classList.toggle('flatmap', map.getPitch() < 15); };
  map.on('rotate', rose); map.on('pitch', rose); map.on('load', rose);
  $('roseBtn').onclick = () => { if (compassOn) { toggleCompass(); map.easeTo({ bearing: 0, duration: 400 }); } else if (Math.abs(map.getBearing()) > 1) map.easeTo({ bearing: 0, duration: 400 }); else if (cfg.map.compass) toggleCompass(); else toast('Mapa je natočená na sever.'); };
  // Ťuknutí na severku vypne režim kompasu a vrátí mapu na sever
  setTimeout(() => { const c = document.querySelector('.maplibregl-ctrl-compass'); if (c) c.addEventListener('click', () => { if (compassOn) toggleCompass(); }); }, 0);
  const me = document.createElement('div'); me.className = 'me'; me.innerHTML = '<i class="dir"></i>';
  meMk = new maplibregl.Marker({ element: me }).setLngLat([start.lon, start.lat]).addTo(map);
  map.on('dragstart', () => { follow = false; lastTouch = Date.now(); document.body.classList.add('away'); });
  map.on('zoomstart', e => { if (e.originalEvent) lastTouch = Date.now(); });
  for (const ev of ['touchstart', 'touchmove', 'wheel', 'mousedown']) $('map').addEventListener(ev, () => { lastTouch = Date.now(); }, { passive: true });
  attachGestures(map, $('map'), { distance: dist, onWhatsHere: onLongPress });
  map.on('click', e => {
    if (document.body.classList.contains('ui-open')) { setUi(false); return; }
    if (pl.tap) { pl.tap = false; pl.start = [e.lngLat.lat, e.lngLat.lng]; pl.startName = 'bod na mapě'; showStart(false); openPlanner(); return; }
    if (cfg.general.simulation) {
      if (pos.lat == null) setPos(e.lngLat.lat, e.lngLat.lng, 5, 'sim');
      else simTarget = { lat: e.lngLat.lat, lon: e.lngLat.lng };
    }
  });
  map.on('styledata', () => { kctPending = planPending = true; flushMap(); });
  map.on('moveend', refreshTrails); map.on('move', occSoon); map.on('idle', occSoon);
  map.on('idle', flushMap); map.on('idle', tileBio);
  if (state.last) setPos(state.last.lat, state.last.lon, null, 'last');
}

// Skrýš: kdo vydrží pár minut na místě, uvidí plašší a vzácnější zvířata
let still = { lat: null, lon: null, t: 0 }, hidden = false;
function checkHide() {
  const was = hidden;
  hidden = pos.src !== 'last' && still.t > 0 && unlocked('hide') && Date.now() - still.t >= cfg.world.hideMinutes * 60000;
  if (hidden !== was) toast(hidden ? 'Jsi ve skrýši – zvířata se tě méně bojí a líp se fotí.' : 'Opustil jsi skrýš.');
}
let speedFix = null, muted = false, lastTouch = Date.now();
function setPos(lat, lon, acc, src, gpsSpeed) {
  const now = Date.now();
  const sp = nextSpeed(speedFix, { t: now, gpsSpeed: src === 'gps' ? gpsSpeed : NaN }, speedFix ? dist(speedFix.lat, speedFix.lon, lat, lon) : 0);
  speedFix = { lat, lon, t: now, speed: sp }; pos.speed = sp;
  checkMute();
  if (still.lat == null || dist(still.lat, still.lon, lat, lon) > cfg.world.hideMove) still = { lat, lon, t: Date.now() };
  pos.lat = lat; pos.lon = lon; pos.acc = acc; pos.src = src;
  if (!map) return;
  meMk.setLngLat([lon, lat]);
  updateGame();
  if (follow) map.easeTo({ center: [lon, lat], duration: 400 });
}
// Ztlumení při chůzi: zvířata se schovají, nápis „Zastav se“; vibrace dá vědět, že je něco blízko
function muteOn() { return kidMode() || prefs.muteWalk !== false; }
function checkMute() {
  const m = muteOn() && pos.src === 'gps' && muteState(muted, pos.speed || 0, cfg.map.muteSpeed); // simulace se neztlumuje (testování)
  if (m === muted) return;
  muted = m; document.body.classList.toggle('muted', m);
}
let prefs = {};
const savePrefs = () => store.set('prefs', prefs).catch(() => {});

/* ---------- rychlý vzhled mapy (bez PINu) ---------- */
const LOOK_GROUPS = [['Příroda', [['contours', 'Vrstevnice'], ['peaks', 'Vrcholy'], ['protected', 'Chráněná území']]], ['Trasy', [['trHiking', 'Turistické trasy (KČT)'], ['trCycling', 'Cyklotrasy']]], ['Popisky', [['roadNames', 'Názvy ulic'], ['poi', 'Místa (obchody, doprava, školy…)']]]];
const LOOK_POI = ['poiShop', 'poiFood', 'poiTransport', 'poiEdu', 'poiHealth', 'poiTourism', 'poiNames'];
function openLook() {
  const L = cfg.layers, styles = [['auto', '🌿 Krajina', 've dne světlá, v noci modrá'], ['papir', '📜 Papír a akvarel', 've dne papír, v noci sépie']], cur = cfg.map.style === 'papir' || cfg.map.style === 'papirnoc' ? 'papir' : 'auto';
  const box = (k, n, on) => `<label class="fld row"><span>${esc(n)}</span><input type="checkbox" data-look="${k}"${on ? ' checked' : ''}></label>`;
  openM(`<h2>Vzhled mapy</h2>
  <div class="lookstyles">${styles.map(([k, n, d]) => `<button class="lookstyle${cur === k ? ' on' : ''}" data-act="lookStyle" data-v="${k}"><b>${n}</b><small>${d}</small></button>`).join('')}</div>
  ${LOOK_GROUPS.map(([g, list]) => `<h3>${g}</h3><div class="lookgrid">${list.map(([k, n]) => box(k, n, k === 'poi' ? LOOK_POI.some(x => L[x]) : L[k])).join('')}</div>`).join('')}
  <div class="fld"><label for="lookB">Budovy</label><select id="lookB" data-lookb>${[['off', 'Bez budov'], ['flat', 'Ploché'], ['3d', '3D']].map(([k, n]) => `<option value="${k}"${L.buildings === k ? ' selected' : ''}>${n}</option>`).join('')}</select></div>

  <button class="btn full ghost" data-act="close">Zavřít</button>`);
}
async function saveLook() { try { await store.set('config', compactConfig(cfg)); } catch (e) {} applyMapStyle(true); }
function onLookClick(act, a) {
  const i = Number(a.dataset.i);
  if (act === 'lookStyle') { cfg.map.style = a.dataset.v; }
  else return;
  saveLook(); openLook();
}
function onLookChange(t) {
  if (t.dataset.look) {
    if (t.dataset.look === 'poi') LOOK_POI.forEach(k => { cfg.layers[k] = t.checked; });
    else cfg.layers[t.dataset.look] = t.checked;
  } else if (t.hasAttribute('data-lookb')) cfg.layers.buildings = t.value;
  else return false;
  saveLook(); return true;
}

/* ---------- kompas ---------- */
let compassOn = false, lastRot = 0, headingSeen = false, headingTimer = 0;
function updateCompassBtn() {
  const lb = $('lookBtn'); if (lb) lb.hidden = !cfg.map.quickLook;
  const b = $('compassBtn'); if (!b) return;
  b.hidden = !cfg.map.compass;
  b.classList.toggle('on', compassOn);
  document.body.classList.toggle('compass', compassOn);
  if (!cfg.map.compass && compassOn) toggleCompass();
}
function onOrient(e) {
  let h = null;
  if (typeof e.webkitCompassHeading === 'number') h = e.webkitCompassHeading; // iPhone
  else if (e.absolute && e.alpha != null) h = 360 - e.alpha;                  // Android
  if (h == null || !map) return;
  headingSeen = true;
  h = (h + ((screen.orientation && screen.orientation.angle) || 0) + 360) % 360;
  const now = performance.now(); if (now - lastRot < 120) return; lastRot = now;
  map.rotateTo(h, { duration: 150 });
}
async function toggleCompass() {
  if (compassOn) {
    compassOn = false; clearTimeout(headingTimer);
    window.removeEventListener('deviceorientationabsolute', onOrient); window.removeEventListener('deviceorientation', onOrient);
    if (map) map.rotateTo(0, { duration: 300 });
    updateCompassBtn(); return;
  }
  if (typeof DeviceOrientationEvent !== 'undefined' && typeof DeviceOrientationEvent.requestPermission === 'function') {
    try { if (await DeviceOrientationEvent.requestPermission() !== 'granted') { toast('Bez povolení orientace telefonu kompas nefunguje.'); return; } }
    catch (e) { toast('Kompas se nepodařilo zapnout.'); return; }
  }
  compassOn = true; headingSeen = false; follow = true;
  window.addEventListener('ondeviceorientationabsolute' in window ? 'deviceorientationabsolute' : 'deviceorientation', onOrient);
  headingTimer = setTimeout(() => { if (compassOn && !headingSeen) { toast('Telefon nehlásí směr, kompas nejde použít.'); toggleCompass(); } }, 3000);
  if (pos.lat != null && map) map.easeTo({ center: [pos.lon, pos.lat], duration: 300 });
  updateCompassBtn();
}

/* ---------- poloha ---------- */
function startPosition() {
  if (cfg.general.simulation) { stopGPS(); banner('Simulace: ťukni do mapy a postavička tam dojde.', null); startSim(); return; }
  stopSim();
  if (!('geolocation' in navigator)) { banner('Telefon nepodporuje polohu. V adminu jde zapnout simulaci.', null); return; }
  if (watchId != null) return;
  watchId = navigator.geolocation.watchPosition(onGPS, onGPSErr, { enableHighAccuracy: !!cfg.gps.highAccuracy, maximumAge: 2000, timeout: 20000 });
}
function stopGPS() { if (watchId != null) { navigator.geolocation.clearWatch(watchId); watchId = null; } }
function onGPS(p) {
  const { latitude: lat, longitude: lon, accuracy: acc } = p.coords;
  banner(null);
  const t = p.timestamp || Date.now();
  if (acc <= cfg.gps.maxAccuracy) {
    if (lastGood) {
      const d = dist(lastGood.lat, lastGood.lon, lat, lon), dt = Math.max(1, (t - lastGood.t) / 1000);
      if (d >= cfg.gps.minStep) {
        const k = stepKind(d, dt, cfg.gps);
        if (k === 'walk') { state.dist += d; walked(d); }
        else if (k === 'ride') onRide();
        lastGood = { lat, lon, t };
      }
    } else lastGood = { lat, lon, t };
  }
  const first = pos.src !== 'gps';
  setPos(lat, lon, acc, 'gps', p.coords.speed);
  if (first) { follow = true; if (map) map.jumpTo({ center: [lon, lat], zoom: Math.max(map.getZoom(), cfg.map.startZoom) }); tick(); }
  hudGPS();
}
// Skutečná chůze (ne simulace): úkoly na vzdálenost, XP a šišky za každý celý km
let walkBuf = 0;
function walked(d) {
  const day = dayStr(new Date()); state.walkDays[day] = (state.walkDays[day] || 0) + d;
  if (cfg.farm.enabled && pos.lat != null) walkGain(ensureFarm(), d, biotopeAt(pos.lat, pos.lon));
  walkBuf += d;
  if (walkBuf >= 50) { progressEvent({ kind: 'walk', n: Math.round(walkBuf) }); walkBuf = 0; }
  while (state.dist / 1000 >= state.counters.km + 1) { state.counters.km++; gainXP(cfg.game.xpPerKm); onKm(); progressEvent({ kind: 'km' }); }
}
// Jízda (auto, MHD, kolo): km, šišky ani úkoly se nepočítají; upozornit nejvýš jednou za 10 min
let rideWarn = 0;
function onRide() { if (Date.now() - rideWarn > 600000) { rideWarn = Date.now(); toast('Jedeš rychle – kilometry se teď nepočítají. Počítá se jen chůze. 🚗'); } }
function onKm() { addCones(Number(cfg.game.conesPerKm) || 0); }
function onGPSErr(e) {
  const m = e.code === 1 ? 'Poloha je zakázaná. Povol ji v nastavení prohlížeče pro tuto stránku.' : e.code === 3 ? 'Čekám na signál GPS…' : 'Polohu se nepodařilo zjistit.';
  banner(m);
  hudGPS();
}
let simTimer = null;
function startSim() {
  if (simTimer) return;
  if (pos.lat == null) setPos(cfg.map.startLat, cfg.map.startLon, 5, 'sim');
  let last = performance.now();
  simTimer = setInterval(() => {
    const now = performance.now(), dt = (now - last) / 1000; last = now;
    if (!simTarget || pos.lat == null) return;
    const d = dist(pos.lat, pos.lon, simTarget.lat, simTarget.lon), step = cfg.general.simSpeed * dt;
    if (d <= step) { state.simDist += d; setPos(simTarget.lat, simTarget.lon, 5, 'sim'); simTarget = null; }
    else { const k = step / d; state.simDist += step; setPos(pos.lat + (simTarget.lat - pos.lat) * k, pos.lon + (simTarget.lon - pos.lon) * k, 5, 'sim'); }
    hudDist();
  }, 100);
}
function stopSim() { if (simTimer) { clearInterval(simTimer); simTimer = null; } simTarget = null; }

/* ---------- den/noc ---------- */
function isNight() {
  const D = cfg.daynight;
  if (D.mode === 'day') return false;
  if (D.mode === 'night') return true;
  if (D.mode === 'hours') { const h = new Date().getHours(); return D.nightFrom > D.nightTo ? (h >= D.nightFrom || h < D.nightTo) : (h >= D.nightFrom && h < D.nightTo); }
  const lat = pos.lat ?? cfg.map.startLat, lon = pos.lon ?? cfg.map.startLon;
  return sunAltitude(new Date(), lat, lon) < D.sunAltitude;
}

/* ---------- smyčka ---------- */
function tick() {
  applyMapStyle(false); // přepnutí den/noc
  if (pos.lat == null) { hudGPS(); return; }
  ensureArea(pos.lat, pos.lon, cfg.spawn.radius + cfg.spawn.cellSize);
  checkHide(); loadWeather(); checkStamps(); announceEvents(); checkBound(); updateDog(); autoFollow(); checkPlaces(); checkWalk(); updateAct(); renderCards(); applyNight();
  refreshBirds();
  hudBio(); hudDist(); hudGPS();
}
/* ---------- svět ---------- */
let weather = null, weatherBusy = false, weatherRetry = 0;
async function loadWeather() {
  if (!cfg.world.weather || weatherBusy || Date.now() < weatherRetry) return;
  if (weather === null) { weather = await store.get('weather').catch(() => null) || false; }
  weatherBusy = true;
  try {
    const w = await refreshWeather(weather || null, pos.lat, pos.lon);
    if (w !== weather) { const changed = !weather || weatherCond(w) !== weatherCond(weather); weather = w; store.set('weather', w).catch(() => {}); if (changed && cfg.world.weatherSpawn) { clearMarkers(); refreshBirds(); } }
  } catch (e) { weatherRetry = Date.now() + 10 * 60000; }
  finally { weatherBusy = false; }
}
function isTwilight() {
  const lat = pos.lat ?? cfg.map.startLat, lon = pos.lon ?? cfg.map.startLon, a = sunAltitude(new Date(), lat, lon);
  return a > cfg.world.twilightFrom && a < cfg.world.twilightTo;
}
// Turistické cíle: razítko, když dojdeš blízko
function checkStamps() {
  for (const t of targetsNear(pos.lat, pos.lon, cfg.world.stampRadius)) {
    if (state.stamps[t.id] || pos.src === 'last') continue;
    state.stamps[t.id] = { n: t.name, k: t.tg, i: t.icon, d: Date.now() };
    state.counters.stamps++;
    toast('Razítko: ' + t.icon + ' ' + t.name + ' (+' + cfg.world.xpStamp + ' XP)');
    gainXP(cfg.world.xpStamp); progressEvent({ kind: 'stamp' });
  }
}
/* ---------- nový vzhled: nabídka, akční tlačítko, karty, Já ---------- */
function setUi(on) {
  document.body.classList.toggle('ui-open', on);
  $('dialBtn').setAttribute('aria-expanded', on ? 'true' : 'false');
  $('dialBtn').setAttribute('aria-label', on ? 'Zavřít nabídku' : 'Otevřít nabídku');
  if (on) updateAct();
}
// Akční tlačítko: chytit (zvíře v dosahu) > trasa (jdu po ní) > plánovat
function nearestCatchable() {
  if (pos.lat == null) return null;
  const c = birds.filter(b => SP[b.sp] || b.myth).map(b => ({ b, d: dist(pos.lat, pos.lon, b.lat, b.lon) })).filter(x => x.d <= catchRadius() && (x.b.myth || !speciesLocked(SP[x.b.sp]))).sort((x, y) => x.d - y.d)[0];
  return c ? c.b : null;
}
function actState() {
  const kid = kidMode() && !document.body.classList.contains('parent');
  if (!kid && curView === 'farmv') return farmSel && !farmSel.startsWith('home') ? { k: 'up', ic: 'farm', lbl: 'Vylepšit', run: () => runFarmUp() } : { k: 'build', ic: 'farm', lbl: 'Stavět', run: () => openFarmCatalog() };
  if (!kid && curView === 'atlasv') return { k: 'key', ic: 'key', lbl: 'Určit', run: () => runAct('key') };
  if (!kid && curView === 'jav') return { k: 'races', ic: 'contests', lbl: 'Závody', run: () => runAct('contests') };
  const b = nearestCatchable();
  if (b && !muted) return { k: 'catch', ic: 'catch', lbl: 'Chytit', run: () => { setUi(false); show('mapv'); const m = markers.get(b.id); if (m) { m.el.classList.add('pick'); setTimeout(() => m.el.classList.remove('pick'), 1200); } if (map) map.easeTo({ center: [b.lon, b.lat], duration: 450 }); setTimeout(() => tapBird(b.id), 500); } };
  if (kidMode() && !document.body.classList.contains('parent')) return { k: 'find', ic: 'center', lbl: 'Hledat', run: () => { show('mapv'); follow = true; document.body.classList.remove('away'); if (pos.lat != null && map) map.easeTo({ center: [pos.lon, pos.lat], duration: 400 }); toast('Projdi se a sleduj mapu – zvířata se ukážou kolem tebe. 🐾'); } };
  if (state.walk && !state.walk.done) return { k: 'route', ic: 'route', lbl: 'Trasa', run: () => { setUi(false); openWalkMgr(); } };
  return { k: 'plan', ic: 'plan', lbl: 'Plánovat', run: () => { setUi(false); openPlanner(); } };
}
let actNow = null, curView = 'mapv';
const runAct = act => { const b = document.createElement('button'); b.dataset.act = act; onModalClick({ target: b, preventDefault() {} }); };
function updateAct() {
  const a = actState(), btn = $('actBtn'); if (!btn) return;
  if (!actNow || actNow.k !== a.k) { $('actIc').innerHTML = ic(a.ic); $('actLbl').textContent = a.lbl; btn.classList.toggle('catch', a.k === 'catch'); }
  actNow = a;
}
function bindAct() {
  const btn = $('actBtn'); let t = 0, long = false;
  btn.addEventListener('pointerdown', () => { long = false; t = setTimeout(() => { long = true; openQuick(); }, 550); });
  const stop = () => clearTimeout(t);
  btn.addEventListener('pointerup', stop); btn.addEventListener('pointerleave', stop);
  btn.addEventListener('click', () => { if (long) return; updateAct(); if (actNow) actNow.run(); });
  btn.addEventListener('contextmenu', e => e.preventDefault());
}
// Podržení akčního tlačítka: rychlé akce
function openQuick() {
  setUi(false);
  if (curView === 'farmv') { const sd = $('fside'); if (sd) { farmSide = !farmSide; sd.hidden = !farmSide; if (farmSide) sd.innerHTML = farmSideHTML(); } return; }
  if (curView === 'atlasv') { runAct('jNew'); return; }
  if (curView === 'jav') { runAct('profile'); return; }
  const q = [['planner', 'planner', 'Naplánovat procházku'], ['trNew', 'treasure', 'Schovat poklad'], ['trip', 'trip', 'Karta dnešního výletu'], ['contests', 'games', 'Závody']];
  openM(`<h2>Rychlé akce</h2><div class="jatiles">${q.map(([a, i, n]) => `<button class="jtile g-ven" data-act="${a}">${ic(i)}${n}</button>`).join('')}</div><button class="btn full ghost" data-act="close">Zavřít</button>`);
}
// Chytré karty: jen to, co se týká právě teď; ✕ schová kartu na 10 minut
const cardHidden = {};
function walkPts() { return (state.walk && decodePolyline(state.walk.p)) || []; }
function walkInfo() {
  const w = state.walk, pts = walkPts(), total = pathLength(pts), left = Math.max(0, total - w.prog);
  const mins = walkMinutes(left, 0, 0, Number(prefs.kmh) || cfg.planner.kmh), eta = new Date(Date.now() + mins * 60000).toLocaleTimeString('cs-CZ', { hour: '2-digit', minute: '2-digit' });
  return { total, done: w.prog, left, mins, eta, rewards: w.cps.filter(c => !c.done).length };
}
const km = m => (m / 1000).toFixed(1).replace('.', ',');
function smartCards() {
  const out = [], now = Date.now();
  if (pos.lat == null) return out;
  if (state.walk && !state.walk.done) { const i = walkInfo(); out.push({ id: 'walk', ic: 'route', t: state.walk.n, s: `${km(i.done)} z ${km(i.total)} km${i.rewards ? ' · ' + i.rewards + ' 🎁' : ''} · cíl kolem ${i.eta}`, b: 'Trasa' }); }
  const m = birds.find(b => b.myth && dist(pos.lat, pos.lon, b.lat, b.lon) <= cfg.spawn.radius);
  const dt = daysToWindow(cfg);
  if (!m && dt != null && dt <= 3) out.push({ id: 'omen', ic: 'myth', t: 'Zvláštní stopy… 👣', s: dt <= 0 ? 'Bájní tvorové jsou blízko!' : 'Za ' + dt + ' dn' + (dt === 1 ? 'í' : 'y') + ' začnou bájné dny', b: 'Pověsti', at: null });
  if (m) out.push({ id: 'myth', ic: 'myth', t: 'Poblíž je bájný tvor!', s: Math.round(dist(pos.lat, pos.lon, m.lat, m.lon)) + ' m – rychle, než zmizí', b: 'Ukázat', at: [m.lat, m.lon] });
  if (cfg.world.feeders) {
    const P = placesToday(), f = feedersHere().filter(x => !P.feeders.includes(x.id)).map(x => ({ x, d: dist(pos.lat, pos.lon, x.lat, x.lon) })).filter(x => x.d <= 400).sort((a, b) => a.d - b.d)[0];
    if (f) out.push({ id: 'feeder', ic: 'feeder', t: cfg.world.feederName + ' ' + Math.round(f.d) + ' m', s: 'Dojdi k němu pro odměnu', b: 'Ukázat', at: [f.x.lat, f.x.lon] });
  }
  return out.filter(c => !(cardHidden[c.id] > now)).slice(0, 2);
}
let cardsKey = '';
function renderCards() {
  const el = $('cards'); if (!el) return;
  const list = !$('plpanel').hidden ? [] : smartCards(), key = JSON.stringify(list.map(c => [c.id, c.t, c.s]));
  if (key === cardsKey) return; cardsKey = key; cardsData = list;
  $('dialBtn').classList.toggle('badge', list.length > 0);
  el.innerHTML = list.map((c, i) => `<div class="scard">${ic(c.ic)}<div><b>${esc(c.t)}</b><small>${esc(c.s)}</small></div><button class="btn sm primary" data-ci="${i}">${esc(c.b)}</button><button class="x" data-cx="${i}" aria-label="Schovat">✕</button></div>`).join('');
}
let cardsData = [];
function onCardClick(e) {
  const x = e.target.closest('[data-cx]'), b = e.target.closest('[data-ci]');
  if (x) { const c = cardsData[Number(x.dataset.cx)]; if (c) { cardHidden[c.id] = Date.now() + 600000; cardsKey = ''; renderCards(); } return; }
  if (!b) return;
  const c = cardsData[Number(b.dataset.ci)]; if (!c) return;
  if (c.id === 'walk') openWalkMgr();
  else if (c.id === 'omen') openM(legendsHTML(cfg, state, BIO, daysToWindow(cfg)));
  else if (c.at && map) { follow = false; lastTouch = Date.now(); document.body.classList.add('away'); map.flyTo({ center: [c.at[1], c.at[0]], zoom: Math.max(map.getZoom(), 16), duration: 800 }); }
}
// Správa trasy při chůzi
function openWalkMgr() {
  const w = state.walk; if (!w) return;
  const i = walkInfo(), p = Math.min(100, Math.round(i.done / Math.max(1, i.total) * 100));
  openM(`<h2>${ic('route')} ${esc(w.n)}</h2><div class="prog"><div style="width:${p}%"></div></div>
  <div class="tools"><div class="album"><b>Ušlo</b><small>${km(i.done)} z ${km(i.total)} km</small></div><div class="album"><b>Zbývá</b><small>${fmtMin(i.mins)} · cíl ${i.eta}</small></div><div class="album"><b>Odměny</b><small>${w.cps.length - i.rewards} z ${w.cps.length} 🎁</small></div></div>
  <p class="msg small">${w.end ? 'Trasa končí v cíli 🏁.' : 'Okruh končí zpátky na startu.'} Odměnu sebereš, když k ní dojdeš.</p>
  <button class="btn primary full" data-act="walkShow">Ukázat trasu na mapě</button>
  <button class="btn full" data-act="walkSave">Uložit mezi oblíbené</button>
  <button class="btn full ghost" data-act="walkEnd" data-confirm="Opravdu ukončit?">Ukončit trasu</button>
  <button class="btn full ghost" data-act="close">Zavřít</button>`);
}
// Já: profil s Aegonem a dlaždice ve skupinách (místo dlouhého Menu)
function renderJa() {
  const lv = levelFor(state.xp, cfg.game), sp = Object.values(state.caught).filter(c => c.count).length;
  const standalone = matchMedia('(display-mode: standalone)').matches || navigator.standalone;
  const T = (g, a, i, n, extra = '') => `<button class="jtile g-${g}" data-act="${a}"${extra}>${ic(i)}${n}</button>`;
  $('jav').innerHTML = `<div class="ja">
  <div class="jahead"><img src="${dogURL('portrait')}" alt=""><div style="flex:1"><h2>${esc(state.nick || 'Ty')} a Aegon <button class="x" data-act="nickEdit" aria-label="Změnit přezdívku">✏️</button></h2><small>Úroveň ${lv.level} · ${lv.into} / ${lv.need} XP</small><div class="prog"><div style="width:${Math.round(lv.into / lv.need * 100)}%"></div></div></div></div>
  <div class="jastats"><div><b>${sp}</b>druhů</div><div><b>${km(state.dist)}</b>km celkem</div><div><b>${Math.floor(state.cones)}</b>šišek</div></div>
  <div class="jagrp">Ven</div><div class="jatiles">${T('ven', 'planner', 'planner', 'Plánovač')}${T('ven', 'treasures', 'treasure', 'Poklady')}${T('ven', 'trip', 'trip', 'Karta výletu')}${T('ven', 'family', 'family', 'Rodinná výprava')}${state.walk && !state.walk.done ? T('ven', 'walkMgr', 'route', 'Moje trasa') : ''}</div>
  <div class="jagrp">Hraj</div><div class="jatiles">${T('hraj', 'profile', 'quests', 'Úkoly a odznaky')}${T('hraj', 'shop', 'shop', 'Obchod')}${T('hraj', 'contests', 'contests', 'Závody')}</div>
  <div class="jagrp">Rodina</div><div class="jatiles">${T('rod', 'parent', 'parent', 'Rodičovská nastavení')}${T('rod', 'pinSet', 'pin', 'Rodičovský PIN')}</div>
  <div class="jagrp">Nastavení a data</div><div class="jatiles">${T('sys', 'nightCfg', 'night', 'Noc a jas')}${T('sys', 'dataMgr', 'data', 'Správa dat')}${T('sys', 'export', 'backup', 'Uložit zálohu')}<label class="jtile g-sys">${ic('restore')}Obnovit zálohu<input type="file" accept="application/json,.json" data-import></label>${cfg.general.testerFab ? T('sys', 'checklist', 'tester', 'Testeři') : ''}${!standalone && installEvt ? T('sys', 'install', 'install', 'Instalovat') : ''}${T('sys', 'about', 'about', 'O aplikaci')}${T('sys', 'legalMenu', 'legal', 'Podmínky')}</div>
  <div class="jarow"><label class="fld row">Ztlumit mapu při chůzi (bezpečnost)<input type="checkbox" data-pref="muteWalk"${muteOn() ? ' checked' : ''}${kidMode() ? ' disabled' : ''}></label>
  <p class="msg small">Kód rozmístění: <b>${spawnCode(cfg)}</b> – stejný kód = stejná zvířata na stejném místě.</p>
  <button class="btn full danger" data-act="wipe">Smazat všechna moje data</button>
  <p class="msg small">Mapa a biotopy: ${safeAttribution(cfg.map.attribution)}</p></div></div>`;
}
// Noc: tmavé rozhraní (automaticky podle slunce / vždy / nikdy), ztlumení mapy, červené světlo
function nightOn() { const m = prefs.night || 'auto'; return m === 'on' || (m === 'auto' && isNight()); }
function applyNight() {
  const n = nightOn(), dim = Number.isFinite(Number(prefs.dim)) ? Number(prefs.dim) : 30;
  document.body.classList.toggle('dark', n);
  document.body.classList.toggle('red', n && !!prefs.red);
  const d = $('dim'); if (d) d.style.opacity = n ? dim / 100 : 0;
}
function nightHTML() {
  const m = prefs.night || 'auto', dim = Number.isFinite(Number(prefs.dim)) ? Number(prefs.dim) : 30;
  return `<h2>${ic('night')} Noc a jas</h2><p class="msg small">Večer přepne aplikaci do tmavých barev a ztlumí mapu, aby neoslňovala.</p>
  <div class="look"><div class="chips">${[['auto', 'Automaticky (podle slunce)'], ['on', 'Vždy tmavě'], ['off', 'Nikdy']].map(([k, n]) => `<button class="chip${m === k ? ' on' : ''}" data-act="nightMode" data-v="${k}">${n}</button>`).join('')}</div></div>
  <div class="fld"><label for="nightDim">Ztlumení mapy v noci: <b id="nightDimV">${dim} %</b></label><input type="range" id="nightDim" min="0" max="70" step="5" value="${dim}"></div>
  <label class="fld row">Červené noční světlo (šetří oči, tma zůstane tmou)<input type="checkbox" data-pref="red"${prefs.red ? ' checked' : ''}></label>
  <button class="btn full ghost" data-act="close">Hotovo</button>`;
}
/* ---------- dětský vzhled: 3 velká tlačítka, zbytek za rodičovským PINem ---------- */
function nickLabel() { const n = $('navMe'); if (n) n.textContent = state.nick || 'Já'; }
// Kdo aplikaci měl před přezdívkami: jednou se zeptat
function askNick(force) {
  if (!force && (state.nick || prefs.nickAsked)) return;
  openM(`<h2>Jak ti máme říkat?</h2><p class="msg small">Přezdívka se ukáže dole v liště a v profilu. Jen v tomto telefonu.</p><div class="fld"><input type="text" id="nickIn" maxlength="20" value="${esc(state.nick || '')}" placeholder="např. Liška" aria-label="Přezdívka"></div><p class="msg small" id="nickErr"></p><button class="btn primary full" data-act="nickSave">Uložit</button><button class="btn full ghost" data-act="nickLater">${force ? 'Zrušit' : 'Později'}</button>`);
}
function kidLayout() {
  const k = kidMode();
  const c = $('navCol'); if (c) c.textContent = k ? 'Moje zvířata' : 'Farma';
  const mb = $('menuBtn'); if (mb) mb.textContent = k ? '🛡️ Rodič' : 'Menu';
  if (!k) document.body.classList.remove('parent');
}
async function parentGo() {
  const rec = await store.get('parentPin').catch(() => null);
  if (!rec || await pinOk(rec, $('gPin').value, m => { $('gErr').textContent = m; })) { closeM(); document.body.classList.add('parent'); show('jav'); }
}
async function parentGate() {
  const rec = await store.get('parentPin').catch(() => null);
  if (!rec) { document.body.classList.add('parent'); show('jav'); toast('Tip: nastav rodičovský PIN, ať se sem dítě nedostane.'); return; }
  openM(`<h2>${ic('parent')} Pro rodiče</h2><p class="msg small">Plánovač, nastavení a další funkce jsou za rodičovským PINem.</p>${await pinFieldIfSet()}<button class="btn primary full" data-act="parentGo">Pokračovat</button><button class="btn full ghost" data-act="close">Zpět</button>`);
}
function autoFollow() {
  const s = Number(cfg.map.autoFollow) || 0;
  if (!s || follow || !map || Date.now() - lastTouch < s * 1000) return;
  if (!$('plpanel').hidden || pl.tap || modal.classList.contains('on')) return; // plánování trasy – mapa zůstane, kde ji máš
  follow = true; document.body.classList.remove('away'); map.easeTo({ center: [pos.lon, pos.lat], zoom: Math.max(map.getZoom(), cfg.map.startZoom), duration: 800 });
}
// „Co je zde?“ – podržení prstu na mapě (na počítači pravé tlačítko)
function whatsHere(lat, lon) {
  const b = biotopeAt(lat, lon), alt = elevationAt(lat, lon), pa = protectedAt(lat, lon);
  openM(whatsHereHTML({ lat, lon, dist: pos.lat != null ? dist(pos.lat, pos.lon, lat, lon) : null,
    bio: b ? (BIO[b] ? BIO[b].name : b) : 'data ještě nejsou načtená', alt: Number.isFinite(alt) ? alt + ' m' : '',
    protected: pa ? (pa.name || '') + ' (' + protectedType(pa) + ')' : '', targets: targetsNear(lat, lon, 500).slice(0, 5) }));
}
let outside = false;
function checkBound() {
  const o = !insideBound(parentCfg, pos.lat, pos.lon);
  if (o !== outside) { outside = o; if (o) toast('Jsi mimo bezpečnou oblast, kterou nastavil rodič. Vrať se zpátky.'); }
}
let eventsDay = '';
function announceEvents() {
  const d = new Date().toDateString(); if (d === eventsDay) return; eventsDay = d;
  for (const e of activeEvents(cfg)) toast('Probíhá: ' + e.name + '. ' + e.text);
  if (activeWindow(cfg)) toast('🔮 Bájné dny! U lesů, vod, skal a luk se můžou objevit tajemní tvorové.');
  else { const k = daysToWindow(cfg); if (k != null && k <= 3) toast('Aegon větří něco zvláštního… Za ' + k + (k === 1 ? ' den' : ' dny') + ' začnou bájné dny.'); }
}
const tgMarkers = new Map();
function refreshTargets() {
  const near = targetsNear(pos.lat, pos.lon, cfg.spawn.radius), ids = new Set(near.map(t => t.id));
  tgMarkers.forEach((m, id) => { if (!ids.has(id)) { m.mk.remove(); tgMarkers.delete(id); } });
  for (const t of near) {
    const done = !!state.stamps[t.id], m = tgMarkers.get(t.id);
    if (m) { m.el.classList.toggle('done', done); continue; }
    const el = document.createElement('div'); el.className = 'tgmk' + (done ? ' done' : ''); el.innerHTML = `<span aria-hidden="true">${esc(t.icon)}</span>`; el.title = t.name;
    el.addEventListener('click', ev => { ev.stopPropagation(); const d = Math.round(dist(pos.lat, pos.lon, t.lat, t.lon)); toast(t.icon + ' ' + t.name + (state.stamps[t.id] ? ' – razítko máš.' : ` – ${d} m. Dojdi až k cíli pro razítko.`)); });
    tgMarkers.set(t.id, { el, mk: new maplibregl.Marker({ element: el, anchor: 'bottom' }).setLngLat([t.lon, t.lat]).addTo(map) });
  }
}
// Karta chráněného území (popis z Wikipedie se stáhne až teď)
const wikiCache = new Map();
async function openProtected() {
  const t = protectedAt(pos.lat, pos.lon); if (!t) return;
  const key = t.wikipedia || t.name;
  openM(protectedHTML(t, wikiCache.get(key)));
  if (wikiCache.has(key) || !t.wikipedia) return;
  const sum = await wikiSummary(t).catch(() => '');
  wikiCache.set(key, sum);
  if ($('wikiWait')) openM(protectedHTML(t, sum));
}

function refreshBirds() {
  if (pos.lat == null || !map) return;
  // rozmístění smí záviset jen na tom, co je stejné pro všechny (počasí až se serverem, skrýš je osobní bonus při chytání)
  const now = new Date(), ctx = { now, weather: cfg.world.weather && cfg.world.weatherSpawn ? weatherCond(weather) : '', twilight: isTwilight() };
  const base = new Map(cfg.species.map(sp => [sp.id, speciesMult(cfg, sp, ctx)])), quiet = inQuietMonths(cfg, now), myWin = cfg.world.mythTest ? { season: 'test', from: 0, to: Infinity } : activeWindow(cfg, now.getTime());
  const quietSet = new Set(String(cfg.world.quietBiotopes || '').split(',').map(x => x.trim()));
  const r = visibleBirds(cfg, pos.lat, pos.lon, isNight(), state.gone, now.getTime(), biotopeAt, elevationAt, {
    guess: biotopeGuess,
    myth: (bio, zone, h) => mythFor(cfg, { window: myWin, now: now.getTime(), bio, zone, night: isNight() }, h),
    allow: (la, lo) => insideBound(parentCfg, la, lo) && spawnAllowed(la, lo), twilight: ctx.twilight, variant: (sp, h) => variantFor(cfg, sp, h), track: (sp, h) => isTrack(cfg, sp, h),
    mult: (sp, bio, la, lo) => quiet && quietSet.has(bio) && protectedAt(la, lo) ? 0 : base.get(sp.id) ?? 1
  });
  birds = r.birds;
  const ids = new Set(birds.map(b => b.id));
  markers.forEach((_, id) => { if (!ids.has(id)) removeMarker(id); });
  for (const b of birds) {
    if (b.myth) { mythMarker(b); continue; }
    const sp = SP[b.sp];
    if (!sp) continue;
    const near = dist(pos.lat, pos.lon, b.lat, b.lon) <= catchRadius();
    const m = markers.get(b.id);
    if (!m) {
      const el = document.createElement('div');
      el.className = 'bmk' + (near ? '' : ' far') + (speciesLocked(sp) ? ' locked' : '') + (b.variant ? ' var-' + b.variant : '');
      el.innerHTML = (b.track && !tracked.has(b.id) ? '<span class="cls paw" role="img" aria-label="Stopa">🐾</span>' : cfg.map.classMarkers ? `<span class="cls" role="img" aria-label="${esc(sp.group || 'Zvíře')}">${ic(classIcon(sp.group))}</span>` : `<img src="${birdURL(sp)}" alt="${esc(sp.name)}">`) + '<i class="pin" aria-hidden="true"></i>';
      el.addEventListener('click', ev => { ev.stopPropagation(); tapBird(b.id); });
      markers.set(b.id, { el, mk: new maplibregl.Marker({ element: el, anchor: 'bottom', offset: [0, 4] }).setLngLat([b.lon, b.lat]).addTo(map) });
    } else m.el.classList.toggle('far', !near);
    if (near && cfg.family.vibrate && !buzzed.has(b.id) && (muted || !state.caught[sp.id]?.count) && !speciesLocked(sp)) { buzzed.add(b.id); try { navigator.vibrate && navigator.vibrate(200); } catch (e) {} }
  }
  const hb = $('hbio');
  if (r.pending && !birds.length) hb.dataset.loading = '1'; else delete hb.dataset.loading;
  refreshTargets(); refreshPlaces(); occSoon(); // nová kolečka hned schovat za budovy (bez pohybu mapy by čekala)
}
/* ---------- soutěže ---------- */
let stopGame = null;
function openContests() {
  if (stopGame) { stopGame(); stopGame = null; }
  if (false) { openM(`<h2>Soutěže</h2><p class="msg">Soutěže se otevřou na úrovni ${levelNeeded(cfg.game.unlocks, 'contests')}.</p><button class="btn full ghost" data-act="close">Zavřít</button>`); return; }
  openM(contestsHTML(cfg, state, SP));
}
function startGame(game, uid, mode = 'race') {
  const g = GAMES.find(x => x.id === game), a = state.animals.find(x => x.uid === uid); if (!g || !a) return;
  const si = cfg.stats.findIndex(st => st.id === g.stat), stat = a.stats[si] || 0;
  curGame = game; curMode = mode;
  if (g.mini) { playMini(g.mini, 'mid', (moves, secs, sc) => raceDone(g, a, si, stat, miniSkill(g.mini, moves, sc), mode, uid)); return; }
  openM(`<h2>${g.icon} ${g.name}</h2><div id="game"></div>`);
  locked = true; // během hry se okno nezavírá ťuknutím vedle
  stopGame = runGame(game, $('game'), skill => { stopGame = null; locked = false; raceDone(g, a, si, stat, skill, mode, uid); });
  curGame = game;
}
let curMode = 'race';
// Konec závodu nebo tréninku: skóre (šikovnost + vlastnost), rekord a kód, nebo zlepšení vlastnosti
function raceDone(g, a, si, stat, skill, mode, uid) {
  const game = g.id, again = `<button class="btn primary full" data-act="cStart" data-mode="${mode}" data-uid="${esc(uid)}" data-g="${game}">${mode === 'train' ? 'Trénovat znovu' : 'Hrát znovu'}</button><button class="btn full ghost" data-act="contests">Zpět na závody</button>`;
  if (mode === 'train') {
    const r = trainStat(cfg, a, si, skill, dayStr(new Date()), cfg.catch.maxStat); saveState();
    const nm = esc(cfg.stats[si].name.toLowerCase()), who = esc(a.nick || SP[a.sp].name);
    openM(`<h2>${g.icon} Trénink</h2><p class="msg">Šikovnost ${Math.round(skill * 100)} %.</p><p class="msg">${r === 'ok' ? `${who}: ${nm} +${cfg.game.trainGain} (teď ${a.stats[si]})` : r === 'limit' ? 'Na dnešek má zvíře natrénováno – zítra zase.' : 'Na zlepšení potřebuješ aspoň 50 % šikovnosti.'}</p>${again}`);
    return;
  }
  {
    const score = contestScore(skill, stat, cfg.catch.maxStat), rec = state.records[game], best = !rec || score > rec.score;
    if (best) state.records[game] = { score, sp: a.sp, date: Date.now() };
    gainXP(Number(cfg.game.xpContest) || 0); progressEvent({ kind: 'contest' });
    const code = scoreCode(game, score);
    openM(`<h2>${g.icon} ${score} bodů</h2><p class="msg">Šikovnost ${Math.round(skill * 100)} % + ${esc(cfg.stats[si].name.toLowerCase())} ${stat}${best ? '<br><b>Nový rekord!</b>' : '<br>Rekord: ' + rec.score}</p>
    <p class="msg small">Kód výsledku pro rodinu:</p><p class="msg"><b class="code">${code}</b></p>
    <button class="btn full" data-act="cShare" data-code="${code}" data-g="${esc(g.name)}" data-s="${score}">Poslat kód</button>
    ${again}`);
    curGame = game; saveState();
  }
}
let curGame = '';
async function shareScore(a) {
  const text = `Stopař – ${a.dataset.g}: ${a.dataset.s} bodů. Kód: ${a.dataset.code}`;
  try { if (navigator.share) { await navigator.share({ text }); return; } } catch (e) { if (e.name === 'AbortError') return; }
  try { await navigator.clipboard.writeText(text); toast('Zkopírováno.'); } catch (e) { prompt('Zkopíruj:', text); }
}
/* ---------- bájní tvorové ---------- */
const MY = id => cfg.myths.find(t => t.id === id);
function mythMarker(b) {
  if (markers.has(b.id) || !MY(b.myth)) return;
  const el = document.createElement('div'); el.className = 'bmk myth';
  el.innerHTML = `<img src="${mythURL(MY(b.myth))}" alt="Bájný tvor">`;
  el.addEventListener('click', ev => { ev.stopPropagation(); tapBird(b.id); });
  markers.set(b.id, { el, mk: new maplibregl.Marker({ element: el, anchor: 'bottom', offset: [0, 4] }).setLngLat([b.lon, b.lat]).addTo(map) });
  if (cfg.family.vibrate && !buzzed.has(b.id)) { buzzed.add(b.id); try { navigator.vibrate && navigator.vibrate([100, 60, 100, 60, 300]); } catch (e) {} }
}
// Jediný pokus, pár sekund, jen ostrá fotka
function mythEncounter(b) {
  const t = MY(b.myth); if (!t) return;
  enc = t.easy ? { b, myth: t, sp: { name: t.name }, step: 'photo', shots: 0, zone: .4, speed: 2.6, secs: Number(cfg.world.mythSeconds) + 4, need: 60, msg: 'Sváteční tvor! Cvakni, až bude uprostřed.' }
    : { b, myth: t, sp: { name: t.name }, step: 'photo', shots: 0, zone: .2, speed: 4.5, secs: Number(cfg.world.mythSeconds), need: cfg.world.mythMinQuality, msg: 'Jediný pokus! Cvakni přesně uprostřed.' };
  openM(`<h2>🔮 ${esc(t.name)}</h2><div class="frame"><div id="fb" style="width:100%;height:100%"><img src="${mythURL(t)}" alt=""></div><div class="cross"></div></div>
  <div class="bar"><div class="zone" style="left:${(.5 - enc.zone / 2) * 100}%;width:${enc.zone * 100}%"></div><div class="mark" id="mk"></div></div><p class="msg">${esc(enc.msg)} <b id="mythT">${enc.secs}</b> s</p>
  <button class="btn primary full" data-act="shoot">Cvak!</button>`);
  locked = true; enc.t0 = performance.now(); photoAnim();
  const my = enc;
  mythTimer = setInterval(() => {
    const left = Math.max(0, my.secs - (performance.now() - my.t0) / 1000);
    if ($('mythT')) $('mythT').textContent = left.toFixed(1).replace('.', ',');
    if (left <= 0 && enc === my) mythResult(0);
  }, 100);
}
let mythTimer = 0;
function mythResult(q) {
  clearInterval(mythTimer); locked = false;
  const t = enc.myth, ok = q >= (enc.need ?? cfg.world.mythMinQuality);
  state.gone[enc.b.id] = Date.now(); removeMarker(enc.b.id);
  if (ok) {
    const isNew = !state.myths[t.id]; state.myths[t.id] = state.myths[t.id] || Date.now();
    gainXP(cfg.world.xpMyth); progressEvent({ kind: 'myth' }); if (dog) dog.react('jump', 4000);
    openM(`<div class="encimg master"><img src="${mythURL(t)}" alt=""></div><p class="newsp">${isNew ? 'Nový bájný tvor v tajné sekci!' : 'Zase ty!'}</p><h2>${esc(t.name)}</h2><p class="msg">Ostrost ${q} %.</p><div class="fact">${esc(t.fact)}</div><button class="btn primary full" data-act="close">Pokračovat</button>`);
  } else {
    if (dog) dog.react('sad', 3000);
    openM(`<div class="encimg" style="opacity:.35"><img src="${mythURL(t)}" alt=""></div><h2>${esc(t.name)}</h2><p class="msg">${q ? 'Fotka byla moc rozmazaná (' + q + ' %).' : 'Nestihl jsi to.'} Zmizel v mlze… Snad příště.</p><button class="btn primary full" data-act="close">Pokračovat</button>`);
  }
  enc = null; saveState();
}
/* ---------- krmítka, parky a poklady ---------- */
const placeMarkers = new Map();
function placeMarker(id, lat, lon, cls, html, onTap) {
  let m = placeMarkers.get(id);
  if (!m) { const el = document.createElement('div'); el.className = cls; el.innerHTML = html; el.addEventListener('click', ev => { ev.stopPropagation(); onTap(); }); m = { el, mk: new maplibregl.Marker({ element: el, anchor: 'bottom' }).setLngLat([lon, lat]).addTo(map) }; placeMarkers.set(id, m); }
  m.seen = true; return m;
}
const today = () => dayStr(new Date());
function placesToday() { if (state.places.day !== today()) state.places = { ...cleanPlaces(null), day: today(), parksDone: [] }; return state.places; }
function feedersHere() { return feedersNear(targetsNear(pos.lat, pos.lon, cfg.spawn.radius), parksNear(pos.lat, pos.lon, cfg.spawn.radius), cfg.world.feederMinPark); }
function refreshPlaces() {
  if (pos.lat == null || !map) return;
  placeMarkers.forEach(m => { m.seen = false; });
  const P = placesToday(), W = cfg.world;
  for (const f of feedersHere()) {
    const m = placeMarker(f.id, f.lat, f.lon, 'fdmk', '<span aria-hidden="true">🏠</span>', () => toast(W.feederName + (f.at === 'park' ? ' v parku' : ' u cíle ' + f.at) + (P.feeders.includes(f.id) ? ' – dnes už navštíveno.' : ' – dojdi k němu pro odměnu.')));
    m.el.classList.toggle('done', P.feeders.includes(f.id)); m.el.title = W.feederName;
  }
  for (const t of state.treasures) {
    if (t.found || t.own) continue;
    const c = searchCircle(t, W.treasureCircle);
    if (dist(pos.lat, pos.lon, c.lat, c.lon) > cfg.spawn.radius * 2) continue;
    placeMarker('t' + t.id, c.lat, c.lon, 'trmk', '<span aria-hidden="true">💎</span>', () => toast('Poklad „' + t.n + '“ je někde v okruhu ' + W.treasureCircle + ' m.' + (t.h ? ' Nápověda: ' + t.h : '')));
  }
  placeMarkers.forEach((m, id) => { if (!m.seen) { m.mk.remove(); placeMarkers.delete(id); } });
}
// Našel jsem zraněné zvíře: co dělat a kontakt na záchranné stanice (síť ČSOP)
function injuredHTML() {
  return `<h2>${ic('injured')} Našel jsem zraněné zvíře</h2>
  <div class="fact"><b>1. Zachovej klid a nesahej na něj holou rukou.</b> Divoká zvířata se bojí a můžou kousnout.</div>
  <div class="fact"><b>2. Mládě nemusí být opuštěné.</b> Srnčata a zaječí mláďata nech být – matka je blízko. Ptačí mládě bez peří vrať do hnízda nebo do keře.</div>
  <div class="fact"><b>3. Zavolej záchrannou stanici.</b> Poradí, co dělat, a případně si pro zvíře přijedou. Nekrm ho a nedávej mu pít.</div>
  <div class="fact"><b>4. U silnice dbej na bezpečnost</b> a požádej o pomoc dospělého.</div>
  <a class="btn primary full" href="https://www.zvirevnouzi.cz/" target="_blank" rel="noopener">Najít nejbližší záchrannou stanici</a>
  <p class="msg small">Zvíře v nouzi – síť záchranných stanic ČSOP (mapa stanic a telefony).</p>
  <button class="btn full ghost" data-act="close">Zavřít</button>`;
}
let curTask = null;
function answerTask(i) {
  const t = curTask; if (!t) return; curTask = null;
  const ok = i === t.c, res = RES_FOR[t.kind] || 'seeds', names = { wood: '🪵 dřevo', stone: '🪨 kámen', seeds: '🌱 semínka' };
  if (ok) { gainXP(5); gainKnow('task', 'za úkol místa'); if (cfg.farm.enabled) { const f = ensureFarm(); f.res[res] = (f.res[res] || 0) + 5; } saveState(); }
  openM(`<h2>${ok ? 'Správně! 🎉' : 'Tentokrát ne'}</h2><p class="msg">${esc(t.why)}</p>${ok ? `<p class="msg">+5 XP${cfg.farm.enabled ? ' · +5 ' + names[res] + ' na farmu' : ''}</p>` : '<p class="msg small">Správně je: ' + esc(t.a[t.c]) + '</p>'}<button class="btn primary full" data-act="close">Pokračovat</button>`);
}
function checkPlaces() {
  if (pos.lat == null || pos.src === 'last') return;
  const P = placesToday(), W = cfg.world;
  for (const f of feedersHere()) {
    if (P.feeders.includes(f.id) || dist(pos.lat, pos.lon, f.lat, f.lon) > W.feederRadius) continue;
    P.feeders.push(f.id);
    const r = feederReward(cfg, f.id, today());
    addCones(r.cones); gainXP(r.xp);
    if (r.item && cfg.shop.some(it => it.id === r.item)) state.inv[r.item] = (state.inv[r.item] || 0) + 1;
    toast('🏠 ' + W.feederName + ': +' + r.cones + ' šišek' + (r.item ? ', +1 ' + (cfg.shop.find(it => it.id === r.item) || {}).name : '') + ' (+' + r.xp + ' XP)');
    progressEvent({ kind: 'feeder' });
    // úkol podle místa (jen když zrovna nic jiného neběží)
    const k = cfg.world.placeTasks && placeKind(f), t = k && taskFor(k, f.id, today());
    if (t && !modal.classList.contains('on')) { curTask = t; openM(taskHTML(t)); }
  }
  const pk = parkAt(pos.lat, pos.lon);
  if (pk && !P.parksDone.includes(pk)) {
    const cells = (P.parks[pk] ||= []), c = parkCell(pos.lat, pos.lon);
    if (!cells.includes(c)) cells.push(c);
    if (cells.length >= W.parkCells) { P.parksDone.push(pk); addCones(W.parkCones); gainXP(W.parkXp); toast('🌳 Prošel jsi park! +' + W.parkCones + ' šišek (+' + W.parkXp + ' XP)'); progressEvent({ kind: 'park' }); }
  }
  for (const t of state.treasures) {
    if (t.found || t.own || distM({ lat: pos.lat, lon: pos.lon }, { lat: t.la, lon: t.lo }) > W.treasureRadius) continue;
    t.found = Date.now(); addCones(W.treasureCones); gainXP(W.treasureXp);
    if (dog) dog.react('jump', 3500);
    openM(`<div class="encimg"><span style="font-size:72px">💎</span></div><p class="newsp">Našel jsi poklad!</p><h2>${esc(t.n)}</h2><p class="msg">+${W.treasureCones} šišek, +${W.treasureXp} XP</p><button class="btn primary full" data-act="close">Hurá!</button>`);
    progressEvent({ kind: 'treasure' });
  }
}
function saveTreasure() {
  const n = $('trN').value.trim();
  if (!n) { $('trErr').textContent = 'Napiš název pokladu.'; return; }
  if (pos.lat == null) { $('trErr').textContent = 'Nejdřív musí být známá tvoje poloha.'; return; }
  const t = cleanTreasure({ id: Date.now().toString(36), n, h: $('trH').value.trim(), la: pos.lat, lo: pos.lon, c: Date.now(), own: true });
  state.treasures.push(t); saveState(); shareTreasure(t.id);
}
let shareTr = null;
function shareTreasure(id) {
  shareTr = state.treasures.find(x => x.id === id); if (!shareTr) return;
  let qr = ''; try { qr = qrSVG(treasureLink(shareURL(), shareTr), 4); } catch (e) { qr = '<p class="msg">Na QR kód moc dlouhé – pošli odkaz.</p>'; }
  openM(`<h2>💎 ${esc(shareTr.n)}</h2><p class="msg small">Načti QR kód telefonem hledače, nebo pošli odkaz. Hledač uvidí jen kruh, kde hledat.</p><div class="qr">${qr}</div><button class="btn full" data-act="trLink">Sdílet odkaz</button><button class="btn full ghost" data-act="treasures">Zpět</button>`);
}
async function shareTreasureLink() {
  const url = treasureLink(shareURL(), shareTr);
  try { if (navigator.share) { await navigator.share({ title: shareTr.n, text: 'Poklad ve hře Stopař: ' + shareTr.n, url }); return; } } catch (e) { if (e.name === 'AbortError') return; }
  try { await navigator.clipboard.writeText(url); toast('Odkaz zkopírován.'); } catch (e) { prompt('Zkopíruj odkaz:', url); }
}
/* ---------- plánovač procházek ---------- */
function cleanWalk(w) {
  if (!w || typeof w !== 'object' || typeof w.p !== 'string' || !decodePolyline(w.p)) return null;
  return { p: w.p, n: String(w.n || 'Trasa').slice(0, 60), start: Array.isArray(w.start) ? w.start.map(Number).slice(0, 2) : null, end: Array.isArray(w.end) ? w.end.map(Number).slice(0, 2) : null, done: !!w.done, prog: num(w.prog), t0: num(w.t0),
    cps: (Array.isArray(w.cps) ? w.cps : []).slice(0, 20).map(c => ({ la: Number(c.la), lo: Number(c.lo), done: !!c.done })).filter(c => Number.isFinite(c.la)) };
}
const pl = { q: '', results: [], start: null, startName: '', len: 3000, mood: 'any', rewards: true, msg: '', tap: false, loops: [], sel: 0, graph: null, names: {}, mark: -1 };
const lineFeat = (pts, props) => ({ type: 'Feature', properties: props, geometry: { type: 'LineString', coordinates: pts.map(([a, b]) => [b, a]) } });
function planGeo() { return { type: 'FeatureCollection', features: pl.loops.map((L, i) => lineFeat(L.coords, { color: ROUTE_COLORS[i], sel: i === pl.sel ? 1 : 0 })) }; }
function walkGeo() { const p = state.walk && decodePolyline(state.walk.p); return { type: 'FeatureCollection', features: p ? [lineFeat(p, {})] : [] }; }
function redrawPlan() { planPending = true; flushMap(); drawPlanMarkers(); }
// Značka startu ještě před návrhem tras; fly = přesunout mapu na start
let startMk = null;
function showStart(fly) {
  if (startMk) { startMk.remove(); startMk = null; }
  if (!map) return;
  const st = pl.start || (pos.lat != null ? [pos.lat, pos.lon] : null);
  if (pl.start) { const el = document.createElement('div'); el.className = 'plflag'; el.textContent = '🚩'; startMk = new maplibregl.Marker({ element: el, anchor: 'bottom' }).setLngLat([pl.start[1], pl.start[0]]).addTo(map); }
  if (fly && st) { follow = false; lastTouch = Date.now(); map.flyTo({ center: [st[1], st[0]], zoom: Math.max(map.getZoom(), 14), duration: 900 }); }
}
function openPlanner() { openM(plannerHTML(pl, state.routes)); }
let lastSearch = 0; const searchCache = new Map();
// Hledání místa (Nominatim): jen po potvrzení, nejvýš 1 dotaz za sekundu, výsledky v paměti
async function plSearch() {
  const q = ($('plQ').value || '').trim(); pl.q = q; if (q.length < 2) return;
  if (Date.now() - lastSearch < 1100) { pl.msg = 'Chvilku počkej a zkus to znovu.'; openPlanner(); return; }
  lastSearch = Date.now();
  try {
    let res = searchCache.get(q);
    if (!res) {
      const r = await fetch('https://nominatim.openstreetmap.org/search?format=jsonv2&limit=5&countrycodes=cz&accept-language=cs&q=' + encodeURIComponent(q), { signal: AbortSignal.timeout ? AbortSignal.timeout(10000) : undefined });
      if (!r.ok) throw new Error('hledání ' + r.status);
      res = (await r.json()).map(x => ({ name: String(x.display_name || '').split(',').slice(0, 3).join(','), lat: Number(x.lat), lon: Number(x.lon) })).filter(x => Number.isFinite(x.lat));
      searchCache.set(q, res);
    }
    pl.results = res; pl.msg = res.length ? '' : 'Nic jsem nenašel.';
  } catch (e) { pl.msg = 'Hledání nejde (jsi online?).'; }
  openPlanner();
}
// Návrhy okruhů: graf pěšin kolem startu z Overpass, výpočet v telefonu
async function plGo() {
  pl.len = Number($('plLen').value) || pl.len; pl.rewards = $('plRew').checked;
  const st = pl.start || (pos.lat != null ? [pos.lat, pos.lon] : null);
  if (!st) { pl.msg = 'Nevím, kde začít – vyber místo nebo počkej na polohu.'; openPlanner(); return; }
  const target = pl.mood === 'kids' ? Math.min(pl.len, 2500) : pl.len;
  $('plMsg').textContent = 'Stahuji pěšiny a počítám trasy…';
  try {
    const key = st.map(v => v.toFixed(3)).join() + '|' + target;
    if (!pl.graph || pl.graph.key !== key) pl.graph = Object.assign(buildGraph(await overpassQuery(graphQuery(st[0], st[1], target * 0.45 + 300))), { key });
    ensureArea(st[0], st[1], target / 2);
    pl.loops = suggestLoops(pl.graph, st, target, L => moodScore(L));
    pl.sel = 0; pl.startPt = st;
  } catch (e) { pl.msg = 'Pěšiny se nepodařilo stáhnout. Zkus to za chvíli.'; openPlanner(); return; }
  if (!pl.loops.length) { pl.msg = 'Tady jsem okruh nenašel – zkus jinou délku nebo start.'; openPlanner(); return; }
  closeM(); showPlanPanel(); redrawPlan();
  const b = new maplibregl.LngLatBounds(); pl.loops[0].coords.forEach(([a, c]) => b.extend([c, a])); follow = false; lastTouch = Date.now(); map.fitBounds(b, { padding: 60, duration: 600 });
}
// Nálada: podíl úseků u vody / v lese (z biotopů, pokud jsou načtené), počet cílů u trasy
function moodScore(L) {
  if (pl.mood === 'any' || pl.mood === 'kids') return 0;
  const sample = L.coords.filter((_, i) => i % 4 === 0);
  if (pl.mood === 'targets') return Math.min(3, new Set(sample.flatMap(([a, b]) => targetsNear(a, b, 80).map(t => t.id))).size) * 0.8;
  const want = pl.mood === 'water' ? ['voda', 'mokrad'] : ['les'];
  return sample.filter(([a, b]) => want.includes(biotopeAt(a, b))).length / Math.max(1, sample.length) * 3;
}
const planKmh = () => Number(prefs.kmh) || cfg.planner.kmh;
function planProf() { const L = pl.loops[pl.sel]; if (!L) return null; if (!L.prof || !L.prof.ready) L.prof = profile(L.coords, elevationAt); return L.prof; }
function planMinutes() { const L = pl.loops[pl.sel], pr = planProf(); return L ? walkMinutes(L.len, pr ? pr.up : 0, pr ? pr.down : 0, planKmh()) : 0; }
function showPlanPanel() { const p = $('plpanel'); p.innerHTML = choiceHTML(pl.loops, pl.sel, { kmh: planKmh(), prof: planProf(), mark: pl.mark, mini: pl.mini }); p.hidden = false; }
function hidePlanPanel() { $('plpanel').hidden = true; pl.loops = []; pl.mark = -1; showMark(null); redrawPlan(); }
// Změna bodů trasy (posun, vložení, smazání, pořadí, okruh/do cíle) → přepočet po cestách
function planSet(ids, closed) {
  const L = pl.loops[pl.sel]; if (!L || !pl.graph) return false;
  const N = loopThrough(pl.graph, ids, closed == null ? L.closed : closed);
  if (!N) { toast('Tudy cesta nevede.'); redrawPlan(); return false; }
  pl.loops[pl.sel] = Object.assign(N, { score: L.score }); pl.mark = -1; showMark(null); showPlanPanel(); redrawPlan(); return true;
}
// Podržení prstu: na čáře vybrané trasy přidá průchozí bod, jinde ukáže „Co je zde?“
function onLongPress(lat, lon) {
  const L = pl.loops[pl.sel];
  if (L && pl.graph && !$('plpanel').hidden) {
    const v = viaIndex(L, [lat, lon]), mpp = 40075016.686 * Math.cos(lat * Math.PI / 180) / (512 * 2 ** map.getZoom());
    if (v.d / mpp < 36) {
      const id = nearestNode(pl.graph, [lat, lon]);
      if (id != null && !L.ids.includes(id)) { const ids = L.ids.slice(); ids.splice(v.at, 0, id); if (planSet(ids)) { toast('Přidán bod trasy – můžeš ho posunout.'); if (navigator.vibrate) navigator.vibrate(30); } }
      return;
    }
  }
  whatsHere(lat, lon);
}
// Ťuknutí do profilu ukáže místo na mapě
let markMk = null;
function showMark(p) {
  if (markMk) { markMk.remove(); markMk = null; }
  if (!p || !map) return;
  const el = document.createElement('div'); el.className = 'plmark'; markMk = new maplibregl.Marker({ element: el }).setLngLat([p[1], p[0]]).addTo(map);
}
// Posouvání trasy prstem: body P1 a P2 vybraného okruhu jdou přetáhnout, trasa se přepočítá
let planMarkers = [];
function drawPlanMarkers() {
  planMarkers.forEach(m => m.remove()); planMarkers = [];
  const L = pl.loops[pl.sel]; if (!L || !pl.graph) return;
  if (startMk) { startMk.remove(); startMk = null; }
  const n = L.ids.length;
  L.ids.forEach((id, k) => {
    const [la, lo] = pl.graph.nodes.get(id), el = document.createElement('div'), flag = !k || (!L.closed && k === n - 1);
    el.className = flag ? 'plflag' : 'plpt'; el.textContent = !k ? '🚩' : flag ? '🏁' : k;
    if (pl.names[id]) el.title = pl.names[id];
    const mk = new maplibregl.Marker({ element: el, draggable: true, anchor: flag ? 'bottom' : 'center' }).setLngLat([lo, la]).addTo(map);
    mk.on('dragend', () => {
      const p = mk.getLngLat(), ids = L.ids.slice(); ids[k] = nearestNode(pl.graph, [p.lat, p.lng]);
      if (planSet(ids) && !k) { pl.start = pl.graph.nodes.get(ids[0]); pl.startName = 'bod na mapě'; }
    });
    planMarkers.push(mk);
  });
}
// Vyrazit: trasa se zjednoduší, odměny se rozmístí rovnoměrně
function startWalk(pts, name) {
  const simple = simplify(pts, 6), len = pathLength(pts);
  const cps = pl.rewards ? checkpointsAlong(pts, Math.max(2, Math.min(8, Math.round(len / 1000)))).map(([la, lo]) => ({ la, lo, done: false })) : [];
  const L = pl.loops[pl.sel], open = L && L.coords === pts && !L.closed;
  state.walk = { p: encodePolyline(simple), n: name, start: pts[0], end: open ? pts[pts.length - 1] : null, cps, done: false, prog: 0, t0: Date.now() };
  planMarkers.forEach(m => m.remove()); planMarkers = []; $('plpanel').hidden = true; pl.loops = []; showMark(null);
  saveState(); redrawPlan(); refreshWalkMarkers();
  toast('Jdeme! ' + (cps.length ? 'Na trase je ' + cps.length + ' odměn.' : ''));
}
const walkMarkers = [];
function refreshWalkMarkers() {
  walkMarkers.splice(0).forEach(m => m.remove());
  if (!state.walk || !map) return;
  state.walk.cps.forEach(c => { if (c.done) return; const el = document.createElement('div'); el.className = 'cpmk'; el.innerHTML = '<span>🎁</span>'; walkMarkers.push(new maplibregl.Marker({ element: el, anchor: 'bottom' }).setLngLat([c.lo, c.la]).addTo(map)); });
}
function checkWalk() {
  const w = state.walk; if (!w || w.done || pos.lat == null || pos.src === 'last') return;
  const P = cfg.planner;
  // průběh: jen dopředu a bez skoků (u okruhu je konec u startu)
  const pr = progressAlong(walkPts(), [pos.lat, pos.lon]);
  if (pr.off < 40 && pr.along > w.prog && pr.along - w.prog < 400) w.prog = pr.along;
  for (const c of w.cps) {
    if (c.done || dist(pos.lat, pos.lon, c.la, c.lo) > P.cpRadius) continue;
    c.done = true; addCones(P.cpCones); gainXP(P.cpXp); toast('🎁 Odměna na trase: +' + P.cpCones + ' šišek'); refreshWalkMarkers();
  }
  const fin = w.end || w.start;
  if (w.cps.every(c => c.done) && fin && dist(pos.lat, pos.lon, fin[0], fin[1]) <= 40 && (w.cps.length || walkLeftStart || w.end)) {
    w.done = true; addCones(P.finishCones); gainXP(P.finishXp);
    if (dog) dog.react('jump', 3500);
    toast('🏁 Trasa „' + w.n + '“ hotová! +' + P.finishCones + ' šišek, +' + P.finishXp + ' XP'); progressEvent({ kind: 'route' });
  }
  if (w.start && dist(pos.lat, pos.lon, w.start[0], w.start[1]) > 150) walkLeftStart = true;
  saveState();
}
let walkLeftStart = false;
function saveRoute(pts, name) {
  const r = cleanRoute({ id: Date.now().toString(36), n: name, p: encodePolyline(simplify(pts, 6)), c: Date.now() });
  if (r) { state.routes.push(r); saveState(); toast('Trasa uložena mezi oblíbené.'); }
}
let shareRt = null;
function shareRoute(id) {
  shareRt = state.routes.find(r => r.id === id); if (!shareRt) return;
  const p = encodePolyline(simplify(decodePolyline(shareRt.p), 25)), url = shareURL() + '#trasa=' + toCode({ v: 1, n: shareRt.n, p });
  let qr = ''; try { qr = qrSVG(url, 4); } catch (e) { qr = '<p class="msg">Trasa je na QR kód moc dlouhá – pošli odkaz.</p>'; }
  shareRt.url = url;
  openM(`<h2>${esc(shareRt.n)}</h2><p class="msg small">${(shareRt.len / 1000).toFixed(1).replace('.', ',')} km · načti QR kód nebo pošli odkaz rodině.</p><div class="qr">${qr}</div><button class="btn full" data-act="rtLink">Sdílet odkaz</button><button class="btn full ghost" data-act="planner">Zpět</button>`);
}
async function shareRouteLink() {
  try { if (navigator.share) { await navigator.share({ title: shareRt.n, text: 'Trasa ve hře Stopař: ' + shareRt.n, url: shareRt.url }); return; } } catch (e) { if (e.name === 'AbortError') return; }
  try { await navigator.clipboard.writeText(shareRt.url); toast('Odkaz zkopírován.'); } catch (e) { prompt('Zkopíruj odkaz:', shareRt.url); }
}
/* ---------- offline mapy ---------- */
const off = { r: 0, prog: null, ctrl: null, areas: [] };
async function openOffline() {
  off.areas = cleanAreas(await store.get('offline').catch(() => null));
  off.r = off.r || cfg.offline.defaultRadius;
  renderOffline();
}
function renderOffline() {
  const est = pos.lat != null ? estimate(pos.lat, pos.lon, off.r, cfg.osm.chunkDeg) : null;
  openM(offlineHTML(cfg, off.areas, off.r, est, off.prog));
}
let offT = 0;
const offShow = (p, text) => { off.prog = { p: Math.round(p), text }; if (Date.now() - offT > 300) { offT = Date.now(); if ($('mbox').querySelector('[data-act=offStop]')) renderOffline(); } };
async function offlineGo() {
  if (pos.lat == null || off.ctrl) return;
  const lat = pos.lat, lon = pos.lon, r = off.r, ctrl = new AbortController(); off.ctrl = ctrl;
  try {
    offShow(0, 'Připravuji…'); renderOffline();
    const tj = await (await fetch(cfg.map.vectorUrl, { signal: ctrl.signal })).json(), tpl = (tj.tiles || [])[0] || '';
    const urls = planUrls(tpl, cfg.map.demUrl, cfg.map.glyphsUrl, lat, lon, r);
    const fail = await offlineDownload(urls, (d, t) => offShow(d / t * 60, `Mapa a výškopis: ${d} / ${t}`), ctrl.signal);
    if (ctrl.signal.aborted) throw new Error('stop');
    // biotopy: stejná fronta jako při hře (servery Overpass postupně)
    ensureArea(lat, lon, r);
    let last = -1, since = Date.now(), partial = false;
    for (;;) {
      const p = chunkProgress(lat, lon, r);
      offShow(60 + p.loaded / Math.max(1, p.total) * 35, `Biotopy: ${p.loaded} / ${p.total}`);
      if (p.loaded >= p.total || ctrl.signal.aborted) break;
      if (p.loaded !== last) { last = p.loaded; since = Date.now(); } else if (Date.now() - since > 60000) { partial = true; break; } // servery biotopů neodpovídají

      await new Promise(res => setTimeout(res, 1500)); ensureArea(lat, lon, r);
    }
    if (ctrl.signal.aborted) throw new Error('stop');
    offShow(97, 'Turistické trasy…');
    const dLat = r / 111320, dLon = r / (111320 * Math.cos(lat * Math.PI / 180));
    await loadTrails(tilesFor([lat - dLat, lon - dLon, lat + dLat, lon + dLon], 200), overpassQuery, cfg.osm.cacheDays, () => { kctPending = true; flushMap(); });
    const est = estimate(lat, lon, r, cfg.osm.chunkDeg);
    off.areas.push({ id: Date.now().toString(36), n: 'Okolí ' + new Date().toLocaleDateString('cs-CZ'), lat, lon, r, d: Date.now(), mb: est.mb, tpl });
    await store.set('offline', off.areas).catch(() => {});
    off.prog = null; off.ctrl = null; renderOffline();
    toast(partial ? 'Mapa stažena, biotopy jen zčásti (servery neodpovídají) – zkus to později znovu.' : fail ? `Staženo, ${fail} dlaždic se nepovedlo (zkus znovu).` : 'Okolí je staženo pro offline.');
  } catch (e) {
    off.prog = null; off.ctrl = null; renderOffline();
    toast(ctrl.signal.aborted ? 'Stahování zastaveno (co je staženo, zůstává).' : 'Stahování se nepovedlo – jsi online?');
  }
}
async function offlineDel(id) {
  const a = off.areas.find(x => x.id === id); if (!a) return;
  await removeUrls(planUrls(a.tpl, cfg.map.demUrl, '', a.lat, a.lon, a.r)).catch(() => {});
  off.areas = off.areas.filter(x => x.id !== id); await store.set('offline', off.areas).catch(() => {});
  renderOffline(); toast('Oblast smazána.');
}
/* ---------- karta výletu a rodinná výprava ---------- */
async function shareTrip() {
  const d0 = new Date(); d0.setHours(0, 0, 0, 0);
  const todays = state.animals.filter(a => a.date >= d0.getTime() && SP[a.sp]);
  const newSp = Object.values(state.caught).filter(c => c.best && c.best.date >= d0.getTime() && c.count === 1).length;
  const blob = await tripCardBlob({ date: new Date().toLocaleDateString('cs-CZ'), km: ((state.walkDays[dayStr(new Date())] || 0) / 1000).toFixed(1).replace('.', ','),
    catches: todays.length, newSp, stamps: Object.values(state.stamps).filter(s => s.d >= d0.getTime()).length,
    shape: state.walk ? decodePolyline(state.walk.p) : null, animals: todays.map(a => ({ url: birdURL(SP[a.sp], a.stage), name: a.nick || SP[a.sp].name })) });
  if (!blob) { toast('Kartu se nepodařilo vytvořit.'); return; }
  const file = new File([blob], 'stopar-vylet.png', { type: 'image/png' });
  try { if (navigator.canShare && navigator.canShare({ files: [file] })) { await navigator.share({ files: [file], title: 'Můj výlet' }); return; } } catch (e) { if (e.name === 'AbortError') return; }
  const u = URL.createObjectURL(blob), l = document.createElement('a'); l.href = u; l.download = file.name; document.body.appendChild(l); l.click(); l.remove(); setTimeout(() => URL.revokeObjectURL(u), 5000);
  toast('Karta výletu uložena do stažených souborů.');
}
// Rodinná výprava: můj týden (skutečná chůze a nové druhy za týden) + kódy ostatních
function famMine() {
  const wk = weekNumber(), mon = new Date(Date.UTC(2026, 0, 5) + wk * 7 * 86400000);
  const meters = Object.entries(state.walkDays).filter(([k]) => new Date(k) >= mon).reduce((a, [, v]) => a + v, 0);
  const species = new Set(state.animals.filter(a => a.date >= mon.getTime()).map(a => a.sp)).size;
  return { week: wk, meters, species, code: weekCode(wk, meters, species) };
}
function openFamily() { const wk = weekNumber(); if (state.fam.week !== wk) state.fam = { week: wk, codes: [] }; openM(familyHTML(famMine(), state.fam.codes, wk)); }
async function shareFam() {
  const m = famMine(), text = `Stopař – rodinná výprava: ${(m.meters / 1000).toFixed(1).replace('.', ',')} km, ${m.species} druhů. Můj kód: ${m.code}`;
  try { if (navigator.share) { await navigator.share({ text }); return; } } catch (e) { if (e.name === 'AbortError') return; }
  try { await navigator.clipboard.writeText(text); toast('Zkopírováno.'); } catch (e) { prompt('Zkopíruj:', text); }
}
/* ---------- minihry ---------- */
const caughtIds = () => Object.keys(state.caught).filter(id => SP[id] && state.caught[id].count > 0);
function openGames() { openContests(); } // minihry jsou součástí Závodů
let mgImg = '';
async function playMini(id, level, done) {
  const p = PUZZLES.find(x => x.id === id), mine = caughtIds(); if (!p || (!done && mine.length < p.need)) return;
  if (stopGame) { stopGame(); stopGame = null; }
  const size = SIZES[id][['easy', 'mid', 'hard'].indexOf(level)] || SIZES[id][0];
  const win = (moves, secs, score) => {
    stopGame = null;
    if (done) { setTimeout(() => done(moves, secs, score), 700); return; }
    const day = dayStr(new Date()), g = state.games; if (g.day !== day) { g.day = day; g.cones = 0; }
    const r = id === 'who' && score != null && score < 3 ? 0 : gameReward(g, cfg, level, day), key = id + '_' + level, rec = !g.best[key] || moves < g.best[key];
    g.cones += r; g.plays++; if (rec) g.best[key] = moves; addCones(r); saveState();
    const box = document.createElement('div'); box.className = 'mgwin';
    box.innerHTML = `<p class="newsp">Hotovo!</p><p class="msg">${score != null ? 'Správně ' + score + ' z 5' : moves + ' tahů'} · ${secs} s${rec && score == null ? ' · nový rekord!' : ''}<br>${r ? '+' + r + ' šišek' : score != null && score < 3 ? 'Na odměnu potřebuješ aspoň 3 správně.' : 'Dnešní odměny z miniher jsou vybrané – zítra zase.'}</p><button class="btn primary full" data-act="mgPlay" data-g="${id}" data-l="${level}">Hrát znovu</button><button class="btn full ghost" data-act="games">Minihry</button>`;
    $('mgInfo').replaceWith(box);
    if (dog) dog.react('jump', 2500);
  };
  openM(boardHTML(p, level));
  const el = $('mgBoard'), info = $('mgInfo');
  if (id === 'who') {
    // stopy přednostně u druhů ze sbírky, možnosti ze stejné skupiny
    const withSigns = cfg.species.filter(s => s.active && hasSigns(s) && !speciesLocked(s)), pool = withSigns.filter(s => mine.includes(s.id)).concat(withSigns.filter(s => !mine.includes(s.id))).slice(0, 30).sort(() => Math.random() - .5);
    if (pool.length < 3) { $('mgInfo').textContent = 'Zatím málo zvířat se stopami.'; return; }
    const rounds = pool.slice(0, 5).map(sp => { const z = trackQuiz(sp, withSigns); return { sign: z.sign, correct: z.correct, opts: z.opts.slice(0, size).map(o => ({ name: SP[o].name, url: birdURL(SP[o]) })) }; });
    rounds.forEach(q => { if (q.correct >= q.opts.length) q.correct = 0; });
    stopGame = playWho(el, rounds, info, win);
    return;
  }
  if (id === 'pexeso') {
    // karty: přednostně ze sbírky, doplní se dalšími odemčenými druhy
    const pool = mine.sort(() => Math.random() - 0.5), extra = cfg.species.filter(s => !pool.includes(s.id) && !speciesLocked(s)).map(s => s.id).sort(() => Math.random() - 0.5);
    mgImg = '';
    stopGame = playPexeso(el, pexesoDeck(pool.concat(extra), size), sid => birdURL(SP[sid]), sid => SP[sid].name, info, win);
    return;
  }
  el.innerHTML = '<p class="msg small">Připravuji obrázek…</p>';
  const sp = SP[mine[Math.floor(Math.random() * mine.length)]];
  mgImg = await squareImage(birdURL(sp));
  if (!el.isConnected) return; // okno mezitím zavřené
  stopGame = id === 'rows' ? playRows(el, size, mgImg, info, win) : id === 'rings' ? playRings(el, size, mgImg, info, win) : playPuzzle(el, id, size, mgImg, info, win);
}
/* ---------- správa dat ---------- */
const meter = createMeter();
let nmOpen = false, nmRate = 0, nmT = 0, nmDay = null, nmDirty = false;
async function initDataMon() {
  nmDay = cleanDay(await store.get('netDay').catch(() => null));
  if (navigator.serviceWorker) navigator.serviceWorker.addEventListener('message', e => {
    const d = e.data || {}; if (d.type !== 'net') return;
    nmDay = addDay(nmDay, dayStr(new Date()), ingest(meter, d.stats)); nmDirty = true;
  });
  setInterval(() => {
    nmRate = tickMeter(meter);
    const d = $('dog'); if (d) d.classList.toggle('busy', nmRate > 0 || queueSize() > 0 || plBusy || !!off.ctrl);
    drawNetmon();
    if (modal.classList.contains('on') && $('mbox').querySelector('[data-act=dataClearOsm]') && !$('mbox').querySelector('[data-armed]')) openDataMgr(true);
  }, 1000);
  setInterval(() => { if (nmDirty && !wiping) { nmDirty = false; store.set('netDay', nmDay).catch(() => {}); } }, 15000);
  const el = $('netmon');
  el.addEventListener('click', e => { if (e.target.closest('[data-act=dataMgr]')) { openDataMgr(); return; } nmOpen = !nmOpen; nmT = Date.now(); drawNetmon(); });
}
// v rohu jen když se něco stahuje (po 20 s klidu zmizí); rozbalený se po 12 s sám sbalí
function drawNetmon() {
  const el = $('netmon'); if (!el) return;
  if (nmOpen && Date.now() - nmT > 12000) nmOpen = false;
  const show = cfg.general.dataMonitor && (nmOpen || meter.quiet < 20);
  el.hidden = !show; if (!show) return;
  el.classList.toggle('open', nmOpen);
  el.innerHTML = chipHTML(meter, nmRate, nmOpen);
}
async function openDataMgr(refresh) {
  const st = navigator.storage && navigator.storage.estimate ? await navigator.storage.estimate().catch(() => null) : null;
  const y = mbox.scrollTop;
  if (refresh && (!modal.classList.contains('on') || !$('mbox').querySelector('[data-act=dataClearOsm]'))) return;
  openM(dataHTML(meter, nmDay && nmDay.day === dayStr(new Date()) ? nmDay : null, st, nmRate));
  if (refresh) mbox.scrollTop = y;
}
const buzzed = new Set();
function removeMarker(id) { const m = markers.get(id); if (m) { m.mk.remove(); markers.delete(id); } }
function clearMarkers() { [...markers.keys()].forEach(removeMarker); }

function hudBio() {
  const b = biotopeAt(pos.lat, pos.lon);
  const hb = $('hbio');
  const g = b === null ? biotopeGuess(pos.lat, pos.lon) : null;
  let t = b === null ? (g ? (BIO[g] ? BIO[g].name : g) + ' (z mapy)' : 'načítám…') : (BIO[b] ? BIO[b].name : b);
  const alt = elevationAt(pos.lat, pos.lon);
  if (Number.isFinite(alt)) t += ' · ' + alt + ' m';
  if (isNight()) t += ' · noc'; else if (isTwilight()) t += ' · šero';
  const wc = cfg.world.weather ? weatherCond(weather) : '';
  if (wc) t += ' · ' + WEATHER_ICON[wc] + (weather.temp != null ? ' ' + weather.temp + '°' : '');
  if (hidden) t += ' · skrýš';
  const pa = protectedAt(pos.lat, pos.lon);
  if (pa) t += ' · 🛡️';
  hb.classList.toggle('link', !!pa);
  const err = errorAt(pos.lat, pos.lon);
  if (err) { t += ' · ⚠️'; hb.classList.add('bad'); hb.title = err; } else { hb.classList.remove('bad'); hb.title = ''; }
  hb.textContent = t;
}
// V simulaci se ukazují simulované km; do skutečné ušlé vzdálenosti se nepočítají
function hudDist() { const m = cfg.general.simulation ? state.simDist : (state.walkDays[dayStr(new Date())] || 0); $('hdist').textContent = 'dnes ' + (m / 1000).toFixed(1).replace('.', ',') + ' km' + (cfg.general.simulation ? ' (sim.)' : ''); }
function hudGPS() {
  const g = $('hgps');
  if (cfg.general.simulation) { g.textContent = 'Simulace'; g.classList.remove('bad'); return; }
  if (pos.src !== 'gps') { g.textContent = 'GPS –'; g.classList.add('bad'); return; }
  g.textContent = '±' + Math.round(pos.acc) + ' m';
  g.classList.toggle('bad', pos.acc > cfg.gps.maxAccuracy);
}

/* ---------- UI ---------- */
let tT = 0;
// Zprávy jdou po sobě (úkol, odznak a úroveň můžou přijít naráz)
const toastQ = [];
function toast(m) { toastQ.push(m); if (toastQ.length === 1) showToast(); }
function showToast() {
  const el = $('toast'); el.textContent = toastQ[0]; el.classList.add('on');
  clearTimeout(tT); tT = setTimeout(() => { el.classList.remove('on'); toastQ.shift(); if (toastQ.length) setTimeout(showToast, 250); }, 2600);
}
function banner(m, btn) {
  const b = $('banner');
  if (!m) { b.hidden = true; return; }
  b.innerHTML = esc(m) + (btn ? `<br><button class="btn sm" id="bannerBtn">${esc(btn.label)}</button>` : '');
  b.hidden = false;
  if (btn) $('bannerBtn').onclick = btn.fn;
}
const modal = $('modal'), mbox = $('mbox');
function openM(h) { mbox.innerHTML = h; modal.classList.add('on'); mbox.scrollTop = 0; }
function closeM() { modal.classList.remove('on'); enc = null; if (stopGame) { stopGame(); stopGame = null; } }
modal.addEventListener('pointerdown', e => { if (e.target === modal && !locked && (!enc || enc.step !== 'photo')) closeM(); });

function show(v) {
  document.body.classList.toggle('on-map', v === 'mapv'); curView = v; actNow = null; setTimeout(updateAct, 0);
  if (v === 'mapv') document.body.classList.remove('parent');
  if (v === 'mapv') setUi(false);
  if (v === 'jav') renderJa();
  if (v === 'farmv') renderFarmView(); else if (farm3) { farm3.destroy(); farm3 = null; }
  document.querySelectorAll('.view').forEach(x => x.classList.toggle('on', x.id === v));
  document.querySelectorAll('nav button').forEach(b => b.classList.toggle('on', b.dataset.v === v));
  if (v === 'atlasv') renderAtlas();
  if (v === 'sbirkav') renderCollection();
  if (v === 'mapv' && map) setTimeout(() => map.resize(), 50);
}

let logoTaps = 0, logoT = 0;
// Modální okno funguje už před souhlasem (mapa a ostatní ovládání až po něm)
mbox.addEventListener('click', e => onModalClick(e));
mbox.addEventListener('change', e => onModalChange(e));
mbox.addEventListener('input', e => {
  if (e.target.id === 'cYear') onConsentInput();
  else if (e.target.id === 'plLen') { pl.len = Number(e.target.value); $('plLenV').textContent = (pl.len / 1000).toFixed(1).replace('.', ',') + ' km'; }
  else if (e.target.id === 'nightDim') { prefs.dim = Number(e.target.value); $('nightDimV').textContent = prefs.dim + ' %'; savePrefs(); applyNight(); }
  else if (e.target.dataset.pt) { pl.names[e.target.dataset.pt] = e.target.value.slice(0, 30); drawPlanMarkers(); }
  else onChecklistInput(e.target);
});
function bindUI() {
  document.querySelectorAll('nav button[data-v]').forEach(b => b.addEventListener('click', () => show(b.dataset.v)));
  fillIcons(); document.body.classList.add('on-map');
  $('dialBtn').onclick = () => setUi(!document.body.classList.contains('ui-open'));
  $('tools').addEventListener('click', e => {
    const t = e.target.closest('[data-tool]'); if (!t) return;
    const k = t.dataset.tool; setUi(false);
    if (k === 'data') openDataMgr(); else if (k === 'offline') openOffline(); else if (k === 'measure') toast('Polož dva prsty na mapu a chvíli je drž – ukáže se vzdálenost.');
  });
  bindAct();
  $('cards').addEventListener('click', onCardClick);
  $('jav').addEventListener('click', onModalClick);
  $('sbirkav').addEventListener('click', e => { if (e.target.closest('[data-act=farm]')) openFarm(); });
  $('farmv').addEventListener('click', onFarmClick);
  $('jav').addEventListener('change', e => { onModalChange(e); });
  $('centerBtn').onclick = () => { setUi(false); follow = true; document.body.classList.remove('away'); if (pos.lat != null && map) map.easeTo({ center: [pos.lon, pos.lat], zoom: Math.max(map.getZoom(), cfg.map.startZoom), duration: 400 }); };
  $('compassBtn').onclick = toggleCompass;
  $('lookBtn').onclick = () => { setUi(false); openLook(); };
  $('menuBtn').onclick = () => { if (kidMode() && !document.body.classList.contains('parent')) parentGate(); else show('jav'); };
  document.querySelectorAll('nav button[data-kid]').forEach(b => b.addEventListener('click', () => { if (b.dataset.kid === 'games') openGames(); }));
  $('lvlBtn').onclick = openProfile; hudLevel();
  $('coneBtn').onclick = openShop; hudCones();
  $('hbio').addEventListener('click', () => { const err = errorAt(pos.lat, pos.lon); if (err && !protectedAt(pos.lat, pos.lon)) toast('⚠️ Mapová data okolí se teď nedaří stáhnout (' + err + '). Zvířata se zatím ukazují ze všech biotopů, stahování se samo zkouší znovu.'); else openProtected(); });
  $('plpanel').addEventListener('click', onModalClick);
  $('clFab').addEventListener('click', () => openChecklist(true));
  $('plpanel').addEventListener('change', e => { if (e.target.id === 'plKmhIn') { const v = Number(e.target.value); if (v >= 1 && v <= 8) { prefs.kmh = v; savePrefs(); } showPlanPanel(); } });
  refreshWalkMarkers();
  $('logo').addEventListener('click', () => {
    clearTimeout(logoT); logoTaps++;
    logoT = setTimeout(() => { logoTaps = 0; }, 1500);
    if (logoTaps >= 5) { logoTaps = 0; askAdmin(); }
  });
  $('atlasv').addEventListener('click', e => {
    const mc = e.target.closest('[data-myth]'); if (mc) { const t = MY(mc.dataset.myth); if (t) openM(`<div class="encimg master"><img src="${mythURL(t)}" alt=""></div><h2>${esc(t.name)}</h2><div class="fact">${esc(t.fact)}</div><button class="btn full" data-act="close">Zavřít</button>`); return; }
    const f = e.target.closest('[data-flt]'); if (f) { toggleFilter(f.dataset.flt, f.dataset.v); return; }
    if (e.target.closest('.atabs [data-act]')) { onModalClick(e); return; }
    const c = e.target.closest('[data-sp]'); if (c) openDetail(c.dataset.sp);
  });
  $('sbirkav').addEventListener('click', e => {
    const t = e.target.closest('[data-enc]'); if (t) { colView.enc = t.dataset.enc; renderCollection(); return; }
    const c = e.target.closest('[data-animal]'); if (c) openAnimal(c.dataset.animal);
  });
  $('sbirkav').addEventListener('change', e => { if (e.target.matches('[data-sort]')) { colView.sort = e.target.value; renderCollection(); } });
  window.addEventListener('beforeinstallprompt', e => { e.preventDefault(); installEvt = e; });
  window.addEventListener('hashchange', () => { if (location.hash === '#admin') askAdmin(); else if (!dogDemo()) checkEventLink(); });
  document.addEventListener('visibilitychange', () => { if (document.hidden) saveState(); else tick(); });
}

/* ---------- setkání ---------- */
function tapBird(id) {
  const b = birds.find(x => x.id === id);
  if (!b) return;
  const d = dist(pos.lat, pos.lon, b.lat, b.lon);
  if (muted) { toast('Zastav se – zvířata se ukážou, až budeš stát.'); return; }
  if (kidMode() && (pos.speed || 0) > cfg.map.stillSpeed) { toast('Nejdřív zastav, pak chytej.'); return; }
  if (!b.myth && speciesLocked(SP[b.sp])) { toast('Neznámé zvíře. Poznáš ho od úrovně ' + levelNeeded(cfg.game.rarityLevel, String(SP[b.sp].rarity)) + '.'); return; }
  if (d > catchRadius()) { toast('Je to ' + Math.round(d) + ' m. Dojdi blíž (do ' + catchRadius() + ' m).'); if (cfg.general.simulation) simTarget = { lat: b.lat, lon: b.lon }; return; }
  if (b.myth) { mythEncounter(b); return; }
  if (b.track && !tracked.has(b.id)) { enc = { b, sp: SP[b.sp], step: 'track', z: trackQuiz(SP[b.sp], cfg.species) }; openM(trackHTML(enc.z, SP)); return; }
  enc = { b, sp: SP[b.sp], step: 'food', tries: 0, shots: 0, msg: 'Čím ho nalákáš?' };
  encStage();
  renderEnc();
}
function chips(sp) {
  const bio = Object.keys(parseMap(sp.bio));
  return `<div class="chips"><span class="chip r${esc(sp.rarity)}">${esc(RAR[sp.rarity]?.name || sp.rarity)}</span>${bio.map(b => `<span class="chip">${esc(BIO[b]?.name || b)}</span>`).join('')}${sp.night ? '<span class="chip">noční</span>' : ''}</div>`;
}
function spStats(sp) {
  const n = parseNums(sp.stats);
  return cfg.stats.map((_, i) => n[i] ?? 50);
}
function statsHTML(st) {
  const max = cfg.catch.maxStat;
  return '<div class="stats">' + cfg.stats.map((s, i) => `<div class="srow"><span>${esc(s.name)}</span><div class="sb"><div style="width:${Math.min(100, (st[i] ?? 0) / max * 100)}%"></div></div><b>${st[i] ?? 0}</b></div>`).join('') + '</div>';
}
// Stádium potkaného zvířete: z id spawnu (všichni vidí stejné) a ročního období; kukla nejí → rovnou fotka
function encStage() {
  const id = String(enc.b.id || ''), r = [...id].reduce((h, ch) => (h * 31 + ch.charCodeAt(0)) >>> 0, 7) / 4294967296;
  enc.stage = wildStage(cfg, enc.sp.group, r, new Date().getMonth() + 1);
  if (isPupa(cfg, enc.sp, enc.stage)) { enc.step = 'photo'; enc.msg = 'Kukla nejí – opatrně ji vyfoť, ať ji nevyrušíš.'; }
}
function gameFor(sp) { return cfg.rarityGame.find(r => String(r.id) === String(sp.rarity)) || { zone: .25, speed: 3 }; }

function renderEnc() {
  const sp = enc.sp;
  if (enc.step === 'food') {
    openM(`<div class="encimg${enc.b.variant ? ' var-' + esc(enc.b.variant) : ''}">${birdImg(sp, '', enc.stage)}</div><h2>${esc(sp.name)}</h2><div class="sub">${esc(sp.lat)} · ${esc(stageNames(cfg, sp.group)[enc.stage] || '')}${enc.b.variant ? ' · vzácná forma: ' + esc(variantName(enc.b.variant)) : ''}</div>${chips(sp)}<p class="msg">${esc(enc.msg)}</p>
    <div class="foods">${cfg.foods.map(f => `<button data-f="${esc(f.id)}">${foodIcon(f.id)}<span>${esc(f.name)}</span></button>`).join('')}</div>
    ${enc.lure ? '' : invOf(cfg, state, 'lure').map(it => `<button class="btn full" data-act="lure" data-item="${esc(it.id)}">Použít ${esc(it.icon)} ${esc(it.name)} (${state.inv[it.id]})</button>`).join('')}<button class="btn ghost full" data-act="close">Nechat být</button>`);
  } else if (enc.step === 'photo') {
    const g = gameFor(sp); enc.zone = Math.min(.95, Number(g.zone) * (enc.lens ? Number(cfg.game.lensMult) || 1 : 1) * (hidden ? Number(cfg.world.hideZone) || 1 : 1)); enc.speed = Number(g.speed);
    openM(`<h2>${esc(sp.name)}</h2><div class="frame"><div id="fb" style="width:100%;height:100%">${birdImg(sp, '', enc.stage)}</div><div class="cross"></div></div>
    <div class="bar"><div class="zone" style="left:${(.5 - enc.zone / 2) * 100}%;width:${enc.zone * 100}%"></div><div class="mark" id="mk"></div></div>
    <p class="msg">${esc(enc.msg)}</p><button class="btn primary full" data-act="shoot">Cvak (zbývá ${cfg.catch.shots - enc.shots})</button>${enc.lens || enc.shots ? '' : invOf(cfg, state, 'lens').map(it => `<button class="btn full" data-act="lens" data-item="${esc(it.id)}">Nasadit ${esc(it.icon)} ${esc(it.name)} (${state.inv[it.id]})</button>`).join('')}`);
    enc.t0 = performance.now(); photoAnim();
  } else if (enc.step === 'done') {
    const c = state.caught[sp.id];
    openM(`<div class="encimg">${birdImg(sp, '', enc.stage)}</div>${enc.isNew ? '<p class="newsp">Nový druh v atlasu!</p>' : ''}<h2>${esc(sp.name)}</h2><div class="sub">${esc(sp.lat)}</div>
    <p class="msg">Ostrost fotky ${enc.q} %. Úlovek č. ${c.count}.</p>${statsHTML(enc.stats)}
    <p class="msg small">${addedMsg(sp)}</p>
    ${enc.uid && !enc.quizDone && makeQuiz(sp, cfg.species) ? `<button class="btn full" data-act="quizRead">Kvíz o tomto zvířeti (+bonus)</button>` : ''}
    <button class="btn primary full" data-act="close">Pokračovat</button><button class="btn full" data-act="atlas">Do atlasu</button>`);
  } else if (enc.step === 'fled') {
    openM(`<div class="encimg" style="opacity:.4">${birdImg(sp, '', enc.stage)}</div><h2>${esc(sp.name)}</h2><p class="msg">${esc(enc.msg)}</p><button class="btn primary full" data-act="close">Pokračovat</button>`);
  }
}
// Kolik jedinců druhu smí hráč mít (roste s úrovní hráče, strop v adminu)
function levelCap() { const G = cfg.game; return Math.max(1, Math.min(G.maxCap, G.maxBase + G.maxPerLevel * (playerLevel() - 1))); }
function maxPerSpecies(sp) { if (cfg.farm.enabled && !cfg.farm.capacityCheck) return 999; if (!cfg.farm.enabled || !sp) return levelCap(); return encCap(ensureFarm(), enclosureOf(cfg, sp.group).id, cfg.farm.maxCap); }
// Farma vznikne při prvním použití; příbytky tak velké, aby se vešlo vše, co už hráč má
function ensureFarm() {
  if (!state.farm) {
    const most = Math.max(levelCap(), ...Object.values(state.animals.reduce((m, a) => (m[a.sp] = (m[a.sp] || 0) + 1, m), {})));
    state.farm = newFarm(cfg.enclosures.map(e => e.id), most);
  }
  for (const e of cfg.enclosures) if (!(('enc_' + e.id) in state.farm.lv)) state.farm.lv['enc_' + e.id] = 0;
  if (cfg.general.infiniteRes) { // test z adminu: před každou akcí doplnit suroviny a hned dokončit stavbu (jinak blokuje další)
    const f = state.farm; if (f.build) { f.lv[f.build.id] = (f.lv[f.build.id] || 0) + 1; f.build = null; }
    for (const k of Object.keys(f.res)) f.res[k] = 99999; state.cones = Math.max(state.cones, 99999);
  }
  return state.farm;
}
// Chov: druh s aspoň 2 jedinci v postaveném příbytku úrovně 2+ → šance na mládě (průměr rodičů, stádium 0)
function breedOne(f, rnd = Math.random) {
  const by = {};
  for (const a of state.animals) { const sp = SP[a.sp]; if (!sp) continue; const e = enclosureOf(cfg, sp.group); if ((f.lv['enc_' + e.id] || 0) >= 2) (by[a.sp] ||= []).push(a); }
  const pairs = Object.values(by).filter(l => l.length >= 2);
  if (!pairs.length || rnd() > Number(cfg.farm.breedChance ?? 0.15)) return null;
  const l = pairs[Math.floor(rnd() * pairs.length)], [p1, p2] = l;
  const young = animalFrom(p1.sp, p1.stats.map((v, i) => Math.round((v + (p2.stats[i] || v)) / 2)), Math.round((p1.q + p2.q) / 2), p1.bio);
  state.animals.push(young); return young;
}
function farmTick(quiet) {
  if (!cfg.farm.enabled) return;
  const f = ensureFarm(), got = farmAdvance(f, Date.now(), state.inv, farmBonus(f, farmTerrain()));
  if (cfg.general.infiniteRes) ensureFarm(); // výroba ořízne suroviny na strop skladu
  const gd = today(), n = Object.values(f.guests).reduce((a, g) => a + g.length, 0);
  if (f.breedDay !== gd) { f.breedDay = gd; const born = breedOne(f); if (born && !quiet) toast('🐣 Na farmě se narodilo mládě: ' + SP[born.sp].name + '!'); }
  if (n && f.guestDay !== gd) { f.guestDay = gd; f.res.seeds += n * 2; if (!quiet) toast('🐾 Hosté na farmě přinesli ' + n * 2 + ' semínek.'); }
  const tc = trainDelivery(f, gd); if (tc) { state.cones += tc; hudCones(); if (dog) dog.react('cone', 2500); toast('🚂 Nákladní vlak přivezl na nádraží ' + tc + ' šišky.'); }
  const pick = autoPick(f, BUILDINGS.map(b => b.id)); if (pick) startBuild(f, pick, state.cones);
  if (got.built && !quiet) { const b = BUILDINGS.find(x => x.id === got.built), e = cfg.enclosures.find(x => 'enc_' + x.id === got.built); toast('🏡 Farma: hotovo – ' + (b ? b.name : e ? e.name : got.built) + ' úr. ' + f.lv[got.built]); }
  if (modal.classList.contains('on') && $('mbox').querySelector('.fres')) openFarm(true);
  if ($('farmv').classList.contains('on')) refreshFarmView();
}
/* ---------- 3D farma (hlavní záložka) ---------- */
let farm3 = null, farmSel = '', farmSide = false, farmMove = '';
// Přesouvání: v panelu budovy „Přesunout“ → ťuk na políčko (obsazené = výměna)
let farmT = null, farmPlace = '', farmTileSel = null, farmRoads = false;
const farmCam = {}; // pohled kamery přežije překreslení farmy
let farmGhost = false, farmNet = -1; // náhled trati po vygenerování; počet aut (−1 = zatím neznámo)
const farmEnv = () => ({ cond: cfg.world.weather ? weatherCond(weather) : '', sym: (weather && weather.sym) || '' });
const EMO = [[/liš/i, '🦊'], [/zaj|králí/i, '🐇'], [/srn|jele|daněk/i, '🦌'], [/jež/i, '🦔'], [/veve/i, '🐿️'], [/kachn|kačen/i, '🦆'], [/sova|sýc|výr|puštík/i, '🦉'], [/labu/i, '🦢'], [/žab|ropuch|skokan|rosnič/i, '🐸'], [/užov|zmij|had/i, '🐍'], [/ještěr/i, '🦎'], [/motýl|babočk|otakár|bělásek/i, '🦋'], [/slunéčk|brouk|chrob|roháč/i, '🐞'], [/včel|čmel/i, '🐝'], [/myš|hraboš|plch/i, '🐭'], [/netop|vrápen/i, '🦇'], [/bobr/i, '🦫'], [/divoč|prase/i, '🐗'], [/hlemýžď|plž|šnek/i, '🐌'], [/kapr|pstruh|štik|okoun|ryb/i, '🐟']];
const animalEmoji = sp => (EMO.find(([re]) => re.test(sp.name)) || [0, sp.group === 'Savci' ? '🦔' : groupIcon(sp.group)])[1];
const farmEncAnimals = () => Object.fromEntries(cfg.enclosures.map(e => ['enc_' + e.id, state.animals.filter(a => SP[a.sp] && enclosureOf(cfg, SP[a.sp].group).id === e.id).slice(-4).map(a => animalEmoji(SP[a.sp]))]));
const rwTxt = rw => Object.entries(rw).map(([k, v]) => ({ cones: coneIcon, wood: '🪵', stone: '🪨', seeds: '🌱' }[k] || k) + ' ' + v).join(' ');
// Návštěva rodinné farmy z odkazu (jen prohlížení)
async function openVisit(code) {
  const o = fromCode(code), vf = o && o.l && cleanFarm({ lv: o.l, pos: o.p, tiles: o.t, roads: o.r, decor: o.d, seed: o.s, biome: o.b, rail: o.w === 1, t: Date.now() }, cfg.enclosures.map(e => e.id));
  if (!vf) { toast('Odkaz na farmu je poškozený.'); return; }
  if (!webgl()) { toast('Tohle zařízení 3D farmu neukáže.'); return; }
  openM(`<h2>🏡 Farma: ${esc(cleanNick(o.n) || 'rodina')}</h2><p class="msg small">Jen prohlížení – tady nic nezměníš.</p><div class="fvis"><div class="f3d" id="fvis3"></div></div><button class="btn full ghost" data-act="close">Zavřít</button>`);
  const T = genWorld(vf.seed, Object.values(vf.pos), vf.biome);
  const items = [...cfg.enclosures.map(e => ({ id: 'enc_' + e.id, name: e.name, icon: e.icon })), ...BUILDINGS.map(b => ({ id: b.id, name: b.name, icon: b.icon }))].filter(i => vf.lv[i.id] > 0).map(i => ({ ...i, level: vf.lv[i.id], status: 'ok', text: '' }));
  try { const m3 = await mountFarm($('fvis3'), items, () => {}, { world: T, tiles: vf.tiles, roads: vf.roads, decor: vf.decor, pos: vf.pos, cam: {}, env: farmEnv(), rail: vf.rail }); stopGame = () => m3.destroy(); } catch (e) { toast('3D farmu se nepodařilo zobrazit.'); }
}
let farmShareURL = '';
function shareFarm() {
  const f = ensureFarm();
  farmShareURL = shareURL() + '#farma=' + toCode({ v: 1, n: state.nick, s: f.seed, b: f.biome, w: f.rail ? 1 : 0, l: Object.fromEntries(Object.entries(f.lv).filter(([, v]) => v > 0)), p: f.pos, t: f.tiles, r: f.roads, d: f.decor });
  let qr = ''; try { qr = qrSVG(farmShareURL, 4); } catch (e) { qr = '<p class="msg">Farma je na QR kód moc velká – pošli odkaz.</p>'; }
  openM(`<h2>👪 Pozvat na farmu</h2><p class="msg small">Rodina načte QR kód nebo otevře odkaz a uvidí tvou farmu (jen prohlížení).</p><div class="qr">${qr}</div><button class="btn full" data-act="farmLink">Sdílet odkaz</button><button class="btn full ghost" data-act="close">Zavřít</button>`);
}
async function shareFarmLink() {
  try { if (navigator.share) { await navigator.share({ title: 'Moje farma', text: 'Přijď se podívat na mou farmu ve hře Stopař', url: farmShareURL }); return; } } catch (e) { if (e.name === 'AbortError') return; }
  try { await navigator.clipboard.writeText(farmShareURL); toast('Odkaz zkopírován.'); } catch (e) { prompt('Zkopíruj odkaz:', farmShareURL); }
}
async function farmPhoto() {
  if (!farm3 || !farm3.snap) return;
  const blob = await farm3.snap(); if (!blob) { toast('Fotka se nepovedla.'); return; }
  const file = new File([blob], 'moje-farma.png', { type: 'image/png' });
  try { if (navigator.canShare && navigator.canShare({ files: [file] })) { await navigator.share({ files: [file], title: 'Moje farma' }); return; } } catch (e) { if (e.name === 'AbortError') return; }
  const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'moje-farma.png'; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 4000); toast('📸 Fotka uložena.');
}
function farmTerrain() { const f = ensureFarm(), key = f.seed + '|' + f.biome + '|' + Object.values(f.pos).map(p => p.join()).sort().join(';'); if (!farmT || farmT.key !== key) farmT = { key, W: genWorld(f.seed, Object.values(f.pos), f.biome) }; return farmT.W; }
const farmTaken = (except = '') => takenTiles(ensureFarm(), except);
function farmTile(q, r) {
  const f = ensureFarm();
  if (farmPlace && farmPlace.startsWith('decor:')) {
    const t = farmPlace.slice(6), res = placeDecor(f, farmTerrain(), q, r, t);
    if (res.err) { toast(res.err); return; }
    farmPlace = ''; saveState(); toast((DECOR.find(d => d[0] === t) || [])[1] + ' Hotovo.'); renderFarmView(); return;
  }
  if (farmPlace) {
    const id = farmPlace, res = placeBuilding(f, id, q, r, farmTerrain(), state.cones);
    if (res.err) { toast(res.err); return; }
    if (res.cones) { state.cones -= res.cones; hudCones(); }
    farmPlace = ''; farmSel = id; saveState(); toast('🔨 Stavba začala.'); renderFarmView(); return;
  }
  if (!farmMove) {
    const occ = Object.entries(f.pos).find(([, p]) => p[0] === q && p[1] === r);
    if (occ) { farmSel = occ[0]; showFarmSheet(); return; }
    const dk = q + ',' + r, dt = (f.decor || {})[dk];
    if (dt) { const d = DECOR.find(x => x[0] === dt) || ['', '•', 'Ozdoba']; farmSel = ''; farmTileSel = [q, r]; const s2 = $('fsheet'); s2.innerHTML = `<div class="fsh-h"><b>${icId(d[0], d[1])} ${esc(d[2])}</b><button class="x" data-fv="close" aria-label="Zavřít">✕</button></div><p class="msg small">Ozdoba – jen pro krásu farmy, nic nevyrábí.</p><button class="btn full ghost" data-fv="decorDel">Odstranit (suroviny se nevrátí)</button>`; s2.hidden = false; return; }
    if (!q && !r) return;
    farmTileSel = farmTileSel && farmTileSel[0] === q && farmTileSel[1] === r && !$('fsheet').hidden ? null : [q, r]; farmSel = '';
    if (farmTileSel) showTileSheet(); else { $('fsheet').hidden = true; if (farm3) farm3.highlight([]); }
    return;
  }
  const id = farmMove;
  if (f.pos[id] && f.pos[id][0] === q && f.pos[id][1] === r) { farmMove = ''; if (farm3) { farm3.setMoving(false); farm3.highlight([]); } farmSel = id; showFarmSheet(); toast('Přesun zrušen.'); return; }
  const res = moveBuilding(f, id, q, r, farmTerrain(), Number(cfg.farm.moveDays) || 0);
  if (res.err) { toast(res.err); return; }
  farmMove = ''; saveState(); toast(res.swapped ? 'Budovy si vyměnily místo.' : 'Přesunuto.'); farmSel = id; renderFarmView();
}
// Katalog staveb: co ještě nestojí; u prázdné farmy jiná krajina, v testování prázdná farma znovu
// Okno Stavět: příbytky, hospodářství, krajina (cesty, políčka), další – v mřížce dlaždic
function openFarmCatalog() {
  const f = ensureFarm(), s2 = $('fsheet'); if (!s2) return;
  farmSel = ''; farmMove = ''; farmTileSel = null;
  const free = id => !(f.lv[id] > 0) && !f.pos[id] && !(f.build && f.build.id === id);
  const card = id => { const [icon, name] = fbName(id), c = farmCost(id, 0), ok = canAfford(f, c, state.cones) && !f.build;
    return `<button class="bcard${ok ? ' ok' : ''}" data-fv="place" data-id="${esc(id)}"${f.build ? ' disabled' : ''}><span class="bico">${icon}</span><b>${esc(name)}</b><small>🪵 ${c.wood} · 🪨 ${c.stone}${c.cones ? ' · 🌰 ' + c.cones : ''}</small></button>`; };
  const encs = cfg.enclosures.map(e => 'enc_' + e.id).filter(free), econ = BUILDINGS.map(b => b.id).filter(free);
  s2.innerHTML = `<div class="fsh-h"><b>🔨 Stavět</b><button class="x" data-fv="close" aria-label="Zavřít">✕</button></div>
  ${f.build ? `<p class="msg small">⏳ Staví se ${esc(fbName(f.build.id)[1])} – další stavba až po dokončení.</p>` : '<p class="msg small">Vyber stavbu a ťukni na zvýrazněné políčko. Nebo ťukni rovnou na volné políčko na farmě.</p>'}
  ${encs.length ? `<h3>🏠 Příbytky zvířat</h3><div class="bgrid">${encs.map(card).join('')}</div>` : ''}
  ${econ.length ? `<h3>🌾 Hospodářství</h3><div class="bgrid">${econ.map(card).join('')}</div>` : ''}
  ${!encs.length && !econ.length ? '<p class="msg">Všechno už stojí – vylepšuj budovy ťuknutím na ně.</p>' : ''}
  <h3>🏡 Ozdoby (jen vzhled)</h3><div class="bgrid">${DECOR.map(([t, i, n, c]) => `<button class="bcard" data-fv="decor" data-t="${t}"><span class="bico">${icId(t, i)}</span><b>${n}</b><small>${Object.entries(c).map(([k, v]) => ({ wood: '🪵', stone: '🪨', seeds: '🌱' }[k] + ' ' + v)).join(' · ')}</small></button>`).join('')}</div>
  <h3>🚂 Doprava</h3><div class="bgrid">${f.rail ? '<button class="bcard on" disabled><span class="bico">🚂</span><b>Železnice a nádraží</b><small>stojí · výroba surovin ×2</small></button>' : `<button class="bcard${f.res.wood >= RAIL_COST.wood && f.res.stone >= RAIL_COST.stone && state.cones >= RAIL_COST.cones ? ' ok' : ''}" data-fv="rail"><span class="bico">🚂</span><b>Železnice a nádraží</b><small>🪵 ${RAIL_COST.wood} · 🪨 ${RAIL_COST.stone} · ${coneIcon} ${RAIL_COST.cones} · výroba surovin ×2, vlak vozí šišky</small></button>`}</div>
  <p class="msg small">🚚 ${farmNet > 0 ? 'Nákladní auta jezdí.' : 'Nákladní auta vyjedou, až nakreslíš cestu od cesty v krajině ke skladu.'}</p>
  <h3>🌳 Krajina</h3><div class="bgrid">
    <button class="bcard${farmRoads ? ' on' : ''}" data-fv="roads"><span class="bico">🛤️</span><b>${farmRoads ? 'Kreslím cesty' : 'Kreslit cesty'}</b><small>ťuk na hranu políčka</small></button>
    <button class="bcard" data-fv="tilehint"><span class="bico">🌾</span><b>Pole, les, rybníček</b><small>ťuk na volné políčko</small></button>
  </div>
  <h3>✨ Další</h3><div class="bgrid">
    <button class="bcard" data-fv="deeds"><span class="bico">🌱</span><b>Skutečný čin</b><small>budka, krmítko…</small></button>
    ${isEmpty(f) ? '<button class="bcard" data-fv="regenPick"><span class="bico">🎲</span><b>Jiná krajina</b><small>dokud je farma prázdná</small></button>' : ''}
    ${cfg.farm.testTools ? '<button class="bcard" data-fv="reset"><span class="bico">🧪</span><b>Začít znovu</b><small>prázdná farma (test)</small></button>' : ''}
  </div>`;
  s2.hidden = false; actNow = null; updateAct();
  if (farm3 && farm3.setRailPreview) farm3.setRailPreview(!f.rail);
}
function runFarmUp() { if (!farmSel) return; const b = document.createElement('button'); b.dataset.act = 'farmBuild'; b.dataset.id = farmSel; onModalClick({ target: b, preventDefault() {} }); }
// Skutečné činy: budka, krmítko, hmyzí hotel, jezírko, keř – s fotkou; odměna úroveň navíc (jednou za deedDays)
const DEEDS = [['budka', '🐦', 'Vyvěsil jsem ptačí budku', 'enc_voliera'], ['krmitko', '🏠', 'Postavil jsem krmítko (v zimě)', 'pantry'], ['hotel', '🐝', 'Postavil jsem hmyzí hotel', 'enc_insektarium'], ['jezirko', '💧', 'Udělal jsem jezírko nebo napajedlo', 'enc_rybnik'], ['ker', '🌳', 'Zasadil jsem keř nebo strom', 'orchard']];
function deedsHTML() {
  const f = ensureFarm(), days = Number(cfg.farm.deedDays) || 0;
  return `<h2>🌱 Skutečný čin pro přírodu</h2><p class="msg small">Udělej něco opravdového a vyfoť to. Odměnou je úroveň navíc pro budovu na farmě (nebo suroviny, když ještě nestojí). Fotka zůstane jen v telefonu.</p>
  ${DEEDS.map(([k, i, n, b]) => { const wait = days && f.deeds[k] ? Math.ceil((f.deeds[k] + days * 86400000 - Date.now()) / 86400000) : 0; const [bi, bn] = fbName(b);
    return `<div class="fcard"><div class="fico">${i}</div><div class="finfo"><b>${esc(n)}</b><small>Odměna: ${bi} ${esc(bn)} +1 úroveň</small>${wait > 0 ? `<small>Znovu za ${wait} dní</small>` : `<label class="btn sm primary">📷 Vyfotit a potvrdit<input type="file" accept="image/*" capture="environment" data-deed="${k}" hidden></label>`}</div></div>`; }).join('')}
  <button class="btn full ghost" data-act="close">Zavřít</button>`;
}
async function doDeed(k, file) {
  const d = DEEDS.find(x => x[0] === k), f = ensureFarm(); if (!d) return;
  try { const img = await resizeImage(file, 800); await store.addPhoto({ sp: '', img, date: Date.now(), lat: null, lon: null, deed: k }); } catch (e) { toast('Fotku se nepodařilo uložit.'); return; }
  f.deeds[k] = Date.now();
  const b = d[3];
  if ((f.lv[b] || 0) > 0 && f.lv[b] < 10) { f.lv[b]++; toast('🌱 Díky! ' + fbName(b)[1] + ' má teď úroveň ' + f.lv[b] + '.'); }
  else { f.res.wood += 20; f.res.stone += 10; toast('🌱 Díky! +20 🪵 a +10 🪨 na farmu.'); }
  gainKnow('journal', 'za čin pro přírodu'); saveState(); closeM(); if ($('farmv').classList.contains('on')) refreshFarmView();
}
const encOcc = id => { const c = {}; state.animals.forEach(a => { const sp = SP[a.sp]; if (sp && enclosureOf(cfg, sp.group).id === id) c[a.sp] = (c[a.sp] || 0) + 1; }); return Math.max(0, ...Object.values(c)); };
const fbName = id => { const b = BUILDINGS.find(x => x.id === id), e = cfg.enclosures.find(x => 'enc_' + x.id === id); return b ? [icId(b.id, b.icon), b.name, b.desc] : e ? [icId(id, e.icon), e.name, ENC_DESC] : ['🏠', id, '']; };
// Stav nad budovou: ok = stačí, warn = blíží se limitu, bad = nestačí / stojí, build = staví se
function farmItems() {
  const f = ensureFarm(), cap = storeCap(f), out = [];
  for (const e of cfg.enclosures) {
    const id = 'enc_' + e.id, occ = encOcc(e.id), c = encCap(f, e.id, cfg.farm.maxCap), r = occ / Math.max(1, c);
    out.push({ id, name: e.name, icon: e.icon, level: f.lv[id] || 0, status: f.build && f.build.id === id ? 'build' : r >= 1 ? 'bad' : r >= 0.7 ? 'warn' : 'ok', text: occ + '/' + c });
  }
  for (const b of BUILDINGS) {
    const lv = f.lv[b.id] || 0; let status = 'ok', text = '';
    if (b.kind === 'res') { const r = f.res[b.res] / cap; status = r >= 0.95 ? 'bad' : r >= 0.7 ? 'warn' : 'ok'; text = Math.floor(f.res[b.res]) + '/' + cap; }
    else if (b.kind === 'item') { const need = Object.values(b.use || {})[0] || 0; status = f.res.seeds >= need * 5 ? 'ok' : f.res.seeds >= need ? 'warn' : 'bad'; text = '🎒 ' + (state.inv[b.item] || 0); }
    else if (b.id === 'store') { const r = Math.max(...Object.keys(RES).map(k => f.res[k])) / cap; status = r >= 0.95 ? 'bad' : r >= 0.7 ? 'warn' : 'ok'; text = cap; }
    if (!lv) status = 'off';
    if (f.build && f.build.id === b.id) status = 'build';
    out.push({ id: b.id, name: b.name, icon: b.icon, level: lv, status, text });
  }
  return out.filter(i => (f.lv[i.id] || 0) > 0 || (f.build && f.build.id === i.id));
}
const webgl = () => { try { const c = document.createElement('canvas'); return !!(c.getContext('webgl2') || c.getContext('webgl')); } catch (e) { return false; } };
function farmTopHTML() {
  const f = ensureFarm(), cap = storeCap(f);
  return `<div class="ftop"><div class="fres">${Object.entries(RES).map(([k, [i, n]]) => `<span title="${n}">${icId(k, i)} <b>${Math.floor(f.res[k])}</b><small>/${cap}</small></span>`).join('')}</div>
  <div class="fbtns"><button class="btn sm" data-fv="side">📊 Souhrn</button><button class="btn sm" data-fv="animals">🐾 Zvířata</button><button class="btn sm" data-fv="atlas">📖 Atlas</button></div></div>`;
}
function farmSideHTML() {
  const f = ensureFarm(), r = farmRates(f), cap = storeCap(f), it = id => (cfg.shop.find(x => x.id === id) || { icon: '', name: id });
  const fx = v => (Math.round(v * 10) / 10).toString().replace('.', ',');
  return `<h3>Výroba za hodinu</h3>${Object.entries(RES).map(([k, [i, n]]) => `<div class="nmrow"><span>${icId(k, i)} ${n}</span><span>+${fx(r[k])} / h</span></div>`).join('')}
  ${Object.entries(r.items).map(([k, v]) => `<div class="nmrow"><span>${icId(k, it(k).icon)} ${esc(it(k).name)}</span><span>+${fx(v)} / h · máš ${state.inv[k] || 0}</span></div>`).join('')}
  <p class="msg small">Chůze přidá víc: každých 100 m +2 (les dřevo, louky semínka, jinde kámen).</p>
  <h3>Kapacity</h3><div class="nmrow"><span>🏚️ Sklad surovin</span><span>${cap}</span></div>
  ${cfg.enclosures.map(e => `<div class="nmrow"><span>${icId('enc_' + e.id, e.icon)} ${esc(e.name)}</span><span>${encOcc(e.id)} / ${encCap(f, e.id, cfg.farm.maxCap)} na druh</span></div>`).join('')}
  <h3>Celkem vypěstováno</h3>${Object.entries(f.made).map(([k, v]) => `<div class="nmrow"><span>${icId(k, it(k).icon)} ${esc(it(k).name)}</span><span>${v}</span></div>`).join('') || '<p class="msg small">Zatím nic.</p>'}
  <h3>Úkoly farmy</h3>${FARM_TASKS.map(([id, txt, ok, rw]) => { const done = f.tasks[id], can = !done && ok(f); return `<div class="nmrow"><span>${done ? '✅' : can ? '🎁' : '▫️'} ${esc(txt)}</span><span>${can ? `<button class="btn sm" data-fv="task" data-id="${id}">Vyzvednout ${rwTxt(rw)}</button>` : rwTxt(rw)}</span></div>`; }).join('')}
  <div class="row2"><button class="btn ghost" data-fv="photo">📸 Fotka farmy</button><button class="btn ghost" data-fv="share">👪 Pozvat rodinu</button></div>
  <h3>Krajina</h3><div class="bgrid">${Object.entries(BIOMES).map(([k, b]) => `<button class="bcard${(f.biome || 'pahorkatina') === k ? ' on' : ''}" data-fv="biome" data-b="${k}"><span class="bico">${b.icon}</span><b>${esc(b.name)}</b><small>${esc(b.desc)}</small></button>`).join('')}</div>
  <button class="btn full ghost" data-fv="regenPick">🎲 Jiná krajina (budovy zůstanou)</button>
  <p class="msg small">Zvířat celkem: ${state.animals.length} · druhů: ${new Set(state.animals.map(a => a.sp)).size}</p>`;
}
// Panel vybrané budovy: popis, stav, vylepšení; u obydlí ubytovaná zvířata a přepínání
function farmSheetHTML(id) {
  const f = ensureFarm(), [icon, name, desc] = fbName(id), lv = f.lv[id] || 0, c = farmCost(id, lv), b = f.build && f.build.id === id;
  const enc = id.startsWith('enc_') ? cfg.enclosures.find(e => 'enc_' + e.id === id) : null;
  let body = '';
  if (enc) {
    const list = state.animals.filter(a => SP[a.sp] && enclosureOf(cfg, SP[a.sp].group).id === enc.id).sort((a, b2) => power(b2) - power(a));
    const avg = list.length ? Math.round(list.reduce((s, a) => s + power(a), 0) / list.length) : 0;
    body = `<div class="atabs">${cfg.enclosures.map(e => `<button class="${e.id === enc.id ? 'on' : ''}" data-fsel="enc_${e.id}">${icId('enc_' + e.id, e.icon)} ${esc(e.name)}</button>`).join('')}</div>
    <p class="msg small">Ubytováno ${list.length} zvířat · ${new Set(list.map(a => a.sp)).size} druhů · místa pro každý druh ${encCap(f, enc.id, cfg.farm.maxCap)} (nejvíc obsazeno ${encOcc(enc.id)}) · průměrná síla ${avg}</p>
    ${list.length ? `<div class="grid">${list.slice(0, 60).map(a => `<div class="acard" data-animal="${esc(a.uid)}"><div class="im">${birdImg(SP[a.sp], '', a.stage)}</div><div class="nm">${esc(a.nick || SP[a.sp].name)}${stars(a.stage)}</div><div class="rr">síla ${power(a)}</div></div>`).join('')}</div>` : '<div class="empty"><img src="images/dog/search.webp" alt=""><p class="msg">Zatím prázdné – Aegon hledá. Vyraz ven!</p></div>'}`;
  }
  const up = b ? `<p class="msg small">Staví se – hotovo za ${Math.max(1, Math.ceil((f.build.until - Date.now()) / 60000))} min</p>`
    : lv >= 10 ? '<p class="msg small">Nejvyšší úroveň.</p>' : `<button class="btn full${canAfford(f, c, state.cones) && !f.build ? ' primary' : ''}" data-act="farmBuild" data-id="${esc(id)}"${f.build ? ' disabled' : ''}>${lv ? 'Vylepšit na úr. ' + (lv + 1) : 'Postavit'}: 🪵 ${c.wood} · 🪨 ${c.stone}${c.cones ? ' · 🌰 ' + c.cones : ''} · ${buildMinutes(lv)} min</button>${f.build ? '<p class="msg small">Najednou se staví jen jedna budova.</p>' : ''}`;
  const md = Number(cfg.farm.moveDays) || 0, wait = md && f.moved ? Math.ceil((f.moved + md * 86400000 - Date.now()) / 86400000) : 0;
  const mv = farmMove === id ? '<button class="btn full primary" data-fv="moveCancel">Ťukni na políčko, kam budovu dát · Zrušit</button>' : `<button class="btn full ghost" data-fv="move"${wait > 0 ? ' disabled' : ''}>↔ Přesunout${wait > 0 ? ' (za ' + wait + ' dní)' : md ? ' (jednou za ' + md + ' dní)' : ''}</button>`;
  const test = cfg.farm.testTools ? `<div class="ftest"><span>🧪 Test:</span><button class="btn sm" data-fv="lvDown">−1 úroveň</button><button class="btn sm" data-fv="lvUp">+1 úroveň</button></div>` : '';
  const g = enc && (f.guests[enc.id] || []).filter(id => SP[id]);
  const guests = g && g.length ? `<p class="msg small">Hosté (vypuštěná zvířata, která se vracejí): ${g.map(id => esc(SP[id].name)).join(', ')} · každý den přinesou semínka</p>` : '';
  const bon = farmBonus(f, farmTerrain())[id], bonus = bon && bon > 1 ? `<p class="msg small">🌿 Bonus okolí: +${Math.round((bon - 1) * 100)} % výroby</p>` : BONUS_TILE[id] ? `<p class="msg small">Tip: ${TILE_INFO[BONUS_TILE[id]][0]} ${TILE_INFO[BONUS_TILE[id]][1]} vedle budovy přidá +10 % výroby.</p>` : '';
  return `<div class="fsh-h"><b>${icon} ${esc(name)} <small>úr. ${lv}</small></b><button class="x" data-fv="close" aria-label="Zavřít">✕</button></div><p class="msg small">${esc(desc)}</p>${bonus}${up}${mv}${test}${guests}${body}`;
}
async function renderFarmView() {
  const v = $('farmv');
  if (!cfg.farm.enabled) { v.innerHTML = '<p class="msg">Farma je vypnutá (Admin → Farma).</p>'; return; }
  farmTick(true);
  if (!webgl()) { v.innerHTML = '<div class="ja">' + farmHTML(ensureFarm(), cfg, state.cones) + '</div>'; return; }
  v.innerHTML = `<div class="fv"><div class="f3d" id="f3d"></div><div id="ftopw">${farmTopHTML()}</div><div class="fside" id="fside"${farmSide ? '' : ' hidden'}>${farmSideHTML()}</div><div class="fsheet" id="fsheet" hidden></div></div>`;
  if (farm3) { farm3.destroy(); farm3 = null; }
  const f = ensureFarm(), T = farmTerrain();
  autoPlace(T, f.pos, [...cfg.enclosures.map(e => 'enc_' + e.id), ...BUILDINGS.map(b => b.id)].filter(id => (f.lv[id] || 0) > 0 || (f.build && f.build.id === id)));
  try { farm3 = await mountFarm($('f3d'), farmItems(), id => { farmTileSel = null; farmSel = farmSel === id && !$('fsheet').hidden ? '' : id; showFarmSheet(); }, { world: T, tiles: f.tiles, roads: f.roads, decor: f.decor, pos: f.pos, env: farmEnv(), encAnimals: farmEncAnimals(), rail: f.rail, railPreview: farmGhost && !f.rail, onNet: n => { if (farmNet >= 0 && n > farmNet) toast('🚚 Cesty jsou propojené se skladem – vyjela nákladní auta!'); farmNet = n; }, cam: farmCam, onTile: farmTile, moving: !!(farmMove || farmPlace), roadMode: farmRoads, onEdge: key => { const on = toggleRoad(ensureFarm(), key); saveState(); farm3.setRoads(ensureFarm().roads); toast(on ? '🛤️ Cesta přidána' : 'Cesta smazána'); } }); }
  catch (e) { v.innerHTML = '<div class="ja">' + farmHTML(ensureFarm(), cfg, state.cones) + '</div>'; return; }
  if (farmGhost && !f.rail) toast('Čárkovaně: kudy povede železnice – postavíš ji ve Stavět.');
  farmGhost = false;
  if (farmSel) showFarmSheet();
  if (farmPlace || farmMove) farm3.highlight(validTiles(T, farmTaken(farmMove)));
  if (isEmpty(f) && !farmSel && !farmPlace) openFarmCatalog();
}
function showTileSheet() {
  const s = $('fsheet'), f = ensureFarm(), W = farmTerrain(), [q, r] = farmTileSel, ty = tileType(W, f.tiles, q, r), [ti, tn] = TILE_INFO[ty] || ['🌼', 'Louka'];
  const can = [...cfg.enclosures.map(e => 'enc_' + e.id), ...BUILDINGS.map(b => b.id)].filter(id => !(f.lv[id] > 0) && !f.pos[id] && !(f.build && f.build.id === id));
  const helps = Object.entries(BONUS_TILE).filter(([, t]) => t && t !== ty).map(([id, t]) => [id, t]);
  s.innerHTML = `<div class="fsh-h"><b>${icId('t_' + ty, ti)} ${tn}</b><button class="x" data-fv="close" aria-label="Zavřít">✕</button></div>
  <p class="msg small">Volné políčko. Postav tu budovu, nebo ho uprav – sousední budovy dostanou bonus k výrobě (+10 % za každé vhodné políčko).</p>
  <div class="ftiles">${Object.entries(TILE_INFO).filter(([t]) => t !== ty).map(([t, [i, n, cost]]) => `<button class="btn sm" data-fv="tile" data-t="${t}">${icId('t_' + t, i)} ${n}${Object.keys(cost).length ? ' · ' + Object.entries(cost).map(([k, v]) => ({ wood: '🪵', stone: '🪨', seeds: '🌱' }[k] + ' ' + v)).join(' ') : ''}</button>`).join('')}</div>
  <p class="msg small">${helps.filter(([, t]) => t === 'field').length ? '🌾 Pole pomáhá Poli a Sadu · ' : ''}🌲 Les Dřevníku · 🌼 Louka Semeništi a Záhonu · 💧 Rybníček Rybníku</p>
  ${can.length ? '<h3>Postavit tady</h3>' + can.map(id => { const [icon, name] = fbName(id), c = farmCost(id, 0); return `<button class="btn full${canAfford(f, c, state.cones) && !f.build ? ' primary' : ''}" data-fv="buildHere" data-id="${esc(id)}"${f.build ? ' disabled' : ''}>${icon} ${esc(name)} · 🪵 ${c.wood} · 🪨 ${c.stone}${c.cones ? ' · 🌰 ' + c.cones : ''}</button>`; }).join('') : ''}${f.build ? '<p class="msg small">Teď se staví – další budova až po dokončení.</p>' : ''}`;
  s.hidden = false; if (farm3) farm3.highlight([farmTileSel]);
}
function showFarmSheet() { const s = $('fsheet'); actNow = null; updateAct(); if (!s) return; if (!farmSel) { s.hidden = true; return; } s.innerHTML = farmSheetHTML(farmSel); s.hidden = false; }
function refreshFarmView() {
  if (!farm3) return;
  farm3.update(farmItems());
  const t = $('ftopw'); if (t) t.innerHTML = farmTopHTML();
  const sd = $('fside'); if (sd && !sd.hidden) sd.innerHTML = farmSideHTML();
  const sh = $('fsheet'); if (sh && !sh.hidden) { const y = sh.scrollTop; showFarmSheet(); sh.scrollTop = y; }
}
function onFarmClick(e) {
  const fv = e.target.closest('[data-fv]');
  if (fv) {
    const k = fv.dataset.fv;
    if (k === 'side') { farmSide = !farmSide; const sd = $('fside'); sd.hidden = !farmSide; if (farmSide) sd.innerHTML = farmSideHTML(); }
    else if (k === 'animals') { farmSel = !$('fsheet').hidden && farmSel.startsWith('enc_') ? '' : 'enc_' + cfg.enclosures[0].id; showFarmSheet(); }
    else if (k === 'atlas') show('atlasv');
    else if (k === 'rail') { if (!fv.dataset.armed) { fv.dataset.armed = '1'; fv.querySelector('b').textContent = 'Opravdu postavit? Ťukni znovu'; return; } const res = buyRail(ensureFarm(), state.cones); if (res.err) { toast(res.err); return; } state.cones -= res.cones; hudCones(); saveState(); toast('🚂 Železnice a nádraží stojí! Výroba surovin je dvojnásobná.'); $('fsheet').hidden = true; renderFarmView(); }
    else if (k === 'close') { if (farm3 && farm3.setRailPreview) farm3.setRailPreview(false); farmSel = ''; farmMove = ''; farmPlace = ''; farmTileSel = null; if (farm3) { farm3.setMoving(false); farm3.highlight([]); } showFarmSheet(); }
    else if (k === 'move') { farmMove = farmSel; if (farm3) { farm3.setMoving(true); farm3.highlight(validTiles(farmTerrain(), farmTaken(farmMove))); } $('fsheet').hidden = true; toast('Ťukni na políčko, kam budovu přesunout. Zrušíš ťuknutím zpět na budovu.'); }
    else if (k === 'roads') { farmRoads = !farmRoads; if (farm3) farm3.setRoadMode(farmRoads); $('fsheet').hidden = true; toast(farmRoads ? 'Ťukej na hrany políček – přidáš nebo smažeš cestu se stromořadím. Konec: Stavět → Kreslím cesty.' : 'Kreslení cest vypnuto.'); }
    else if (k === 'decor') { farmPlace = 'decor:' + fv.dataset.t; $('fsheet').hidden = true; if (farm3) { farm3.setMoving(true); farm3.highlight(validTiles(farmTerrain(), farmTaken())); } toast('Ťukni na zvýrazněné políčko, kam ozdobu dát.'); }
    else if (k === 'decorDel') { if (farmTileSel) { removeDecor(ensureFarm(), ...farmTileSel); saveState(); farmTileSel = null; toast('Odstraněno.'); renderFarmView(); } }
    else if (k === 'tilehint') { $('fsheet').hidden = true; toast('Ťukni na volné políčko na farmě a vyber pole, les nebo rybníček.'); }
    else if (k === 'tile') { const res = setTile(ensureFarm(), farmTerrain(), ...farmTileSel, fv.dataset.t); if (res.err) toast(res.err); else { saveState(); toast(TILE_INFO[fv.dataset.t][0] + ' Hotovo.'); renderFarmView(); } }
    else if (k === 'buildHere') { const f = ensureFarm(), id = fv.dataset.id, res = placeBuilding(f, id, ...farmTileSel, farmTerrain(), state.cones); if (res.err) { toast(res.err); return; } if (res.cones) { state.cones -= res.cones; hudCones(); } farmTileSel = null; farmSel = id; saveState(); toast('🔨 Stavba začala.'); renderFarmView(); }
    else if (k === 'regenPick') {
      const f = ensureFarm(), s2 = $('fsheet'); if (!s2) return;
      s2.innerHTML = `<div class="fsh-h"><b>🎲 Jiná krajina</b><button class="x" data-fv="close" aria-label="Zavřít">✕</button></div>
      <p class="msg small">Vyber krajinu, vygeneruje se nová.${isEmpty(f) ? '' : ' Budovy zůstanou, upravená políčka mimo novou farmu zmizí.'}</p>
      <div class="bgrid">${Object.entries(BIOMES).map(([b, B]) => `<button class="bcard${f.biome === b ? ' on' : ''}" data-fv="regenGo" data-b="${b}"><span class="bico">${B.icon}</span><b>${esc(B.name)}</b><small>${esc(B.desc)}</small></button>`).join('')}<button class="bcard" data-fv="regenGo" data-b="random"><span class="bico">🎲</span><b>Náhodně</b><small>překvap mě</small></button></div>`;
      s2.hidden = false;
    }
    else if (k === 'regenGo') {
      const f = ensureFarm(), keys = Object.keys(BIOMES), b = fv.dataset.b === 'random' ? keys[Math.floor(Math.random() * keys.length)] : fv.dataset.b; if (!BIOMES[b]) return;
      f.biome = b; f.seed = 1 + Math.floor(Math.random() * 99999); farmGhost = true;
      if (isEmpty(f)) f.pos = {}; else { const W = farmTerrain(); f.tiles = Object.fromEntries(Object.entries(f.tiles).filter(([kk]) => W.cells.has(kk))); }
      saveState(); $('fsheet').hidden = true; toast(BIOMES[b].icon + ' Nová krajina: ' + BIOMES[b].name); renderFarmView();
    }
    else if (k === 'regen2') { if (!fv.dataset.armed) { fv.dataset.armed = '1'; fv.textContent = 'Opravdu? Ťukni znovu'; return; } const f = ensureFarm(); f.seed = 1 + Math.floor(Math.random() * 99999); farmGhost = true; const W = farmTerrain(); f.tiles = Object.fromEntries(Object.entries(f.tiles).filter(([kk]) => W.cells.has(kk))); saveState(); toast('🎲 Nová krajina.'); renderFarmView(); }
    else if (k === 'moveCancel') { farmMove = ''; if (farm3) { farm3.setMoving(false); farm3.highlight([]); } showFarmSheet(); }
    else if (k === 'place') { farmPlace = fv.dataset.id; $('fsheet').hidden = true; if (farm3) { farm3.setMoving(true); farm3.highlight(validTiles(farmTerrain(), farmTaken())); } toast('Ťukni na zvýrazněné políčko.'); }
    else if (k === 'task') { const rw = claimTask(ensureFarm(), fv.dataset.id); if (rw) { if (rw.cones) { state.cones += rw.cones; hudCones(); } saveState(); toast('🎁 Odměna: ' + rwTxt(rw)); const sd = $('fside'); if (sd) sd.innerHTML = farmSideHTML(); } }
    else if (k === 'photo') farmPhoto();
    else if (k === 'share') shareFarm();
    else if (k === 'biome') { const f = ensureFarm(); if (!BIOMES[fv.dataset.b] || f.biome === fv.dataset.b) return; f.biome = fv.dataset.b; farmGhost = true; const W = farmTerrain(); f.tiles = Object.fromEntries(Object.entries(f.tiles).filter(([kk]) => W.cells.has(kk))); saveState(); toast(BIOMES[f.biome].icon + ' ' + BIOMES[f.biome].name); renderFarmView(); }
    else if (k === 'regen') { const f = ensureFarm(); if (isEmpty(f)) { f.seed = 1 + Math.floor(Math.random() * 99999); f.pos = {}; farmGhost = true; saveState(); renderFarmView(); } }
    else if (k === 'reset') { if (!fv.dataset.armed) { fv.dataset.armed = '1'; fv.querySelector('b') ? fv.querySelector('b').textContent = 'Opravdu? Znovu' : fv.textContent = 'Opravdu? Ťukni znovu'; return; } state.farm = newFarm(cfg.enclosures.map(e => e.id)); farmSel = ''; saveState(); toast('Farma je prázdná, začni stavět.'); renderFarmView(); }
    else if (k === 'deeds') openM(deedsHTML());
    else if (k === 'lvUp' || k === 'lvDown') { const f = ensureFarm(), id = farmSel; if (f.build && f.build.id === id) f.build = null; f.lv[id] = Math.max(0, Math.min(10, (f.lv[id] || 0) + (k === 'lvUp' ? 1 : -1))); if (!f.lv[id]) { delete f.pos[id]; farmSel = ''; } saveState(); renderFarmView(); }
    return;
  }
  const sel = e.target.closest('[data-fsel]'); if (sel) { farmSel = sel.dataset.fsel; showFarmSheet(); if (farm3) farm3.focus(farmSel); return; }
  const an = e.target.closest('[data-animal]'); if (an) { openAnimal(an.dataset.animal); return; }
  if (e.target.closest('[data-act]')) onModalClick(e);
}
function openFarm(refresh) {
  if (!cfg.farm.enabled) { toast('Farma je vypnutá.'); return; }
  if (!refresh) { closeM(); show('farmv'); return; }
  if ($('farmv').classList.contains('on')) { refreshFarmView(); return; }
  const y = mbox.scrollTop; if (!refresh) farmTick(true);
  openM(farmHTML(ensureFarm(), cfg, state.cones)); if (refresh) mbox.scrollTop = y;
}
function playerLevel() { return levelFor(state.xp, cfg.game).level; }
// Zamčené funkce a vzácnosti podle úrovně hráče
const unlocked = k => playerLevel() >= levelNeeded(cfg.game.unlocks, k);
const speciesLocked = sp => !cfg.general.unlockAll && playerLevel() < levelNeeded(cfg.game.rarityLevel, String(sp.rarity));
// Přidá XP; při nové úrovni ohlásí, co se odemklo
function gainXP(n) {
  if (!(n > 0)) return;
  const before = playerLevel();
  state.xp += n;
  const after = playerLevel();
  if (after > before) {
    const opened = Object.entries(Object.assign({}, ...[cfg.game.unlocks, cfg.game.rarityLevel].map((m, i) => Object.fromEntries(Object.entries(parseMap(m)).map(([k, v]) => [i ? 'vzacnost' + k : k, v])))))
      .filter(([, l]) => l > before && l <= after).map(([k]) => unlockName(cfg, k));
    toast('Úroveň ' + after + '!' + (opened.length ? ' Odemčeno: ' + opened.join(', ') + '.' : ''));
    clearMarkers(); refreshBirds();
  }
  hudLevel();
}
// Herní událost: posune úkoly, ohlásí splněné úkoly a nové odznaky
function progressEvent(ev) {
  for (const e of eventProgress(state.events, ev, pos)) { toast('Událost splněna: ' + e.n + '!'); gainXP(Number(cfg.game.xpBadge) || 0); }
  for (const t of questEvent(cfg, state, ev)) { gainXP(Number(t.xp) || 0); addCones(Number(t.cones) || 0); toast('Úkol splněn: ' + t.name + ' (+' + (Number(t.xp) || 0) + ' XP' + (Number(t.cones) ? ', +' + t.cones + ' šišek' : '') + ')'); }
  for (let i = 0; i < 5; i++) { // odznak dá XP, to může dát úroveň a další odznak
    const got = checkBadges(cfg, state, playerLevel());
    if (!got.length) break;
    for (const b of got) { toast('Nový odznak: ' + b.icon + ' ' + b.name); gainXP(Number(cfg.game.xpBadge) || 0); if (dog) dog.react('trophy', 3000); }
  }
  saveState();
}
// Vědomosti 📖: za učení (kvíz, stopa, úkol místa, deník, nový druh, určení klíčem); utrácí se za vývoj
function gainKnow(kind, why) { const n = Number(parseMap(cfg.game.know || '')[kind]) || 0; if (!n) return; state.points += n; setTimeout(() => toast('+' + n + ' 📖 ' + (why || 'vědomostí')), 900); }
function addCones(n) { if (n > 0) { state.cones += n; hudCones(); if (dog) dog.react('cone', 2500); } }
function hudCones() { const b = $('coneBtn'); if (b) b.innerHTML = coneIcon + ' ' + Math.floor(state.cones); refreshJa(); }
// Záložka Já ukazuje šišky, úroveň a statistiky – při změně se překreslí (jen když je otevřená)
let jaT = 0;
function refreshJa() { clearTimeout(jaT); jaT = setTimeout(() => { const j = $('jav'); if (j && j.classList.contains('on')) { const y = j.scrollTop; renderJa(); j.scrollTop = y; } }, 50); }
// Dosah chytání (dalekohled ho na chvíli zvětší)
function catchRadius() { return cfg.catch.radius * (Date.now() < state.radiusUntil ? Number(cfg.game.radiusMult) || 1 : 1); }
const can = Object.assign(k => unlocked(k), { level: k => levelNeeded(cfg.game.unlocks, k) });
function openShop() { openM(shopHTML(cfg, state, can)); }
function hudLevel() { const b = $('lvlBtn'); if (!b) return; const lv = levelFor(state.xp, cfg.game); b.textContent = 'Úr. ' + lv.level; b.style.setProperty('--p', Math.round(lv.into / lv.need * 100) + '%'); refreshJa(); }
function openProfile() { openM(profileHTML(cfg, state, levelFor(state.xp, cfg.game), eventsListHTML(cfg, state.events) + walkHTML(state.walkDays) + stampsHTML(state))); }
function addedMsg(sp) {
  const e = enclosureOf(cfg, sp.group), a = enc.added || {};
  if (a.released) return `Máš už ${maxPerSpecies(sp)} silnějších kusů, tenhle jsi pustil zpátky do přírody.`;
  if (a.replaced) return `Nahradil slabší kus v ubikaci ${e.icon} ${e.name}.`;
  return `Nový jedinec v ubikaci ${e.icon} ${e.name}.`;
}
// Kvíz: nejdřív základní údaje, pak se zavřou a přijde otázka abc
function quizRead() {
  const sp = enc.sp, e = sp.edu || {};
  const row = (k, l) => e[k] ? `<div class="kv"><span>${l}:</span> ${esc(e[k])}</div>` : '';
  enc.quiz = makeQuiz(sp, cfg.species);
  openM(`<h2>${esc(sp.name)}</h2><div class="sub">${esc(sp.lat)}</div><div class="fact">${esc(sp.fact)}</div>
  ${row('family', 'Čeleď')}${row('length', 'Velikost')}${row('diet', 'Potrava')}${row('migration', 'V zimě')}${row('breedTime', 'Rozmnožování')}
  <p class="msg small">Přečti si to pozorně – potom přijde otázka.</p><button class="btn primary full" data-act="quizGo">Mám přečteno</button>`);
}
function quizAsk() {
  const z = enc.quiz; if (!z) return;
  openM(`<h2>Kvíz: ${esc(enc.sp.name)}</h2><p class="msg">${esc(z.q)}</p><div class="answers">${z.answers.map((a, i) => `<button class="btn full" data-act="quizAns" data-i="${i}">${'ABC'[i]}) ${esc(a)}</button>`).join('')}</div>`);
}
function quizAnswer(i) {
  const z = enc.quiz; if (!z || enc.quizDone) return;
  enc.quizDone = true;
  const ok = i === z.correct, a = state.animals.find(x => x.uid === enc.uid);
  if (ok) {
    if (a) a.stats = a.stats.map(v => Math.min(cfg.catch.maxStat, v + Number(cfg.game.quizBonus || 0)));
    state.counters.quiz++; gainXP(cfg.game.xpQuiz); progressEvent({ kind: 'quiz' }); gainKnow('quiz', 'za kvíz');
  }
  openM(`<h2>${ok ? 'Správně!' : 'Tentokrát ne'}</h2><p class="msg">${ok ? `Jedinec dostal +${cfg.game.quizBonus} ke všem vlastnostem.` : 'Správná odpověď: ' + esc(z.answers[z.correct])}</p><button class="btn primary full" data-act="close">Pokračovat</button>`);
  saveState();
}
// Stopa: správné určení „vystopuje“ zvíře (ukáže se a jde ho chytit), špatné ho vyplaší
const tracked = new Set();
function trackAnswer(i) {
  const ok = i === enc.z.correct, b = enc.b;
  if (!ok) { gone(); toast('Kdepak, byla to stopa: ' + enc.sp.name + '. Zvíře zmizelo.'); closeM(); return; }
  tracked.add(b.id); removeMarker(b.id); refreshBirds();
  state.counters.tracks = (state.counters.tracks || 0) + 1; gainXP(cfg.field.xpTrack); progressEvent({ kind: 'track' }); gainKnow('track', 'za stopu');
  enc = { b, sp: SP[b.sp], step: 'food', tries: 0, shots: 0, msg: 'Správně! Vystopoval jsi ho. Čím ho nalákáš?' };
  encStage();
  renderEnc();
}
/* ---------- určovací klíč a deník ---------- */
let keyAns = {};
function openKey() { openM(keyHTML(cfg, keyAns, SP)); }
function openJournal() { openM(journalHTML(state, SP)); }
let jPhoto = null;
async function saveJournal() {
  const spId = $('jSp').value, name = $('jName').value.trim();
  if (!spId && !name) { $('jInfo').textContent = 'Vyber druh nebo napiš název.'; return; }
  let photo = null;
  if (jPhoto) { try { photo = await store.addPhoto({ sp: spId, img: jPhoto, date: Date.now(), lat: null, lon: null, journal: true }); } catch (e) {} }
  gainKnow('journal', 'za zápis do deníku');
  state.journal.push({ id: Date.now().toString(36), sp: spId, name, date: Date.now(), note: $('jNote').value.trim().slice(0, 500), photo,
    lat: pos.lat == null ? null : Math.round(pos.lat * 1000) / 1000, lon: pos.lon == null ? null : Math.round(pos.lon * 1000) / 1000 });
  jPhoto = null; saveState(); openJournal(); toast('Zapsáno do deníku.');
}
function photoAnim() {
  if (!enc || enc.step !== 'photo') return;
  const mk = $('mk'), fb = $('fb'); if (!mk) return;
  const t = (performance.now() - enc.t0) / 1000, p = .5 + .5 * Math.sin(t * enc.speed);
  enc.p = p; mk.style.left = (p * 100) + '%';
  fb.style.filter = 'blur(' + (Math.abs(p - .5) * 9).toFixed(1) + 'px)';
  fb.style.transform = 'translateY(' + (Math.sin(t * 5) * 3).toFixed(1) + 'px)';
  requestAnimationFrame(photoAnim);
}
function gone() { state.gone[enc.b.id] = Date.now(); removeMarker(enc.b.id); saveState(); }
function pickFood(f) {
  const C = cfg.catch, food = parseMap(foodFor(cfg, enc.sp, enc.stage)), m = food[f] || 0;
  const ch = enc.lure ? 1 : Math.min(1, (m >= 1 ? C.chanceFull : m > 0 ? C.chanceHalf : C.chanceWrong) + (hidden ? Number(cfg.world.hideChance) || 0 : 0));
  enc.tries++;
  const hit = Math.random() < ch;
  if (hit && kidMode()) { doCatch(cfg.family.kidQuality); return; }
  if (hit) { enc.step = 'photo'; enc.msg = m >= 1 ? approach(enc.sp) + ' Cvakni, až je značka v zelené.' : 'Opatrně se přiblížil. Rychle fotku!'; renderEnc(); return; }
  if ((m === 0 && Math.random() < C.fleeWrong) || enc.tries >= C.maxFoodTries) { gone(); if (dog) dog.react('sad', 3000); enc.step = 'fled'; enc.msg = m === 0 ? (FN[f] || f) + ' ho nezajímá. ' + cap(fled(enc.sp)) + '.' : 'Vyplašil se a ' + fled(enc.sp) + '.'; renderEnc(); return; }
  const main = Object.keys(food).sort((a, b) => food[b] - food[a])[0];
  enc.msg = (m === 0 ? (FN[f] || f) + ' ho nezajímá.' : 'Váhá…') + (enc.tries >= C.hintAfter && main ? ' Tip: zkus ' + String(FN[main] || main).toLowerCase() + '.' : ' Zkus jinou potravu.');
  renderEnc();
}
function shoot() {
  const C = cfg.catch, d = Math.abs(enc.p - .5), h = enc.zone / 2;
  const q = d <= h ? Math.round(100 - (d / h) * 40) : Math.max(0, Math.round(55 - (d - h) * 200));
  if (enc.myth) { mythResult(q); return; }
  enc.shots++;
  if (q >= C.minQuality) { doCatch(q); return; }
  if (enc.shots >= C.shots) { gone(); if (dog) dog.react('sad', 3000); enc.step = 'fled'; enc.msg = 'Samé rozmazané fotky. ' + cap(fled(enc.sp)) + '.'; renderEnc(); return; }
  enc.msg = 'Rozmazané (' + q + ' %). Zkus znovu.'; renderEnc();
}
function doCatch(q) {
  const C = cfg.catch, sp = enc.sp;
  let st = spStats(sp).map(v => Math.min(C.maxStat, Math.round(v * (C.statRandomMin + Math.random() * (1 - C.statRandomMin)) * (1 + q / 100 * C.photoBonus))));
  let c = state.caught[sp.id];
  enc.isNew = !c || !c.count;
  if (enc.isNew) gainKnow('newSpecies', 'za nový druh');
  if (!c) { c = { count: 0, best: null, verified: false, photos: [] }; state.caught[sp.id] = c; }
  c.count++;
  if (c.verified) st = st.map(v => Math.min(C.maxStat, v + C.realPhotoBonus));
  const sum = a => a.reduce((x, y) => x + y, 0);
  enc.better = !c.best || sum(st) > sum(c.best.stats);
  if (enc.better) c.best = { q, stats: st, date: Date.now(), lat: enc.b.lat, lon: enc.b.lon, bio: enc.b.bio };
  enc.q = q; enc.stats = st;
  const s0 = enc.stage || 0, kE = 1 + (Number(cfg.game.evolveBoost) || 10) / 100;
  const animal = Object.assign(animalFrom(sp.id, st.map(v => Math.min(C.maxStat * (1 + s0 * .25), Math.round(v * kE ** s0))), q, enc.b.bio), { variant: enc.b.variant || '', stage: s0, from: s0 });
  c.stages = [...new Set([...(c.stages || []), s0])];
  enc.added = addAnimal(state, animal, maxPerSpecies(enc.sp));
  enc.uid = enc.added.kept ? animal.uid : null;
  gone(); enc.step = 'done'; renderEnc();
  if (dog) dog.react(enc.isNew ? 'jump' : 'joy', enc.isNew ? 3500 : 2500);
  state.counters.catches++; if (enc.isNew) state.counters.newSpecies++;
  gainXP(cfg.game.xpCatch + (enc.isNew ? cfg.game.xpNew : 0));
  progressEvent({ kind: 'catch', group: sp.group, bio: enc.b.bio });
  if (enc.isNew) progressEvent({ kind: 'newSpecies' });
}

function onModalClick(e) {
  const f = e.target.closest('[data-f]'); if (f && enc) { pickFood(f.dataset.f); return; }
  const a = e.target.closest('[data-act]'); if (!a) return;
  // nevratné akce: první ťuknutí jen připraví, druhé provede
  if (a.dataset.confirm && !a.dataset.armed) { a.dataset.armed = '1'; const t = a.textContent; a.textContent = a.dataset.confirm; setTimeout(() => { if (a.isConnected) { delete a.dataset.armed; a.textContent = t; } }, 3000); return; }
  const act = a.dataset.act;
  if (act === 'close') closeM();
  else if (act === 'shoot' && enc) shoot();
  else if (act === 'atlas') { closeM(); show('atlasv'); }
  else if (act === 'export') exportData();
  else if (act === 'install') doInstall();
  else if (act === 'admin') { closeM(); askAdmin(); }
  else if (act === 'pin') checkPin();
  else if (act === 'importOk') doImport();
  else if (act === 'menu') openMenu();
  else if (act === 'legal') openM(privacyHTML(cfg, overpassUrls(cfg), 'consentBack'));
  else if (act === 'consentBack') openConsent();
  else if (act === 'consentOk') consentOk();
  else if (act === 'legalMenu') openM(privacyHTML(cfg, overpassUrls(cfg), 'menu'));
  else if (act === 'about') openM(aboutHTML(cfg));
  else if (act === 'legalAbout') openM(privacyHTML(cfg, overpassUrls(cfg), 'about'));
  else if (act === 'wipe') openWipe();
  else if (act === 'wipeOk') wipeAll();
  else if (act === 'pinSet') openPinSet();
  else if (act === 'pinSave') savePin();
  else if (act === 'resetOk') resetProgress();
  else if (act === 'checklist') openChecklist(false);
  else if (act === 'clDev') { checklist.device = a.dataset.v; saveChecklist(); openChecklist(); }
  else if (act === 'clMark') { (checklist.items[a.dataset.id] ||= {}).m = a.dataset.v; saveChecklist(); openChecklist(); }
  else if (act === 'clSend') sendChecklist();
  else if (act === 'nick') saveNick(a.dataset.uid);
  else if (act === 'quizRead' && enc) quizRead();
  else if (act === 'quizGo' && enc) quizAsk();
  else if (act === 'quizAns' && enc) quizAnswer(Number(a.dataset.i));
  else if (act === 'profile') openProfile();
  else if (act === 'shop') openShop();
  else if (act === 'nickSave') { const n = cleanNick($('nickIn').value); if (n && badWord(n)) { $('nickErr').textContent = 'Tuhle přezdívku zvol jinou.'; return; } state.nick = n; prefs.nickAsked = true; savePrefs(); saveState(); nickLabel(); refreshJa(); closeM(); if (n) toast('Ahoj, ' + n + '! 🐕'); }
  else if (act === 'nickLater') { prefs.nickAsked = true; savePrefs(); closeM(); }
  else if (act === 'nickEdit') askNick(true);
  else if (act === 'farm') openFarm();
  else if (act === 'injured') openM(injuredHTML());
  else if (act === 'legends') openM(legendsHTML(cfg, state, BIO, daysToWindow(cfg)));
  else if (act === 'taskAns') answerTask(Number(a.dataset.i));
  else if (act === 'farmBuild') { const r = startBuild(ensureFarm(), a.dataset.id, state.cones); if (r.err) toast(r.err); else { if (r.cones) { state.cones -= r.cones; hudCones(); } saveState(); toast('🔨 Stavba začala.'); } if ($('farmv').classList.contains('on')) refreshFarmView(); else openFarm(true); }
  else if (act === 'nightCfg') openM(nightHTML());
  else if (act === 'nightMode') { prefs.night = a.dataset.v; savePrefs(); applyNight(); openM(nightHTML()); }
  else if (act === 'parentGo') parentGo();
  else if (act === 'walkMgr') openWalkMgr();
  else if (act === 'walkShow') { const p = walkPts(); if (p.length > 1 && map) { closeM(); const b = new maplibregl.LngLatBounds(); p.forEach(([a, c]) => b.extend([c, a])); follow = false; lastTouch = Date.now(); document.body.classList.add('away'); map.fitBounds(b, { padding: 60, duration: 600 }); } }
  else if (act === 'walkSave') { const p = walkPts(); if (p.length > 1) saveRoute(p, state.walk.n + ' – ' + new Date().toLocaleDateString('cs-CZ')); }
  else if (act === 'calendar') openM(calendarHTML(cfg));
  else if (act === 'trackAns' && enc && enc.step === 'track') trackAnswer(Number(a.dataset.i));
  else if (act === 'key') { keyAns = {}; openKey(); }
  else if (act === 'keyAns') { keyAns[a.dataset.k] = a.dataset.v; openKey(); }
  else if (act === 'keyBack') { const k = KEY_STEPS.filter(k => k in keyAns).pop(); delete keyAns[k]; openKey(); }
  else if (act === 'keyReset') { keyAns = {}; openKey(); }
  else if (act === 'keyPick') openDetail(a.dataset.sp);
  else if (act === 'journal') openJournal();
  else if (act === 'parent') { if (Date.now() < parentOpen) parentPanel(false); else openParent(); }
  else if (act === 'parentOk') parentPanel(true);
  else if (act === 'pKid') { parentCfg.kidMode = a.dataset.v; saveParent(); applyKidMode(); parentPanel(false); }
  else if (act === 'pBound') { const r = Number(a.dataset.r); parentCfg.bound = r && pos.lat != null ? { lat: pos.lat, lon: pos.lon, r } : null; saveParent(); clearMarkers(); refreshBirds(); parentPanel(false); }
  else if (act === 'evNew') openM(eventFormHTML(cfg));
  else if (act === 'evSave') saveEvent();
  else if (act === 'evShare') shareEvent(a.dataset.id);
  else if (act === 'evLink') shareEventLink();
  else if (act === 'evAccept' && pendingEvent) { state.events = state.events.filter(e => e.id !== pendingEvent.id).concat(pendingEvent); pendingEvent = null; saveState(); closeM(); toast('Událost přidána – najdeš ji v profilu (tlačítko Úr.).'); }
  else if (act === 'card') shareCard($('animalActs')?.dataset.uid);
  else if (act === 'contests') openContests();
  else if (act === 'dataMgr') openDataMgr();
  else if (act === 'dataClearTiles') { caches.keys().then(ks => Promise.all(ks.filter(k => k.startsWith('stopar-tiles')).map(k => caches.delete(k)))).then(() => { toast('Uložená mapa smazána.'); openDataMgr(); }); }
  else if (act === 'dataClearOsm') { clearOsmCache().then(() => { clearTrails(); drawBiotopes(); tick(); toast('Uložené biotopy smazány.'); openDataMgr(); }); }
  else if (act === 'games') openGames();
  else if (act === 'mgPlay') playMini(a.dataset.g, a.dataset.l);
  else if (act === 'mgHint') { const b = $('mgBoard'); if (b && mgImg) { b.classList.add('hint'); b.style.setProperty('--hint', 'url("' + mgImg + '")'); setTimeout(() => b.classList.remove('hint'), 1500); } }
  else if (act === 'toAtlas') { closeM(); show('atlasv'); openDetail(a.dataset.sp); }
  else if (act === 'toCollection') { const sp = SP[a.dataset.sp]; closeM(); if (sp) colView.enc = enclosureOf(cfg, sp.group).id; colView.sort = 'species'; show('sbirkav'); }
  else if (act === 'planner') openPlanner();
  else if (act === 'trip') shareTrip();
  else if (act === 'family') openFamily();
  else if (act === 'famShare') shareFam();
  else if (act === 'famAdd') { const v = $('famCode').value, r = readWeekCode(v); if (!r) $('famErr').textContent = 'Kód nesedí – zkontroluj ho.'; else if (r.week !== weekNumber()) $('famErr').textContent = 'Tenhle kód je z jiného týdne.'; else { if (!state.fam.codes.includes(v.toUpperCase())) state.fam.codes.push(v.toUpperCase()); saveState(); openFamily(); } }
  else if (act === 'offline') openOffline();
  else if (act === 'offR') { off.r = Number(a.dataset.v); renderOffline(); }
  else if (act === 'offGo') offlineGo();
  else if (act === 'offStop') { if (off.ctrl) off.ctrl.abort(); }
  else if (act === 'offDel') offlineDel(a.dataset.id);
  else if (act === 'plSearch') plSearch();
  else if (act === 'plPick') { const r = pl.results[Number(a.dataset.i)]; if (r) { pl.start = [r.lat, r.lon]; pl.startName = r.name; pl.results = []; showStart(true); openPlanner(); } }
  else if (act === 'plHere') { e.preventDefault(); pl.start = null; pl.startName = ''; showStart(true); openPlanner(); }
  else if (act === 'plTap') { e.preventDefault(); pl.tap = true; closeM(); toast('Ťukni do mapy, kde má trasa začít.'); }
  else if (act === 'plMood') { pl.mood = a.dataset.v; pl.len = Number($('plLen').value) || pl.len; pl.rewards = $('plRew').checked; openPlanner(); }
  else if (act === 'plGo') { plBusy = true; plGo().finally(() => { plBusy = false; }); }
  else if (act === 'plSel') { pl.sel = Number(a.dataset.i); showPlanPanel(); redrawPlan(); }
  else if (act === 'plStart') { const L = pl.loops[pl.sel]; if (L) startWalk(L.coords, (L.closed ? 'Okruh ' : 'Trasa ') + (L.len / 1000).toFixed(1).replace('.', ',') + ' km'); }
  else if (act === 'plMini') { pl.mini = !pl.mini; showPlanPanel(); }
  else if (act === 'plKmh') { prefs.kmh = Number(a.dataset.v); savePrefs(); showPlanPanel(); }
  else if (act === 'plClosed') { const L = pl.loops[pl.sel]; if (L) planSet(L.ids, !L.closed); }
  else if (act === 'plPoints') { const L = pl.loops[pl.sel]; if (L) openM(pointsHTML(L, pl.names, planMinutes())); }
  else if (act === 'ptUp' || act === 'ptDown' || act === 'ptDel') {
    const L = pl.loops[pl.sel], k = Number(a.dataset.k); if (!L || !k) return;
    const ids = L.ids.slice();
    if (act === 'ptDel') ids.splice(k, 1); else { const j = act === 'ptUp' ? k - 1 : k + 1; if (j < 1 || j >= ids.length) return; [ids[k], ids[j]] = [ids[j], ids[k]]; }
    if (planSet(ids)) openM(pointsHTML(pl.loops[pl.sel], pl.names, planMinutes()));
  }
  else if (act === 'plProf') {
    const pr = planProf(), r = a.getBoundingClientRect(); if (!pr || !r.width) return;
    const total = pr.d[pr.d.length - 1], want = Math.max(0, Math.min(1, (e.clientX - r.left) / r.width)) * total;
    let i = 0; while (i + 1 < pr.d.length && pr.d[i + 1] <= want) i++;
    pl.mark = i; showMark(pr.p[i]); showPlanPanel();
    toast(Math.round(pr.d[i] / 100) / 10 + ' km' + (pr.h[i] != null ? ' · ' + pr.h[i] + ' m n. m.' : ''));
  }
  else if (act === 'plSave') { const L = pl.loops[pl.sel]; if (L) saveRoute(L.coords, 'Okruh ' + (L.len / 1000).toFixed(1).replace('.', ',') + ' km – ' + new Date().toLocaleDateString('cs-CZ')); }
  else if (act === 'plCancel') { planMarkers.forEach(m => m.remove()); planMarkers = []; hidePlanPanel(); showStart(false); }
  else if (act === 'rtWalk') { const r = state.routes.find(x => x.id === a.dataset.id); if (r) { closeM(); startWalk(decodePolyline(r.p), r.n); } }
  else if (act === 'rtShare') shareRoute(a.dataset.id);
  else if (act === 'rtLink') shareRouteLink();
  else if (act === 'farmLink') shareFarmLink();
  else if (act === 'rtDel') { state.routes = state.routes.filter(r => r.id !== a.dataset.id); saveState(); openPlanner(); }
  else if (act === 'walkEnd') { state.walk = null; saveState(); redrawPlan(); refreshWalkMarkers(); closeM(); toast('Trasa ukončena.'); }
  else if (act === 'treasures') openM(treasuresHTML(state));
  else if (act === 'trNew') openM(treasureFormHTML());
  else if (act === 'trSave') saveTreasure();
  else if (act === 'trShare') shareTreasure(a.dataset.id);
  else if (act === 'trLink') shareTreasureLink();
  else if (act === 'trDel') { state.treasures = state.treasures.filter(t => t.id !== a.dataset.id); saveState(); refreshPlaces(); openM(treasuresHTML(state)); }
  else if (act === 'cPick') { curGame = a.dataset.g; curMode = a.dataset.mode || 'race'; openM(pickHTML(cfg, state, SP, curGame, curMode)); }
  else if (act === 'cStart') startGame(a.dataset.g || curGame, a.dataset.uid, a.dataset.mode || curMode);
  else if (act === 'cCompare') $('cCmp').textContent = compareText($('cCode').value, state);
  else if (act === 'cShare') shareScore(a);
  else if (act === 'jNew') { jPhoto = null; openM(journalFormHTML(cfg)); }
  else if (act === 'jSave') saveJournal();
  else if (act === 'jDel') { state.journal = state.journal.filter(e => e.id !== a.dataset.id); saveState(); openJournal(); }
  else if (['train', 'evolve', 'feed', 'release'].includes(act)) animalAct(act, $('animalActs')?.dataset.uid, a.dataset.item);
  else if (act === 'buy') { const r = buy(cfg, state, a.dataset.item); toast(r === 'ok' ? 'Koupeno, je v batohu.' : 'Nemáš dost šišek.'); saveState(); hudCones(); openShop(); }
  else if (act === 'useItem') { const it = useItem(cfg, state, a.dataset.item); if (it) { state.radiusUntil = Date.now() + cfg.game.radiusMinutes * 60000; toast(it.icon + ' ' + it.name + ': větší dosah na ' + cfg.game.radiusMinutes + ' min'); updateGame(); refreshBirds(); saveState(); } openShop(); }
  else if (act === 'lure' && enc) { if (useItem(cfg, state, a.dataset.item)) { enc.lure = true; enc.msg = 'Návnada připravena – teď vyber potravu.'; saveState(); renderEnc(); } }
  else if (act === 'lens' && enc) { if (useItem(cfg, state, a.dataset.item)) { enc.lens = true; enc.msg = 'Nasadil jsi objektiv.'; saveState(); renderEnc(); } }
  else if (act.startsWith('look')) onLookClick(act, a);
}
function onModalChange(e) {
  if (onLookChange(e.target)) return;
  if (e.target.dataset.deed && e.target.files && e.target.files[0]) { doDeed(e.target.dataset.deed, e.target.files[0]); return; }
  if (e.target.dataset.farm === 'auto') { ensureFarm().auto = e.target.checked; saveState(); farmTick(true); return; }
  if (e.target.dataset.pref) { prefs[e.target.dataset.pref] = e.target.checked; savePrefs(); checkMute(); applyNight(); return; }
  const real = e.target.closest('input[data-real]');
  if (real && real.files && real.files[0]) { addRealPhoto(real.dataset.real, real.files[0]); return; }
  const imp = e.target.closest('input[data-import]');
  if (imp && imp.files && imp.files[0]) { readImport(imp.files[0]); return; }
  if (e.target.id === 'jPhoto' && e.target.files && e.target.files[0]) resizeImage(e.target.files[0], 800).then(img => { jPhoto = img; if ($('jInfo')) $('jInfo').textContent = 'Fotka připravena. Uloží se čas a místo (přibližně na 100 m).'; }).catch(() => toast('Fotku se nepodařilo načíst.'));
}

/* ---------- atlas ---------- */
// Filtry atlasu (ikony, víc jich jde zapnout naráz; v jedné řadě = „nebo“, mezi řadami = „a“)
const flt = { g: new Set(), r: new Set(), x: new Set(), b: new Set(), s: new Set() };
const SEASONS = [['jaro', 'Jaro', [3, 4, 5]], ['leto', 'Léto', [6, 7, 8]], ['podzim', 'Podzim', [9, 10, 11]], ['zima', 'Zima', [12, 1, 2]]];
const spBios = s => String(s.bio || '').split(',').map(x => x.split(':')[0].trim()).filter(Boolean);
function toggleFilter(k, v) { const set = flt[k]; set.has(v) ? set.delete(v) : set.add(v); renderAtlas(); }
function passFilter(s) {
  const c = state.caught[s.id], ok = !!(c && c.count);
  if (flt.g.size && !flt.g.has(s.group || 'Ostatní')) return false;
  if (flt.r.size && !flt.r.has(String(s.rarity))) return false;
  if (flt.x.has('caught') && !ok) return false;
  if (flt.x.has('missing') && ok) return false;
  if (flt.x.has('night') && !s.night) return false;
  if (flt.x.has('verified') && !(c && c.verified)) return false;
  if (flt.b.size && !spBios(s).some(b => flt.b.has(b))) return false;
  if (flt.s.size) { const m = parseMonths(s.months); if (m.size && !SEASONS.some(([k, , ms]) => flt.s.has(k) && ms.some(x => m.has(x)))) return false; }
  return true;
}
function filterBar(all) {
  const groups = [...new Set(all.map(s => s.group || 'Ostatní'))];
  const btn = (k, v, icon, label) => `<button class="ico${flt[k].has(v) ? ' on' : ''}" data-flt="${k}" data-v="${esc(v)}" aria-pressed="${flt[k].has(v)}" aria-label="${esc(label)}" title="${esc(label)}"><span aria-hidden="true">${icon}</span></button>`;
  const bios = cfg.biotopes.filter(b => all.some(s => spBios(s).includes(b.id)));
  return `<div class="iconbar">${groups.map(g => btn('g', g, groupIcon(g), g)).join('')}</div>
  <div class="iconbar">${bios.map(b => btn('b', b.id, ic('bio_' + b.id).replace(/<\/?span[^>]*>/g, '') || '•', b.name)).join('')}</div>
  <div class="iconbar">${SEASONS.map(([k, n]) => btn('s', k, ic('s_' + k).replace(/<\/?span[^>]*>/g, ''), n)).join('')}</div>
  <div class="iconbar">${cfg.rarities.map((r, i) => btn('r', String(r.id), '★'.repeat(i + 1), r.name)).join('')}${btn('x', 'caught', '✔', 'Chycené')}${btn('x', 'missing', '?', 'Nechycené')}${btn('x', 'night', '🌙', 'Noční')}${btn('x', 'verified', '📷', 'Ověřené fotkou')}</div>`;
}
// Atlas zvířat: druhy + poznávání (klíč, deník, kalendář, zraněné zvíře) na jednom místě
function atlasTabs() {
  const t = [['key', 'key', 'Určovací klíč'], ['journal', 'journal', 'Deník'], ['calendar', 'calendar', 'Kalendář'], ['legends', 'myth', 'Pověsti'], ['injured', 'injured', 'Zraněné zvíře']];
  return `<div class="atabs"><button class="on">${ic('atlas')} Druhy</button>${t.map(([a, i, n]) => `<button data-act="${a}">${ic(i)} ${n}</button>`).join('')}</div>`;
}
function renderAtlas() {
  const all = cfg.species.filter(s => s.active), act = all.filter(passFilter);
  const n = act.filter(s => state.caught[s.id]?.count).length;
  const groups = [...new Set(act.map(s => s.group || 'Ostatní'))];
  const nAll = all.filter(s => state.caught[s.id]?.count).length;
  $('atlasv').innerHTML = atlasTabs() + `<div class="ahead"><b>Atlas zvířat</b><span>${nAll} / ${all.length}</span></div><div class="prog"><div style="width:${all.length ? nAll / all.length * 100 : 0}%"></div></div>${filterBar(all)}${act.length ? '' : '<p class="msg">Filtru nic neodpovídá.</p>'}` +
    groups.map(g => `${groups.length > 1 ? `<div class="grp">${esc(g)}</div>` : ''}<div class="grid">${act.filter(s => (s.group || 'Ostatní') === g).map(s => {
      const c = state.caught[s.id], ok = (c && c.count) || cfg.general.unlockAll;
      return `<div class="acard${ok ? '' : ' miss'}" data-sp="${esc(s.id)}"><div class="im">${birdImg(s)}</div><div class="nm">${ok ? esc(s.name) : '???'}</div><div class="rr">${esc(RAR[s.rarity]?.name || '')}${c && c.count ? ' · ×' + c.count : ''}${c && c.verified ? ' · ověřen' : ''}</div></div>`;
    }).join('')}</div>`).join('') + mythsHTML(cfg, state);
}
// Vzdělávací údaje v atlasu, odemykané podle počtu úlovků a skutečné fotky
const EDU_SECTIONS = [
  ['id', 'Zařazení a poznávání'], ['care', 'Ochrana a zajímavosti'], ['life', 'Rozmnožování a život'], ['signs', 'Hlas a pobytová znamení']
];
function eduHTML(sp, c) {
  const e = sp.edu || {}, A = cfg.atlas, n = c.count || 0;
  const lock = {
    id: n >= A.basicAt ? '' : `po ${A.basicAt}. úlovku`,
    care: n >= A.basicAt ? '' : `po ${A.basicAt}. úlovku`,
    life: n >= A.lifeAt ? '' : `po ${A.lifeAt}. úlovku (máš ${n})`,
    signs: A.signsNeedPhoto ? (c.verified ? '' : 'se skutečnou fotkou z terénu') : (n >= A.lifeAt ? '' : `po ${A.lifeAt}. úlovku (máš ${n})`)
  };
  const row = ([k, label]) => {
    const v = String(e[k] || '').trim(); if (!v) return '';
    if (k === 'facts') return `<ul class="facts">${v.split('\n').filter(Boolean).map(x => `<li>${esc(x)}</li>`).join('')}</ul>`;
    if (k === 'sources') return `<div class="kv src"><span>Zdroje:</span> ${v.split('\n').filter(Boolean).map(u => /^https:\/\//.test(u) ? `<a href="${esc(u)}" target="_blank" rel="noopener">${esc(shortUrl(u))}</a>` : esc(u)).join(', ')}</div>`;
    return `<div class="kv"><span>${esc(label.replace(/ \(.*\)$/, ''))}:</span> ${esc(v)}</div>`;
  };
  return EDU_SECTIONS.map(([sec, title]) => {
    const fields = EDU_FIELDS.filter(f => f[3] === sec), body = fields.map(row).join('');
    if (!body) return '';
    return `<details class="edu"${lock[sec] ? '' : ' open'}><summary>${esc(title)}${lock[sec] ? ' <span class="lock">zamčeno</span>' : ''}</summary>${lock[sec] ? `<p class="msg small">Odemkne se ${esc(lock[sec])}.</p>` : body}</details>`;
  }).join('') + (sp.review ? '<p class="msg small">Údaje čekají na odbornou kontrolu.</p>' : '');
}
// Kde ve výšce druh hledat (jen pásma s nenulovou váhou)
function altHint(sp) {
  const a = Object.entries(parseMap(sp.alt)).filter(([, w]) => w > 0).map(([z]) => zoneName(z));
  const m = formatMonths(sp.months);
  return (a.length ? ' – ' + a.map(esc).join(', ') : '') + (m ? '; jen ' + esc(m) : '');
}
function stageSwipe() {
  const sw = $('stagesw'); if (!sw) return; const dots = [...document.querySelectorAll('.stgdots i')], ad = dots.findIndex(d => d.classList.contains('on'));
  sw.scrollLeft = sw.clientWidth * Math.max(0, ad);
  sw.addEventListener('scroll', () => { const i = Math.round(sw.scrollLeft / sw.clientWidth); dots.forEach((d, k) => d.classList.toggle('on', k === i)); }, { passive: true });
}
async function openDetail(id) {
  const sp = SP[id], c = state.caught[id], ok = c && c.count, all = !!cfg.general.unlockAll;
  const names = stageNames(cfg, sp.group), known = knownStages(c, state.animals, id), adult = names.length >= 4 ? 2 : 1;
  let h = `<div class="stagesw" id="stagesw">${names.map((nm, i) => { const k = all || (ok && known.has(i)); return `<div class="stg"><div class="encimg${k ? '' : ' sil'}">${birdImg(sp, '', i)}</div><div class="stgn">${k ? esc(nm) : '???'}</div>${k ? `<div class="stgf">jí: ${esc(foodFor(cfg, sp, i) ? Object.keys(parseMap(foodFor(cfg, sp, i))).map(f => FN[f] || f).join(', ') : 'nejí (kukla)')}</div>` : ''}</div>`; }).join('')}</div>
  <div class="stgdots">${names.map((_, i) => `<i class="${all || (ok && known.has(i)) ? 'k' : ''}${i === adult ? ' on' : ''}"></i>`).join('')}</div><h2>${ok || all ? esc(sp.name) : '???'}</h2>`;
  if (ok) {
    h += `<div class="sub">${esc(sp.lat)}</div>${chips(sp)}${statsHTML(c.best.stats)}
    <div class="kv"><span>Úlovků:</span> ${c.count} · <span>nejlepší fotka:</span> ${c.best.q} %${c.verified ? ' · <span>ověřen v terénu</span>' : ''}</div>
    ${formatMonths(sp.months) ? `<div class="kv"><span>U nás:</span> ${esc(formatMonths(sp.months))}</div>` : ''}
    <div class="kv"><span>Potrava:</span> ${Object.keys(parseMap(sp.food)).map(f => esc(String(FN[f] || f).toLowerCase())).join(', ')}</div>
    <div class="fact">${esc(sp.fact)}</div>${eduHTML(sp, c)}`;
    const ph = [];
    for (const pid of (c.photos || [])) { try { const p = await store.get(pid, 'photos'); if (p) ph.push(p); } catch (e) {} }
    if (ph.length) h += `<div class="kv"><span>Tvoje fotky z terénu:</span></div><div class="thumbs">${ph.map(p => safeImage(p.img) ? `<img src="${esc(p.img)}" alt="">` : '').join('')}</div>`;
  } else if (all) { // odemčeno v adminu: údaje o druhu bez úlovků
    h += `<div class="sub">${esc(sp.lat)}</div>${chips(sp)}
    ${formatMonths(sp.months) ? `<div class="kv"><span>U nás:</span> ${esc(formatMonths(sp.months))}</div>` : ''}
    <div class="kv"><span>Potrava:</span> ${Object.keys(parseMap(sp.food)).map(f => esc(String(FN[f] || f).toLowerCase())).join(', ')}</div>
    <div class="fact">${esc(sp.fact)}</div>`;
  } else {
    h += `<p class="msg">Ještě ho nemáš. Hledej: ${Object.keys(parseMap(sp.bio)).map(b => esc(String(BIO[b]?.name || b).toLowerCase())).join(', ')}${altHint(sp)}${sp.night ? ' (jen v noci)' : ''}.</p>`;
  }
  const mine = state.animals.filter(x => x.sp === id).length;
  if (mine) h += `<button class="btn full" data-act="toCollection" data-sp="${esc(id)}">Ve sbírce (${mine})</button>`;
  h += `<label class="btn primary full">Vyfotil jsem ho venku<input type="file" accept="image/*" capture="environment" data-real="${esc(id)}" hidden></label>
  <p class="msg small">Skutečná fotka dá jednorázově +${cfg.catch.realPhotoBonus} ke všem statistikám. Druh zatím určuješ ty.</p>
  <button class="btn full" data-act="close">Zavřít</button>`;
  enc = null; openM(h); stageSwipe();
}
function resizeImage(file, max, type = 'image/jpeg', q = .75) {
  return new Promise((res, rej) => {
    const fr = new FileReader();
    fr.onload = () => {
      const im = new Image();
      im.onload = () => {
        const k = Math.min(1, max / Math.max(im.width, im.height)), c = document.createElement('canvas');
        c.width = Math.round(im.width * k); c.height = Math.round(im.height * k);
        c.getContext('2d').drawImage(im, 0, 0, c.width, c.height);
        res(c.toDataURL(type, q));
      };
      im.onerror = rej; im.src = fr.result;
    };
    fr.onerror = rej; fr.readAsDataURL(file);
  });
}
async function addRealPhoto(id, file) {
  try {
    const img = await resizeImage(file, 800);
    const sp = SP[id];
    const pid = await store.addPhoto({ sp: id, img, date: Date.now(), lat: pos.lat, lon: pos.lon });
    let c = state.caught[id];
    if (!c) { c = { count: 0, best: null, verified: false, photos: [] }; state.caught[id] = c; }
    if (!c.count) { c.count = 1; c.best = { q: 100, stats: spStats(sp), date: Date.now() }; addAnimal(state, animalFrom(id, c.best.stats, 100, ''), maxPerSpecies(sp)); }
    if (!c.verified) { c.verified = true; c.best.stats = c.best.stats.map(v => Math.min(cfg.catch.maxStat, v + cfg.catch.realPhotoBonus)); state.counters.verified++; gainXP(cfg.game.xpVerified); progressEvent({ kind: 'photo' }); }
    c.photos = [pid, ...(c.photos || [])];
    saveState(); renderAtlas(); openDetail(id); toast(sp.name + ': fotka uložena.');
  } catch (e) { toast('Fotku se nepodařilo uložit.'); }
}

/* ---------- sbírka ---------- */
const colView = { enc: '', sort: 'new' };
function renderCollection() { $('sbirkav').innerHTML = (cfg.farm.enabled ? `<button class="btn full farmbtn" data-act="farm">← ${ic('farm')} Zpět na farmu</button>` : '') + collectionHTML(cfg, state, SP, colView); }
function openAnimal(uid) {
  const a = state.animals.find(x => x.uid === uid), sp = a && SP[a.sp]; if (!sp) return;
  const e = enclosureOf(cfg, sp.group);
  openM(`<div class="encimg${a.variant ? ' var-' + esc(a.variant) : ''}${isMaster(cfg, a, sp.group) ? ' master' : ''}">${birdImg(sp, '', a.stage)}</div><h2>${esc(a.nick || sp.name)}${stars(a.stage)}</h2><div class="sub">${esc(stageNames(cfg, sp.group)[a.stage] || '')}${a.stage > (a.from || 0) ? ` · 🍼 vypiplaný (chycen jako ${esc(stageNames(cfg, sp.group)[a.from || 0] || '')})` : ''}</div><div class="sub">${a.nick ? esc(sp.name) + ' · ' : ''}${esc(sp.lat)}</div>
  ${statsHTML(a.stats)}<div class="kv"><span>Síla:</span> ${power(a)} · <span>chycen:</span> ${new Date(a.date).toLocaleDateString('cs-CZ')}${a.bio ? ' · <span>biotop:</span> ' + esc(BIO[a.bio]?.name || a.bio) : ''}${a.variant ? ' · <span>vzácná forma:</span> ' + esc(variantName(a.variant)) : ''}</div>
  <div class="kv"><span>Ubikace:</span> ${esc(e.icon)} ${esc(e.name)}</div>
  <div class="presetnew"><input type="text" id="nick" maxlength="20" placeholder="Přezdívka" aria-label="Přezdívka" value="${esc(a.nick || '')}"><button class="btn" data-act="nick" data-uid="${esc(uid)}">Uložit</button></div>
  <p class="msg small" id="nickErr"></p>
  <div id="animalActs" data-uid="${esc(uid)}">${animalActionsHTML(cfg, state, a, sp, can)}</div>
  <button class="btn full" data-act="card">Sdílet kartu (bez polohy)</button>
  <button class="btn full" data-act="toAtlas" data-sp="${esc(a.sp)}">V atlasu: ${esc(sp.name)}</button>
  <button class="btn full" data-act="close">Zavřít</button>`);
}
function animalAct(act, uid, item) {
  const a = state.animals.find(x => x.uid === uid), sp = a && SP[a.sp]; if (!sp) return;
  if (act === 'train') {
    const r = train(cfg, state, a, new Date().toISOString().slice(0, 10));
    toast(r === 'ok' ? 'Trénink: +' + cfg.game.trainXp + ' XP jedince' : r === 'limit' ? 'Dnes už toho natrénoval dost, zkus to zítra.' : 'Nemáš dost šišek.');
  } else if (act === 'evolve') {
    const r = evolve(cfg, state, a, sp.group);
    if (r === 'ok' && state.caught[sp.id]) state.caught[sp.id].stages = [...new Set([...(state.caught[sp.id].stages || []), a.stage])];
    if (r === 'ok') { toast(sp.name + ': ' + stageNames(cfg, sp.group)[a.stage] + '!'); progressEvent({ kind: 'evolve' }); }
    else toast(r === 'axp' ? 'Jedinec potřebuje víc XP (trénink, krmení).' : r === 'points' ? 'Chybí vědomosti 📖 – získáš je kvízy, stopami, úkoly u krmítek a deníkem.' : 'Už je v nejvyšším stádiu.');
  } else if (act === 'feed') {
    const it = useItem(cfg, state, item); if (it) { a.axp += Number(it.value) || 0; toast(it.icon + ' ' + it.name + ': +' + it.value + ' XP jedince'); }
  } else if (act === 'release') {
    const v = release(cfg, state, a, sp); closeM(); renderCollection(); hudCones();
    let host = '';
    if (cfg.farm.enabled) { const f = ensureFarm(), e = enclosureOf(cfg, sp.group); if ((f.lv['enc_' + e.id] || 0) > 0) { const g = (f.guests[e.id] ||= []); if (!g.includes(sp.id)) { g.push(sp.id); if (g.length > 8) g.shift(); } host = ' Bude se vracet na farmu jako host.'; } }
    toast((a.nick || sp.name) + ' se vrátil do přírody. +' + v + ' 📖' + host); progressEvent({ kind: 'release' }); return;
  }
  saveState(); hudCones(); renderCollection(); openAnimal(uid);
}
function saveNick(uid) {
  const a = state.animals.find(x => x.uid === uid); if (!a) return;
  const n = cleanNick($('nick').value);
  if (n && badWord(n)) { $('nickErr').textContent = 'Tohle jméno nejde, vymysli jiné.'; return; }
  if (n) a.nick = n; else delete a.nick;
  saveState(); renderCollection(); openAnimal(uid); toast(n ? 'Přezdívka uložena.' : 'Přezdívka smazána.');
}

/* ---------- menu, záloha, instalace ---------- */
function openMenu() { closeM(); show('jav'); }
async function doInstall() { if (!installEvt) return; installEvt.prompt(); try { await installEvt.userChoice; } catch (e) {} installEvt = null; closeM(); }

async function exportData(withConfig = false) {
  saveState();
  const photos = await store.all('photos').catch(() => []);
  const data = { app: 'stopar', format: 1, exported: new Date().toISOString(), state, photos };
  if (withConfig) data.config = cfg;
  download(JSON.stringify(data), 'stopar-zaloha-' + new Date().toISOString().slice(0, 10) + '.json');
  toast('Záloha uložena do stažených souborů.');
}
let pendingImport = null;
function readImport(file) {
  const fr = new FileReader();
  fr.onload = async () => {
    let d;
    try { d = JSON.parse(fr.result); if (d.app !== 'stopar' || !d.state) throw new Error('bad'); }
    catch (e) { toast('Soubor není záloha Stopaře.'); return; }
    pendingImport = d;
    const n = Object.values(d.state.caught || {}).filter(c => c.count).length;
    openM(`<h2>Obnovit zálohu?</h2><p class="msg">Záloha z ${esc(new Date(d.exported).toLocaleString('cs-CZ'))}: ${n} druhů, ${(d.photos || []).length} fotek.<br>Současný postup se přepíše.</p>
    ${d.config ? '<label class="fld row">Obnovit i nastavení adminu<input type="checkbox" id="impCfg"></label>' : ''}
    ${await pinFieldIfSet()}
    <button class="btn primary full" data-act="importOk">Obnovit</button><button class="btn full" data-act="menu">Zpět</button>`);
  };
  fr.readAsText(file);
}
async function doImport() {
  const d = pendingImport; if (!d || !await pinGate()) return;
  const withCfg = $('impCfg') && $('impCfg').checked;
  const newState = cleanState(d.state);
  const photos = (Array.isArray(d.photos) ? d.photos : []).map(cleanPhoto).filter(Boolean);
  try { await store.restore(newState, photos); }
  catch (e) { toast('Obnova se nepovedla, původní data zůstala.'); return; }
  state = newState;
  if (withCfg && d.config) await saveConfig(mergeDefaults(d.config));
  pendingImport = null; closeM(); hudDist(); hudLevel(); hudCones(); clearMarkers(); refreshBirds(); renderAtlas(); toast('Záloha obnovena.');
}

/* ---------- admin ---------- */
function askAdmin() {
  openM(`<h2>Admin</h2><div class="fld"><label for="pin">PIN</label><input type="password" id="pin" inputmode="numeric" autocomplete="off"></div>
  <p class="msg small" id="pinErr"></p><button class="btn primary full" data-act="pin">Vstoupit</button><button class="btn full ghost" data-act="close">Zrušit</button>`);
  setTimeout(() => $('pin') && $('pin').focus(), 50);
  $('pin').addEventListener('keydown', e => { if (e.key === 'Enter') checkPin(); });
}
function checkPin() {
  if ($('pin').value !== String(cfg.general.adminPin)) { $('pinErr').textContent = 'Špatný PIN.'; return; }
  closeM();
  document.querySelector('nav').style.display = 'none';
  show('adminv');
  openAdmin($('adminv'), cfg, {
    save: c => saveConfig(c),
    close: () => { document.querySelector('nav').style.display = ''; show('mapv'); },
    exportAll: () => exportData(true),
    clearOsm: async () => { await clearOsmCache(); clearTrails(); drawBiotopes(); tick(); toast('Cache biotopů smazána.'); },
    resetProgress: async () => openM(`<h2>Smazat postup?</h2><p class="msg">Smažou se úlovky a fotky.</p>${await pinFieldIfSet()}
      <button class="btn danger full" data-act="resetOk">Smazat postup</button><button class="btn full ghost" data-act="close">Zrušit</button>`),
    respawn: () => { state.gone = {}; clearMarkers(); refreshBirds(); toast('Zvířata obnovena.'); },
    info: () => ({ slot: currentSlot(cfg), birds: birds.length, features: loadedFeatures().length, night: isNight(), pos: { ...pos }, alt: elevationAt(pos.lat, pos.lon), region: currentRegion(cfg).id, month: currentMonth(cfg) + (Number(cfg.general.monthOverride) ? ' (simulovaný)' : ''), code: spawnCode(cfg), osmError: osmStatus.error })
  });
}

// Ladicí vrstva: biotopy tak, jak je hra skutečně načetla z Overpass ([lat,lon] → GeoJSON [lon,lat])
function biotopeGeo() {
  const col = Object.fromEntries(cfg.biotopes.map(b => [b.id, b.color]));
  const flip = ring => ring.map(([la, lo]) => [lo, la]);
  const features = [];
  for (const f of loadedFeatures()) {
    const color = col[f.b] || '#888888';
    if (f.line) features.push({ type: 'Feature', properties: { color }, geometry: { type: 'LineString', coordinates: flip(f.outer[0]) } });
    else for (const o of f.outer) features.push({ type: 'Feature', properties: { color }, geometry: { type: 'Polygon', coordinates: [flip(o), ...f.inner.map(flip)] } });
  }
  return { type: 'FeatureCollection', features };
}
// Biotopy z načtených dlaždic mapy – záloha na nových místech, než dorazí data z Overpassu
function tileBio() {
  if (!map || !map.getSource('om') || map.getZoom() < 12) return;
  const feats = [];
  for (const sourceLayer of ['landcover', 'landuse', 'water', 'waterway', 'place']) try { for (const f of map.querySourceFeatures('om', { sourceLayer })) feats.push({ sourceLayer, properties: f.properties, geometry: f.geometry }); } catch (e) {}
  // pokrytí = dlaždice (nejvýš z14, víc vektorová mapa nemá) přes celý výřez mapy
  const z = Math.min(14, Math.floor(map.getZoom())), n = 2 ** z, bd = map.getBounds(), rad = Math.PI / 180;
  const tx = lon => Math.floor((lon + 180) / 360 * n), ty = lat => Math.floor((1 - Math.log(Math.tan(lat * rad) + 1 / Math.cos(lat * rad)) / Math.PI) / 2 * n);
  const lonOf = x => x / n * 360 - 180, latOf = y => Math.atan(Math.sinh(Math.PI * (1 - 2 * y / n))) / rad;
  tileBiotopes(feats, [latOf(ty(bd.getSouth()) + 1), lonOf(tx(bd.getWest())), latOf(ty(bd.getNorth())), lonOf(tx(bd.getEast()) + 1)]);
  if (pos.lat != null) { refreshBirds(); hudBio(); }
}
function drawBiotopes() { bioPending = true; flushMap(); }

/* ---------- service worker ---------- */
function registerSW() {
  if (!('serviceWorker' in navigator)) return;
  navigator.serviceWorker.register('sw.js').then(reg => {
    const notify = w => banner('Je k dispozici nová verze.', { label: 'Aktualizovat', fn: () => { updating = true; w.postMessage({ type: 'skipWaiting' }); } });
    if (reg.waiting && navigator.serviceWorker.controller) notify(reg.waiting);
    reg.addEventListener('updatefound', () => {
      const w = reg.installing;
      w && w.addEventListener('statechange', () => { if (w.state === 'installed' && navigator.serviceWorker.controller) notify(w); });
    });
    swConfig();
  }).catch(() => {});
  // Znovu načíst jen po ťuknutí na „Aktualizovat“; při první návštěvě převezme SW stránku bez reloadu
  let updating = false, reloading = false;
  navigator.serviceWorker.addEventListener('controllerchange', () => { swConfig(); if (updating && !reloading) { reloading = true; location.reload(); } });
}
function swConfig() {
  try { navigator.serviceWorker && navigator.serviceWorker.controller && navigator.serviceWorker.controller.postMessage({ type: 'config', tileCacheMax: cfg.map.tileCacheMax }); } catch (e) {}
}

init();
