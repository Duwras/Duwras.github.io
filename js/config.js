/* ==========================================================================
   KONFIGURÁCIÓ — itt kell kitölteni a saját adatokat, máshol nem
   Minden oldal ebből olvassa a nevet, elérhetőséget, jogi adatokat.
   ========================================================================== */
window.EP = window.EP || {};

window.EP.CONFIG = {
  /* --- Márka ---------------------------------------------------------- */
  brand: "Érték Pont Pénzügyek",

  /* --- Hol lakik az oldal ---------------------------------------------
     Most ideiglenesen a GitHub Pages ingyenes hostingján fut.
     Ez a három érték csak a canonical URL-t, az OG-képet, a sitemap-et és
     a robots.txt-t állítja — az oldal belső linkjei relatívak, ezért
     bármelyik útvonalon működik. Módosítás után: node build/generate.mjs

     A tárhely a GitHub Pages (Duwras/Duwras.github.io repó), a domain a
     Rackhostnál van bejegyezve. A kettőt a DNS köti össze — a github.io cím
     is működik, de átirányít ide.                                       */
  domain: "ertekpontpenzugyek.hu",
  basePath: "", // pl. "/ertekpont-penzugyek", ha alkönyvtárba kerül az oldal
  /* true esetén: robots.txt Disallow + noindex minden oldalon. Ideiglenes
     címnél kellett, hogy ne versenyezzen a saját domainnel. Most éles. */
  noindex: false,

  /* --- Tanácsadó ------------------------------------------------------ */
  advisor: {
    name: "Tímár Richárd",
    role: "pénzügyi tanácsadó",
    /* WebP: ugyanaz a kép 100 kB helyett 43 kB-ban. A .jpg megmarad a
       mappában tartaléknak, de a lapok a webp-et töltik. */
    photo: "assets/brand/portre.webp",
    bio:
      "Fiatal vállalkozóként és egyetemi hallgatóként elkötelezett vagyok a folyamatos " +
      "szakmai fejlődés és a pénzügyi tudatosság iránt. Célom, hogy minden helyzetben " +
      "megbízható, átlátható és személyre szabott támogatást nyújtsak ügyfeleimnek. " +
      "Számomra fontos az őszinte kommunikáció, a hosszú távú gondolkodás és az " +
      "eredményes megoldáskeresés.",
  },

  /* --- Elérhetőség ---------------------------------------------------- */
  contact: {
    phone: "+36 20 369 5312",
    phoneHref: "+36203695312",
    email: "timar.richard2@ovb.hu",
    area: "Budapest és online, az egész ország területén",
    hours: "Hétfő–péntek 9:00–19:00, szombaton egyeztetés szerint",
    facebook: "https://www.facebook.com/profile.php?id=61587459482095",
    instagram: "",
    /* LinkedIn: a saját profil URL-je. Üresen a link NEM jelenik meg
       sehol — a generátor kihagyja. */
    linkedin: "https://www.linkedin.com/in/richard-timar/",
    messenger: "https://m.me/61587459482095",
    /* Időpontfoglaló (Calendly stb.) szándékosan NINCS az oldalon: a
       visszahívás a telefonszámon és az online űrlapon megy, harmadik
       fél nélkül. */
  },

  /* --- Az oldal üzemeltetője: a márkanév mögötti egyéni vállalkozás ----
     HÁROM KÜLÖN SZINT VAN, és az oldalnak mindhármat külön kell mutatnia:

       1. „Érték Pont Pénzügyek”  → MÁRKANÉV (fantázianév). Nem cég, nem
          jogi személy, nincs cégjegyzékszáma. Ez alatt hirdetek.
       2. Tímár Richárd e.v.      → az üzemeltető, aki a márkanevet
          használja, és akivel a weboldalon keresztül kapcsolatba lépsz.
          Ő az adatkezelő is (lásd adatkezeles.html).
       3. OVB Vermögensberatung Kft. → a KÖZVETÍTŐ TÁRSASÁG (többes ügynök),
          amellyel az egyéni vállalkozó szerződéses jogviszonyban áll, és
          amelynek nevében és javára a közvetítés történik (lásd `legal`).

     Az adatok forrása a NAV egyéni vállalkozók nyilvántartása (EVNY).
     Egyéni vállalkozónak NINCS cégjegyzékszáma — a `regNumber` az
     EV-nyilvántartási szám, sehol ne nevezzük cégjegyzékszámnak.        */
  business: {
    legalName: "Tímár Richárd egyéni vállalkozó",
    shortName: "Tímár Richárd e.v.",
    address: "9151 Abda, Bécsi utca 128.",
    regNumber: "60338916",
    taxNumber: "90977435-1-28",
    mainActivity: "662201 — Biztosítási ügynöki, brókeri tevékenység",
    otherActivities:
      "661901 — egyéb pénzügyi kiegészítő tevékenység · " +
      "731101 — reklámtervezés, -készítés, -elhelyezés · " +
      "621004 — weblap tervezése (webdizájn)",
    since: "2025. április 7.",
    registerUrl: "https://www.nyilvantarto.hu/evny-lekerdezo/",
  },

  /* --- A közvetítő társaság (impresszumhoz kötelező) ------------------
     Fontos: a szerződések nem velem, hanem az OVB-vel, illetve a
     biztosítóval / bankkal / pénztárral jönnek létre. Az OVB az MNB
     nyilvántartásában TÖBBES ÜGYNÖK (nem alkusz) — a szövegek ezt tükrözik.
     Az itteni cégadatok az OVB-é, NEM az egyéni vállalkozásé (lásd
     `business`) — a kettőt sehol nem szabad összemosni.                  */
  legal: {
    companyName:
      "OVB Vermögensberatung Általános Biztosítási és Pénzügyi Szolgáltató Kft.",
    address: "1138 Budapest, Váci út 140.",
    taxNumber: "13231796-2-41",
    regNumber: "Cg. 01-09-724845 (Fővárosi Törvényszék Cégbírósága)",
    office: "Hernádi István iroda",
    mnbNumber: "125100300147",
    mnbCreditNumber: "120123100000",
    mnbRegisterUrl: "https://intezmenykereso.mnb.hu/",
    role:
      "biztosításközvetítő és pénzügyi szolgáltatás közvetítője, " +
      "az OVB Vermögensberatung Kft. (többes ügynök) nevében",
  },

  /* --- Számok a főoldali stat blokkhoz --------------------------------
     Csak ellenőrizhető adat. Most a 2026-os jogszabályi maximumok
     szerepelnek — ezek nem marketing-állítások, hanem tények.
     Ha lesz igazolható saját ügyfélszámod, cseréld le bármelyiket.
     Tipp: a szám maradjon rövid (max. 7 karakter), különben töri a rácsot. */
  stats: [
    { value: 280000, suffix: " Ft", label: "maximális éves adójóváírás nyugdíjcélra" },
    { value: 150000, suffix: " Ft", label: "éves adójóváírás pénztári befizetésre" },
    { value: 3, suffix: "%", label: "fix kamat az Otthon Start lakáshitelnél, 25 évre" },
    { value: 13, suffix: "", label: "pénzügyi terület, egy helyen, egy emberrel" },
  ],

  /* --- Lead-fogadás (Google Sheets) -----------------------------------
     Táblázat: „Érték Pont — weboldal jelentkezések”.
     A leadEndpoint az Apps Script webalkalmazás /exec URL-je. Ha új
     verziót telepítesz („Új telepítés”), az URL is új lesz — akkor ide
     kell beírni az újat. A „Telepítés kezelése → szerkesztés → új verzió”
     úton viszont az URL változatlan marad, ezért az az egyszerűbb.
     Útmutató: docs/google-sheets-setup.md

     A táblázat linkje SZÁNDÉKOSAN nincs itt: ez a fájl minden látogatóhoz
     letöltődik. A link a docs/google-sheets-setup.md-ben van.            */
  leadEndpoint:
    "https://script.google.com/macros/s/AKfycbw8k8XaYf8R7nutRBOUiMZiqhrBMJP2tlPDdkaRXNRjiPWdkAylqGUD5q_SEl-zFlEZ/exec",

  /* --- Ki készítette az oldalt (lábléc, minden lapon) ------------------
     A `url` üresen hagyva sima szöveg lesz belőle, link nélkül.
     A generátor megnézi, hova mutat: saját domainre mutató cím belső,
     relatív linkké alakul (nem nyit új lapot), idegen domain viszont
     target="_blank" rel="noopener" attribútumot kap.                     */
  siteCredit: {
    name: "StratosWeb",
    url: "https://www.stratosweb.hu/",
  },

  /* --- Referenciák (csak valós ügyfél-vélemény kerüljön be) ----------- */
  testimonials: [],
};
