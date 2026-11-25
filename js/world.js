// Svět: počasí (MET Norway), šero, sezónní události, kalendář přírody, skrýše, klidová pásma, barevné varianty,
// chráněná území (karta s odkazy) a turistické cíle s razítky
import { esc, parseMap, parseMonths, MONTH_NAMES } from './config.js';
import { icOr } from './icons.js';

const num = (v, d = 0) => Number.isFinite(Number(v)) ? Number(v) : d;
const lines = s => String(s || '').split('\n').map(l => l.trim()).filter(Boolean);
const groupsOf = s => new Set(String(s || '').split(',').map(x => x.trim()).filter(Boolean));

/* ---------- počasí ---------- */
// Poloha se zaokrouhlí na 0,1° (~10 km) – služba nezjistí přesné místo a sousedé sdílí stejná data
export const weatherKey = (lat, lon) => (Math.round(lat * 10) / 10).toFixed(1) + ',' + (Math.round(lon * 10) / 10).toFixed(1);
// Stav počasí pro hru z odpovědi MET Norway: rain | snow | cold | hot | clear | cloudy
export function weatherFromMet(json, now = Date.now()) {
  const ts = (json && json.properties && json.properties.timeseries) || [];
  const cur = ts.find(t => Date.parse(t.time) + 3600000 > now) || ts[0];
  if (!cur) return null;
  const d = cur.data || {}, temp = num(d.instant && d.instant.details && d.instant.details.air_temperature, NaN);
  const sym = String((d.next_1_hours || d.next_6_hours || {}).summary?.symbol_code || '');
  let cond = /snow|sleet/.test(sym) ? 'snow' : /rain|shower|drizzle/.test(sym) ? 'rain' : Number.isFinite(temp) && temp <= 0 ? 'cold' : Number.isFinite(temp) && temp >= 26 ? 'hot' : /clearsky|fair/.test(sym) ? 'clear' : 'cloudy';
  return { cond, temp: Number.isFinite(temp) ? Math.round(temp) : null, sym };
}
export const WEATHER_ICON = { rain: '🌧️', snow: '❄️', cold: '🥶', hot: '☀️', clear: '🌤️', cloudy: '☁️' };
export const WEATHER_NAME = { rain: 'déšť', snow: 'sníh', cold: 'mráz', hot: 'horko', clear: 'jasno', cloudy: 'oblačno' };

// Stáhne počasí, jen když vypršela platnost (hlavička Expires, nejméně 30 min) nebo se změnilo místo
export async function refreshWeather(cache, lat, lon, now = Date.now(), fetcher = fetch) {
  const key = weatherKey(lat, lon);
  if (cache && cache.key === key && now < cache.until) return cache;
  const [la, lo] = key.split(',');
  const r = await fetcher(`https://api.met.no/weatherapi/locationforecast/2.0/compact?lat=${la}&lon=${lo}`, { signal: AbortSignal.timeout ? AbortSignal.timeout(15000) : undefined });
  if (!r.ok) throw new Error('počasí ' + r.status);
  const w = weatherFromMet(await r.json(), now);
  if (!w) throw new Error('počasí: prázdná odpověď');
  const exp = Date.parse(r.headers.get('expires') || '') || 0;
  const lastRain = w.cond === 'rain' ? now : (cache && cache.lastRain) || 0;
  return { key, until: Math.max(now + 30 * 60000, exp), ...w, lastRain, time: now };
}
// Po dešti (do 3 h) se počítá jako déšť – vylezou žížaly, plži a žáby
export const weatherCond = (w, now = Date.now()) => !w ? '' : w.cond !== 'rain' && w.lastRain && now - w.lastRain < 3 * 3600000 ? 'rain' : w.cond;

/* ---------- sezónní události a kalendář ---------- */
const md = d => (d.getMonth() + 1) * 100 + d.getDate();
const mdOf = s => { const [m, d] = String(s || '').split('-').map(Number); return m * 100 + d; };
export function activeEvents(cfg, now = new Date()) {
  const t = md(now);
  return cfg.events.filter(e => { const a = mdOf(e.from), b = mdOf(e.to); return a && b && (a <= b ? t >= a && t <= b : t >= a || t <= b); });
}

/* ---------- násobitel šance druhu ---------- */
// ctx: { now: Date, weather: cond, twilight: bool, quiet: bool (klidové pásmo právě platí), bio }
export function speciesMult(cfg, sp, ctx) {
  const W = cfg.world;
  let m = 1;
  for (const e of activeEvents(cfg, ctx.now)) {
    const b = parseMap(e.boost);
    m *= num(b[sp.id], num(b[sp.group], 1));
  }
  if (ctx.weather) for (const l of lines(W.weatherBoost)) {
    const [k, rest] = l.split(/:(.*)/s);
    if (k.trim() === ctx.weather) { const b = parseMap(rest); m *= num(b[sp.id], num(b[sp.group], 1)); }
  }
  if (ctx.twilight) m *= num(parseMap(W.twilightBoost)[sp.id], 1);
  if (ctx.quiet && groupsOf(W.quietBiotopes).has(ctx.bio)) m = 0;
  return m;
}
export const inQuietMonths = (cfg, now = new Date()) => parseMonths(cfg.world.quietMonths).has(now.getMonth() + 1);

/* ---------- barevné varianty ---------- */
// Deterministicky z hashe buňky: albín u skupin, kde se vyskytuje; tmavá forma hlavně u druhů, kde je běžná (zmije, veverka)
export function variantFor(cfg, sp, h) {
  const W = cfg.world, mel = num(parseMap(W.melanSpecies)[sp.id], groupsOf(W.melanGroups).has(sp.group) ? num(W.variantChance) : 0);
  if (h < mel) return 'melan';
  const alb = groupsOf(W.albinGroups).has(sp.group) ? num(W.variantChance) : 0;
  if (h > 1 - alb) return 'albin';
  return '';
}

/* ---------- chráněná území ---------- */
const PROTECT = { 1: 'přísná rezervace', 2: 'národní park', 3: 'přírodní památka', 4: 'přírodní rezervace', 5: 'chráněná krajinná oblast', 6: 'chráněné území s udržitelným využíváním', 24: 'chráněné území (lesy)' };
export function protectedType(t) {
  if (!t) return '';
  return t.protection_title || (t.boundary === 'national_park' ? 'národní park' : PROTECT[t.protect_class] || (t.leisure === 'nature_reserve' ? 'přírodní rezervace' : 'chráněné území'));
}
// „cs:Název článku“ → odkaz a titul článku na Wikipedii
export function wikiOf(t) {
  const m = /^([a-z-]{2,10}):(.+)$/.exec(String((t && t.wikipedia) || ''));
  return m ? { lang: m[1], title: m[2], url: `https://${m[1]}.wikipedia.org/wiki/${encodeURIComponent(m[2].replace(/ /g, '_'))}` } : null;
}
const safeHttp = u => /^https?:\/\/[^\s"'<>]+$/.test(String(u || '')) ? u : '';
export function protectedHTML(t, summary) {
  const w = wikiOf(t), web = safeHttp(t.website);
  return `<h2>${icOr('protected', '🛡️')} ${esc(t.name || 'Chráněné území')}</h2><div class="sub">${esc(protectedType(t))}</div>
  ${summary ? `<div class="fact">${esc(summary)}</div><p class="msg small">Text: Wikipedie, licence CC BY-SA 4.0</p>` : w ? '<p class="msg small" id="wikiWait">Načítám popis z Wikipedie…</p>' : ''}
  <h3>Jak se tu chovat</h3><ul class="facts"><li>Choď jen po cestách – zvířata ve hře se tu objevují jen u nich.</li><li>Neruš zvířata, nesbírej rostliny, nekrm zvěř.</li><li>Pes na vodítku, žádné ohně a odpadky.</li><li>Na jaře a v létě hnízdí ptáci – v rákosí a na skalách je klid.</li></ul>
  <h3>Víc informací</h3><div class="rowbtns">${w ? `<a class="btn sm" href="${esc(w.url)}" target="_blank" rel="noopener">Wikipedie</a>` : ''}${web ? `<a class="btn sm" href="${esc(web)}" target="_blank" rel="noopener">Web správy</a>` : ''}<a class="btn sm" href="https://drusop.nature.cz/" target="_blank" rel="noopener">Ústřední seznam ochrany přírody</a></div>
  <button class="btn full ghost" data-act="close">Zavřít</button>`;
}
// Krátký popis z Wikipedie (REST API, jen po otevření karty)
export async function wikiSummary(t, fetcher = fetch) {
  const w = wikiOf(t); if (!w) return '';
  const r = await fetcher(`https://${w.lang}.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(w.title.replace(/ /g, '_'))}`, { signal: AbortSignal.timeout ? AbortSignal.timeout(10000) : undefined });
  if (!r.ok) return '';
  const j = await r.json();
  return String(j.extract || '').slice(0, 700);
}

/* ---------- kalendář přírody ---------- */
export function calendarHTML(cfg, now = new Date()) {
  const m = now.getMonth() + 1, prev = m === 1 ? 12 : m - 1;
  const act = cfg.species.filter(s => s.active);
  const nowSp = act.filter(s => parseMonths(s.months).size < 12 && parseMonths(s.months).has(m));
  const fresh = nowSp.filter(s => !parseMonths(s.months).has(prev));
  const text = (cfg.calendar.find(c => String(c.id) === String(m)) || {}).text || '';
  const ev = activeEvents(cfg, now);
  return `<h2>Kalendář přírody</h2><div class="sub">${esc(MONTH_NAMES[m - 1])}</div>
  ${text ? `<div class="fact">${esc(text)}</div>` : ''}
  ${ev.length ? `<h3>Právě probíhá</h3>${ev.map(e => `<div class="quest"><span><b>${esc(e.name)}</b><br><small>${esc(e.text)}</small></span></div>`).join('')}` : ''}
  ${fresh.length ? `<h3>Nově se objevují</h3><div class="chips">${fresh.map(s => `<span class="chip">${esc(s.name)}</span>`).join('')}</div>` : ''}
  ${nowSp.length ? `<h3>Jen v tuto dobu</h3><div class="chips">${nowSp.map(s => `<span class="chip">${esc(s.name)}</span>`).join('')}</div>` : ''}
  <button class="btn full ghost" data-act="menu">Zpět</button>`;
}

/* ---------- turistický deník ---------- */
export function cleanStamps(s) {
  return Object.fromEntries(Object.entries(s && typeof s === 'object' ? s : {}).slice(0, 2000)
    .map(([k, v]) => [String(k).slice(0, 30), { n: String(v && v.n || '').slice(0, 80), k: String(v && v.k || '').slice(0, 40), i: String(v && v.i || '').slice(0, 8), d: num(v && v.d) }]));
}
export function stampsHTML(st) {
  const list = Object.values(st.stamps).sort((a, b) => b.d - a.d);
  return `<h3>Turistický deník</h3>${list.length ? `<div class="badges">${list.map(s => `<div class="badge on" title="${esc(s.n)}"><span aria-hidden="true">${esc(s.i)}</span><small>${esc(s.n)}<br>${new Date(s.d).toLocaleDateString('cs-CZ')}</small></div>`).join('')}</div>` : '<p class="msg small">Dojdi k rozhledně, vrcholu, hradu nebo prameni a získáš razítko.</p>'}`;
}
