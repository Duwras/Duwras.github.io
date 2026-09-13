# Local SEO ellenőrzőlista — Érték Pont Pénzügyek

A kódban **nincs** kitalált helyszín: a városi oldalak `Service` + `areaServed: City`
jelölést kapnak, nem `LocalBusiness`-t. A Google Cégprofil (GBP) a helyi találatok (térképes
blokk) legerősebb tényezője — ezt csak a tulajdonos tudja beállítani, fiókhoz kötve.

---

## 1. Hány Cégprofil lehet?

- **Egy.** A Google irányelvei szerint profil csak valós, a nyitvatartás alatt személyzettel
  működő ügyfélfogadó helyhez, vagy **szolgáltatási területtel működő vállalkozáshoz**
  (service-area business, SAB) hozható létre.
- **Nyolc városi profil NEM hozható létre**, amíg nincs nyolc valós, saját ügyfélfogadó hely.
  Virtuális iroda, postafiók, más cég irodája, coworking-asztal nem elég — ez a profil
  felfüggesztésével járhat.
- Az OVB-iroda („Hernádi István iroda”) az OVB helyszíne: saját profilhoz csak akkor
  használható, ha ott ténylegesen, rendszeresen fogadsz ügyfelet ÉS az OVB ehhez hozzájárul —
  ezt először tisztázni kell.

## 2. A profil beállítása (szolgáltatási területtel működő vállalkozás)

| Mező | Javasolt érték | Megjegyzés |
|---|---|---|
| Cégnév | **Érték Pont Pénzügyek** | Pontosan így, kulcsszó hozzáadása nélkül (a „— pénzügyi tanácsadó Budapest” típusú kiegészítés irányelvsértés). |
| Elsődleges kategória | **Pénzügyi tanácsadó** (Financial consultant) | |
| További kategóriák | Biztosításközvetítő (Insurance broker) *— csak ha a Google felkínálja és jogilag rendben van; a „broker” az angol felületen alkuszt is jelenthet, a magyar megjelenítést ellenőrizd*; Hitelközvetítő (Loan agency) | Ne válassz „Befektetési szolgáltatás”-t. |
| Cím | **Rejtve** (SAB) — a székhely (9151 Abda, Bécsi utca 128.) csak az ellenőrzéshez kell | Nyilvános címet csak valós ügyfélfogadó hely kaphat. |
| Szolgáltatási terület | Budapest, Győr, Debrecen, Szeged, Miskolc, Pécs, Nyíregyháza, Kecskemét (legfeljebb 20 terület) — vagy Magyarország | A Google a székhelytől kb. 2 óra vezetési távolságon belüli területet javasolja; az országos online működést a leírás és a weboldal mondja el. |
| Telefon | +36 20 369 5312 | Egyezzen a weboldallal (NAP). |
| Weboldal | `https://ertekpontpenzugyek.hu/?utm_source=google&utm_medium=organic&utm_campaign=gbp` | A canonical miatt az UTM-es URL nem hoz duplikátumot. |
| Időpontfoglalás link | `https://ertekpontpenzugyek.hu/kapcsolat/?utm_source=google&utm_medium=organic&utm_campaign=gbp-contact` | |
| Nyitvatartás | Hétfő–péntek 9:00–19:00; szombat: „egyeztetés szerint” → a GBP-ben ne add meg nyitvatartásként, csak a leírásban | A weboldal is ezt írja (`config.js → contact.hours`). |
| Nyitás dátuma | 2025. április 7. | Az e.v. tevékenységének kezdete (impresszum). |
| Leírás (750 karakter) | Lent | |

**Leírás-javaslat:**
> Pénzügyi tanácsadás és pénzügyi tervezés egy helyen: nyugdíj- és gyerekcélú megtakarítás,
> 20%-os adókedvezmények, élet-, baleset- és egészségbiztosítás, KGFB és casco, Otthon Start és
> piaci lakáshitel, személyi kölcsön, díjmentes bankszámla. A tanácsadás díjmentes, online az
> egész országban, Budapesten személyesen is. Az első beszélgetés 30–45 perc; jelentkezés után
> 24 órán belül visszahívlak. A közvetítést az OVB Vermögensberatung Kft. (többes ügynök)
> nevében végzem — nyilvántartási adatok a weboldal impresszumában.

## 3. Szolgáltatások a profilban

A 13 szolgáltatás-oldal címével egyezően, mindegyikhez a saját URL (UTM-mel):
Nyugdíj-megtakarítás · Gyerek-megtakarítás · Szabad felhasználású megtakarítás · 20%
adókedvezmény egészségpénztárral · Lakáshitel-törlesztés önsegélyező pénztárral · Életbiztosítás ·
Baleset-biztosítás · Egészségbiztosítás · KGFB és casco · Otthon Start és támogatott hitelek ·
Lakáshitel és hitelkiváltás · Személyi kölcsön · Díjmentes bankszámla.
**Ne** vegyél fel: befektetési tanácsadás, hiteltanácsadás, független tanácsadás.

## 4. NAP-konzisztencia (Name, Address, Phone)

Mindenhol **pontosan** ugyanaz:

| Elem | Érték | Hol ellenőrizd |
|---|---|---|
| Név | Érték Pont Pénzügyek (üzemeltető: Tímár Richárd e.v.) | weboldal, GBP, Facebook, LinkedIn, katalógusok |
| Telefon | +36 20 369 5312 | ugyanott |
| E-mail | timar.richard2@ovb.hu | ugyanott |
| Cím | csak az impresszumban (székhely) — nyilvános ügyfélfogadó cím nincs | GBP: rejtve |
| Weboldal | https://ertekpontpenzugyek.hu/ (https, www nélkül) | minden profil |

A weboldalon a telefon, e-mail és Facebook-link most már a statikus HTML-ben is benne van
(korábban csak JavaScript írta be) — a keresők így ugyanazt látják, mint a látogató.

## 5. Vélemények (review-stratégia)

- Minden lezárt ügy után **egy** kérés, közvetlen GBP-véleménylinkkel (a profil „Vélemények
  kérése” gombjából). Ne kérj csak elégedett ügyfelektől szűrten („review gating”) — ez sérti
  az irányelveket.
- **Tilos:** vásárolt, cserébe adott (kedvezmény, ajándék), családtagtól vagy saját magadtól
  írt vélemény; ügyfél nevében írt szöveg.
- Minden véleményre válaszolj 48 órán belül — negatívra is, tárgyilagosan, ügyféladat és
  szerződésrészlet nélkül (titoktartás!).
- Weboldalra (`config.js → testimonials`) csak az ügyfél **írásos hozzájárulásával** kerülhet
  vélemény; a JSON-LD-be `aggregateRating` / `review` akkor sem kerül, ha nincs a látható
  oldalon ugyanaz. A `build/seo-check.mjs` hibát jelez, ha valaki rating-et tenne a schemába.

## 6. Képek

- Portré (a weboldalon lévővel egyező), logó (`assets/brand/logo-mark.svg` → 720×720 PNG),
  borítókép (1024×576, márkaszínek).
- Munka közben készült valós képek (online konzultáció képernyője ügyféladat nélkül, iroda, ha
  van). **Stock fotó ne**, és ne olyan helyszín, ami nem a tiéd.

## 7. Bejegyzések (Google-bejegyzések)

Havonta 2: a tudástár új cikke vagy egy szezonális téma (KGFB-évforduló novemberben, adójóváírás
decemberben, jogszabály-változás januárban), a cikk UTM-es linkjével.

## 8. Hivatkozások és katalógusok (citációk)

Csak valós, releváns helyek, egyező NAP-pal: Facebook-oldal, LinkedIn, (ha lehetséges) OVB
tanácsadói profil a weboldal linkjével, iparági/regionális vállalkozói katalógusok. Linkfarm,
fizetett linkcsomag nem.

## 9. UTM-séma

| Forrás | utm_source | utm_medium | utm_campaign |
|---|---|---|---|
| GBP weboldal-gomb | google | organic | gbp |
| GBP bejegyzés | google | organic | gbp-post |
| Facebook-oldal | facebook | social | profile |
| LinkedIn | linkedin | social | profile |

A lead-táblázat `oldal` oszlopa a teljes URL-t rögzíti (UTM-mel együtt) — ebből látszik, melyik
csatorna és melyik városi oldal hozta a jelentkezést.

## 10. Ha később lesz valós ügyfélfogadó hely

1. GBP: cím nyilvánossá tétele (vagy új profil az új helyhez, ha valóban külön hely).
2. Weboldal: `build/generate.mjs → businessSchema()` → `FinancialService` típus **pontosan azzal
   a címmel és nyitvatartással**, ami a látható oldalon is szerepel.
3. Az érintett városi oldalon: `build/content/cities.mjs → inPerson: true`, és a szöveg a
   valós helyről szóljon (cím, megközelítés) — általános „helyi irodánk” szöveg ne.
