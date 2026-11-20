// Admin: generický editor všech parametrů. Ukládá se průběžně.
import { SCHEMA, LISTS, LOOK_FIELDS, EDU_FIELDS, DEFAULTS, mergeDefaults, clone } from './config.js';
import { birdURL } from './birds.js';

const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

let root, draft, api, saveT = 0, infoT = 0;
const openKeys = new Set();

export function openAdmin(el, cfg, a) {
  root = el; api = a; draft = clone(cfg);
  render();
  root.oninput = onInput;
  root.onchange = onChange;
  root.onclick = onClick;
  clearInterval(infoT);
  infoT = setInterval(renderInfo, 2000);
}

function get(path) { return path.split('.').reduce((o, k) => (o == null ? o : o[k]), draft); }
function set(path, v) {
  const ks = path.split('.'); let o = draft;
  for (let i = 0; i < ks.length - 1; i++) { if (o[ks[i]] == null) o[ks[i]] = {}; o = o[ks[i]]; }
  o[ks[ks.length - 1]] = v;
}
function save() { clearTimeout(saveT); saveT = setTimeout(() => api.save(clone(draft)), 350); }

function field(path, label, type, opt = {}) {
  const v = get(path);
  const id = 'f_' + path.replace(/\./g, '_');
  if (type === 'bool') return `<label class="fld row" for="${id}">${esc(label)}<input type="checkbox" id="${id}" data-path="${path}" data-type="bool"${v ? ' checked' : ''}></label>`;
  if (type === 'textarea') return `<div class="fld"><label for="${id}">${esc(label)}</label><textarea id="${id}" data-path="${path}" data-type="text">${esc(v)}</textarea></div>`;
  if (type === 'select') return `<div class="fld"><label for="${id}">${esc(label)}</label><select id="${id}" data-path="${path}" data-type="text">${opt.options.map(([k, l]) => `<option value="${esc(k)}"${String(v ?? '') === k ? ' selected' : ''}>${esc(l)}</option>`).join('')}</select></div>`;
  if (type === 'color') return `<div class="fld row"><label for="${id}">${esc(label)}</label><span><input type="color" id="${id}" data-path="${path}" data-type="color" value="${/^#[0-9a-f]{6}$/i.test(v || '') ? v : '#ffffff'}"${v ? '' : ' style="opacity:.35"'}> <button class="btn sm" data-act="clr" data-path="${path}" title="Žádná">×</button></span></div>`;
  if (type === 'image') return `<div class="fld"><span>${esc(label)} (PNG s průhledným pozadím, přebije kreslený vzhled)</span><span class="rowbtns"><label class="btn sm">Nahrát<input type="file" accept="image/*" data-img="${path}" hidden></label>${v ? `<button class="btn sm danger" data-act="imgdel" data-path="${path}">Odebrat</button>` : ''}</span></div>`;
  if (type === 'number') return `<div class="fld"><label for="${id}">${esc(label)}</label><input type="number" id="${id}" data-path="${path}" data-type="number" value="${esc(v)}"${opt.min !== undefined ? ` min="${opt.min}"` : ''}${opt.max !== undefined ? ` max="${opt.max}"` : ''} step="${opt.step ?? 'any'}"></div>`;
  return `<div class="fld"><label for="${id}">${esc(label)}</label><input type="text" id="${id}" data-path="${path}" data-type="text" value="${esc(v)}"></div>`;
}

function det(key, title, body) {
  return `<details data-key="${esc(key)}"${openKeys.has(key) ? ' open' : ''}><summary>${title}</summary>${body}</details>`;
}

function render() {
  root.querySelectorAll('details[open]').forEach(d => openKeys.add(d.dataset.key));
  root.querySelectorAll('details:not([open])').forEach(d => openKeys.delete(d.dataset.key));
  let h = `<div class="adm"><div class="ahead"><h2>Admin</h2><button class="btn sm" data-act="close">Zavřít</button></div>
  <p class="small" id="admInfo"></p>
  <div class="tools">
    <button class="btn sm" data-act="respawn">Obnovit zvířata</button>
    <button class="btn sm" data-act="clearOsm">Smazat cache biotopů</button>
    <button class="btn sm" data-act="cfgExport">Export nastavení</button>
    <label class="btn sm" style="text-align:center">Import nastavení<input type="file" accept=".json,application/json" data-cfgimport hidden></label>
    <button class="btn sm" data-act="exportAll">Záloha vč. nastavení</button>
    <button class="btn sm danger" data-act="defaults" data-confirm="Opravdu? Ťukni znovu">Výchozí nastavení</button>
    <button class="btn sm danger" data-act="resetProgress" data-confirm="Smazat úlovky? Ťukni znovu">Smazat postup</button>
  </div>`;
  for (const s of SCHEMA) h += det('s_' + s.sec, esc(s.title), s.fields.map(f => field(s.sec + '.' + f[0], f[1], f[2], f[3])).join(''));
  for (const L of LISTS) {
    const arr = draft[L.sec] || [];
    const items = arr.map((o, i) => {
      const p = L.sec + '.' + i;
      let body = '';
      if (L.look) body += `<div class="prev" id="prev_${i}"><img src="${birdURL(o)}" alt=""></div>`;
      body += L.fields.map(f => field(p + '.' + f[0], f[1], f[2], f[3])).join('');
      if (L.look) body += det('look_' + L.sec + '_' + i, 'Kreslený vzhled', `<div class="lookgrid">${LOOK_FIELDS.map(f => field(p + '.look.' + f[0], f[1], f[2], f[3])).join('')}</div>`);
      if (L.edu) body += det('edu_' + L.sec + '_' + i, 'Vzdělávací údaje', EDU_FIELDS.map(f => field(p + '.edu.' + f[0], f[1], f[2])).join(''));
      body += `<div class="rowbtns"><button class="btn sm" data-act="up" data-list="${L.sec}" data-i="${i}">Nahoru</button><button class="btn sm" data-act="dup" data-list="${L.sec}" data-i="${i}">Duplikovat</button><button class="btn sm danger" data-act="del" data-list="${L.sec}" data-i="${i}" data-confirm="Opravdu smazat?">Smazat</button></div>`;
      return det('i_' + L.sec + '_' + i, `<span data-lbl="${L.sec}.${i}">${esc(L.label(o))}</span>${o.active === false ? ' <span class="small">(neaktivní)</span>' : ''}`, body);
    }).join('');
    h += det('l_' + L.sec, esc(L.title) + ` <span class="small">(${arr.length})</span>`, items + `<button class="btn sm full" data-act="add" data-list="${L.sec}">Přidat</button>`);
  }
  h += '<p class="small">Změny se ukládají hned. Mapy (biotopy, potrava) se píšou jako „id:váha, id:váha“.</p></div>';
  root.innerHTML = h;
  renderInfo();
}

function renderInfo() {
  const el = root && root.querySelector('#admInfo');
  if (!el || !api.info) return;
  const i = api.info();
  el.textContent = `Poloha: ${i.pos.lat != null ? i.pos.lat.toFixed(5) + ', ' + i.pos.lon.toFixed(5) : '–'} (${i.pos.src}) · zvířat: ${i.birds} · OSM prvků: ${i.features} · slot: ${i.slot} · ${i.night ? 'noc' : 'den'}${i.osmError ? ' · chyba OSM: ' + i.osmError : ''}`;
}

function readVal(t) {
  const ty = t.dataset.type;
  if (ty === 'bool') return t.checked;
  if (ty === 'number') { const n = Number(t.value); return t.value === '' || isNaN(n) ? undefined : n; }
  return t.value;
}
function onInput(e) {
  const t = e.target; if (!t.dataset.path || t.type === 'checkbox' || t.tagName === 'SELECT') return;
  const v = readVal(t); if (v === undefined) return;
  set(t.dataset.path, v);
  if (t.type === 'color') t.style.opacity = '';
  afterChange(t.dataset.path);
}
function onChange(e) {
  const t = e.target;
  if (t.dataset.path && (t.type === 'checkbox' || t.tagName === 'SELECT')) { set(t.dataset.path, readVal(t)); afterChange(t.dataset.path); return; }
  if (t.dataset.img && t.files && t.files[0]) { loadImage(t.dataset.img, t.files[0]); return; }
  if (t.hasAttribute('data-cfgimport') && t.files && t.files[0]) { importCfg(t.files[0]); }
}
function afterChange(path) {
  const m = /^(\w+)\.(\d+)\./.exec(path);
  if (m) {
    const L = LISTS.find(l => l.sec === m[1]);
    const lbl = root.querySelector(`[data-lbl="${m[1]}.${m[2]}"]`);
    if (L && lbl) lbl.textContent = L.label(draft[m[1]][m[2]]);
    if (L && L.look) { const pv = root.querySelector('#prev_' + m[2] + ' img'); if (pv) pv.src = birdURL(draft[m[1]][m[2]]); }
  }
  save();
}

function onClick(e) {
  const b = e.target.closest('[data-act]'); if (!b) return;
  if (b.dataset.confirm && !b.dataset.armed) { b.dataset.armed = '1'; b.dataset.orig = b.textContent; b.textContent = b.dataset.confirm; setTimeout(() => { if (b.isConnected) { delete b.dataset.armed; b.textContent = b.dataset.orig; } }, 3000); return; }
  const act = b.dataset.act, list = b.dataset.list, i = Number(b.dataset.i);
  if (act === 'close') { clearInterval(infoT); api.close(); }
  else if (act === 'respawn') api.respawn();
  else if (act === 'clearOsm') api.clearOsm();
  else if (act === 'exportAll') api.exportAll();
  else if (act === 'resetProgress') api.resetProgress();
  else if (act === 'cfgExport') download(JSON.stringify(draft, null, 2), 'stopar-nastaveni-' + new Date().toISOString().slice(0, 10) + '.json');
  else if (act === 'defaults') { draft = clone(DEFAULTS); api.save(clone(draft)); render(); }
  else if (act === 'clr') { set(b.dataset.path, ''); afterChange(b.dataset.path); const c = b.parentElement.querySelector('input[type=color]'); if (c) c.style.opacity = '.35'; }
  else if (act === 'imgdel') { set(b.dataset.path, ''); save(); render(); }
  else if (act === 'add') { draft[list].push(blank(list)); openKeys.add('l_' + list); openKeys.add('i_' + list + '_' + (draft[list].length - 1)); save(); render(); }
  else if (act === 'dup') { const c = clone(draft[list][i]); if (c.id !== undefined) c.id = c.id + '_kopie'; draft[list].splice(i + 1, 0, c); save(); render(); }
  else if (act === 'del') { draft[list].splice(i, 1); save(); render(); }
  else if (act === 'up' && i > 0) { const a = draft[list]; [a[i - 1], a[i]] = [a[i], a[i - 1]]; save(); render(); }
}

function blank(list) {
  if (list === 'species') { const s = clone(DEFAULTS.species[1]); return Object.assign(s, { id: 'novy' + Date.now().toString(36), name: 'Nový druh', lat: '', fact: '', image: '', imageAuthor: '', imageLicense: '', active: false, review: true, alt: '', months: '', regions: '', edu: Object.fromEntries(EDU_FIELDS.map(f => [f[0], ''])) }); }
  const L = LISTS.find(l => l.sec === list);
  const o = {};
  L.fields.forEach(([k, , t]) => { o[k] = t === 'number' ? 0 : t === 'bool' ? false : t === 'color' ? '#888888' : ''; });
  return o;
}

function loadImage(path, file) {
  const fr = new FileReader();
  fr.onload = () => {
    const im = new Image();
    im.onload = () => {
      const max = 512, k = Math.min(1, max / Math.max(im.width, im.height)), c = document.createElement('canvas');
      c.width = Math.round(im.width * k); c.height = Math.round(im.height * k);
      c.getContext('2d').drawImage(im, 0, 0, c.width, c.height);
      set(path, c.toDataURL('image/png'));
      save(); render();
    };
    im.src = fr.result;
  };
  fr.readAsDataURL(file);
}

function importCfg(file) {
  const fr = new FileReader();
  fr.onload = () => {
    try {
      let d = JSON.parse(fr.result);
      if (d.app === 'stopar' && d.config) d = d.config;
      if (!d.species || !d.biotopes) throw new Error('bad');
      draft = mergeDefaults(d); api.save(clone(draft)); render();
    } catch (e) { alertInline('Soubor není nastavení Stopaře.'); }
  };
  fr.readAsText(file);
}
function alertInline(m) { const el = root.querySelector('#admInfo'); if (el) el.textContent = m; }

function download(text, name) {
  const url = URL.createObjectURL(new Blob([text], { type: 'application/json' }));
  const a = document.createElement('a'); a.href = url; a.download = name; document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 5000);
}
