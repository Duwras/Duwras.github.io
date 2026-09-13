# Tartalmi roadmap — 2026. október – 2027. március

Cél: topical authority a **pénzügyi tanácsadás** és a **pénzügyi tervezés** témában, a
szolgáltatás-oldalak (13 téma) köré építve. Minden cikk:

- a meglévő szolgáltatási profilhoz tartozik (nincs kitalált szolgáltatás);
- egy kereskedelmi céloldalra linkel (pillar, tervezés vagy szolgáltatás-oldal), és a céloldal
  visszalinkel rá (a `services` mező a `build/content/articles.mjs`-ben ezt automatikusan
  megcsinálja a szolgáltatás-oldalakon);
- valós szerzővel (Tímár Richárd), dátummal, ellenőrizhető (MNB, NAV, Jogtár) forrással készül;
- nem duplikál meglévő oldalt — a szolgáltatás-oldalak már részletes útmutatók, ezért a cikk
  mindig egy **szűkebb kérdést** válaszol meg, és onnan küld tovább.

Ütem: **havi 2 cikk** (minőség > mennyiség). A sorrendet a Search Console „Teljesítmény”
adatai felülírhatják: amire az oldal már a 8–20. helyen megjelenik, az előre kerül.

**Új cikk felvétele:** új objektum a `build/content/articles.mjs → ARTICLES` tömbbe,
`node build/generate.mjs`, `node build/seo-check.mjs`. A sitemap, a tudástár-lista, a
schema és a visszalinkek automatikusan frissülnek.

---

## Klaszterek

| # | Klaszter | Pillér / céloldal | Meglévő tartalom |
|---|---|---|---|
| A | Pénzügyi tanácsadás, bizalom | `/penzugyi-tanacsadas/` | pillar, tanácsadó-ellenőrzés cikk, rólam |
| B | Pénzügyi tervezés, költségvetés | `/penzugyi-tervezes/` | tervezés oldal, költségvetés + vésztartalék cikk |
| C | Lakás és hitel | `/szolgaltatas/tamogatott-hitelek.html`, `/piaci-hitelek.html` | 3 szolgáltatás-oldal |
| D | Nyugdíj és adójóváírás | `/szolgaltatas/nyugdij-megtakaritas.html` | 3 szolgáltatás-oldal |
| E | Biztosítás | élet-, baleset-, egészség-, KGFB-oldal | 4 szolgáltatás-oldal |
| F | Családi pénzügyek | gyerek-megtakarítás, egészségpénztár | 2 szolgáltatás-oldal |

---

## Havi terv

### 2026. október — a bizalmi klaszter lezárása
| Cikk (munkacím) | Célkulcsszó | Klaszter | Link → céloldal | Források |
|---|---|---|---|---|
| THM, TKM, pénztári költség — így hasonlíts össze pénzügyi termékeket | THM jelentése, TKM mutató | A | pillar (#koltsegek), piaci hitelek, nyugdíj | MNB fogyasztóvédelem, MNB hitel-lízing |
| Az első találkozó a pénzügyi tanácsadóval: 12 kérdés, amit tegyél fel | pénzügyi tanácsadó kérdések | A | pillar, kapcsolat | MNB Pénzügyi Navigátor |

### 2026. november — tervezés (KD 16-os lehetőség kihasználása)
| Cikk | Célkulcsszó | Klaszter | Link → | Források |
|---|---|---|---|---|
| Pénzügyi célok kitűzése: rövid, közép- és hosszú táv számokkal | pénzügyi célok | B | tervezés, szabad megtakarítás | MNB pénzügyi tervezés |
| Közös vagy külön kassza? Pénzügyi tervezés párkapcsolatban | közös kassza, pénzügyek párkapcsolatban | B | tervezés, életbiztosítás | — (tapasztalati, szemléltető példával) |

### 2026. december — év végi teendők (szezonális)
| Cikk | Célkulcsszó | Klaszter | Link → | Források |
|---|---|---|---|---|
| Év végi pénzügyi teendők: adójóváírás, pénztári befizetés december 31-ig | adójóváírás határidő | D | nyugdíj, egészségpénztár | NAV szja, pénztári szabályok |
| Pénzügyi átvilágítás januárra: 10 pontos ellenőrzőlista | pénzügyi átvilágítás | B | tervezés, KGFB, bankszámla | — |

### 2027. január — jogszabály-frissítés hónapja
Első feladat: a `docs/forrasok.md` végi évi frissítési lista (minimálbér → lakáshitel-törlesztési
plafon, adójóváírási plafonok, Otthon Start feltételei). Az érintett oldalak `modified` dátuma
csak valódi változtatás után frissüljön.

| Cikk | Célkulcsszó | Klaszter | Link → | Források |
|---|---|---|---|---|
| Nyugdíjpénztár, nyugdíjbiztosítás vagy NYESZ? Összehasonlító táblázat 2027 | nyugdíjpénztár vagy nyugdíjbiztosítás | D | nyugdíj-megtakarítás | MNB nyugdíjcélú öngondoskodás, MNB pénztárak |
| Így igényeld a 20%-os adójóváírást az szja-bevallásban | adójóváírás igénylése | D | nyugdíj, egészségpénztár | NAV |

### 2027. február — lakás és hitel
| Cikk | Célkulcsszó | Klaszter | Link → | Források |
|---|---|---|---|---|
| Otthon Start vagy piaci lakáshitel? Mikor melyik éri meg | Otthon Start vagy piaci hitel | C | támogatott hitelek, piaci hitelek | a hatályos Otthon Start-rendelet (Jogtár), MNB |
| JTM: mekkora hitelt kaphatsz a fizetésedhez? | JTM kalkulátor, mekkora hitelt kapok | C | piaci hitelek, támogatott hitelek | MNB hitel-lízing |

### 2027. március — biztosítás és család
| Cikk | Célkulcsszó | Klaszter | Link → | Források |
|---|---|---|---|---|
| Hitelfedezeti biztosítás: a bankét fogadd el, vagy köss külön? | hitelfedezeti biztosítás | E | életbiztosítás, piaci hitelek | MNB biztosítások |
| Gyerek-megtakarítási formák összehasonlítva: mi kié 18 évesen? | gyerek megtakarítás formái | F | gyerek-megtakarítás | MNB befektetés-megtakarítás |

---

## Csak tulajdonosi / jogi jóváhagyás után

| Téma | Miért vár |
|---|---|
| Hiteltanácsadás vagy hitelközvetítés — mi a különbség? (210/hó) | A Hpt. szerinti fogalomhasználatot jogásszal kell egyeztetni, mielőtt a „hiteltanácsadás” szó szerepel. |
| Külföldi (osztrák) jövedelem és a magyar adókedvezmények | Adószakértői lektorálás kell; a győri oldal jelenleg csak az alapelvet írja le. |
| Ügyfél-esettanulmányok | Csak valós, írásos hozzájárulással, anonimizálva. Kitalált eset nem kerülhet ki. |

## Lokális tartalom — csak adat alapján

Városi cikk (pl. „Ausztriában dolgozol Győr környékén?”) csak akkor készüljön, ha a Search
Console-ban az adott városi oldal valós lekérdezéseket kap az adott témára. Tömeges
„{téma} {város}” oldal **nem** készül (doorway-kockázat).

## Frissítési rutin

- **Negyedévente:** a 3 legtöbb megjelenést hozó oldal átnézése, a GSC-lekérdezések alapján
  új GYIK-kérdés vagy szakasz.
- **Évente januárban:** jogszabályi számok, források élő-ellenőrzése (a `pages.mjs → SRC`
  linkjei), `UPDATED` / `modified` dátumok frissítése ott, ahol tartalom változott.
