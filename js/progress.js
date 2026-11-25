// Postup hráče: XP a úrovně, odznaky, sběratelská alba, denní a týdenní úkoly, kvíz po úlovku
import { esc, parseMap } from './config.js';
import { hash01 } from './geo.js';
import { ic, ICON_FILES } from './icons.js';

const num = (v, d = 0) => Number.isFinite(Number(v)) ? Number(v) : d;
const list = s => String(s || '').split(',').map(x => x.trim()).filter(Boolean);

/* ---------- XP a úrovně ---------- */
// Na další úroveň je potřeba levelBase × levelGrowth^(úroveň−1) XP
export function levelFor(xp, G) {
  let level = 1, rest = Math.max(0, num(xp));
  for (;;) {
    const need = Math.round(num(G.levelBase, 100) * Math.pow(Math.max(1, num(G.levelGrowth, 1.4)), level - 1));
    if (rest < need || level >= 99) return { level, into: rest, need };
    rest -= need; level++;
  }
}
// Od které úrovně je vzácnost (a funkce) přístupná
export const levelNeeded = (map, key) => num(parseMap(map)[key], 1) || 1;

/* ---------- čítače, odznaky, alba ---------- */
export function cleanProgress(s) {
  const c = s && typeof s.counters === 'object' && s.counters ? s.counters : {};
  const q = s && s.quests && typeof s.quests === 'object' ? s.quests : {};
  return {
    xp: Math.max(0, num(s && s.xp)), cones: Math.max(0, num(s && s.cones)), points: Math.max(0, num(s && s.points)),
    counters: Object.fromEntries(['catches', 'newSpecies', 'verified', 'quiz', 'km', 'stamps', 'released', 'evolved', 'tracks'].map(k => [k, Math.max(0, num(c[k]))])),
    badges: Object.fromEntries(Object.entries((s && s.badges) || {}).map(([k, v]) => [String(k).slice(0, 40), num(v)])),
    quests: { day: String(q.day || ''), week: String(q.week || ''), items: Array.isArray(q.items) ? q.items.filter(i => i && i.id).map(i => ({ id: String(i.id), p: Math.max(0, num(i.p)), done: !!i.done })) : [] }
  };
}

export function albumProgress(album, caught) {
  const ids = list(album.species);
  return { have: ids.filter(id => caught[id] && caught[id].count).length, total: ids.length };
}

// Hodnota, kterou odznak sleduje
function badgeValue(b, st, level, cfg) {
  const caughtN = Object.values(st.caught).filter(c => c.count).length;
  switch (b.kind) {
    case 'species': return caughtN;
    case 'level': return level;
    case 'album': { const a = cfg.albums.find(x => x.id === b.album); if (!a) return 0; const p = albumProgress(a, st.caught); return p.total && p.have >= p.total ? 1 : 0; }
    default: return num(st.counters[b.kind]);
  }
}
const badgeGoal = b => b.kind === 'album' ? 1 : num(b.value, 1);
// Nově získané odznaky (zapíše je do stavu)
export function checkBadges(cfg, st, level, now = Date.now()) {
  const got = [];
  for (const b of cfg.badges) if (!st.badges[b.id] && badgeValue(b, st, level, cfg) >= badgeGoal(b)) { st.badges[b.id] = now; got.push(b); }
  return got;
}

/* ---------- úkoly ---------- */
const pad = n => String(n).padStart(2, '0');
export const dayKey = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
export function weekKey(d) {
  const t = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const day = t.getUTCDay() || 7; t.setUTCDate(t.getUTCDate() + 4 - day);
  const y = t.getUTCFullYear(), w = Math.ceil(((t - Date.UTC(y, 0, 1)) / 86400000 + 1) / 7);
  return `${y}-W${pad(w)}`;
}
// Výběr úkolů je daný datem → celá rodina má stejné úkoly
function pick(tpls, n, key, seed) {
  const k = [...key].reduce((h, ch) => (h * 31 + ch.charCodeAt(0)) | 0, 0);
  return tpls.map((t, i) => [t, hash01(seed, k, i, 7)]).sort((a, b) => a[1] - b[1]).slice(0, n).map(x => x[0]);
}
// Obnoví úkoly na nový den/týden; vrátí aktuální seznam [{t: šablona, p, done}]
export function currentQuests(cfg, st, now = new Date()) {
  const G = cfg.game, d = dayKey(now), w = weekKey(now), q = st.quests;
  if (q.day !== d || q.week !== w) {
    const per = p => i => (cfg.quests.find(t => t.id === i.id) || {}).period === p;
    const fresh = (p, n, key) => pick(cfg.quests.filter(t => t.period === p), n, key, cfg.spawn.seed).map(t => ({ id: t.id, p: 0, done: false }));
    const daily = q.day === d ? q.items.filter(per('day')) : fresh('day', num(G.questsPerDay, 3), d);
    const weekly = q.week === w ? q.items.filter(per('week')) : fresh('week', num(G.questsPerWeek, 2), w);
    st.quests = { day: d, week: w, items: [...daily, ...weekly] };
  }
  return st.quests.items.map(i => ({ ...i, t: cfg.quests.find(t => t.id === i.id) })).filter(i => i.t);
}
// Událost ve hře posune úkoly; vrátí nově splněné šablony
export function questEvent(cfg, st, ev, now = new Date()) {
  const done = [];
  for (const i of currentQuests(cfg, st, now)) {
    if (i.done) continue;
    const t = i.t;
    let add = 0;
    if (t.kind === 'catchGroup') add = ev.kind === 'catch' && ev.group === t.param ? 1 : 0;
    else if (t.kind === 'catchBio') add = ev.kind === 'catch' && ev.bio === t.param ? 1 : 0;
    else if (t.kind === ev.kind) add = num(ev.n, 1);
    if (!add) continue;
    const it = st.quests.items.find(x => x.id === t.id);
    it.p = Math.min(num(t.count, 1), it.p + add);
    if (it.p >= num(t.count, 1)) { it.done = true; done.push(t); }
  }
  return done;
}

/* ---------- kvíz ---------- */
// Otázky z polí, která hráč právě četl. Špatné odpovědi = hodnoty téhož pole u jiných druhů.
// Otázka bez skloňování názvu (název druhu je v nadpisu)
const QUIZ = [
  ['family', () => 'Do které čeledi patří?'],
  ['length', () => 'Jak je velký?'],
  ['diet', () => 'Čím se živí?'],
  ['migration', () => 'Jak tráví zimu?'],
  ['breedTime', () => 'Kdy se rozmnožuje?']
];
// První slovo bez diakritiky a koncovek – „stálý“ a „stálá“ jsou pro kvíz stejná odpověď
const stem = v => String(v).normalize('NFD').replace(/\p{M}/gu, '').toLowerCase().split(/[\s,;(–-]+/).filter(Boolean)[0]?.slice(0, 4) || '';
export const QUIZ_FIELDS = QUIZ.map(q => q[0]);
export function makeQuiz(sp, all, rand = Math.random) {
  const val = (s, f) => String((s.edu || {})[f] || '').trim();
  const opts = QUIZ.filter(([f]) => val(sp, f)).map(([f, q]) => {
    const right = val(sp, f);
    const seen = new Set([stem(right)]), wrong = [];
    for (const o of all) { const v = val(o, f), k = stem(v); if (o.id !== sp.id && v && !seen.has(k)) { seen.add(k); wrong.push(v); } }
    return { f, q: q(sp), right, wrong };
  }).filter(o => o.wrong.length >= 2);
  if (!opts.length) return null;
  const o = opts[Math.floor(rand() * opts.length)];
  const wrong = o.wrong.sort(() => rand() - .5).slice(0, 2);
  const answers = [o.right, ...wrong].sort(() => rand() - .5);
  return { q: o.q, answers, correct: answers.indexOf(o.right), field: o.f };
}

/* ---------- profil ---------- */
export function profileHTML(cfg, st, lv, extra = '') {
  const G = cfg.game, pct = Math.round(lv.into / lv.need * 100);
  const quests = currentQuests(cfg, st);
  const qrow = i => `<div class="quest${i.done ? ' done' : ''}"><span>${i.done ? '✔' : esc(i.t.period === 'week' ? '📅' : '☀️')} ${esc(i.t.name)}</span><span>${i.t.kind === 'walk' ? (i.p / 1000).toFixed(1).replace('.', ',') + ' / ' + (num(i.t.count) / 1000).toFixed(1).replace('.', ',') + ' km' : i.p + ' / ' + num(i.t.count, 1)}</span></div>`;
  const nextUnlocks = Object.entries(parseMap(G.unlocks)).concat(Object.entries(parseMap(G.rarityLevel)).map(([r, l]) => ['vzacnost' + r, l]))
    .filter(([, l]) => l > lv.level).sort((a, b) => a[1] - b[1]).slice(0, 3);
  return `<h2>Úroveň ${lv.level}</h2>
  <div class="prog" title="${lv.into} / ${lv.need} XP"><div style="width:${pct}%"></div></div><p class="msg small">${lv.into} / ${lv.need} XP do další úrovně · celkem ${Math.round(st.xp)} XP</p>
  ${nextUnlocks.length ? `<p class="msg small">Brzy odemkneš: ${nextUnlocks.map(([k, l]) => esc(unlockName(cfg, k)) + ' (úr. ' + l + ')').join(', ')}</p>` : ''}
  <h3>Úkoly</h3>${quests.map(qrow).join('') || '<p class="msg small">Žádné úkoly.</p>'}
  <h3>Sběratelská alba</h3><div class="albums">${cfg.albums.map(a => { const p = albumProgress(a, st.caught); return `<div class="album${p.have >= p.total && p.total ? ' done' : ''}"><span class="aic" aria-hidden="true">${ICON_FILES.has('alb_' + a.id) ? ic('alb_' + a.id) : esc(a.icon)}</span><b>${esc(a.name)}</b><small>${p.have} / ${p.total}</small><div class="prog"><div style="width:${p.total ? p.have / p.total * 100 : 0}%"></div></div></div>`; }).join('')}</div>
  <h3>Odznaky</h3><div class="badges">${cfg.badges.map(b => `<div class="badge${st.badges[b.id] ? ' on' : ''}" title="${esc(b.name)}">${ICON_FILES.has('badge_' + b.id) ? `<span class="medal full" aria-hidden="true">${ic('badge_' + b.id)}</span>` : ICON_FILES.has('badge') ? `<span class="medal" aria-hidden="true">${ic('badge')}<i>${esc(b.icon)}</i></span>` : `<span aria-hidden="true">${esc(b.icon)}</span>`}<small>${esc(b.name)}</small></div>`).join('')}</div>
  ${extra}
  <button class="btn full ghost" data-act="close">Zavřít</button>`;
}
export const UNLOCK_NAMES = { shop: 'obchod', release: 'vypouštění', evolve: 'vývoj zvířat', train: 'trénink', contests: 'soutěže', hide: 'skrýše' };
export function unlockName(cfg, k) {
  if (k.startsWith('vzacnost')) { const r = cfg.rarities.find(x => String(x.id) === k.slice(8)); return 'zvířata: ' + (r ? r.name.toLowerCase() : k); }
  return UNLOCK_NAMES[k] || k;
}
