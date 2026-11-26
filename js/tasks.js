// Úkoly podle místa: u krmítka v parku, u hradu, pramene, vyhlídky nebo jeskyně krátká otázka k místu.
// Správná odpověď přinese surovinu na farmu. Otázka je pro všechny stejná (podle dne a místa).
import { esc } from './config.js';

const Q = (q, a, c, why) => ({ q, a, c, why });
export const TASKS = {
  park: [
    Q('Který strom má listy jako dlaň s pěti cípy a plody s „vrtulkami“?', ['Javor', 'Dub', 'Bříza'], 0, 'Javor má dlanité listy a nažky s křidélky, které létají jako vrtulky.'),
    Q('Podle čeho poznáš dub?', ['Laločnaté listy a žaludy', 'Bílá kůra', 'Jehlice ve svazcích'], 0, 'Dub má laločnaté listy a plody žaludy – oblíbená potrava sojek a veverek.'),
    Q('Který strom má bílou kůru s černými skvrnami?', ['Bříza', 'Lípa', 'Buk'], 0, 'Bříza je jediný běžný strom s bílou kůrou.'),
    Q('Lípa je národní strom Česka. Jak voní v červnu?', ['Sladce, kvete', 'Vůbec', 'Po pryskyřici'], 0, 'Kvetoucí lípy voní medem a lákají včely.'),
    Q('Proč nechávat v parku staré duté stromy?', ['Bydlí v nich sovy, netopýři a datli', 'Lépe hoří', 'Kvůli stínu'], 0, 'Dutiny jsou domovem mnoha živočichů.'),
    Q('Který pták v parku buší zobákem do kmene?', ['Strakapoud', 'Kos', 'Vrabec'], 0, 'Strakapoud (datel) tesá do dřeva a hledá larvy.')
  ],
  hrad: [
    Q('K čemu sloužil hradní příkop?', ['K obraně proti nepřátelům', 'Na ryby', 'Na zalévání'], 0, 'Příkop ztěžoval útočníkům přístup k hradbám.'),
    Q('Jak se jmenuje hlavní, nejvyšší věž hradu?', ['Bergfrit (hláska)', 'Komín', 'Zvonice'], 0, 'Bergfrit byl poslední útočiště obránců.'),
    Q('Kdo dnes často bydlí ve starých zříceninách?', ['Netopýři a sovy', 'Nikdo', 'Králíci'], 0, 'Zříceniny jsou důležitým úkrytem netopýrů.'),
    Q('Co je to padací most?', ['Most, který se zvedal řetězy', 'Most, který spadl', 'Most pro koně'], 0, 'Zvednutý most zavřel bránu.'),
    Q('Jak se jmenovala pevná zeď kolem hradu?', ['Hradba', 'Plot', 'Val'], 0, 'Hradby chránily nádvoří a budovy.')
  ],
  voda: [
    Q('Kdo u vody kváká na jaře nejhlasitěji?', ['Žáby', 'Ryby', 'Kachny'], 0, 'Samci žab kvákají, aby přilákali samičky.'),
    Q('Proč se nemá pít voda přímo z potoka?', ['Může obsahovat bakterie', 'Je slaná', 'Je moc studená'], 0, 'I čistě vypadající voda může být kontaminovaná.'),
    Q('Který pták se potápí pod vodu a běhá po dně potoka?', ['Skorec vodní', 'Čáp', 'Vrána'], 0, 'Skorec loví larvy pod vodou.'),
    Q('Co jsou pulci?', ['Mláďata žab', 'Malé ryby', 'Brouci'], 0, 'Z pulců se proměnou stanou žabky.'),
    Q('Proč je důležité chránit prameny?', ['Jsou zdrojem čisté vody', 'Kvůli zvukům', 'Nejsou důležité'], 0, 'Z pramenů vznikají potoky a řeky.')
  ],
  vyhled: [
    Q('Jak se jmenuje dravec, který krouží vysoko nad krajinou a mňouká?', ['Káně lesní', 'Sýkora', 'Holub'], 0, 'Káně se ozývá hlasem podobným mňoukání.'),
    Q('Proč je na vrcholu kopce chladněji?', ['S výškou teplota klesá', 'Je tam vítr z moře', 'Je blíž Měsíci'], 0, 'Zhruba o 0,6 °C na každých 100 m výšky.'),
    Q('Co uvidíš z rozhledny nejdál za jasného dne?', ['Hory na obzoru', 'Moře', 'Nic'], 0, 'Za dobré viditelnosti jsou vidět vzdálená pohoří.'),
    Q('Jakou značku mají turistické trasy KČT?', ['Barevný pruh mezi bílými', 'Červený kruh', 'Šipku z kamení'], 0, 'Značka KČT je barevný pruh mezi dvěma bílými.')
  ],
  jeskyne: [
    Q('Kdo v jeskyních zimuje?', ['Netopýři', 'Vlaštovky', 'Ježci'], 0, 'Netopýři v jeskyních spí zimním spánkem – nerušit!'),
    Q('Jak se jmenuje krápník, který visí ze stropu?', ['Stalaktit', 'Stalagmit', 'Stalagnát'], 0, 'Stalaktit visí, stalagmit roste ze země.'),
    Q('Proč se v jeskyni nemá svítit na netopýry?', ['Probudí se a vyčerpají', 'Oslepnou', 'Nevadí to'], 0, 'Probuzení v zimě je stojí zásoby tuku.')
  ]
};
// Druh místa podle krmítka (park nebo turistický cíl)
export function placeKind(f) {
  if (f.at === 'park') return 'park';
  const k = String(f.kind || f.at || '');
  if (/hrad|zámek|zřícenin/i.test(k)) return 'hrad';
  if (/pramen/i.test(k)) return 'voda';
  if (/jeskyn/i.test(k)) return 'jeskyne';
  if (/vrchol|vyhlíd|rozhled/i.test(k)) return 'vyhled';
  return null;
}
export const RES_FOR = { park: 'wood', hrad: 'stone', voda: 'seeds', vyhled: 'stone', jeskyne: 'stone' };
// Otázka pro dané místo a den (stejná pro všechny); možnosti zamíchané stejně
export function taskFor(kind, id, day) {
  const list = TASKS[kind]; if (!list) return null;
  let h = 7; for (const ch of id + day) h = (h * 31 + ch.charCodeAt(0)) | 0;
  const q = list[Math.abs(h) % list.length], order = [0, 1, 2].sort((a, b) => ((h >> (a * 3)) & 7) - ((h >> (b * 3)) & 7));
  return { kind, q: q.q, a: order.map(i => q.a[i]), c: order.indexOf(q.c), why: q.why };
}
const TITLE = { park: 'Úkol v parku', hrad: 'Úkol u hradu', voda: 'Úkol u vody', vyhled: 'Úkol na vyhlídce', jeskyne: 'Úkol u jeskyně' };
export function taskHTML(t) {
  return `<h2>${TITLE[t.kind] || 'Úkol místa'}</h2><p class="msg">${esc(t.q)}</p>
  ${t.a.map((x, i) => `<button class="btn full" data-act="taskAns" data-i="${i}">${esc(x)}</button>`).join('')}
  <button class="btn full ghost" data-act="close">Přeskočit</button>`;
}
