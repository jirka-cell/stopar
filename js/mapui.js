// Ovládání mapy: rychlost chůze (ztlumení), měření vzdálenosti dvěma prsty, „Co je zde?“ podržením prstu
import { esc } from './config.js';

// Plynulý odhad rychlosti (m/s) z poloh; GPS rychlost má přednost, když ji telefon hlásí
export function nextSpeed(prev, fix, distM) {
  if (Number.isFinite(fix.gpsSpeed) && fix.gpsSpeed >= 0) return fix.gpsSpeed;
  if (!prev || !(fix.t > prev.t)) return prev ? prev.speed : 0;
  const dt = (fix.t - prev.t) / 1000;
  if (dt < 0.5) return prev.speed;
  const inst = distM / dt;
  return prev.speed * 0.5 + inst * 0.5;
}
// Ztlumit při chůzi: zapne se nad muteSpeed, vypne až pod polovinou (ať to nebliká)
export const muteState = (muted, speed, muteSpeed) => muted ? speed > muteSpeed / 2 : speed > muteSpeed;

const fmtDist = m => m < 1000 ? Math.round(m) + ' m' : (m / 1000).toFixed(m < 10000 ? 2 : 1).replace('.', ',') + ' km';
export { fmtDist };

// Gesta nad mapou: dva prsty v klidu = měření, jeden prst podržený = „Co je zde?“
export function attachGestures(map, container, { distance, onWhatsHere }) {
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('class', 'measure'); svg.innerHTML = '<line stroke="#24301f" stroke-width="3" stroke-dasharray="6 5"/><circle r="7" fill="#fff" stroke="#24301f" stroke-width="3"/><circle r="7" fill="#fff" stroke="#24301f" stroke-width="3"/>';
  const label = document.createElement('div'); label.className = 'measure-lbl';
  container.append(svg, label); svg.style.display = label.style.display = 'none';
  let two = null, measuring = false, press = null;
  const pts = e => [...e.touches].map(t => { const r = container.getBoundingClientRect(); return [t.clientX - r.left, t.clientY - r.top]; });
  const show = p => {
    const [a, b] = p, ll = p.map(q => map.unproject(q)), d = distance(ll[0].lat, ll[0].lng, ll[1].lat, ll[1].lng);
    const [line, c1, c2] = svg.children;
    line.setAttribute('x1', a[0]); line.setAttribute('y1', a[1]); line.setAttribute('x2', b[0]); line.setAttribute('y2', b[1]);
    c1.setAttribute('cx', a[0]); c1.setAttribute('cy', a[1]); c2.setAttribute('cx', b[0]); c2.setAttribute('cy', b[1]);
    label.textContent = fmtDist(d); label.style.left = (a[0] + b[0]) / 2 + 'px'; label.style.top = (a[1] + b[1]) / 2 - 34 + 'px';
    svg.style.display = label.style.display = '';
  };
  const stopMeasure = () => { if (measuring) { measuring = false; map.touchZoomRotate.enable(); map.dragPan.enable(); } svg.style.display = label.style.display = 'none'; };
  container.addEventListener('touchstart', e => {
    clearTimeout(press && press.t); press = null;
    if (e.touches.length === 2) {
      const p = pts(e), z = map.getZoom();
      two = { p, t: setTimeout(() => { if (two && Math.abs(map.getZoom() - z) < 0.05) { measuring = true; map.touchZoomRotate.disable(); map.dragPan.disable(); show(two.p); } }, 450) };
    } else if (e.touches.length === 1) {
      const p = pts(e)[0];
      press = { p, t: setTimeout(() => { if (press) { const ll = map.unproject(press.p); press = null; onWhatsHere(ll.lat, ll.lng); } }, 650) };
    }
  }, { passive: true });
  container.addEventListener('touchmove', e => {
    if (press) { const p = pts(e)[0]; if (p && Math.hypot(p[0] - press.p[0], p[1] - press.p[1]) > 10) { clearTimeout(press.t); press = null; } }
    if (e.touches.length !== 2 || !two) return;
    const p = pts(e);
    if (measuring) { two.p = p; show(p); }
    else if (p.some((q, i) => Math.hypot(q[0] - two.p[i][0], q[1] - two.p[i][1]) > 12)) { clearTimeout(two.t); two = null; }
  }, { passive: true });
  container.addEventListener('touchend', e => { if (press) { clearTimeout(press.t); press = null; } if (e.touches.length < 2) { if (two) clearTimeout(two.t); two = null; stopMeasure(); } }, { passive: true });
  // počítač: pravé tlačítko = „Co je zde?“
  map.on('contextmenu', e => onWhatsHere(e.lngLat.lat, e.lngLat.lng));
}

// Karta „Co je zde?“
export function whatsHereHTML(info) {
  const row = (l, v) => v ? `<div class="kv"><span>${esc(l)}:</span> ${esc(v)}</div>` : '';
  return `<h2>Co je zde?</h2><div class="sub">${info.lat.toFixed(5)}, ${info.lon.toFixed(5)}</div>
  ${row('Vzdálenost od tebe', info.dist != null ? fmtDist(info.dist) : '')}${row('Biotop', info.bio)}${row('Nadmořská výška', info.alt)}${row('Chráněné území', info.protected)}
  ${info.targets.length ? `<h3>Cíle v okolí</h3>${info.targets.map(t => `<div class="kv">${esc(t.icon)} ${esc(t.name)} – ${fmtDist(t.d)}</div>`).join('')}` : ''}
  ${info.extra || ''}
  <button class="btn full ghost" data-act="close">Zavřít</button>`;
}

// Druh posunu mezi dvěma polohami GPS: chůze se počítá, jízda (auto, MHD, kolo) ne, skok GPS se ignoruje
export function stepKind(d, dt, gps) {
  const v = d / Math.max(1, dt);
  if (v > (Number(gps.maxSpeed) || 8)) return 'jump';
  if (v > (Number(gps.vehicleSpeed) || 3.3)) return 'ride';
  return 'walk';
}
