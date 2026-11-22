// Zmenšení GLB bez dalších knihoven: polohy na int16, normály na int8 (KHR_mesh_quantization, three.js je umí bez dekodéru).
// node tools/glb_quant.mjs vstup.glb výstup.glb
import { readFileSync, writeFileSync } from 'node:fs';

export function quantize(buf) {
  const jl = buf.readUInt32LE(12), J = JSON.parse(buf.subarray(20, 20 + jl).toString('utf8'));
  const bo = 20 + jl, bin = buf.subarray(bo + 8, bo + 8 + buf.readUInt32LE(bo));
  const A = J.accessors, V = J.bufferViews, N = { 5126: 3 }; // jen float vec3
  const readVec3 = a => { const v = V[a.bufferView], st = v.byteStride || 12, o = (v.byteOffset || 0) + (a.byteOffset || 0), out = new Float32Array(a.count * 3);
    for (let i = 0; i < a.count; i++) for (let k = 0; k < 3; k++) out[i * 3 + k] = bin.readFloatLE(o + i * st + k * 4); return out; };
  const ok = a => a && a.componentType === 5126 && a.type === 'VEC3' && !a.sparse && a.bufferView != null && N[a.componentType];
  // kdo používá které polohy (sdílené mezi meshi = nechat)
  const posUse = new Map();
  J.meshes.forEach((m, mi) => m.primitives.forEach(p => { const i = p.attributes.POSITION; (posUse.get(i) || posUse.set(i, new Set()).get(i)).add(mi); }));
  const newData = new Map(); // accessor -> {bytes, stride}
  const xf = new Map(); // mesh -> [center, scale]
  J.meshes.forEach((m, mi) => {
    if (m.primitives.some(p => p.targets || !ok(A[p.attributes.POSITION]) || posUse.get(p.attributes.POSITION).size > 1)) return;
    const lo = [Infinity, Infinity, Infinity], hi = [-Infinity, -Infinity, -Infinity], data = new Map();
    for (const p of m.primitives) { const i = p.attributes.POSITION, d = data.get(i) || readVec3(A[i]); data.set(i, d); for (let j = 0; j < d.length; j++) { lo[j % 3] = Math.min(lo[j % 3], d[j]); hi[j % 3] = Math.max(hi[j % 3], d[j]); } }
    const c = lo.map((l, k) => (l + hi[k]) / 2), s = Math.max(1e-6, ...hi.map((h, k) => (h - lo[k]) / 2)); // stejné měřítko ve všech osách → normály se nemusí přepočítat
    for (const [i, d] of data) {
      const b = Buffer.alloc(A[i].count * 8), mn = [32767, 32767, 32767], mx = [-32767, -32767, -32767];
      for (let j = 0; j < A[i].count; j++) for (let k = 0; k < 3; k++) { const q = Math.max(-32767, Math.min(32767, Math.round((d[j * 3 + k] - c[k]) / s * 32767))); b.writeInt16LE(q, j * 8 + k * 2); mn[k] = Math.min(mn[k], q); mx[k] = Math.max(mx[k], q); }
      newData.set(i, { b, stride: 8, ct: 5122, min: mn, max: mx });
    }
    xf.set(mi, [c, s]); // normalizované int16 = -1..1
  });
  // normály: int8
  for (const m of J.meshes) for (const p of m.primitives) {
    const i = p.attributes.NORMAL; if (i == null || newData.has(i) || !ok(A[i])) continue;
    const d = readVec3(A[i]), b = Buffer.alloc(A[i].count * 4);
    for (let j = 0; j < d.length; j++) b.writeInt8(Math.max(-127, Math.min(127, Math.round(d[j] * 127))), Math.floor(j / 3) * 4 + j % 3);
    newData.set(i, { b, stride: 4, ct: 5120 });
  }
  // nový binární blok: původní pohledy, které ještě něco používá, + nové
  const used = new Set(); A.forEach((a, i) => { if (!newData.has(i) && a.bufferView != null) used.add(a.bufferView); }); (J.images || []).forEach(im => im.bufferView != null && used.add(im.bufferView));
  const parts = [], views = [], remap = new Map(); let len = 0;
  const push = (bytes, extra) => { const pad = (4 - len % 4) % 4; if (pad) { parts.push(Buffer.alloc(pad)); len += pad; } views.push({ buffer: 0, byteOffset: len, byteLength: bytes.length, ...extra }); parts.push(bytes); len += bytes.length; return views.length - 1; };
  V.forEach((v, i) => { if (used.has(i)) { const { byteOffset, byteLength, ...rest } = v; remap.set(i, push(bin.subarray(v.byteOffset || 0, (v.byteOffset || 0) + v.byteLength), { ...rest, buffer: 0 })); } });
  A.forEach((a, i) => { const n = newData.get(i); if (n) { a.bufferView = push(n.b, { byteStride: n.stride, target: 34962 }); a.byteOffset = 0; a.componentType = n.ct; a.normalized = true; if (n.min) { a.min = n.min; a.max = n.max; } else { delete a.min; delete a.max; } } else if (a.bufferView != null) a.bufferView = remap.get(a.bufferView); });
  (J.images || []).forEach(im => { if (im.bufferView != null) im.bufferView = remap.get(im.bufferView); });
  J.bufferViews = views; J.buffers = [{ byteLength: len }];
  // přepočet zpět do původních rozměrů: mesh do nového podřízeného uzlu s posunem a měřítkem
  for (const n of [...J.nodes]) if (n.mesh != null && xf.has(n.mesh)) { const [c, s] = xf.get(n.mesh); J.nodes.push({ mesh: n.mesh, translation: c, scale: [s, s, s] }); delete n.mesh; (n.children = n.children || []).push(J.nodes.length - 1); }
  if (newData.size) for (const k of ['extensionsUsed', 'extensionsRequired']) J[k] = [...new Set([...(J[k] || []), 'KHR_mesh_quantization'])];
  let js = Buffer.from(JSON.stringify(J)); js = Buffer.concat([js, Buffer.alloc((4 - js.length % 4) % 4, 0x20)]);
  let bb = Buffer.concat(parts); bb = Buffer.concat([bb, Buffer.alloc((4 - bb.length % 4) % 4)]);
  const h = Buffer.alloc(12); h.write('glTF', 0); h.writeUInt32LE(2, 4); h.writeUInt32LE(12 + 8 + js.length + 8 + bb.length, 8);
  const ch = (b, t) => { const x = Buffer.alloc(8); x.writeUInt32LE(b.length, 0); x.writeUInt32LE(t, 4); return Buffer.concat([x, b]); };
  return Buffer.concat([h, ch(js, 0x4e4f534a), ch(bb, 0x004e4942)]);
}

if (process.argv[3]) { const i = readFileSync(process.argv[2]), o = quantize(i); writeFileSync(process.argv[3], o); console.log(process.argv[3], (i.length >> 10) + ' → ' + (o.length >> 10) + ' kB'); }
