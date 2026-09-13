# CRO audit — utóállapot (2026-09-14)

Előzmény: [`CRO-AUDIT-BEFORE.md`](CRO-AUDIT-BEFORE.md) · Funnel-térkép:
[`CONVERSION-FUNNEL.md`](CONVERSION-FUNNEL.md) · Tesztterv: [`CRO-TEST-ROADMAP.md`](CRO-TEST-ROADMAP.md) ·
Tulajdonosi teendők: [`OWNER-DATA-NEEDED.md`](OWNER-DATA-NEEDED.md)

---

## 1. Mit találtam (röviden)

- Nem volt rövid visszahívás-kérés: minden lead egy 7–8 lépéses kvízen vagy 4 lépéses
  kalkulátoron át ment. A **kapcsolat oldalon nem volt űrlap**.
- A főoldali heróban nem volt se hívás, se visszahívás; a fejlécben nem volt telefonszám; a
  fejléc-CTA („Indítsuk el”) homályos volt, és aloldalról a főoldalra vitt.
- A mobil sticky sáv későn jelent meg, sokszor el volt rejtve, a telefon csak ikon volt, és
  aloldalról elnavigált.
- Form: hibák csak toastban, a hibaállapotban nem volt telefonszám, Enterrel dupla beküldés,
  nem volt timeout, a siker-képernyőn nem volt „Hívás most”.
- Nulla mérés (nincs GA4/GTM, nincs UTM-megőrzés, a lead nem mutatta, melyik CTA hozta).
- Igazolatlan „24 órán belül visszahívás” ígéret ~25 helyen.

## 2. Mit változtattam — áttekintés

| Terület | Előtte | Utána |
|---|---|---|
| Elsődleges CTA | „Pénzügyi Térkép — 1 perc” (kvíz) | **„Visszahívást kérek”** → azonnal űrlap (modál) |
| Másodlagos CTA | „Mind a 13 téma” / „Inkább hívnék” | **„Hívás most”** (mobil) / „Hívás: +36 20 369 5312” (desktop), `tel:` |
| Kvíz / kalkulátor | elsődleges | harmadlagos szöveges link („Előbb számolnál?”) — megmaradt, nem töröltem |
| Header | 5 link + „Indítsuk el” | 5 link + **telefon** (1280 px felett számmal) + **„Visszahívást kérek”** |
| Mobil menü | csak linkek | legfelül **Visszahívás + Hívás** gomb |
| Mobil sáv | „Pénzügyi Térkép” + telefon-ikon, későn | **„Hívás” + „Visszahívást kérek”**, safe-area, nem ütközik a süti-bannerrel |
| Kapcsolat oldal | nincs űrlap | **beágyazott visszahívás-űrlap** a fejléc alatt (`#visszahivas`) |
| Záró CTA | csak főoldal + szolgáltatás (Térkép felé) | **minden kereskedelmi és tartalmi oldalon** (lime szalag, visszahívás + hívás) |
| Folyamat + bizalom | nem volt a szolgáltatás-oldalakon | **„Mi történik, ha visszahívást kérsz?”** 3 lépés + bizalmi kártya + CTA |
| Mérés | nincs | **dataLayer-eseményrendszer**, GTM consent-kapuval (bekapcsolásra kész) |
| Lead-kontextus | csak URL | **Kontextus**: űrlap, CTA helye, oldaltípus, szolgáltatás, város, landing, hivatkozó, UTM |

## 3. CTA-k — változások

| Hely | Előtte | Utána | `cta_location` |
|---|---|---|---|
| Header (≥860 px) | „Indítsuk el” → `/#terkep` | telefon + „Visszahívást kérek” | `header` |
| Mobil menü | — | „Visszahívást kérek” + „Hívás: …” | `menu` |
| Főoldal hero | „Pénzügyi Térkép — 1 perc” + „Mind a 13 téma” | „Visszahívást kérek” + „Hívás most” + link a Térképre + bizalmi sor | `hero` |
| Főoldal „Négy lépés” | „Kezdjük a térképpel” | CTA-pár | `process` |
| Főoldal Rólam | „Telefonhívás” + „Messenger” | CTA-pár + Messenger / e-mail szöveges link | `about` |
| Főoldal záró | „Pénzügyi Térkép indítása” | CTA-pár + híd a Térképre | `final` |
| Szolgáltatás hero | „Számoljuk ki nálam” + „Inkább hívnék” | CTA-pár (téma előre kijelölve) + link a kalkulátorra, **a tényszámok elé** (hajtás fölé) | `hero` |
| Szolgáltatás „Kinek szól” | „Megnézem a számokat” | CTA-pár | `service_section` |
| Szolgáltatás új blokk | — | „Mi történik…” + bizalmi kártya + CTA-pár | `process` |
| Szolgáltatás záró | „Pénzügyi Térkép” → főoldal | „<Téma>: nézzük meg a te számaiddal.” + CTA-pár + híd | `final` |
| Városi hero | „Pénzügyi Térkép” + „Hívás: …” | CTA-pár + link a Térképre + bizalmi sor | `hero` |
| Városi „Konzultáció menete” | — | CTA-pár | `mid_page` |
| Városi záró | (nem volt) | „Pénzügyi tanácsadás <városban> — kérj visszahívást.” | `final` |
| Pillar, tervezés, hub, rólam | Térkép + „Hívás: …” / csak hívás | CTA-pár + záró CTA | `hero`, `final` |
| Cikkek | „Hívás: …” | kisebb CTA-pár + záró blokk kontextuális híddal | `hero`, `blog` |
| Tudástár | — | záró CTA | `blog` |
| Kapcsolat | „Hívás: …” | CTA-pár (→ az űrlaphoz görget) + beágyazott űrlap | `hero`, `contact_form` |
| 404 | Térkép + 13 téma | CTA-pár + linkek | `404` |
| Űrlap siker | „Többi téma” | „Hívás most: …” (+ funnelnél „Többi téma”) | `form_success` |
| Űrlap hiba | toast | hibadoboz `tel:` linkkel | `form_error` |

**Igazolatlan időígéret eltávolítva** (`callbackPromise` üres → sehol nem jelenik meg):
főoldal hero-meta és záró szalag; városi hero-meta és „Jelentkezés” lépés; `funnel.js`
eredmény- és köszönő szöveg; `build/content/pages.mjs` (pillar folyamat, pillar/tervezés/hub
Térkép-szöveg, hub bevezető és lépés); `build/content/about.mjs` (kapcsolat description, lead,
1. lépés); `build/content/cities.mjs` (8 városi CTA-szöveg, Debrecen description, 2 GYIK-válasz);
`LOCAL-SEO-CHECKLIST.md` Cégprofil-leírás. A mondatok értelme megmaradt (pl. „jellemzően
hétköznap 9 és 19 óra között hívlak” — ez a configban dokumentált elérhetőség).

## 4. Formok — mezők előtte / utána

| Űrlap | Előtte | Utána |
|---|---|---|
| **Visszahívás (új)** — modál + kapcsolat oldal | — | **Név*** · **Telefon*** · Téma (gombcsoport, nem kötelező, kontextusból előre kijelölve) · Megjegyzés (összecsukva) · Hozzájárulás* |
| Funnel-eredmény (Térkép, 13 szolgáltatás) | Név* · Telefon* · E-mail · Megjegyzés · Hozzájárulás* | ugyanaz a mezőkészlet, új viselkedéssel (lent) |

Kötelező: 3 (név, telefon, hozzájárulás) — az adatkezelési tájékoztató szerinti jogalap miatt a
hozzájárulás marad (szövege változatlan). Marketing-hozzájárulás nincs, hírlevél nincs.
E-mail a gyors űrlapon **nincs**: a visszahíváshoz nem kell.

Új űrlap-viselkedés (mindkét típusnál közös kód: `js/lead.js → EP.bindLeadForm`):

- **Telefon:** `type="tel"`, `inputmode="tel"`, `autocomplete="tel"`; elfogad: `+36`, `0036`, `06`,
  `36`, előhívó nélküli mobil, vezetékes (1 + 7, körzet + 6), külföldi `+`/`00` (8–15 jegy).
  Szóköz, kötőjel, pont, zárójel mindegy. A leadbe egységes alakban megy (`+36 20 123 4567`).
  Hibaüzenet mintával. A beírt értéket soha nem töröljük.
- **Validáció:** mező elhagyásakor (csak ha van benne valami); ha a mezőt kattintás hagyja el,
  a hiba a kattintás UTÁN jelenik meg (különben a felugró hiba elcsúsztatta a gombot).
  `aria-invalid`, `aria-describedby`, fókusz az első hibás mezőre.
- **Loading:** gomb `disabled` + `aria-busy`, „Küldés folyamatban…”, `aria-live` állapotsor;
  **dupla beküldés zárolva** (Enter és kattintás is); 15 mp timeout.
- **Hiba:** az adat megmarad, hibadoboz: „Nem sikerült elküldeni az űrlapot… próbáld újra, vagy
  hívj most: +36 20 369 5312” (`tel:` link), a gomb „Újraküldés”, a fókusz a hibadobozra.
- **Siker:** „Köszönöm, megkaptam a kérésed.” + mikor hívok (a dokumentált elérhetőség
  szerint, időígéret nélkül) + **„Hívás most”**. A fókusz a címre kerül.
- **Spam:** honeypot + „valódi felhasználói esemény nélkül nem küld” + 1 mp-es minimum (gyors
  automatikus kitöltésnél kivár, nem dob el) + a meglévő szerveroldali pontozás,
  duplikátum- és óránkénti limit (Apps Script). CAPTCHA nincs, nem is kell.

## 5. Új komponensek

A projekt stackje statikus HTML + saját generátor, ezért a „komponens” itt generátor-függvény
(HTML) + kliens-modul (viselkedés):

| Komponens | Hol | Mit csinál |
|---|---|---|
| `ctaGroup()` (≈ ConversionCTAGroup / CallbackButton / CallButton) | `build/generate.mjs` | Visszahívás + hívás gombpár, `cta_location`-nel. A visszahívás valódi link `…/kapcsolat/#visszahivas`-ra (JS nélkül is működik). |
| `trustLine()` | `build/generate.mjs` | Portré + név + „nem call center, én hívlak vissza” + elérhetőség. |
| `finalCta()` (≈ FinalCTA) | `build/generate.mjs` | Lime záró szalag: címsor, 1 mondat, CTA-pár, opcionális híd, bizalmi sor. |
| `processTrust()` | `build/generate.mjs` | „Mi történik, ha visszahívást kérsz?” 3 lépés + bizalmi kártya (név, e.v., OVB többes ügynök, MNB-szám, ellenőrzés link, díjazás) + CTA. |
| `stickyCta()` → `.mbar` (≈ MobileConversionBar) | generátor + `js/quick-lead.js` + `css/cro.css` | Mobil alsó sáv. |
| QuickLeadForm | `js/quick-lead.js → mount()` | Rövid űrlap bármely konténerbe. |
| QuickLeadModal | `js/quick-lead.js → open()` | Natív `<dialog>`: háttér inert, Escape, fókusz-visszaadás, telefonon alsó panel, billentyűzet-követés (visualViewport). Első kattintáskor jön létre — nincs UI-könyvtár. |
| `EP.bindLeadForm` | `js/lead.js` | Közös validáció, küldés, állapotok — a funnelek is ezt használják. |
| `EP.track` / `EP.context` | `js/core/track.js` | Mérés, kontextus, UTM, GTM consent-kapu. |
| Apps Script v4 | `docs/apps-script.gs` | Kontextus oszlop + „Honnan:” sor az e-mailben. |
| CRO QA | `build/cro-check.mjs` | Egységtesztek + statikus konverziós ellenőrzés minden oldalon. |

## 6. Analitika — események

Minden esemény a `window.dataLayer`-be kerül (GTM innen olvassa; ha `gtag` létezik, oda is).
**PII soha** (név, telefon, e-mail, üzenet — a `track()` kiszűri, a QA teszteli).

| Esemény | Mikor | Fő paraméterek |
|---|---|---|
| `cta_call_click` | bármely `tel:` link (header, hero, sáv, footer, űrlap…) — **mikrokonverzió** | `cta_location` |
| `cta_callback_click` | bármely „Visszahívást kérek” | `cta_location`, `service` |
| `lead_form_view` | modál megnyílik / beágyazott űrlap a képbe ér / funnel-eredmény megjelenik | `form_type`, `cta_location` |
| `lead_form_start` | első gépelés egy mezőben | `form_type` |
| `lead_form_submit` | érvényes beküldés | `form_type`, `topic` |
| `lead_form_success` | a kérés kiment | `form_type`, `topic`, `cta_location` |
| `lead_form_error` | `error_type`: `validation` (+`error_fields`: mezőnevek, nem értékek) · `network` · `offline` | |
| `lead_form_close` | a modál beküldés nélkül bezárult | `cta_location` |
| `funnel_start` | az első válasz a Térképen / szolgáltatás-funnelben | `form_type` |

Minden eseményben: `page_path`, `page_title`, `page_type`, `service`, `city`,
`device_context` (mobile/tablet/desktop), `landing_page`, `referrer_host` (csak domain),
`utm_source`, `utm_medium`, `utm_campaign`, `utm_content`, `utm_term`.

`form_type`: `quick_modal` · `quick_inline` · `funnel_service` · `funnel_map`.
`cta_location`: `header` · `menu` · `hero` · `mid_page` · `service_section` · `process` ·
`about` · `final` · `blog` · `mobile_sticky` · `contact_form` · `funnel` · `form` ·
`form_success` · `form_error` · `footer` · `404` · `content`.

`lead_step_1_complete` nincs: az űrlap egylépéses (indoklás: 8. pont). A 2 lépéses teszthez
kell majd felvenni (`CRO-TEST-ROADMAP.md` 4.).

**Bekapcsolás:** `js/config.js → analytics.gtmId`. Üresen: nincs külső script, nincs süti,
a CSP változatlan. Kitöltve: a GTM csak a süti-banner „Rendben” gombja után töltődik be
(Consent Mode v2 alapértelmezés: minden tiltva), a generátor a CSP-be felveszi a
Google-domaineket. Előtte jogi frissítés kell (`OWNER-DATA-NEEDED.md` 5.2).

**Hibakeresés:** `?ep_debug=1` az URL-ben → minden esemény a konzolba is kiíródik.

## 7. Mobil változások

- Első képernyő: H1 + lead + teljes szélességű „Visszahívást kérek” + „Hívás most”.
- Alsó konverziós sáv: „Hívás” + „Visszahívást kérek” (360 px alatt „Visszahívás”); akkor
  látszik, ha a hero CTA nincs a képben — így a Rólam oldalon (portré a fejlécben) és 320 px-en
  is az első képernyőtől van CTA. Rejtve, ha funnel-léptető / beágyazott űrlap van a képben vagy
  mezőbe gépelnek. 48 px magas gombok, safe-area, `aria-hidden` + `tabindex` rejtett állapotban.
- A lábléc alja fenntartja a sáv helyét (nincs kitakart link, nincs layout-ugrás).
- Süti-banner: a sáv fölé kerül; a két gombja egy sorban (≈70 px-szel alacsonyabb).
- Modál telefonon alsó panel; a billentyűzet magasságát követi; a mező a látható részbe gördül;
  a fókusz a címre kerül (a billentyűzet nem ugrik fel azonnal).
- Témagombok kompaktabbak; a két kötelező mező az űrlap tetején.
- `viewport-fit=cover` + safe-area a szélső tartalomra és a fejlécre (notch).

## 8. Desktop változások

- Fejléc: telefon (≥1280 px szám, alatta ikon) + „Visszahívást kérek”; 1024–1279 px-en a
  menüpontok közti hézag szűkebb, hogy minden kiférjen.
- „Hívás: +36 20 369 5312” a gombokon — desktopról sokan a telefonjukon tárcsázzák.
- Modál max. 560 px, középen, blur-háttér (csak ≥1024 px), a mezők egymás alatt.
- A szolgáltatás-heróban a CTA a tényszámok elé került (1366×800-on a hajtás fölött).
- Alacsony ablakban (≤920 px) a „Görgess” jel elrejtve (rácsúszott a bizalmi sorra).

**Miért egylépéses az űrlap (11. pont):** a látogatónak 2 kötelező mezőt kell kitöltenie; a téma
nem kötelező és a legtöbb oldalon előre ki van jelölve. Egy második lépés csak plusz
interakció lenne. A 2 lépéses változat a teszt-roadmapben van.

## 9. SEO — mit NEM rontottam el

- URL, title, meta description (kivéve: kapcsolat és Debrecen description — csak az igazolatlan
  „24 órán belül” rész cserélődött), H1, canonical, schema, sitemap: változatlan.
- A városi oldalak megmaradtak; a doorway-hasonlóság 17,2% / 19,6% (átlag / max) → 19,7% / 22,4%
  (a határ 50%). A záró CTA a városnevet tartalmazza.
- A fő SEO-tartalom nem került modálba; a modál a kliensben jön létre.
- `node build/seo-check.mjs`: **OK, 0 hiba, 0 figyelmeztetés.**
- CLS mérés (Playwright, 375 px, betöltés + görgetés): 0 – 0,0007.
- Csomagméret (gzip): `app.js` +7,7 kB (51,4 → 59,1 kB, defer), `site.css` +1,7 kB. Új külső
  script, UI-könyvtár, betűtípus: nincs. Új kép: `assets/brand/avatar.webp` (3 kB).

## 10. Build / teszt

| Parancs | Eredmény |
|---|---|
| `node build/generate.mjs` | OK — 32 indexelhető oldal + 404 |
| `node build/seo-check.mjs` | OK — 0 hiba |
| `node build/cro-check.mjs` (új) | OK — 33 oldal, 673 ellenőrzés (telefon-validáció 23 eset, név/e-mail, PII-szűrés, tel-linkek, CTA-k, záró CTA, kontextus-attribútumok, beágyazott űrlap, tiltott ígéretek, mérési események, titok-mintázat) |
| Negatív teszt | szándékosan elrontott `tel:` link és „24 órán belül” → a QA hibát jelez (nem hamis zöld) |
| `node --check` | minden JS-forrás és a csomag |
| Lint / typecheck / unit / e2e keretrendszer | **nincs a projektben** (nincs npm) — helyette a fenti QA-szkriptek és Playwright |

Böngészős teszt (Playwright, Chromium, az Apps Script végpontot elfogva — **éles lead nem ment ki**):

- 33 oldal × 320 / 375 / 390 / 430 / 768 / 1024 / 1366 px: nincs vízszintes túlcsordulás, nincs
  levágott gombfelirat, minden `tel:` a config számára mutat, nincs JS-hiba.
- Header-telefon, hero CTA, mobil sáv (megjelenés, elrejtés funnelnél, süti-offset, lábléc-hely),
  mobil menü → modál, modál (nyitás, fókusz, Tab-körforgás, Escape, fókusz-visszaadás,
  scroll-pozíció megmarad), validáció (hibás szám, hiányzó hozzájárulás), hibaállapot
  (elérhetetlen végpont), siker, **háromszoros Enter → 1 kérés**, kapcsolat oldal (CTA →
  görgetés + fókusz), szolgáltatás-funnel végig (hibás, majd külföldi szám → siker),
  UTM-megőrzés oldalváltáson át, városi kontextus a leadben.
- Megjegyzés: a natív `<dialog>` a Tab-körforgásban a böngésző saját felületére is enged
  (szabványos viselkedés); az oldal többi része közben inert, oda fókusz nem jut.

## 11. Manuális teendők

1. **Apps Script v4 telepítése** (`docs/google-sheets-setup.md`) — P0.
2. **Élesítés:** `node build/generate.mjs && node build/seo-check.mjs && node build/cro-check.mjs`,
   majd commit + push (a GitHub Pages ebből frissül).
3. Próba-lead élesben a mobil sávból és a kapcsolat oldalról; ellenőrizd a táblázatot és az e-mailt.
4. Döntés a 24 órás ígéretről → `contact.callbackPromise`.
5. GTM + GA4 — **csak** az adatkezelési tájékoztató és a süti-banner jogi frissítése után.
6. GA4-ben: az események konverzióként jelölése (`lead_form_success` elsődleges,
   `cta_call_click` külön, mikrokonverzióként); Funnel Exploration a 6. pont szerint.
7. Search Console: az új oldalszerkezet miatt nincs teendő (URL-ek nem változtak).

## 12. Tulajdonostól bekérendő adatok

Részletesen: [`OWNER-DATA-NEEDED.md`](OWNER-DATA-NEEDED.md) — válaszidő, saját MNB-szám,
képesítés, vélemények, személyes találkozási helyek, lead-címzett, GA4 + jogi szöveg.

## 13. A/B tesztek később

[`CRO-TEST-ROADMAP.md`](CRO-TEST-ROADMAP.md) — első: **mobil sticky sáv** (a legnagyobb forgalmi
szegmens, a legkisebb kockázat), utána hero headline, CTA-szöveg, 1 vs. 2 lépés.
