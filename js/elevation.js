// Nadmořská výška z výškových dlaždic Terrarium (stejný zdroj jako stínování a vrstevnice).
// Všichni hráči čtou stejnou dlaždici a stejný pixel → rozmisťování zůstává deterministické.

const tiles = new Map(); // "z/x/y" -> { state: 'loading' | 'ok' | 'error', data, t }
const MAX_TILES = 16;    // dlaždice z12 má ~10 km, víc není potřeba držet v paměti
const RETRY_MS = 5 * 60000;
let CFG = null, onChange = () => {};

export function elevSetConfig(cfg, cb) { CFG = cfg; if (cb) onChange = cb; }

// Kódování Terrarium: výška = R·256 + G + B/256 − 32768 (metry)
export function elevationFromRGB(r, g, b) { return r * 256 + g + b / 256 - 32768; }

// Dlaždice a pixel (0–255) pro bod v Web Mercatoru
export function tileFor(lat, lon, z) {
  const n = 2 ** z, x = (lon + 180) / 360 * n, r = lat * Math.PI / 180;
  const y = (1 - Math.log(Math.tan(r) + 1 / Math.cos(r)) / Math.PI) / 2 * n;
  const tx = Math.floor(x), ty = Math.floor(y);
  return { tx, ty, px: Math.min(255, Math.floor((x - tx) * 256)), py: Math.min(255, Math.floor((y - ty) * 256)) };
}

/**
 * Výška v metrech; null = dlaždice se ještě načítá; NaN = výška není k dispozici (výpadek, offline bez cache).
 */
export function elevationAt(lat, lon) {
  if (!CFG || lat == null || lon == null) return NaN;
  const z = Number(CFG.spawn.elevZoom) || 12, t = tileFor(lat, lon, z), key = z + '/' + t.tx + '/' + t.ty;
  const e = tiles.get(key);
  if (!e || (e.state === 'error' && Date.now() - e.t > RETRY_MS)) { load(key, z, t.tx, t.ty); return null; }
  if (e.state === 'loading') return null;
  if (e.state === 'error') return NaN;
  e.t = Date.now();
  const i = (t.py * 256 + t.px) * 4;
  return Math.round(elevationFromRGB(e.data[i], e.data[i + 1], e.data[i + 2]));
}

async function load(key, z, x, y) {
  tiles.set(key, { state: 'loading', t: Date.now() });
  try {
    const url = CFG.map.demUrl.replace('{z}', z).replace('{x}', x).replace('{y}', y);
    const r = await fetch(url);
    if (!r.ok) throw new Error('výška ' + r.status);
    // bez převodu barev a přednásobení alfou, jinak by se zakódovaná výška zkreslila
    const bmp = await createImageBitmap(await r.blob(), { colorSpaceConversion: 'none', premultiplyAlpha: 'none' });
    const c = typeof OffscreenCanvas !== 'undefined' ? new OffscreenCanvas(256, 256) : Object.assign(document.createElement('canvas'), { width: 256, height: 256 });
    const ctx = c.getContext('2d', { willReadFrequently: true, colorSpace: 'srgb' });
    ctx.drawImage(bmp, 0, 0, 256, 256);
    tiles.set(key, { state: 'ok', data: ctx.getImageData(0, 0, 256, 256).data, t: Date.now() });
  } catch (err) {
    tiles.set(key, { state: 'error', t: Date.now() });
  }
  // shortcut: odhazuje nejdéle nepoužité dlaždice podle času, stačí pro pár dlaždic kolem hráče
  if (tiles.size > MAX_TILES) {
    const old = [...tiles.entries()].filter(([, v]) => v.state !== 'loading').sort((a, b) => a[1].t - b[1].t);
    for (const [k] of old.slice(0, tiles.size - MAX_TILES)) tiles.delete(k);
  }
  onChange();
}
