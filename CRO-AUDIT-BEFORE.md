# CRO audit — kiinduló állapot (2026-09-13)

Oldal: <https://ertekpontpenzugyek.hu/> · Cél: a látogató a lehető leggyorsabban **telefonáljon**
vagy **kérjen visszahívást**. Ez a dokumentum a módosítások ELŐTTI állapotot rögzíti
(a `e7bb1ad` commit szerint). Az utóállapot: [`CRO-AUDIT-AFTER.md`](CRO-AUDIT-AFTER.md).

---

## 1. Technikai alapok

| Terület | Állapot |
|---|---|
| Framework | Nincs. Statikus HTML, saját generátor: `build/generate.mjs` (Node 22, függőség nélkül) |
| Routing | Fájlalapú, GitHub Pages. `.html` (szolgáltatások, jogi oldalak) és perjeles (`/penzugyi-tanacsadas/…`) URL-ek |
| Layout | Egy sablonrendszer a generátorban: `head()`, `nav()`, `footer()`, `stickyCta()`, `scripts()`; oldaltípusonként `homePage`, `servicePage`, `cityPage`, `contentPage`, `knowledgeHubPage`, `imprintPage`, `privacyPage`, `notFoundPage` |
| Tartalom | `js/data/services.js` (13 szolgáltatás + funnel + kalkulátor), `js/data/quiz.js` (Pénzügyi Térkép), `build/content/*.mjs` (városok, pillar, tervezés, rólam, kapcsolat, cikkek) |
| Konfiguráció | `js/config.js` — név, telefon (`+36 20 369 5312` / `+36203695312`), e-mail, nyitvatartás, jogi adatok, lead-végpont |
| CSS / JS | Forrás: `css/*.css`, `js/**`; a böngésző egy csomagot kap (`css/site.css`, `js/app.js`, defer) |
| CSP | `<meta>`-ban; `connect-src` csak `self` + Google Apps Script |
| Build / QA | `node build/generate.mjs`, `node build/seo-check.mjs` (baseline: **0 hiba**). Nincs npm, lint, TS, unit/e2e teszt |

### Publikus route-ok (32 indexelhető + 404)

- `/` — főoldal
- `/szolgaltatas/*.html` — 13 szolgáltatás-oldal (commercial landing)
- `/penzugyi-tanacsadas/` (pillar), `/penzugyi-tervezes/`, `/penzugyi-tanacsadas/varosok/` (hub)
- `/penzugyi-tanacsadas/{budapest,debrecen,szeged,miskolc,pecs,gyor,nyiregyhaza,kecskemet}/` — 8 városi oldal
- `/rolam/`, `/kapcsolat/`
- `/tudastar/` + 2 cikk
- `/impresszum.html`, `/adatkezeles.html`, `/404.html`

---

## 2. Konverziós elemek — leltár

### 2.1 Header (`nav()`)

| Elem | Szöveg | Cél | Megjegyzés |
|---|---|---|---|
| Linkek (≥1024 px) | Tanácsadás · Tervezés · Szolgáltatások · Rólam · Kapcsolat | hub-oldalak | 5 azonos súlyú link — rendben |
| CTA gomb (≥860 px) | **„Indítsuk el”** | `#terkep` a főoldalon | **Homályos** felirat; aloldalról **elviszi** a látogatót a főoldali kvízre (kontextusvesztés) |
| Telefonszám | — | — | **Nincs** a fejlécben, desktopon sem |
| Mobil | csak burger | teljes képernyős menü | a menüben nincs hívás / visszahívás gomb, csak a „Kapcsolat” link |

### 2.2 Hero-k

| Oldal | Elsődleges CTA | Másodlagos | Telefon a heróban |
|---|---|---|---|
| Főoldal | „Pénzügyi Térkép — 1 perc” (→ `#terkep`, 7–8 kérdés) | „Mind a 13 téma” (→ `#szolgaltatasok`) | **nincs** |
| Szolgáltatás | „Számoljuk ki nálam” (→ `#funnel`) | „Inkább hívnék” (`tel:`) | van, ghost |
| Városi | „Pénzügyi Térkép — 1 perc” | „Hívás: +36 20 369 5312” (`tel:`) | van |
| Pillar, tervezés | „Pénzügyi Térkép — 1 perc” | „Hívás: …” | van |
| Rólam, kapcsolat, cikkek | „Hívás: …” (egyetlen gomb) | — | van |
| 404 | „Pénzügyi Térkép — 1 perc” | „Mind a 13 téma” | nincs |

A főoldali heróban egyetlen gomb sem visz közvetlenül kapcsolatfelvételhez: az elsődleges út
egy 7–8 lépéses kvíz, a másodlagos egy tartalmi horgony.

Hero-alatti állítások (főoldal, városi oldalak): „**0 Ft** tanácsadási díj”, „**24 órán** belül
visszahívás”, „Több partner…”. A **24 órás visszahívás nincs igazolva** (a
`SEO-AUDIT-AFTER.md` 9. és 10.5. pontja is nyitott kérdésként jelzi).

### 2.3 Formok

Az oldalon **nincs önálló kapcsolat- vagy visszahívás-űrlap**. Lead csak két funnel VÉGÉN
küldhető (`js/funnel.js`):

| Form | Hol | Előtte kötelező lépések | Mezők |
|---|---|---|---|
| Pénzügyi Térkép eredmény-form | főoldal, pillar, tervezés, kapcsolat, 8 városi oldal, hub | 7 kérdés (+1 feltételes), mind kötelező | Név*, Telefon*, E-mail, Megjegyzés, Hozzájárulás* |
| Szolgáltatás-funnel form | 13 szolgáltatás-oldal | 3 kérdés + kalkulátor („Tovább”) | ugyanaz |

- Mezők: **5** (3 kötelező: név, telefon, adatkezelési hozzájárulás; 2 opcionális: e-mail, megjegyzés).
- Témaválasztó: nincs (a funnel kontextusa adja a témát).
- Telefon: `type="tel"`, `autocomplete="tel"`; validáció csak beküldéskor: 8–15 számjegy.
  Nincs magyar formátum-ellenőrzés (+36 / 06, mobil-előhívó), nincs mintát adó hibaüzenet.
- Hibák: piros keret + rejtett szöveg (`.field-error`) + 2,6 mp-es toast. Nincs `aria-invalid`,
  `aria-describedby`, nincs fókusz az első hibás mezőre.
- Spam: honeypot (`_hp`), 1,5 mp-es időcsapda, szerveroldalon (Apps Script v3) pontozás,
  90 mp-es duplikátum-szűrő, óránkénti limit. **Jó alap, CAPTCHA nem kell.**
- Loading: `is-loading` osztály (`pointer-events: none`) + „Küldés” felirat. **Hiba:** nincs
  `submitting` zár — Enter billentyűvel a folyamatban lévő kérés alatt újra be lehet küldeni.
  Nincs `aria-busy` / `aria-live` visszajelzés. Nincs időkorlát (lógó kérés = örök pörgés).
- Hibaállapot: 2,6 mp-es toast „Nem sikerült elküldeni — próbáld újra, vagy hívj közvetlenül”
  — **telefonszám / `tel:` link nélkül**, és eltűnik. Az input megmarad (jó).
- Siker: „Megérkezett. Köszönöm! **24 órán belül** keresni fogom…” + „Többi téma” gomb.
  **Nincs „Hívás most” CTA**, és nem igazolt időígéret.
- Backend: `EP.sendLead()` → `fetch(no-cors)` a Google Apps Script `/exec` végpontra → Google
  Sheets sor + e-mail értesítés. A `no-cors` miatt a válasz nem olvasható: siker = a kérés
  kiment. Biztonsági másolat `localStorage`-ba. Secret nincs a kliensben (a `/exec` URL
  publikus webhook, nem kulcs).

### 2.4 Telefonszám-megjelenések

A telefonszám **centralizált** (`js/config.js → contact.phone / phoneHref`), a generátor
build-időben kiírja (`bakeCfg`), a `js/site.js` futásidőben frissít. Minden megjelenés `tel:`
link. Előfordulások: footer, szolgáltatás-hero („Inkább hívnék”), városi/tartalmi hero
(„Hívás: …”), főoldali Rólam-blokk („Telefonhívás”), kapcsolat-kártya, sticky sáv (ikon),
`<noscript>` a Térképnél. **Header: nincs.** A formok siker- és hibaállapotában: nincs.

### 2.5 Mobil sticky sáv (`.sticky-cta`)

- Tartalom: „Pénzügyi Térkép” gomb + telefon **ikon** (felirat nélkül).
- Csak 85% viewport-görgetés után jelenik meg, és **eltűnik**, amíg bármelyik funnel látszik
  (a főoldal nagy részén).
- Nincs `safe-area-inset` kezelés (iPhone home-indicator).
- A süti-banner (z-index 1000) fölé kerül, ugyanabban a sávban (alsó 1 rem) — ütközés.
- Aloldalon a „Pénzügyi Térkép” gomb a **főoldalra** navigál.

### 2.6 Modálok, toastok

- `initOverlay()` (`js/core/ui.js`) létezik `[data-open-funnel]` triggerrel, de **egyetlen
  oldal sem használja**. Nincs fókuszcsapda, nincs fókusz-visszaadás.
- Toast: `role="status"`, 2,6 mp — egyetlen visszajelzési csatorna a form-hibákra.

### 2.7 Analitika, consent

- **Nincs** GA4, GTM, Meta Pixel vagy más mérés. `dataLayer` nincs.
- Süti-banner: „Rendben” / „Csak a szükséges” — a döntést eltárolja, de nincs mihez kötni.
- A CSP csak a Google Apps Script-et engedi; új mérőkód csak CSP-bővítéssel futna.
- **Konverzió-mérés: nulla.** Nem tudható, melyik oldal / CTA hoz leadet. A lead-sorban csak az
  `oldal` (URL) és a `tipus` (Térkép / Szolgáltatás-funnel) látszik. UTM nincs megőrizve: ha a
  látogató a kampány-landingről továbbkattint, a paraméter elveszik.

---

## 3. Customer journey — kattintásszám

„Kattintás” = koppintás/kattintás; a gépelés külön szerepel. A görgetést nem számoltam, de jelzem.

### Telefonhívás

| Kiindulás | Legrövidebb út | Interakció |
|---|---|---|
| Főoldal, mobil | görgetés ≥ 85% vh → sticky telefon-ikon (ha épp nem látszik funnel) | **1 + görgetés** |
| Főoldal, mobil (felirattal) | burger → Kapcsolat → telefon-kártya | **3** + oldalbetöltés |
| Főoldal, desktop | görgetés a Rólam-blokkig (5–6 képernyő) → „Telefonhívás” | **1 + hosszú görgetés**; fejlécből nem elérhető |
| Szolgáltatás-oldal | hero „Inkább hívnék” | **1** |
| Városi / tartalmi oldal | hero „Hívás: …” | **1** |

### Lead beküldése

| Kiindulás | Út | Interakció |
|---|---|---|
| Főoldal | „Pénzügyi Térkép” → 7–8 kérdés → név + telefon + hozzájárulás → küldés | **~11–12 kattintás + 2 mező** |
| Szolgáltatás-oldal | „Számoljuk ki nálam” → 3 kérdés → kalkulátor „Tovább” → név + telefon + hozzájárulás → küldés | **~7 kattintás + 2 mező** |
| Városi oldal | Térkép a lap alján: görgetés → 7–8 kérdés → form | **~10–11 + görgetés** |
| Kapcsolat oldal | Nincs űrlap. Térkép: 7–8 kérdés → form | **~10–11** |
| Rólam, cikk, tudástár | Nincs form; → Kapcsolat → Térkép … | **12+** |
| Aloldal header „Indítsuk el” | átnavigál a főoldali kvízre | kontextus elveszik |

**Aki csak annyit akar mondani, hogy „hívjon vissza”, sehol nem tudja ezt kevesebb mint 7
kattintással megtenni**, és a kapcsolat oldalon sem talál rövid űrlapot.

---

## 4. Friction pontok

1. **Nincs rövid visszahívás-kérés.** Minden lead-út egy kvízen/kalkulátoron át vezet; a
   „kész vásárló” (aki már tudja, mit akar) felesleges kérdéseket kap.
2. **Főoldali hero**: nincs se hívás, se visszahívás; két „tartalmi” gomb azonos
   vizuális súllyal versenyez.
3. **Header**: telefon nincs; az egyetlen CTA („Indítsuk el”) homályos, és aloldalról elvisz.
4. **Kapcsolat oldal űrlap nélkül** — a „Kapcsolat” menüpont dead-end a form szempontjából.
5. **Mobil sticky sáv**: későn jelenik meg, sokszor el van rejtve, a telefon csak ikon, a
   másik gomb aloldalról elnavigál; nincs safe-area; ütközik a süti-bannerrel.
6. **Form-hibák** csak toastban; a telefon-hibaüzenet nem mutat mintát; nincs fókusz-kezelés.
7. **Hibaállapotból nincs kiút**: nincs telefonszám a hibaüzenetben.
8. **Siker-képernyő**: nincs „Hívás most”, és nem igazolt 24 órás ígéretet tesz.
9. **Dupla beküldés** Enterrel lehetséges; lógó kérésnél nincs timeout.
10. **Szolgáltatás-oldal végén** a CTA („Pénzügyi Térkép”) a főoldalra visz — a témát (pl.
    életbiztosítás) elhagyja; a lead kontextusa elveszik.

## 5. Dead-end oldalak

| Oldal | Vége | Probléma |
|---|---|---|
| `/rolam/` | „Kapcsolódó oldalak” linklista → footer | a bizalomépítő oldal végén nincs CTA |
| `/tudastar/*` cikkek | források + linklista → footer | nincs kontextuális CTA |
| `/tudastar/` | linklista → footer | nincs CTA |
| Városi oldalak | „Tovább innen” linkek → footer | az utolsó CTA a Térkép, fölötte |
| `/kapcsolat/` | Térkép → linklista | nincs rövid form |

## 6. Gyenge / hiányzó CTA-k

- „Indítsuk el” (header) — nem mondja meg, mi történik.
- „Mind a 13 téma” (hero másodlagos) — navigáció, nem konverzió.
- „Megnézem a számokat”, „Számoljuk ki nálam”, „Kezdjük a térképpel” — engagement-CTA-k,
  jók másodlagosnak, de mindenhol ezek az elsődlegesek.
- Hiányzik: header-telefon, header-visszahívás, hero-visszahívás, mobil „Visszahívás”,
  final CTA a tartalmi oldalakon, CTA a siker/hiba állapotban.

## 7. Túl sok választás

- Főoldali hero: 2 azonos súlyú gomb, egyik sem kapcsolatfelvétel.
- Főoldali Rólam-blokk: „Telefonhívás” + „Messenger” azonos súllyal.
- Mobil menü: 7 + 13 link, konverziós gomb nélkül.

## 8. Bizalomhiányos pontok (a CTA közelében)

- A heróban nincs arc / név a gomb mellett (csak a címke fölötte). A portré csak a 4. szekcióban.
- Az MNB-nyilvántartás, a többes ügynöki státusz és a díjazás magyarázata az impresszumban és a
  `/rolam/` oldalon van — a CTA-k mellett nem.
- „24 órán belül visszahívás” — igazolatlan állítás, YMYL-oldalon bizalmi kockázat.
- Valós ügyfélvélemény nincs (`testimonials: []`) — helyesen nem is jelenik meg.

## 9. Mérési hiányosságok

- Nincs esemény: CTA-kattintás, form-megnyitás, form-kezdés, beküldés, siker, hiba.
- Nincs `cta_location` → nem mérhető, melyik gomb termel.
- Nincs UTM-megőrzés → a Google Ads / Facebook kampány nem köthető a leadhez.
- A lead-táblában nincs: melyik város, melyik CTA, melyik landing, milyen hivatkozó oldal.
- A `tel:` kattintás egyáltalán nincs mérve.
