# Források — a weboldalon szereplő 2026-os számok

Az oldalon minden konkrét szám ellenőrizhető forrásból származik. **Jogszabály-változás esetén
ezeket kell frissíteni**, egy helyen: `js/data/services.js` (a fájl tetején lévő konstansok +
az egyes szolgáltatások `facts`, `how` és `calc` blokkjai).

Utolsó ellenőrzés: **2026. augusztus**.

---

## Központi konstansok (`js/data/services.js` teteje)

| Konstans | Érték | Mit jelent |
|---|---|---|
| `MINWAGE_2026` | 322 800 Ft | havi bruttó minimálbér 2026-ban |
| `MAX_PENSION_INS` | 130 000 Ft | nyugdíjbiztosítás max. éves adójóváírás |
| `MAX_PENSION_FUND` | 150 000 Ft | önkéntes nyugdíjpénztár max. éves adójóváírás |
| `MAX_NYESZ` | 100 000 Ft | NYESZ max. éves adójóváírás |
| `MAX_PENSION_TOTAL` | 280 000 Ft | a három nyugdíjforma **együttes** felső korlátja (Szja tv. 44/A–44/C. §) |
| `MAX_HEALTH_FUND` | 150 000 Ft | egészség-/önsegélyező pénztár max. éves adójóváírás |
| `HOUSING_MONTHLY_CAP` | 48 420 Ft | minimálbér 15%-a — havi max. lakáshitel-törlesztés pénztárból |
| `OTTHON_START_RATE` | 3% | Otthon Start fix kamat |
| `OTTHON_START_MAX` | 50 000 000 Ft | Otthon Start max. hitelösszeg |

---

## Témánkénti források

**Nyugdíjcélú megtakarítások, 20% adójóváírás**
- <https://grantis.hu/nyugdijbiztositas-adokedvezmeny/>
- <https://nyugdijmaskeppen.hu/nyugdijbiztositas-adokedvezmeny/>
- <https://nyugdijmaskeppen.hu/nyesz-adokedvezmeny/>
- <https://www.signal.hu/hu/tematikus-hirek/nyugdijbiztositas-20-szazalek-adojovairas-maximalizalasa>

**Egészség- és önsegélyező pénztár (gyerek- és női kiadások, 20%)**
- <https://tudastar.money.hu/ismerteto/szja-adokedvezmeny-adojovairas/>
- <https://biztosdontes.hu/cikkek/iskolakezdesi-tamogatas>
- <https://banknavigator.hu/egeszsegpenztar>

**Lakáshitel-törlesztés önsegélyező pénztárból (20%)**
- <https://tudastar.money.hu/ismerteto/onsegelyezo-penztar-lakashitel-torlesztes/>
- <https://bank360.hu/blog/lakashitel-torlesztoreszlet-csokkentese-nyugdijpenztar-egeszsegpenztar->

**Otthon Start / támogatott hitelek**
- <https://www.portfolio.hu/bank/20260114/otthon-start-2026-a-3-os-lakashitel-feltetelei-reszletei-tudnivaloi-egy-helyen-811005>
- <https://net.jogtar.hu/jogszabaly?docid=a2500227.kor> — 227/2025. (VII. 31.) Korm. rendelet
- <https://tudastar.money.hu/ismerteto/otthon-start-hitel-feltetelei-3-szazalek-lakashitel/>

**Gyerek-megtakarítás**
- Az oldal **szándékosan nem foglalkozik a Babakötvénnyel és a Start-számlával**, ezért
  a korábbi állami induló összeg (42 500 Ft), az évi 10% / max. 12 000 Ft állami támogatás
  és a 7,4%-os babakötvény-kamat kikerült a kalkulátorból és a szövegekből.
- A számítás alapja most a `PROGRAM_COEF` költséggörbe (lásd lent).

**Rendszeres díjas megtakarítási program — valós költséggörbe (`PROGRAM_COEF`)**
- Forrás: a saját tanácsadói eszköz, `hitelfedezeti_tanacsadoi_eszkoz_v8.2.html` →
  „Okoshitel” modul, `COEF8` / `COEF9` sorok. Azok a „Másolat - Hitelkalkulátor 2024.xlsx”
  rejtett *Öngondoskodási terv* lapjáról vannak visszafejtve.
- Tartalom: 25 000 Ft/hó befizetés mellett a felhalmozott érték az 1–24. év végén,
  **már levonva** a kezdeti egység-, adminisztrációs és alapkezelési költséget, és
  **hozzáadva** a hűségbónuszokat (látható ugrás a 10., 15. és 20. évnél).
- Hozamszintek: **csak 8% és 9%** — a forrás sem definiál mást. Ezért kínálnak a
  kalkulátorok is csak ezt a két sávot; ez tudatos korlát, nem hiányosság.
- A görbe a havi díjban lineáris, ezért tetszőleges összegre átskálázható, és a
  „célösszeg → havi díj” irány pontosan invertálható (`programMonthlyFor`).
- **Eltérés a forrástól:** a 24. év után a forrás-eszköz lineáris növekménnyel
  (`INCR`) folytatja. Az egy hitel-végtörlesztésre jó közelítés, de egy 30–40 éves
  nyugdíjtávot drasztikusan alábecsülne. Itt ehelyett a görbe utolsó teljes évéből
  adódó nettó rátával kamatozik tovább (8%-os görbe → ~7,03%, 9%-os → ~7,98%).
  Ez a görbe kiterjesztése, nem forrásadat — a kalkulátorok jegyzete ki is mondja.
- Hol használjuk: `gyerek-megtakaritas`, `nyugdij-megtakaritas`,
  `szabad-felhasznalasu-megtakaritas` (program-módban).
- A `szabad-felhasznalasu-megtakaritas` betét-módjának 6%-a **feltételezés**, nem
  konkrét banki ajánlat.

**KGFB / casco**
- <https://grantis.hu/kotelezo-biztositas-valtas/>
- <https://grantis.hu/kotelezo-biztositas/>
- 2009. évi LXII. törvény 21. § — a felmondásnak az évfordulót megelőző **30. napig** be kell érkeznie
- 21/2011. (VI. 10.) NGM rendelet — a **bónusz-malusz fokozatok** (A00, B01–B10, M01–M04) és
  a köztük való átsorolás szabályai. **A fokozathoz tartozó kedvezmény/pótlék MÉRTÉKE nem itt
  van, hanem a biztosító tarifájában** — ezért a kalkulátor csak a besorolást és annak irányát
  írja ki, százalékot nem. (Egy korábbi verzió „B4 → 20% kedvezmény” formában közölte,
  jogszabályi tényként — ez félrevezető volt, javítva.)
- <https://kgfb.ovb.hu/> — az OVB saját KGFB/casco ajánlatkérője (ez a minta arra, milyen
  adatokat kell bekérni: jármű, üzembentartó, bónuszfokozat, évforduló)

**Magán egészségbiztosítás**
- <https://grantis.hu/magan-egeszsegbiztositas/>
- <https://www.biztositasszakerto.com/egeszsegbiztositasok/magan-egeszsegbiztositas/>
- <https://nav.gov.hu/pfile/file?path=/ugyfeliranytu/nezzen-utana/inf_fuz/2026/49.-A-szocialis-hozzajarulasi-ado-2026.-01.-16>
  — szocho 2026: **13%**, egyes meghatározott juttatásnál az adóalap a juttatás **1,18-szorosa**
  (tehát 15% szja + 13% szocho az 1,18-szoros alapon). **Korábban 15,5% szocho szerepelt az
  oldalon — ez hibás volt, javítva.**

**Díjmentes bankszámla**
- <https://tudastar.money.hu/ismerteto/ingyenes-bankszamlak/>
- <https://bank360.hu/bankszamla>

**Adójogi háttér (családi kedvezmény, anyák szja-mentessége)**
- <https://www.pwc.com/hu/hu/sajtoszoba/2026/szja_kedvezmenyek_2026.html>
- <https://nav.gov.hu/ado/szja/Ket_gyermeket_nevelo_anyak_kedvezmenye>

**Közvetítői szabályozás, MNB**
- <https://www.mnb.hu/felugyelet/adatszolgaltatas/alkuszok-es-tobbes-ugynokok>
- <https://apps.mnb.hu/regiszter/>

---

## Frissítési emlékeztető

Évente **január elején** érdemes átnézni:

1. minimálbér → ezzel változik a `HOUSING_MONTHLY_CAP` és az iskolakezdési keret,
2. adójóváírási plafonok,
3. Otthon Start (vagy az azt felváltó program) feltételei,
4. magán egészségbiztosítás adóterhelése,
5. a `PROGRAM_COEF` költséggörbe — ha a tanácsadói eszközben frissül a
   `COEF8` / `COEF9` sor, ide is át kell vezetni.

Módosítás után futtasd újra a generátort:

```bash
node build/generate.mjs
```

---

## A főoldali stat blokk forrásai (js/config.js → stats)

Szándékosan **nem ügyfélszámok**, hanem jogszabályból adódó 2026-os maximumok — ezek
ellenőrizhetők, és nem kell hozzájuk igazolás. Ha lesz igazolható saját adatod
(ügyfélszám, átlagos elért megtakarítás), akkor cserélhető.

| Adat | Mi ez |
|---|---|
| 280 000 Ft | max. éves adójóváírás nyugdíjcélra, a három forma kombinálásával |
| 150 000 Ft | max. éves adójóváírás egészség-/önsegélyező pénztári befizetésre |
| 3% | Otthon Start fix kamat 25 évre |
| 13 | a lefedett pénzügyi területek száma |

---

## A kalkulátorok tervezési elve (OVB-hez igazítva)

Az OVB tényleges önkiszolgáló eszközei: a **KGFB/casco ajánlatkérő** (<https://kgfb.ovb.hu/>,
konkrét jármű- és üzembentartó-adatokat kér, és valós biztosítói díjakat ad vissza), valamint
a **bankszámla-díj összehasonlítás** a bank saját Díjkimutatása alapján
(<https://online.ovb.hu/bankszamladijkimutatas/>). Minden más témát „elemző beszélgetés”
formájában visz — nincs rá online kalkulátor.

Ezt követi az oldal is. Két szabály:

1. **Nem gyártunk piaci átlagokat.** Kikerült a KGFB „tipikus díjkülönbség a piacon:
   15/25/35%” csúszkája: nem lehet előre megmondani, mennyivel lesz máshol kedvezőbb.
   Helyette a kalkulátor azt számolja, ami tényszerű: a **felmondási határidőt**
   (évforduló − 30 nap) és a **bónuszfokozat** jogszabályi kedvezményét.
2. **Ami számítható, azt jogszabályból számítjuk**, és a limitet is kiírjuk: adójóváírási
   plafonok, a befizetett szja korlátja, annuitás, Otthon Start jogosultsági korlátok
   (100 M Ft vételár, 1,5 M Ft/m², 10% saját erő, 50 M Ft / 25 év).

### Amit ellenőrizhetetlenként kivettünk az oldalról

| Korábbi állítás | Miért ment ki | Mi lett helyette |
|---|---|---|
| „63% a magyarok ennyi része használ már privát ellátást (2020: 44%)” | nem találtam hozzá elsődleges forrást | „TB + magán — a magánellátás a TB mellé jön” |
| „15% szja + 15,5% szocho” | a szocho 2026-ban 13%, és az adóalap 1,18× | „1,18 × 28%”, a NAV füzetére hivatkozva |
| „díjkülönbség: 20–40%” (KGFB metrika) | piaci átlagígéret szabályozott termékre | „30 nap az évfordulóig” (törvényi határidő) |
| „B4 → 20% kedvezmény” | a % a biztosító tarifájából jön, nem jogszabályból | „B4 — 4 kármentes év → kedvezmény”, % nélkül |
| „évi 30–60 ezer Ft” (bankszámla metrika) | megtakarítás-ígéret | „0 Ft számlavezetés is van” |
| „2–3× ennyi különbség lehet a THM-ek között” | nem alátámasztott | „THM — ez az egyetlen összehasonlítható szám” |
| „10+ bank ajánlata” | a partnerlista változik | „több bank” |
| „0 nap várakozási idő — 2025 júliusa óta megszűnt” | pénztáronként különböző, nem általános | „a várakozási időt a pénztár szabályzata rögzíti” |
| „havi pár ezer forint” (baleset metrika) | árígéret | „a táppénz nem a teljes bér” |

## A közvetítői státusz forrásai (impresszum)

| Adat | Forrás |
|---|---|
| OVB Vermögensberatung Kft., 1138 Budapest, Váci út 140., Cg. 01-09-724845, adószám 13231796-2-41 | <https://www.ovb.hu/szerviz/impresszum.html> |
| Az MNB nyilvántartásában **többes ügynök** (nem alkusz) | <https://intezmenykereso.mnb.hu/>, OVB tanácsadói ügyféltájékoztatók |
| Panaszkezelési rend | <https://www.ovb.hu/szerviz/panaszkezeles.html> |

> **Fontos:** a „független biztosításközvetítő / alkusz” megnevezés jogilag más kategória.
> Többes ügynökként közvetítve ezt a szót nem használjuk az oldalon — helyette
> „több partnerbiztosító ajánlatának összehasonlítása” szerepel.

---

## 3D assetek (Blender)

| Fájl | Mi ez | Méret |
|---|---|---|
| `assets/3d/ep-arrow.glb` | a logó nyila 3D-ben: három kúposított tubus + gömb csúcs, voxel remesh unióval egy testté olvasztva, majd decimálva | 119 kB / 6 040 poly |
| `assets/3d/ep-icons.glb` | 13 lowpoly téma-ikon (`ico-house`, `ico-coin`, `ico-car`, `ico-shield`, `ico-heart`, `ico-cross`, `ico-gift`, `ico-piggy`, `ico-family`, `ico-key`, `ico-bank`, `ico-wallet`, `ico-card`) | 110 kB / 915 poly |
| `assets/img/icons/<slug>.png` | ugyanezek ortografikus 3/4-es nézetből kirenderelve, átlátszó háttérrel | 13 × ~25 kB |
| `assets/img/arrow-hero.png` | a nyíl renderelt változata: hero-fallback mobilon és OG-kép | 222 kB |

Az ikon → szolgáltatás megfeleltetés a renderelt PNG-k fájlnevében van (slug szerint).
Ha új szolgáltatás kerül be, ahhoz új ikon-render is kell, különben a kártyán üres hely lesz.
