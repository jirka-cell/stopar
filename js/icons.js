// Ikony rozhraní na jednom místě – připravené na výměnu za kreslené (ChatGPT).
// Výměna: ulož obrázek do icons/ui/<název>.webp (převod: python -I tools/ikony_export.py) a název přidej do ICON_FILES.
// Dokud obrázek není, použije se emoji níže. Názvy používá app.js i index.html (data-ic="…").
export const ICON_EXT = 'webp';
export const ICON_FILES = new Set(('map atlas dial catch route plan center compass layers offline tester planner treasure trip family quests shop games contests key journal calendar ' +
  'parent pin backup restore legal wipe clBird clMammal clAmph clRept clFish clInsect clSpider clMollusc clOther ' +
  'bio_voda bio_mokrad bio_skaly bio_park bio_sad bio_les bio_vesnice bio_mesto bio_pole bio_louka s_jaro s_leto s_podzim s_zima ' +
  'night kennel injured farm filter feeder myth reward finish cone level res_wood res_stone res_seeds ' +
  'b_lumber b_quarry b_nursery b_field b_orchard b_worms b_store b_pantry e_voliera e_vybeh e_rybnik e_terarium e_insektarium ' +
  'd_barn d_mill d_well d_chapel d_beehive d_scarecrow d_bench d_hay t_meadow t_field t_forest t_pond ' +
  'w_rain w_snow w_cold w_hot w_clear w_cloudy shop_food shop_treat shop_bait shop_lens shop_scope badge me data ' +
  'food_bobule food_drevo food_drobotina food_hlodavec food_hmyz food_korinky food_larvy food_listi food_maso food_mleko food_nektar food_orisky food_rasy food_rostliny food_ryba food_slimaci food_zaby food_zizaly food_zrni ' +
  'alb_datli alb_dravci alb_hmyz alb_noc alb_sovy alb_voda alb_zaby badge_alb_noc badge_alb_sovy badge_alb_voda badge_druhy100 badge_druhy25 badge_druhy5 badge_druhy50 badge_foto3 badge_km100 badge_km25 badge_km5 badge_kviz10 badge_ulovky10 badge_ulovky100 badge_uroven10 badge_uroven5 build deed fest g_pexeso g_rings g_rotate g_rows g_rytmus g_schovka g_slide g_sprint g_swap g_tah g_who h_barvy h_bingo h_bio h_bludiste h_brod h_budky h_chranene h_dal h_detektiv h_doplnovacka h_dvojnici h_ekosystem h_graf h_hadanka h_hejno h_hnizda h_hnizdo h_holub h_honicka h_hospodar h_hraz h_hvezdy h_kalendar h_kim h_kod h_kompas h_kosticky h_krajina h_kridlo h_krmitko h_latina h_led h_lichy h_lihnuti h_logika h_mapa h_maskovani h_meritko h_migrace h_mladata h_morse h_mravenec h_najdi h_noc h_nohy h_nora h_ochrance h_osmismerka h_otazky h_ovce h_pavucina h_plastev h_pocitani h_pokryv h_potrava h_pozar h_pravda h_presmycka h_prislovi h_pruzkum h_rano h_reka h_retez h_retezec h_rodokmen h_rozdily h_rybar h_rybniky h_shora h_sibenice h_sifra h_siluety h_sisky h_snih h_stadia h_stadonohy h_stavba h_stezka h_stin h_stopovana h_stopy h_stromy h_sudoku h_svetlusky h_tunky h_ul h_ul2 h_ulity h_vahy h_velikost h_vrstevnice h_zaludy h_zima h_zlomky h_zmizel h_zpev h_zrcadlo h_zvuky land_hory land_mokrady land_nizina land_pahorkatina land_stredomori land_tajga legends protected rail regen road truck ' +
  'k_bodliny k_bradavice k_breh k_bricho k_cepicka k_chlupaty k_chochol k_dlouhy k_dlouhyocas k_hak k_hejno k_hrbet k_hreben k_hunaty k_kameny k_klikaty k_kmen k_kratkyocas k_kridlo k_kriz k_krouzi k_krunyr k_kulaty k_kusadla k_kvet k_les k_leskly k_let k_leta k_letmo k_maska k_maskazaba k_mesto k_nohy k_nohypavouk k_nohyzaba k_ocas k_oci k_oka k_oko k_ostny k_parohy k_plave k_plochy k_plovaci k_pole k_potapi k_potok k_prsa k_pruhledna k_pruhy k_pruhyryba k_pruhzada k_pulmesic k_r_dno k_r_drava k_r_had k_r_stihla k_r_vysoka k_rakosi k_reka k_rybnik k_ryje k_skace k_skvrny k_skvrnysrst k_splha k_splhasavec k_stado k_strom k_t_brouk k_t_colek k_t_had k_t_jesterka k_t_jezek k_t_kliste k_t_kobylka k_t_kopytnik k_t_kruh k_t_kudlanka k_t_kunka k_t_lovec k_t_mlz k_t_motyl k_t_mura k_t_mys k_t_netopyr k_t_pes k_t_plostice k_t_plz k_t_rak k_t_ropucha k_t_rosnicka k_t_sekac k_t_selma k_t_skokan k_t_slepys k_t_slimak k_t_splet k_t_stinka k_t_svinka k_t_vazka k_t_vcela k_t_veverka k_t_vodni k_t_vodniplz k_t_zajic k_t_zelva k_tecky k_trepot k_tun k_tykadla k_u_kulata k_u_plocha k_u_pruhy k_u_vez k_usi k_ustadole k_voda k_vousky k_vrti k_zahrada k_zem k_zpev k_zrcatko k_zrno').split(' '));
// Ikony věcí farmy a obchodu podle jejich id (emoji v datech zůstává jako záloha a pro texty v hláškách)
const ID_IC = { wood: 'res_wood', stone: 'res_stone', seeds: 'res_seeds',
  lumber: 'b_lumber', quarry: 'b_quarry', nursery: 'b_nursery', field: 'b_field', orchard: 'b_orchard', worms: 'b_worms', store: 'b_store', pantry: 'b_pantry',
  enc_voliera: 'e_voliera', enc_vybeh: 'e_vybeh', enc_rybnik: 'e_rybnik', enc_terarium: 'e_terarium', enc_insektarium: 'e_insektarium',
  barn: 'd_barn', mill: 'd_mill', well: 'd_well', chapel: 'd_chapel', beehive: 'd_beehive', scarecrow: 'd_scarecrow', bench: 'd_bench', hay: 'd_hay',
  w_rain: 'w_rain', w_snow: 'w_snow', w_cold: 'w_cold', w_hot: 'w_hot', w_clear: 'w_clear', w_cloudy: 'w_cloudy',
  t_meadow: 't_meadow', t_field: 't_field', t_forest: 't_forest', t_pond: 't_pond',
  krmivo: 'shop_food', pamlsek: 'shop_treat', navnada: 'shop_bait', objektiv: 'shop_lens', dalekohled: 'shop_scope' };
// Ikona ze souboru, když existuje, jinak náhradní text/emoji
export const icOr = (name, fallback, cls = '') => ICON_FILES.has(name) ? ic(name, cls) : fallback;
// Ikona podle id věci, jinak předané emoji (už escapované)
export const icId = (id, emoji, cls = '') => ICON_FILES.has(ID_IC[id]) ? ic(ID_IC[id], cls) : emoji;
export const IC = {
  // spodní lišta a hlavní tlačítka
  map: '🗺️', collection: '🐾', atlas: '📖', me: '🐕', dial: '✚', close: '✕',
  catch: '📷', route: '🥾', plan: '🧭',
  center: '<svg viewBox="0 0 24 24" width="1em" height="1em" aria-hidden="true"><path d="M12 2.5 4.6 20.2l.8.8L12 18.2l6.6 2.8.8-.8z" fill="currentColor"/></svg>',
  // nástroje mapy
  compass: '🧭', layers: '🗂️', measure: '📏', offline: '⬇️', data: '📶', tester: '📋',
  // Já – Ven
  planner: '🥾', treasure: '💎', trip: '🖼️', family: '👪',
  // Já – Hraj
  quests: '🎯', shop: '🛒', games: '🧩', contests: '🏁',
  // Já – Poznávej
  key: '🔑', journal: '📓', calendar: '📅',
  // Já – Rodina a nastavení
  parent: '🛡️', pin: '🔒', backup: '💾', restore: '📂', install: '📲', about: 'ℹ️', legal: '📄', wipe: '🗑️',
  // karty na mapě
  // třídy zvířat na mapě (druh se ukáže až při setkání)
  clBird: '🐦', clMammal: '🦌', clAmph: '🐸', clRept: '🦎', clFish: '🐟', clInsect: '🦋', clSpider: '🕷️', clMollusc: '🐌', clOther: '🐾',
  // biotopy a roční období pro třídění
  bio_voda: '🌊', bio_mokrad: '🌾', bio_skaly: '🪨', bio_park: '🌳', bio_sad: '🍎', bio_les: '🌲', bio_vesnice: '🏡', bio_mesto: '🏙️', bio_pole: '🌻', bio_louka: '🌼',
  s_jaro: '🌸', s_leto: '☀️', s_podzim: '🍂', s_zima: '❄️',
  night: '🌙', kennel: '🏠', injured: '🩹', farm: '🏡', filter: '🔎',
  feeder: '🏠', myth: '✨', reward: '🎁', finish: '🏁', dog: '🐕', cone: '🌰', level: '⭐'
};
// HTML ikony; cls = další třída (velikost řeší CSS .ic)
export function ic(name, cls = '') {
  const c = 'ic ic-' + name + (cls ? ' ' + cls : '');
  if (ICON_FILES.has(name)) return `<img class="${c}" src="icons/ui/${name}.${ICON_EXT}" alt="" aria-hidden="true">`;
  return `<span class="${c}" aria-hidden="true">${IC[name] || '•'}</span>`;
}
// Doplní ikony do prvků s data-ic v HTML (index.html)
export function fillIcons(root = document) { root.querySelectorAll('[data-ic]').forEach(el => { el.innerHTML = ic(el.dataset.ic); }); }
const CLASS = { 'Ptáci': 'clBird', 'Savci': 'clMammal', 'Obojživelníci': 'clAmph', 'Plazi': 'clRept', 'Ryby': 'clFish', 'Hmyz': 'clInsect', 'Pavoukovci': 'clSpider', 'Měkkýši': 'clMollusc' };
export const classIcon = group => CLASS[group] || 'clOther';
