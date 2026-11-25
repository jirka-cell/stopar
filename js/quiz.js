// Kvíz o 10 otázkách ze zvířat, která hráč chytil. Otázky se skládají z údajů o druzích (po opravách z doložené tabulky).
// Čisté funkce bez DOM, aby šly testovat. rand = generátor čísel 0–1 (se stejným seedem vyjde stejný kvíz – pro výzvu kamaráda).

const val = (s, f) => String((s.edu || {})[f] || '').trim();
// První slovo bez diakritiky – „stálý“ a „stálá“ jsou pro kvíz stejná odpověď
const stem = v => String(v).normalize('NFD').replace(/\p{M}/gu, '').toLowerCase().split(/[\s,;(–-]+/).filter(Boolean)[0]?.slice(0, 4) || '';
const short = (v, n = 90) => (v.length > n ? v.slice(0, n - 1).replace(/[\s,;]+\S*$/, '') + '…' : v);

// Zakryje v textu slova, která prozradí odpověď (začínají jako slova z názvu druhu, bez ohledu na diakritiku)
const plain = w => w.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase();
export function hideName(text, name) {
  const roots = name.split(/\s+/).filter(w => w.length > 3).map(w => plain(w).slice(0, 4));
  return String(text).replace(/\p{L}+/gu, w => (w.length > 3 && roots.includes(plain(w).slice(0, 4)) ? '…' : w));
}
// Generátor se seedem (mulberry32)
export function seeded(seed) {
  let a = seed >>> 0;
  return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}

// Typy otázek: [klíč, otázka, správná odpověď, odpověď jiného druhu (pro špatné možnosti)]
const NAME = s => s.name;
export const QUIZ_TYPES = [
  ['obr', () => 'Kdo je na obrázku?', NAME, NAME],
  ['stopa', () => 'Čí je tahle stopa nebo pobytové znamení?', NAME, NAME],
  ['fakt', s => `O kom to je? „${short(hideName(s.fact, s.name), 140)}“`, NAME, NAME],
  ['potrava', s => `Čím se živí ${s.name.toLowerCase()}?`, s => short(val(s, 'diet')), o => short(val(o, 'diet'))],
  ['velikost', s => `Jak velký je ${s.name.toLowerCase()}?`, s => val(s, 'length'), o => val(o, 'length')],
  ['zima', s => `Jak tráví zimu ${s.name.toLowerCase()}?`, s => short(val(s, 'migration')), o => short(val(o, 'migration'))],
  ['hnizdo', s => `Kde hnízdí nebo se rozmnožuje ${s.name.toLowerCase()}?`, s => short(val(s, 'breedPlace')), o => short(val(o, 'breedPlace'))]
];
const BY_NAME = new Set(['obr', 'stopa', 'fakt']); // odpovědi jsou jména – špatné možnosti ze stejné skupiny (ať to není moc snadné)

// Jedna otázka pro druh a typ, nebo null (chybí údaj nebo dost špatných odpovědí)
export function quizQuestion(sp, type, all, rand, { hasTrack = () => false } = {}) {
  const t = QUIZ_TYPES.find(x => x[0] === type); if (!t) return null;
  const [, q, rightOf, otherOf] = t;
  if (type === 'stopa' && !hasTrack(sp.id)) return null;
  if (type === 'fakt' && !String(sp.fact || '').trim()) return null;
  const right = String(rightOf(sp) || '').trim(); if (!right) return null;
  // jména: špatné možnosti ze stejné skupiny; popisy: z jiných skupin, aby se nepletly podobné správné odpovědi
  const same = BY_NAME.has(type), seen = new Set([stem(right), right]), wrong = [];
  const order = all.map(o => [o, ((o.group === sp.group) === same ? 0 : 1) + rand()]).sort((a, b) => a[1] - b[1]).map(x => x[0]);
  for (const o of order) {
    if (o.id === sp.id) continue;
    const v = String(otherOf(o) || '').trim(), k = same ? v : stem(v);
    if (v && !seen.has(k) && !seen.has(v)) { seen.add(k); seen.add(v); wrong.push(v); }
    if (wrong.length === 2) break;
  }
  if (wrong.length < 2) return null;
  const answers = [right, ...wrong].map(a => [a, rand()]).sort((a, b) => a[1] - b[1]).map(x => x[0]);
  return { key: type + ':' + sp.id, type, sp: sp.id, q: q(sp), answers, correct: answers.indexOf(right) };
}

// Kvíz: n otázek ze zvířat v `ids` (chycené druhy), každý druh nejvýš 2×, typy se střídají
export function buildQuiz(ids, all, rand = Math.random, { n = 10, hasTrack } = {}) {
  const mine = all.filter(s => ids.includes(s.id));
  const pairs = mine.flatMap(sp => QUIZ_TYPES.map(([t]) => [sp, t, rand()])).sort((a, b) => a[2] - b[2]);
  const out = [], perSp = {}, perType = {};
  for (const [sp, t] of pairs) {
    if (out.length >= n) break;
    if ((perSp[sp.id] || 0) >= 2 || (perType[t] || 0) >= Math.ceil(n / 3)) continue;
    const q = quizQuestion(sp, t, all, rand, { hasTrack }); if (!q) continue;
    out.push(q); perSp[sp.id] = (perSp[sp.id] || 0) + 1; perType[t] = (perType[t] || 0) + 1;
  }
  return out;
}
