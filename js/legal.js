// Úvodní souhlas, zásady ochrany osobních údajů, podmínky a stránka O aplikaci a licence.
// Změna textu zásad nebo podmínek = zvýšit TERMS_VERSION → všichni potvrdí znovu.
import { esc } from './config.js';
export const TERMS_VERSION = 4; // 4: datum narození, souhlas rodiče přes QR, e-mail rodiče
export const APP_VERSION = '4.2.0';
export const MIN_AGE = 15; // v ČR může souhlas se zpracováním údajů dát sám až patnáctiletý

const host = u => { try { return new URL(u).host; } catch (e) { return String(u); } };
const contactHTML = cfg => cfg.general.contact
  ? `<a href="mailto:${esc(cfg.general.contact)}">${esc(cfg.general.contact)}</a>`
  : '(e-mail doplníme)';

// Věk podle roku narození: počítá se nejnižší možný věk (narozeniny letos ještě nemusely být)
export function ageFrom(year, now = new Date()) {
  const y = Number(year);
  if (!Number.isInteger(y) || y < 1900 || y > now.getFullYear()) return null;
  return now.getFullYear() - y - 1;
}
export const consentValid = c => !!c && c.v === TERMS_VERSION;

// Rodičovský PIN (4–8 číslic) chrání smazání dat; v telefonu jen sůl a PBKDF2 otisk, ne PIN
export const PIN_RE = /^\d{4,8}$/;
const hex = b => [...new Uint8Array(b)].map(x => x.toString(16).padStart(2, '0')).join('');
async function pinHash(pin, salt) {
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(pin), 'PBKDF2', false, ['deriveBits']);
  return hex(await crypto.subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt: new TextEncoder().encode(salt), iterations: 150000 }, key, 256));
}
export async function newPin(pin) { const salt = hex(crypto.getRandomValues(new Uint8Array(16))); return { salt, hash: await pinHash(pin, salt) }; }
export async function verifyPin(rec, pin) { return !!rec && PIN_RE.test(pin) && await pinHash(pin, rec.salt) === rec.hash; }
const pinFields = (a, b) => `<div class="fld"><label for="${a}">Rodičovský PIN (4–8 číslic)</label><input type="password" id="${a}" inputmode="numeric" autocomplete="new-password" maxlength="8"></div>
  <div class="fld"><label for="${b}">PIN znovu</label><input type="password" id="${b}" inputmode="numeric" autocomplete="new-password" maxlength="8"></div>`;

export function pinSetHTML(hasPin) {
  return `<h2>Rodičovský PIN</h2><p class="msg small">Bez PINu nejde smazat data aplikace. Zapamatujte si ho – když ho zapomenete, data smažete jen v nastavení telefonu (data webu nebo aplikace).</p>
  ${hasPin ? '<div class="fld"><label for="pOld">Současný PIN</label><input type="password" id="pOld" inputmode="numeric" autocomplete="current-password" maxlength="8"></div>' : ''}
  ${pinFields('pNew', 'pNew2')}
  <p class="msg small" id="pErr"></p>
  <button class="btn primary full" data-act="pinSave">Uložit PIN</button><button class="btn full ghost" data-act="menu">Zpět</button>`;
}

export const MONTHS = ['leden', 'únor', 'březen', 'duben', 'květen', 'červen', 'červenec', 'srpen', 'září', 'říjen', 'listopad', 'prosinec'];
// Válcový posuvník data (den / měsíc / rok) – roluje se prstem, vybraná hodnota je uprostřed
export function wheelHTML(now = new Date()) {
  const col = (k, items) => `<div class="wcol" data-w="${k}">${['', '', ...items, '', ''].map(t => `<div class="witem">${t}</div>`).join('')}</div>`;
  const years = []; for (let y = now.getFullYear(); y >= 1920; y--) years.push(y);
  return `<div class="wheel" id="cWheel">${col('d', Array.from({ length: 31 }, (_, i) => i + 1))}${col('m', MONTHS)}${col('y', years)}<div class="wsel"></div></div>`;
}
export function consentHTML(cfg, par = {}, ic = () => '') {
  return `<div class="introhead"><h2>Ještě než vyrazíme</h2><p class="dots"><i class="on" data-dot="1"></i><i data-dot="2"></i></p></div>
  <div class="introcard"><img class="introdog" src="images/dog/sit.webp" alt="">
  <div class="cstep" data-step="1">
    <div class="fld"><label>Kdy ses narodil(a)?</label>${wheelHTML()}<input type="hidden" id="cBirth"><small class="msg small">Datum se nikam neposílá ani neukládá – spočítá se z něj jen věk.</small></div>
    <div class="fld"><label for="cNick">Jak ti máme říkat?</label><input type="text" id="cNick" maxlength="20" autocomplete="nickname" placeholder="přezdívka, třeba Liška"></div>
    <p class="msg small" id="cErr1"></p>
    <button class="btn primary full" data-act="cNext">Dál</button>
  </div>
  <div class="cstep" data-step="2" hidden>
    <div class="introinfo">${ic('pin')}<span>Tvůj postup zůstává jen v tomto telefonu. Nemáme účty, reklamy ani sledování.</span></div>
    <div class="introinfo">${ic('map')}<span>Mapa se stahuje z internetu, a tak mapové služby uvidí, kde přibližně jsi. <button class="linkbtn" data-act="legal">Podrobnosti v zásadách</button></span></div>
    <div id="cParent" hidden>
      <div class="introbox"><b>Zavolej rodiče! 👋</b><span>Je ti méně než ${MIN_AGE} let, takže souhlas dá rodič. Ať si svým telefonem naskenuje tenhle kód.</span></div>
      <div class="qrbox">${par.qr || ''}<small>Kód: <b>${esc(par.code || '')}</b></small></div>
      <div class="fld"><label for="cCode">Potvrzovací kód od rodiče (4 číslice)</label><input type="text" id="cCode" inputmode="numeric" maxlength="4" autocomplete="off"></div>
      <div class="fld"><label for="cMail">E-mail rodiče (nepovinné)</label><input type="email" id="cMail" autocomplete="email" maxlength="80"><small class="msg small">Zatím zůstane jen v telefonu. Až bude mít aplikace server, přijde na něj odkaz k potvrzení souhlasu a pomůže s obnovou PINu.</small></div>
      <p class="msg small">Rodičovský PIN chrání smazání dat. Dítěti ho neříkejte.</p>
      ${pinFields('cPin', 'cPin2')}
    </div>
    <label class="fld row introchk"><input type="checkbox" id="cOk"><span>Souhlasím s podmínkami a zásadami ochrany osobních údajů</span></label>
    <p class="msg small" id="cErr"></p>
    <button class="btn primary full" data-act="consentOk">Vyrazit</button>
    <button class="btn full ghost" data-act="cBack">Zpět</button>
  </div></div>`;
}
// Věk z data narození (RRRR-MM-DD z políčka typu date); null = neplatné
export function ageFromDate(str, now = new Date()) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(str || '')); if (!m) return null;
  const [y, mo, d] = m.slice(1).map(Number), b = new Date(y, mo - 1, d);
  if (b.getMonth() !== mo - 1 || y < 1900 || b > now) return null;
  return now.getFullYear() - y - ((now.getMonth() + 1) * 100 + now.getDate() < mo * 100 + d ? 1 : 0);
}
// Souhlas rodiče bez serveru: telefon dítěte vytvoří náhodný kód (v QR), stránka pro rodiče z něj spočítá 4 číslice k opsání.
// shortcut: jen překážka (dítě by mohlo načíst QR samo), ne zabezpečení – se serverem ověřit e-mailem rodiče.
const CODE_ABC = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
export const newParentCode = () => [...crypto.getRandomValues(new Uint8Array(10))].map(b => CODE_ABC[b % 32]).join('');
export const PARENT_CODE_RE = /^[A-HJ-NP-Z2-9]{10}$/;
export function parentConfirm(code) {
  let h = 5381;
  for (const c of 'stopuj-s-aegonem|rodic|' + code) h = (Math.imul(h, 33) ^ c.charCodeAt(0)) >>> 0;
  return String(h % 10000).padStart(4, '0');
}
export function parentPageHTML(cfg, code) {
  return `<img class="wavehi" src="images/dog/wave.webp" alt=""><h2>Souhlas rodiče</h2>
  <p class="msg">Vaše dítě chce hrát <b>${esc(cfg.general.appName)}</b> – venku chodí po skutečné mapě, potkává českou faunu a sbírá ji do atlasu.</p>
  <div class="fact">Aplikace nemá účty, reklamy ani analytiku. Postup zůstává jen v telefonu dítěte. Mapové služby uvidí přibližnou polohu (kvůli zobrazení mapy). V dětském režimu můžete omezit oblast hry a zapnout ztlumení mapy při chůzi.</div>
  <button class="btn full" data-act="legal">Přečíst podmínky a zásady</button>
  <label class="fld row">Jsem rodič nebo zákonný zástupce, přečetl(a) jsem zásady a souhlasím, aby dítě aplikaci používalo<input type="checkbox" id="rpOk"></label>
  <p class="msg small" id="rpErr"></p>
  <button class="btn primary full" data-act="rpShow" data-code="${esc(code)}">Souhlasím – ukázat potvrzovací kód</button>
  <div id="rpCode" hidden><p class="msg">Opište tento kód do telefonu dítěte a nastavte tam rodičovský PIN:</p><div class="rpbig">${parentConfirm(code)}</div></div>`;
}

export function privacyHTML(cfg, overpass, back) {
  const servers = overpass.map(host).map(esc).join(', ');
  return `<h2>Podmínky a zásady</h2><p class="sub">Verze ${TERMS_VERSION}</p>
  <h3>Kdo za aplikaci odpovídá</h3>
  <p class="kv">Správce osobních údajů: <b>${esc(cfg.general.controller || cfg.general.author)}</b><br>Kontakt: ${contactHTML(cfg)}</p>
  <h3>Co aplikace ukládá</h3>
  <p class="kv">Jen do tohoto telefonu: postup ve hře, úlovky, fotky z terénu, nastavení a to, že jsi dal(a) souhlas. Datum narození se neukládá – jen se z něj spočítá věk. Pokud rodič zadá svůj e-mail, zůstane jen v tomto telefonu; až bude mít aplikace server, použije se jen k potvrzení souhlasu rodiče a k obnově PINu. Aplikace nemá vlastní server, účty, reklamy, analytiku ani sledovací cookies a nic z toho nikomu neposílá.</p>
  <h3>Poloha a mapové služby</h3>
  <p class="kv">GPS se zpracovává jen v telefonu. Aby se zobrazila mapa a poznalo se, v jakém prostředí jsi, telefon si stahuje data z těchto služeb. Ty při tom vidí tvou IP adresu a přibližnou oblast, kterou si prohlížíš:</p>
  <ul class="facts">
    <li>OpenFreeMap (mapa, tiles.openfreemap.org)</li>
    <li>Overpass API – data OpenStreetMap o biotopech (${servers})</li>
    <li>Amazon Web Services – výškopis pro vrstevnice a výšková pásma (s3.amazonaws.com)</li>
    <li>Waymarked Trails – turistické a cyklotrasy, jen když je vrstva zapnutá (tile.waymarkedtrails.org)</li>
    <li>MET Norway – počasí pro hru (api.met.no); posílá se jen poloha zaokrouhlená na zhruba 10 km</li>
    <li>Wikipedie – popis chráněného území, jen když jeho kartu otevřeš (wikipedia.org)</li>
    <li>Nominatim (OpenStreetMap) – jen když v plánovači procházek hledáš místo; dostane hledaný text (nominatim.openstreetmap.org)</li>
    <li>GitHub Pages – odkud se aplikace načítá (jirka-cell.github.io)</li>
  </ul>
  <p class="kv">Tyto služby mají vlastní pravidla; my od nich žádná data nedostáváme.</p>
  <h3>Fotky a záloha</h3>
  <p class="kv">Fotky z terénu zůstávají v telefonu. Záloha je soubor, který si uložíš a schováš sám(a).</p>
  <h3>Tvoje práva</h3>
  <p class="kv">Všechno smažeš tlačítkem Menu → Smazat všechna moje data (chrání ho rodičovský PIN, nastavíš ho v Menu; zapomenutý PIN obejdeš smazáním dat webu nebo aplikace v nastavení telefonu). S dotazy piš na kontakt výše. Stížnost můžeš podat u Úřadu pro ochranu osobních údajů (uoou.gov.cz).</p>
  <h3>Věk</h3>
  <p class="kv">Od ${MIN_AGE} let můžeš souhlasit sám (sama). Za mladší hráče souhlasí rodič nebo zákonný zástupce.</p>
  <h3>Podmínky hry</h3>
  <ul class="facts">
    <li>Hraj bezpečně: dívej se na cestu, ne do telefonu, a dávej pozor na auta.</li>
    <li>Nechoď na soukromé pozemky a v chráněných územích zůstaň na cestách.</li>
    <li>Zvířata ve hře jsou virtuální. Skutečná zvířata neruš, nekrm a nesahej na ně.</li>
    <li>Aplikace je ve zkušebním provozu a je zdarma, bez záruky. Údaje o zvířatech mohou obsahovat chyby.</li>
  </ul>
  <button class="btn full" data-act="${back}">Zpět</button>`;
}

export function aboutHTML(cfg) {
  return `<h2>O aplikaci a licence</h2>
  <p class="msg"><b>${esc(cfg.general.appName)}</b> ${APP_VERSION}<br>Autor: ${esc(cfg.general.author)}<br>Kontakt: ${contactHTML(cfg)}</p>
  <h3>Mapa a data</h3>
  <ul class="facts">
    <li>Mapová data © přispěvatelé <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a>, licence ODbL; biotopy z týchž dat přes Overpass API.</li>
    <li>Mapové dlaždice <a href="https://openfreemap.org" target="_blank" rel="noopener">OpenFreeMap</a>, schéma OpenMapTiles.</li>
    <li>Výškopis: Terrain Tiles (Mapzen, AWS Open Data), zdroje mj. SRTM, GMTED, ETOPO1 a EU-DEM (Copernicus).</li>
    <li>Trasy © <a href="https://waymarkedtrails.org" target="_blank" rel="noopener">Waymarked Trails</a>, licence CC BY-SA 3.0.</li>
    <li>Počasí: data <a href="https://api.met.no/" target="_blank" rel="noopener">MET Norway</a>, licence CC BY 4.0.</li>
    <li>Popisy chráněných území: Wikipedie, licence CC BY-SA 4.0.</li>
    <li>Vyhledávání míst: Nominatim, data © přispěvatelé OpenStreetMap (ODbL).</li>
  </ul>
  <h3>Software</h3>
  <ul class="facts">
    <li>MapLibre GL JS – licence BSD-3-Clause</li>
    <li>maplibre-contour (Michael Barry a přispěvatelé) – licence BSD-3-Clause</li>
  </ul>
  <h3>Obrázky a texty</h3>
  <ul class="facts">
    <li>Kresby zvířat a texty o druzích: autor aplikace. Údaje o druzích čekají na odbornou kontrolu.</li>
    <li>Skutečné fotky v atlasu pořizuješ ty a zůstávají ve tvém telefonu.</li>
  </ul>
  <button class="btn full" data-act="legalAbout">Podmínky a zásady</button>
  <button class="btn full ghost" data-act="menu">Zpět</button>`;
}
