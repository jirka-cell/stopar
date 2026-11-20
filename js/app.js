import { DEFAULTS, mergeDefaults, parseMap, parseNums, clone, safeImage } from './config.js';
import { store, persist } from './store.js';
import { dist, sunAltitude } from './geo.js';
import { osmSetConfig, ensureArea, biotopeAt, status as osmStatus, loadedFeatures, clearOsmCache } from './osm.js';
import { visibleBirds, currentSlot } from './spawn.js';
import { birdImg, birdURL } from './birds.js';
import { openAdmin } from './admin.js';

const $ = id => document.getElementById(id);
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
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
  const out = { caught: {}, gone: {}, dist: num(s && s.dist), simDist: num(s && s.simDist), last: null };
  if (!s || typeof s !== 'object') return out;
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
  return out;
}
const cleanPhoto = p => p && typeof p === 'object' && safeImage(p.img) && Number.isFinite(Number(p.id))
  ? { id: Number(p.id), sp: String(p.sp ?? ''), img: p.img, date: num(p.date), lat: p.lat == null ? null : num(p.lat), lon: p.lon == null ? null : num(p.lon) } : null;

let cfg = clone(DEFAULTS);
let state = { caught: {}, gone: {}, dist: 0, simDist: 0, last: null };
let SP = {}, FN = {}, BIO = {}, RAR = {};
const pos = { lat: null, lon: null, acc: null, src: 'none' };
let lastGood = null;
let map, tiles, meMk, accCirc, catchCirc, rangeCirc, birdLayer, bioLayer;
let follow = true, birds = [], markers = new Map(), enc = null, simTarget = null, watchId = null, installEvt = null;

/* ---------- init ---------- */
async function init() {
  try {
    const c = await store.get('config');
    cfg = mergeDefaults(c);
    const s = await store.get('state');
    if (s) state = cleanState(s);
  } catch (e) { toast('Úložiště není dostupné, postup se neuloží.'); }
  persist();
  applyConfig(true);
  initMap();
  bindUI();
  startPosition();
  setInterval(tick, 2000);
  setInterval(saveState, 10000);
  tick();
  registerSW();
  if (location.hash === '#admin') askAdmin();
}

function applyConfig(first) {
  SP = Object.fromEntries(cfg.species.map(s => [s.id, s]));
  FN = Object.fromEntries(cfg.foods.map(f => [f.id, f.name]));
  BIO = Object.fromEntries(cfg.biotopes.map(b => [b.id, b]));
  RAR = Object.fromEntries(cfg.rarities.map(r => [String(r.id), r]));
  osmSetConfig(cfg, () => { refreshBirds(); if (cfg.general.showBiotopes) drawBiotopes(); });
  $('logo').textContent = cfg.general.appName;
  document.title = cfg.general.appName;
  $('legend').innerHTML = cfg.biotopes.map(b => `<span><i style="background:${esc(b.color)}"></i>${esc(b.name)}</span>`).join('');
  $('legend').classList.toggle('on', !!cfg.general.showBiotopes);
  if (!first && map) {
    tiles.setUrl(cfg.map.tileUrl);
    map.setMinZoom(cfg.map.minZoom); map.setMaxZoom(cfg.map.maxZoom);
    catchCirc.setRadius(cfg.catch.radius); rangeCirc.setRadius(cfg.spawn.radius);
    if (cfg.general.showBiotopes) drawBiotopes(); else bioLayer.clearLayers();
    markers.forEach(m => birdLayer.removeLayer(m)); markers.clear();
    startPosition();
    refreshBirds();
  }
  swConfig();
}

async function saveConfig(newCfg) {
  cfg = newCfg;
  try { await store.set('config', cfg); } catch (e) {}
  applyConfig(false);
}

function saveState() {
  const now = Date.now(), keep = cfg.catch.gonePrune * 86400000;
  for (const k of Object.keys(state.gone)) if (now - state.gone[k] > keep) delete state.gone[k];
  if (pos.lat != null) state.last = { lat: pos.lat, lon: pos.lon };
  store.set('state', state).catch(() => {});
}

/* ---------- mapa ---------- */
function initMap() {
  const start = state.last || { lat: cfg.map.startLat, lon: cfg.map.startLon };
  map = L.map('map', { zoomControl: false, minZoom: cfg.map.minZoom, maxZoom: cfg.map.maxZoom }).setView([start.lat, start.lon], cfg.map.startZoom);
  tiles = L.tileLayer(cfg.map.tileUrl, { maxZoom: cfg.map.maxZoom, maxNativeZoom: 19, attribution: safeAttribution(cfg.map.attribution), crossOrigin: true }).addTo(map);
  bioLayer = L.layerGroup().addTo(map);
  rangeCirc = L.circle([start.lat, start.lon], { radius: cfg.spawn.radius, color: '#2f7d4f', weight: 1, opacity: .25, fillOpacity: .03, interactive: false }).addTo(map);
  catchCirc = L.circle([start.lat, start.lon], { radius: cfg.catch.radius, color: '#2f7d4f', weight: 2, dashArray: '6 6', fillOpacity: .06, interactive: false }).addTo(map);
  accCirc = L.circle([start.lat, start.lon], { radius: 0, color: '#3a7bd5', weight: 1, opacity: .4, fillOpacity: .08, interactive: false }).addTo(map);
  birdLayer = L.layerGroup().addTo(map);
  meMk = L.marker([start.lat, start.lon], { icon: L.divIcon({ className: '', html: '<div class="me"></div>', iconSize: [20, 20], iconAnchor: [10, 10] }), interactive: false, keyboard: false }).addTo(map);
  map.on('dragstart', () => { follow = false; });
  map.on('click', e => {
    if (cfg.general.simulation) {
      if (pos.lat == null) setPos(e.latlng.lat, e.latlng.lng, 5, 'sim');
      else simTarget = { lat: e.latlng.lat, lon: e.latlng.lng };
    }
  });
  if (state.last) setPos(state.last.lat, state.last.lon, null, 'last');
}

function setPos(lat, lon, acc, src) {
  pos.lat = lat; pos.lon = lon; pos.acc = acc; pos.src = src;
  const ll = [lat, lon];
  meMk.setLatLng(ll); catchCirc.setLatLng(ll); rangeCirc.setLatLng(ll);
  accCirc.setLatLng(ll).setRadius(acc && src === 'gps' ? acc : 0);
  if (follow) map.panTo(ll, { animate: true, duration: .4 });
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
        if (d / dt <= cfg.gps.maxSpeed) state.dist += d;
        lastGood = { lat, lon, t };
      }
    } else lastGood = { lat, lon, t };
  }
  const first = pos.src !== 'gps';
  setPos(lat, lon, acc, 'gps');
  if (first) { follow = true; map.setView([lat, lon], Math.max(map.getZoom(), cfg.map.startZoom)); tick(); }
  hudGPS();
}
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
  if (pos.lat == null) { hudGPS(); return; }
  ensureArea(pos.lat, pos.lon, cfg.spawn.radius + cfg.spawn.cellSize);
  refreshBirds();
  hudBio(); hudDist(); hudGPS();
}

function refreshBirds() {
  if (pos.lat == null || !map) return;
  const r = visibleBirds(cfg, pos.lat, pos.lon, isNight(), state.gone);
  birds = r.birds;
  const ids = new Set(birds.map(b => b.id));
  markers.forEach((m, id) => { if (!ids.has(id)) { birdLayer.removeLayer(m); markers.delete(id); } });
  for (const b of birds) {
    const sp = SP[b.sp];
    if (!sp) continue;
    const near = dist(pos.lat, pos.lon, b.lat, b.lon) <= cfg.catch.radius;
    let m = markers.get(b.id);
    if (!m) {
      m = L.marker([b.lat, b.lon], { icon: birdIcon(sp, near), keyboard: false });
      m.on('click', ev => { L.DomEvent.stopPropagation(ev); tapBird(b.id); });
      m._near = near;
      birdLayer.addLayer(m); markers.set(b.id, m);
    } else if (m._near !== near) { m.setIcon(birdIcon(sp, near)); m._near = near; }
  }
  const hb = $('hbio');
  if (r.pending && !birds.length) hb.dataset.loading = '1'; else delete hb.dataset.loading;
}
function birdIcon(sp, near) {
  return L.divIcon({ className: '', html: `<div class="bmk${near ? '' : ' far'}"><img src="${birdURL(sp)}" alt=""></div>`, iconSize: [46, 40], iconAnchor: [23, 36] });
}

function hudBio() {
  const b = biotopeAt(pos.lat, pos.lon);
  const hb = $('hbio');
  let t = 'Biotop: ' + (b === null ? 'načítám…' : (BIO[b] ? BIO[b].name : b));
  if (isNight()) t += ' · noc';
  if (osmStatus.error) { t += ' · OSM chyba'; hb.classList.add('bad'); hb.title = osmStatus.error; } else hb.classList.remove('bad');
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
function toast(m) { const el = $('toast'); el.textContent = m; el.classList.add('on'); clearTimeout(tT); tT = setTimeout(() => el.classList.remove('on'), 2800); }
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
modal.addEventListener('pointerdown', e => { if (e.target === modal && (!enc || enc.step !== 'photo')) closeM(); });

function show(v) {
  document.querySelectorAll('.view').forEach(x => x.classList.toggle('on', x.id === v));
  document.querySelectorAll('nav button').forEach(b => b.classList.toggle('on', b.dataset.v === v));
  if (v === 'atlasv') renderAtlas();
  if (v === 'mapv') setTimeout(() => map.invalidateSize(), 50);
}

let logoTaps = 0, logoT = 0;
function bindUI() {
  document.querySelectorAll('nav button').forEach(b => b.addEventListener('click', () => show(b.dataset.v)));
  $('centerBtn').onclick = () => { follow = true; if (pos.lat != null) map.setView([pos.lat, pos.lon], Math.max(map.getZoom(), cfg.map.startZoom)); };
  $('menuBtn').onclick = openMenu;
  $('logo').addEventListener('click', () => {
    clearTimeout(logoT); logoTaps++;
    logoT = setTimeout(() => { logoTaps = 0; }, 1500);
    if (logoTaps >= 5) { logoTaps = 0; askAdmin(); }
  });
  mbox.addEventListener('click', onModalClick);
  mbox.addEventListener('change', onModalChange);
  $('atlasv').addEventListener('click', e => { const c = e.target.closest('[data-sp]'); if (c) openDetail(c.dataset.sp); });
  window.addEventListener('beforeinstallprompt', e => { e.preventDefault(); installEvt = e; });
  window.addEventListener('hashchange', () => { if (location.hash === '#admin') askAdmin(); });
  document.addEventListener('visibilitychange', () => { if (document.hidden) saveState(); else tick(); });
}

/* ---------- setkání ---------- */
function tapBird(id) {
  const b = birds.find(x => x.id === id);
  if (!b) return;
  const d = dist(pos.lat, pos.lon, b.lat, b.lon);
  if (d > cfg.catch.radius) { toast('Je to ' + Math.round(d) + ' m. Dojdi blíž (do ' + cfg.catch.radius + ' m).'); if (cfg.general.simulation) simTarget = { lat: b.lat, lon: b.lon }; return; }
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
    openM(`<div class="encimg">${birdImg(sp)}</div><h2>${esc(sp.name)}</h2><div class="sub">${esc(sp.lat)}</div>${chips(sp)}<p class="msg">${esc(enc.msg)}</p>
    <div class="foods">${cfg.foods.map(f => `<button data-f="${esc(f.id)}">${esc(f.name)}</button>`).join('')}</div><button class="btn ghost full" data-act="close">Nechat být</button>`);
  } else if (enc.step === 'photo') {
    const g = gameFor(sp); enc.zone = Number(g.zone); enc.speed = Number(g.speed);
    openM(`<h2>${esc(sp.name)}</h2><div class="frame"><div id="fb" style="width:100%;height:100%">${birdImg(sp)}</div><div class="cross"></div></div>
    <div class="bar"><div class="zone" style="left:${(.5 - enc.zone / 2) * 100}%;width:${enc.zone * 100}%"></div><div class="mark" id="mk"></div></div>
    <p class="msg">${esc(enc.msg)}</p><button class="btn primary full" data-act="shoot">Cvak (zbývá ${cfg.catch.shots - enc.shots})</button>`);
    enc.t0 = performance.now(); photoAnim();
  } else if (enc.step === 'done') {
    const c = state.caught[sp.id];
    openM(`<div class="encimg">${birdImg(sp)}</div>${enc.isNew ? '<p class="newsp">Nový druh v atlasu!</p>' : ''}<h2>${esc(sp.name)}</h2><div class="sub">${esc(sp.lat)}</div>
    <p class="msg">Ostrost fotky ${enc.q} %. Úlovek č. ${c.count}.</p>${statsHTML(enc.stats)}
    ${enc.better ? '' : '<p class="msg small">Tvůj nejlepší kus má lepší statistiky, zůstává v atlasu.</p>'}
    <button class="btn primary full" data-act="close">Pokračovat</button><button class="btn full" data-act="atlas">Do atlasu</button>`);
  } else if (enc.step === 'fled') {
    openM(`<div class="encimg" style="opacity:.4">${birdImg(sp)}</div><h2>${esc(sp.name)}</h2><p class="msg">${esc(enc.msg)}</p><button class="btn primary full" data-act="close">Pokračovat</button>`);
  }
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
function gone() { state.gone[enc.b.id] = Date.now(); const m = markers.get(enc.b.id); if (m) { birdLayer.removeLayer(m); markers.delete(enc.b.id); } saveState(); }
function pickFood(f) {
  const C = cfg.catch, food = parseMap(enc.sp.food), m = food[f] || 0;
  const ch = m >= 1 ? C.chanceFull : m > 0 ? C.chanceHalf : C.chanceWrong;
  enc.tries++;
  if (Math.random() < ch) { enc.step = 'photo'; enc.msg = m >= 1 ? 'Přiletěl a zobe. Cvakni, až je značka v zelené.' : 'Opatrně se přiblížil. Rychle fotku!'; renderEnc(); return; }
  if ((m === 0 && Math.random() < C.fleeWrong) || enc.tries >= C.maxFoodTries) { gone(); enc.step = 'fled'; enc.msg = m === 0 ? (FN[f] || f) + ' ptáka nezajímá. Odletěl.' : 'Vyplašil se a odletěl.'; renderEnc(); return; }
  const main = Object.keys(food).sort((a, b) => food[b] - food[a])[0];
  enc.msg = (m === 0 ? (FN[f] || f) + ' ptáka nezajímá.' : 'Váhá…') + (enc.tries >= C.hintAfter && main ? ' Tip: zkus ' + String(FN[main] || main).toLowerCase() + '.' : ' Zkus jinou potravu.');
  renderEnc();
}
function shoot() {
  const C = cfg.catch, d = Math.abs(enc.p - .5), h = enc.zone / 2;
  const q = d <= h ? Math.round(100 - (d / h) * 40) : Math.max(0, Math.round(55 - (d - h) * 200));
  enc.shots++;
  if (q >= C.minQuality) { doCatch(q); return; }
  if (enc.shots >= C.shots) { gone(); enc.step = 'fled'; enc.msg = 'Samé rozmazané fotky. Pták odletěl.'; renderEnc(); return; }
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
  gone(); enc.step = 'done'; renderEnc();
}

function onModalClick(e) {
  const f = e.target.closest('[data-f]'); if (f && enc) { pickFood(f.dataset.f); return; }
  const a = e.target.closest('[data-act]'); if (!a) return;
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
}
function onModalChange(e) {
  const real = e.target.closest('input[data-real]');
  if (real && real.files && real.files[0]) { addRealPhoto(real.dataset.real, real.files[0]); return; }
  const imp = e.target.closest('input[data-import]');
  if (imp && imp.files && imp.files[0]) readImport(imp.files[0]);
}

/* ---------- atlas ---------- */
function renderAtlas() {
  const act = cfg.species.filter(s => s.active);
  const n = act.filter(s => state.caught[s.id]?.count).length;
  const groups = [...new Set(act.map(s => s.group || 'Ostatní'))];
  $('atlasv').innerHTML = `<div class="ahead"><b>Atlas</b><span>${n} / ${act.length}</span></div><div class="prog"><div style="width:${act.length ? n / act.length * 100 : 0}%"></div></div>` +
    groups.map(g => `${groups.length > 1 ? `<div class="grp">${esc(g)}</div>` : ''}<div class="grid">${act.filter(s => (s.group || 'Ostatní') === g).map(s => {
      const c = state.caught[s.id], ok = c && c.count;
      return `<div class="acard${ok ? '' : ' miss'}" data-sp="${esc(s.id)}"><div class="im">${birdImg(s)}</div><div class="nm">${ok ? esc(s.name) : '???'}</div><div class="rr">${esc(RAR[s.rarity]?.name || '')}${ok ? ' · ×' + c.count : ''}${c && c.verified ? ' · ověřen' : ''}</div></div>`;
    }).join('')}</div>`).join('');
}
async function openDetail(id) {
  const sp = SP[id], c = state.caught[id], ok = c && c.count;
  let h = `<div class="encimg${ok ? '' : ' sil'}">${birdImg(sp)}</div><h2>${ok ? esc(sp.name) : '???'}</h2>`;
  if (ok) {
    h += `<div class="sub">${esc(sp.lat)}</div>${chips(sp)}${statsHTML(c.best.stats)}
    <div class="kv"><span>Úlovků:</span> ${c.count} · <span>nejlepší fotka:</span> ${c.best.q} %${c.verified ? ' · <span>ověřen v terénu</span>' : ''}</div>
    <div class="kv"><span>Potrava:</span> ${Object.keys(parseMap(sp.food)).map(f => esc(String(FN[f] || f).toLowerCase())).join(', ')}</div>
    <div class="fact">${esc(sp.fact)}</div>`;
    const ph = [];
    for (const pid of (c.photos || [])) { try { const p = await store.get(pid, 'photos'); if (p) ph.push(p); } catch (e) {} }
    if (ph.length) h += `<div class="kv"><span>Tvoje fotky z terénu:</span></div><div class="thumbs">${ph.map(p => safeImage(p.img) ? `<img src="${esc(p.img)}" alt="">` : '').join('')}</div>`;
  } else {
    h += `<p class="msg">Ještě ho nemáš. Hledej: ${Object.keys(parseMap(sp.bio)).map(b => esc(String(BIO[b]?.name || b).toLowerCase())).join(', ')}${sp.night ? ' (jen v noci)' : ''}.</p>`;
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
    if (!c.count) { c.count = 1; c.best = { q: 100, stats: spStats(sp), date: Date.now() }; }
    if (!c.verified) { c.verified = true; c.best.stats = c.best.stats.map(v => Math.min(cfg.catch.maxStat, v + cfg.catch.realPhotoBonus)); }
    c.photos = [pid, ...(c.photos || [])];
    saveState(); renderAtlas(); openDetail(id); toast(sp.name + ': fotka uložena.');
  } catch (e) { toast('Fotku se nepodařilo uložit.'); }
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
function download(text, name) {
  const url = URL.createObjectURL(new Blob([text], { type: 'application/json' }));
  const a = document.createElement('a'); a.href = url; a.download = name; document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 5000);
}
let pendingImport = null;
function readImport(file) {
  const fr = new FileReader();
  fr.onload = () => {
    try {
      const d = JSON.parse(fr.result);
      if (d.app !== 'stopar' || !d.state) throw new Error('bad');
      pendingImport = d;
      const n = Object.values(d.state.caught || {}).filter(c => c.count).length;
      openM(`<h2>Obnovit zálohu?</h2><p class="msg">Záloha z ${esc(new Date(d.exported).toLocaleString('cs-CZ'))}: ${n} druhů, ${(d.photos || []).length} fotek.<br>Současný postup se přepíše.</p>
      ${d.config ? '<label class="fld row">Obnovit i nastavení adminu<input type="checkbox" id="impCfg"></label>' : ''}
      <button class="btn primary full" data-act="importOk">Obnovit</button><button class="btn full" data-act="menu">Zpět</button>`);
    } catch (e) { toast('Soubor není záloha Stopaře.'); }
  };
  fr.readAsText(file);
}
async function doImport() {
  const d = pendingImport; if (!d) return;
  const withCfg = $('impCfg') && $('impCfg').checked;
  const newState = cleanState(d.state);
  const photos = (Array.isArray(d.photos) ? d.photos : []).map(cleanPhoto).filter(Boolean);
  try { await store.restore(newState, photos); }
  catch (e) { toast('Obnova se nepovedla, původní data zůstala.'); return; }
  state = newState;
  if (withCfg && d.config) await saveConfig(mergeDefaults(d.config));
  pendingImport = null; closeM(); hudDist(); renderAtlas(); toast('Záloha obnovena.');
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
    clearOsm: async () => { await clearOsmCache(); bioLayer.clearLayers(); tick(); toast('Cache biotopů smazána.'); },
    resetProgress: async () => { state = { caught: {}, gone: {}, dist: 0, simDist: 0, last: state.last }; await store.clear('photos'); await store.set('state', state); hudDist(); toast('Postup smazán.'); },
    respawn: () => { state.gone = {}; markers.forEach(m => birdLayer.removeLayer(m)); markers.clear(); refreshBirds(); toast('Ptáci obnoveni.'); },
    info: () => ({ slot: currentSlot(cfg), birds: birds.length, features: loadedFeatures().length, night: isNight(), pos: { ...pos }, osmError: osmStatus.error })
  });
}

function drawBiotopes() {
  bioLayer.clearLayers();
  const col = Object.fromEntries(cfg.biotopes.map(b => [b.id, b.color]));
  for (const f of loadedFeatures()) {
    const c = col[f.b] || '#888';
    if (f.line) L.polyline(f.outer[0], { color: c, weight: 4, opacity: .8, interactive: false }).addTo(bioLayer);
    else L.polygon([...f.outer, ...f.inner], { color: c, weight: 1, fillOpacity: .35, interactive: false }).addTo(bioLayer);
  }
}

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
