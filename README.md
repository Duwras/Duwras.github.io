# Érték Pont Pénzügyek — weboldal

Statikus weboldal 13 pénzügyi szolgáltatás bemutatására, mindegyikhez saját funnellel és
kalkulátorral, plusz egy globális „Pénzügyi Térkép” kérdőívvel, ami a látogatót a neki
legrelevánsabb témákhoz vezeti.

**Nincs build-kényszer, nincs szerver, nincs adatbázis.** A kimenet tiszta HTML/CSS/JS —
feltölthető bármilyen hostingra (Netlify, Cloudflare Pages, GitHub Pages, cPanel, FTP).

**Az oldal él:** <https://ertekpontpenzugyek.hu/> — saját domain (Rackhost), a tárhely
ingyenes GitHub Pages. Részletek és frissítés: → [`docs/github-pages.md`](docs/github-pages.md)

---

## Mit kell még kitöltened

A `js/config.js` ki van töltve: név, bio, portré, telefon, e-mail, MNB nyilvántartási számok,
OVB cégadatok, stat blokk. **A lead-fogadás is be van kötve és tesztelve** (a jelentkezés
megérkezik a táblázatba, és e-mail is jön róla).

**Egy dolog maradt:** az Apps Script frissítése, hogy a **telefonszám** ne romoljon el a
táblázatban (a Sheets a `+36…`-ot formulának veszi, és kiüríti a cellát). A javított kód
készen van, 4 kattintás a telepítése, az `/exec` URL nem változik:
→ [`docs/google-sheets-setup.md`](docs/google-sheets-setup.md) legfelső szakasza.

> Addig sem veszik el lead: **az e-mail értesítésben a telefonszám mindig helyes**, mert az a
> nyers adatból készül. Csak a táblázat Telefon oszlopa nem megbízható.

Opcionális: `contact.calendar` (Calendly link — üresen a gomb eltűnik), `testimonials`
(valós ügyfél-vélemények), `domain` (amikor megjön a saját domain).

> **Jogi megjegyzés — a három szint.** Az oldal végig szétválasztja, hogy
>
> 1. **„Érték Pont Pénzügyek”** = *márkanév* (fantázianév), nem cég, nincs cégjegyzékszáma;
> 2. **Tímár Richárd e.v.** = az üzemeltető és az adatkezelő (`config.js → business`);
> 3. **OVB Vermögensberatung Kft.** = a *közvetítő társaság*, akinek a nevében és javára a
>    közvetítés folyik, és akivel az e.v. szerződéses jogviszonyban áll (`config.js → legal`).
>
> Ezt mondja ki az impresszum (1–4. pont), az adatkezelési tájékoztató 1. pontja, a lábjegyzet
> minden oldal alján, a főoldali „Rólam” blokk és egy GYIK-kérdés, valamint a JSON-LD
> (`legalName` + külön `Organization` node az OVB-nek, `affiliation`-nel kötve).
> Az oldal nem használja a „független” / „alkusz” szót, mert az MNB-nyilvántartásban más
> kategória — az OVB **többes ügynök**. További igazodási pont: `docs/forrasok.md` vége.

---

## Fájlszerkezet

```
index.html                  ← generált főoldal
szolgaltatas/*.html         ← generált 13 szolgáltatás-oldal
penzugyi-tanacsadas/        ← generált: országos pillar + /varosok/ hub + 8 városi oldal
penzugyi-tervezes/          ← generált: pénzügyi tervezés céloldal
rolam/, kapcsolat/          ← generált: szerzői profil, kapcsolat
tudastar/                   ← generált: cikklista + cikkek
impresszum.html             ← generált
adatkezeles.html            ← generált (GDPR)
404.html                    ← generált hibaoldal (a hosting szolgálja ki)
sitemap.xml, robots.txt     ← generált
.nojekyll                   ← generált (a GitHub Pages ne Jekyll-ezzen)
.gitignore                  ← mi NEM kerül fel a GitHubra (_source/, .claude/)

css/site.css                ← GENERÁLT: a hat css/*.css egy fájlban (ezt tölti a böngésző)
js/app.js                   ← GENERÁLT: a kilenc alap-script egy fájlban
js/3d.js                    ← GENERÁLT: a három 3D script egy fájlban (csak a főoldalon)

js/config.js                ← ITT állítod be a saját adataidat
js/data/services.js         ← A TARTALOM: 13 szolgáltatás szövege, számai, funnelje, kalkulátora
js/data/quiz.js             ← a Pénzügyi Térkép kérdései, pontozása, jogosultsági
                              szabályai (`ELIGIBLE`) és az indoklások (`REASON`)
js/core/rt.js               ← EGY rAF hurok + EGY scroll-busz az egész oldalra
js/core/ui.js               ← reveal, nav, akkordeon, számlálók, süti banner
js/funnel.js                ← funnel motor (kérdés → kalkulátor → eredmény → lead)
js/lead.js                  ← lead küldés Google Sheets-be
js/site.js                  ← config-kötések, stat blokk, kategória-szűrő
js/core/motion.js           ← kártya-tilt, magnetikus gombok, parallax, futószalag
js/gl/mini3d.js             ← saját mini WebGL réteg + GLB olvasó (~8 kB, three.js helyett)
js/hero3d.js                ← hero: a 3D logó nyíl
js/scene3d.js               ← scroll-vezérelt 3D szekció a Pénzügyi Térkép mögött

css/fonts.css               ← @font-face-ek a saját betűkhöz (assets/fonts/)
css/tokens.css              ← színek, tipográfia, térkezelés (itt állítsd a márkaszíneket)
                              + `.on-paper`: a világos (fehér) szekciók tokenjei
css/base.css                ← reset, tipó, layout, animációk
css/components.css          ← nav, gombok, kártyák, footer, banner
css/hero.css                ← hero és oldalspecifikus blokkok
css/funnel.css              ← funnel, kalkulátor, űrlap
css/motion.css              ← animációk, 3D szekció, 3D ikonok

assets/fonts/*.woff2        ← a három betűcsalád, magyar jelekre vágva (~58 kB)
                              + OFL-*.txt (a licenc, a betűk mellett kell lennie)
build/subset-fonts.py       ← ezeket állítja elő a Google Fonts-ról (ritkán kell futtatni)

assets/brand/               ← logók, portré (portre.webp 43 kB — a .jpg tartaléknak marad)
_source/                    ← nyers eredetik (NEM kell feltölteni): portre-original.jpg
assets/3d/ep-arrow.glb      ← a logó nyíl 3D modellje (Blender, 119 kB)
assets/3d/ep-icons.glb      ← 13 lowpoly téma-ikon egy fájlban (Blender, 110 kB, 915 poly)
assets/img/arrow-hero.webp  ← statikus hero-fallback (16 kB); a .png marad OG/megosztó képnek
assets/img/icons/*.webp     ← 13 kirenderelt téma-ikon (256px, átlátszó, 2–4 kB); .png megvan

build/generate.mjs          ← oldalgenerátor
build/content/*.mjs         ← A TARTALMI OLDALAK SZÖVEGE: cities.mjs (8 város), pages.mjs
                              (pillar, tervezés, hub, források), about.mjs, articles.mjs
build/seo-check.mjs         ← SEO QA: title/H1/canonical/JSON-LD/linkek/doorway-hasonlóság
css/content.css             ← hosszú szöveg, tartalomjegyzék, táblázat, témakártya
SEO-*.md, LOCAL-SEO-*.md    ← kulcsszótérkép, tartalmi roadmap, audit, Cégprofil-lista
docs/github-pages.md        ← ingyenes hosting: feltöltés, frissítés, saját domain
docs/google-sheets-setup.md ← lead-fogadás: mi kész, mi van hátra (4 perc)
docs/apps-script.gs         ← a Google Sheets webhook kódja (bemásolásra kész)
docs/forrasok.md            ← a 2026-os számok forrásai + évi frissítési lista
```

---

## Tartalom módosítása

A szolgáltatások szövege, számai, funnel-kérdései és kalkulátorai **egy helyen** vannak:
`js/data/services.js`. Módosítás után futtasd:

```bash
node build/generate.mjs
node build/seo-check.mjs
```

Ez újragenerálja az összes oldalt és a sitemap-et, majd a második parancs ellenőrzi
(title, H1, canonical, JSON-LD, törött linkek, városi oldalak hasonlósága). Hiba esetén
nem-nulla kóddal lép ki — push előtt futtasd.

A városi, pillar-, tervezés-, rólam-, kapcsolat- és tudástár-oldalak szövege a
`build/content/` mappában van. Új cikk: új elem az `ARTICLES` tömbben (`articles.mjs`).
Városi oldalon személyes találkozó csak akkor szerepelhet, ha valós: `cities.mjs → inPerson`.

Új szolgáltatás felvétele: adj egy új objektumot a `SERVICES` tömbhöz (a meglévők a minta),
és futtasd újra a generátort — a navigáció, a footer, a bento grid és a sitemap magától követi.

---

## Helyi megnyitás

```bash
python -m http.server 5173
```

Aztán: <http://localhost:5173>

> A 3D-hez **nincs CDN és nincs ES-modul**, ezért `file://` protokollon (dupla kattintás) is
> elindul. Ha nincs WebGL a gépen, automatikusan a statikus render látszik helyette.

---

## Teljesítmény — mire figyelj, ha hozzányúlsz

Néhány szabály tartja alacsonyan a terhelést:

1. **Egy rAF hurok van, `js/core/rt.js`-ben.** Ha új scroll-reakciót írsz, ne tegyél
   `window.addEventListener("scroll", …)`-t: használd az `EP.rt.onScroll(fn)`-t, mert az
   képkockánként EGYSZER olvas layoutot. Animációhoz `EP.rt.onFrame(fn, false)`, és a
   visszaadott handle `.active` flagjével kapcsold be/ki — a hurok leáll, ha semmi nem aktív.
2. **Layout-olvasás csak képkocka elején.** Az `EP.rt.remeasure()` NEM olvas azonnal, csak
   megjelöli, hogy mérni kell; a tényleges `scrollHeight` / `offsetHeight` olvasás a következő
   képkocka elején fut le, egyszer. (A ResizeObserver a reveal-animációk alatt sokszor elsül —
   a szinkron olvasás korábban ~380 ms kényszerített layoutot okozott betöltéskor.)
3. **Egy CSS és egy JS kérés.** A `build/generate.mjs` a `css/*.css`-ből `css/site.css`-t, a
   `js/**`-ból `js/app.js`-t (és a 3D-ből `js/3d.js`-t) fűz össze. Szerkeszteni a FORRÁSOKAT
   kell, a csomagot a generátor írja újra. A scriptek `defer`-rel töltődnek. A generátor a
   csomagokból kiszedi a kommenteket és a behúzást (`minifyJs` / `minifyCss`) — átnevezés és
   sorösszevonás nélkül, hogy minifier-hiba ne kerülhessen be. A forrásban minden
   magyarázat megmarad.
4. **A 3D saját, helyi WebGL réteg** (`js/gl/mini3d.js`, ~8 kB). Korábban a three.js volt,
   ami **1,3 MB-ot töltött le az unpkg CDN-ről minden oldalbetöltéskor**. Ha 3D-t bővítesz,
   maradj ebben a rétegben, vagy számolj a méret- és GDPR-következménnyel (a CDN-hívás
   kiszivárogtatja a látogató IP-jét egy harmadik félhez).
5. **Képek WebP-ben.** Új képet is konvertálj (a repóban lévők forrása megmaradt PNG/JPG-ben):
   `ffmpeg -i kep.png -c:v libwebp -quality 82 kep.webp`. A megosztó (OG) kép marad PNG, mert
   azt nem minden közösségi platform olvassa WebP-ben. A hero nyíl (`arrow-hero.webp`,
   15,7 kB) szándékosan 900 px: telefonon is retina sűrűséggel jelenik meg, és kisebb
   vágatból ugyanezen a minőségen NAGYOBB fájl lett.
6. **A betűk saját domainről jönnek**, magyar karakterkészletre vágva (`assets/fonts/`,
   `css/fonts.css`). Ne tedd vissza a Google Fonts CDN-t: onnan 296 kB jött két idegen
   origóról, és a betűfájlok csak a CDN-stíluslap MEGÉRKEZÉSE UTÁN indultak — három
   egymásra épülő kérés a kritikus úton. Most ~58 kB, egy origó, a két legfontosabb vágat
   `preload`-dal. Ha új nyelv vagy jel kell: `build/subset-fonts.py`.
7. **A 3D csak akkor töltődik le, ha futni is fog.** A `hero3d` 860 px alatt, a `scene3d`
   1024 px alatt magától kilép — statikus `<script>`-tel a telefon így is letöltötte és
   lefordította a 25 kB-ot feleslegesen. A főoldalon egy beágyazott betöltő a `load`
   esemény után, üresjáratban teszi be a `js/3d.js`-t, így a WebGL-indítás nincs a
   kritikus úton. Ha ezt a snippetet módosítod, a CSP SHA-256 lenyomata magától
   újraszámolódik (`generate.mjs → loader3dSrc` + `cspMeta`).
8. **CSP `<meta>`-ban.** A GitHub Pages nem enged saját HTTP-fejlécet, ezért a
   tartalombiztonsági házirend meta-tagben van (`generate.mjs → cspMeta`). Ha új külső
   szolgáltatást kötsz be (Calendly-beágyazás, analitika, másik lead-végpont), vedd fel a
   megfelelő direktívába — különben a böngésző csendben blokkolja. A lead-küldés
   (`script.google.com`) már benne van — és vele együtt a
   `script.googleusercontent.com` is, mert az Apps Script `/exec` végpont 302-vel
   oda irányít át, a CSP pedig az átirányítás célját is ellenőrzi. Ha ez utóbbi
   kimarad, a jelentkezés `Failed to fetch`-csel elszáll, és a funnel „Nem sikerült
   elküldeni” hibát mutat.

Amit szándékosan **nem** használunk, mert görgetés közben újrafestést kényszerít:
`filter: blur()` és `mix-blend-mode` mozgó elemen, `backdrop-filter` telefonon (asztali
gépen bekapcsolva marad), `will-change` sok elemen egyszerre, továbbá CSS
`animation-duration` menet közbeni átírása (ettől ugrik az animáció).

Mért állapot (DevTools trace, mobil profil, 4× lassított CPU + Slow 4G, hideg gyorsítótár):
**LCP 0,70 s, CLS 0,00** — ugyanezen a mérésen a 2026. augusztusi állapot 1,92 s volt.
Akadálymentesség / Ajánlott gyakorlat 100, SEO 100 a gyökér-URL-en.

Két dolog a PageSpeed-jelentésből **szándékosan** maradt így:

- **„Hatékony gyorsítótár-élettartam” (10 perc).** A GitHub Pages fixen 600 mp `max-age`-et
  küld, és nem enged fejléc-beállítást. Csak úgy lehetne hosszabb, ha a domain elé egy
  Cloudflare (vagy más CDN) kerülne. Az első betöltést nem érinti, csak a visszatérő
  látogatót. Az összefűzött fájlok neve `?v=…` bélyeget kap, tehát hosszabb TTL is
  biztonságos lenne.
- **„Nincs érvényes rel=canonical” (SEO 92).** Ez akkor jön elő, ha a jelentést az
  `/index.html` címre kéred: a canonical a gyökérre (`/`) mutat, a Lighthouse pedig ezt
  „a domain gyökerére mutat” hibaként jelzi. A canonical helyes — a látogatók és a Google
  is a gyökeret látja. **A méréshez a `https://ertekpontpenzugyek.hu/` címet add meg**
  `index.html` nélkül, akkor a SEO 100.

### Világos szekciók

Egy szekció fehérre váltásához elég a `class="section on-paper"` — a `.on-paper` csak
tokeneket ír felül (`--text`, `--line`, `--surface`, és a szöveg-lime helyett sötétzöld
`--lime-text`), a komponensek maguktól követik. Szövegszínhez ezért mindig
`var(--lime-text)`-et használj, felülethez (gomb, badge) `var(--lime)`-et.

---

## SEO — mire van optimalizálva

> **2026-09 óta:** országos pillar (`/penzugyi-tanacsadas/`), pénzügyi tervezés, 8 városi
> oldal + hub, rólam/kapcsolat, tudástár. A részletek, a kulcsszó-hozzárendelés és a
> kannibalizáció-kezelés: `SEO-KEYWORD-MAP.md`; mit kell még kézzel megtenni:
> `SEO-AUDIT-AFTER.md`; Google Cégprofil: `LOCAL-SEO-CHECKLIST.md`. A lenti lista az eredeti
> (szolgáltatás-oldalakra vonatkozó) elvek — a strukturált adat azóta `Organization`, nem
> `FinancialService` (nincs látogatható ügyfélhely).

Országos, természetes keresésre. A rangsor nem vásárolható és nem garantálható, de ami
technikailag elvégezhető, az készen van:

- **Címek és leírások** a keresett kifejezéssel az elején, nem a márkanévvel.
  A főoldal fő kifejezései: *pénzügyi tanácsadó*, *nyugdíj*, *lakáshitel*, *biztosítás*.
- **H1 = a keresett kifejezés** az aloldalakon (`js/data/services.js → h1`, ha eltér a
  kártyán látható rövid névtől). Például: „Otthon Start és támogatott lakáshitelek”.
- **Strukturált adat (JSON-LD)** összekötött gráfként: `FinancialService` + `Person` +
  `WebSite` + oldalanként `Service`, `FAQPage`, `BreadcrumbList`. Az `areaServed`
  mindenhol Magyarország — ez mondja meg a keresőnek, hogy nem csak budapesti a szolgáltatás.
- **Belső linkelés beszédes szöveggel**: a főoldali „Hol érsz el” blokk (`#orszagos`) a
  legnagyobb keresési volumenű aloldalakra mutat, a link szövege maga a kifejezés.
- **Sitemap prioritás** a kereslet szerint (`build/generate.mjs → TOP_SLUGS`): Otthon
  Start / lakáshitel, nyugdíj, KGFB, gyerek-megtakarítás, személyi kölcsön, bankszámla.

Amit **neked** kell megtenni, mert fiókhoz kötött (és ez hozza a legtöbbet):

1. [Google Search Console](https://search.google.com/search-console): domain hitelesítés,
   `sitemap.xml` beküldése, majd havonta a „Teljesítmény” fül — arra a kifejezésre írj több
   tartalmat, amire már most megjelensz a 8–20. helyen.
2. **Google Cégprofil** (Google Business Profile): a helyi találatokhoz ez a legerősebb
   egyetlen tényező. Kategória: pénzügyi tanácsadó, szolgáltatási terület: egész ország.
3. Az oldal linkje a Facebook- és LinkedIn-profilba (ez adja az első hivatkozásokat).

---

## Élesítés

**Kész: az oldal él** a <https://ertekpontpenzugyek.hu/> címen, HTTPS-sel.

Ami hátra van:

1. Frissítsd az Apps Scriptet a telefon-javítással és a spam-szűrővel
   (`docs/google-sheets-setup.md`, 4 kattintás).
2. Ellenőrizd: küldj be egy próba-jelentkezést az **éles** oldalról, és nézd meg,
   megjelenik-e a táblázatban helyes telefonszámmal.
3. Töröld a teszt sorokat a táblázatból (`TESZT…` kezdetűek).
4. Küldd be a `sitemap.xml`-t a [Google Search Console](https://search.google.com/search-console)-ba.
5. Írd át a linket a Facebook-oldalon és a LinkedIn-profilban az új címre.

> A repóban van egy `CNAME` fájl, amit a GitHub hozott létre a domain mentésekor.
> **Ne töröld** — ez tartja a saját domaint. A generátor nem írja felül.

**Módosítás feltöltése bármikor:**

```bash
node build/generate.mjs
git add -A
git commit -m "mit változtattál"
git push
```

---

## Amire a tartalom miatt figyelni kell

- Az oldal **nem nevez meg konkrét terméket vagy szolgáltatót**, és a lábjegyzetben, valamint
  minden szolgáltatás-oldal alján szerepel a jogi kitétel (tájékoztatás, nem személyre szóló
  tanácsadás, a hozam nem garantált, a hitelfelvétel kockázattal jár).
- A **kalkulátorok becslést adnak**, minden eredmény alatt ott a magyarázó megjegyzés.
- A 2026-os számok **jogszabályhoz kötöttek** — évente januárban frissítendők,
  lásd `docs/forrasok.md` végén a checklistet.
- Az `adatkezeles.html` **minta jellegű kiindulás**: a saját cégadataiddal és szükség szerint
  jogi szakértővel véglegesítsd.
