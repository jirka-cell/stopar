import { esc, DEFAULTS, mergeDefaults, parseMap, parseNums, clone, safeImage, presetLayers, EDU_FIELDS, parseZones, zoneFor, zoneName, formatMonths, compactConfig } from './config.js';
import { store, persist } from './store.js';
import { dist, sunAltitude } from './geo.js';
import { osmSetConfig, ensureArea, biotopeAt, errorAt, status as osmStatus, loadedFeatures, clearOsmCache, overpassUrls, protectedAt, spawnAllowed, targetsNear } from './osm.js';
import { refreshWeather, weatherCond, WEATHER_ICON, WEATHER_NAME, activeEvents, speciesMult, inQuietMonths, variantFor, protectedHTML, protectedType, wikiSummary, calendarHTML, cleanStamps, stampsHTML } from './world.js';
import { visibleBirds, currentSlot, currentRegion, currentMonth, spawnCode } from './spawn.js';
import { elevSetConfig, elevationAt } from './elevation.js';
import { birdImg, birdURL } from './birds.js';
import { openAdmin, download } from './admin.js';
import { makeStyle, styleIdFor, circle, CONTOUR_THRESHOLDS, STYLES } from './mapstyle.js';
import { TERMS_VERSION, APP_VERSION, MIN_AGE, ageFrom, consentValid, consentHTML, privacyHTML, aboutHTML, PIN_RE, newPin, verifyPin, pinSetHTML } from './legal.js';
import { checklistHTML, checklistText, emptyChecklist } from './checklist.js';
import { levelFor, levelNeeded, cleanProgress, checkBadges, questEvent, makeQuiz, profileHTML, unlockName } from './progress.js';
import { evolve, train, release, buy, useItem, invOf, cleanInv, isMaster, stageNames, animalActionsHTML, shopHTML, coneIcon } from './economy.js';
import { isTrack, trackQuiz, trackHTML, keyHTML, KEY_STEPS, cleanJournal, journalHTML, journalFormHTML, entryName } from './field.js';
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
  if (!s || typeof s !== 'object') return Object.assign(out, cleanProgress({}), { inv: {}, radiusUntil: 0, stamps: {}, journal: [] });
  if (s.last && Number.isFinite(Number(s.last.lat)) && Number.isFinite(Number(s.last.lon))) out.last = { lat: num(s.last.lat), lon: num(s.last.lon) };
  for (const [k, v] of Object.entries(s.gone || {})) out.gone[String(k)] = num(v);
  for (const [id, c] of Object.entries(s.caught || {})) {
    if (!c || typeof c !== 'object') continue;
    const b = c.best && typeof c.best === 'object' ? c.best : null;
    out.caught[String(id)] = {
      count: Math.max(0, Math.round(num(c.count))), verified: !!c.verified,
      photos: Array.isArray(c.photos) ? c.photos.map(Number).filter(Number.isFinite) : [],
      best: b ? { q: num(b.q), stats: Array.isArray(b.stats) ? b.stats.map(v => num(v)) : [], date: num(b.date), lat: b.lat == null ? null : num(b.lat), lon: b.lon == null ? null : num(b.lon), bio: String(b.bio ?? '') } : null
    };
    if (out.caught[id].count && !out.caught[id].best) out.caught[id].count = 0;
  }
  // jedinci: starší uložení je nemá → první jedinec z nejlepšího kusu druhu
  out.animals = Array.isArray(s.animals) ? s.animals.map(cleanAnimal).filter(Boolean) : migrateAnimals({ caught: out.caught }).animals;
  return Object.assign(out, cleanProgress(s), { inv: cleanInv(s.inv), radiusUntil: num(s.radiusUntil), stamps: cleanStamps(s.stamps), journal: cleanJournal(s.journal) });
}
const cleanPhoto = p => p && typeof p === 'object' && safeImage(p.img) && Number.isFinite(Number(p.id))
  ? { id: Number(p.id), sp: String(p.sp ?? ''), img: p.img, date: num(p.date), lat: p.lat == null ? null : num(p.lat), lon: p.lon == null ? null : num(p.lon) } : null;

let cfg = clone(DEFAULTS);
let state = cleanState({});
let SP = {}, FN = {}, BIO = {}, RAR = {};
const pos = { lat: null, lon: null, acc: null, src: 'none' };
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
  setInterval(saveState, 10000);
  tick();
  if (location.hash === '#admin') askAdmin();
}

/* ---------- souhlas, zásady, smazání dat ---------- */
let consentYear = '', locked = false, wiping = false;
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
  const parent = age < MIN_AGE;
  if (parent && !$('cParentOk').checked) return err('Souhlas musí potvrdit rodič nebo zákonný zástupce.');
  const pin = parent ? $('cPin').value : '';
  if (parent && !PIN_RE.test(pin)) return err('Rodič nastaví PIN o 4–8 číslicích.');
  if (parent && pin !== $('cPin2').value) return err('PINy se neshodují.');
  // rok narození se neukládá, jen verze podmínek a jestli souhlasil rodič
  try {
    if (parent) await store.set('parentPin', await newPin(pin));
    await store.set('consent', { v: TERMS_VERSION, time: Date.now(), parent });
  } catch (e) {}
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
  try { for (const k of await caches.keys()) if (k.startsWith('stopar-tiles') || k === 'stopar-static') await caches.delete(k); } catch (e) {}
  location.reload();
}

/* ---------- kontrolní seznam pro testery ---------- */
let checklist = null, clTimer = 0;
async function openChecklist() {
  if (!checklist) checklist = Object.assign(emptyChecklist(), await store.get('checklist').catch(() => null) || {});
  const y = mbox.scrollTop;
  openM(checklistHTML(checklist));
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
  SP = Object.fromEntries(cfg.species.map(s => [s.id, s]));
  FN = Object.fromEntries(cfg.foods.map(f => [f.id, f.name]));
  BIO = Object.fromEntries(cfg.biotopes.map(b => [b.id, b]));
  RAR = Object.fromEntries(cfg.rarities.map(r => [String(r.id), r]));
  osmSetConfig(cfg, () => { refreshBirds(); if (cfg.general.showBiotopes) drawBiotopes(); });
  elevSetConfig(cfg, () => { refreshBirds(); if (pos.lat != null) hudBio(); });
  $('logo').textContent = cfg.general.appName;
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
    bio: cfg.general.showBiotopes ? biotopeGeo() : NONE
  };
}
function mapCtx() {
  return {
    vectorUrl: cfg.map.vectorUrl, glyphsUrl: cfg.map.glyphsUrl, trailsUrl: cfg.map.trailsUrl,
    demUrl: demSource ? demSource.sharedDemProtocolUrl : cfg.map.demUrl, contourUrl,
    attribution: safeAttribution(cfg.map.attribution), biotopes: cfg.biotopes, game: gameData()
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
  gamePending = bioPending = true;
  const want3d = cfg.layers.buildings === '3d';
  if (want3d !== pitch3d) { pitch3d = want3d; map.easeTo({ pitch: want3d ? 45 : 0, duration: 500 }); }
}
// Kruhy a ladicí biotopy se zapíšou, až je styl připravený (poloha může přijít dřív než styl)
let gamePending = false, bioPending = false;
function updateGame() { gamePending = true; flushMap(); }
function flushMap() {
  if (!map) return;
  try {
    if (gamePending) {
      const g = gameData(), src = ['range', 'catch', 'acc'].map(k => [k, map.getSource(k)]);
      if (src.every(([, s]) => s)) { src.forEach(([k, s]) => s.setData(g[k])); gamePending = false; }
    }
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
  const id = styleIdFor(cfg.map.style, isNight());
  try {
    map = new maplibregl.Map({
      container: 'map', style: makeStyle(id, cfg.layers, mapCtx()), center: [start.lon, start.lat], zoom: cfg.map.startZoom,
      minZoom: cfg.map.minZoom, maxZoom: cfg.map.maxZoom, attributionControl: false, pitch: cfg.layers.buildings === '3d' ? 45 : 0
    });
  } catch (e) { map = null; banner('Mapa se nedá zobrazit: prohlížeč nepodporuje WebGL. Zkus aktualizovat Chrome nebo Safari.'); return; }
  styleKey = id + JSON.stringify([cfg.layers, cfg.map.vectorUrl, cfg.map.glyphsUrl, cfg.map.trailsUrl, cfg.biotopes.map(b => b.color)]);
  pitch3d = cfg.layers.buildings === '3d';
  map.addControl(new maplibregl.AttributionControl({ compact: true }), 'bottom-left');
  map.addControl(new maplibregl.NavigationControl({ showZoom: false, visualizePitch: true }), 'top-right');
  // Ťuknutí na severku vypne režim kompasu a vrátí mapu na sever
  setTimeout(() => { const c = document.querySelector('.maplibregl-ctrl-compass'); if (c) c.addEventListener('click', () => { if (compassOn) toggleCompass(); }); }, 0);
  const me = document.createElement('div'); me.className = 'me'; me.innerHTML = '<i class="dir"></i>';
  meMk = new maplibregl.Marker({ element: me }).setLngLat([start.lon, start.lat]).addTo(map);
  map.on('dragstart', () => { follow = false; });
  map.on('click', e => {
    if (cfg.general.simulation) {
      if (pos.lat == null) setPos(e.lngLat.lat, e.lngLat.lng, 5, 'sim');
      else simTarget = { lat: e.lngLat.lat, lon: e.lngLat.lng };
    }
  });
  map.on('styledata', flushMap);
  map.on('idle', flushMap);
  if (state.last) setPos(state.last.lat, state.last.lon, null, 'last');
}

// Skrýš: kdo vydrží pár minut na místě, uvidí plašší a vzácnější zvířata
let still = { lat: null, lon: null, t: 0 }, hidden = false;
function checkHide() {
  const was = hidden;
  hidden = pos.src !== 'last' && still.t > 0 && unlocked('hide') && Date.now() - still.t >= cfg.world.hideMinutes * 60000;
  if (hidden !== was) { toast(hidden ? 'Jsi ve skrýši – objevují se plašší a vzácnější zvířata.' : 'Opustil jsi skrýš.'); clearMarkers(); refreshBirds(); }
}
function setPos(lat, lon, acc, src) {
  if (still.lat == null || dist(still.lat, still.lon, lat, lon) > cfg.world.hideMove) still = { lat, lon, t: Date.now() };
  pos.lat = lat; pos.lon = lon; pos.acc = acc; pos.src = src;
  if (!map) return;
  meMk.setLngLat([lon, lat]);
  updateGame();
  if (follow) map.easeTo({ center: [lon, lat], duration: 400 });
}

/* ---------- rychlý vzhled mapy (bez PINu) ---------- */
const LOOK_LAYERS = [['contours', 'Vrstevnice'], ['hillshade', 'Stínování terénu'], ['trHiking', 'Turistické trasy (KČT)'], ['trCycling', 'Cyklotrasy'],
  ['peaks', 'Vrcholy'], ['protected', 'Chráněná území'], ['roadNames', 'Názvy ulic'], ['biotopes', 'Barvy biotopů']];
const LOOK_POI = ['poiShop', 'poiFood', 'poiTransport', 'poiEdu', 'poiHealth', 'poiTourism', 'poiNames'];
function openLook() {
  const L = cfg.layers, styles = [['auto', 'Automaticky'], ...Object.entries(STYLES).map(([k, s]) => [k, s.name])];
  const box = (k, n, on) => `<label class="fld row"><span>${esc(n)}</span><input type="checkbox" data-look="${k}"${on ? ' checked' : ''}></label>`;
  openM(`<h2>Vzhled mapy</h2>
  <div class="chips look">${styles.map(([k, n]) => `<button class="chip${cfg.map.style === k ? ' on' : ''}" data-act="lookStyle" data-v="${k}">${esc(n)}</button>`).join('')}</div>
  <h3>Vrstvy</h3><div class="lookgrid">${LOOK_LAYERS.map(([k, n]) => box(k, n, L[k])).join('')}${box('poi', 'Místa (obchody, doprava, školy…)', LOOK_POI.some(k => L[k]))}</div>
  <div class="fld"><label for="lookB">Budovy</label><select id="lookB" data-lookb>${[['off', 'Bez budov'], ['flat', 'Ploché'], ['3d', '3D']].map(([k, n]) => `<option value="${k}"${L.buildings === k ? ' selected' : ''}>${n}</option>`).join('')}</select></div>
  <h3>Uložené předvolby</h3>
  ${cfg.mapPresets.map((p, i) => `<div class="preset"><button class="btn" data-act="lookPreset" data-i="${i}">${esc(p.name)}</button><button class="btn sm ghost" data-act="lookDel" data-i="${i}" aria-label="Smazat ${esc(p.name)}">Smazat</button></div>`).join('') || '<p class="msg small">Zatím žádné.</p>'}
  <div class="presetnew"><input type="text" id="lookName" maxlength="40" placeholder="Název, např. Les s dětmi" aria-label="Název předvolby"><button class="btn" data-act="lookSave">Uložit</button></div>
  <p class="msg small">Uloží současný styl a vrstvy. Všechny vrstvy jsou v Admin → Vrstvy mapy.</p>
  <button class="btn full ghost" data-act="close">Zavřít</button>`);
}
async function saveLook() { try { await store.set('config', compactConfig(cfg)); } catch (e) {} applyMapStyle(true); }
function onLookClick(act, a) {
  const i = Number(a.dataset.i);
  if (act === 'lookStyle') { cfg.map.style = a.dataset.v; }
  else if (act === 'lookPreset') { const p = cfg.mapPresets[i]; if (!p) return; cfg.map.style = p.style; cfg.layers = presetLayers(p); toast('Vzhled: ' + p.name); }
  else if (act === 'lookDel') { const p = cfg.mapPresets.splice(i, 1)[0]; if (p) toast('Předvolba „' + p.name + '“ smazána.'); }
  else if (act === 'lookSave') {
    const name = ($('lookName').value || '').trim().slice(0, 40);
    if (!name) { toast('Napiš název předvolby.'); return; }
    const p = { name, style: cfg.map.style, layers: { ...cfg.layers } }, j = cfg.mapPresets.findIndex(x => x.name === name);
    if (j >= 0) cfg.mapPresets[j] = p; else cfg.mapPresets.push(p);
    toast('Uloženo jako „' + name + '“.');
  } else return;
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
        if (d / dt <= cfg.gps.maxSpeed) { state.dist += d; walked(d); }
        lastGood = { lat, lon, t };
      }
    } else lastGood = { lat, lon, t };
  }
  const first = pos.src !== 'gps';
  setPos(lat, lon, acc, 'gps');
  if (first) { follow = true; if (map) map.jumpTo({ center: [lon, lat], zoom: Math.max(map.getZoom(), cfg.map.startZoom) }); tick(); }
  hudGPS();
}
// Skutečná chůze (ne simulace): úkoly na vzdálenost, XP a šišky za každý celý km
let walkBuf = 0;
function walked(d) {
  walkBuf += d;
  if (walkBuf >= 50) { progressEvent({ kind: 'walk', n: Math.round(walkBuf) }); walkBuf = 0; }
  while (state.dist / 1000 >= state.counters.km + 1) { state.counters.km++; gainXP(cfg.game.xpPerKm); onKm(); progressEvent({ kind: 'km' }); }
}
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
  checkHide(); loadWeather(); checkStamps(); announceEvents();
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
    if (w !== weather) { const changed = !weather || weatherCond(w) !== weatherCond(weather); weather = w; store.set('weather', w).catch(() => {}); if (changed) { clearMarkers(); refreshBirds(); } }
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
let eventsDay = '';
function announceEvents() {
  const d = new Date().toDateString(); if (d === eventsDay) return; eventsDay = d;
  for (const e of activeEvents(cfg)) toast('Probíhá: ' + e.name + '. ' + e.text);
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
  const now = new Date(), ctx = { now, weather: cfg.world.weather ? weatherCond(weather) : '', twilight: isTwilight(), hidden };
  const base = new Map(cfg.species.map(sp => [sp.id, speciesMult(cfg, sp, ctx)])), quiet = inQuietMonths(cfg, now);
  const quietSet = new Set(String(cfg.world.quietBiotopes || '').split(',').map(x => x.trim()));
  const r = visibleBirds(cfg, pos.lat, pos.lon, isNight(), state.gone, now.getTime(), biotopeAt, elevationAt, {
    allow: spawnAllowed, twilight: ctx.twilight, variant: (sp, h) => variantFor(cfg, sp, h), track: (sp, h) => isTrack(cfg, sp, h),
    mult: (sp, bio, la, lo) => quiet && quietSet.has(bio) && protectedAt(la, lo) ? 0 : base.get(sp.id) ?? 1
  });
  birds = r.birds;
  const ids = new Set(birds.map(b => b.id));
  markers.forEach((_, id) => { if (!ids.has(id)) removeMarker(id); });
  for (const b of birds) {
    const sp = SP[b.sp];
    if (!sp) continue;
    const near = dist(pos.lat, pos.lon, b.lat, b.lon) <= catchRadius();
    const m = markers.get(b.id);
    if (!m) {
      const el = document.createElement('div');
      el.className = 'bmk' + (near ? '' : ' far') + (speciesLocked(sp) ? ' locked' : '') + (b.variant ? ' var-' + b.variant : '');
      el.innerHTML = b.track && !tracked.has(b.id) ? '<span class="paw" aria-label="Stopa">🐾</span>' : `<img src="${birdURL(sp)}" alt="${esc(sp.name)}">`;
      el.addEventListener('click', ev => { ev.stopPropagation(); tapBird(b.id); });
      markers.set(b.id, { el, mk: new maplibregl.Marker({ element: el, anchor: 'bottom', offset: [0, 4] }).setLngLat([b.lon, b.lat]).addTo(map) });
    } else m.el.classList.toggle('far', !near);
  }
  const hb = $('hbio');
  if (r.pending && !birds.length) hb.dataset.loading = '1'; else delete hb.dataset.loading;
  refreshTargets();
}
function removeMarker(id) { const m = markers.get(id); if (m) { m.mk.remove(); markers.delete(id); } }
function clearMarkers() { [...markers.keys()].forEach(removeMarker); }

function hudBio() {
  const b = biotopeAt(pos.lat, pos.lon);
  const hb = $('hbio');
  let t = 'Biotop: ' + (b === null ? 'načítám…' : (BIO[b] ? BIO[b].name : b));
  const alt = elevationAt(pos.lat, pos.lon), zone = Number.isFinite(alt) ? zoneFor(alt, parseZones(currentRegion(cfg).zones)) : null;
  if (Number.isFinite(alt)) t += ' · ' + alt + ' m' + (zone ? ' ' + zoneName(zone) : '');
  if (isNight()) t += ' · noc'; else if (isTwilight()) t += ' · šero';
  const wc = cfg.world.weather ? weatherCond(weather) : '';
  if (wc) t += ' · ' + WEATHER_ICON[wc] + (weather.temp != null ? ' ' + weather.temp + ' °C' : '');
  if (hidden) t += ' · skrýš';
  const pa = protectedAt(pos.lat, pos.lon);
  if (pa) t += ' · 🛡️ ' + (pa.name || protectedType(pa));
  hb.classList.toggle('link', !!pa);
  const err = errorAt(pos.lat, pos.lon);
  if (err) { t += ' · OSM chyba'; hb.classList.add('bad'); hb.title = err; } else { hb.classList.remove('bad'); hb.title = ''; }
  hb.textContent = t;
}
// V simulaci se ukazují simulované km; do skutečné ušlé vzdálenosti se nepočítají
function hudDist() { $('hdist').textContent = ((cfg.general.simulation ? state.simDist : state.dist) / 1000).toFixed(1).replace('.', ',') + ' km' + (cfg.general.simulation ? ' (sim.)' : ''); }
function hudGPS() {
  const g = $('hgps');
  if (cfg.general.simulation) { g.textContent = 'Simulace'; g.classList.remove('bad'); return; }
  if (pos.src !== 'gps') { g.textContent = 'GPS –'; g.classList.add('bad'); return; }
  g.textContent = 'GPS ±' + Math.round(pos.acc) + ' m';
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
function closeM() { modal.classList.remove('on'); enc = null; }
modal.addEventListener('pointerdown', e => { if (e.target === modal && !locked && (!enc || enc.step !== 'photo')) closeM(); });

function show(v) {
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
mbox.addEventListener('input', e => { if (e.target.id === 'cYear') onConsentInput(); else onChecklistInput(e.target); });
function bindUI() {
  document.querySelectorAll('nav button').forEach(b => b.addEventListener('click', () => show(b.dataset.v)));
  $('centerBtn').onclick = () => { follow = true; if (pos.lat != null && map) map.easeTo({ center: [pos.lon, pos.lat], zoom: Math.max(map.getZoom(), cfg.map.startZoom), duration: 400 }); };
  $('compassBtn').onclick = toggleCompass;
  $('lookBtn').onclick = openLook;
  $('menuBtn').onclick = openMenu;
  $('lvlBtn').onclick = openProfile; hudLevel();
  $('coneBtn').onclick = openShop; hudCones();
  $('hbio').addEventListener('click', openProtected);
  $('logo').addEventListener('click', () => {
    clearTimeout(logoT); logoTaps++;
    logoT = setTimeout(() => { logoTaps = 0; }, 1500);
    if (logoTaps >= 5) { logoTaps = 0; askAdmin(); }
  });
  $('atlasv').addEventListener('click', e => {
    const f = e.target.closest('[data-flt]'); if (f) { toggleFilter(f.dataset.flt, f.dataset.v); return; }
    const c = e.target.closest('[data-sp]'); if (c) openDetail(c.dataset.sp);
  });
  $('sbirkav').addEventListener('click', e => {
    const t = e.target.closest('[data-enc]'); if (t) { colView.enc = t.dataset.enc; renderCollection(); return; }
    const c = e.target.closest('[data-animal]'); if (c) openAnimal(c.dataset.animal);
  });
  $('sbirkav').addEventListener('change', e => { if (e.target.matches('[data-sort]')) { colView.sort = e.target.value; renderCollection(); } });
  window.addEventListener('beforeinstallprompt', e => { e.preventDefault(); installEvt = e; });
  window.addEventListener('hashchange', () => { if (location.hash === '#admin') askAdmin(); });
  document.addEventListener('visibilitychange', () => { if (document.hidden) saveState(); else tick(); });
}

/* ---------- setkání ---------- */
function tapBird(id) {
  const b = birds.find(x => x.id === id);
  if (!b) return;
  const d = dist(pos.lat, pos.lon, b.lat, b.lon);
  if (speciesLocked(SP[b.sp])) { toast('Neznámé zvíře. Poznáš ho od úrovně ' + levelNeeded(cfg.game.rarityLevel, String(SP[b.sp].rarity)) + '.'); return; }
  if (d > catchRadius()) { toast('Je to ' + Math.round(d) + ' m. Dojdi blíž (do ' + catchRadius() + ' m).'); if (cfg.general.simulation) simTarget = { lat: b.lat, lon: b.lon }; return; }
  if (b.track && !tracked.has(b.id)) { enc = { b, sp: SP[b.sp], step: 'track', z: trackQuiz(SP[b.sp], cfg.species) }; openM(trackHTML(enc.z, SP)); return; }
  enc = { b, sp: SP[b.sp], step: 'food', tries: 0, shots: 0, msg: 'Čím ho nalákáš?' };
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
function gameFor(sp) { return cfg.rarityGame.find(r => String(r.id) === String(sp.rarity)) || { zone: .25, speed: 3 }; }

function renderEnc() {
  const sp = enc.sp;
  if (enc.step === 'food') {
    openM(`<div class="encimg${enc.b.variant ? ' var-' + esc(enc.b.variant) : ''}">${birdImg(sp)}</div><h2>${esc(sp.name)}</h2><div class="sub">${esc(sp.lat)}${enc.b.variant ? ' · vzácná forma: ' + esc(variantName(enc.b.variant)) : ''}</div>${chips(sp)}<p class="msg">${esc(enc.msg)}</p>
    <div class="foods">${cfg.foods.map(f => `<button data-f="${esc(f.id)}">${esc(f.name)}</button>`).join('')}</div>
    ${enc.lure ? '' : invOf(cfg, state, 'lure').map(it => `<button class="btn full" data-act="lure" data-item="${esc(it.id)}">Použít ${esc(it.icon)} ${esc(it.name)} (${state.inv[it.id]})</button>`).join('')}<button class="btn ghost full" data-act="close">Nechat být</button>`);
  } else if (enc.step === 'photo') {
    const g = gameFor(sp); enc.zone = Math.min(.95, Number(g.zone) * (enc.lens ? Number(cfg.game.lensMult) || 1 : 1)); enc.speed = Number(g.speed);
    openM(`<h2>${esc(sp.name)}</h2><div class="frame"><div id="fb" style="width:100%;height:100%">${birdImg(sp)}</div><div class="cross"></div></div>
    <div class="bar"><div class="zone" style="left:${(.5 - enc.zone / 2) * 100}%;width:${enc.zone * 100}%"></div><div class="mark" id="mk"></div></div>
    <p class="msg">${esc(enc.msg)}</p><button class="btn primary full" data-act="shoot">Cvak (zbývá ${cfg.catch.shots - enc.shots})</button>${enc.lens || enc.shots ? '' : invOf(cfg, state, 'lens').map(it => `<button class="btn full" data-act="lens" data-item="${esc(it.id)}">Nasadit ${esc(it.icon)} ${esc(it.name)} (${state.inv[it.id]})</button>`).join('')}`);
    enc.t0 = performance.now(); photoAnim();
  } else if (enc.step === 'done') {
    const c = state.caught[sp.id];
    openM(`<div class="encimg">${birdImg(sp)}</div>${enc.isNew ? '<p class="newsp">Nový druh v atlasu!</p>' : ''}<h2>${esc(sp.name)}</h2><div class="sub">${esc(sp.lat)}</div>
    <p class="msg">Ostrost fotky ${enc.q} %. Úlovek č. ${c.count}.</p>${statsHTML(enc.stats)}
    <p class="msg small">${addedMsg(sp)}</p>
    ${enc.uid && !enc.quizDone && makeQuiz(sp, cfg.species) ? `<button class="btn full" data-act="quizRead">Kvíz o tomto zvířeti (+bonus)</button>` : ''}
    <button class="btn primary full" data-act="close">Pokračovat</button><button class="btn full" data-act="atlas">Do atlasu</button>`);
  } else if (enc.step === 'fled') {
    openM(`<div class="encimg" style="opacity:.4">${birdImg(sp)}</div><h2>${esc(sp.name)}</h2><p class="msg">${esc(enc.msg)}</p><button class="btn primary full" data-act="close">Pokračovat</button>`);
  }
}
// Kolik jedinců druhu smí hráč mít (roste s úrovní hráče, strop v adminu)
function maxPerSpecies() { const G = cfg.game; return Math.max(1, Math.min(G.maxCap, G.maxBase + G.maxPerLevel * (playerLevel() - 1))); }
function playerLevel() { return levelFor(state.xp, cfg.game).level; }
// Zamčené funkce a vzácnosti podle úrovně hráče
const unlocked = k => playerLevel() >= levelNeeded(cfg.game.unlocks, k);
const speciesLocked = sp => playerLevel() < levelNeeded(cfg.game.rarityLevel, String(sp.rarity));
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
  for (const t of questEvent(cfg, state, ev)) { gainXP(Number(t.xp) || 0); addCones(Number(t.cones) || 0); toast('Úkol splněn: ' + t.name + ' (+' + (Number(t.xp) || 0) + ' XP' + (Number(t.cones) ? ', +' + t.cones + ' šišek' : '') + ')'); }
  for (let i = 0; i < 5; i++) { // odznak dá XP, to může dát úroveň a další odznak
    const got = checkBadges(cfg, state, playerLevel());
    if (!got.length) break;
    for (const b of got) { toast('Nový odznak: ' + b.icon + ' ' + b.name); gainXP(Number(cfg.game.xpBadge) || 0); }
  }
  saveState();
}
function addCones(n) { if (n > 0) { state.cones += n; hudCones(); } }
function hudCones() { const b = $('coneBtn'); if (b) b.innerHTML = coneIcon + ' ' + Math.floor(state.cones); }
// Dosah chytání (dalekohled ho na chvíli zvětší)
function catchRadius() { return cfg.catch.radius * (Date.now() < state.radiusUntil ? Number(cfg.game.radiusMult) || 1 : 1); }
const can = Object.assign(k => unlocked(k), { level: k => levelNeeded(cfg.game.unlocks, k) });
function openShop() { openM(shopHTML(cfg, state, can)); }
function hudLevel() { const b = $('lvlBtn'); if (!b) return; const lv = levelFor(state.xp, cfg.game); b.textContent = 'Úr. ' + lv.level; b.style.setProperty('--p', Math.round(lv.into / lv.need * 100) + '%'); }
function openProfile() { openM(profileHTML(cfg, state, levelFor(state.xp, cfg.game), stampsHTML(state))); }
function addedMsg(sp) {
  const e = enclosureOf(cfg, sp.group), a = enc.added || {};
  if (a.released) return `Máš už ${maxPerSpecies()} silnějších kusů, tenhle jsi pustil zpátky do přírody.`;
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
    state.counters.quiz++; gainXP(cfg.game.xpQuiz); progressEvent({ kind: 'quiz' });
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
  state.counters.tracks = (state.counters.tracks || 0) + 1; gainXP(cfg.field.xpTrack); progressEvent({ kind: 'track' });
  enc = { b, sp: SP[b.sp], step: 'food', tries: 0, shots: 0, msg: 'Správně! Vystopoval jsi ho. Čím ho nalákáš?' };
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
  const C = cfg.catch, food = parseMap(enc.sp.food), m = food[f] || 0;
  const ch = enc.lure ? 1 : m >= 1 ? C.chanceFull : m > 0 ? C.chanceHalf : C.chanceWrong;
  enc.tries++;
  if (Math.random() < ch) { enc.step = 'photo'; enc.msg = m >= 1 ? approach(enc.sp) + ' Cvakni, až je značka v zelené.' : 'Opatrně se přiblížil. Rychle fotku!'; renderEnc(); return; }
  if ((m === 0 && Math.random() < C.fleeWrong) || enc.tries >= C.maxFoodTries) { gone(); enc.step = 'fled'; enc.msg = m === 0 ? (FN[f] || f) + ' ho nezajímá. ' + cap(fled(enc.sp)) + '.' : 'Vyplašil se a ' + fled(enc.sp) + '.'; renderEnc(); return; }
  const main = Object.keys(food).sort((a, b) => food[b] - food[a])[0];
  enc.msg = (m === 0 ? (FN[f] || f) + ' ho nezajímá.' : 'Váhá…') + (enc.tries >= C.hintAfter && main ? ' Tip: zkus ' + String(FN[main] || main).toLowerCase() + '.' : ' Zkus jinou potravu.');
  renderEnc();
}
function shoot() {
  const C = cfg.catch, d = Math.abs(enc.p - .5), h = enc.zone / 2;
  const q = d <= h ? Math.round(100 - (d / h) * 40) : Math.max(0, Math.round(55 - (d - h) * 200));
  enc.shots++;
  if (q >= C.minQuality) { doCatch(q); return; }
  if (enc.shots >= C.shots) { gone(); enc.step = 'fled'; enc.msg = 'Samé rozmazané fotky. ' + cap(fled(enc.sp)) + '.'; renderEnc(); return; }
  enc.msg = 'Rozmazané (' + q + ' %). Zkus znovu.'; renderEnc();
}
function doCatch(q) {
  const C = cfg.catch, sp = enc.sp;
  let st = spStats(sp).map(v => Math.min(C.maxStat, Math.round(v * (C.statRandomMin + Math.random() * (1 - C.statRandomMin)) * (1 + q / 100 * C.photoBonus))));
  let c = state.caught[sp.id];
  enc.isNew = !c || !c.count;
  if (!c) { c = { count: 0, best: null, verified: false, photos: [] }; state.caught[sp.id] = c; }
  c.count++;
  if (c.verified) st = st.map(v => Math.min(C.maxStat, v + C.realPhotoBonus));
  const sum = a => a.reduce((x, y) => x + y, 0);
  enc.better = !c.best || sum(st) > sum(c.best.stats);
  if (enc.better) c.best = { q, stats: st, date: Date.now(), lat: enc.b.lat, lon: enc.b.lon, bio: enc.b.bio };
  enc.q = q; enc.stats = st;
  const animal = Object.assign(animalFrom(sp.id, st, q, enc.b.bio), { variant: enc.b.variant || '' });
  enc.added = addAnimal(state, animal, maxPerSpecies());
  enc.uid = enc.added.kept ? animal.uid : null;
  gone(); enc.step = 'done'; renderEnc();
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
  else if (act === 'checklist') openChecklist();
  else if (act === 'clDev') { checklist.device = a.dataset.v; saveChecklist(); openChecklist(); }
  else if (act === 'clMark') { (checklist.items[a.dataset.id] ||= {}).m = a.dataset.v; saveChecklist(); openChecklist(); }
  else if (act === 'clSend') sendChecklist();
  else if (act === 'nick') saveNick(a.dataset.uid);
  else if (act === 'quizRead' && enc) quizRead();
  else if (act === 'quizGo' && enc) quizAsk();
  else if (act === 'quizAns' && enc) quizAnswer(Number(a.dataset.i));
  else if (act === 'profile') openProfile();
  else if (act === 'calendar') openM(calendarHTML(cfg));
  else if (act === 'trackAns' && enc && enc.step === 'track') trackAnswer(Number(a.dataset.i));
  else if (act === 'key') { keyAns = {}; openKey(); }
  else if (act === 'keyAns') { keyAns[a.dataset.k] = a.dataset.v; openKey(); }
  else if (act === 'keyBack') { const k = KEY_STEPS.filter(k => k in keyAns).pop(); delete keyAns[k]; openKey(); }
  else if (act === 'keyReset') { keyAns = {}; openKey(); }
  else if (act === 'keyPick') openDetail(a.dataset.sp);
  else if (act === 'journal') openJournal();
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
  const real = e.target.closest('input[data-real]');
  if (real && real.files && real.files[0]) { addRealPhoto(real.dataset.real, real.files[0]); return; }
  const imp = e.target.closest('input[data-import]');
  if (imp && imp.files && imp.files[0]) { readImport(imp.files[0]); return; }
  if (e.target.id === 'jPhoto' && e.target.files && e.target.files[0]) resizeImage(e.target.files[0], 800).then(img => { jPhoto = img; if ($('jInfo')) $('jInfo').textContent = 'Fotka připravena. Uloží se čas a místo (přibližně na 100 m).'; }).catch(() => toast('Fotku se nepodařilo načíst.'));
}

/* ---------- atlas ---------- */
// Filtry atlasu (ikony, víc jich jde zapnout naráz; v jedné řadě = „nebo“, mezi řadami = „a“)
const flt = { g: new Set(), r: new Set(), x: new Set() };
function toggleFilter(k, v) { const set = flt[k]; set.has(v) ? set.delete(v) : set.add(v); renderAtlas(); }
function passFilter(s) {
  const c = state.caught[s.id], ok = !!(c && c.count);
  if (flt.g.size && !flt.g.has(s.group || 'Ostatní')) return false;
  if (flt.r.size && !flt.r.has(String(s.rarity))) return false;
  if (flt.x.has('caught') && !ok) return false;
  if (flt.x.has('missing') && ok) return false;
  if (flt.x.has('night') && !s.night) return false;
  if (flt.x.has('verified') && !(c && c.verified)) return false;
  return true;
}
function filterBar(all) {
  const groups = [...new Set(all.map(s => s.group || 'Ostatní'))];
  const btn = (k, v, icon, label) => `<button class="ico${flt[k].has(v) ? ' on' : ''}" data-flt="${k}" data-v="${esc(v)}" aria-pressed="${flt[k].has(v)}" aria-label="${esc(label)}" title="${esc(label)}"><span aria-hidden="true">${icon}</span></button>`;
  return `<div class="iconbar">${groups.map(g => btn('g', g, groupIcon(g), g)).join('')}</div>
  <div class="iconbar">${cfg.rarities.map((r, i) => btn('r', String(r.id), '★'.repeat(i + 1), r.name)).join('')}${btn('x', 'caught', '✔', 'Chycené')}${btn('x', 'missing', '?', 'Nechycené')}${btn('x', 'night', '🌙', 'Noční')}${btn('x', 'verified', '📷', 'Ověřené fotkou')}</div>`;
}
function renderAtlas() {
  const all = cfg.species.filter(s => s.active), act = all.filter(passFilter);
  const n = act.filter(s => state.caught[s.id]?.count).length;
  const groups = [...new Set(act.map(s => s.group || 'Ostatní'))];
  const nAll = all.filter(s => state.caught[s.id]?.count).length;
  $('atlasv').innerHTML = `<div class="ahead"><b>Atlas</b><span>${nAll} / ${all.length}</span></div><div class="prog"><div style="width:${all.length ? nAll / all.length * 100 : 0}%"></div></div>${filterBar(all)}${act.length ? '' : '<p class="msg">Filtru nic neodpovídá.</p>'}` +
    groups.map(g => `${groups.length > 1 ? `<div class="grp">${esc(g)}</div>` : ''}<div class="grid">${act.filter(s => (s.group || 'Ostatní') === g).map(s => {
      const c = state.caught[s.id], ok = c && c.count;
      return `<div class="acard${ok ? '' : ' miss'}" data-sp="${esc(s.id)}"><div class="im">${birdImg(s)}</div><div class="nm">${ok ? esc(s.name) : '???'}</div><div class="rr">${esc(RAR[s.rarity]?.name || '')}${ok ? ' · ×' + c.count : ''}${c && c.verified ? ' · ověřen' : ''}</div></div>`;
    }).join('')}</div>`).join('');
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
async function openDetail(id) {
  const sp = SP[id], c = state.caught[id], ok = c && c.count;
  let h = `<div class="encimg${ok ? '' : ' sil'}">${birdImg(sp)}</div><h2>${ok ? esc(sp.name) : '???'}</h2>`;
  if (ok) {
    h += `<div class="sub">${esc(sp.lat)}</div>${chips(sp)}${statsHTML(c.best.stats)}
    <div class="kv"><span>Úlovků:</span> ${c.count} · <span>nejlepší fotka:</span> ${c.best.q} %${c.verified ? ' · <span>ověřen v terénu</span>' : ''}</div>
    ${formatMonths(sp.months) ? `<div class="kv"><span>U nás:</span> ${esc(formatMonths(sp.months))}</div>` : ''}
    <div class="kv"><span>Potrava:</span> ${Object.keys(parseMap(sp.food)).map(f => esc(String(FN[f] || f).toLowerCase())).join(', ')}</div>
    <div class="fact">${esc(sp.fact)}</div>${eduHTML(sp, c)}`;
    const ph = [];
    for (const pid of (c.photos || [])) { try { const p = await store.get(pid, 'photos'); if (p) ph.push(p); } catch (e) {} }
    if (ph.length) h += `<div class="kv"><span>Tvoje fotky z terénu:</span></div><div class="thumbs">${ph.map(p => safeImage(p.img) ? `<img src="${esc(p.img)}" alt="">` : '').join('')}</div>`;
  } else {
    h += `<p class="msg">Ještě ho nemáš. Hledej: ${Object.keys(parseMap(sp.bio)).map(b => esc(String(BIO[b]?.name || b).toLowerCase())).join(', ')}${altHint(sp)}${sp.night ? ' (jen v noci)' : ''}.</p>`;
  }
  h += `<label class="btn primary full">Vyfotil jsem ho venku<input type="file" accept="image/*" capture="environment" data-real="${esc(id)}" hidden></label>
  <p class="msg small">Skutečná fotka dá jednorázově +${cfg.catch.realPhotoBonus} ke všem statistikám. Druh zatím určuješ ty.</p>
  <button class="btn full" data-act="close">Zavřít</button>`;
  enc = null; openM(h);
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
    if (!c.count) { c.count = 1; c.best = { q: 100, stats: spStats(sp), date: Date.now() }; addAnimal(state, animalFrom(id, c.best.stats, 100, ''), maxPerSpecies()); }
    if (!c.verified) { c.verified = true; c.best.stats = c.best.stats.map(v => Math.min(cfg.catch.maxStat, v + cfg.catch.realPhotoBonus)); state.counters.verified++; gainXP(cfg.game.xpVerified); progressEvent({ kind: 'photo' }); }
    c.photos = [pid, ...(c.photos || [])];
    saveState(); renderAtlas(); openDetail(id); toast(sp.name + ': fotka uložena.');
  } catch (e) { toast('Fotku se nepodařilo uložit.'); }
}

/* ---------- sbírka ---------- */
const colView = { enc: '', sort: 'new' };
function renderCollection() { $('sbirkav').innerHTML = collectionHTML(cfg, state, SP, colView); }
function openAnimal(uid) {
  const a = state.animals.find(x => x.uid === uid), sp = a && SP[a.sp]; if (!sp) return;
  const e = enclosureOf(cfg, sp.group);
  openM(`<div class="encimg${a.variant ? ' var-' + esc(a.variant) : ''}${isMaster(cfg, a, sp.group) ? ' master' : ''}">${birdImg(sp)}</div><h2>${esc(a.nick || sp.name)}${stars(a.stage)}</h2><div class="sub">${esc(stageNames(cfg, sp.group)[a.stage] || '')}</div><div class="sub">${a.nick ? esc(sp.name) + ' · ' : ''}${esc(sp.lat)}</div>
  ${statsHTML(a.stats)}<div class="kv"><span>Síla:</span> ${power(a)} · <span>chycen:</span> ${new Date(a.date).toLocaleDateString('cs-CZ')}${a.bio ? ' · <span>biotop:</span> ' + esc(BIO[a.bio]?.name || a.bio) : ''}${a.variant ? ' · <span>vzácná forma:</span> ' + esc(variantName(a.variant)) : ''}</div>
  <div class="kv"><span>Ubikace:</span> ${esc(e.icon)} ${esc(e.name)}</div>
  <div class="presetnew"><input type="text" id="nick" maxlength="20" placeholder="Přezdívka" aria-label="Přezdívka" value="${esc(a.nick || '')}"><button class="btn" data-act="nick" data-uid="${esc(uid)}">Uložit</button></div>
  <p class="msg small" id="nickErr"></p>
  <div id="animalActs" data-uid="${esc(uid)}">${animalActionsHTML(cfg, state, a, sp, can)}</div>
  <button class="btn full" data-act="close">Zavřít</button>`);
}
function animalAct(act, uid, item) {
  const a = state.animals.find(x => x.uid === uid), sp = a && SP[a.sp]; if (!sp) return;
  if (act === 'train') {
    const r = train(cfg, state, a, new Date().toISOString().slice(0, 10));
    toast(r === 'ok' ? 'Trénink: +' + cfg.game.trainXp + ' XP jedince' : r === 'limit' ? 'Dnes už toho natrénoval dost, zkus to zítra.' : 'Nemáš dost šišek.');
  } else if (act === 'evolve') {
    const r = evolve(cfg, state, a, sp.group);
    if (r === 'ok') { toast(sp.name + ': ' + stageNames(cfg, sp.group)[a.stage] + '!'); progressEvent({ kind: 'evolve' }); }
    else toast(r === 'axp' ? 'Jedinec potřebuje víc XP (trénink, krmení).' : r === 'points' ? 'Nemáš dost bodů – získáš je vypuštěním zvířat.' : 'Už je v nejvyšším stádiu.');
  } else if (act === 'feed') {
    const it = useItem(cfg, state, item); if (it) { a.axp += Number(it.value) || 0; toast(it.icon + ' ' + it.name + ': +' + it.value + ' XP jedince'); }
  } else if (act === 'release') {
    const v = release(cfg, state, a, sp); closeM(); renderCollection(); hudCones();
    toast((a.nick || sp.name) + ' se vrátil do přírody. +' + v + ' bodů'); progressEvent({ kind: 'release' }); return;
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
function openMenu() {
  const standalone = matchMedia('(display-mode: standalone)').matches || navigator.standalone;
  const ios = /iphone|ipad|ipod/i.test(navigator.userAgent);
  let inst = '';
  if (!standalone) inst = installEvt ? '<button class="btn full" data-act="install">Nainstalovat na plochu</button>' : (ios ? '<p class="msg small">Instalace na iPhonu: Sdílet → Přidat na plochu.</p>' : '');
  openM(`<h2>Menu</h2><div class="menu">${inst}
  <button class="btn full" data-act="export">Uložit zálohu (soubor)</button>
  <label class="btn full">Obnovit ze zálohy<input type="file" accept="application/json,.json" data-import hidden></label>
  <p class="msg small">Ušlo celkem ${(state.dist / 1000).toFixed(2).replace('.', ',')} km · ${Object.values(state.caught).filter(c => c.count).length} druhů</p>
  <p class="msg small">Kód rozmístění: <b>${spawnCode(cfg)}</b><br>Před společnou procházkou ho porovnejte – stejný kód = stejná zvířata na stejném místě.</p>
  <button class="btn full" data-act="journal">Deník pozorování</button>
  <button class="btn full" data-act="key">Určovací klíč</button>
  <button class="btn full" data-act="calendar">Kalendář přírody</button>
  <button class="btn full" data-act="checklist">Kontrolní seznam pro testery</button>
  <button class="btn full" data-act="about">O aplikaci a licence</button>
  <button class="btn full" data-act="legalMenu">Podmínky a zásady</button>
  <button class="btn full" data-act="pinSet">Rodičovský PIN</button>
  <button class="btn full danger" data-act="wipe">Smazat všechna moje data</button>
  <p class="msg small">Mapa a biotopy: ${safeAttribution(cfg.map.attribution)}</p>
  <button class="btn full ghost" data-act="close">Zavřít</button></div>`);
}
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
    clearOsm: async () => { await clearOsmCache(); drawBiotopes(); tick(); toast('Cache biotopů smazána.'); },
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
