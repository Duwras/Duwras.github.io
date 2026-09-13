# SEO audit — utóállapot (2026-09-13)

Oldal: <https://ertekpontpenzugyek.hu/> · Stack: statikus HTML, saját generátor
(`build/generate.mjs`), GitHub Pages hosting, Rackhost domain. Nincs framework, nincs npm,
nincs szerveroldali renderelés — minden oldal build-időben kész HTML (SSG).

Kapcsolódó dokumentumok: [`SEO-KEYWORD-MAP.md`](SEO-KEYWORD-MAP.md) ·
[`SEO-CONTENT-ROADMAP.md`](SEO-CONTENT-ROADMAP.md) · [`LOCAL-SEO-CHECKLIST.md`](LOCAL-SEO-CHECKLIST.md)

---

## 1. Mit találtam (kiinduló állapot)

### Rendben volt
- HTTPS, `http → https` és `www → non-www` 301 (élőben ellenőrizve), valódi 404 státusz.
- Minden oldal statikus HTML, egyedi title/description, canonical, `lang="hu"`, OG/Twitter.
- Saját domainről töltött, magyar karakterkészletre vágott betűk, egy CSS + egy JS kérés,
  WebP-képek, width/height, LCP-előtöltés; a README szerint mért LCP 0,70 s, CLS 0.
- Jogilag gondos szöveg: a „független/alkusz” szó kerülése, háromszintű jogi struktúra
  (márkanév → e.v. → OVB), MNB-számok az impresszumban.

### Hibák és hiányok
| Súly | Lelet |
|---|---|
| P0 | **Belső linkek az `/index.html`-re** (nav, logó, morzsamenü, CTA-k): a `/` és az `/index.html` két URL ugyanarra — a canonical rendbe tette, de a belső linkjel a nem-canonical URL-re ment. |
| P0 | **A 404 oldal indexelhető volt** (`index,follow` + canonical a `/404.html`-re). |
| P0 | **Sitemap `lastmod`** minden buildnél minden URL-en a mai nap — a Google az ilyen lastmod-ot figyelmen kívül hagyja. |
| P0 | **NAP-adat csak JavaScriptből:** a statikus HTML-ben „+36 — — —”, `href="#"` és „Ide kerül a bemutatkozás.” állt; a valódi telefon, e-mail, Facebook-link és bio csak JS után jelent meg. |
| P0 | **Schema ↔ látható adat eltérés:** `FinancialService` (LocalBusiness-altípus) `addressLocality: Budapest` címmel, miközben a látható székhely Abda, és nincs nyilvános ügyfélfogadó hely. `priceRange: "0 Ft"`. |
| P1 | Nem volt céloldal a „pénzügyi tanácsadás / tanácsadó” (880+880), „pénzügyi tervezés” (320, KD 16) kifejezésre, sem városi oldal; a főoldal címe vitte a generikus kifejezést. |
| P1 | Nem volt rólam-, kapcsolat-, szerzői oldal; nem volt szerző/dátum/forrás a szakmai tartalmon. |
| P1 | A path-függő JS (`/szolgaltatas/` minta a `funnel.js`-ben és a `site.js`-ben) mélyebb URL-en törött volna. |
| P2 | `data-reveal` elemek JS nélkül átlátszók maradnak (opacity 0). |
| P2 | A stat blokk csak JS-ből jelent meg. |
| P2 | 3 szolgáltatás-title 72–83 karakter; főoldali description 260+ karakter. |
| P2 | CTA-sáv dekorációs képén nem volt width/height/lazy. |
| P2 | Belső dokumentáció (`*.md`, `docs/`, `build/`) a GitHub Pages-en indexelhető volt. |

---

## 2. Mit javítottam

| Terület | Változás | Fájl |
|---|---|---|
| Linkek | Minden belső főoldali link `./`, `../`, `../../` (nincs `index.html`) — generátor és JS | `build/generate.mjs`, `js/funnel.js` |
| Mélység | `upOf(depth)` tetszőleges mélységre; `<html data-up="…">`, a JS ebből épít útvonalat | `build/generate.mjs`, `js/funnel.js`, `js/site.js` |
| 404 | `noindex,follow`, canonical és og:url nélkül; nincs a sitemapben | `build/generate.mjs` |
| Sitemap | Csak `loc` + `lastmod`; lastmod csak valódi tartalomváltozásnál frissül (a `?v=` és a CSP-hash kiszűrve); 32 URL | `build/generate.mjs → writePage` |
| robots.txt | `Disallow: /*.md$`, `/docs/`, `/build/` + sitemap-sor | `build/generate.mjs` |
| NAP | `data-cfg` / `data-cfg-href` build-időben kitöltve (telefon, e-mail, Facebook, Messenger, bio, nyitvatartás) | `build/generate.mjs → bakeCfg` |
| Stat blokk | Build-időben HTML-be írva, a számláló-animáció megmaradt | `build/generate.mjs → statsHtml`, `js/site.js` |
| JS nélkül | `<noscript>` stílus: a reveal-tartalom mindig látható | `build/generate.mjs → head` |
| Főoldal | Brand-első title, 145 karakteres description, „Pénzügyi tanácsadás · Tímár Richárd” címke a H1 fölött, új „Mielőtt témát választasz” linkblokk (pillar, tervezés, városi hub), link a rólam-oldalra | `build/generate.mjs → homePage` |
| Navigáció | Tanácsadás · Tervezés · Szolgáltatások · Rólam · Kapcsolat; mobil menüben + városok, tudástár; footer „Tanácsadás” oszlop | `build/generate.mjs → nav, footer` |
| Szolgáltatás-oldalak | Visszalink a pillarra, tervezésre és a kapcsolódó cikkre; 3 title rövidítve | `build/generate.mjs → servicePage`, `js/data/services.js` |
| Schema | Organization a látható székhellyel, logo, contactPoint; Person `url` → `/rolam/`; JSON-LD `<` escape | `build/generate.mjs` |
| Képek | CTA-dekoráció: width/height, lazy, async decode | `build/generate.mjs` |

**Design:** a meglévő arculat, tokenek és komponensek maradtak; az új oldalak ezekből épülnek
(`.card`, `.seo-links`, `.acc`, `.steps`, `.sec-head`, `.on-paper`). Új CSS csak a hosszú
szöveghez kellett (`css/content.css`: byline, válasz-doboz, tartalomjegyzék, táblázat,
témakártya) — új szín vagy betűtípus nincs.

---

## 3. Új URL-ek és célkulcsszavak

| URL | Elsődleges kulcsszó | Típus |
|---|---|---|
| `/penzugyi-tanacsadas/` | pénzügyi tanácsadás (+ pénzügyi tanácsadó) | országos pillar, ~2100 szó |
| `/penzugyi-tervezes/` | pénzügyi tervezés | országos céloldal, 6 lépés + szemléltető példa |
| `/penzugyi-tanacsadas/varosok/` | pénzügyi tanácsadás városonként | lokális hub |
| `/penzugyi-tanacsadas/budapest/` | pénzügyi tanácsadó Budapest | városi oldal (személyes + online) |
| `/penzugyi-tanacsadas/debrecen/` | pénzügyi tanácsadó Debrecen | városi oldal (online) |
| `/penzugyi-tanacsadas/szeged/` | pénzügyi tanácsadó Szeged | városi oldal (online) |
| `/penzugyi-tanacsadas/miskolc/` | pénzügyi tanácsadó Miskolc | városi oldal (online) |
| `/penzugyi-tanacsadas/pecs/` | pénzügyi tanácsadó Pécs | városi oldal (online) |
| `/penzugyi-tanacsadas/gyor/` | pénzügyi tanácsadó Győr | városi oldal (online) |
| `/penzugyi-tanacsadas/nyiregyhaza/` | pénzügyi tanácsadó Nyíregyháza | városi oldal (online) |
| `/penzugyi-tanacsadas/kecskemet/` | pénzügyi tanácsadó Kecskemét | városi oldal (online) |
| `/rolam/` | Tímár Richárd pénzügyi tanácsadó | szerzői profil (ProfilePage) |
| `/kapcsolat/` | kapcsolat | ContactPage |
| `/tudastar/` | pénzügyi útmutatók | CollectionPage |
| `/tudastar/penzugyi-tanacsado-ellenorzese/` | pénzügyi tanácsadó ellenőrzése, független pénzügyi tanácsadó (informatív) | cikk |
| `/tudastar/haztartasi-koltsegvetes-es-vesztartalek/` | háztartási költségvetés, vésztartalék | cikk |

Részletek (másodlagos kulcsszavak, szándék, kannibalizáció): `SEO-KEYWORD-MAP.md`.

### A városi oldalak felépítése (doorway-védelem)
- Adatmodell: `build/content/cities.mjs` (név, ragozott alakok, vármegye, Wikidata, `inPerson`,
  title, description, H1, lead, 2 bekezdés bevezető, 4 helyi témakártya, 4 GYIK, CTA,
  kapcsolódó szolgáltatások és cikkek). A sablon: `cityPage()` a generátorban.
- **Egyedi:** lead, bevezető, a 4 témakártya (városonként más élethelyzet és más
  szolgáltatás), 4 GYIK, CTA, title, description. **Közös:** a konzultáció 4 lépése, a jogi
  keret, a Pénzügyi Térkép, a lábléc.
- **Mért átfedés:** a `<main>` szövegének 5-szavas shingle-alapú Jaccard-hasonlósága
  várospáronként átlag **17%**, max. **20%** (Debrecen ~ Győr). A `build/seo-check.mjs` 50%
  fölött hibát dob.
- **Nincs:** kitalált iroda, cím, telefonszám, ügyfélszám, vélemény, díj, képesítés.
  Személyes találkozó csak Budapestnél (ezt a főoldal már korábban is állította). Győrnél a
  valós tény szerepel: a székhely Abdán, Győr szomszédságában van — személyes találkozást nem
  ígér.

---

## 4. Strukturált adat (JSON-LD)

| Oldal | Node-ok |
|---|---|
| Minden oldal | `Organization` (márka, legalName, taxID, székhely a látható impresszum szerint, contactPoint, areaServed: Magyarország, hasOfferCatalog), `Person` (url: /rolam/, worksFor, affiliation → OVB), `Organization` (OVB) |
| Főoldal | + `WebSite`, `FAQPage` |
| Pillar, tervezés | + `WebPage` (author, publisher, dateModified), `BreadcrumbList`, `FAQPage` |
| Városi hub | + `CollectionPage`, `BreadcrumbList`, `FAQPage` |
| Városi oldal | + `WebPage`, `Service` (serviceType: Pénzügyi tanácsadás, `areaServed: City` + Wikidata sameAs, provider, 0 Ft-os Offer, ServiceChannel), `BreadcrumbList`, `FAQPage` |
| Rólam | + `ProfilePage` (mainEntity: Person) |
| Kapcsolat | + `ContactPage` |
| Tudástár | + `CollectionPage` (hasPart → cikkek) |
| Cikk | + `Article` (headline, datePublished, dateModified, author → Person, publisher, citation → források), `BreadcrumbList`, `FAQPage` |
| Szolgáltatás-oldal | (változatlan) `Service`, `FAQPage`, `BreadcrumbList` |

**Szándékosan nincs:** `LocalBusiness` / `FinancialService` (nincs látogatható ügyfélhely),
8 városi telephely, `aggregateRating` / `review`. A QA-szkript mindhármat hibaként jelzi.
A `FAQPage` a látható GYIK-kel egyezik; rich result nem várható tőle (a Google 2026-ban
megszüntette az általános FAQ-kiemelést), de valid, és a tartalom gépi értelmezését segíti.
A Wikidata-azonosítókat élőben ellenőriztem (két kezdeti azonosító hibás volt — javítva).

---

## 5. Build / lint / typecheck / teszt

A projektben **nincs** npm, lint-konfiguráció, TypeScript vagy tesztkészlet — ezért nem volt
mit futtatni ezekből. Amit futtattam:

| Ellenőrzés | Eredmény |
|---|---|
| `node build/generate.mjs` | OK — 32 indexelhető oldal + 404, sitemap, robots |
| `node --check` minden JS/MJS forráson és csomagon | OK |
| `node build/seo-check.mjs` (új QA-szkript) | **OK — 0 hiba, 0 figyelmeztetés**: 32/32 URL-hez fájl, egy title/H1/description, canonical = sitemap, JSON-LD valid, nincs törött belső link vagy horgony, nincs `index.html`-link, minden képnek van alt/width/height, nincs címsor-ugrás, nincs duplikált title/description, 404 noindex, robots-sitemap sor |
| Negatív teszt | Szándékosan elrontott link → a szkript jelezte (nem hamis zöld) |
| Sitemap stabilitás | Két egymás utáni build → a sitemap bájtra azonos |
| Böngésző (localhost) | Főoldal, pillar, Budapest, Győr: 0 konzolhiba; a Pénzügyi Térkép a városi oldalon végigkattintva helyes `../../szolgaltatas/…` és `../../adatkezeles.html` linkeket ad; 375 px-en nincs vízszintes túlcsordulás; asztali nézetben sticky tartalomjegyzék működik |

Lighthouse/PageSpeed mérés az élesítés után futtatandó (localhoston a GitHub Pages
gyorsítótár-viselkedése nem mérhető).

---

## 6. Maradt technikai kérdések

| # | Téma | Miért maradt | Javaslat |
|---|---|---|---|
| 1 | **Vegyes URL-forma:** a szolgáltatás-oldalak `.html`-esek, az újak perjel-végűek | A meglévő `.html` URL-ek átnevezéséhez 301 kellene, a GitHub Pages csak meta-refresh-t tud → indexvesztés kockázata | Így marad; ha egyszer Cloudflare/Netlify kerül elé, lehet 301-gyel egységesíteni. |
| 2 | `/szolgaltatas/x` (kiterjesztés nélkül) és `/index.html` 200-at ad | GitHub Pages viselkedés | A canonical kezeli; belső link már sehol nem mutat ezekre. |
| 3 | Nincs HSTS / biztonsági fejléc, 10 perces cache | GitHub Pages nem enged fejlécet | Cloudflare elé tétele esetén megoldható. |
| 4 | OG-kép 900×900 (a `summary_large_image` 1200×630-at vár) | Új grafika kell | 1200×630-as, márkaszínes OG-kép; oldaltípusonként (pillar, város) is lehet saját. |
| 5 | `js/app.js` 161 kB (kommentmentes, de nem minifikált névvel) minden oldalon | A generátor szándékosan nem nevez át | Élesítés utáni INP-mérés alapján döntsünk; a tartalmi oldalakon a funnel-kód kell. |
| 6 | A szolgáltatás-oldalak BreadcrumbList 2. eleme `/#szolgaltatasok` fragment | Nincs kategória-oldal | Ha lesz kategória-oldal, arra mutasson. |
| 7 | A belső `.md` dokumentáció közvetlen címen elérhető | GitHub Pages mindent kiszolgál | robots-ban tiltva; ha nem lehet publikus, mozgasd privát repóba. |
| 8 | A Pénzügyi Térkép tartalma JS-sel renderelődik | Interaktív komponens | A körülötte lévő szöveg statikus; `<noscript>` telefon/e-mail fallback van. |

---

## 7. E-E-A-T / YMYL — mi került be

- Szerzői byline (név → `/rolam/`, szerep, frissítés dátuma) minden új tartalmi oldalon és
  cikken; cikkeknél megjelenési dátum és `article:*` meta.
- `/rolam/`: bio (a config szövege), mit csinál és mit **nem** (befektetési tanácsadás,
  függetlenség, hozamígéret), díjazás (jutalék nyíltan), háromszintű jogi táblázat, MNB-számok
  és ellenőrzési útmutató, elérhetőség, saját tartalmak listája.
- Ellenőrizhető források listája (MNB, Jogtár: Bit., Hpt., Bszt.) — élőben ellenőrizve.
- Minden új oldal alján YMYL-tájékoztatás; a szemléltető példák kifejezetten „kitalált,
  szemléltető” jelölést kaptak.
- Díjazás és ösztönzés nyílt kimondása (jutalékos modell, érdekkonfliktus).

---

## 8. Manuális teendők

### Search Console (élesítés után)
1. Property ellenőrzése (Domain property, DNS TXT a Rackhostnál) — ha még nincs.
2. `https://ertekpontpenzugyek.hu/sitemap.xml` beküldése / újraküldése.
3. URL-vizsgálat + indexelés kérése: `/penzugyi-tanacsadas/`, `/penzugyi-tervezes/`,
   `/penzugyi-tanacsadas/varosok/`, a 8 városi oldal, `/rolam/`, főoldal.
4. „Oldalak” jelentés: 2–4 hét múlva ellenőrizd, hogy az új URL-ek „Indexelve” státuszúak; a
   „Feltérképezve – jelenleg nincs indexelve” jelzést figyeld a városi oldalaknál.
5. „Teljesítmény”: oldalszűrő `/penzugyi-tanacsadas/`, lekérdezés-szűrők: *tanácsadó*,
   *tervezés*, városnevek; heti CTR- és pozíciókövetés. 8–20. helyen megjelenő kifejezésekre
   bővítsd a tartalmat (roadmap).
6. „Továbbfejlesztések”: a strukturált adatok (Breadcrumb, esetleges hibák) ellenőrzése.

### Google Cégprofil
Lásd `LOCAL-SEO-CHECKLIST.md`: **egy** szolgáltatási területes profil, rejtett címmel,
„Pénzügyi tanácsadó” kategóriával, UTM-es weboldal-linkkel; nyolc városi profil nem.

### Egyéb
- Facebook- és LinkedIn-profil: weboldal-link a `/`-re, a bemutatkozásban „pénzügyi
  tanácsadó” + „online, országosan”.
- 1200×630-as OG-kép.
- Élesítés után PageSpeed Insights mobilon a főoldalra, a pillarra és egy városi oldalra.

---

## 9. Hiányzó adatok — a tulajdonostól bekérendő

| Adat | Hol használnánk |
|---|---|
| Szakmai képesítés / vizsga (pl. biztosításközvetítői hatósági vizsga), megszerzésének éve | `/rolam/`, Person `hasCredential` |
| Saját (természetes személy) MNB-nyilvántartási szám, ha van | `/rolam/`, impresszum |
| Mióta dolgozik a pénzügyi közvetítésben (év) | `/rolam/` |
| Melyik egyetem / szak (a bio említi az egyetemet) — csak ha szeretné közölni | `/rolam/` |
| **Hol lehet személyesen találkozni?** Budapesten kívül (pl. Győr/Abda környéke) is? | `cities.mjs → inPerson`, GBP |
| Van-e saját vagy OVB-s ügyfélfogadó hely, ahol rendszeresen fogad? | GBP, esetleges `FinancialService` schema |
| Valós ügyfélvélemények írásos hozzájárulással | `config.js → testimonials`, GBP |
| Tényleges visszahívási idő hétvégén (a 24 órás ígéret hétvégén is áll?) | CTA-szövegek |
| Van-e írásos pénzügyi terv / összefoglaló, amit az ügyfél kap? | `/penzugyi-tervezes/` (most szándékosan nem ígérjük) |

---

## 10. Jogi / MNB-ellenőrzőlista (tulajdonos + OVB compliance)

1. **„Pénzügyi tanácsadó” megnevezés** használata az OVB szerződéses közvetítőjeként —
   megfelel-e az OVB belső szabályainak és a Bit./Hpt. tájékoztatási előírásainak?
2. **Pillar-oldal állításai:** díjas vs. jutalékos modell összevetése, „nálam a jutalékos modell
   működik” — rendben van-e így kommunikálva?
3. **Tanácsadó-ellenőrzés cikk:** az ügynök / többes ügynök / alkusz táblázat egyszerűsítése
   jogilag pontos-e (Bit. és Hpt. kategóriák).
4. **„Hitelközvetítés”** kifejezés és a társaság hitelközvetítői nyilvántartási száma
   (120123100000) — a társaság milyen minőségben (pl. többes kiemelt közvetítő) szerepel a
   Hpt. szerint, és ezt kell-e az oldalon pontosabban megnevezni?
5. **„0 Ft tanácsadási díj”, „24 órán belül visszahívás”** — a főoldalon már korábban is
   szereplő állítások; az új oldalak ezeket ismétlik. Tartható-e mindkettő minden esetben?
6. **Győri oldal — osztrák bér:** az adójóváírás magyar szja-hoz kötöttségéről szóló
   bekezdés adószakértői megerősítése (az oldal kifejezetten adószakértőhöz irányít).
7. **Anyai / 25 év alatti szja-mentesség** hatása a 20%-os jóváírásra (Debrecen, Nyíregyháza) —
   az általános elv szerepel, konkrét korhatár vagy dátum nélkül; jóváhagyás.
8. Az OVB-t megnevező, de nem az OVB által üzemeltetett oldal — kell-e OVB-jóváhagyás az új
   aloldalakhoz (a lábléc és az impresszum ezt már kimondja).

---

## 11. Következő SEO-fázis (javasolt sorrend)

1. **Élesítés + GSC-beküldés** (fenti 8. pont), 2–4 hét indexelés-figyelés.
2. **Tulajdonosi adatok beépítése** (9. pont) — különösen a képesítés és a személyes
   találkozási helyek; ez közvetlenül erősíti az E-E-A-T-t és a lokális oldalakat.
3. **Google Cégprofil** felállítása és havi 2 bejegyzés.
4. **Tartalom:** a roadmap októberi–novemberi cikkei (THM/TKM, első találkozó, pénzügyi célok).
5. **8–12 hét után:** GSC-adatok alapján városonként a megjelenő lekérdezésekre új GYIK-kérdés
   vagy szakasz; a gyenge CTR-ű title-ök A/B-szerű cseréje (egyszerre egy oldalon).
6. **Linképítés (etikus):** helyi vállalkozói katalógusok, egyetemi pénzügyi-tudatossági
   előadás, szakmai interjú — valós kapcsolatokból.
