# Tulajdonostól bekérendő adatok és döntések

A CRO-munka során **semmilyen üzleti állítást nem találtam ki**. Ami nincs igazolva, az nem jelenik
meg — vagy ki van kapcsolva, és egy config-sorral bekapcsolható. Az alábbiak mindegyikéhez a
tulajdonos (Tímár Richárd) válasza kell.

Jelmagyarázat: **P0** = a konverziót vagy a jogszerűséget közvetlenül érinti · P1 = fontos · P2 = jó, ha van.

---

## 1. Elérhetőség és válaszidő

| # | Kérdés | Most az oldalon | Hol kell beírni | Súly |
|---|---|---|---|---|
| 1.1 | **Vállalod-e a „24 órán belüli visszahívást” minden esetben** (hétvégén, ünnepnap, szabadság alatt)? | Időígéret **kikapcsolva**. A korábbi ~25 „24 órán belül” előfordulást semleges szövegre cseréltem (lista: `CRO-AUDIT-AFTER.md` 3. pont). | `js/config.js → contact.callbackPromise` (pl. `"24 órán belül"`) → a hero bizalmi sora, a modál siker-képernyője, a funnel köszönő képernyője, a „Mi történik” lépések és a városi folyamat magától megjeleníti. | **P0** |
| 1.2 | A telefonszám (`+36 20 369 5312`) a végleges, hívásfogadásra használt szám? | Ez szerepel mindenhol (egy helyről: `config.js`). | `contact.phone`, `contact.phoneHref` | P0 |
| 1.3 | Tényleges elérhetőség: marad a „Hétfő–péntek 9:00–19:00, szombaton egyeztetés szerint”? | Igen; a CTA-k mellett rövidítve: „hétköznap 9–19 óra”. | `contact.hours`, `contact.hoursShort` | P1 |
| 1.4 | Munkaidőn kívül: hangposta / visszahívás / SMS? Mit tapasztal, aki este 21-kor hív? | Nincs róla szöveg. | — (ha van hangposta, a hívás-CTA mellé kiírható) | P1 |

## 2. A lead útja

| # | Kérdés | Megjegyzés | Súly |
|---|---|---|---|
| 2.1 | **Telepítsd az Apps Script v4-et** (`docs/apps-script.gs`, „Telepítés kezelése → szerkesztés → új verzió” — az URL nem változik). | Enélkül a funnel-leadeknél nem látszik a Kontextus (CTA, város, UTM). A visszahívás-kéréseknél a *Válaszok* oszlopba addig is bekerül. Útmutató: `docs/google-sheets-setup.md`. | **P0** |
| 2.2 | Élesítés után küldj be egy próba-visszahívást a **mobil sávból** és a **kapcsolat oldalról**, és nézd meg a táblázatot + e-mailt. | Localhoston csak elfogott (nem valódi) kéréssel teszteltem — éles leadet nem küldtem a táblázatodba. | **P0** |
| 2.3 | Ki kapja a lead-értesítést? Most: `timar.richard2@ovb.hu`. Kell második címzett / SMS / push? | `docs/apps-script.gs → NOTIFY_EMAIL` | P1 |
| 2.4 | Kapjon-e a leadet kérő automatikus visszaigazoló e-mailt? (Csak ha az e-mail címet is kérjük — most a gyors űrlap NEM kéri.) | Ehhez e-mail mező és jóváhagyott szöveg kell. | P2 |

## 3. Bizalmi jelek (csak igazolt adattal)

| # | Adat | Hol használnánk | Súly |
|---|---|---|---|
| 3.1 | **Saját (természetes személy) MNB-nyilvántartási szám**, ha van | bizalmi kártya a CTA mellett, `/rolam/`, impresszum. Most csak az OVB társasági száma szerepel. | P1 |
| 3.2 | Szakmai képesítés / hatósági vizsga, megszerzés éve | bizalmi kártya, `/rolam/`, schema `hasCredential` | P1 |
| 3.3 | Mióta dolgozol pénzügyi közvetítésben (év) | bizalmi kártya | P2 |
| 3.4 | **Valós ügyfélvélemények** írásos hozzájárulással (név vagy monogram, város, téma) | `config.js → testimonials` (üresen a blokk nem jelenik meg) | P1 |
| 3.5 | Értékelési platform (Google Cégprofil véleményei) linkje, ha lesz | CTA melletti bizalmi sor | P2 |
| 3.6 | Használható-e a **„szakértő”** megnevezés („Beszélek egy szakértővel” CTA-teszthez)? | Most nem használjuk. | P2 |
| 3.7 | OVB-jóváhagyás kell-e a CTA-szövegekhez és a „díjmentes” kommunikációhoz? | A „díjmentes / 0 Ft tanácsadási díj” az impresszumban és a `/rolam/` oldalon dokumentált — ezért maradt. | P1 |

## 4. Szolgáltatás, terület

| # | Kérdés | Most | Súly |
|---|---|---|---|
| 4.1 | Hol lehet **személyesen** találkozni Budapesten kívül (pl. Győr / Abda környéke)? | Csak Budapest (`cities.mjs → inPerson`). | P1 |
| 4.2 | Online konzultáció: telefon, videó (milyen platform), e-mail — mind rendben? | A szövegek: telefon, videóhívás, e-mail. | P2 |
| 4.3 | A 13 szolgáltatás mindegyikét aktívan viszed? (A visszahívás-űrlap témái ezekből jönnek.) | 6 témacsoport a 13 szolgáltatásból + „Teljes pénzügyi átnézés”. | P1 |
| 4.4 | Milyen témákban **nem** tudsz segíteni (hogy a lead ne legyen irreleváns)? | — | P2 |

## 5. Mérés és jog

| # | Teendő | Súly |
|---|---|---|
| 5.1 | **GTM-fiók + GA4** létrehozása, a `GTM-XXXXXXX` azonosító a `js/config.js → analytics.gtmId`-ba. A generátor ekkor a CSP-be is felveszi a Google-domaineket, és a GTM **csak a süti-bannerben adott hozzájárulás után** töltődik be. | P1 |
| 5.2 | **ELŐTTE jogi frissítés:** az adatkezelési tájékoztató 5–6. pontja most azt mondja, hogy nincs harmadik fél és mérési süti. GA4 bekapcsolása előtt ezt (és a süti-banner szövegét, a „Rendben” gomb jelentését) jogi szakértővel frissíteni kell. **Jogi szöveget nem írtam.** | **P0 (GA4 előtt)** |
| 5.3 | Az adatkezelési tájékoztató 2. és 6. pontját **tényszerűen kiegészítettem** (a lead mellé mentett forrás-adat: melyik gomb, első oldal, hivatkozó domain, UTM; sessionStorage a fül bezárásáig). Kérlek, nézesd át jogi szakértővel. | P0 |
| 5.4 | Call tracking (dinamikus számcsere) kell-e? Addig a `tel:` kattintás csak mikrokonverzió. Ha lesz: új szám, új szolgáltató, új adatkezelési pont. | P2 |
| 5.5 | Meta Pixel / Google Ads konverziókövetés — csak consenttel, jogi frissítés után. Most nincs. | P2 |

## 6. Gyors döntések (igen / nem)

- [ ] 24 órás visszahívás vállalható? → ha igen: `callbackPromise: "24 órán belül"`
- [ ] Apps Script v4 telepítve
- [ ] Próba-lead élesben rendben (mobil sáv + kapcsolat oldal)
- [ ] GTM azonosító + jogi szöveg (együtt!)
- [ ] Saját MNB-szám / képesítés megadva
- [ ] Valós vélemények begyűjtése elindult
