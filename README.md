# Stopař – PWA (fáze 1)

Statická webová aplikace bez buildu. Běží na libovolném HTTPS hostingu (GPS a offline režim vyžadují HTTPS).

## Struktura

- `index.html`: kostra aplikace
- `manifest.webmanifest`, `icons/`: instalace na plochu
- `sw.js`: offline režim a cache mapových dlaždic
- `css/app.css`: vzhled
- `js/config.js`: výchozí nastavení a popis polí pro admin (jediné místo s parametry)
- `js/app.js`: mapa, GPS, chytání, atlas, záloha
- `js/osm.js`: biotopy z OpenStreetMap (Overpass API), cache v IndexedDB
- `js/spawn.js`: deterministické objevování ptáků (stejné místo a čas = stejní ptáci pro všechny)
- `js/birds.js`: kreslený vzhled ptáků
- `js/admin.js`: editor všech parametrů
- `js/store.js`, `js/geo.js`: úložiště a geometrie
- `js/mapstyle.js`: vzhled vektorové mapy (styly a volitelné vrstvy)
- `vendor/maplibre/`: mapová knihovna MapLibre GL JS 4.7.1 (BSD-3)
- `vendor/maplibre-contour/`: vrstevnice z výškových dlaždic (BSD-3)

## Nasazení na GitHub Pages

1. Na github.com vytvoř nový repozitář, např. `stopar`.
2. Nahraj obsah této složky do kořene repozitáře (Add file → Upload files).
3. Settings → Pages → Source: „Deploy from a branch“, Branch: `main`, složka `/ (root)` → Save.
4. Za 1–2 minuty běží na `https://<uzivatel>.github.io/stopar/`.
5. Vlastní doména (např. stoparapp.cz): Settings → Pages → Custom domain. U registrátora nastav CNAME na `<uzivatel>.github.io`.

Jiný hosting: stačí nahrát soubory na web s HTTPS. Žádný server ani databáze nejsou potřeba.

## Lokální test

```
python3 -m http.server 8000
```
Otevři `http://localhost:8000`. Localhost se počítá jako zabezpečený, takže GPS i service worker fungují.

## Automatické kontroly

```
node --test tests/kontroly.test.mjs
```
Ověří deterministické rozmisťování ptáků, čtení dat z OSM, slučování nastavení, kontrolu obrázků z importu a omezení opakovaných dotazů na Overpass při výpadku. Spouštět po každé změně logiky.

## Instalace v telefonu

- Android (Chrome): Menu → „Nainstalovat na plochu“, nebo nabídka prohlížeče → Přidat na plochu.
- iPhone (Safari): Sdílet → Přidat na plochu.

## Admin

- Vstup: 5× rychle ťukni na název „Stopař“ vlevo nahoře, nebo přidej `#admin` na konec adresy.
- Výchozí PIN: `1234` (změň v Admin → Obecné).
- Editovat jde vše: objevování, chytání, GPS, mapa, OSM tagy biotopů, den a noc, vzácnosti, foto minihra, statistiky, potrava a druhy včetně kresleného vzhledu nebo vlastního obrázku.
- Simulace chůze (Admin → Obecné) slouží k testování z domova: ťukáš do mapy a postavička tam dojde.
- „Zobrazit vrstvu biotopů“ ukáže, jak aplikace čte OSM.
- Nastavení jde exportovat a importovat jako JSON. Tak se dá později rozeslat všem uživatelům.
- Nastavení se ukládá jen v daném telefonu. Výchozí hodnoty pro všechny se mění v `js/config.js`, případně se tam vloží exportovaný JSON.
- Skrytí adminu později: v `js/app.js` smazat obsluhu ťukání na logo a `#admin`.

## Vydání nové verze

Po každé změně souborů zvyš `VERSION` v `sw.js` (např. `stopar-v1.0.1`). Uživatelům se pak ukáže „Je k dispozici nová verze – Aktualizovat“.

## Mapové podklady a OSM

- Mapa: vektorové dlaždice OpenFreeMap (zdarma, bez klíče, bez záruky provozu), vykresluje MapLibre. Styl (automaticky den/noc nebo jeden z pěti) a vrstvy se nastavují v Admin → Mapa a Admin → Vrstvy mapy. Aplikace ukládá jen dlaždice, které uživatel viděl (max. počet v adminu).
- Terén (stínování, vrstevnice): výškové dlaždice Terrarium (AWS Open Data). Trasy: obrázkové dlaždice Waymarked Trails (jen pro rodinnou verzi, do vydání vlastní vrstva z Overpass).
- Pro veřejné nebo komerční spuštění mít zálohu (např. MapTiler s klíčem) – URL vektorové mapy jde změnit v Admin → Mapa.
- Biotopy: Overpass API (overpass-api.de), stahuje se po čtvercích ~1,1 × 0,7 km a ukládá na 30 dní. Při větším počtu uživatelů přejít na vlastní Overpass nebo předpočítaná data.
- Data © přispěvatelé OpenStreetMap, licence ODbL. Atribuce musí zůstat viditelná.

## Data uživatele

- Vše se ukládá v telefonu (IndexedDB): úlovky, fotky, nastavení, cache biotopů.
- Menu → „Uložit zálohu“ stáhne JSON včetně fotek. „Obnovit ze zálohy“ ho nahraje zpět (i do jiného telefonu).
- Smazání dat prohlížeče = ztráta postupu. Proto záloha.
