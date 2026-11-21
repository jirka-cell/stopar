// Offline balíček: stáhne dopředu mapu, výškopis a písma kolem místa do vlastní cache (běžné promazávání dlaždic ji nemaže).
// Biotopy a turistické trasy se stahují přes jejich moduly (IndexedDB).
import { esc } from './config.js';

export const OFFLINE_CACHE = 'stopar-offline';
const num = (v, d = 0) => Number.isFinite(Number(v)) ? Number(v) : d;
const FONTS = ['Noto Sans Regular', 'Noto Sans Bold', 'Noto Sans Italic'], RANGES = ['0-255', '256-511', '8192-8447'];

// Dlaždice (x, y) v zoomu z pokrývající kruh o poloměru r m kolem bodu (Web Mercator)
export function tileRange(lat, lon, r, z) {
  const n = 2 ** z, dLat = r / 111320, dLon = r / (111320 * Math.cos(lat * Math.PI / 180));
  const tx = lo => Math.floor((lo + 180) / 360 * n), ty = la => { const rr = la * Math.PI / 180; return Math.floor((1 - Math.log(Math.tan(rr) + 1 / Math.cos(rr)) / Math.PI) / 2 * n); };
  const out = [];
  for (let x = tx(lon - dLon); x <= tx(lon + dLon); x++) for (let y = ty(lat + dLat); y <= ty(lat - dLat); y++) out.push([x, y]);
  return out;
}
// Seznam adres ke stažení: vektorová mapa z 8–14 (víc OpenFreeMap nemá), výškopis z 8–13, písma
export function planUrls(vectorTiles, demUrl, glyphsUrl, lat, lon, r) {
  const urls = [];
  const fill = (tpl, z0, z1) => { for (let z = z0; z <= z1; z++) for (const [x, y] of tileRange(lat, lon, r, z)) urls.push(tpl.replace('{z}', z).replace('{x}', x).replace('{y}', y)); };
  if (vectorTiles) fill(vectorTiles, 8, 14);
  if (demUrl) fill(demUrl, 8, 13);
  if (glyphsUrl) for (const f of FONTS) for (const rg of RANGES) urls.push(glyphsUrl.replace('{fontstack}', encodeURIComponent(f)).replace('{range}', rg));
  return urls;
}
// Odhad pro výběr: dlaždice, čtverce biotopů a velikost (průměr ~45 kB mapa, ~90 kB výškopis, ~4 kB biotopy)
export function estimate(lat, lon, r, chunkDeg) {
  let vec = 0, dem = 0;
  for (let z = 8; z <= 14; z++) vec += tileRange(lat, lon, r, z).length;
  for (let z = 8; z <= 13; z++) dem += tileRange(lat, lon, r, z).length;
  const d = num(chunkDeg, 0.01), chunks = Math.ceil(2 * r / 111320 / d + 1) * Math.ceil(2 * r / (111320 * Math.cos(lat * Math.PI / 180)) / d + 1);
  const mb = (vec * 45 + dem * 90 + chunks * 4) / 1024;
  return { vec, dem, chunks, mb: Math.round(mb * 10) / 10, minutes: Math.max(1, Math.round(chunks * 3 / 60 + (vec + dem) / 4 * 0.25 / 60)) };
}
// Stahuje po několika najednou; onProgress(hotovo, celkem); vrátí počet chyb. Už uložené se přeskočí.
export async function download(urls, onProgress, signal, conc = 4) {
  const c = await caches.open(OFFLINE_CACHE);
  let i = 0, done = 0, fail = 0;
  const worker = async () => {
    while (i < urls.length && !(signal && signal.aborted)) {
      const u = urls[i++];
      try {
        if (!(await c.match(u))) { const r = await fetch(u, { signal }); if (r.ok) await c.put(u, r); else fail++; }
      } catch (e) { if (signal && signal.aborted) return; fail++; }
      onProgress(++done, urls.length);
    }
  };
  await Promise.all(Array.from({ length: conc }, worker));
  return fail;
}
export async function removeUrls(urls) { const c = await caches.open(OFFLINE_CACHE); await Promise.all(urls.map(u => c.delete(u))); }

export function cleanAreas(a) {
  return (Array.isArray(a) ? a : []).filter(x => x && Number.isFinite(Number(x.lat))).slice(-20).map(x => ({ id: String(x.id || '').slice(0, 20), n: String(x.n || 'Oblast').slice(0, 60), lat: num(x.lat), lon: num(x.lon), r: num(x.r, 5000), d: num(x.d), mb: num(x.mb), tpl: String(x.tpl || '').slice(0, 300) }));
}
export function offlineHTML(cfg, areas, sel, est, prog) {
  const R = String(cfg.offline.radii || '2000,5000,10000').split(',').map(Number).filter(v => v > 0 && v <= num(cfg.offline.maxRadius, 10000));
  return `<h2>Offline mapy</h2><p class="msg small">Stáhni si okolí dopředu přes Wi-Fi – mapa, výškopis, biotopy a turistické trasy pak fungují i bez signálu.</p>
  <div class="look"><div class="chips">${R.map(r => `<button class="chip${sel === r ? ' on' : ''}" data-act="offR" data-v="${r}">${r / 1000} km kolem</button>`).join('')}</div></div>
  ${est ? `<p class="msg small">Asi ${est.vec + est.dem} dlaždic a ${est.chunks} čtverců biotopů · ~${String(est.mb).replace('.', ',')} MB · ~${est.minutes} min${est.chunks > 300 ? '<br>Velká oblast – stahuj jen přes Wi-Fi a nech telefon zapnutý.' : ''}</p>` : '<p class="msg small">Počkej na polohu.</p>'}
  ${prog ? `<div class="prog"><div style="width:${prog.p}%"></div></div><p class="msg small">${esc(prog.text)}</p><button class="btn full" data-act="offStop">Zastavit</button>`
    : `<button class="btn primary full" data-act="offGo"${est ? '' : ' disabled'}>Stáhnout okolí</button>`}
  ${areas.length ? `<h3>Stažené oblasti</h3>${areas.map(a => `<div class="quest"><span><b>${esc(a.n)}</b><br><small>${a.r / 1000} km · ~${String(a.mb).replace('.', ',')} MB · ${new Date(a.d).toLocaleDateString('cs-CZ')}</small></span><button class="btn sm ghost" data-act="offDel" data-id="${esc(a.id)}" data-confirm="Smazat?">Smazat</button></div>`).join('')}` : ''}
  <button class="btn full ghost" data-act="close">Zavřít</button>`;
}
