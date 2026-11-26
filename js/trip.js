// Karta výletu: trasa a místa úlovků posledních 3 dnů hraní (jen v telefonu), výběr dne a času, karta s mapou.
// Kvůli soukromí se začátek a konec trasy (obvykle domov) odřízne. Čisté funkce bez DOM kromě kreslení karty.
import { dist } from './geo.js';

const DAY_RE = /^\d{4}-\d{2}-\d{2}$/;
export const TRIP_DAYS = 3, TRIM_M = 300, STEP_M = 20, MAX_PTS = 3000;
const n = v => Number.isFinite(Number(v)) ? Number(v) : NaN;
const minOfDay = t => { const d = new Date(t); return d.getHours() * 60 + d.getMinutes(); };

// { 'RRRR-MM-DD': { p: [[lat, lon, min]], c: [[lat, lon, idDruhu, min]] } } – jen 3 nejnovější dny
export function cleanTrack(s) {
  const out = {};
  const days = Object.keys(s && typeof s === 'object' ? s : {}).filter(k => DAY_RE.test(k)).sort().slice(-TRIP_DAYS);
  for (const k of days) {
    const v = s[k] || {};
    const p = (Array.isArray(v.p) ? v.p : []).filter(a => Array.isArray(a) && a.length >= 3 && a.slice(0, 3).every(x => Number.isFinite(n(x)))).slice(-MAX_PTS).map(a => [n(a[0]), n(a[1]), n(a[2])]);
    const c = (Array.isArray(v.c) ? v.c : []).filter(a => Array.isArray(a) && a.length >= 4 && Number.isFinite(n(a[0])) && Number.isFinite(n(a[1]))).slice(-200).map(a => [n(a[0]), n(a[1]), String(a[2]).slice(0, 40), n(a[3]) || 0]);
    out[k] = { p, c };
  }
  return out;
}
const day = (track, k) => (track[k] ||= { p: [], c: [] });
const trimDays = track => { for (const k of Object.keys(track).sort().slice(0, -TRIP_DAYS)) delete track[k]; };
// Bod trasy: nejdřív po STEP_M metrech (méně dat), zaokrouhleno na ~1 m
export function addTrackPoint(track, k, lat, lon, t = Date.now()) {
  const d = day(track, k), last = d.p[d.p.length - 1];
  if (last && dist(last[0], last[1], lat, lon) < STEP_M) return false;
  d.p.push([+lat.toFixed(5), +lon.toFixed(5), minOfDay(t)]); if (d.p.length > MAX_PTS) d.p.shift();
  trimDays(track); return true;
}
export function addTrackCatch(track, k, lat, lon, spId, t = Date.now()) {
  day(track, k).c.push([+lat.toFixed(5), +lon.toFixed(5), String(spId), minOfDay(t)]); trimDays(track);
}
// Úsek trasy v čase od–do (minuty dne), bez prvních a posledních TRIM_M metrů
export function tripPath(pts, from = 0, to = 1440, trim = TRIM_M) {
  const p = pts.filter(a => a[2] >= from && a[2] <= to);
  if (p.length < 2) return { path: [], km: 0, trimmed: false };
  const cum = [0]; for (let i = 1; i < p.length; i++) cum.push(cum[i - 1] + dist(p[i - 1][0], p[i - 1][1], p[i][0], p[i][1]));
  const total = cum[cum.length - 1];
  const path = total > trim * 3 ? p.filter((_, i) => cum[i] >= trim && cum[i] <= total - trim) : []; // krátká trasa = jen kolem domu → mapu nekreslit
  return { path: path.map(a => [a[0], a[1]]), km: total / 1000, trimmed: true };
}
export const tripCatches = (cs, from = 0, to = 1440) => cs.filter(a => a[3] >= from && a[3] <= to);
export const fmtMin = m => `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;

// Kreslení karty: o = { app, dogUrl, date, time, km, mapImg (canvas/obrázek s trasou), note, animals: [{url, name}] }
export async function tripCard(o) {
  const W = 800, H = 800, c = document.createElement('canvas'); c.width = W; c.height = H;
  const x = c.getContext('2d');
  const load = async u => { if (!u) return null; const im = new Image(); im.src = u; try { await im.decode(); return im; } catch (e) { return null; } };
  const [dog, ...ims] = await Promise.all([load(o.dogUrl), ...o.animals.slice(0, 8).map(a => load(a.url))]);
  x.fillStyle = '#f6f0e2'; x.fillRect(0, 0, W, H);
  x.fillStyle = '#2f5f3f'; x.fillRect(0, 0, W, 84);
  if (dog) x.drawImage(dog, 14, 8, 68, 68);
  x.fillStyle = '#fff'; x.font = 'bold 32px system-ui, sans-serif'; x.fillText((o.app || 'Stopuj s Aegonem') + ' – výlet', dog ? 92 : 24, 52);
  x.font = '20px system-ui, sans-serif'; x.textAlign = 'right'; x.fillText(o.date + (o.time ? ' · ' + o.time : ''), W - 20, 52); x.textAlign = 'left';
  const mx = 150, my = 104, mw = 500, mh = 500;
  x.fillStyle = '#e9e1cf'; x.beginPath(); x.roundRect(mx, my, mw, mh, 18); x.fill();
  if (o.mapImg) { x.save(); x.beginPath(); x.roundRect(mx, my, mw, mh, 18); x.clip(); x.drawImage(o.mapImg, mx, my, mw, mh); x.restore(); }
  else { x.fillStyle = '#6b7466'; x.font = '20px system-ui, sans-serif'; x.textAlign = 'center'; (o.noMap || 'Bez mapy').split('\n').forEach((l, i) => x.fillText(l, mx + mw / 2, my + mh / 2 + i * 28)); x.textAlign = 'left'; }
  // zvířata po stranách mapy (4 vlevo, 4 vpravo)
  ims.forEach((im, i) => {
    const left = i % 2 === 0, row = Math.floor(i / 2), cx = left ? 14 : W - 136, cy = my + row * 125;
    x.fillStyle = '#fffaf0'; x.beginPath(); x.roundRect(cx, cy, 122, 118, 14); x.fill();
    if (im) { const k = Math.min(110 / im.width, 84 / im.height); x.drawImage(im, cx + 61 - im.width * k / 2, cy + 46 - im.height * k / 2, im.width * k, im.height * k); }
    x.fillStyle = '#24301f'; x.font = '14px system-ui, sans-serif'; x.textAlign = 'center'; let t = o.animals[i].name; while (x.measureText(t).width > 116 && t.length > 3) t = t.slice(0, -1); x.fillText(t, cx + 61, cy + 108); x.textAlign = 'left';
  });
  x.fillStyle = '#24301f'; x.font = 'bold 54px system-ui, sans-serif'; x.fillText(o.km + ' km', 40, 690);
  x.font = '24px system-ui, sans-serif'; x.fillStyle = '#6b7466'; x.fillText(`${o.animals.length} ${o.animals.length === 1 ? 'zvíře' : o.animals.length < 5 && o.animals.length ? 'zvířata' : 'zvířat'}${o.stamps ? ' · ' + o.stamps + ' odznaků míst' : ''}`, 40, 730);
  if (o.note) { x.font = 'italic 17px system-ui, sans-serif'; x.fillStyle = '#8a7a66'; o.note.split('\n').forEach((l, i) => x.fillText(l, 40, H - 24 + i * 22 - (o.note.split('\n').length - 1) * 22)); }
  return new Promise(res => c.toBlob(res, 'image/png'));
}
