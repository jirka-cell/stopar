// Určovací klíč podle viditelných znaků (vícecestný, se skórováním) pro všechny skupiny.
// Ke každé otázce možnosti [kód, popisek, ikona (název v icons/ui nebo barva)]. Data druhu: 'kde|barvy|znaky|chování' (kódy oddělené mezerou).
export const KEY_Q = {
  'Ptáci': [
    ['kde', 'Kde byl?', [['V', 'plaval na vodě', 'k_voda'], ['B', 'brodil se u vody', 'k_breh'], ['R', 'v rákosí', 'k_rakosi'], ['Z', 'na zemi', 'k_zem'], ['P', 'na louce, poli', 'k_pole'], ['S', 'na stromě, keři', 'k_strom'], ['K', 'na kmeni', 'k_kmen'], ['D', 'u domů, ve městě', 'k_mesto'], ['L', 'jen v letu', 'k_let']]],
    ['barvy', 'Jaké měl barvy?', [['c', 'černá', '#222'], ['b', 'bílá', '#f6f6f2'], ['s', 'šedá', '#9a9fa5'], ['h', 'hnědá', '#8a5a33'], ['r', 'rezavá, oranžová', '#d9762b'], ['z', 'žlutá', '#f2cf2a'], ['e', 'zelená', '#5d9a3a'], ['m', 'modrá', '#3b7bd0'], ['v', 'červená', '#d23a2a']], true],
    ['znaky', 'Čeho sis všiml?', [['cap', 'tmavá čepička / hlava', 'k_cepicka'], ['choch', 'chochol', 'k_chochol'], ['ocas', 'dlouhý ocas', 'k_ocas'], ['kridlo', 'páska na křídle', 'k_kridlo'], ['oko', 'pruh u oka', 'k_oko'], ['skvrny', 'skvrnitý, kropenatý', 'k_skvrny'], ['prsa', 'barevná prsa', 'k_prsa'], ['zrno', 'krátký silný zobák', 'k_zrno'], ['hak', 'zahnutý zobák', 'k_hak'], ['dlouhy', 'dlouhý zobák', 'k_dlouhy'], ['plochy', 'plochý kachní zobák', 'k_plochy'], ['nohy', 'dlouhé nohy', 'k_nohy']], true],
    ['chovani', 'Co dělal?', [['splha', 'šplhal po kmeni', 'k_splha'], ['vrti', 'vrtěl ocasem', 'k_vrti'], ['trepot', 'třepotal se na místě', 'k_trepot'], ['potapi', 'potápěl se', 'k_potapi'], ['letmo', 'chytal hmyz v letu', 'k_letmo'], ['krouzi', 'kroužil vysoko', 'k_krouzi'], ['hejno', 'byl v hejnu', 'k_hejno'], ['zpev', 'zpíval na vrcholku', 'k_zpev']], true]
  ],
  'Savci': [
    ['typ', 'Jaký to byl?', [['mys', 'myš, hraboš, potkan', 'k_t_mys'], ['zajic', 'zajíc, králík', 'k_t_zajic'], ['veverka', 'veverka, plch, sysel', 'k_t_veverka'], ['selma', 'lasice, kuna, tchoř', 'k_t_selma'], ['pes', 'liška, vlk, kočka, mýval', 'k_t_pes'], ['kopytnik', 'srnec, jelen, prase', 'k_t_kopytnik'], ['netopyr', 'netopýr', 'k_t_netopyr'], ['jezek', 'ježek, krtek, rejsek', 'k_t_jezek'], ['vodni', 'bobr, vydra, nutrie', 'k_t_vodni']]],
    ['barvy', 'Jakou měl barvu?', [['h', 'hnědá', '#8a5a33'], ['r', 'rezavá', '#c8682a'], ['s', 'šedá', '#9a9fa5'], ['c', 'černá', '#222'], ['b', 'bílá', '#f6f6f2'], ['z', 'světle žlutavá', '#e2c98a']], true],
    ['znaky', 'Čeho sis všiml?', [['hunaty', 'huňatý ocas', 'k_hunaty'], ['dlouhyocas', 'dlouhý tenký ocas', 'k_dlouhyocas'], ['kratkyocas', 'krátký ocas', 'k_kratkyocas'], ['parohy', 'parohy', 'k_parohy'], ['skvrny', 'skvrny nebo pruhy', 'k_skvrnysrst'], ['zrcatko', 'světlý zadek', 'k_zrcatko'], ['bodliny', 'bodliny', 'k_bodliny'], ['usi', 'velké uši', 'k_usi'], ['maska', 'maska na obličeji', 'k_maska'], ['plovaci', 'plochý ocas, plovací blány', 'k_plovaci']], true],
    ['chovani', 'Co dělal?', [['skace', 'skákal', 'k_skace'], ['splha', 'šplhal po stromě', 'k_splhasavec'], ['plave', 'plaval', 'k_plave'], ['leta', 'létal', 'k_leta'], ['ryje', 'ryl, hrabal', 'k_ryje'], ['noc', 'byl venku v noci', 'night'], ['stado', 'byl ve skupině', 'k_stado']], true]
  ],
  'Obojživelníci': [
    ['typ', 'Jaký to byl?', [['skokan', 'žába hladká, skákavá', 'k_t_skokan'], ['ropucha', 'ropucha, bradavičnatá', 'k_t_ropucha'], ['rosnicka', 'malá zelená žabka na rostlině', 'k_t_rosnicka'], ['kunka', 'malá žabka s barevným břichem', 'k_t_kunka'], ['colek', 'čolek nebo mlok s ocasem', 'k_t_colek']]],
    ['barvy', 'Jakou měl barvu?', [['e', 'zelená', '#5d9a3a'], ['h', 'hnědá', '#8a5a33'], ['s', 'šedá', '#9a9fa5'], ['c', 'černá', '#222'], ['z', 'žlutá', '#f2cf2a'], ['r', 'oranžová', '#e0731f'], ['m', 'modrá', '#3b7bd0']], true],
    ['znaky', 'Čeho sis všiml?', [['bradavice', 'bradavičnatá kůže', 'k_bradavice'], ['pruh', 'světlý pruh na zádech', 'k_pruhzada'], ['skvrny', 'skvrny', 'k_skvrny'], ['hreben', 'hřebínek na zádech', 'k_hreben'], ['bricho', 'barevné břicho', 'k_bricho'], ['maska', 'tmavá skvrna za okem', 'k_maskazaba'], ['nohy', 'dlouhé zadní nohy', 'k_nohyzaba']], true],
    ['kde', 'Kde byl?', [['V', 've vodě, v rybníce', 'k_voda'], ['T', 'v tůni, kaluži', 'k_tun'], ['P', 'na louce', 'k_pole'], ['L', 'v lese', 'k_les'], ['D', 'na zahradě', 'k_zahrada']], true]
  ],
  'Plazi': [
    ['typ', 'Jaký to byl?', [['jesterka', 'ještěrka s nohama', 'k_t_jesterka'], ['slepys', 'lesklý „had“ bez nohou', 'k_t_slepys'], ['had', 'had', 'k_t_had'], ['zelva', 'želva', 'k_t_zelva']]],
    ['barvy', 'Jakou měl barvu?', [['e', 'zelená', '#5d9a3a'], ['h', 'hnědá', '#8a5a33'], ['s', 'šedá', '#9a9fa5'], ['c', 'černá', '#222'], ['z', 'žlutá', '#f2cf2a'], ['m', 'modrá', '#3b7bd0'], ['r', 'měděná, rezavá', '#b8662e'], ['v', 'červená skvrna', '#d23a2a']], true],
    ['znaky', 'Čeho sis všiml?', [['klikaty', 'klikatá čára na zádech', 'k_klikaty'], ['pulmesic', 'žluté skvrny za hlavou', 'k_pulmesic'], ['skvrny', 'skvrny, tečky', 'k_skvrny'], ['leskly', 'hladký a lesklý', 'k_leskly'], ['krunyr', 'krunýř s kresbou', 'k_krunyr']], true],
    ['kde', 'Kde byl?', [['V', 'u vody, ve vodě', 'k_voda'], ['K', 'na kamenech, skalách', 'k_kameny'], ['P', 'na louce, stráni', 'k_pole'], ['L', 'v lese', 'k_les'], ['D', 'na zahradě, zídce', 'k_zahrada']], true]
  ],
  'Ryby': [
    ['tvar', 'Jaký měla tvar?', [['vysoka', 'vysoké tělo', 'k_r_vysoka'], ['stihla', 'štíhlá', 'k_r_stihla'], ['had', 'protáhlá jako had', 'k_r_had'], ['drava', 'protáhlá s velkou tlamou', 'k_r_drava'], ['dno', 'malá u dna, zploštělá', 'k_r_dno']]],
    ['barvy', 'Jakou měla barvu?', [['x', 'stříbrná', '#c9ced3'], ['z', 'zlatavá', '#d6a83a'], ['e', 'zelenavá', '#6f8a3c'], ['h', 'hnědá', '#8a5a33'], ['v', 'červené ploutve', '#d23a2a'], ['c', 'tmavá', '#333']], true],
    ['znaky', 'Čeho sis všiml?', [['vousky', 'vousky u tlamy', 'k_vousky'], ['tecky', 'tečky', 'k_tecky'], ['pruhy', 'svislé pruhy', 'k_pruhyryba'], ['hrbet', 'velká hřbetní ploutev', 'k_hrbet'], ['ostny', 'ostny na ploutvi', 'k_ostny'], ['skvrny', 'skvrny, mramorování', 'k_skvrny'], ['ustadole', 'ústa dole', 'k_ustadole']], true],
    ['kde', 'Kde byla?', [['P', 'v potoce, v proudu', 'k_potok'], ['R', 'v řece', 'k_reka'], ['N', 'v rybníce, jezeře', 'k_rybnik']], true]
  ],
  'Hmyz': [
    ['typ', 'Co to bylo?', [['motyl', 'denní motýl', 'k_t_motyl'], ['mura', 'noční motýl, můra', 'k_t_mura'], ['brouk', 'brouk', 'k_t_brouk'], ['vazka', 'vážka', 'k_t_vazka'], ['vcela', 'včela, čmelák, vosa, mravenec', 'k_t_vcela'], ['kobylka', 'kobylka, saranče, cvrček', 'k_t_kobylka'], ['plostice', 'ploštice', 'k_t_plostice'], ['kudlanka', 'kudlanka', 'k_t_kudlanka']]],
    ['barvy', 'Jakou měl barvu?', [['c', 'černá', '#222'], ['b', 'bílá', '#f6f6f2'], ['z', 'žlutá', '#f2cf2a'], ['r', 'oranžová', '#e0731f'], ['v', 'červená', '#d23a2a'], ['e', 'zelená', '#5d9a3a'], ['m', 'modrá', '#3b7bd0'], ['h', 'hnědá', '#8a5a33'], ['s', 'šedá', '#9a9fa5'], ['k', 'kovově lesklá', '#3aa58f']], true],
    ['znaky', 'Čeho sis všiml?', [['oka', 'oka na křídlech', 'k_oka'], ['tecky', 'tečky', 'k_tecky'], ['pruhy', 'pruhy', 'k_pruhy'], ['tykadla', 'dlouhá tykadla', 'k_tykadla'], ['kusadla', 'kusadla, rohy', 'k_kusadla'], ['pruhledna', 'průhledná křídla', 'k_pruhledna'], ['chlupaty', 'chlupatý', 'k_chlupaty']], true],
    ['kde', 'Kde byl?', [['F', 'na květu', 'k_kvet'], ['P', 'v trávě, na louce', 'k_pole'], ['V', 'u vody', 'k_voda'], ['W', 'na dřevě, kmeni', 'k_kmen'], ['Z', 'na zemi', 'k_zem'], ['L', 'v lese', 'k_les'], ['D', 'u domu, ve světle', 'k_mesto']], true]
  ],
  'Pavoukovci': [
    ['typ', 'Jaký to byl?', [['kruh', 'pavouk v kruhové síti', 'k_t_kruh'], ['lovec', 'pavouk bez sítě', 'k_t_lovec'], ['splet', 'pavouk v neuspořádané síti', 'k_t_splet'], ['sekac', 'sekáč – drobné tělo, dlouhé nohy', 'k_t_sekac'], ['kliste', 'klíště', 'k_t_kliste']]],
    ['barvy', 'Jakou měl barvu?', [['h', 'hnědá', '#8a5a33'], ['s', 'šedá', '#9a9fa5'], ['c', 'černá', '#222'], ['z', 'žlutá', '#f2cf2a'], ['e', 'zelená', '#5d9a3a'], ['b', 'bílá', '#f6f6f2'], ['v', 'červená, oranžová', '#d2502a']], true],
    ['znaky', 'Čeho sis všiml?', [['kriz', 'křížek na zadečku', 'k_kriz'], ['pruhy', 'pruhy', 'k_pruhy'], ['skvrny', 'skvrny', 'k_skvrny'], ['nohy', 'velmi dlouhé nohy', 'k_nohypavouk'], ['kulaty', 'kulatý velký zadeček', 'k_kulaty'], ['oci', 'velké oči, skáče', 'k_oci']], true],
    ['kde', 'Kde byl?', [['P', 'v trávě', 'k_pole'], ['F', 'na květu', 'k_kvet'], ['D', 'v domě, sklepě', 'k_mesto'], ['W', 'na zdi, kůře', 'k_kmen'], ['Z', 'na zemi', 'k_zem'], ['V', 'u vody', 'k_voda'], ['L', 'v lese', 'k_les']], true]
  ],
  'Měkkýši': [
    ['typ', 'Co to bylo?', [['plz', 'plž s ulitou na souši', 'k_t_plz'], ['slimak', 'slimák bez ulity', 'k_t_slimak'], ['vodni', 'plž ve vodě', 'k_t_vodniplz'], ['mlz', 'mušle, lastura', 'k_t_mlz']]],
    ['ulita', 'Jakou měl ulitu?', [['kulata', 'kulatá', 'k_u_kulata'], ['plocha', 'plochá spirála', 'k_u_plocha'], ['vez', 'špičatá věžička', 'k_u_vez'], ['pruhy', 's pruhy', 'k_u_pruhy'], ['zadna', 'bez ulity', 'k_t_slimak']], true],
    ['barvy', 'Jakou měl barvu?', [['z', 'žlutá', '#f2cf2a'], ['h', 'hnědá', '#8a5a33'], ['b', 'bílá, světlá', '#eeeae0'], ['s', 'šedá', '#9a9fa5'], ['r', 'oranžová', '#e0731f'], ['m', 'modrá', '#3b7bd0'], ['c', 'černá', '#222']], true],
    ['kde', 'Kde byl?', [['D', 'na zahradě', 'k_zahrada'], ['L', 'v lese', 'k_les'], ['P', 'na louce, stráni', 'k_pole'], ['V', 've vodě', 'k_voda'], ['K', 'na skalách, zdech', 'k_kameny']], true]
  ],
  'Ostatní': [
    ['typ', 'Co to bylo?', [['rak', 'rak s klepety', 'k_t_rak'], ['stinka', 'stínka – plochá, nesvine se', 'k_t_stinka'], ['svinka', 'svinka – svine se do kuličky', 'k_t_svinka']]],
    ['barvy', 'Jakou měl barvu?', [['h', 'hnědá', '#8a5a33'], ['s', 'šedá', '#9a9fa5'], ['c', 'černá', '#222'], ['z', 'žlutavé skvrny', '#e2c98a']], true],
    ['kde', 'Kde byl?', [['V', 've vodě', 'k_voda'], ['K', 'pod kamenem, dřevem', 'k_kameny'], ['D', 'u domu, ve sklepě', 'k_mesto']], true]
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
  rakosnikvelky: 'R|h|dlouhy oko|zpev', koroptev: 'P Z|h s r|prsa|hejno', bramborniceknedy: 'P|h r b|oko prsa|zpev',
  // savci: typ|barvy|znaky|chování
  veverka: 'veverka|r h c|hunaty usi|splha skace', jezek: 'jezek|h s|bodliny|noc', zajic: 'zajic|h z|usi kratkyocas|skace', srnec: 'kopytnik|h r s|parohy zrcatko|stado',
  liska: 'pes|r b c|hunaty|noc', netopyr: 'netopyr|h|usi|leta noc', jezevec: 'pes|s b c|maska kratkyocas|ryje noc', krtek: 'jezek|c|kratkyocas|ryje',
  prase: 'kopytnik|c h s|kratkyocas skvrny|ryje stado noc', kuna: 'selma|h b|hunaty|noc splha', bobr: 'vodni|h|plovaci|plave', vydra: 'vodni|h z|dlouhyocas plovaci|plave',
  jelen: 'kopytnik|h r|parohy zrcatko|stado', kolcava: 'selma|h b|kratkyocas|skace', hrabos: 'mys|h s|kratkyocas|ryje', plch: 'veverka|s|hunaty|splha noc',
  rejsek: 'jezek|h s c|dlouhyocas|noc', mysice: 'mys|h r z|dlouhyocas usi|skace noc', tchor: 'selma|c h z|maska hunaty|noc', sysel: 'veverka|z h|kratkyocas|ryje',
  nutrie: 'vodni|h s|dlouhyocas plovaci|plave', danek: 'kopytnik|r h b|parohy skvrny zrcatko|stado', potkan: 'mys|s h|dlouhyocas|noc plave', kocka: 'pes|s h c b r|skvrny dlouhyocas|noc splha',
  nornik: 'mys|r h|kratkyocas|splha', kralik: 'zajic|s h|usi kratkyocas zrcatko|ryje stado', krecek: 'mys|r c b|kratkyocas skvrny|ryje', vrapenec: 'netopyr|h s|usi|leta noc',
  netopyrvelky: 'netopyr|h|usi|leta noc', ondatra: 'vodni|h|dlouhyocas plovaci|plave', myval: 'pes|s c|maska hunaty skvrny|noc splha plave', kunalesni: 'selma|h z|hunaty|splha noc',
  netopyrusaty: 'netopyr|h s|usi|leta noc', sika: 'kopytnik|h r|parohy skvrny zrcatko|stado', plsik: 'veverka|r z|hunaty|splha noc', norek: 'selma|c h|dlouhyocas|plave',
  vlk: 'pes|s h|hunaty|stado noc',
  // obojživelníci: typ|barvy|znaky|kde
  skokan: 'skokan|h|maska nohy|P L T', ropucha: 'ropucha|h s|bradavice|L D V', rosnicka: 'rosnicka|e|maska|V D', colek: 'colek|h r|hreben skvrny bricho|T V',
  mlok: 'colek|c z|skvrny|L T', kunka: 'kunka|s c r|bradavice bricho|V T', ropuchazelena: 'ropucha|e s|bradavice skvrny|T D', skokanzeleny: 'skokan|e h|pruh skvrny|V',
  skokanstihly: 'skokan|h r|maska nohy|L', colekhorsky: 'colek|m r|bricho|T L', colekvelky: 'colek|c r|hreben skvrny bricho|V T', blatnice: 'ropucha|s e h|skvrny|P T',
  kunkazlutobricha: 'kunka|s h z|bradavice bricho|T L', skokanostronosy: 'skokan|h m|maska|V P', ropuchakratkonoha: 'ropucha|e h z|bradavice pruh|T P', colekkarpatsky: 'colek|h z|bricho|T L',
  // plazi: typ|barvy|znaky|kde
  jesterka: 'jesterka|h e|skvrny|P D', slepys: 'slepys|h s r|leskly|L D', uzovka: 'had|s c z|pulmesic|V', zmije: 'had|s h c r|klikaty|P K L',
  zivorodka: 'jesterka|h|skvrny|L P', jesterkazelena: 'jesterka|e m|skvrny|P K', uzovkahladka: 'had|h s r|skvrny|K P', uzovkapodplamata: 'had|s e|skvrny|V',
  jesterkazedni: 'jesterka|h s|skvrny|K D', uzovkastromova: 'had|h z|leskly|L K', zelvanadherna: 'zelva|e z v|krunyr|V', zelvabahenni: 'zelva|c z|krunyr skvrny|V',
  // ryby: tvar|barvy|znaky|kde
  kapr: 'vysoka|z h|vousky|N R', stika: 'drava|e|tecky|N R', pstruh: 'stihla|h v|tecky|P', okoun: 'vysoka|e v|pruhy ostny hrbet|N R',
  lin: 'stihla|e z|vousky|N', sumec: 'had|c h|vousky|R N', jelec: 'stihla|x v|ustadole|R P', perlin: 'vysoka|z v|hrbet|N',
  plotice: 'vysoka|x v||N R', strevlicka: 'stihla|x|ustadole|N', cejn: 'vysoka|x c|ustadole|N R', slunecnice: 'vysoka|z e v|tecky ostny|N',
  pstruhduhovy: 'stihla|x v|tecky|P N', hrouzek: 'dno|h x|vousky tecky ustadole|P R', ouklej: 'stihla|x||R N', karas: 'vysoka|x z||N',
  uhor: 'had|h c|hrbet|R N', bolen: 'drava|x|ustadole|R', jezdik: 'dno|h|ostny tecky|R N', vranka: 'dno|h|tecky|P',
  mrenka: 'dno|h|vousky skvrny ustadole|P R', cejnek: 'vysoka|x v||R N', siven: 'stihla|h v|tecky|P', parma: 'stihla|h z|vousky ustadole|R',
  candat: 'drava|e x|pruhy ostny|N R', amur: 'stihla|e x||N', lipan: 'stihla|x|hrbet tecky|P R', jesen: 'stihla|x z v||R',
  sumecek: 'dno|c h|vousky|N', ostroretka: 'stihla|x v|ustadole|R',
  // hmyz: typ|barvy|znaky|kde
  babocka: 'motyl|r c m|oka|F', cmelak: 'vcela|c z b|chlupaty pruhy|F', rohac: 'brouk|h c|kusadla|W', slunecko: 'brouk|v c|tecky|P F',
  vazka: 'vazka|m z h|pruhledna|V', otakarek: 'motyl|z c m v|pruhy oka|F', mravenec: 'vcela|r c|kusadla|L Z', chroust: 'brouk|h c b|tykadla chlupaty|D L',
  rumenice: 'plostice|v c|tecky|W Z', sluneckovychodni: 'brouk|r c|tecky|D F', vcela: 'vcela|h z c|chlupaty pruhy|F', modrasek: 'motyl|m h b|tecky|F P',
  okaclucni: 'motyl|h r|oka|P F', admiral: 'motyl|c r b|pruhy|F', okacpohankovy: 'motyl|r h|oka|P F', chrobak: 'brouk|m c k|kusadla|Z L',
  okacbojinkovy: 'motyl|b c|tecky pruhy|P F', sitkovana: 'motyl|r c b|pruhy tecky|F', belasekrepovy: 'motyl|b c|tecky|F D', perletovec: 'motyl|r c|tecky|F L',
  kudlanka: 'kudlanka|e h|kusadla|P', vroubenka: 'plostice|h|tykadla|D W', zlatohlavek: 'brouk|e k|chlupaty|F', belasekrepkovy: 'motyl|b c|tecky|F P',
  bilec: 'motyl|r h|tecky|F L', zlatohlavektmavy: 'brouk|c b|tecky chlupaty|F', kobylka: 'kobylka|e|tykadla|P', koprivova: 'motyl|r c z m|tecky|F D',
  okacprosickovy: 'motyl|h c|oka|P L', okacpyrovy: 'motyl|h z|oka tecky|L', otakarekovocny: 'motyl|z c|pruhy|F', bodlakova: 'motyl|r c b|tecky|F P',
  knezice: 'plostice|e|tecky|P F', perletovecmaly: 'motyl|r c|tecky|P F', rohacek: 'brouk|c|kusadla|W', kobylkakrovistni: 'kobylka|h|tykadla|P',
  zlutasek: 'motyl|z e|tecky|F L', tesarik: 'brouk|v h|tykadla|F', beloskvrnac: 'mura|c b z|tecky pruhy|F P', bourovec: 'mura|h|chlupaty pruhy|P L',
  soumracnik: 'motyl|r h|chlupaty|F P', majka: 'brouk|c m|tykadla|P Z', srsen: 'vcela|h z|pruhy|W D', prastevnik: 'mura|c b v z|pruhy tecky|F L',
  cmelakpolni: 'vcela|r h|chlupaty|F P', cvrcek: 'kobylka|c|tykadla|P Z', belasekrerichovy: 'motyl|b r|tecky|F L', chrobakjarni: 'brouk|m c k|kusadla|Z L',
  vazkacernorita: 'vazka|m s c|pruhledna|V', strevlik: 'brouk|c|tykadla|Z L', belasekzelny: 'motyl|b c|tecky|F D', pidalka: 'mura|z h|pruhy|P D',
  tesarikpiluna: 'brouk|h|tykadla kusadla|W', sarance: 'kobylka|s h m|pruhy|P Z', modrasekvikvicovy: 'motyl|m h b|tecky|F P', tesarikpizmovy: 'brouk|e k|tykadla|W V',
  mandelinka: 'brouk|e k m|pruhy|F P',
  // pavoukovci: typ|barvy|znaky|kde
  krizak: 'kruh|h b|kriz kulaty|P D W', krizakpruhovany: 'kruh|z c b|pruhy kulaty|P', lovcik: 'lovec|h b|pruhy nohy|P V', krizakpodkorni: 'kruh|h s|skvrny|W',
  sekac: 'sekac|h s|nohy|W D', beznik: 'lovec|b z|skvrny|F', snovacka: 'splet|h|kulaty|Z D', pokoutnik: 'splet|h c|nohy|D',
  krizakctyrskvrnny: 'kruh|v b|skvrny kulaty|P', skakavka: 'lovec|c b|pruhy oci|W D', maloocka: 'lovec|e|kulaty|P F', krizakmostni: 'kruh|s h|skvrny|D W',
  tresavka: 'splet|h b|nohy|D', bezniklistovy: 'lovec|e|skvrny|F P', snovackapokoutni: 'splet|c h|kulaty|D', bezniksvostny: 'lovec|v c|skvrny|F',
  kliste: 'kliste|h c v|kulaty|P L',
  // měkkýši: typ|ulita|barvy|kde
  hlemyzd: 'plz|kulata|h z|D L', paskovka: 'plz|kulata pruhy|z r h|D L', slimakpopelavy: 'slimak|zadna|s c|L D', slimaknejvetsi: 'slimak|zadna|s h|D L',
  paskovkazihana: 'plz|kulata pruhy|b h|P K', plamatka: 'plz|kulata|h|L', suchomilka: 'plz|kulata pruhy|b|P', plovatka: 'vodni|vez|h|V',
  plzak: 'slimak|zadna|r|D', jantarka: 'plz|kulata|z|V P', hlemyzdik: 'plz|kulata|h z|D', okruzak: 'vodni|plocha|h|V',
  kerovka: 'plz|kulata|b z|L', vlahovka: 'plz|kulata|r h|L', skeble: 'mlz|zadna|h|V', vrasenka: 'plz|plocha|h|L K',
  modranka: 'slimak|zadna|m|L', skalnice: 'plz|plocha|h|K', zihlobytka: 'plz|plocha|h|L', tmavoretka: 'plz|kulata|b|L K',
  slavicka: 'mlz|zadna|h c|V',
  // ostatní: typ|barvy|kde
  rak: 'rak|h c|V', svinka: 'svinka|s c|K D', stinka: 'stinka|s h|K D', stinkazedni: 'stinka|s z|D K', svinkaruznobarva: 'svinka|h z s|K'
};
const SPLIT = s => String(s || '').split('|').map(x => x.split(' ').filter(Boolean));
// Znaky druhu jako { otázka: [kódy] } – pořadí částí odpovídá otázkám skupiny v KEY_Q
export function keyTraits(id, group = 'Ptáci') {
  const d = KEY_DATA[id], Q = KEY_Q[group]; if (!d || !Q) return null;
  const parts = SPLIT(d); return Object.fromEntries(Q.map(([q], i) => [q, parts[i] || []]));
}
// Skóre druhu: shoda +2, rozpor −1 (u vícenásobných otázek podle překryvu); místo a čas jen jako bonus pořadí
export function keyScore(id, ans, ctx = {}, group = 'Ptáci') {
  const t = keyTraits(id, group); if (!t) return -Infinity;
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
