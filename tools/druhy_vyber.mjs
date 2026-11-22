// Tabulka k výběru ~250 druhů podle skutečných pozorování v ČR (iNaturalist, ověřená pozorování):
// node tools/druhy_vyber.mjs → outputs/druhy-vyber.html (data outputs/druhy/p1–p4.json z api.inaturalist.org species_counts, place 8264)
import { readFileSync, writeFileSync } from 'node:fs';
import { DEFAULTS } from '../js/config.js';

const all = [1, 2, 3, 4].flatMap(p => JSON.parse(readFileSync(new URL(`../outputs/druhy/p${p}.json`, import.meta.url))).results);
// celkem ověřených pozorování ve skupině (api …/observations?per_page=0, 23. 11. 2026)
const G = {
  Aves: ['Ptáci', 135540, 100], Mammalia: ['Savci', 15955, 28], Amphibia: ['Obojživelníci', 14519, 12], Reptilia: ['Plazi', 14244, 10],
  Actinopterygii: ['Ryby', 3227, 20], Insecta: ['Hmyz', 352946, 40], Arachnida: ['Pavoukovci', 20446, 10], Mollusca: ['Měkkýši', 14041, 12], Animalia: ['Ostatní', 0, 4]
};
const SHOW = { Insecta: 300, Arachnida: 60 }; // kolik řádků ukázat (zbytek nemá smysl procházet)
const ALIAS = { 'accipiter gentilis': 'astur gentilis' }; // iNaturalist používá nový název
const app = new Map(DEFAULTS.species.map(s => { const l = String(s.lat).toLowerCase().trim(); return [ALIAS[l] || l, s]; }));
const rows = [], seen = new Set();
for (const [g, [, , pick]] of Object.entries(G)) {
  const rs = all.filter(r => r.taxon.iconic_taxon_name === g).slice(0, SHOW[g] || 250);
  rs.forEach((r, i) => {
    const l = r.taxon.name.toLowerCase(), s = app.get(l); seen.add(l);
    rows.push({ g, lat: r.taxon.name, cz: (r.taxon.preferred_common_name || '').toLowerCase(), n: r.count, app: s ? s.id : '', on: !!s || i < pick });
  });
}
for (const [l, s] of app) if (!seen.has(l)) rows.push({ g: { 'Ptáci': 'Aves', 'Savci': 'Mammalia', 'Ryby': 'Actinopterygii' }[s.group] || 'Animalia', lat: s.lat, cz: s.name.toLowerCase(), n: 0, app: s.id, on: true });

const html = `<!doctype html><html lang="cs"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Výběr druhů</title>
<style>
:root{--bg:#f6f3ec;--ink:#24301f;--mut:#6b7466;--acc:#2f7d4f;--card:#fff;--line:#e2ddd1}
@media (prefers-color-scheme:dark){:root:not([data-theme=light]){--bg:#1c2219;--ink:#e8ece4;--mut:#9aa394;--acc:#5fbf86;--card:#262d22;--line:#3a4234}}
body{margin:0;background:var(--bg);color:var(--ink);font:14px system-ui,sans-serif}
header{position:sticky;top:0;background:var(--bg);border-bottom:1px solid var(--line);padding:10px 16px;z-index:2}
h1{font-size:18px;margin:0 0 4px}.mut{color:var(--mut);font-size:12px}
.sum{display:flex;flex-wrap:wrap;gap:6px;margin:8px 0}.sum button{border:1px solid var(--line);background:var(--card);color:var(--ink);border-radius:10px;padding:4px 8px;font:inherit;font-size:12px;cursor:pointer}.sum button.on{border-color:var(--acc);box-shadow:inset 0 0 0 1px var(--acc)}
.tot{font-weight:700;font-size:15px}
main{padding:0 16px 80px;max-width:900px}
table{width:100%;border-collapse:collapse;background:var(--card);border-radius:12px;overflow:hidden}
td,th{padding:5px 8px;border-bottom:1px solid var(--line);text-align:left}th{font-size:12px;color:var(--mut);font-weight:600}
td.n{text-align:right;font-variant-numeric:tabular-nums}.lat{font-style:italic;color:var(--mut);font-size:12px}
tr.app td:first-child{box-shadow:inset 3px 0 var(--acc)}.tag{font-size:11px;color:var(--acc);font-weight:600}
textarea{width:100%;height:120px;margin-top:8px;font:12px monospace;background:var(--card);color:var(--ink);border:1px solid var(--line);border-radius:8px}
@media (max-width:600px){.lat{display:none}}
</style></head><body>
<header><h1>Výběr druhů pro Stopaře</h1>
<div class="mut">Podle ověřených pozorování v ČR (iNaturalist, ${all.length ? 'stav 23. 11. 2026' : ''}). Zelený proužek = už je v aplikaci. Předvybráno: co je v aplikaci + nejčastější druhy do ~95 % pozorování ve skupině (hmyz a pavouci jen nejčastější). Pokrytí = kolik % pozorování ve skupině vybrané druhy pokryjí.</div>
<div class="sum" id="sum"></div><div><span class="tot" id="tot"></span> <button id="exp">Zkopírovat výběr</button> <span class="mut" id="msg"></span></div></header>
<main><table><thead><tr><th></th><th>Druh</th><th>Pozorování</th><th>Skupina %</th></tr></thead><tbody id="tb"></tbody></table><textarea id="out" readonly hidden></textarea></main>
<script>
const G=${JSON.stringify(Object.fromEntries(Object.entries(G).map(([k, v]) => [k, [v[0], v[1]]])))}, R=${JSON.stringify(rows)};
let KEY='stopar-vyber-druhu', sel; try{sel=JSON.parse(localStorage.getItem(KEY)||'null')}catch(e){}
if(!sel) sel=Object.fromEntries(R.map(r=>[r.lat,r.on]));
let flt=Object.keys(G)[0];
const save=()=>{try{localStorage.setItem(KEY,JSON.stringify(sel))}catch(e){}};
function sum(){let tot=0;document.getElementById('sum').innerHTML=Object.entries(G).map(([g,[name,t]])=>{const rs=R.filter(r=>r.g===g),k=rs.filter(r=>sel[r.lat]),c=k.reduce((a,r)=>a+r.n,0);tot+=k.length;return '<button data-g="'+g+'" class="'+(g===flt?'on':'')+'">'+name+' <b>'+k.length+'</b>'+(t?' · '+Math.round(c/t*100)+' %':'')+'</button>'}).join('');document.getElementById('tot').textContent='Vybráno '+tot+' druhů';}
function list(){const rs=R.filter(r=>r.g===flt),t=G[flt][1];let c=0;document.getElementById('tb').innerHTML=rs.map(r=>{c+=r.n;return '<tr class="'+(r.app?'app':'')+'"><td><input type="checkbox" data-l="'+r.lat+'"'+(sel[r.lat]?' checked':'')+' aria-label="'+(r.cz||r.lat)+'"></td><td>'+(r.cz||'<i>'+r.lat+'</i>')+(r.app?' <span class="tag">v aplikaci</span>':'')+'<div class="lat">'+r.lat+'</div></td><td class="n">'+r.n+'</td><td class="n">'+(t?Math.round(c/t*100)+' %':'')+'</td></tr>'}).join('');}
document.addEventListener('click',e=>{const b=e.target.closest('[data-g]');if(b){flt=b.dataset.g;sum();list();}});
document.addEventListener('change',e=>{if(e.target.dataset.l){sel[e.target.dataset.l]=e.target.checked;save();sum();}});
document.getElementById('exp').onclick=()=>{const t=Object.entries(G).map(([g,[n]])=>n+': '+R.filter(r=>r.g===g&&sel[r.lat]).map(r=>(r.cz||r.lat)+' ('+r.lat+')').join(', ')).join('\\n'),o=document.getElementById('out');o.hidden=false;o.value=t;o.select();try{navigator.clipboard.writeText(t);document.getElementById('msg').textContent='Zkopírováno – vlož mi to do chatu.'}catch(e){document.getElementById('msg').textContent='Označ text dole a zkopíruj.'}};
sum();list();
</script></body></html>`;
writeFileSync(new URL('../outputs/druhy-vyber.html', import.meta.url), html);
const on = rows.filter(r => r.on);
console.log('řádků', rows.length, 'předvybráno', on.length, JSON.stringify(Object.fromEntries(Object.keys(G).map(g => [g, on.filter(r => r.g === g).length]))));
