// Kontrolní seznam pro rodinné testery: zaškrtávání, poznámky a odeslání výsledku (sdílení / e-mail)
import { esc } from './config.js';

// [id, název, co udělat a co má nastat]
export const CHECKS = [
  ['install', 'Instalace a aktualizace', 'Přidej aplikaci na plochu (Android: Menu → Nainstalovat, iPhone: Sdílet → Přidat na plochu). Spustí se z ikony bez adresního řádku? Při nové verzi se ukáže „Aktualizovat“?'],
  ['consent', 'Úvodní souhlas', 'Při prvním spuštění se ukáže souhlas dřív než mapa. Zkus rok narození mladšího dítěte: objeví se potvrzení rodiče? Jsou texty srozumitelné?'],
  ['gps', 'GPS a poloha', 'Venku: ukazuje zelená tečka správné místo? Za jak dlouho se chytí GPS? Sedí přesnost vpravo nahoře?'],
  ['map', 'Mapa a styly', 'Mapa se načte a jde posouvat a přibližovat. Je čitelná na slunci? Přepne se večer do nočního stylu?'],
  ['look', 'Panel Vzhled a předvolby', 'Tlačítko Vzhled: vyzkoušej předvolby, zapnutí a vypnutí vrstev a uložení vlastní předvolby. Zůstane nastavení po restartu?'],
  ['terrain', 'Vrstevnice a trasy', 'Zapni vrstevnice, stínování a turistické trasy. Zobrazí se a sedí s okolím?'],
  ['compass', 'Severka a kompas', 'Tlačítko Kompas: otáčí se mapa podle telefonu? Ukazuje šipka u tečky správný směr?'],
  ['biotope', 'Biotopy na skutečných místech', 'Projdi les, louku, vodu, vesnici a město. Odpovídá biotop vlevo nahoře tomu, kde opravdu stojíš? Zapiš místa, kde nesedí.'],
  ['altitude', 'Výška a pásmo', 'Sedí nadmořská výška a výškové pásmo (nížina, pahorkatina…) v horním řádku přibližně se skutečností?'],
  ['animals', 'Zvířata a kód rozmístění', 'Objevují se zvířata kolem tebe? Porovnejte kód rozmístění v Menu: při stejném kódu vidíte všichni stejná zvířata na stejném místě?'],
  ['catch', 'Chytání a minihra', 'Dojdi ke zvířeti, vyber potravu a vyfoť ho. Je jasné, co dělat? Je to příliš lehké, nebo těžké?'],
  ['atlas', 'Atlas a odemykání údajů', 'Ukáže se úlovek v atlasu? Odemykají se další údaje po dalších úlovcích? Dávají texty smysl?'],
  ['photo', 'Skutečná fotka', 'V detailu druhu přidej skutečnou fotku. Uloží se a odemkne hlas a pobytová znamení?'],
  ['night', 'Den a noc', 'Večer: změní se mapa na noční a objeví se noční zvířata (sovy, netopýři)?'],
  ['offline', 'Offline režim', 'Zapni režim letadlo na už prošlém místě. Funguje mapa, biotopy a atlas? Co se stane na novém místě?'],
  ['backup', 'Záloha a obnova', 'Menu → Uložit zálohu, pak Obnovit ze zálohy. Vrátí se úlovky i fotky? Chce obnova rodičovský PIN?'],
  ['wipe', 'Rodičovský PIN a smazání dat', 'Menu → Rodičovský PIN: nastav a změň PIN. Smazat všechna moje data se špatným PINem nesmí nic smazat, se správným smaže vše a ukáže znovu úvodní souhlas.'],
  ['ui', 'Nový vzhled', 'Na mapě je běžně jen Aegon a tlačítko ✚. Ťukni na ✚: vysune se lišta (Mapa, Sbírka, akce, Atlas, Já) a nástroje. Velké tlačítko uprostřed: u zvířete Chytit, na trase Trasa, jinak Plánovat; podržením rychlé akce. Karty nad mapou (trasa, krmítko, bájný tvor) jdou schovat ✕. Najdeš vše v záložce Já?'],
  ['kidsui', 'Dětský vzhled', 'V Rodičovských nastaveních zapni režim pro malé děti: dole jen Moje zvířata · Hledat/Chytit · Hry, vpravo nahoře 🛡️ Rodič (chce rodičovský PIN). Zvládne to dítě samo?'],
  ['nightui', 'Noc a jas', 'Já → Noc a jas: zkus Vždy tmavě, ztlumení mapy a červené světlo. Je to večer příjemnější? Automaticky se má přepnout po západu slunce.'],
  ['aegon', 'Aegon', 'Posuň Aegona prstem jinam (zůstane tam i po restartu). Přetáhni ho prstem na boudu (objeví se dole uprostřed) – na 2 minuty zmizí a vrátí se. Ťuk na Aegona = rada. Když se něco načítá, točí se nad ním kolečko.'],
  ['ride', 'Jízda autem', 'Jeď kus autem nebo MHD: km a šišky se nesmí přičíst, ukáže se upozornění. Při chůzi se počítá normálně.'],
  ['mapmk', 'Značky a oddálení', 'Na mapě jsou místo zvířat obrázky tříd (pták, savec…), druh se ukáže až při setkání. Mapu jde oddálit na přehled ~200 km.'],
  ['farm', 'Moje farma (3D)', 'Lišta → Farma: otáčej prstem, zoom dvěma prsty. Nad budovami barevné štítky (zelená stačí, oranžová blízko limitu, červená nestačí, modrá staví se). Ťukni na budovu: vylepšení; na příbytek: ubytovaná zvířata a přepínání. Souhrn ukazuje výrobu a kapacity. V panelu budovy ↔ Přesunout a ťuknout na políčko (obsazené = výměna). Druhý klik na Zvířata/Souhrn zavírá. Plynulé? Hřeje se telefon?'],
  ['races', 'Závody', 'Já → Závody: vyber hru, pak zvíře. Výsledek = šikovnost + vlastnost zvířete, kód pošli ostatním. Trénink za dobrý výkon zvedne zvířeti vlastnost (3× denně).'],
  ['atlastabs', 'Atlas zvířat', 'Atlas má nahoře karty Druhy · Klíč · Deník · Kalendář · Zraněné zvíře. Najdeš vše, co bylo dřív v Já → Poznávej?'],
  ['tasks', 'Úkoly u krmítek', 'U krmítka v parku nebo u hradu, pramene či vyhlídky přijde otázka. Za správnou odpověď surovina na farmu.'],
  ['moregames', 'Filtry atlasu', 'V atlasu filtry podle biotopu a ročního období. Atlas → Zraněné zvíře – dávají rady smysl?'],
  ['planner', 'Plánovač procházky', 'Menu → Naplánovat procházku: najdi místo (mapa se má přesunout a ukázat 🚩), navrhni trasy. Posuň bod prstem, podržením prstu na čáře přidej nový bod, zkus Body (pořadí, smazání, názvy), Okruh/Do cíle, tempo a profil (ťukni do něj). Sedí čas a převýšení?'],
  ['follow', 'Mapa se vrací na mě', 'Posuň mapu a 20 s se jí nedotýkej – vrátí se na tebe. Při plánování trasy a s otevřeným oknem se vracet nesmí.'],
  ['gifts', 'Odměny na trase a poklady', 'Vyraz po trase s odměnami: 🎁 i 💎 poklady musí při posouvání a oddalování mapy zůstat na svém místě. Sebere se odměna, když k ní dojdeš?'],
  ['speed', 'Načítání biotopů', 'Na novém místě: za jak dlouho se ukáže biotop pod tebou a za jak dlouho celé okolí? Při chůzi se má dřív načítat směr, kterým jdeš.'],
  ['offmaps', 'Offline mapy', 'Menu → Offline mapy: stáhni 2 km přes Wi-Fi, pak zapni režim letadlo. Je vidět mapa, biotopy a trasy?'],
  ['games', 'Minihry', 'Já → Závody: zahraj Útěk, Najdi mě, Stavbu hnízda, Rozhled, Stopaře, Stádo a Vír. Jsou srozumitelné, ne moc těžké ani lehké?'],
  ['battery', 'Baterie a rychlost', 'Kolik procent baterie spotřebuje hodina hraní? Seká se mapa nebo se telefon hřeje?'],
  ['kids', 'Srozumitelnost pro děti', 'Zvládne dítě hrát samo? Kde se zaseklo nebo čemu nerozumělo?']
];
export const DEVICES = ['Android', 'iPhone', 'Tablet'];
const MARKS = [['ok', 'Funguje'], ['bad', 'Problém'], ['unk', 'Nevím'], ['skip', 'Nezkoušeno']];

export const emptyChecklist = () => ({ name: '', device: '', items: {}, note: '' });

export function checklistHTML(d, fromFab = false) {
  const done = CHECKS.filter(([id]) => d.items[id] && d.items[id].m).length;
  return `<h2>Kontrolní seznam</h2><p class="sub">Vyplněno ${done} z ${CHECKS.length} · ukládá se průběžně</p>
  <div class="fld"><label for="clName">Jméno testera</label><input type="text" id="clName" data-cl="name" value="${esc(d.name)}"></div>
  <div class="look"><div class="chips">${DEVICES.map(x => `<button class="chip${d.device === x ? ' on' : ''}" data-act="clDev" data-v="${x}">${x}</button>`).join('')}</div></div>
  ${CHECKS.map(([id, title, how], i) => {
    const it = d.items[id] || {};
    return `<details class="edu"${it.m ? '' : ' open'}><summary>${i + 1}. ${esc(title)}${it.m ? ` <span class="lock">${esc((MARKS.find(m => m[0] === it.m) || [, ''])[1])}</span>` : ''}</summary>
    <p class="kv">${esc(how)}</p>
    <div class="look"><div class="chips">${MARKS.map(([m, l]) => `<button class="chip${it.m === m ? ' on' : ''}" data-act="clMark" data-id="${id}" data-v="${m}">${l}</button>`).join('')}</div></div>
    <div class="fld"><textarea data-cl="item" data-id="${id}" placeholder="Poznámka (co nesedí, kde, kdy)">${esc(it.n)}</textarea></div></details>`;
  }).join('')}
  <div class="fld"><label for="clNote">Celkový dojem a nápady</label><textarea id="clNote" data-cl="note">${esc(d.note)}</textarea></div>
  <button class="btn primary full" data-act="clSend">Odeslat výsledek</button>
  <button class="btn full ghost" data-act="${fromFab ? 'close' : 'menu'}">${fromFab ? 'Zavřít' : 'Zpět'}</button>`;
}

// Výsledek jako prostý text pro sdílení nebo e-mail
export function checklistText(d, info) {
  const lab = Object.fromEntries(MARKS);
  const lines = [`Stopař – výsledek testu`, `Tester: ${d.name || '?'} · zařízení: ${d.device || '?'}`, info, ''];
  CHECKS.forEach(([id, title], i) => {
    const it = d.items[id] || {};
    lines.push(`${i + 1}. ${title}: ${lab[it.m] || '–'}${it.n ? '\n   ' + it.n.trim().replace(/\n/g, '\n   ') : ''}`);
  });
  if (d.note.trim()) lines.push('', 'Celkově: ' + d.note.trim());
  return lines.join('\n');
}
