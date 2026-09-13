# CRO teszt-roadmap

Szándékosan **nincs** A/B-tesztelő platform az oldalon (sebesség, adatvédelem, forgalom). Ez a
dokumentum a későbbi tesztek sorrendjét és mérési tervét rögzíti.

## Előfeltételek (e nélkül nem érdemes tesztelni)

1. **Mérés élesítése:** GTM-azonosító a `js/config.js → analytics.gtmId`-ba, GA4 a GTM-ben,
   előtte az adatkezelési tájékoztató és a süti-banner frissítése (`OWNER-DATA-NEEDED.md`).
   Az események már most gyűlnek a `dataLayer`-ben (lista: `CRO-AUDIT-AFTER.md` 6. pont).
2. **Apps Script v4** telepítése — a lead-sorban megjelenik a Kontextus (CTA, oldal, város, UTM).
3. **Minősített lead** visszajelzés: a táblázatba egy „Minősítés” oszlop (pl. *elérhető /
   releváns / ajánlat / szerződés*), amit a tulajdonos hívás után kitölt. Ez az elsődleges
   metrika — a GA4 csak proxy.
4. **Minta.** Egy ilyen forgalmú oldalon heti néhány lead mellett a legtöbb teszt **hónapokig**
   tart statisztikailag. Ezért: egyszerre egy teszt, nagy hatású változás, és előre rögzített
   futási idő (min. 4 hét vagy 100 konverzió variánsonként — amelyik később jön). Kis
   különbségeket (±5%) itt nem lehet kimutatni; csak a nagy hatásúakat érdemes tesztelni.

## Metrikák

| Szint | Metrika | Forrás |
|---|---|---|
| **Elsődleges** | minősített lead / látogató | Sheets „Minősítés” + GA4 munkamenetek |
| Proxy 1 | `lead_form_success` / munkamenet | GA4 |
| Proxy 2 (külön kezelve!) | `cta_call_click` / munkamenet — mikrokonverzió, nem valódi hívás | GA4 |
| Másodlagos | CTA CTR (`cta_callback_click` / oldalmegtekintés), form-start ráta (`lead_form_start` / `lead_form_view`), befejezési ráta (`success` / `start`), lemorzsolódás (`start` − `submit`), validációs hibaarány (`lead_form_error` validation / `submit` kísérlet), szolgáltatás-oldal és városi oldal konverzió (`page_type`, `city` szerint) | GA4 |
| Guardrail | spam arány (Sheets „Spam” lap), elérhetetlen számok aránya, visszafordulás, LCP / CLS / INP (PageSpeed), lead-minőség | Sheets, GA4, PSI |

**Funnel-riport (GA4 Exploration → Funnel):**
`page_view` → `cta_callback_click` → `lead_form_view` → `lead_form_start` → `lead_form_submit`
→ `lead_form_success`, bontva `cta_location`, `page_type`, `device_context` szerint. Ebből
látszik: sokan kattintanak, de nem kezdenek (űrlap ijesztő?), kezdenek, de nem küldenek
(melyik mező?), vagy nem is kattintanak (CTA / ajánlat gyenge).

---

## Tesztek — javasolt sorrend

### 1. Mobil sticky sáv: be / ki (vagy azonnal / görgetés után)
- **Hipotézis:** a mindig elérhető alsó sáv növeli a mobil leadet és a hívás-kattintást,
  mert a látogatónak nem kell visszagörgetnie.
- **Primary:** mobil `lead_form_success` / munkamenet.
- **Secondary:** `cta_call_click` (mobile_sticky), `cta_callback_click` megoszlás
  `cta_location` szerint.
- **Guardrail:** visszafordulás, görgetési mélység, véletlen kattintás jele (modál megnyitás
  után 3 mp-en belüli bezárás: `lead_form_close` gyors aránya).

### 2. Hero headline A/B (főoldal)
- **Hipotézis:** egy „kinek segítek + mit kap” típusú cím (pl. „Nyugdíj, hitel, biztosítás —
  egy emberrel, a te számaiddal”) jobban konvertál, mint a jelenlegi állami-visszatérítés
  horog. **Figyelem:** a H1 SEO-elem — a teszt csak a látható címre vonatkozzon, és ne
  változtassa a `<title>`-t; utána a nyertes kerüljön véglegesen a HTML-be.
- **Primary:** főoldali `cta_callback_click` + `lead_form_success`.
- **Secondary:** Térkép-indítás (`funnel_start`), görgetési mélység.
- **Guardrail:** organikus kattintási arány (Search Console), LCP.

### 3. „Visszahívást kérek” vs. más CTA-szöveg
- Variánsok: „Visszahívást kérek” · „Kérek egy visszahívást” · „Beszéljünk a számaimról”.
  („Beszélek egy szakértővel” csak akkor, ha a szakértő megnevezés igazolt — `OWNER-DATA-NEEDED.md`.)
- **Hipotézis:** a konkrét, énközpontú felirat magasabb CTR-t ad, a lead-minőség rovására nem.
- **Primary:** `cta_callback_click` / oldalmegtekintés. **Secondary:** `lead_form_success`.
- **Guardrail:** minősített lead arány.

### 4. 1 lépés vs. 2 lépés űrlap
- 2 lépés: 1) „Miben segíthetek?” témagombok → 2) név + telefon. Esemény:
  `lead_step_1_complete` (a `bindLeadForm` mellé kell felvenni).
- **Hipotézis:** a téma-választás „könnyű igen”-je növeli a befejezést — VAGY a plusz
  lépés csökkenti. Jelenleg azért 1 lépés, mert kevesebb interakció.
- **Primary:** `lead_form_success` / `lead_form_view`.
- **Secondary:** `lead_form_start` / `lead_form_view`, téma kitöltöttsége.
- **Guardrail:** lead-minőség (a témával érkezők jobban minősülnek?).

### 5. Modál vs. beágyazott űrlap (szolgáltatás-oldalak)
- **Hipotézis:** a hero melletti beágyazott rövid űrlap (a kalkulátor helyett / mellett)
  több leadet hoz, mint a gombra nyíló modál.
- **Primary:** szolgáltatás-oldal `lead_form_success` / munkamenet.
- **Secondary:** kalkulátor-használat (`funnel_start`), funnel-leadek aránya.
- **Guardrail:** LCP / CLS a szolgáltatás-oldalakon, minősített lead.

### 6. CTA sorrend (hívás elöl vs. visszahívás elöl)
- **Hipotézis:** mobilon a „Hívás most” elsődlegessé tétele több valódi beszélgetést hoz
  munkaidőben, de munkaidőn kívül rontja az élményt.
- **Primary:** összes kapcsolatfelvétel (`lead_form_success` + `cta_call_click`), külön
  riportban. **Guardrail:** nem fogadott hívások száma (call tracking nélkül nem mérhető — előtte kell).

### 7. Bizalmi blokk a CTA mellett
- Variánsok: portré + név (jelenlegi) · + MNB-szám · + (ha lesz) valós ügyfélvélemény.
- **Primary:** `cta_callback_click` → `lead_form_success` konverzió.
- **Guardrail:** csak igazolt állítás kerülhet ki (értékelés csak valós, engedélyezett forrásból).

### 8. Űrlap-mezők száma
- Variánsok: jelenlegi (név, telefon, téma, megjegyzés-lenyíló) · téma nélkül · + e-mail.
- **Primary:** `lead_form_success` / `lead_form_start`. **Secondary:** validációs hibaarány.
- **Guardrail:** lead-minőség, elérhetőség (rossz szám aránya).

---

## Nem tesztelünk (dark pattern, tilos)

Hamis visszaszámláló, hamis szűkösség („már csak 2 időpont”), „X ember nézi”, hamis
értesítés, előre bepipált marketing-hozzájárulás, nehezen bezárható modál, exit-intent
felugró, scroll-hijacking, automatikus hívás.
