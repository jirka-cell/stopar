# Stopař – zadání obrázků (krok 2.6)

Obrázky pro 100 druhů, psa průvodce a ikony pro třídění. Cíl: jednotný styl, který je roztomilý pro děti, ale **každý druh jde poznat** podle skutečných znaků. Aplikace je vzdělávací – roztomilost nesmí přebít správnost.

Prompty pro všech 100 druhů jsou v [prompty.csv](prompty.csv) (vznikají z dat aplikace příkazem `node tools/prompty.mjs`).

---

## 1. Jakou AI použít

| Nástroj | Silná stránka | Slabina | Doporučení |
|---|---|---|---|
| **Recraft** (V4) | uzamčení stylu podle 1–10 vzorových obrázků (Styles), umí i vektor SVG, ilustrace a ikony | průhledné pozadí přes odstranění pozadí, ne přímo | **hlavní volba pro sadu 100 zvířat a ikony** |
| **GPT Image 2** (ChatGPT / OpenAI API) | přímo průhledné PNG, rozumí česky, dobré úpravy podle předlohy, jde dávkově přes API | ilustrační styl bývá jednotvárný | **záloha a pes** (snímky animace úpravou jednoho obrázku) |
| Ideogram 4.5 | průhledné pozadí, 1–5 vzorových obrázků | méně ověřený pro sady ilustrací | zkusit při testu |
| Midjourney | nejhezčí „umělecké“ výsledky, `--sref` pro styl | bez průhledného pozadí, horší přesnost druhů | spíš ne |
| Adobe Firefly | nejmenší právní riziko (licencovaná trénovací data) | slabší držení stylu | když bude důležitá právní jistota |

**Postup:** nejdřív test na 3 druzích (kos, veverka, skokan hnědý) v Recraftu a GPT Image 2 se stejným promptem. Vyber vítěze, ze 3 schválených obrázků udělej v Recraftu uzamčený styl a pak generuj zbytek.

**Licence – důležité:**
- jen **placený plán** (u Recraftu jsou obrázky z free plánu veřejné a jen pro nekomerční použití),
- k obrázkům si zapisuj nástroj, datum a prompt (do aplikace pak „Autor obrázku“ a „Licence“),
- v promptech **nikdy jména žijících umělců ani existující postavy** (Pokémon, Ghibli…); obrázky nesmí připomínat existující hru,
- psa kresli bez předlohy (stock obrázek z vodoznakem nepoužívat).

Zdroje: [Ludo.ai – AI pro herní grafiku](https://ludo.ai/compare/best-ai-image-generators-for-game-art), [MindStudio – Recraft vs Midjourney vs GPT Image 2](https://mindstudio.ai/blog/recraft-v4-1-vs-midjourney-vs-gpt-image-2-design), [OpenAI – průhledné obrázky v gpt-image-2](https://developers.openai.com/cookbook/examples/multimodal/transparent-image-assets-for-campaigns-and-presentations), [Recraft – licence a formáty](https://www.recraft.ai/llms.txt), [Neolemon – konzistentní postavy](https://www.neolemon.com/blog/best-ai-character-generator-for-consistent-characters/). Ceny a podmínky si ověř přímo u nástroje.

---

## 2. Styl

**„Měkký japonský ilustrační styl“** – roztomilé, ale věrné:
- mírně větší hlava a oči (jemný kawaii nádech), **zachované skutečné barvy, kresby a tvar těla**,
- čisté tenké obrysy, ploché barvy s jemným stínováním (cel shading), teplá přírodní paleta,
- celé tělo z boku (3/4 pohled), **hlavou doleva**, stojí na neviditelné zemi,
- bez textu, rámečku, pozadí, stínu a dalších předmětů (stín přidá aplikace),
- u druhů, kde se liší samec a samice, hlavní obrázek = **dospělý samec** (výjimky v CSV).

**Kontrola každého obrázku:** poznáš druh na první pohled? Sedí barvy a kresba podle popisu znaků v CSV? Není moc „lidský“ (žádné oblečení, úsměvy s zuby)?

---

## 3. Technické požadavky

| | |
|---|---|
| Formát | PNG s **průhledným pozadím** (alfa kanál) |
| Rozměr | 1024 × 1024 px (aplikace si zmenší na 512) |
| Umístění | zvíře uprostřed, zabírá asi 80 % výšky, **spodek těla (nohy) ve stejné výšce u všech** – asi 90 % od horního okraje |
| Čitelnost | musí být poznat i zmenšené na 48 px (značka na mapě) – žádné drobné detaily |
| Název souboru | `{id}.png` podle sloupce `soubor` v CSV (např. `kos.png`, `veverka.png`) |
| Kam dát | `D:\Claude\stopar\images\species\` – načítání do aplikace připravím |

Siluety neulovených druhů a „zamčené“ varianty udělá aplikace sama, kreslit je netřeba.

**Volitelně později** (pro evolve a atlas): `{id}-samice.png`, `{id}-mlade.png` ve stejném stylu.

---

## 4. Hlavní prompt (angličtina funguje ve všech nástrojích nejlépe)

```
Cute Japanese-style nature illustration of {LATIN NAME} ({GROUP}), Central European wildlife.
Soft kawaii proportions (slightly larger head and eyes) but anatomically recognizable:
keep the real colors, markings and body shape so the species can be identified.
Key features: {FEATURES}.
Clean thin outlines, flat colors with gentle cel shading, warm natural palette.
Full body, side 3/4 view facing left, standing on an invisible ground line, centered,
filling about 80% of the frame height. Transparent background, no shadow, no text,
no frame, no other objects. Not resembling any existing game or cartoon character.
```

Hotové prompty pro každý druh jsou v `prompty.csv` (sloupec `prompt`). Znaky jsou česky – GPT Image češtině rozumí; pro Recraft je případně nech hromadně přeložit do angličtiny.

---

## 5. Pes průvodce

Stejný styl, **stejné plátno, stejná velikost a stejná linie země u všech snímků** (aby obrázky při přepínání neposkakovaly). Pes z boku, **hlavou doprava**. Nejlépe nakreslit jeden základní obrázek a ostatní dělat úpravou (GPT Image 2 / Recraft s referencí).

| Soubor | Stav |
|---|---|
| `pes-chuze-1.png`, `pes-chuze-2.png` | chůze – střídání předních nohou |
| `pes-vystavuje.png` | vystavování – stojí, jedna přední noha zvednutá, ocas rovně, nos dopředu |
| `pes-cenicha.png` | čenichá u země |
| `pes-sedi.png`, `pes-lezi.png`, `pes-spi.png` | odpočinek (u spánku zavřené oči) |
| `pes-radost.png` | radost – vrtí ocasem, skok |
| `pes-smutny.png` | svěšené uši |
| volitelně | kýchnutí, otřepání, hlava z okna auta, svetr (zima), vyplazený jazyk (léto), svítící obojek (noc), klacík, kost |

Velikost 512 × 512 px, průhledné pozadí, složka `images/dog/`.

---

## 6. Ikony pro obrázkové třídění

Jednoduché ikony v jedné barvě (aplikace je obarví), čitelné v 24 px, průhledné pozadí nebo SVG (Recraft umí vektory). Složka `images/icons/`.

- **Skupiny / ubikace:** pták, tlapka (savec), ryba, žába, ještěrka, motýl, pavouk, šnek, rak
- **Biotopy:** vlnky (voda), rákos (mokřad), skála, strom park, jabloň (sad), jehličnatý a listnatý strom (les), dům se zahrádkou (vesnice), panelák (město), klas (pole), tráva s květem (louka)
- **Ostatní:** hvězda (vzácnost), měsíc (noc), sněhová vločka / květ / slunce / list (roční období), fotoaparát (ověřeno), kopeček (výškové pásmo)

---

## 7. Pořadí práce

1. Test 3 druhů ve 2–3 nástrojích, vybrat vítěze.
2. Uzamknout styl (Recraft Styles nebo stejný vzorový obrázek v GPT Image).
3. Pes – základní obrázek a 2 snímky chůze (stačí na první verzi psa v aplikaci).
4. Druhy po dávkách (např. 25), kontrola znaků proti CSV.
5. Ikony.
6. Poslat / uložit do `images/` – zapojím do aplikace a do Admin → „Autor obrázku“ doplníme nástroj a licenci.
