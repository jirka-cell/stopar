// Kontrolní seznam pro rodinné testery: zaškrtávání, poznámky a odeslání výsledku (sdílení / e-mail)
import { esc } from './config.js';

// [id, název, co udělat a co má nastat]
export const CHECKS = [
  ['install', 'Instalace a aktualizace', 'Přidej aplikaci na plochu (Android: Menu → Nainstalovat, iPhone: Sdílet → Přidat na plochu). Spustí se z ikony bez adresního řádku? Při nové verzi se ukáže „Aktualizovat“?'],
  ['consent', 'Úvodní souhlas', 'Při prvním spuštění se ukáže uvítání a souhlas dřív než mapa. Zkus datum narození mladšího dítěte: objeví se QR pro rodiče? Naskenuj ho jiným telefonem – sedí potvrzovací kód? Jsou texty srozumitelné?'],
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
  ['modern', 'Moderní vzhled', 'Na mapě jen Aegon a ✚. Nahoře Stopuj s Aegonem, pod tím biotop (Město · 387 m · noc · počasí), vpravo přesnost GPS, dnes x,x km a růžice (ťuk = sever, druhý ťuk = kompas). Ikony v nabídce ✚ jsou průhledné, Na mě je šipka, (i) se ukáže jen s otevřenou nabídkou.'],
  ['pins', 'Zvířata na nakloněné mapě', 'Na nakloněné (3D) mapě stojí kolečka zvířat svisle a pod nimi je tečka přesného místa. Když mapu srovnáš shora, tečky zmizí a kolečka sedí přímo na místě.'],
  ['legends', 'Pověsti, chov, Noc na hradech', 'Atlas → Pověsti: kde a kdy se bájní tvorové ukazují. Pár dní před bájnými dny se v nabídce ✚ objeví karta Zvláštní stopy. Dvojice stejného druhu v příbytku úr. 2+ občas vyvede mládě. Koncem srpna Noc na hradech (Bílá paní, Duch rytíře).'],
  ['ui', 'Nový vzhled', 'Na mapě je běžně jen Aegon a tlačítko ✚. Ťukni na ✚: vysune se lišta (Mapa, Sbírka, akce, Atlas, Já) a nástroje. Velké tlačítko uprostřed: u zvířete Chytit, na trase Trasa, jinak Plánovat; podržením rychlé akce. Karty nad mapou (trasa, krmítko, bájný tvor) jdou schovat ✕. Najdeš vše v záložce Já?'],
  ['kidsui', 'Dětský vzhled', 'V Rodičovských nastaveních zapni režim pro malé děti: dole jen Moje zvířata · Hledat/Chytit · Hry, vpravo nahoře 🛡️ Rodič (chce rodičovský PIN). Zvládne to dítě samo?'],
  ['nightui', 'Noc a jas', 'Já → Noc a jas: zkus Vždy tmavě, ztlumení mapy a červené světlo. Je to večer příjemnější? Automaticky se má přepnout po západu slunce.'],
  ['aegon', 'Aegon', 'Posuň Aegona prstem jinam (zůstane tam i po restartu). Přetáhni ho prstem na boudu (objeví se dole uprostřed) – na 2 minuty zmizí a vrátí se. Ťuk na Aegona = rada. Když se něco načítá, točí se nad ním kolečko.'],
  ['ride', 'Jízda autem', 'Jeď kus autem nebo MHD: km a šišky se nesmí přičíst, ukáže se upozornění. Při chůzi se počítá normálně.'],
  ['mapmk', 'Značky a oddálení', 'Na mapě jsou místo zvířat obrázky tříd (pták, savec…), druh se ukáže až při setkání. Mapu jde oddálit na přehled ~200 km.'],
  ['farm', 'Moje farma (3D)', 'Lišta → Farma: otáčej prstem, zoom dvěma prsty. Nad budovami barevné štítky (zelená stačí, oranžová blízko limitu, červená nestačí, modrá staví se). Ťukni na budovu: vylepšení; na příbytek: ubytovaná zvířata a přepínání. Souhrn ukazuje výrobu a kapacity. V panelu budovy ↔ Přesunout a ťuknout na políčko (obsazené = výměna). Druhý klik na Zvířata/Souhrn zavírá. Plynulé? Hřeje se telefon?'],
  ['farmgen', 'Farma v krajině', 'Farma je nepravidelná plocha políček mezi horami, řekou a železnicí (jezdí vláček). Ťuk na volné políčko: postavit budovu tady nebo změnit na pole/les/rybníček (sousední budova +10 %). 🛤️ Cesty: ťukej na hrany políček, přidáš cestu se stromořadím. Souhrn → Jiná krajina (budovy zůstanou). Přesun: panel zmizí, zrušíš ťuknutím na budovu, pohled se nevrací.'],
  ['farmlife', 'Živá farma', 'Farma → Souhrn: vyber krajinu (pahorkatina, nížina, rybníky, hory, sever, středomoří). V krajině se vlní stromy a obilí, po řece pluje loďka, pasou se srny a zajíci, krouží ptáci, ve výbězích pobíhají tvá zvířata. Večer svítí okna a lucerny, v zimě sníh a zamrzlé tůně, na podzim barevné listí, při dešti/sněhu/mlze podle počasí kapky a mlha, po přeháňce duha. Zkus Úkoly farmy (odměna), Fotku farmy, Pozvat rodinu (odkaz/QR – otevře se jen pro prohlížení) a ve Stavět → Doprava Železnici a nádraží (předtím čárkovaný náhled trati; po postavení jezdí vlak, výroba surovin ×2, denně šišky). Nakresli cestu od cesty v krajině ke skladu – vyjedou nákladní auta. V krajině jsou vesnice s kostelem na konci cest. Na železničním přejezdu se před vlakem spustí závory a auto počká.'],
  ['nick', 'Přezdívka a kolo', 'Lišta: Mapa · Farma · kolo · Atlas · tvoje přezdívka. Kolo: na mapě Chytit/Trasa/Plánovat, na farmě Stavět/Vylepšit, v atlasu Určit, v profilu Závody; podržením další akce.'],
  ['know', 'Vědomosti 📖', 'Za kvíz, stopu, úkol u krmítka, zápis do deníku a nový druh přibudou vědomosti 📖. Utrácí se za vývoj zvířat. Vypuštěné zvíře se s postaveným příbytkem vrací na farmu jako host. Skutečný čin (budka…) s fotkou dá úroveň navíc.'],
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
