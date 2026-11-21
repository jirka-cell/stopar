// Úvodní souhlas, zásady ochrany osobních údajů, podmínky a stránka O aplikaci a licence.
// Změna textu zásad nebo podmínek = zvýšit TERMS_VERSION → všichni potvrdí znovu.
import { esc } from './config.js';
export const TERMS_VERSION = 3;
export const APP_VERSION = '3.8.0';
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

export function consentHTML(cfg) {
  return `<h2>Vítej ve hře ${esc(cfg.general.appName)}</h2>
  <p class="msg">Chodíš venku po skutečné mapě, potkáváš českou faunu a sbíráš ji do atlasu.</p>
  <div class="fact">Než se cokoliv stáhne z internetu, potřebujeme tvůj souhlas. Aplikace nemá účty ani reklamy a tvůj postup zůstává jen v tomto telefonu. Mapové služby ale uvidí, kde přibližně jsi (podrobně v zásadách).</div>
  <div class="fld"><label for="cYear">Rok narození</label><input type="number" id="cYear" inputmode="numeric" min="1900" max="${new Date().getFullYear()}" placeholder="např. 2012"></div>
  <div id="cParent" hidden>
    <div class="fact">Je ti méně než ${MIN_AGE} let, proto souhlas potvrdí rodič nebo zákonný zástupce tady na tomto telefonu.</div>
    <label class="fld row">Jsem rodič nebo zákonný zástupce, přečetl(a) jsem zásady a souhlasím za dítě<input type="checkbox" id="cParentOk"></label>
    <p class="msg small">Rodičovský PIN chrání smazání dat. Dítěti ho neříkejte.</p>
    ${pinFields('cPin', 'cPin2')}
  </div>
  <div class="fld"><label for="cNick">Jak ti máme říkat? (přezdívka, ne celé jméno)</label><input type="text" id="cNick" maxlength="20" autocomplete="nickname" placeholder="např. Liška"></div>
  <label class="fld row">Přečetl(a) jsem podmínky a zásady ochrany osobních údajů a souhlasím s nimi<input type="checkbox" id="cOk"></label>
  <button class="btn full" data-act="legal">Přečíst podmínky a zásady</button>
  <p class="msg small" id="cErr"></p>
  <button class="btn primary full" data-act="consentOk">Souhlasím a pokračovat</button>`;
}

export function privacyHTML(cfg, overpass, back) {
  const servers = overpass.map(host).map(esc).join(', ');
  return `<h2>Podmínky a zásady</h2><p class="sub">Verze ${TERMS_VERSION}</p>
  <h3>Kdo za aplikaci odpovídá</h3>
  <p class="kv">Správce osobních údajů: <b>${esc(cfg.general.controller || cfg.general.author)}</b><br>Kontakt: ${contactHTML(cfg)}</p>
  <h3>Co aplikace ukládá</h3>
  <p class="kv">Jen do tohoto telefonu: postup ve hře, úlovky, fotky z terénu, nastavení a to, že jsi dal(a) souhlas. Rok narození se neukládá. Aplikace nemá vlastní server, účty, reklamy, analytiku ani sledovací cookies a nic z toho nikomu neposílá.</p>
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
