// Určovací klíč podle viditelných znaků (vícecestný, se skórováním). Zatím ptáci; další skupiny se doplní.
// Ke každé otázce možnosti [kód, popisek, ikona (název v icons/ui nebo barva)]. Data druhu: 'kde|barvy|znaky|chování' (kódy oddělené mezerou).
export const KEY_Q = {
  'Ptáci': [
    ['kde', 'Kde byl?', [['V', 'plaval na vodě', 'k_voda'], ['B', 'brodil se u vody', 'k_breh'], ['R', 'v rákosí', 'k_rakosi'], ['Z', 'na zemi', 'k_zem'], ['P', 'na louce, poli', 'k_pole'], ['S', 'na stromě, keři', 'k_strom'], ['K', 'na kmeni', 'k_kmen'], ['D', 'u domů, ve městě', 'k_mesto'], ['L', 'jen v letu', 'k_let']]],
    ['barvy', 'Jaké měl barvy?', [['c', 'černá', '#222'], ['b', 'bílá', '#f6f6f2'], ['s', 'šedá', '#9a9fa5'], ['h', 'hnědá', '#8a5a33'], ['r', 'rezavá, oranžová', '#d9762b'], ['z', 'žlutá', '#f2cf2a'], ['e', 'zelená', '#5d9a3a'], ['m', 'modrá', '#3b7bd0'], ['v', 'červená', '#d23a2a']], true],
    ['znaky', 'Čeho sis všiml?', [['cap', 'tmavá čepička / hlava', 'k_cepicka'], ['choch', 'chochol', 'k_chochol'], ['ocas', 'dlouhý ocas', 'k_ocas'], ['kridlo', 'páska na křídle', 'k_kridlo'], ['oko', 'pruh u oka', 'k_oko'], ['skvrny', 'skvrnitý, kropenatý', 'k_skvrny'], ['prsa', 'barevná prsa', 'k_prsa'], ['zrno', 'krátký silný zobák', 'k_zrno'], ['hak', 'zahnutý zobák', 'k_hak'], ['dlouhy', 'dlouhý zobák', 'k_dlouhy'], ['plochy', 'plochý kachní zobák', 'k_plochy'], ['nohy', 'dlouhé nohy', 'k_nohy']], true],
    ['chovani', 'Co dělal?', [['splha', 'šplhal po kmeni', 'k_splha'], ['vrti', 'vrtěl ocasem', 'k_vrti'], ['trepot', 'třepotal se na místě', 'k_trepot'], ['potapi', 'potápěl se', 'k_potapi'], ['letmo', 'chytal hmyz v letu', 'k_letmo'], ['krouzi', 'kroužil vysoko', 'k_krouzi'], ['hejno', 'byl v hejnu', 'k_hejno'], ['zpev', 'zpíval na vrcholku', 'k_zpev']], true]
  ]
};
// Znaky ptáků (dospělý; u odlišného pohlaví obojí)
export const KEY_DATA = {
  datel: 'K S|c v|cap dlouhy|splha', holub: 'S Z D P|s b|kridlo prsa|hejno', kos: 'Z S D|c h z|dlouhy|zpev', konadra: 'S D|z c b e s|cap prsa|zpev',
  vrabec: 'D Z|h s c|cap zrno|hejno', kachna: 'V B|e h s b m|plochy kridlo|potapi', volavka: 'B V P|s b c|dlouhy nohy oko|krouzi', kane: 'S P L|h b|hak|krouzi',
  pustik: 'S|h s|hak skvrny|', lednacek: 'B S|m r|dlouhy prsa|potapi', modrinka: 'S D|m z b|cap prsa oko|', penkava: 'S Z D|r s h b|kridlo prsa zrno|zpev',
  strakapoud: 'K S|c b v|cap kridlo|splha', straka: 'Z S P D|c b|ocas|', cap: 'P B D|b c v|dlouhy nohy|krouzi', labut: 'V|b r|plochy|',
  postolka: 'P L D|r s h|hak skvrny ocas|trepot', vlastovka: 'L D P|m c b r|ocas|letmo', rorys: 'L D|c h|ocas|letmo', cervenka: 'S Z|r h s|prsa|zpev',
  vyr: 'S|h r c|hak skvrny|', kavka: 'D P|c s|zrno|hejno', havran: 'P S|c|dlouhy|hejno', drozd: 'Z S|h b|skvrny prsa|zpev',
  rehek: 'D|c s r|ocas|vrti', konipas: 'Z B D|c b s|ocas cap|vrti', brhlik: 'K S|m r b|oko dlouhy|splha', tuhyk: 'S P|s r h c b|oko hak|',
  skrivan: 'P|h|choch skvrny|zpev', hyl: 'S|c v s b|cap prsa zrno kridlo|', lyska: 'V|c b|plochy|potapi', kormoran: 'V B S|c|hak dlouhy|potapi',
  sojka: 'S Z|h r m c b|kridlo choch|', jiricka: 'L D|m c b|ocas|letmo', vrabecpolni: 'P S D|h c b|cap zrno|hejno', zvonek: 'S D|e z|kridlo zrno|zpev',
  stehlik: 'S P|v b c z h|kridlo zrno|hejno', kukacka: 'S L|s b|ocas skvrny|', krahujec: 'S D L|s r b|hak skvrny ocas|', cejka: 'P B|c b e|choch|krouzi',
  strnad: 'P S|z h|prsa zrno|zpev', dudek: 'Z P|r c b|choch dlouhy kridlo|', potapka: 'V|h r b c|choch dlouhy|potapi', jestrab: 'S L|s b h|hak skvrny oko|krouzi',
  sycek: 'D S|h b|hak skvrny|', zluna: 'Z S K|e v z|cap dlouhy|splha', rakosnik: 'R|h|dlouhy|zpev', bazant: 'P Z|r e v h|ocas|',
  koshorsky: 'Z S|c b|prsa|zpev', linduska: 'P Z|h s|skvrny|zpev', polak: 'V|c b|choch plochy|potapi', slipka: 'V B R|c h v z|plochy|',
  kvicala: 'S P|s h r|skvrny prsa|hejno', hrdlicka: 'D S|s h|ocas|', racek: 'V B P D|b s c|nohy|krouzi', spacek: 'P D S|c e|skvrny dlouhy|hejno',
  husa: 'V P B|s h r|plochy|hejno', penice: 'S|s c h|cap|zpev', husice: 'V B P|h r b|plochy oko kridlo|', mlynarik: 'S|b c r|ocas|hejno',
  morcak: 'V|b c e r|dlouhy choch|potapi', motak: 'R P L|h s|hak ocas|krouzi', polakvelky: 'V|r c s|plochy|potapi', budnicek: 'S|e z|oko|zpev',
  lunak: 'P L|r c b|hak ocas|krouzi', volavkabila: 'B V P|b z c|dlouhy nohy|', konipashorsky: 'B|z s c|ocas|vrti', dlask: 'S|r h c b|zrno kridlo|',
  rehekzahradni: 'S D|r s c b|ocas prsa|vrti', konopka: 'P S|h v s|prsa zrno|hejno', orel: 'V L S|h b|hak|krouzi', koprivka: 'V|s h c|plochy|',
  strizlik: 'Z S|h|ocas|zpev', vrana: 'P D S|c s|dlouhy|', potapkamala: 'V|h r|dlouhy|potapi', capcerny: 'B S|c b v|dlouhy nohy|krouzi',
  zrzohlavka: 'V|r c v h|plochy|potapi', mandarinka: 'V|r e m b|plochy choch|', krkavec: 'S P L|c|hak|krouzi', kvakos: 'B S|c s b|dlouhy|',
  cizek: 'S|z e c|cap kridlo zrno|hejno', lejsek: 'S D|s h|skvrny|letmo', kalous: 'S|h r|hak skvrny|', racekbelohlavy: 'V B|b s|nohy|krouzi',
  babka: 'S|h c b|cap|', zvonohlik: 'S D|z e|zrno skvrny|zpev', strakapoudprostredni: 'K S|c b v|cap kridlo|splha', bravnik: 'S P|s h b|skvrny|zpev',
  uhelnicek: 'S|c b s|cap kridlo|', slavik: 'S|h r|ocas|zpev', hohol: 'V|c b e|plochy|potapi', jerab: 'P B|s c v|nohy dlouhy|hejno',
  strnadrakosni: 'R P|c b h|cap|zpev', penicehnedokridla: 'S P|s h b r||zpev', vlha: 'L P|m z r e|dlouhy|letmo', penicepokrovni: 'S|s b|cap oko|zpev',
  branbornicek: 'P S|c r b|cap prsa|zpev', kralicek: 'S|e z c|cap oko|', soupalek: 'K S|h b|dlouhy|splha', skorec: 'B V|h b|prsa|potapi',
  kulik: 'B Z|h b c z|oko nohy|', cirka: 'V B|h e r s|plochy oko|', lzicak: 'V|e b r|plochy|', strnadlucni: 'P|h|skvrny zrno|zpev',
  rakosnikvelky: 'R|h|dlouhy oko|zpev', koroptev: 'P Z|h s r|prsa|hejno', bramborniceknedy: 'P|h r b|oko prsa|zpev'
};
const SPLIT = s => String(s || '').split('|').map(x => x.split(' ').filter(Boolean));
export function keyTraits(id) { const d = KEY_DATA[id]; if (!d) return null; const [kde, barvy, znaky, chovani] = SPLIT(d); return { kde, barvy, znaky, chovani }; }
// Skóre druhu: shoda +2, rozpor −1 (u vícenásobných otázek podle překryvu); místo a čas jen jako bonus pořadí
export function keyScore(id, ans, ctx = {}) {
  const t = keyTraits(id); if (!t) return -Infinity;
  let s = 0;
  for (const [q, picked] of Object.entries(ans)) {
    if (!picked || !picked.length) continue;
    const have = t[q] || [], hit = picked.filter(p => have.includes(p)).length;
    s += hit ? hit * 2 : -1;
    if (q === 'barvy') s -= picked.filter(p => !have.includes(p)).length * 0.5; // barva, kterou nemá, trochu ubere
  }
  if (ctx.month != null && ctx.months && ctx.months.size && !ctx.months.has(ctx.month)) s -= 1.5; // teď u nás není
  if (ctx.night != null && ctx.spNight != null && ctx.night !== ctx.spNight) s -= 0.5;
  if (ctx.bioHere && ctx.bio && ctx.bio[ctx.bioHere] > 0) s += 1;
  return s;
}
