// Generátor QR kódů (bajtový režim, oprava chyb M, verze 1–15) – podle normy ISO/IEC 18004.
// Bez knihovny: QR kód nese odkaz na událost od rodiče, telefon ho načte fotoaparátem.
const ECC_PER_BLOCK_M = [-1, 10, 16, 26, 18, 24, 16, 18, 22, 22, 26, 30, 22, 22, 24, 24];
const BLOCKS_M = [-1, 1, 1, 1, 2, 2, 4, 4, 4, 5, 5, 5, 8, 9, 9, 10];
const MAX_VER = 15;

export function gfMul(x, y) {
  let z = 0;
  for (let i = 7; i >= 0; i--) { z = (z << 1) ^ ((z >>> 7) * 0x11D); z ^= ((y >>> i) & 1) * x; }
  return z & 255;
}
function rsDivisor(n) {
  const r = new Array(n).fill(0); r[n - 1] = 1;
  let root = 1;
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n; j++) { r[j] = gfMul(r[j], root); if (j + 1 < n) r[j] ^= r[j + 1]; }
    root = gfMul(root, 2);
  }
  return r;
}
export function rsEcc(data, n) {
  const div = rsDivisor(n), r = new Array(n).fill(0);
  for (const b of data) {
    const f = b ^ r.shift(); r.push(0);
    for (let i = 0; i < n; i++) r[i] ^= gfMul(div[i], f);
  }
  return r;
}
const rawModules = v => { let r = (16 * v + 128) * v + 64; if (v >= 2) { const a = Math.floor(v / 7) + 2; r -= (25 * a - 10) * a - 55; if (v >= 7) r -= 36; } return r; };
const dataCodewords = v => Math.floor(rawModules(v) / 8) - ECC_PER_BLOCK_M[v] * BLOCKS_M[v];
// Formátové bity (oprava M = 00) a bity verze – BCH kódy z normy
export function formatBits(mask) { const d = (0 << 3) | mask; let r = d; for (let i = 0; i < 10; i++) r = (r << 1) ^ ((r >>> 9) * 0x537); return ((d << 10) | r) ^ 0x5412; }
export function versionBits(v) { let r = v; for (let i = 0; i < 12; i++) r = (r << 1) ^ ((r >>> 11) * 0x1F25); return (v << 12) | r; }
function alignPos(v) {
  if (v === 1) return [];
  const n = Math.floor(v / 7) + 2, size = v * 4 + 17, step = Math.ceil((v * 4 + 4) / (n * 2 - 2)) * 2, out = [6];
  for (let p = size - 7; out.length < n; p -= step) out.splice(1, 0, p);
  return out;
}
const MASKS = [(x, y) => (x + y) % 2 === 0, (x, y) => y % 2 === 0, x => x % 3 === 0, (x, y) => (x + y) % 3 === 0,
  (x, y) => (Math.floor(x / 3) + Math.floor(y / 2)) % 2 === 0, (x, y) => x * y % 2 + x * y % 3 === 0,
  (x, y) => (x * y % 2 + x * y % 3) % 2 === 0, (x, y) => ((x + y) % 2 + x * y % 3) % 2 === 0];

// Vrátí matici true/false (true = tmavý modul) nebo vyhodí chybu, když je text moc dlouhý
export function qrMatrix(text) {
  const bytes = [...new TextEncoder().encode(text)];
  let v = 1;
  while (v <= MAX_VER && 4 + (v < 10 ? 8 : 16) + bytes.length * 8 > dataCodewords(v) * 8) v++;
  if (v > MAX_VER) throw new Error('QR: text je moc dlouhý');
  // datové bity: režim bajtů, délka, data, ukončení, výplň
  const bits = [], put = (val, n) => { for (let i = n - 1; i >= 0; i--) bits.push((val >>> i) & 1); };
  put(4, 4); put(bytes.length, v < 10 ? 8 : 16); bytes.forEach(b => put(b, 8));
  const cap = dataCodewords(v) * 8;
  put(0, Math.min(4, cap - bits.length)); while (bits.length % 8) bits.push(0);
  const data = []; for (let i = 0; i < bits.length; i += 8) data.push(bits.slice(i, i + 8).reduce((a, b) => a * 2 + b, 0));
  for (let p = 0xEC; data.length < cap / 8; p ^= 0xEC ^ 0x11) data.push(p);
  // bloky s opravou chyb a prokládání
  const nb = BLOCKS_M[v], ecl = ECC_PER_BLOCK_M[v], raw = Math.floor(rawModules(v) / 8), nShort = nb - raw % nb, shortLen = Math.floor(raw / nb);
  const blocks = []; let k = 0;
  for (let i = 0; i < nb; i++) {
    const dat = data.slice(k, k += shortLen - ecl + (i < nShort ? 0 : 1)), ecc = rsEcc(dat, ecl);
    if (i < nShort) dat.push(0);
    blocks.push(dat.concat(ecc));
  }
  const cw = [];
  for (let i = 0; i < blocks[0].length; i++) for (let j = 0; j < nb; j++) if (i !== shortLen - ecl || j >= nShort) cw.push(blocks[j][i]);
  // funkční vzory
  const size = v * 4 + 17, m = Array.from({ length: size }, () => new Array(size).fill(false)), fn = Array.from({ length: size }, () => new Array(size).fill(false));
  const set = (x, y, d) => { m[y][x] = d; fn[y][x] = true; };
  for (let i = 0; i < size; i++) { set(6, i, i % 2 === 0); set(i, 6, i % 2 === 0); }
  const finder = (cx, cy) => { for (let dy = -4; dy <= 4; dy++) for (let dx = -4; dx <= 4; dx++) { const x = cx + dx, y = cy + dy, d = Math.max(Math.abs(dx), Math.abs(dy)); if (x >= 0 && x < size && y >= 0 && y < size) set(x, y, d !== 2 && d !== 4); } };
  finder(3, 3); finder(size - 4, 3); finder(3, size - 4);
  const ap = alignPos(v);
  for (let i = 0; i < ap.length; i++) for (let j = 0; j < ap.length; j++) {
    if ((i === 0 && j === 0) || (i === 0 && j === ap.length - 1) || (i === ap.length - 1 && j === 0)) continue;
    for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) set(ap[i] + dx, ap[j] + dy, Math.max(Math.abs(dx), Math.abs(dy)) !== 1);
  }
  const drawFormat = mask => {
    const b = formatBits(mask), bit = i => ((b >>> i) & 1) === 1;
    for (let i = 0; i <= 5; i++) set(8, i, bit(i));
    set(8, 7, bit(6)); set(8, 8, bit(7)); set(7, 8, bit(8));
    for (let i = 9; i < 15; i++) set(14 - i, 8, bit(i));
    for (let i = 0; i < 8; i++) set(size - 1 - i, 8, bit(i));
    for (let i = 8; i < 15; i++) set(8, size - 15 + i, bit(i));
    set(8, size - 8, true);
  };
  drawFormat(0); // zarezervuje místa formátu
  if (v >= 7) { const b = versionBits(v); for (let i = 0; i < 18; i++) { const d = ((b >>> i) & 1) === 1, a = size - 11 + i % 3, c = Math.floor(i / 3); set(a, c, d); set(c, a, d); } }
  // data cikcak zdola nahoru po dvojicích sloupců
  let bi = 0;
  for (let right = size - 1; right >= 1; right -= 2) {
    if (right === 6) right = 5;
    for (let vert = 0; vert < size; vert++) for (let j = 0; j < 2; j++) {
      const x = right - j, up = ((right + 1) & 2) === 0, y = up ? size - 1 - vert : vert;
      if (!fn[y][x] && bi < cw.length * 8) { m[y][x] = ((cw[bi >>> 3] >>> (7 - (bi & 7))) & 1) === 1; bi++; }
    }
  }
  // maska s nejmenší penalizací (běhy, bloky 2×2, poměr tmavých)
  let best = null;
  for (let mask = 0; mask < 8; mask++) {
    const t = m.map(r => r.slice());
    for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) if (!fn[y][x] && MASKS[mask](x, y)) t[y][x] = !t[y][x];
    let pen = 0, dark = 0;
    for (let y = 0; y < size; y++) {
      let runR = 1, runC = 1;
      for (let x = 0; x < size; x++) {
        if (t[y][x]) dark++;
        if (x > 0) { if (t[y][x] === t[y][x - 1]) { runR++; if (runR === 5) pen += 3; else if (runR > 5) pen++; } else runR = 1; if (t[x][y] === t[x - 1][y]) { runC++; if (runC === 5) pen += 3; else if (runC > 5) pen++; } else runC = 1; }
        if (x > 0 && y > 0 && t[y][x] === t[y][x - 1] && t[y][x] === t[y - 1][x] && t[y][x] === t[y - 1][x - 1]) pen += 3;
      }
    }
    pen += Math.floor(Math.abs(dark * 20 - size * size * 10) / (size * size)) * 10;
    if (!best || pen < best.pen) best = { pen, mask, t };
  }
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) m[y][x] = best.t[y][x];
  drawFormat(best.mask);
  return m;
}

export function qrSVG(text, px = 6) {
  const m = qrMatrix(text), n = m.length, q = 4;
  let d = '';
  for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) if (m[y][x]) d += `M${x + q} ${y + q}h1v1h-1z`;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${n + 2 * q} ${n + 2 * q}" width="${(n + 2 * q) * px}" height="${(n + 2 * q) * px}" shape-rendering="crispEdges" role="img" aria-label="QR kód"><rect width="100%" height="100%" fill="#fff"/><path d="${d}" fill="#000"/></svg>`;
}
