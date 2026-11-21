// Poklady (vlastní „kešky“ Stopaře) a krmítka (bonusová místa u turistických cílů a v parcích)
import { esc } from './config.js';
import { toCode, fromCode } from './family.js';
import { mPerDegLat, mPerDegLon, hash01 } from './geo.js';

const num = (v, d = 0) => Number.isFinite(Number(v)) ? Number(v) : d;
export const distM = (a, b) => Math.hypot((a.lat - b.lat) * mPerDegLat, (a.lon - b.lon) * mPerDegLon(a.lat));

/* ---------- poklady ---------- */
export function cleanTreasure(t) {
  if (!t || typeof t !== 'object' || !String(t.n || '').trim() || !Number.isFinite(Number(t.la)) || !Number.isFinite(Number(t.lo))) return null;
  return { id: String(t.id || '').slice(0, 20) || String(num(t.c)), n: String(t.n).slice(0, 60), h: String(t.h || '').slice(0, 300),
    la: Math.round(num(t.la) * 1e5) / 1e5, lo: Math.round(num(t.lo) * 1e5) / 1e5, c: num(t.c), own: !!t.own, found: num(t.found) || 0 };
}
export const treasureLink = (base, t) => base + '#poklad=' + toCode({ v: 1, id: t.id, n: t.n, h: t.h, la: t.la, lo: t.lo, c: t.c });
export function decodeTreasure(code) { const t = cleanTreasure(fromCode(code)); return t && { ...t, own: false, found: 0 }; }
// Na mapě jen přibližný kruh: střed posunutý (stejně pro všechny) do 2/3 poloměru – poklad se musí hledat
export function searchCircle(t, r) {
  const a = hash01(Math.round(t.la * 1e5), Math.round(t.lo * 1e5), 3) * Math.PI * 2, d = hash01(Math.round(t.la * 1e5), Math.round(t.lo * 1e5), 4) * r * 2 / 3;
  return { lat: t.la + Math.cos(a) * d / mPerDegLat, lon: t.lo + Math.sin(a) * d / mPerDegLon(t.la), r };
}
export function treasuresHTML(st) {
  const list = st.treasures.slice().sort((a, b) => b.c - a.c);
  return `<h2>Poklady</h2><p class="msg small">Schovej poklad s nápovědou a pošli ho rodině. Na mapě uvidí jen kruh, kde hledat – najde ho, kdo dojde až k němu.</p>
  <button class="btn primary full" data-act="trNew">Schovat poklad tady</button>
  ${list.map(t => `<div class="quest${t.found ? ' done' : ''}"><span><b>${t.own ? '🗝️' : '💎'} ${esc(t.n)}</b>${t.h ? `<br><small>${esc(t.h)}</small>` : ''}<br><small>${t.own ? 'tvůj poklad' : t.found ? 'nalezen ' + new Date(t.found).toLocaleDateString('cs-CZ') : 'hledá se'}</small></span><span>${t.own ? `<button class="btn sm" data-act="trShare" data-id="${esc(t.id)}">QR</button>` : ''}<button class="btn sm ghost" data-act="trDel" data-id="${esc(t.id)}" data-confirm="Smazat?" aria-label="Smazat poklad">✕</button></span></div>`).join('') || '<p class="msg">Zatím žádné poklady.</p>'}
  <button class="btn full ghost" data-act="menu">Zpět</button>`;
}
export const treasureFormHTML = () => `<h2>Schovat poklad</h2><p class="msg small">Poklad se schová přesně tam, kde teď stojíš.</p>
  <div class="fld"><label for="trN">Název</label><input type="text" id="trN" maxlength="60" placeholder="např. Poklad u staré lípy"></div>
  <div class="fld"><label for="trH">Nápověda / hádanka</label><textarea id="trH" maxlength="300" placeholder="např. Hledej tam, kde dub objímá kámen."></textarea></div>
  <p class="msg small" id="trErr"></p><button class="btn primary full" data-act="trSave">Schovat a sdílet</button><button class="btn full ghost" data-act="treasures">Zpět</button>`;

/* ---------- krmítka ---------- */
// Krmítka: u každého turistického cíle a uprostřed větších parků (místa jsou z mapy → stejná pro všechny)
export function feedersNear(targets, parks, minPark) {
  return [...targets.map(t => ({ id: 'f' + t.id, lat: t.lat, lon: t.lon, at: t.name })), ...parks.filter(p => p.size >= minPark).map(p => ({ id: 'f' + p.id, lat: p.lat, lon: p.lon, at: 'park' }))];
}
// Odměna z krmítka jednou denně: šišky, XP a někdy krmivo (deterministicky podle dne a místa)
export function feederReward(cfg, id, day) {
  const W = cfg.world, h = hash01([...id + day].reduce((a, c) => (a * 31 + c.charCodeAt(0)) | 0, 7), 5);
  return { cones: num(W.feederCones, 15), xp: num(W.feederXp, 10), item: h < num(W.feederItemChance, 0.5) ? W.feederItem || 'krmivo' : '' };
}
// Prochození parku: počítají se různá místa (mřížka ~30 m), kudy hráč v parku prošel
export const parkCell = (lat, lon) => Math.round(lat * mPerDegLat / 30) + ':' + Math.round(lon * mPerDegLon(50) / 30);
export function cleanPlaces(p) { return p && typeof p === 'object' ? { day: String(p.day || ''), feeders: Array.isArray(p.feeders) ? p.feeders.slice(-500).map(String) : [], parks: p.parks && typeof p.parks === 'object' ? Object.fromEntries(Object.entries(p.parks).slice(-50).map(([k, v]) => [String(k), Array.isArray(v) ? v.slice(-200).map(String) : []])) : {}, parksDone: Array.isArray(p.parksDone) ? p.parksDone.slice(-200).map(String) : [] } : { day: '', feeders: [], parks: {}, parksDone: [] }; }
