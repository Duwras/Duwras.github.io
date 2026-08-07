window.EP = window.EP || {};
/* ==========================================================================
   SZOLGÁLTATÁS-ADATBÁZIS — Érték Pont Pénzügyek
   Minden szám 2026-os hatályos érték. Forrásokat lásd: docs/forrasok.md
   Fontos: az oldal tájékoztatást ad, nem személyre szóló befektetési
   tanácsadást, és nem nevez meg konkrét terméket vagy szolgáltatót.
   ========================================================================== */

/* --- Számoló segédfüggvények ------------------------------------------- */

const MINWAGE_2026 = 322800;          // havi bruttó minimálbér 2026
const MAX_PENSION_INS = 130000;        // nyugdíjbiztosítás max. adójóváírás
const MAX_PENSION_FUND = 150000;       // önkéntes nyugdíjpénztár max.
const MAX_NYESZ = 100000;              // NYESZ max.
const MAX_PENSION_TOTAL = 280000;      // a harom forma EGYUTTES felso korlatja
const MAX_HEALTH_FUND = 150000;        // egészség-/önsegélyező pénztár max.
const HOUSING_MONTHLY_CAP = Math.round(MINWAGE_2026 * 0.15); // 48 420 Ft
const OTTHON_START_RATE = 0.03;        // fix 3%
const OTTHON_START_MAX = 50_000_000;

const fmt = (n) =>
  new Intl.NumberFormat("hu-HU", { maximumFractionDigits: 0 }).format(Math.round(n));

const ft = (n) => fmt(n) + " Ft";

/** Szazalek magyar irasmoddal: 7.5 -> "7,5%" */
const pct = (n) =>
  new Intl.NumberFormat("hu-HU", { maximumFractionDigits: 2 }).format(n) + "%";

/** Annuitásos törlesztőrészlet. rate = éves kamat (0.03), years = futamidő */
function annuity(principal, rate, years) {
  const i = rate / 12;
  const n = years * 12;
  if (i === 0) return principal / n;
  return (principal * i) / (1 - Math.pow(1 + i, -n));
}

/** Havi befizetések jövőértéke éves hozam mellett (hó végi befizetés).
    FIGYELEM: ez KÖLTSÉG NÉLKÜLI, elméleti kamatos kamat. Rendszeres díjas
    megtakarítási programra NE ezt használd, hanem a lenti `programValue`-t. */
function futureValue(monthly, rate, years, initial = 0) {
  const i = rate / 12;
  const n = years * 12;
  const fvSeries = i === 0 ? monthly * n : monthly * ((Math.pow(1 + i, n) - 1) / i);
  return fvSeries + initial * Math.pow(1 + i, n);
}

/* --- Rendszeres díjas megtakarítási program: VALÓS költséggörbe ---------
   Forrás: a saját tanácsadói eszköz (hitelfedezeti_tanacsadoi_eszkoz_v8.2 →
   „Okoshitel” modul) COEF8 / COEF9 sorai, amelyek a „Hitelkalkulátor 2024.xlsx”
   rejtett „Öngondoskodási terv” lapjáról vannak visszafejtve.

   Mit tartalmaz: 25 000 Ft/hó befizetés mellett a felhalmozott érték a
   szerződés 1–24. évének végén, MÁR LEVONVA a termék tényleges költségeit
   (kezdeti egységek, adminisztráció, alapkezelés) és HOZZÁADVA a hűség-
   bónuszokat (jól látható ugrás a 10., 15. és 20. évnél).
   A görbe a havi összegben lineáris, ezért tetszőleges díjra átskálázható.

   Miért csak 8% és 9%: a forrás sem definiál mást. Más hozamszinthez saját
   visszafejtett faktorsor kellene — ezért a kalkulátorok is csak ezt a két
   szintet kínálják. Ez tudatos korlát, nem hiányosság.                    */
const PROGRAM_COEF = {
  8: [62670, 224940, 495576, 785940, 1094700, 1422900, 1771707, 2142240, 2592189,
      3475500, 3978810, 4512708, 5079009, 5679996, 6794190, 7495732.8, 8239968,
      9029178, 9866472, 11683020, 12807900, 14010810, 15297617.4, 16672968],
  9: [62972.899951667474, 226707.34218369008, 501086.89785764652, 797999.03690298228,
      1116700.0997719497, 1458529.2043039321, 1825076.631395071, 2217913.4652752788,
      2710231.3593126731, 3633402.8954802253, 4182935.50617284, 4770918.6194646191,
      5399903.653609639, 6073284.6074350951, 7304667.851102409, 8107786.9571338845,
      8967264.0118841287, 9886456.1172904074, 10870103.629739838, 12936195.744840106,
      14273787.969679387, 15716662.94701696, 17273870.273962244, 18952743.608097181],
};
const PROGRAM_BASE = 25000;            // a görbe alapja: 25 000 Ft/hó
const PROGRAM_YIELDS = [8, 9];         // csak ezekre van visszafejtett adat

/* A 24. év UTÁN a forrás-eszköz lineáris növekménnyel folytatja (plató-
   feltevés). Az egy hitel-végtörlesztésre jó közelítés, egy 30-40 éves
   nyugdíjtávra viszont drasztikusan alábecsülne, mert a kamatos kamatot
   elvágja. Ezért itt a 24. évet a görbe SAJÁT, utolsó teljes évéből adódó
   nettó rátájával kamatoztatjuk tovább — ez a görbe kiterjesztése, nem
   forrásadat, és a kalkulátorok jegyzete ki is mondja.
   A képlet: (24. év - 23. év - éves befizetés) / 23. év értéke.
   Adódó nettó ráta: 8%-os görbe → ~7,03%, 9%-os görbe → ~7,98%.          */
function programNetRate(yieldPct) {
  const t = PROGRAM_COEF[yieldPct];
  const last = t[t.length - 1];
  const prev = t[t.length - 2];
  return (last - prev - PROGRAM_BASE * 12) / prev;
}

/** Felhalmozott érték `years` év múlva, `monthly` havi díj mellett,
    a termék valós költséggörbéje szerint. yieldPct: 8 vagy 9. */
function programValue(monthly, years, yieldPct) {
  const t = PROGRAM_COEF[yieldPct] || PROGRAM_COEF[9];
  const y = Math.floor(years);
  if (y <= 0) return 0;
  if (y <= t.length) return (monthly / PROGRAM_BASE) * t[y - 1];
  const r = programNetRate(yieldPct);
  const extra = y - t.length;
  /* a 24. évi vagyon tovább kamatozik + az új befizetések is */
  return (
    (monthly / PROGRAM_BASE) * t[t.length - 1] * Math.pow(1 + r, extra) +
    futureValue(monthly, r, extra)
  );
}

/** A `programValue` megfordítása: mekkora havi díj kell `target` összeghez. */
function programMonthlyFor(target, years, yieldPct) {
  const unit = programValue(PROGRAM_BASE, years, yieldPct); // 25 000 Ft/hó eredménye
  if (unit <= 0) return Infinity;
  return (target / unit) * PROGRAM_BASE;
}

/* A program TÉNYLEGES éves nettó hozama (belső megtérülési ráta) adott távon.
   Ez az egyetlen szám, ami őszintén megmutatja, mit ér a "bruttó 8-9%": a
   kezdeti költségek miatt rövid távon MÍNUSZ, és csak 15 év körül éri el a
   6% körüli szintet. Tisztán a görbéből számoljuk, nincs benne feltevés:

     3 év →  -44,5% |  10 év →  3,8% |  15 év →  6,1% |  20 év →  6,9%   (9%-os görbe)

   Felezéses gyökkeresés, mert a havi befizetéses jövőérték nem rendezhető
   át zárt alakban a rátára. */
function programNetYield(years, yieldPct) {
  const fv = programValue(PROGRAM_BASE, years, yieldPct);
  const n = years * 12;
  const diff = (r) => {
    const i = r / 12;
    const factor = i === 0 ? n : (Math.pow(1 + i, n) - 1) / i;
    return PROGRAM_BASE * factor - fv;
  };
  /* Az alsó korlát -11,99, nem -0,95: i = r/12, tehát r > -12 kell, hogy
     (1+i) pozitív maradjon. Szűkebb korláttal a rövid távú (erősen negatív)
     eredmény beleütközne a korlátba, és a kalkulátor a korlátot írná ki
     tényleges hozamként — az hamis szám lenne. */
  let lo = -11.99, hi = 1.0;
  for (let k = 0; k < 300; k++) {
    const mid = (lo + hi) / 2;
    if (diff(mid) > 0) hi = mid; else lo = mid;
  }
  return (lo + hi) / 2;
}

/* --- Ikonok (24x24, stroke) -------------------------------------------- */

const I = {
  pension: '<path d="M4 20V8m0 0 8-4 8 4M4 8h16v12M9 20v-6h6v6"/><path d="M12 11.5v.01"/>',
  wallet: '<rect x="3" y="6" width="18" height="13" rx="3"/><path d="M3 10h18M16 14h2"/>',
  car: '<path d="M5 16h14M6.5 16 8 9h8l1.5 7"/><rect x="3" y="16" width="18" height="4" rx="1.5"/><path d="M7 20v1m10-1v1"/>',
  family: '<circle cx="8" cy="8" r="3"/><circle cx="17" cy="10" r="2.2"/><path d="M3 20c0-3 2.2-5 5-5s5 2 5 5M14 20c0-2.2 1.3-3.6 3-3.6s3 1.4 3 3.6"/>',
  house: '<path d="M4 11 12 4l8 7v9H4z"/><path d="M9 20v-6h6v6"/><path d="M15 8V5h3v5"/>',
  piggy: '<path d="M4 13a6 6 0 0 1 6-6h5a5 5 0 0 1 5 5v4H8a4 4 0 0 1-4-3z"/><path d="M7 20v-2m10 2v-2M9 11h.01"/>',
  shield: '<path d="M12 3 5 6v6c0 4.5 3 7.5 7 9 4-1.5 7-4.5 7-9V6z"/><path d="M9 12l2 2 4-4"/>',
  heart: '<path d="M12 20s-7-4.5-7-9.5A3.9 3.9 0 0 1 12 7a3.9 3.9 0 0 1 7 3.5C19 15.5 12 20 12 20z"/>',
  cross: '<rect x="3" y="6" width="18" height="14" rx="3"/><path d="M12 10v6m-3-3h6M9 6V4h6v2"/>',
  bank: '<path d="M3 10 12 4l9 6"/><path d="M5 10v9h14v-9"/><path d="M9 19v-5m6 5v-5"/>',
  gift: '<rect x="3" y="8" width="18" height="12" rx="2"/><path d="M12 8v12M3 12h18"/><path d="M8 8a2.5 2.5 0 1 1 4-2 2.5 2.5 0 1 1 4 2"/>',
  card: '<rect x="2.5" y="5" width="19" height="14" rx="3"/><path d="M2.5 10h19M6 15h4"/>',
  chart: '<path d="M4 19h16"/><path d="M7 19v-6m5 6V6m5 13v-9"/>',
};

/* --- A 13 szolgáltatás ------------------------------------------------- */

const CATEGORIES = {
  ado: { key: "ado", label: "Adóoptimalizálás", note: "Állami 20% visszatérítés" },
  megtakaritas: { key: "megtakaritas", label: "Megtakarítás", note: "Vagyonépítés" },
  biztositas: { key: "biztositas", label: "Biztosítás", note: "Védelem" },
  hitel: { key: "hitel", label: "Hitel", note: "Finanszírozás" },
  bank: { key: "bank", label: "Bankügyek", note: "Napi pénzügyek" },
};

const SERVICES = [
  /* 1 ------------------------------------------------------------------ */
  {
    slug: "nyugdij-megtakaritas",
    cat: "ado",
    icon: I.pension,
    /* A H1 a keresett kifejezéssel; a kártyán és a menüben marad a rövid név. */
    h1: "Nyugdíj-megtakarítás és nyugdíjbiztosítás",
    title: "Nyugdíj-megtakarítás",
    navTitle: "Nyugdíj-megtakarítás",
    badge: "20% állami",
    metric: "akár 280 000 Ft / év",
    hook: "Az állam évente akár 280 ezer forintot ad vissza az adódból, ha a nyugdíjadra teszel félre. Ez a legjobban fizető szabály a magyar adórendszerben.",
    seo: {
      title: "Nyugdíj-megtakarítás 2026 — akár 280 000 Ft adójóváírás évente",
      desc: "Nyugdíjbiztosítás, önkéntes nyugdíjpénztár és NYESZ 2026-ban: 20% adójóváírás, max. 130 000 / 150 000 / 100 000 Ft. Számold ki, mennyit kapsz vissza.",
    },
    facts: [
      { v: "20%", l: "adójóváírás minden befizetésre" },
      { v: "280 000 Ft", l: "maximum évente, a három forma kombinálásával" },
      { v: "0 Ft", l: "adó a lejáratkor, ha kivárod a nyugdíjkorhatárt" },
    ],
    intro:
      "A magyar állam három nyugdíjcélú formát támogat adójóváírással: a nyugdíjbiztosítást, az önkéntes nyugdíjpénztárat és a NYESZ-t. Mindháromnál a befizetésed 20%-át visszakapod az szja-dból — de nem a bankkártyádra, hanem a saját nyugdíjszámládra, ahol az is tovább dolgozik.",
    how: [
      {
        h: "Nyugdíjbiztosítás — max. 130 000 Ft / év",
        t: "Évi 650 000 Ft befizetésnél éred el a plafont. Rugalmas: szüneteltethető, emelhető, és a legtöbb konstrukcióban választhatsz, milyen kockázati szinten fektessék be a pénzt.",
      },
      {
        h: "Önkéntes nyugdíjpénztár — max. 150 000 Ft / év",
        t: "750 000 Ft éves befizetésnél maxolod. Nagy előny, hogy a munkáltatód is fizethet bele, és jellemzően ez a legalacsonyabb költségű forma.",
      },
      {
        h: "NYESZ — max. 100 000 Ft / év",
        t: "Értékpapírszámla nyugdíjcélra: te döntesz, mit vásárolsz rá (állampapír, ETF, részvény). Aktívabb figyelmet igényel, de a legnagyobb szabadságot adja.",
      },
      {
        h: "A három együtt is használható",
        t: "A limitek külön-külön élnek, ezért a formák kombinálásával összesen évi ~280 000 Ft adójóváírás érhető el. Hogy neked melyik mix a logikus, az a jövedelmedtől, a hátralévő időtől és a kockázattűrésedtől függ.",
      },
    ],
    warn:
      "Ha a nyugdíjjogosultság előtt kiveszed a pénzt, arra az évre nincs jóváírás, és a korábban kapott összeg 120%-át vissza kell fizetni az államnak. Ez nem büntetés-jellegű apróbetű, hanem a szabály lényege: ez a pénz a nyugdíjadra van.",
    bullets: [
      "25–55 év között vagy, és van legalább 10 éved a nyugdíjig",
      "fizetsz szja-t (alkalmazott, vállalkozó, osztalék mellett is)",
      "zavar, hogy az állami nyugdíj önmagában látványos életszínvonal-esést jelent",
      "szeretnél olyan megtakarítást, ahol az állam is beszáll 20%-kal",
    ],
    funnel: {
      steps: [
        {
          id: "age",
          kicker: "1. kérdés",
          q: "Hány éves vagy most?",
          help: "Ez határozza meg, mennyi idő van hátra a kamatos kamat munkájára.",
          type: "choice",
          opts: [
            { v: 27, label: "18–29", note: "Nagyon korán kezdesz — a legkisebb összeg is sokat hoz" },
            { v: 36, label: "30–39", note: "Ideális sáv: van idő és van jövedelem" },
            { v: 46, label: "40–49", note: "Még bőven van 15–20 év" },
            { v: 56, label: "50+", note: "Rövidebb táv, itt az adójóváírás a főszereplő" },
          ],
        },
        {
          id: "hasAny",
          kicker: "2. kérdés",
          q: "Van már valamilyen nyugdíjcélú megtakarításod?",
          type: "choice",
          opts: [
            { v: "none", label: "Nincs semmi", note: "A teljes 280 ezres keret nyitva áll" },
            { v: "fund", label: "Önkéntes pénztár van", note: "Megnézzük, kihasználod-e a plafont" },
            { v: "ins", label: "Nyugdíjbiztosítás van", note: "Átvizsgáljuk a költségeit és a hozamát" },
            { v: "multi", label: "Több is van", note: "Optimalizálunk a limitek között" },
          ],
        },
        {
          id: "risk",
          kicker: "3. kérdés",
          q: "Mit tennél, ha a megtakarításod egy év alatt 15%-ot esne?",
          help: "Nincs jó válasz — csak olyan, ami hozzád illik.",
          type: "choice",
          opts: [
            { v: "low", label: "Kiszállnék", note: "Óvatos: állampapír-túlsúly, garantált elemek" },
            { v: "mid", label: "Kivárnám", note: "Kiegyensúlyozott: vegyes portfólió" },
            { v: "high", label: "Rávásárolnék", note: "Növekedési: magasabb részvényarány" },
          ],
        },
      ],
      calc: {
        kicker: "Adójóváírás-kalkulátor",
        title: "Mennyi állami pénzt hagysz most az asztalon?",
        help:
          "A jóváírás felső korlátja formánként külön van, ezért először azt kell tudni, miben gondolkodsz. Kombinálva jön ki a legtöbb.",
        inputs: [
          {
            key: "form",
            label: "Melyik formában?",
            type: "select",
            def: "kombinalt",
            options: [
              { v: "kombinalt", label: "Mindhárom kombinálva — max. 280 000 Ft", short: "kombinált" },
              { v: "penztar", label: "Önkéntes nyugdíjpénztár — max. 150 000 Ft", short: "pénztár" },
              { v: "biztositas", label: "Nyugdíjbiztosítás — max. 130 000 Ft", short: "biztosítás" },
              { v: "nyesz", label: "NYESZ értékpapírszámla — max. 100 000 Ft", short: "NYESZ" },
            ],
            note:
              "A 20% mindhárom formánál ugyanaz, csak a plafon más. Kombinálva a három korlát összeadódik, de legfeljebb 280 000 Ft-ig.",
          },
          { key: "monthly", label: "Havi félretett összeg", type: "slider", min: 10000, max: 150000, step: 5000, def: 30000, unit: "Ft" },
          { key: "years", label: "Hátralévő évek a nyugdíjig", type: "slider", min: 5, max: 40, step: 1, def: 25, unit: "év" },
          {
            key: "yield",
            label: "Feltételezett éves bruttó hozam",
            type: "chips",
            options: PROGRAM_YIELDS,
            def: 9,
            unit: "%",
            note: "A várható összeg egy tényleges, rendszeres díjas program valós költséggörbéjén fut — a bruttó hozamból a levonások már le vannak véve. Csak erre a két szintre van visszafejtett adat.",
          },
        ],
        compute(v) {
          const CAPS = {
            kombinalt: MAX_PENSION_TOTAL,
            penztar: MAX_PENSION_FUND,
            biztositas: MAX_PENSION_INS,
            nyesz: MAX_NYESZ,
          };
          const NAMES = {
            kombinalt: "mindhárom forma együtt",
            penztar: "önkéntes nyugdíjpénztár",
            biztositas: "nyugdíjbiztosítás",
            nyesz: "NYESZ",
          };
          const cap = CAPS[v.form] || MAX_PENSION_TOTAL;
          const yearly = v.monthly * 12;
          const credit = Math.min(yearly * 0.2, cap);
          const capped = yearly * 0.2 > cap;
          const totalCredit = credit * v.years;
          const own = yearly * v.years;
          /* A NAV a jóváírást a nyugdíjszámlára utalja, tehát az is befektetésre
             kerül — ezért a havi díjhoz adjuk hozzá. A felhalmozás a termék
             VALÓS költséggörbéjén fut (programValue), nem elméleti kamatos
             kamaton: a korábbi futureValue felfelé torzított. */
          const fv = programValue(v.monthly + credit / 12, v.years, v.yield);
          return {
            big: ft(credit),
            bigLabel: "adójóváírás évente",
            caption: capped
              ? `Ez a plafon ${NAMES[v.form]} esetén: a befizetésed 20%-a ${ft(yearly * 0.2)} lenne, de a jogszabály ${ft(cap)}-nál elvágja.`
              : `A befizetésed 20%-a. ${v.years} év alatt összesen ${ft(totalCredit)} jön vissza az adódból.`,
            rows: [
              ["Éves befizetés", ft(yearly)],
              ["Adójóváírás (20%)", ft(credit) + (capped ? " — plafonon" : "")],
              [`Jóváírás ${v.years} év alatt`, ft(totalCredit)],
              ["Saját befizetés összesen", ft(own)],
              [`Nettó hozam ${v.yield}%-os feltevéssel, költségek után`, ft(Math.max(0, fv - own - totalCredit))],
            ],
            total: ["Nyugdíjkezdéskor várható összeg", ft(fv)],
            note:
              "A jóváírás feltétele, hogy legalább ennyi szja-t fizess az adott évben. A felhalmozás egy tényleges, rendszeres díjas nyugdíjbiztosítási program visszafejtett költséggörbéjén fut, ezért a kimutatott összeg már a levonások utáni — pénztárnál és NYESZ-nél a költségszerkezet ettől eltér, jellemzően kedvezőbb. A 24 évnél hosszabb távot a görbe utolsó évéből adódó nettó rátával vezetjük tovább. Tájékoztató becslés, nem ajánlat és nem hozamgarancia.",
          };
        },
      },
      faqInFunnel: true,
    },
    faq: [
      {
        q: "Mennyi a minimum, amivel érdemes elkezdeni?",
        a: "Havi 10–20 ezer forinttal is működik, és a 20% jóváírás ugyanúgy jár rá. A nagyobb kérdés nem az összeg, hanem a folytonosság: egy kisebb, de évekig tartott befizetés többet ér, mint egy nagy, amit fél év után abbahagysz.",
      },
      {
        q: "Mi történik, ha közben elveszítem a munkámat?",
        a: "Mindhárom formánál van mozgásterünk: a befizetés szüneteltethető vagy csökkenthető. A lényeg, hogy ne felmondás legyen belőle, mert az visszafizetési kötelezettséget hoz.",
      },
      {
        q: "Melyik a legjobb a három közül?",
        a: "Nincs egyetlen legjobb — a három más célra van kitalálva. Ha a munkáltatód is fizethet, a pénztár tipikusan verhetetlen költségoldalon; ha rugalmasságot és biztosítási védelmet is akarsz, a nyugdíjbiztosítás felé megy a mérleg; ha te szeretsz befektetni, a NYESZ. Ezt együtt nézzük meg a te számaidon.",
      },
      {
        q: "Az adójóváírást én kapom meg?",
        a: "Nem a folyószámládra jön, hanem a nyugdíjszámládra utalja a NAV a nyilatkozatod alapján — így az a 20% is befektetésre kerül és tovább kamatozik.",
      },
    ],
    legal:
      "A 20%-os adójóváírás igénybevételéhez szja-fizetési kötelezettség kell. A jóváírás összege a befizetésre és a törvényi plafonra korlátozódik. Az itt szereplő számítások tájékoztató jellegűek.",
  },

  /* 2 ------------------------------------------------------------------ */
  {
    slug: "szabad-felhasznalasu-megtakaritas",
    cat: "megtakaritas",
    icon: I.chart,
    title: "Szabad felhasználású megtakarítás",
    navTitle: "Szabad megtakarítás",
    badge: "Bármikor elérhető",
    metric: "cél → havi összeg",
    hook: "Nem minden célod a nyugdíj. Autó, lakásfelújítás, tartalék, üzleti indulás — ehhez olyan megtakarítás kell, amihez hozzáférsz, amikor kell.",
    seo: {
      title: "Szabad felhasználású megtakarítás 2026 — tervezés célösszegre",
      desc: "Rövid és középtávú célok: vésztartalék, autó, felújítás, önerő. Számold ki, havi mennyi kell a célösszeghez, és milyen eszközök jöhetnek szóba.",
    },
    facts: [
      { v: "3–6 hónap", l: "nettó jövedelem — ennyi a szakmai minimum vésztartalékra" },
      { v: "0 Ft", l: "kötési kényszer: a cél és a táv határozza meg az eszközt" },
      { v: "3 sáv", l: "rövid (0–3 év), közép (3–8 év), hosszú (8+ év)" },
    ],
    intro:
      "A szabad felhasználású megtakarítás lényege, hogy nem az adószabály, hanem a saját célod alakítja. Két kérdés dönt el mindent: mikor kell a pénz, és mennyire baj, ha közben ingadozik az értéke. Ebből jön ki, mi kerül bele — és mi az, ami neked biztosan nem jó.",
    how: [
      { h: "0–3 év: a biztonság a hozam", t: "Vésztartalék, közeli nagy kiadás. Itt a kiszámíthatóság és a azonnali hozzáférés fontosabb, mint a néhány tized százalék extra." },
      { h: "3–8 év: kiegyensúlyozott", t: "Autó, felújítás, önerő. Vegyes összetétel, amiben már van növekedési rész is, de tompítva." },
      { h: "8+ év: a kamatos kamat átveszi a főszerepet", t: "Hosszú célok esetén az idő a legerősebb eszköz. Itt már megengedhető nagyobb ingadozás egy magasabb várható hozamért." },
      { h: "Rendszeresség > időzítés", t: "Az egyszeri, jól időzített befektetés helyett a havi automatikus félretétel az, ami valósan működik a mindennapokban." },
    ],
    bullets: [
      "van konkrét célod 1–10 éven belül",
      "nincs még legalább 3 havi nettó jövedelmed tartalékként",
      "a folyószámládon áll a pénz, és tudod, hogy ez veszteség",
      "nem akarsz olyat kötni, ami évekre bezárja a pénzedet",
    ],
    funnel: {
      steps: [
        {
          id: "goal",
          kicker: "1. kérdés",
          q: "Mire gyűjtenél?",
          type: "choice",
          opts: [
            { v: "buffer", label: "Vésztartalék", note: "3–6 havi kiadás, azonnal elérhető" },
            { v: "big", label: "Nagyobb vásárlás", note: "Autó, felújítás, esküvő, utazás" },
            { v: "downpay", label: "Lakás önerő", note: "Konkrét összeg, konkrét dátum" },
            { v: "free", label: "Csak vagyonépítés", note: "Nincs fix cél, csak ne álljon a pénz" },
          ],
        },
        {
          id: "when",
          kicker: "2. kérdés",
          q: "Mikor lenne szükséged rá?",
          type: "choice",
          opts: [
            { v: 2, label: "1–3 éven belül", note: "Rövid táv: stabilitás" },
            { v: 5, label: "3–8 év", note: "Közép táv: vegyes" },
            { v: 12, label: "8 év felett", note: "Hosszú táv: növekedés" },
            { v: 1, label: "Bármikor kellhet", note: "Teljes likviditás" },
          ],
        },
        {
          id: "access",
          kicker: "3. kérdés",
          q: "Mennyire fontos, hogy bármikor hozzájuss?",
          type: "choice",
          opts: [
            { v: "high", label: "Nagyon", note: "Napokon belül kelljen" },
            { v: "mid", label: "Közepesen", note: "Pár hét belefér" },
            { v: "low", label: "Nem fontos", note: "Évekre le tudom kötni" },
          ],
        },
      ],
      calc: {
        kicker: "Célösszeg-kalkulátor",
        title: "Mennyit kell félretenned a célodhoz?",
        help:
          "Egy tényleges, rendszeres díjas megtakarítási program valós költséggörbéjén számol. A „tényleges nettó hozam” sor mutatja meg, mit ér a bruttó hozamfeltevés a költségek után — ez dönti el, hogy a te távodra jó eszköz-e ez egyáltalán.",
        inputs: [
          { key: "target", label: "Célösszeg", type: "slider", min: 500000, max: 30000000, step: 500000, def: 5000000, unit: "Ft" },
          { key: "years", label: "Mennyi idő alatt", type: "slider", min: 1, max: 20, step: 1, def: 12, unit: "év" },
          {
            key: "yield",
            label: "Feltételezett éves bruttó hozam",
            type: "chips",
            options: PROGRAM_YIELDS,
            def: 9,
            unit: "%",
            note: "Csak erre a két szintre van visszafejtve a termék valós költséggörbéje. A bruttó hozam nem azonos azzal, ami nálad marad — lásd a tényleges nettó hozamot lent.",
          },
        ],
        compute(v) {
          /* A programValue lineáris a havi díjban, ezért pontosan invertálható. */
          const monthly = programMonthlyFor(v.target, v.years, v.yield);
          const own = monthly * v.years * 12;
          const net = programNetYield(v.years, v.yield);
          /* A kezdeti költségek rövid távon nem térülnek meg: ilyenkor többet
             kell befizetni, mint a célösszeg. Ezt ki kell mondani, nem elrejteni.
             Alternatív eszközre SZÁNDÉKOSAN nem írunk ki számot: arra nincs
             visszafejtett adatunk, a konkrét kondíció beszélgetés kérdése. */
          const underwater = own > v.target;
          return {
            big: ft(monthly),
            bigLabel: "szükséges havi félretétel",
            bigSmall: monthly >= 1000000,
            caption: underwater
              ? `${v.years} év alatt ez az eszköz nem hoz hozamot: a kezdeti költségek miatt többet kellene befizetned, mint amennyi a célösszeg. Ilyen távra egyszerű, biztonságos forma való — bankbetét vagy lakossági állampapír. Nézzük meg együtt, mi a mai kondíció.`
              : `Ennyit kell havonta elhelyezned, hogy ${v.years} év alatt összegyűljön ${ft(v.target)} — a termék költségei már levonva.`,
            rows: [
              ["Célösszeg", ft(v.target)],
              ["Havi félretétel", ft(monthly)],
              ["Saját befizetés összesen", ft(own)],
              /* -50% alatt a százalék már semmit nem mond a felhasználónak,
                 csak riaszt egy értelmezhetetlen számmal. Ott inkább szöveg. */
              [
                `Tényleges nettó hozam (${v.years} év)`,
                net < -0.5 ? "nincs értelmezhető hozam" : pct(Math.round(net * 1000) / 10),
              ],
              [
                underwater ? "Költség és hozam egyenlege" : "Hozamból jön össze",
                ft(v.target - own),
              ],
            ],
            total: ["Cél elérése", `${v.years} év alatt`],
            note:
              "A számítás egy tényleges, rendszeres díjas megtakarítási termék visszafejtett költséggörbéjén fut (kezdeti és folyó költségek levonva, hűségbónuszok hozzáadva) — csak 8% és 9% bruttó hozamfeltevésre van valós adat. A „tényleges nettó hozam” az az éves hozam, ami a költségek után marad: a kezdeti évek terhelése miatt rövid távon negatív, és nagyjából a 15. évtől kerül 6% fölé. Rövid célra ezért nem ez az eszköz való. A számítás rendszeres havi befizetéssel dolgozik; egyszeri induló összeget külön veszünk figyelembe. A hozam nem garantált.",
          };
        },
      },
    },
    faq: [
      { q: "Mennyi legyen a vésztartalék?", a: "Alkalmazottként 3–6 havi teljes kiadás, vállalkozóként inkább 6–12 havi. Ez az a pénz, aminek nem az a dolga, hogy hozamot termeljen, hanem hogy ott legyen." },
      { q: "Havi 20 ezerrel érdemes elkezdeni?", a: "Igen. A rendszeresség sokkal többet hoz, mint a nagyobb, de rendszertelen összeg — és lefelé mindig könnyebb módosítani, mint elölről kezdeni." },
      { q: "Mi a helyzet az inflációval?", a: "Rövid távon a stabilitás fontosabb, hosszú távon viszont a folyószámlán tartott pénz garantáltan veszít. Ezért kell a célhoz igazítani az eszközt, nem fordítva." },
    ],
    legal: "A megtakarítási formák hozama nem garantált, a múltbeli hozam nem jelent ígéretet a jövőre.",
  },

  /* 3 ------------------------------------------------------------------ */
  {
    slug: "kgfb-casco",
    cat: "biztositas",
    icon: I.car,
    /* A H1 a keresett kifejezéssel; a kártyán és a menüben marad a rövid név. */
    h1: "KGFB és casco biztosítás",
    title: "KGFB és casco",
    navTitle: "KGFB / Casco",
    badge: "Évfordulós váltás",
    metric: "30 nap az évfordulóig",
    hook: "Az évfordulós értesítőben szereplő új díj szinte mindig magasabb, mint amit ma új szerződésként kapnál. A váltás pár perc — de van egy határidő, amit nem lehet átlépni.",
    seo: {
      title: "KGFB és casco 2026 — évfordulós váltás, teljes piaci összehasonlítás",
      desc: "Kötelező biztosítás váltás 2026-ban: 30 napos felmondási határidő, bónusz megőrzése, casco önrész és kizárások. Nézzük át együtt a szerződésedet.",
    },
    facts: [
      { v: "30 nap", l: "az évfordulóig — eddig kell beérkeznie a felmondásnak" },
      { v: "6 hét", l: "ennyivel érdemes az évforduló előtt elkezdeni" },
      { v: "2 szerződés", l: "a KGFB és a casco nem muszáj egy biztosítónál lennie" },
    ],
    intro:
      "A kötelező gépjármű-felelősségbiztosítás mindenkinek kötelező, de az árazása biztosítónként drasztikusan különbözik ugyanarra az autóra és ugyanarra a bónuszfokozatra. A casco pedig ott dől el, amit a legtöbben nem olvasnak el: az önrészben, a kizárásokban és a szolgáltatási limitekben.",
    how: [
      { h: "Évfordulós felmondás", t: "A meglévő szerződést az évforduló előtti 30. napig kell felmondani, és a felmondásnak eddig be is kell érkeznie a biztosítóhoz. Ha ez kimarad, egy évig marad a magasabb díj." },
      { h: "Az adminisztrációt átveszem", t: "Ha időben, legalább 6 héttel az évforduló előtt szólsz, a felmondás beküldését és az új szerződés megkötését meghatalmazással intézem — neked csak alá kell írnod." },
      { h: "Bónusz megőrzése", t: "A kármentes évekkel felépített bónuszfokozat átvihető az új biztosítóhoz — nem kell nulláról kezdeni." },
      { h: "Casco: nem a díj a lényeg", t: "Két azonos díjú casco között óriási különbség lehet az önrészben, a totálkár-elszámolásban, az elemi kár és lopás fedezetében, valamint az asszisztencia-szolgáltatásban." },
    ],
    bullets: [
      "közeledik a KGFB évfordulód (a legtöbb szerződésnél nem január)",
      "évek óta ugyanannál a biztosítónál vagy, és nem hasonlítottad össze",
      "új autót vettél, vagy casco-t szeretnél mellé",
      "kár volt, és nem tudod, mi lesz a bónuszoddal",
    ],
    funnel: {
      steps: [
        {
          id: "what",
          kicker: "1. kérdés",
          q: "Mire van szükséged?",
          type: "choice",
          opts: [
            { v: "kgfb", label: "Csak KGFB", note: "Kötelező felelősségbiztosítás" },
            { v: "casco", label: "Casco is", note: "Saját kár, lopás, elemi kár" },
            { v: "both", label: "Mindkettő átvizsgálása", note: "Teljes gépjármű-csomag" },
            { v: "new", label: "Új autó, most kötök", note: "Nulláról indulunk" },
          ],
        },
        {
          id: "vehicle",
          kicker: "2. kérdés",
          /* Az évfordulót a kalkulátor kérdezi meg pontosan (hónap), ezért itt
             a járműkategória jön: ez a másik tényező, ami nélkül nem lehet
             ajánlatot kérni. */
          q: "Milyen járműről van szó?",
          help: "A díjat a kategória, a teljesítmény és az évjárat együtt határozza meg — a pontos adatok a forgalmiban vannak.",
          type: "choice",
          opts: [
            { v: "kis", label: "Személyautó, 1.4 alatt", note: "Jellemzően a legkedvezőbb díjsáv" },
            { v: "kozep", label: "Személyautó, 1.4–2.0", note: "A legnagyobb szórás itt van a biztosítók között" },
            { v: "nagy", label: "Személyautó, 2.0 felett vagy elektromos", note: "Itt érdemes külön casco-ajánlatot is kérni" },
            { v: "egyeb", label: "Motor, kisteher vagy utánfutó", note: "Külön tarifa, kevesebb biztosító" },
          ],
        },
        {
          id: "claim",
          kicker: "3. kérdés",
          q: "Volt kárügyed az elmúlt 3 évben?",
          type: "choice",
          opts: [
            { v: "no", label: "Nem, kármentes vagyok", note: "Jó bónuszfokozat, ez pénz" },
            { v: "one", label: "Egy volt", note: "Megnézzük, hogyan hat a díjra" },
            { v: "more", label: "Több", note: "Itt különösen sokat hoz az összehasonlítás" },
          ],
        },
      ],
      calc: {
        kicker: "Ajánlatkérés-előkészítő",
        title: "Mikor a határidőd, és mi kell az ajánlatkéréshez?",
        help:
          "A KGFB díját nem lehet előre megtippelni: biztosítónként más a jármű-, terület- és életkori tarifa. Amit pontosan meg lehet mondani, az a felmondási határidő — a díj konkrét ajánlatokból jön.",
        inputs: [
          {
            key: "month",
            label: "Biztosítási évfordulód hónapja",
            type: "select",
            def: 1,
            options: [
              { v: 1, label: "január", short: "január" },
              { v: 2, label: "február", short: "február" },
              { v: 3, label: "március", short: "március" },
              { v: 4, label: "április", short: "április" },
              { v: 5, label: "május", short: "május" },
              { v: 6, label: "június", short: "június" },
              { v: 7, label: "július", short: "július" },
              { v: 8, label: "augusztus", short: "augusztus" },
              { v: 9, label: "szeptember", short: "szeptember" },
              { v: 10, label: "október", short: "október" },
              { v: 11, label: "november", short: "november" },
              { v: 12, label: "december", short: "december" },
            ],
            note:
              "A kötvényeden „biztosítási időszak kezdete” néven szerepel. Ha 2010 után kötötted, jellemzően nem január 1.",
          },
          {
            key: "bonus",
            label: "Bónusz-malusz fokozatod",
            type: "select",
            def: "B4",
            options: [
              { v: "M04", label: "M04 — malusz", short: "M04" },
              { v: "M03", label: "M03 — malusz", short: "M03" },
              { v: "M02", label: "M02 — malusz", short: "M02" },
              { v: "M01", label: "M01 — malusz", short: "M01" },
              { v: "A00", label: "A00 — alapfokozat, új szerződés", short: "A00" },
              { v: "B1", label: "B1 — 1 kármentes év", short: "B1" },
              { v: "B2", label: "B2 — 2 kármentes év", short: "B2" },
              { v: "B3", label: "B3 — 3 kármentes év", short: "B3" },
              { v: "B4", label: "B4 — 4 kármentes év", short: "B4" },
              { v: "B5", label: "B5 — 5 kármentes év", short: "B5" },
              { v: "B6", label: "B6 — 6 kármentes év", short: "B6" },
              { v: "B7", label: "B7 — 7 kármentes év", short: "B7" },
              { v: "B8", label: "B8 — 8 kármentes év", short: "B8" },
              { v: "B9", label: "B9 — 9 kármentes év", short: "B9" },
              { v: "B10", label: "B10 — 10+ kármentes év, maximum", short: "B10" },
            ],
            note: "A fokozat a tiéd, nem a biztosítóé: váltásnál átvisszük. A hozzá tartozó kedvezmény mértékét viszont minden biztosító a saját tarifájában határozza meg — ezért érdemes összehasonlítani.",
          },
          { key: "current", label: "Jelenlegi éves KGFB díjad", type: "slider", min: 20000, max: 300000, step: 5000, def: 85000, unit: "Ft" },
          {
            key: "casco",
            label: "Casco is kell?",
            type: "chips",
            def: "reszleges",
            options: [
              { v: "nem", label: "Csak KGFB" },
              { v: "reszleges", label: "Részleges" },
              { v: "teljes", label: "Teljes casco" },
            ],
            note: "A casco lehet más biztosítónál, mint a KGFB — néha épp így jön ki a legjobb kombináció.",
          },
        ],
        compute(v) {
          /* A FOKOZAT jogszabályi (21/2011. NGM rendelet: A00, B01–B10,
             M01–M04), a hozzá tartozó kedvezmény/pótlék MÉRTÉKE viszont a
             biztosító tarifájában van — ezért százalékot itt szándékosan nem
             írunk ki, csak a besorolás irányát. */
          const CASCO = { nem: "nem kér casco ajánlatot", reszleges: "részleges casco", teljes: "teljes casco" };
          const malus = /^M/.test(v.bonus);
          const years = malus ? 0 : v.bonus === "A00" ? 0 : parseInt(v.bonus.slice(1), 10);
          const bmText = malus
            ? "pótlék (káros évek miatt)"
            : v.bonus === "A00"
            ? "alapfokozat, még nincs kedvezmény"
            : years + " kármentes év → kedvezmény";

          /* Az évfordulót megelőző 30. nap a felmondás beérkezési határideje
             (2009. évi LXII. tv. 21. §). A következő ilyen dátumot keressük. */
          const now = new Date();
          let anniv = new Date(now.getFullYear(), v.month - 1, 1);
          let deadline = new Date(anniv.getTime() - 30 * 864e5);
          if (deadline < now) {
            anniv = new Date(now.getFullYear() + 1, v.month - 1, 1);
            deadline = new Date(anniv.getTime() - 30 * 864e5);
          }
          const days = Math.max(0, Math.ceil((deadline - now) / 864e5));
          const dstr = deadline.toLocaleDateString("hu-HU", { year: "numeric", month: "long", day: "numeric" });
          const annivStr = anniv.toLocaleDateString("hu-HU", { year: "numeric", month: "long", day: "numeric" });
          const annivMonth =
            anniv.getFullYear() + ". " + anniv.toLocaleDateString("hu-HU", { month: "long" });

          return {
            big: dstr,
            bigSmall: true,
            bigLabel: "eddig kell beérkeznie a felmondásnak",
            caption: `Még ${days} nap. Az évfordulód ${annivStr}, és a felmondásnak az azt megelőző 30. napig meg kell érkeznie a biztosítóhoz.`,
            rows: [
              ["Évfordulós hónap", annivMonth],
              ["Hátralévő idő a felmondásig", days + " nap"],
              ["Bónusz-malusz fokozat", v.bonus + " — " + bmText],
              ["Jelenlegi éves díjad (viszonyítási alap)", ft(v.current)],
              ["Casco igény", CASCO[v.casco]],
            ],
            total: ["Összehasonlítandó ajánlatok", "a hazai KGFB-piac egésze"],
            note:
              "Ez szándékosan nem díjkalkuláció: a tényleges díjat a jármű adatai (teljesítmény, kor), a bónuszfokozat, valamint az üzembentartó életkora és lakóhelye alapján a biztosítók határozzák meg — a fokozathoz tartozó kedvezmény mértéke is a biztosító tarifájában van, nem jogszabályban. Ezeket az adatokat az összehasonlítható ajánlatokhoz kérem majd el." +
              (malus ? " Malusz besorolásnál különösen nagy a szórás a biztosítók között, itt hozhat a legtöbbet az összehasonlítás." : ""),
          };
        },
      },
    },
    faq: [
      { q: "Elveszítem a bónuszomat, ha váltok?", a: "Nem. A bónuszfokozat a tiéd, átvihető az új biztosítóhoz — pont ezért érdemes a kármentes éveket kihasználni és nem félni a váltástól." },
      { q: "Lehet a casco más biztosítónál, mint a KGFB?", a: "Igen, teljesen szabadon. Sokszor épp ez adja a legjobb kombinációt, bár van, ahol a kettő együtt kedvezményt hoz — ezt ajánlatonként nézzük." },
      { q: "Mi van, ha lekéstem a 30 napos határidőt?", a: "Akkor a szerződés egy évvel prolongálódik, de vannak évközi kivételek (pl. autócsere, díjnemfizetés miatti megszűnés). Írj rá, megnézzük mi a helyzet a te esetedben." },
      { q: "Mit jelent az önrész a cascónál?", a: "A kár azon részét, amit te állsz. Alacsonyabb önrész magasabb díjat jelent — a kérdés az, mekkora kárt bírsz el saját erőből. Ezt érdemes tudatosan választani, nem véletlenül megkapni." },
    ],
    legal:
      "A közvetítés bejegyzett közvetítőként, több partnerbiztosító ajánlatának összehasonlításával történik (a közvetítő adatai az impresszumban). A szerződés a biztosító és Ön között jön létre; a díjat és a feltételeket a biztosító határozza meg.",
  },

  /* 4 ------------------------------------------------------------------ */
  {
    slug: "adokedvezmeny-gyerek-no",
    cat: "ado",
    icon: I.family,
    title: "20% adókedvezmény a gyerekek és a nők kiadásaiból",
    navTitle: "20% gyerek- és nőgyógyászati kiadás",
    badge: "20% állami",
    metric: "max. 150 000 Ft / év",
    hook: "Szemüveg, tanszer, iskolakezdés, babaápolási termékek, nőgyógyászat, gyógyszer. Ezeket a család amúgy is kifizeti — a különbség csak az, hogy honnan.",
    seo: {
      title: "20% adókedvezmény gyerek- és női kiadásokra 2026 — egészség- és önsegélyező pénztár",
      desc: "Egészség- és önsegélyező pénztár 2026: 20% adójóváírás max. 150 000 Ft-ig, iskolakezdési támogatás gyermekenként, gyógyszer, szemüveg, nőgyógyászat. Számold ki.",
    },
    facts: [
      { v: "150 000 Ft", l: "maximális éves adójóváírás (a befizetés 20%-a)" },
      { v: "a család", l: "a közeli hozzátartozók kiadásai is elszámolhatók" },
      { v: "322 800 Ft", l: "az iskolakezdési keret a minimálbérhez van kötve (2026)" },
    ],
    intro:
      "Ez a kedvezmény az egészség- és önsegélyező pénztárakon keresztül működik. Beteszed a pénzt, a NAV visszaad belőle 20%-ot, te pedig olyan kiadásokra használod, amiket a családod egyébként is fizet. A gyakorlatban ez a leggyorsabban megtérülő pénzügyi lépés, amit egy család megtehet.",
    how: [
      { h: "Gyerekekkel kapcsolatos kiadások", t: "Iskolakezdési támogatás gyermekenként (2026-ban a havi bruttó minimálbér, azaz 322 800 Ft erejéig évente), gyermekszemüveg, gyógyszer, fogszabályzó, gyermekgyógyászat, babaápolási termékek." },
      { h: "Női kiadások", t: "Nőgyógyászati vizsgálatok, terhesgondozás, szűrések, gyógyszerek, gyógyászati segédeszközök, szülés körüli szolgáltatások." },
      { h: "Hogyan jön a 20%", t: "Az adott évben befizetett összeg 20%-át a NAV a pénztári számládra írja jóvá, legfeljebb évi 150 000 Ft-ot. A jóváíráshoz szja-fizetés kell." },
      { h: "Rokonok is hozzáférnek", t: "A pénztári kártya jellemzően a közeli hozzátartozók (gyerek, szülő, házastárs) kiadásaira is használható — ezért működik ez család szintjén, nem csak egyénileg." },
    ],
    bullets: [
      "van gyereked, és évente veszel tanszert, szemüveget, gyógyszert",
      "rendszeres nőgyógyászati vagy terhesgondozási kiadásod van",
      "fizetsz szja-t, tehát a 20% jóváírás jár neked",
      "eddig kártyáról fizetted ezeket, adóelőny nélkül",
    ],
    funnel: {
      steps: [
        {
          id: "kids",
          kicker: "1. kérdés",
          q: "Hány gyereket nevelsz?",
          type: "choice",
          opts: [
            { v: 0, label: "Nincs (még)", note: "A női és általános egészségkiadások így is elszámolhatók" },
            { v: 1, label: "1 gyerek", note: "Iskolakezdés + gyermekgyógyászat" },
            { v: 2, label: "2 gyerek", note: "Gyermekenként külön keret" },
            { v: 3, label: "3 vagy több", note: "Itt a legnagyobb a kihasználható keret" },
          ],
        },
        {
          id: "spend",
          kicker: "2. kérdés",
          q: "Mire mennek el a legnagyobb összegek?",
          type: "choice",
          multi: true,
          opts: [
            { v: "school", label: "Tanszer, iskolakezdés" },
            { v: "glasses", label: "Szemüveg, kontaktlencse" },
            { v: "med", label: "Gyógyszer, vitamin" },
            { v: "dental", label: "Fogászat, fogszabályzó" },
            { v: "gyn", label: "Nőgyógyászat, terhesgondozás" },
            { v: "baby", label: "Babaápolási termékek" },
          ],
        },
        {
          id: "have",
          kicker: "3. kérdés",
          q: "Van már egészségpénztári tagságod?",
          type: "choice",
          opts: [
            { v: "no", label: "Nincs", note: "Nulláról indulunk, nincs várakozási idő" },
            { v: "yes-unused", label: "Van, de nem használom", note: "Ez a leggyakoribb — kihasználatlan keret" },
            { v: "yes-used", label: "Van és használom", note: "Megnézzük, maxolod-e a 150 ezret" },
          ],
        },
      ],
      calc: {
        kicker: "Adójóváírás-kalkulátor",
        title: "Mennyit kapsz vissza a család egészségkiadásaiból?",
        help:
          "A 20% jóváírásnak két korlátja van: az évi 150 000 Ft plafon, és a saját befizetett szja-d. Amelyik kisebb, az számít.",
        inputs: [
          { key: "monthly", label: "Havi pénztári befizetés", type: "slider", min: 5000, max: 65000, step: 2500, def: 25000, unit: "Ft" },
          {
            key: "tax",
            label: "Éves szja-fizetésed",
            type: "slider",
            min: 0,
            max: 1500000,
            step: 25000,
            def: 600000,
            unit: "Ft",
            note:
              "Nagyságrendileg a bruttó béred 15%-a. Családi kedvezménnyel viszont sokkal kevesebb — ha nullára levitted, nincs miből visszaadni.",
          },
          {
            key: "kids",
            label: "Gyerekek száma",
            type: "chips",
            options: [0, 1, 2, 3],
            def: 2,
            unit: " fő",
            note: "A gyerekek nem a jóváírást növelik, hanem az elszámolható kiadásokat: szemüveg, fogszabályzó, gyógyszer.",
          },
        ],
        compute(v) {
          const yearly = v.monthly * 12;
          const raw = yearly * 0.2;
          const credit = Math.min(raw, MAX_HEALTH_FUND, v.tax);
          const limitedBy =
            credit === v.tax && v.tax < Math.min(raw, MAX_HEALTH_FUND)
              ? "szja"
              : raw > MAX_HEALTH_FUND
              ? "plafon"
              : null;
          return {
            big: ft(credit),
            bigLabel: "adójóváírás évente",
            caption:
              limitedBy === "szja"
                ? `A befizetésed 20%-a ${ft(raw)} lenne, de csak annyit lehet visszakapni, amennyi szja-t befizettél: ${ft(v.tax)}.`
                : limitedBy === "plafon"
                ? `A befizetésed 20%-a ${ft(raw)} lenne, de a törvényi plafon évi ${ft(MAX_HEALTH_FUND)}.`
                : `Évi ${ft(yearly)} befizetésre ennyi jár vissza — olyan kiadásokra, amiket amúgy is fizetsz.`,
            rows: [
              ["Éves befizetés", ft(yearly)],
              ["Ebből 20%", ft(raw)],
              ["Törvényi plafon", ft(MAX_HEALTH_FUND)],
              ["Befizetett szja korlátja", ft(v.tax)],
              [`Elszámolható kiadás ${v.kids} gyerekkel`, v.kids > 0 ? "a család egésze" : "csak a tiéd"],
              ["10 év alatt visszakapott adó", ft(credit * 10)],
            ],
            total: ["Tényleges éves jóváírás", ft(credit)],
            note:
              "A jóváírást a NAV a pénztári számlára utalja, tehát újra elszámolható kiadásra fordítható. Az elszámolható szolgáltatások körét jogszabály és a pénztár szabályzata határozza meg; a számítás tájékoztató jellegű.",
          };
        },
      },
    },
    faq: [
      { q: "Ez tényleg ingyen pénz?", a: "Nem ingyen — a saját pénzedet teszed be. A trükk az, hogy olyan kiadásokra teszed be, amiket amúgy is kifizetnél, és ezért a NAV visszaad 20%-ot. Ha a keretet elhasználod, a megtérülés azonnali." },
      { q: "Mi van, ha nem használom el az évi befizetést?", a: "A pénztári egyenleg nem veszik el, átfordul a következő évre. Így akár nagyobb kiadásra (fogszabályzó, szemüveg) is gyűjthetsz." },
      { q: "Kell hozzá munkáltatói hozzájárulás?", a: "Nem, egyéni befizetéssel is működik. Ha a munkáltatód is ad, az plusz, de nem előfeltétel." },
      { q: "A férjem kártyájáról fizethetjük a gyerek szemüvegét?", a: "Jellemzően igen, a közeli hozzátartozók kiadásai elszámolhatók. A pontos kört a pénztár szabályzata rögzíti, ezt együtt nézzük meg." },
    ],
    legal:
      "Az elszámolható szolgáltatások körét és a jóváírás feltételeit jogszabály, valamint az adott pénztár szabályzata határozza meg. A számítás tájékoztató jellegű.",
  },

  /* 5 ------------------------------------------------------------------ */
  {
    slug: "adokedvezmeny-lakashitel",
    cat: "ado",
    icon: I.house,
    title: "20% adókedvezmény a lakáshitel törlesztésére",
    navTitle: "20% lakáshitel-törlesztés",
    badge: "20% állami",
    metric: "akár 232 000 Ft / év két adóssal",
    hook: "A lakáshiteledet úgy is törlesztheted, hogy közben a NAV visszaad 20%-ot a befizetésből. Ugyanaz a törlesztő, kevesebb saját pénz.",
    seo: {
      title: "Lakáshitel-törlesztés 20% adókedvezménnyel 2026 — önsegélyező pénztár",
      desc: "2026-ban havi 48 420 Ft-ig fordítható önsegélyező pénztári megtakarítás lakáshitel-törlesztésre, 20% adójóváírással. Adóstárssal duplázható. Számold ki.",
    },
    facts: [
      { v: "48 420 Ft", l: "havi maximum törlesztésre (a minimálbér 15%-a, 2026)" },
      { v: "~116 000 Ft", l: "éves adójóváírás egy pénztártagnál" },
      { v: "2×", l: "adóstárssal a kedvezmény duplázható" },
    ],
    intro:
      "Ez a lehetőség önsegélyező pénztáron keresztül működik: befizetsz, kapsz rá 20% adójóváírást, majd a pénztár a lakáshitelt törleszti belőle. A törlesztőd nem lesz kevesebb — de az, amit te tesz bele, igen. Sok családnál ez a legegyszerűbben megszerezhető évi százezres tétel.",
    how: [
      { h: "Befizetés → 20% jóváírás", t: "Az önsegélyező pénztárba befizetett összeg 20%-át a NAV jóváírja a számládon (a pénztári kereteken belül)." },
      { h: "A pénztár törleszt", t: "A megtakarításból lakáshitel-törlesztésre 2026-ban havonta legfeljebb 48 420 Ft fordítható — ez a január 1-jén érvényes havi bruttó minimálbér 15%-a." },
      { h: "Mikortól használható", t: "A várakozási időt és az elszámolható szolgáltatások körét az adott pénztár szabályzata rögzíti — belépés előtt ezt együtt olvassuk el, mert pénztáronként különbözik." },
      { h: "Adóstárssal duplázható", t: "Ha az adóstárs is pénztártag és igénybe veszi, a kedvezmény összege megduplázható — így családi szinten évi 232 ezer forint körüli tétel is elérhető." },
    ],
    bullets: [
      "van élő lakáshitelt vagy lakáscélú kölcsönöd",
      "fizetsz szja-t (ez a jóváírás feltétele)",
      "az adóstársad is bevonható a konstrukcióba",
      "eddig csak sima átutalással törlesztettél",
    ],
    funnel: {
      steps: [
        {
          id: "hasLoan",
          kicker: "1. kérdés",
          q: "Van élő lakáshiteled?",
          type: "choice",
          opts: [
            { v: "yes", label: "Igen, törlesztem", note: "Ez a konstrukció neked szól" },
            { v: "soon", label: "Most veszem fel", note: "Egyből így indulhat" },
            { v: "no", label: "Nincs", note: "Akkor más pénztári szolgáltatás lehet érdekes" },
          ],
        },
        {
          id: "codebtor",
          kicker: "2. kérdés",
          q: "Van adóstárs a hitelben?",
          help: "Ha igen, a kedvezmény duplázható.",
          type: "choice",
          opts: [
            { v: 2, label: "Igen", note: "Kétszeres keret" },
            { v: 1, label: "Nincs, egyedül vagyok adós", note: "Egyszeres keret" },
          ],
        },
        {
          id: "tax",
          kicker: "3. kérdés",
          q: "Fizetsz személyi jövedelemadót?",
          help: "A 20% jóváíráshoz szja-fizetés kell.",
          type: "choice",
          opts: [
            { v: "yes", label: "Igen", note: "Rendben, jár a jóváírás" },
            { v: "partial", label: "Kedvezményt veszek igénybe", note: "Megnézzük, mennyi adó marad" },
            { v: "no", label: "Nem fizetek szja-t", note: "Ekkor a jóváírás nem érvényesíthető" },
          ],
        },
      ],
      calc: {
        kicker: "Adójóváírás-kalkulátor",
        title: "Mennyit hoz a lakáshitel-törlesztés a pénztáron keresztül?",
        help:
          "A törlesztésre fordítható havi összeg felső korlátja a minimálbér 15%-a. A jóváírás pedig annyi, amennyi szja-t befizettél — ezért kérdezem meg azt is.",
        inputs: [
          {
            key: "monthly",
            label: "Havi pénztári befizetés / fő",
            type: "slider",
            min: 10000,
            max: 48420,
            step: 1420,
            def: 48420,
            unit: "Ft",
            note: "A felső érték a 2026-os plafon: a bruttó minimálbér 15%-a, 48 420 Ft.",
          },
          {
            key: "people",
            label: "Pénztártagok a hitelben",
            type: "chips",
            options: [1, 2],
            def: 2,
            unit: " fő",
            note: "Ha mindkét adós pénztártag, a keret és a jóváírás is duplázódik.",
          },
          { key: "tax", label: "Éves szja-fizetés / fő", type: "slider", min: 0, max: 1500000, step: 25000, def: 600000, unit: "Ft" },
          { key: "years", label: "Hátralévő hitelidő", type: "slider", min: 1, max: 25, step: 1, def: 15, unit: "év" },
        ],
        compute(v) {
          const yearlyPer = v.monthly * 12;
          const rawPer = yearlyPer * 0.2;
          const creditPer = Math.min(rawPer, MAX_HEALTH_FUND, v.tax);
          const credit = creditPer * v.people;
          const capped = rawPer > Math.min(MAX_HEALTH_FUND, v.tax);
          return {
            big: ft(credit),
            bigLabel: "adójóváírás évente",
            caption: `Havi ${ft(v.monthly)} befizetéssel ${v.people === 2 ? "két adóssal" : "egyedül"} ennyi adót kapsz vissza évente, miközben a hitel ugyanúgy csökken.${capped ? " (A jóváírást a plafon vagy a befizetett szja vágja le.)" : ""}`,
            rows: [
              ["Törlesztésre fordítható (fő / hó)", ft(v.monthly)],
              ["Éves befizetés összesen", ft(yearlyPer * v.people)],
              ["Jóváírás / fő", ft(creditPer)],
              ["Jóváírás összesen / év", ft(credit)],
              [`${v.years} év alatt visszakapott adó`, ft(credit * v.years)],
            ],
            total: ["Hátralévő hitelidő alatt összesen", ft(credit * v.years)],
            note:
              "A törlesztő összege nem változik: a pénz egy részét a pénztár fizeti, amiből 20%-ot az állam adott — ugyanahhoz a törlesztéshez kevesebb saját pénz kell. Az önsegélyező pénztári szolgáltatások körét jogszabály és a pénztár szabályzata határozza meg; a számítás tájékoztató jellegű.",
          };
        },
      },
    },
    faq: [
      { q: "Ez csökkenti a törlesztőrészletemet?", a: "Nem közvetlenül. A törlesztő ugyanannyi marad, de a pénz egy részét a pénztár fizeti, amiből 20%-ot az állam adott. Vagyis ugyanahhoz a törlesztéshez kevesebb saját pénz kell." },
      { q: "Bármelyik lakáshitelre működik?", a: "Lakáscélú hitelekre, a pénztári szabályzat és a jogszabály keretei között. A konkrét szerződésedet meg kell nézni — ez egy 10 perces feladat." },
      { q: "Mi van, ha előbb kifizetem a hitelt?", a: "Akkor a pénztári egyenleg megmarad és más elszámolható célra használható (egészségügyi kiadás, iskolakezdés stb.), tehát nem veszik el." },
      { q: "Kombinálható a nyugdíjcélú kedvezménnyel?", a: "Igen, a limitek külön futnak. Épp ezért érdemes egyszerre nézni a nyugdíj- és a pénztári keretet — így jön ki a maximum." },
    ],
    legal:
      "Az önsegélyező pénztári szolgáltatások körét és korlátait jogszabály, valamint a pénztár szabályzata határozza meg. A számítás tájékoztató jellegű.",
  },

  /* 6 ------------------------------------------------------------------ */
  {
    slug: "gyerek-megtakaritas",
    cat: "megtakaritas",
    icon: I.gift,
    /* A H1 a keresett kifejezéssel; a kártyán és a menüben marad a rövid név. */
    h1: "Gyerek-megtakarítás",
    title: "Gyerek-megtakarítás",
    navTitle: "Gyerek-megtakarítás",
    badge: "18 évre tervezve",
    metric: "havi 20 e Ft → ~7,9 M Ft",
    hook: "18 év alatt a havi 20 ezer forintból is komoly induló vagyon lesz. A kérdés nem az, hogy megéri-e, hanem hogy mekkora összeggel és mikor kezded.",
    seo: {
      title: "Gyerek-megtakarítás 2026 — mennyi lesz belőle 18 éves korra?",
      desc: "Havi 20 000 Ft-ból 18 év alatt 7,2–7,9 millió forint — már a termék tényleges költségei után. Számold ki a saját összegeddel.",
    },
    facts: [
      { v: "18 év", l: "ennyi idő alatt dolgozik igazán a kamatos kamat" },
      { v: "~7,9 M Ft", l: "havi 20 000 Ft-ból, 9%-os hozamfeltevéssel, költségek után" },
      { v: "8–9%", l: "bruttó hozamfeltevés; a kalkulátor ebből vonja le a valós költséggörbét" },
    ],
    intro:
      "A gyerekre szánt megtakarításnál 18 év a táv — ez az az időhorizont, ahol a kamatos kamat igazán dolgozik, és ahol egy rendszeres díjas megtakarítási program kezdeti költségei bőven megtérülnek. A lenti kalkulátor nem elméleti kamatos kamattal számol: egy tényleges program visszafejtett költséggörbéjét használja, tehát ami ott megjelenik, az már a levonások utáni összeg.",
    how: [
      { h: "Rendszeres, hosszú távú program", t: "Havi fix összeg, 18 éves távra. A hozam nem garantált, cserébe a részvény- és kötvényalapok hosszú távon érdemben többet hoznak, mint a bankbetét. A 18 év pont az a táv, ahol ez a kockázat a leginkább kisimul." },
      { h: "A költség nem elhanyagolható", t: "Az első két-három év díjaiból jelentős rész megy kezdeti költségre — ezért nem szabad elméleti kamatos kamattal számolni. A kalkulátor ezt beleszámolja, és a hosszabb távon jóváírt hűségbónuszokat is." },
      { h: "Rugalmasság és fegyelem", t: "A díj csökkenthető vagy szüneteltethető, de a program logikája a kitartásra épül: a korai megszüntetés az, ami valóban sokba kerül. Ezért a havi összeget úgy állítjuk be, hogy egy szűkebb évben is tartható legyen." },
      { h: "Kire szól a pénz", t: "Fontos döntés, hogy a megtakarítás a gyerek nevén van-e (18 évesen automatikusan hozzájut) vagy a tiéden (te döntesz a kiadásról). Ez nem technikai részlet, hanem nevelési kérdés is." },
    ],
    bullets: [
      "van gyereked vagy útban van",
      "nagyszülő vagy, és a unokára szeretnél félretenni",
      "azt akarod, hogy 18–20 évesen ne nulláról induljon",
      "tudni akarod, mennyi marad a költségek után — nem a brosúrában szereplő bruttó hozamot",
    ],
    funnel: {
      steps: [
        {
          id: "age",
          kicker: "1. kérdés",
          q: "Hány éves a gyerek?",
          type: "choice",
          opts: [
            { v: 0, label: "Még nem született / 0–2 év", note: "Maximális idő, maximális kamatos kamat" },
            { v: 5, label: "3–7 év", note: "Még 11–15 év van hátra" },
            { v: 10, label: "8–12 év", note: "Közepes táv, nagyobb havi összeg kell" },
            { v: 15, label: "13–17 év", note: "Rövid táv: biztonságos formák" },
          ],
        },
        {
          id: "purpose",
          kicker: "2. kérdés",
          q: "Mire szánod?",
          type: "choice",
          opts: [
            { v: "study", label: "Tanulás, egyetem", note: "18–22 éves korra kell" },
            { v: "start", label: "Önálló élet indulás", note: "Lakás önerő, autó" },
            { v: "free", label: "Legyen és majd eldől", note: "Rugalmas felhasználás" },
          ],
        },
        {
          id: "who",
          kicker: "3. kérdés",
          q: "Kinek a nevén legyen a megtakarítás?",
          help: "A gyerek nevén lévő pénzhez 18 évesen automatikusan hozzájut.",
          type: "choice",
          opts: [
            { v: "child", label: "A gyerek nevén", note: "18 évesen automatikusan az övé" },
            { v: "parent", label: "Az én nevemen", note: "Te döntesz a felhasználásról" },
            { v: "both", label: "Vegyesen", note: "Alap + rugalmas rész" },
          ],
        },
      ],
      calc: {
        kicker: "Gyerek-megtakarítás kalkulátor",
        title: "Mennyi lesz 18 éves korra?",
        help:
          "A számítás egy tényleges, rendszeres díjas megtakarítási program valós költséggörbéjén fut — nem elméleti kamatos kamaton. Amit itt látsz, az már a levonások utáni összeg.",
        inputs: [
          {
            key: "monthly",
            label: "Havi félretett összeg",
            type: "slider",
            min: 5000,
            max: 100000,
            step: 5000,
            def: 20000,
            unit: "Ft",
            note: "Azt az összeget állítsd be, ami egy szűkebb évben is tartható — a korai megszüntetés kerül igazán sokba.",
          },
          { key: "years", label: "Hátralévő évek 18 éves korig", type: "slider", min: 1, max: 18, step: 1, def: 16, unit: "év" },
          {
            key: "yield",
            label: "Feltételezett éves bruttó hozam",
            type: "chips",
            options: PROGRAM_YIELDS,
            def: 9,
            unit: "%",
            note: "Csak erre a két hozamszintre van visszafejtve a termék valós költséggörbéje, ezért nincs több sáv. A hozam nem garantált.",
          },
        ],
        compute(v) {
          const fv = programValue(v.monthly, v.years, v.yield);
          const own = v.monthly * 12 * v.years;
          const netGain = fv - own;
          const multiple = own > 0 ? fv / own : 0;
          /* A görbe elején a kezdeti költségek miatt a felhalmozott érték
             kevesebb, mint a befizetés — ezt ki kell mondani, nem elrejteni. */
          const early = netGain < 0;
          return {
            big: ft(fv),
            bigLabel: "várható összeg 18 éves korra",
            caption: early
              ? `Havi ${ft(v.monthly)} félretétellel, ${v.years} év alatt ez a forma még a befizetés alatt van: a kezdeti költségek ilyen rövid távon nem térülnek meg. Ekkora távra más eszköz kell — beszéljük át.`
              : `Havi ${ft(v.monthly)} félretétellel, ${v.years} év alatt, ${v.yield}% bruttó hozamfeltevéssel — a termék költségei már levonva.`,
            rows: [
              ["Saját befizetés összesen", ft(own)],
              ["Nettó hozam (költségek után)", ft(netGain)],
              ["A befizetés hányszorosa", multiple.toFixed(1).replace(".", ",") + "×"],
              ["Levont adó a futamidő alatt", "0 Ft"],
            ],
            total: ["18 éves korra összesen", ft(fv)],
            note:
              "A számítás egy konkrét, rendszeres díjas megtakarítási program visszafejtett költséggörbéjén alapul (kezdeti költség, adminisztráció, alapkezelés levonva, a hosszú távú hűségbónuszok hozzáadva), 8% és 9% bruttó hozamfeltevés mellett. A 24 évnél hosszabb távot a görbe utolsó évéből adódó nettó rátával vezetjük tovább. A hozam nem garantált, a tényleges eredmény a piactól és a választott konstrukciótól függ. Ez tájékoztató becslés, nem ajánlat.",
          };
        },
      },
    },
    faq: [
      { q: "Miért nem a szokásos kamatos kamattal számol a kalkulátor?", a: "Mert az felfelé torzít. Egy rendszeres díjas programnál az első évek díjaiból jelentős rész megy kezdeti költségre, cserébe hosszú távon hűségbónusz jár. A kalkulátor egy tényleges termék visszafejtett költséggörbéjét használja, ezért amit látsz, az már a levonások utáni összeg — nem a brosúra bruttó száma." },
      { q: "Miért csak 8% és 9% közül lehet választani?", a: "Mert csak erre a két hozamszintre van visszafejtve a termék valós költséggörbéje. Kitalálhatnék több sávot, de akkor a szám már nem a valóságon alapulna. Inkább kevesebb opció, ami viszont igaz." },
      { q: "Mi van, ha 18 éves kor előtt kell a pénz?", a: "Ez a forma a hosszú távra van kitalálva: rövid távon a kezdeti költségek nem térülnek meg, a kalkulátor ezt meg is mutatja. Ha valószínű, hogy előbb kell, akkor emellé — vagy helyette — egy rugalmasabban elérhető rész kell. Ezt együtt tervezzük." },
      { q: "Mennyi a minimum, amivel érdemes elkezdeni?", a: "Havi 10–20 ezer forinttal is működik. A nagyobb kérdés nem az összeg, hanem a folytonosság: egy kisebb, de végigvitt befizetés lényegesen többet hoz, mint egy nagy, amit pár év után abbahagysz." },
      { q: "Nagyszülőként is indíthatok ilyet?", a: "Igen, a befizetésbe bárki beszállhat. A szerződő és a kedvezményezett személyét viszont tudatosan kell megválasztani — ezt az elemző beszélgetésen vesszük végig." },
    ],
    legal:
      "A megtakarítási programok hozama nem garantált, a múltbeli hozam nem jelent ígéretet a jövőre. A kalkulátor egy konkrét termék visszafejtett költséggörbéjén alapuló tájékoztató becslés — nem ajánlat, nem hozamgarancia, és nem személyre szóló befektetési tanácsadás. Ez az oldal nem foglalkozik a Babakötvénnyel és a Start-számlával.",
  },

  /* 7 ------------------------------------------------------------------ */
  {
    slug: "baleset-biztositas",
    cat: "biztositas",
    icon: I.shield,
    title: "Baleset-biztosítás",
    navTitle: "Baleset-biztosítás",
    badge: "Napi kockázat",
    metric: "a táppénz nem a teljes bér",
    hook: "Egy csonttörés nem tragédia — a három hónap kiesett jövedelem viszont az. A baleset-biztosítás pont ezt a rést fedi le.",
    seo: {
      title: "Baleset-biztosítás 2026 — mit fedez, mennyibe kerül, mennyi térítés kell",
      desc: "Csonttörés, műtét, kórházi napi térítés, keresőképtelenség, maradandó egészségkárosodás. Nézzük meg, mekkora fedezet indokolt nálad.",
    },
    facts: [
      { v: "24 óra", l: "a legtöbb szerződés a munkán kívüli baleseteket is fedezi" },
      { v: "napi térítés", l: "kórházi napokra, gipszre, műtétre" },
      { v: "1 szerződés", l: "családi kiterjesztéssel gyerekekre is" },
    ],
    intro:
      "A baleset-biztosítás a leggyakoribb, legkisebb valószínűségű-legnagyobb hatású eseményekre ad pénzt: törés, műtét, kórházi kezelés, keresőképtelenség, maradandó egészségkárosodás. Nem vagyoni kár ellen véd, hanem az ellen, hogy a gyógyulás ideje alatt is folynak a számlák.",
    how: [
      { h: "Mit fizet", t: "Tipikusan: baleseti eredetű csonttörés, műtét, égés, kórházi napi térítés, keresőképtelenségi napi térítés, maradandó egészségkárosodás százalékos térítése, baleseti halál." },
      { h: "Kinek fontos", t: "Fizikai munkát végzőknek, sportolóknak, motorosoknak, egyéni vállalkozóknak (ahol nincs táppénz-háló), és minden családnak, ahol egy kereső kiesése azonnal érezhető." },
      { h: "Mit érdemes nézni a díj helyett", t: "A térítési táblát (mit mennyivel fizet), a kizárásokat (extrém sportok, alkoholos állapot), a várakozási időt és azt, hogy 24 órás vagy csak munkaidős fedezet-e." },
      { h: "Család egy szerződésben", t: "A legtöbb konstrukcióban a partner és a gyerekek is bevonhatók, ami jelentősen csökkenti az egy főre eső díjat." },
    ],
    bullets: [
      "fizikai munkát végzel vagy aktívan sportolsz",
      "egyéni vállalkozó vagy, és nincs mögötted táppénz-háttér",
      "gyereked sportol (a gyerekbalesetek nagy része sport közben történik)",
      "egy 2–3 hónapos kiesés azonnal megrendítené a családi kasszát",
    ],
    funnel: {
      steps: [
        {
          id: "job",
          kicker: "1. kérdés",
          q: "Mivel foglalkozol?",
          type: "choice",
          opts: [
            { v: "office", label: "Irodai / szellemi munka", note: "Alacsonyabb kockázat, alacsonyabb díj" },
            { v: "physical", label: "Fizikai munka", note: "Magasabb kockázat, itt ez a legfontosabb védelem" },
            { v: "self", label: "Egyéni vállalkozó", note: "Nincs táppénz-háló: kritikus" },
            { v: "other", label: "Egyéb / tanuló", note: "Megnézzük a konkrét helyzetet" },
          ],
        },
        {
          id: "who",
          kicker: "2. kérdés",
          q: "Kire kellene a védelem?",
          type: "choice",
          multi: true,
          opts: [
            { v: "me", label: "Rám" },
            { v: "partner", label: "A páromra" },
            { v: "kids", label: "A gyerekekre" },
          ],
        },
        {
          id: "sport",
          kicker: "3. kérdés",
          q: "Van olyan hobbid, amit a biztosítók kockázatosnak tartanak?",
          help: "Motor, síelés, küzdősport, extrém sportok, lovaglás.",
          type: "choice",
          opts: [
            { v: "no", label: "Nincs", note: "Alapfedezet elég" },
            { v: "some", label: "Van, de nem versenyszerűen", note: "Kizárásokat kell ellenőrizni" },
            { v: "yes", label: "Igen, rendszeresen", note: "Külön kiterjesztés kell" },
          ],
        },
      ],
      calc: {
        kicker: "Fedezet-kalkulátor",
        title: "Mekkora fedezet indokolt nálad?",
        help: "Nem a díjat számoljuk — azt a biztosítók adják. Azt számoljuk, mennyi bevétel esik ki, ha hónapokra kiesel.",
        inputs: [
          { key: "income", label: "Havi nettó jövedelmed", type: "slider", min: 200000, max: 2000000, step: 50000, def: 500000, unit: "Ft" },
          {
            key: "months",
            label: "Mennyi kiesést kell kibírni",
            type: "chips",
            options: [3, 6, 12],
            def: 6,
            unit: " hó",
            note: "Alkalmazottként 3–6 hónap, vállalkozóként inkább 6–12 a reális kiindulás.",
          },
          {
            key: "sick",
            label: "Ebből mennyit pótol a táppénz?",
            type: "select",
            def: 60,
            options: [
              { v: 60, label: "Alkalmazott, 2+ év biztosítási idő — kb. 60%", short: "kb. 60%" },
              { v: 50, label: "Rövidebb biztosítási idő — kb. 50%", short: "kb. 50%" },
              { v: 0, label: "Vállalkozó vagy nincs rá jogosultság — 0%", short: "0%" },
            ],
            note: "A táppénz a jövedelem egy részét pótolja, felső korláttal. A rés az, amit a biztosítás betölt.",
          },
          { key: "family", label: "Eltartott családtagok", type: "chips", options: [0, 1, 2, 3], def: 2, unit: " fő" },
        ],
        compute(v) {
          const gross = v.income * v.months;
          const covered = gross * (v.sick / 100);
          const gap = Math.max(0, gross - covered);
          const perm = v.income * 12 * (2 + v.family);
          return {
            big: ft(gap),
            bigLabel: "fedezetlen jövedelemkiesés",
            caption: `${v.months} hónap kiesés ${ft(gross)} bevételt jelent, ebből a táppénz kb. ${ft(covered)}-ot pótol. A maradék az, amit egy baleseti napi térítés és keresőképtelenségi fedezet tölt be.`,
            rows: [
              ["Havi nettó jövedelem", ft(v.income)],
              [`Kiesés ${v.months} hónap alatt`, ft(gross)],
              ["Ebből táppénz", ft(covered)],
              ["Fedezetlen rés", ft(gap)],
              ["Javasolt maradandó egészségkárosodás fedezet", ft(perm)],
            ],
            total: ["Indokolt fedezet nagyságrend", ft(perm)],
            note:
              "A maradandó egészségkárosodás fedezetét 2 éves jövedelem + eltartottanként 1 év alapján számoljuk — ez iparági ökölszabály, nem előírás. A tényleges fedezetet a foglalkozás, a hitelek, a család és a meglévő szerződések alapján állítjuk össze.",
          };
        },
      },
    },
    faq: [
      { q: "Nem elég a TB?", a: "A TB a gyógykezelést finanszírozza, a táppénz pedig a jövedelem egy részét pótolja — de nem a teljes összeget, és vállalkozóként sokszor alig valamit. A baleset-biztosítás ezt a rést tölti be." },
      { q: "Mennyibe kerül?", a: "Alapfedezet jellemzően havi pár ezer forint kategória, a díjat a foglalkozás, az életkor, a fedezeti összegek és a kiterjesztések határozzák meg. Ajánlatot több biztosítótól kérünk." },
      { q: "A sportsérülés benne van?", a: "Az alapfedezetek jellemzően a hobbiszintű sportot fedezik, a versenyszerű és extrém sportokra viszont külön kiterjesztés kell. Ez a leggyakoribb kizárási hiba." },
      { q: "Mikor fizet a biztosító?", a: "A térítési tábla szerint, a bejelentést és az orvosi dokumentáció benyújtását követően. Kárrendezésnél a te oldalán állok: segítek a bejelentésben, a dokumentumok összeállításában és végig követem az ügyet — ez az egyik legfontosabb hozzáadott érték." },
    ],
    legal:
      "A fedezetek, kizárások és térítési összegek biztosítónként különböznek, a szerződési feltételek az irányadók.",
  },

  /* 8 ------------------------------------------------------------------ */
  {
    slug: "elet-biztositas",
    cat: "biztositas",
    icon: I.heart,
    /* A H1 a keresett kifejezéssel; a kártyán és a menüben marad a rövid név. */
    h1: "Életbiztosítás — kockázati és hitelfedezeti",
    title: "Életbiztosítás",
    navTitle: "Életbiztosítás",
    badge: "Család védelme",
    metric: "hitel + jövedelem fedezete",
    hook: "Nem neked szól. Azoknak, akik utánad maradnak — és akiknek a hitel, a rezsi meg az iskola akkor is fizetni kell.",
    seo: {
      title: "Életbiztosítás 2026 — mekkora biztosítási összeg indokolt?",
      desc: "Kockázati életbiztosítás, kritikus betegség, hitelfedezet: mennyi fedezet kell a családodnak? Számold ki, majd nézzük át együtt.",
    },
    facts: [
      { v: "10×", l: "éves jövedelem — a nemzetközi ökölszabály nagyságrendje" },
      { v: "+hitel", l: "a fennálló hiteltartozás mindig rájön a fedezetre" },
      { v: "kritikus betegség", l: "kiegészítéssel élő állapotra is fizet" },
    ],
    intro:
      "Az életbiztosításnál egyetlen kérdés számít: ha holnap nem lennél, miből él tovább a család, és ki fizeti a hitelt? A jó szerződés annyit fizet, hogy erre ne kelljen válaszolni. A tisztán kockázati (nem megtakarítós) forma jellemzően sokkal nagyobb fedezetet ad ugyanannyi díjból.",
    how: [
      { h: "Kockázati életbiztosítás", t: "Fix futamidőre, fix biztosítási összegre. Nincs megtakarítási rész, ezért a díj jóformán teljes egészében fedezetre megy — ez a leghatékonyabb védelem." },
      { h: "Hitelfedezeti szerep", t: "Ha lakáshitelt vettél fel, a fennálló tartozás nagyságát mindig érdemes fedezni. Így nem az örökösök feje fölött lóg a törlesztő." },
      { h: "Kritikus betegség kiegészítés", t: "Rák, infarktus, stroke és hasonló diagnózisokra egy összegben fizet — akkor, amikor élsz, de nem tudsz dolgozni és sokba kerül a kezelés." },
      { h: "Megtakarítós vs kockázati", t: "A megtakarítást és a védelmet érdemes külön kezelni. Együtt gyakran drágább és átláthatatlanabb; külön mindkettő optimalizálható." },
    ],
    bullets: [
      "van lakáshiteled",
      "van gyereked vagy eltartottad",
      "a családi kassza rád (is) épül",
      "van már szerződésed, de nem tudod, mennyit fizet valójában",
    ],
    funnel: {
      steps: [
        {
          id: "why",
          kicker: "1. kérdés",
          q: "Mi indokolja most az életbiztosítást?",
          type: "choice",
          opts: [
            { v: "loan", label: "Lakáshitel", note: "A tartozás fedezete a minimum" },
            { v: "kids", label: "Gyerek született / fog", note: "Hosszú távú eltartási kötelezettség" },
            { v: "review", label: "Van szerződésem, felül kell vizsgálni", note: "Gyakran alulbiztosított" },
            { v: "biz", label: "Vállalkozás, üzleti kockázat", note: "Társ- vagy kulcsemberi fedezet" },
          ],
        },
        {
          id: "health",
          kicker: "2. kérdés",
          q: "Van olyan egészségi tényező, amit a biztosító kérdezni fog?",
          help: "Dohányzás, krónikus betegség, korábbi műtét. Ez a díjat és a felvételt is befolyásolja.",
          type: "choice",
          opts: [
            { v: "none", label: "Nincs, egészséges vagyok", note: "Kedvezőbb díj, gyorsabb elbírálás" },
            { v: "smoke", label: "Dohányzom", note: "Külön díjosztály" },
            { v: "chronic", label: "Van krónikus betegségem", note: "Van megoldás, csak több körös" },
          ],
        },
        {
          id: "extra",
          kicker: "3. kérdés",
          q: "Mit szeretnél még a haláleseti fedezeten túl?",
          type: "choice",
          multi: true,
          opts: [
            { v: "critical", label: "Kritikus betegség" },
            { v: "disability", label: "Rokkantság" },
            { v: "accident", label: "Baleseti kiegészítő" },
            { v: "none", label: "Csak az alap" },
          ],
        },
      ],
      calc: {
        kicker: "Fedezet-kalkulátor",
        title: "Mekkora biztosítási összeg indokolt?",
        inputs: [
          { key: "income", label: "Havi nettó jövedelmed", type: "slider", min: 200000, max: 2500000, step: 50000, def: 550000, unit: "Ft" },
          { key: "loan", label: "Fennálló hiteltartozás", type: "slider", min: 0, max: 60000000, step: 1000000, def: 20000000, unit: "Ft" },
          { key: "years", label: "Ennyi évig kell pótolni a jövedelmet", type: "slider", min: 3, max: 25, step: 1, def: 12, unit: "év" },
          {
            key: "existing",
            label: "Meglévő élet- és hitelfedezeti biztosítás",
            type: "slider",
            min: 0,
            max: 50000000,
            step: 1000000,
            def: 0,
            unit: "Ft",
            note: "Amit már fizetsz, azt le kell vonni — különben duplán fizetsz ugyanazért.",
          },
        ],
        compute(v) {
          const incomeNeed = v.income * 12 * v.years;
          const total = incomeNeed + v.loan;
          const gap = Math.max(0, total - v.existing);
          return {
            big: ft(gap),
            bigLabel: v.existing > 0 ? "hiányzó fedezet" : "javasolt biztosítási összeg",
            caption:
              v.existing > 0
                ? `A teljes indokolt fedezet ${ft(total)}, ebből ${ft(v.existing)} már megvan. Ennyi hiányzik.`
                : "Ez az az összeg, amiből a család a hitelt kifizeti, és a jövedelmed kiesését is pótolni tudja a megadott ideig.",
            rows: [
              [`Jövedelempótlás ${v.years} évre`, ft(incomeNeed)],
              ["Hiteltartozás fedezete", ft(v.loan)],
              ["Összes indokolt fedezet", ft(total)],
              ["Meglévő fedezet", ft(v.existing)],
            ],
            total: [v.existing > 0 ? "Még hiányzó összeg" : "Javasolt biztosítási összeg", ft(gap)],
            note:
              "Tájékoztató nagyságrend. Ugyanezt az összeget tisztán kockázati szerződéssel jellemzően a legkevesebb díjból lehet megvenni; a végleges összeget a megtakarítások, a család tervei és a meglévő szerződések alapján finomítjuk.",
          };
        },
      },
    },
    faq: [
      { q: "A banki hitelfedezeti biztosítás nem elég?", a: "Az jellemzően a banké és a hitelre szól, gyakran drágábban, mint egy önálló kockázati szerződés ugyanarra az összegre. Érdemes összehasonlítani — sokszor lecserélhető." },
      { q: "Meddig érdemes tartani?", a: "Addig, amíg a családod pénzügyileg rád épül: jellemzően amíg a hitel fut és a gyerekek önállóak nem lesznek. Utána a fedezet csökkenthető." },
      { q: "Dohányzom, sokkal drágább lesz?", a: "Igen, ez külön díjosztály, de nem kizáró tényező. A biztosítók között itt különösen nagy a szórás, ezért érdemes több ajánlatot kérni." },
      { q: "Megtakarítós vagy tisztán kockázati?", a: "Ha a cél a védelem, a tisztán kockázati adja a legnagyobb fedezetet a legkevesebb pénzből. Megtakarítani külön, adókedvezményes formában érdemes." },
    ],
    legal:
      "A biztosító a szerződési feltételek szerint teljesít. Az egészségi állapotra vonatkozó nyilatkozat valóságtartalma a szolgáltatás feltétele.",
  },

  /* 9 ------------------------------------------------------------------ */
  {
    slug: "egeszsegbiztositas",
    cat: "biztositas",
    icon: I.cross,
    title: "Egészségbiztosítás és magánkórházi előfizetés",
    navTitle: "Egészségbiztosítás",
    badge: "Várólista nélkül",
    metric: "TB mellé, nem helyette",
    hook: "Nem a betegség a kérdés, hanem hogy mikor kerülsz sorra. Az előfizetéses egészségbiztosítás napokat ad hónapok helyett.",
    seo: {
      title: "Magán egészségbiztosítás 2026 — magánkórházi előfizetés, várólista nélkül",
      desc: "Járóbeteg-ellátás, labor, diagnosztika, magánkórházi hátterű előfizetés 2026-ban. Mit fedez, mennyibe kerül, mikor éri meg a zsebből fizetés helyett.",
    },
    facts: [
      { v: "TB + magán", l: "a magánellátás a TB mellé jön, nem helyette" },
      { v: "napok", l: "hónapos várólisták helyett" },
      { v: "1,18 × 28%", l: "a munkáltató által fizetett díj adóterhe egyes meghatározott juttatásként (15% szja + 13% szocho)" },
    ],
    intro:
      "Az egészségbiztosítás ma leginkább előfizetésként működik: havi, féléves vagy éves díjat fizetsz, és ezért egy szolgáltatói hálózatban gyorsan hozzájutsz szakorvoshoz, laborhoz és diagnosztikához — jellemzően éves limitig vagy korlátlan használattal. A cél nem a luxus, hanem az idő.",
    how: [
      { h: "Mit tartalmaz jellemzően", t: "Járóbeteg-szakellátás, laborvizsgálatok, képalkotó diagnosztika (ultrahang, MR, CT), szűrőprogramok, second opinion, esetenként műtéti és fekvőbeteg-ellátás." },
      { h: "Magánkórházi háttér", t: "A bővebb csomagok fekvőbeteg-ellátást is fedeznek. Sürgős állami felvétel után, stabil állapotban több konstrukcióban kérhető az áthelyezés magánintézménybe." },
      { h: "Előfizetés vs zsebből fizetés", t: "Ha évente 2–3 szakorvosi vizit + 1 diagnosztika összejön, a legtöbb esetben az előfizetés már kijön kedvezőbben — és nem akkor kell dönteni a pénzről, amikor beteg vagy." },
      { h: "Adózás", t: "Ha a munkáltató fizeti, egyes meghatározott juttatásként a díj 1,18-szorosa után 15% szja és 13% szocho terheli (2026). Magánszemélyként kötve más a kezelés, csoportos és céges konstrukcióban pedig ismét más. A döntés előtt ezt tisztázni kell." },
    ],
    bullets: [
      "hónapokat vártál már szakorvosi időpontra",
      "évente többször fordulsz orvoshoz, és zsebből fizetsz",
      "gyerekkel jársz gyakran szakrendelésre",
      "vállalkozóként a kiesett idő közvetlenül pénz",
    ],
    funnel: {
      steps: [
        {
          id: "who",
          kicker: "1. kérdés",
          q: "Kinek kellene?",
          type: "choice",
          opts: [
            { v: "me", label: "Nekem", note: "Egyéni csomag" },
            { v: "family", label: "Az egész családnak", note: "Családi konstrukció, kedvezőbb fejenkénti díj" },
            { v: "kids", label: "Főleg a gyerekeknek", note: "Gyermek-szakrendelés a leggyakoribb igény" },
            { v: "company", label: "Cégen keresztül a csapatnak", note: "Munkáltatói csomag" },
          ],
        },
        {
          id: "need",
          kicker: "2. kérdés",
          q: "Mi a legfontosabb szolgáltatás?",
          type: "choice",
          multi: true,
          opts: [
            { v: "spec", label: "Szakorvosi vizsgálat" },
            { v: "diag", label: "Diagnosztika (MR, CT, UH)" },
            { v: "lab", label: "Labor, szűrés" },
            { v: "surgery", label: "Műtét, kórházi ellátás" },
            { v: "tele", label: "Telemedicina, gyors konzultáció" },
          ],
        },
        {
          id: "freq",
          kicker: "3. kérdés",
          q: "Évente kb. hányszor fordulsz orvoshoz?",
          type: "choice",
          opts: [
            { v: 1, label: "1–2 alkalom", note: "Alapcsomag is elég lehet" },
            { v: 4, label: "3–5 alkalom", note: "Itt már tipikusan megtérül" },
            { v: 8, label: "6 vagy több", note: "Bővebb csomag vagy korlátlan használat" },
          ],
        },
      ],
      calc: {
        kicker: "Összehasonlítás",
        title: "Előfizetés vagy zsebből — melyik jön ki jobban?",
        help: "Ugyanaz az ellátás, kétféle fizetési mód. A számítás a te tényleges igénybevételedre vetíti.",
        inputs: [
          { key: "visits", label: "Szakorvosi vizit / év", type: "slider", min: 0, max: 20, step: 1, def: 4, unit: " db" },
          { key: "visitCost", label: "Egy vizit átlagos díja", type: "slider", min: 12000, max: 60000, step: 2000, def: 26000, unit: "Ft" },
          {
            key: "diag",
            label: "Diagnosztika / év (labor, UH, MR)",
            type: "chips",
            options: [0, 1, 2, 3],
            def: 1,
            unit: " db",
            note: "Egy vizsgálati csomaggal kb. 55 000 Ft-tal számolunk.",
          },
          {
            key: "fee",
            label: "Előfizetés / csomag havi díja",
            type: "slider",
            min: 5000,
            max: 60000,
            step: 2500,
            def: 18000,
            unit: "Ft",
            note: "Ide a konkrét ajánlat díját írd be — a piaci sáv nagyon széles, a csomag tartalma dönt.",
          },
          { key: "people", label: "Hány főre", type: "chips", options: [1, 2, 3, 4], def: 1, unit: " fő" },
        ],
        compute(v) {
          const DIAG = 55000;
          const perPerson = v.visits * v.visitCost + v.diag * DIAG;
          const outOfPocket = perPerson * v.people;
          const subscription = v.fee * 12 * v.people;
          const diff = outOfPocket - subscription;
          const better = diff > 0;
          return {
            big: ft(Math.abs(diff)),
            bigLabel: better ? "ennyivel kerül kevesebbe az előfizetés" : "ennyivel drágább az előfizetés",
            caption: better
              ? `A te igénybevételednél az előfizetés kifizeti magát: ${ft(outOfPocket)} helyett ${ft(subscription)}.`
              : `Ennyi vizit mellett a zsebből fizetés még kedvezőbb (${ft(outOfPocket)} vs. ${ft(subscription)}). A pluszért viszont időt és kiszámíthatóságot kapsz — ez az, amit forintban nem lehet leírni.`,
            rows: [
              [`Szakorvosi vizitek (${v.visits} db / fő)`, ft(v.visits * v.visitCost)],
              [`Diagnosztika (${v.diag} db / fő)`, ft(v.diag * DIAG)],
              [`Zsebből fizetve, ${v.people} főre`, ft(outOfPocket)],
              [`Előfizetéssel, ${v.people} főre`, ft(subscription)],
              ["Fordulópont: ennyi vizitnél egyenlő", v.visitCost > 0 ? Math.ceil((v.fee * 12 - v.diag * DIAG) / v.visitCost) + " db / év" : "—"],
            ],
            total: [better ? "Éves megtakarítás" : "Éves ráfizetés", ft(Math.abs(diff))],
            note:
              "A vizitárak piaci átlagon alapuló tájékoztató értékek, intézményenként jelentősen szórnak. A várakozási időket, kizárásokat és limiteket a szerződési feltételek tartalmazzák; a díj adóterhelése a konstrukciótól függ.",
          };
        },
      },
    },
    faq: [
      { q: "Ez helyettesíti a TB-t?", a: "Nem, mellé jön. A TB-t továbbra is fizeted, a magánbiztosítás a hozzáférést és a komfortot javítja — leginkább az időt rövidíti le." },
      { q: "Meglévő betegségre is fizet?", a: "A szerződéskötés előtt fennálló állapotokra jellemzően kizárás vagy várakozási idő van. Ezért érdemes akkor kötni, amikor nincs aktuális probléma." },
      { q: "Mennyi a várakozási idő?", a: "Szolgáltatásonként különbözik, jellemzően pár héttől néhány hónapig. A szűrések és a járóbeteg-ellátás rendszerint gyorsabban indul, a műtéti fedezet lassabban." },
      { q: "Céges keretben jobb?", a: "Adózási szempontból gyakran igen, és csoportos konstrukcióban a díj is kedvezőbb lehet. Ha vállalkozó vagy, ezt érdemes végigszámolni." },
    ],
    legal:
      "A szolgáltatási kör, a limitek, a várakozási idők és a kizárások biztosítónként különböznek. A díj adóterhelése az adott konstrukciótól függ.",
  },

  /* 10 ----------------------------------------------------------------- */
  {
    slug: "tamogatott-hitelek",
    cat: "hitel",
    icon: I.house,
    /* A H1 a keresett kifejezéssel; a kártyán és a menüben marad a rövid név. */
    h1: "Otthon Start és támogatott lakáshitelek",
    title: "Támogatott hitelek",
    navTitle: "Támogatott hitelek",
    badge: "Fix 3%",
    metric: "max. 50 M Ft, 25 év",
    hook: "Az Otthon Start fix 3%-a nem akció, hanem jogszabály. A kérdés csak az, hogy megfelelsz-e a feltételeknek — és ezt 10 perc alatt kiderítjük.",
    seo: {
      title: "Otthon Start és támogatott hitelek 2026 — fix 3%, max. 50 millió Ft",
      desc: "Otthon Start Program 2026: fix 3% kamat, max. 50 millió Ft, 25 év futamidő, első lakás, TB-jogviszony feltétel. Nézzük meg, jogosult vagy-e.",
    },
    facts: [
      { v: "3%", l: "fix kamat a teljes futamidőn" },
      { v: "50 M Ft", l: "maximális hitelösszeg" },
      { v: "25 év", l: "maximális futamidő" },
    ],
    intro:
      "A támogatott hitelek kamata jogszabályban rögzített, ezért drámaian alacsonyabb a piacinál. A 2026-ban futó Otthon Start Program fix 3%-os kamattal, legfeljebb 50 millió forintig, 25 éves futamidőre elérhető — házassági és gyermekvállalási feltétel nélkül, elsősorban az első lakás megszerzésére.",
    how: [
      { h: "Alapfeltételek", t: "Elsősorban első lakás szerzése, folyamatos, legalább 1–2 éves TB-jogviszony (hitelösszegtől függően; elfogadható munkaviszony, vállalkozói jogviszony, bizonyos esetekben gyed/gyes). Számos kivételszabály van, ezért egyedileg kell megnézni." },
      { h: "Mire használható", t: "Magyarországon lakóingatlan vásárlására vagy építésére. Az ingatlan bérbeadható, lakcímbejelentés nem feltétel, de 5 évig nem adható el." },
      { h: "Egyedülállóként is", t: "Nem csak házaspároknak: bizonyos banki konstrukciókban egyedülállók és élettársak is részt vehetnek, ha első ingatlanszerzésről van szó." },
      { h: "Kombinálás", t: "A támogatott hitel mellé piaci hitel, családi támogatások és az önerő tervezése is kérdés. A teljes szerkezetet együtt kell összeállítani, nem elemenként." },
    ],
    bullets: [
      "első lakást vásárolnál vagy építenél",
      "van legalább 1–2 év folyamatos TB-jogviszonyod",
      "nem tudod, mennyi hitelre vagy jogosult",
      "a piaci hitel törlesztője túl magas lenne",
    ],
    funnel: {
      steps: [
        {
          id: "first",
          kicker: "1. kérdés",
          q: "Ez lenne az első saját lakásod?",
          type: "choice",
          opts: [
            { v: "yes", label: "Igen", note: "Az Otthon Start alapfeltétele" },
            { v: "part", label: "Van/volt kisebb részem ingatlanban", note: "Vannak kivételszabályok, megnézzük" },
            { v: "no", label: "Nem, van saját ingatlanom", note: "Más támogatott vagy piaci megoldást keresünk" },
          ],
        },
        {
          id: "tb",
          kicker: "2. kérdés",
          q: "Mennyi folyamatos TB-jogviszonyod van?",
          type: "choice",
          opts: [
            { v: "2", label: "2 év vagy több", note: "A legnagyobb hitelösszeg is elérhető" },
            { v: "1", label: "1–2 év", note: "Alacsonyabb összeg, de működhet" },
            { v: "less", label: "Kevesebb mint 1 év", note: "Várni kell, vagy más út kell" },
            { v: "gyed", label: "Gyed / gyes van", note: "Bizonyos esetekben beszámít" },
          ],
        },
        {
          id: "purpose",
          kicker: "3. kérdés",
          q: "Mit szeretnél?",
          type: "choice",
          opts: [
            { v: "buy", label: "Használt lakást vásárolni" },
            { v: "new", label: "Új építésűt vásárolni" },
            { v: "build", label: "Építeni" },
          ],
        },
      ],
      calc: {
        kicker: "Otthon Start kalkulátor",
        title: "Otthon Start törlesztő, fix 3%",
        help:
          "Maximum 50 millió Ft, legfeljebb 25 év, fix 3% a teljes futamidőre. A számítás a jogszabályi korlátokat is jelzi.",
        inputs: [
          { key: "price", label: "Ingatlan vételára", type: "slider", min: 10000000, max: 120000000, step: 2500000, def: 60000000, unit: "Ft" },
          { key: "sqm", label: "Alapterület", type: "slider", min: 25, max: 160, step: 5, def: 55, unit: " m²" },
          { key: "amount", label: "Igényelt hitelösszeg", type: "slider", min: 5000000, max: 50000000, step: 1000000, def: 35000000, unit: "Ft" },
          { key: "years", label: "Futamidő", type: "slider", min: 5, max: 25, step: 1, def: 25, unit: "év" },
          {
            key: "market",
            label: "Összehasonlítás piaci kamattal",
            type: "chips",
            options: [6.5, 7.5, 8.5],
            def: 7.5,
            unit: "%",
            note: "Ennyi lenne ugyanez a hitel támogatás nélkül.",
          },
        ],
        compute(v) {
          const sqmPrice = v.sqm > 0 ? v.price / v.sqm : 0;

          /* Jogszabalyi korlatok (227/2025. Korm. rendelet): lakas max 100 M Ft,
             m2-ar max 1,5 M Ft, onero min 10%, hitel max 50 M Ft, futamido max 25 ev.
             A hitelt a veteларhoz is kotni kell: a ket csuszka egymastol fuggetlen,
             kulonben 10 M Ft-os lakasra 50 M Ft hitelt kerne a felhasznalo. */
          const maxLoan = Math.min(OTTHON_START_MAX, v.price * 0.9);
          const loan = Math.min(v.amount, maxLoan);
          const clamped = v.amount > maxLoan;
          const own = Math.max(0, v.price - loan);
          const ownPct = v.price > 0 ? (own / v.price) * 100 : 0;

          const sub = annuity(loan, OTTHON_START_RATE, v.years);
          const mkt = annuity(loan, v.market / 100, v.years);
          const diff = mkt - sub;

          const flags = [];
          if (v.price > 100000000) flags.push("a vételár meghaladja a 100 millió Ft-os lakáshatárt");
          if (sqmPrice > 1500000) flags.push("a négyzetméterár meghaladja az 1,5 millió Ft-ot");
          if (clamped)
            flags.push(
              `ekkora vételárhoz legfeljebb ${ft(maxLoan)} hitel vehető fel (10% saját erő kötelező), ezért ezzel számolunk`
            );

          return {
            big: ft(sub),
            bigLabel: "havi törlesztő fix 3%-kal",
            caption: flags.length
              ? "Figyelem: " + flags.join("; ") + ". Így ez az ingatlan a jelenlegi feltételekkel nem finanszírozható Otthon Starttal — de van rá más út."
              : `${ft(loan)} hitel ${v.years} év alatt. Ugyanez piaci ${pct(v.market)}-on ${ft(mkt)} lenne havonta.`,
            rows: [
              ["Vételár", ft(v.price)],
              ["Négyzetméterár", ft(sqmPrice) + " / m²"],
              ["Figyelembe vett hitelösszeg", ft(loan)],
              ["Saját erő", ft(own) + " (" + ownPct.toFixed(0) + "%)"],
              ["Támogatott törlesztő (3%)", ft(sub)],
              [`Piaci törlesztő (${pct(v.market)})`, ft(mkt)],
              ["Havi különbség", ft(diff)],
            ],
            total: ["Megtakarítás a futamidő alatt", ft(diff * v.years * 12)],
            note:
              "Tájékoztató annuitásos számítás, nem hitelajánlat és nem THM. A tényleges törlesztőt a bank határozza meg, a jogosultságot jogszabály szabályozza (227/2025. (VII. 31.) Korm. rendelet): első lakás, legalább 2 éves TB-jogviszony, min. 10% saját erő. A jövedelmi korlátot (JTM) is a bank vizsgálja.",
          };
        },
      },
    },
    faq: [
      { q: "Kell házasság vagy gyerek?", a: "Az Otthon Start esetében nem: a program házassági és gyermekvállalási feltétel nélkül elérhető. Más támogatásoknál (pl. családi kedvezmények) más a helyzet." },
      { q: "Ki kell lakcímet létesítenem?", a: "A jelenlegi szabályozás szerint nem feltétel, és az ingatlan bérbe is adható — viszont 5 évig nem értékesíthető." },
      { q: "Mennyi önerő kell?", a: "Ez banktól és ingatlantól függ, a hitelfedezeti és jövedelmi korlátok (JTM) alapján. Ezt konkrét számokkal, banki ajánlatokkal érdemes megnézni." },
      { q: "Vállalkozóként is elérhető?", a: "Igen, a vállalkozói jogviszony beszámítható a TB-feltételbe. A jövedelemigazolás módja bankonként különbözik — ez az egyik pont, ahol sokat számít, melyik bankhoz megyünk." },
    ],
    legal:
      "A támogatott hitelek feltételeit jogszabály határozza meg (Otthon Start: 227/2025. (VII. 31.) Korm. rendelet). Az itt szereplő számítás tájékoztató jellegű, nem hitelajánlat.",
  },

  /* 11 ----------------------------------------------------------------- */
  {
    slug: "piaci-hitelek",
    cat: "hitel",
    icon: I.bank,
    /* A H1 a keresett kifejezéssel; a kártyán és a menüben marad a rövid név. */
    h1: "Lakáshitel és hitelkiváltás",
    title: "Piaci hitelek",
    navTitle: "Piaci hitelek",
    badge: "Kiváltás",
    metric: "kiváltás: megtérül vagy nem",
    hook: "Ugyanarra a hitelre bankonként több millió forint különbség jöhet ki a futamidő végére. Nem a törlesztőt kell nézni, hanem a teljes visszafizetést.",
    seo: {
      title: "Piaci lakáshitel és hitelkiváltás 2026 — teljes banki összehasonlítás",
      desc: "Lakáshitel, szabad felhasználású jelzálog, hitelkiváltás 2026-ban: THM, kamatperiódus, JTM. Számold ki, mennyit hoz 1% kamatcsökkenés.",
    },
    facts: [
      { v: "több bank", l: "ajánlatát egyszerre, ugyanarra a hitelösszegre" },
      { v: "1%", l: "kamatkülönbség 20 éven, 30 millión: milliós tétel" },
      { v: "0 Ft", l: "az ügyfélnek fizetendő díj a közvetítésért" },
    ],
    intro:
      "Ha nem férsz bele a támogatott konstrukciókba, vagy nagyobb összeg kell, a piaci hitel a megoldás. Itt a bankok közti szórás óriási, és nem csak a kamatban: az értékbecslés, a folyósítási díj, a kamatperiódus és az elfogadott jövedelemtípusok is mind pénzben mérhető különbséget hoznak.",
    how: [
      { h: "THM, nem kamat", t: "Az összehasonlítás alapja a teljes hiteldíj mutató és a teljes visszafizetendő összeg, nem a hirdetett kamat vagy a legalacsonyabb havi törlesztő." },
      { h: "Kamatperiódus", t: "A végig fix és a 5/10 éves kamatperiódusú hitel más kockázat. Hosszú futamidőn a kiszámíthatóság sokszor többet ér, mint a kezdeti tized százalék." },
      { h: "Hitelkiváltás", t: "Egy 3–5 éve felvett hitel gyakran cserélhető kedvezőbbre. A kiváltás költségeit (végtörlesztés, értékbecslés, közjegyző) bele kell számolni — ezt előre kiszámoljuk." },
      { h: "JTM és jövedelem", t: "A jövedelemarányos törlesztési mutató határozza meg, mennyit kaphatsz. Vállalkozói, külföldi vagy több forrásból származó jövedelmet a bankok különbözően fogadnak el — itt a bankválasztás dönt." },
    ],
    bullets: [
      "lakást vásárolnál és nem férsz bele a támogatott hitelbe",
      "van hitelt, és 3+ éve nem nézted meg a kiváltást",
      "szabad felhasználású jelzáloghitelre gondolsz felújításhoz",
      "vállalkozói jövedelmed van, és a bankod elutasított",
    ],
    funnel: {
      steps: [
        {
          id: "goal",
          kicker: "1. kérdés",
          q: "Mire kell a hitel?",
          type: "choice",
          opts: [
            { v: "buy", label: "Lakásvásárlás" },
            { v: "build", label: "Építés / felújítás" },
            { v: "swap", label: "Meglévő hitel kiváltása" },
            { v: "free", label: "Szabad felhasználás jelzálogra" },
          ],
        },
        {
          id: "income",
          kicker: "2. kérdés",
          q: "Milyen a jövedelmed típusa?",
          type: "choice",
          opts: [
            { v: "employee", label: "Munkaviszony", note: "Legegyszerűbb elbírálás" },
            { v: "self", label: "Egyéni vállalkozó / kata", note: "Bankonként nagy különbség" },
            { v: "company", label: "Cégből osztalék / ügyvezetői", note: "Speciális elbírálás" },
            { v: "mixed", label: "Vegyes / külföldi", note: "Célzott bankválasztás kell" },
          ],
        },
        {
          id: "rate",
          kicker: "3. kérdés",
          q: "Mi fontosabb neked?",
          type: "choice",
          opts: [
            { v: "fix", label: "Kiszámíthatóság", note: "Végig fix kamat" },
            { v: "low", label: "A legkisebb induló törlesztő", note: "Rövidebb kamatperiódus" },
            { v: "flex", label: "Rugalmasság", note: "Előtörlesztés, díjmentes módosítás" },
          ],
        },
      ],
      calc: {
        kicker: "Hitelkiváltás-kalkulátor",
        title: "Megérné-e kiváltani a mostani hitelemet?",
        help:
          "Nem hipotetikus százalékkal számolunk: írd be a saját kamatodat és azt, amit kínálnak. A kiváltás költségét is beleszámoljuk.",
        inputs: [
          { key: "amount", label: "Fennálló tartozás", type: "slider", min: 2000000, max: 80000000, step: 1000000, def: 30000000, unit: "Ft" },
          { key: "years", label: "Hátralévő futamidő", type: "slider", min: 3, max: 30, step: 1, def: 20, unit: "év" },
          { key: "rateNow", label: "Jelenlegi kamatod", type: "slider", min: 2, max: 14, step: 0.1, def: 8, unit: "%" },
          { key: "rateNew", label: "Kínált új kamat", type: "slider", min: 2, max: 14, step: 0.1, def: 6.5, unit: "%" },
          {
            key: "cost",
            label: "A kiváltás egyszeri költsége",
            type: "slider",
            min: 0,
            max: 1500000,
            step: 25000,
            def: 350000,
            unit: "Ft",
            note: "Értékbecslés, közjegyző, földhivatal, előtörlesztési díj. Sok banknál részben visszatérül.",
          },
        ],
        compute(v) {
          const a = annuity(v.amount, v.rateNow / 100, v.years);
          const b = annuity(v.amount, v.rateNew / 100, v.years);
          const totalA = a * v.years * 12;
          const totalB = b * v.years * 12 + v.cost;
          const net = totalA - totalB;
          const monthly = a - b;
          const payback = monthly > 0 ? Math.ceil(v.cost / monthly) : null;
          const worth = net > 0;
          return {
            big: ft(Math.abs(net)),
            bigLabel: worth ? "nettó megtakarítás a futamidő alatt" : "ennyivel kerülne többe a váltás",
            caption: worth
              ? `A havi törlesztőd ${ft(a)}-ról ${ft(b)}-ra csökkenne. A ${ft(v.cost)} kiváltási költség ${payback} hónap alatt térül meg.`
              : v.rateNew >= v.rateNow
              ? `A kínált kamat (${pct(v.rateNew)}) nem alacsonyabb a mostaninál (${pct(v.rateNow)}), így nincs mit kiváltani. Ilyenkor azt mondom, hogy maradj.`
              : `A kamatelőny megvan, de a ${ft(v.cost)} kiváltási költséget nem hozza vissza a futamidő végéig. Ez is válasz — nem minden ajánlat jó ajánlat.`,
            rows: [
              [`Törlesztő most (${pct(v.rateNow)})`, ft(a)],
              [`Törlesztő az új ajánlattal (${pct(v.rateNew)})`, ft(b)],
              [
                "Havi különbség",
                monthly >= 0 ? ft(monthly) + " kevesebb" : ft(-monthly) + " több",
              ],
              ["Teljes visszafizetés most", ft(totalA)],
              ["Teljes visszafizetés váltás után (költséggel)", ft(totalB)],
              payback !== null && payback <= v.years * 12
                ? ["A kiváltás költsége ennyi hónap alatt térül meg", payback + " hónap"]
                : null,
            ],
            total: [worth ? "Nettó nyereség" : "Nettó veszteség", ft(Math.abs(net))],
            note:
              "Tájékoztató annuitásos számítás, nem THM és nem hitelajánlat. A tényleges ajánlatot a bank adja a hitelbírálat után. A közvetítés az ügyfélnek díjmentes: a közvetítő a bankkal áll szerződésben.",
          };
        },
      },
    },
    faq: [
      { q: "Mennyibe kerül nekem a közvetítés?", a: "Az ügyfélnek nem kell fizetnie: a közvetítő a bankkal áll szerződésben. Neked az az érdeked, hogy több bank ajánlatát egyszerre lásd." },
      { q: "Megéri kiváltani a régi hitelemet?", a: "Csak akkor, ha a kiváltás összes költségével együtt is nyersz. Ezt előre, konkrét számokkal kiszámoljuk — ha nem jön ki, azt is megmondom." },
      { q: "Vállalkozóként is kapok hitelt?", a: "Igen, de a bankok jövedelemelfogadása erősen különbözik. Itt a bankválasztás fontosabb, mint a hirdetett kamat." },
      { q: "Mennyi ideig tart a folyamat?", a: "Előminősítés napokon belül, a teljes folyamat jellemzően 4–8 hét, banktól és ingatlantól függően." },
    ],
    legal:
      "A hitelbírálat és a szerződéskötés a bank döntése. A THM és a feltételek bankonként különböznek; a számítás tájékoztató jellegű, nem hitelajánlat.",
  },

  /* 12 ----------------------------------------------------------------- */
  {
    slug: "szemelyi-kolcson",
    cat: "hitel",
    icon: I.wallet,
    /* A H1 a keresett kifejezéssel; a kártyán és a menüben marad a rövid név. */
    h1: "Személyi kölcsön és hitelkiváltás",
    title: "Személyi kölcsön",
    navTitle: "Személyi kölcsön",
    badge: "Fedezet nélkül",
    metric: "THM-összehasonlítás egy helyen",
    hook: "Fedezet nélkül, gyorsan — de a THM-ek között két-háromszoros különbség is van. Ugyanarra az összegre.",
    seo: {
      title: "Személyi kölcsön 2026 — teljes THM-összehasonlítás, hitelkiváltás",
      desc: "Személyi kölcsön 2026-ban: THM-összehasonlítás, hitelkártya- és áruhitel-kiváltás, JTM. Számold ki a törlesztőt és a teljes visszafizetést.",
    },
    facts: [
      { v: "THM", l: "ez az egyetlen összehasonlítható szám — nem a kamat" },
      { v: "napok", l: "jellemző folyósítási idő" },
      { v: "0 Ft", l: "ingatlanfedezet: nincs rá szükség" },
    ],
    intro:
      "A személyi kölcsön akkor jó eszköz, ha egyszeri, tervezett kiadásról van szó, és látod a végét. Ahol el lehet rontani: a THM helyett a havi törlesztőre nézni, és túl hosszú futamidőt választani. Ahol nagyon sokat lehet nyerni: drága hitelkártya- vagy áruhitel-tartozás kiváltása.",
    how: [
      { h: "Mire jó", t: "Felújítás, autó, orvosi kezelés, esküvő, drágább tartozások összevonása. Olyan kiadás, aminek van vége és belátható a törlesztés." },
      { h: "Mire nem jó", t: "Folyó megélhetés finanszírozására vagy meglévő hitel törlesztésére újabb hitelből, terv nélkül. Ilyenkor nem hitel kell, hanem költségvetés-átvizsgálás — ezt is megbeszélhetjük." },
      { h: "Adósságkonszolidáció", t: "Több drága tartozás (hitelkártya, áruhitel, folyószámlahitel) egy alacsonyabb THM-ű kölcsönbe vonása jellemzően azonnal csökkenti a havi terhet." },
      { h: "Mit vizsgálunk", t: "THM, teljes visszafizetendő összeg, előtörlesztési feltételek, kötelező mellékszolgáltatások (számlanyitás, biztosítás), és hogy a jövedelemtípusod elfogadott-e." },
    ],
    bullets: [
      "egyszeri, tervezett nagyobb kiadásod van",
      "hitelkártya- vagy áruhitel-tartozásod fut, magas kamattal",
      "gyorsan kell a pénz, és nincs ingatlanfedezet",
      "több bankot nem akarsz egyenként végigjárni",
    ],
    funnel: {
      steps: [
        {
          id: "purpose",
          kicker: "1. kérdés",
          q: "Mire kell a kölcsön?",
          type: "choice",
          opts: [
            { v: "reno", label: "Felújítás, berendezés" },
            { v: "car", label: "Autó" },
            { v: "consolidate", label: "Meglévő tartozások kiváltása" },
            { v: "other", label: "Egyéb (egészség, esküvő, tanulás)" },
          ],
        },
        {
          id: "income",
          kicker: "2. kérdés",
          q: "Mekkora a havi nettó jövedelmed?",
          type: "choice",
          opts: [
            { v: 300000, label: "300 ezer alatt" },
            { v: 500000, label: "300–600 ezer" },
            { v: 800000, label: "600 ezer – 1 millió" },
            { v: 1400000, label: "1 millió felett" },
          ],
        },
        {
          id: "existing",
          kicker: "3. kérdés",
          q: "Van már futó hiteled?",
          help: "A JTM-korlát miatt ez befolyásolja a felvehető összeget.",
          type: "choice",
          opts: [
            { v: "no", label: "Nincs" },
            { v: "small", label: "Van kisebb (áruhitel, kártya)" },
            { v: "mortgage", label: "Van lakáshitelem" },
            { v: "several", label: "Több is van" },
          ],
        },
      ],
      calc: {
        kicker: "Törlesztő-kalkulátor",
        title: "Törlesztő, teljes visszafizetés, és mit hoz a kiváltás",
        help:
          "Ha most hitelkártyát vagy áruhitelt fizetsz, írd be annak a THM-jét is: a különbség itt szokott a legnagyobb lenni.",
        inputs: [
          { key: "amount", label: "Hitelösszeg", type: "slider", min: 300000, max: 15000000, step: 100000, def: 3000000, unit: "Ft" },
          { key: "years", label: "Futamidő", type: "slider", min: 1, max: 10, step: 1, def: 5, unit: "év" },
          {
            key: "thm",
            label: "Kínált THM",
            type: "slider",
            min: 8,
            max: 30,
            step: 0.5,
            def: 14,
            unit: "%",
            note: "A tényleges THM-et a bank a hitelbírálat után adja meg, a jövedelmed és az adósságaid alapján.",
          },
          {
            key: "thmOld",
            label: "Kiváltandó hitel THM-je",
            type: "select",
            def: 0,
            options: [
              { v: 0, label: "Nincs kiváltandó hitelem", short: "nincs" },
              { v: 20, label: "Régi személyi kölcsön — kb. 20%", short: "kb. 20%" },
              { v: 28, label: "Áruhitel — kb. 28%", short: "kb. 28%" },
              { v: 36, label: "Hitelkártya / folyószámlahitel — kb. 36%", short: "kb. 36%" },
            ],
            note: "Csak akkor számol vele, ha van mit kiváltani.",
          },
        ],
        compute(v) {
          const m = annuity(v.amount, v.thm / 100, v.years);
          const total = m * v.years * 12;
          const hasOld = v.thmOld > 0;
          const mOld = hasOld ? annuity(v.amount, v.thmOld / 100, v.years) : 0;
          const totalOld = mOld * v.years * 12;
          const gain = totalOld - total;
          return {
            big: ft(m),
            bigLabel: "becsült havi törlesztő",
            caption: !hasOld
              ? `${ft(v.amount)} kölcsön ${v.years} évre, ${pct(v.thm)} THM-mel számolva.`
              : gain > 0
              ? `${ft(v.amount)} ${v.years} évre, ${pct(v.thm)} THM-mel. A mostani ${pct(v.thmOld)}-os hiteled ugyanerre ${ft(mOld)} lenne havonta — a kiváltás ${ft(gain)}-ot hoz a futamidő alatt.`
              : `Ezzel a ${pct(v.thm)}-os THM-mel a kiváltás ${ft(-gain)}-tal többe kerülne, mint a mostani ${pct(v.thmOld)}-os hiteled. Ilyen ajánlatot nem írok alá helyetted sem.`,
            rows: [
              ["Hitelösszeg", ft(v.amount)],
              ["Havi törlesztő", ft(m)],
              ["Teljes visszafizetés", ft(total)],
              ["A hitel költsége", ft(total - v.amount)],
              hasOld ? [`Ugyanez ${pct(v.thmOld)}-on`, ft(totalOld)] : null,
              hasOld
                ? [
                    gain > 0 ? "Megtakarítás kiváltással" : "Ennyivel lenne drágább",
                    ft(Math.abs(gain)),
                  ]
                : null,
            ],
            total: ["Teljes visszafizetendő", ft(total)],
            note:
              "Tájékoztató számítás a megadott THM-mel, nem hitelajánlat. A JTM-szabály szerint a törlesztő a jövedelmedhez képest korlátozott. A hitel felvétele kockázattal járó pénzügyi döntés.",
          };
        },
      },
    },
    faq: [
      { q: "Mennyit kaphatok?", a: "A JTM-szabály szerint a jövedelmed és a meglévő törlesztéseid határozzák meg. Előminősítéssel pár nap alatt látjuk a valós keretet." },
      { q: "Rontja a hitelképességemet, ha több banknál kérek ajánlatot?", a: "Az ajánlatkérés önmagában nem, a párhuzamos hiteligénylések viszont látszanak a KHR-ben. Ezért érdemes közvetítővel egyszerre, célzottan nézni a piacot." },
      { q: "Megéri hitelkártyát kiváltani?", a: "Jellemzően igen: a hitelkártya és az áruhitel THM-je gyakran sokszorosa egy jó személyi kölcsönnek. Ez az egyik legegyszerűbb, azonnal érezhető megtakarítás." },
      { q: "Van előtörlesztés?", a: "Van, de a feltételek és a díjak különböznek. Ha tudod, hogy előbb visszafizetnéd, ezt előre be kell építeni a bankválasztásba." },
    ],
    legal:
      "A hitelbírálat a bank döntése. A THM és a feltételek bankonként különböznek; a számítás tájékoztató jellegű, nem hitelajánlat. A hitel felvétele kockázattal járó pénzügyi döntés.",
  },

  /* 13 ----------------------------------------------------------------- */
  {
    slug: "dijmentes-bankszamla",
    cat: "bank",
    icon: I.card,
    /* A H1 a keresett kifejezéssel; a kártyán és a menüben marad a rövid név. */
    h1: "Díjmentes bankszámla — 0 Ft számlavezetés",
    title: "Díjmentes bankszámla-csomagok",
    navTitle: "Díjmentes bankszámla",
    badge: "0 Ft",
    metric: "0 Ft számlavezetés is van",
    hook: "A bankköltség az a kiadás, amiért semmit nem kapsz. Van olyan számla, ahol feltétel nélkül 0 Ft a vezetés.",
    seo: {
      title: "Díjmentes bankszámla 2026 — 0 Ft számlavezetés, rejtett díjak nélkül",
      desc: "Ingyenes bankszámla 2026-ban: feltétel nélküli 0 Ft-os csomagok, jóváírás-feltételes ajánlatok, kártyadíj és utalási költségek. Számold ki, mennyit fizetsz ma.",
    },
    facts: [
      { v: "0 Ft", l: "van feltétel nélküli számlavezetési díj is" },
      { v: "rejtett díjak", l: "kártya, utalás, készpénzfelvétel — itt bukik el a 0 Ft" },
      { v: "10 perc", l: "ennyi idő alatt átnézzük a mostani költségeidet" },
    ],
    intro:
      "Nem minden „0 Ft-os bankszámla” ingyenes. A számlavezetési díj lehet nulla, miközben a kártyadíj, az utalás vagy a készpénzfelvétel viszi el a pénzt. A valós összehasonlítás alapja az, ahogy te használod a számlát: mennyi utalás, mennyi készpénz, mennyi kártyás vásárlás, van-e devizás költés.",
    how: [
      { h: "Feltétel nélküli 0 Ft", t: "Van olyan csomag, ahol a számlavezetés feltétel nélkül díjmentes, virtuális kártyával és havi bizonyos összegig ingyenes belföldi forintutalással." },
      { h: "Jóváírás-feltételes csomagok", t: "A legtöbb ingyenes ajánlat havi minimum jóváíráshoz kötött. Fontos különbség: egyes bankok kifejezetten jövedelmet (munkabér, nyugdíj) várnak el, mások bármilyen jóváírást elfogadnak." },
      { h: "Ahol elbukik a nulla", t: "Fizikai kártya díja, csoportos beszedés, azonnali utalás, készpénzfelvétel az ingyenes keret felett, deviza-átváltási felár, SMS-értesítés." },
      { h: "Számlaváltás", t: "A számlaváltás ma egyszerű: az átutalások és beszedések áthelyezhetők. A gyakorlati teher pár óra, a nyereség évekre szól." },
    ],
    bullets: [
      "évek óta ugyanannál a banknál vagy, és nem tudod, mennyit fizetsz",
      "havi 2–5 ezer forint bankköltséged van",
      "sok utalást indítasz vagy sokat veszel fel készpénzben",
      "külföldön is használod a kártyád",
    ],
    funnel: {
      steps: [
        {
          id: "use",
          kicker: "1. kérdés",
          q: "Hogyan használod a számlát?",
          type: "choice",
          opts: [
            { v: "basic", label: "Alap: fizetés jön, kártyával fizetek" },
            { v: "transfer", label: "Sok utalást indítok" },
            { v: "cash", label: "Rendszeresen veszek fel készpénzt" },
            { v: "travel", label: "Sokat használom külföldön" },
          ],
        },
        {
          id: "income",
          kicker: "2. kérdés",
          q: "Érkezik rendszeres jóváírás a számlára?",
          help: "A díjmentesség sok banknál ehhez kötött.",
          type: "choice",
          opts: [
            { v: "salary", label: "Igen, munkabér / nyugdíj", note: "A legtöbb kedvezmény elérhető" },
            { v: "other", label: "Igen, de nem jövedelem", note: "Van bank, ami ezt is elfogadja" },
            { v: "none", label: "Nem érkezik rendszeres jóváírás", note: "Feltétel nélküli 0 Ft-os csomag kell" },
          ],
        },
        {
          id: "extra",
          kicker: "3. kérdés",
          q: "Mi lenne még fontos?",
          type: "choice",
          multi: true,
          opts: [
            { v: "phys", label: "Fizikai bankkártya díjmentesen" },
            { v: "instant", label: "Ingyenes azonnali utalás" },
            { v: "app", label: "Jó mobilapp" },
            { v: "fx", label: "Kedvező devizaváltás" },
            { v: "save", label: "Kamatozó megtakarítási alszámla" },
          ],
        },
      ],
      calc: {
        kicker: "Díjkimutatás-alapú összehasonlítás",
        title: "Mennyit fizetsz ma a bankolásért?",
        help:
          "A pontos számok a bankod éves Díjkimutatásán vannak (netbank / mobilapp, „Díjkimutatás” néven). Ha megvan, ez a kalkulátor 2 perc.",
        inputs: [
          { key: "monthlyFee", label: "Havi számlavezetési díj", type: "slider", min: 0, max: 6000, step: 100, def: 1800, unit: "Ft" },
          { key: "cardFee", label: "Éves kártyadíj", type: "slider", min: 0, max: 20000, step: 500, def: 6000, unit: "Ft" },
          {
            key: "transfers",
            label: "Utalások száma / hó",
            type: "slider",
            min: 0,
            max: 40,
            step: 1,
            def: 8,
            unit: " db",
            note: "Csoportos beszedéssel együtt.",
          },
          { key: "trFee", label: "Egy utalás átlagos díja", type: "slider", min: 0, max: 400, step: 10, def: 90, unit: "Ft" },
          {
            key: "cashCount",
            label: "Készpénzfelvétel / hó",
            type: "chips",
            options: [0, 1, 2, 4],
            def: 2,
            unit: " db",
            note: "Havi 2 alkalommal, összesen 150 000 Ft-ig a saját bankod ATM-jéből díjmentes (jogszabály).",
          },
          { key: "cashAmount", label: "Egy felvétel átlagos összege", type: "slider", min: 10000, max: 300000, step: 10000, def: 60000, unit: "Ft" },
        ],
        compute(v) {
          const FREE_COUNT = 2;
          const FREE_LIMIT = 150000;
          const CASH_RATE = 0.006; // kb. 0,6% + tranzakcios illetek a dijmentes kereten felul
          const account = v.monthlyFee * 12;
          const transfers = v.transfers * v.trFee * 12;
          const extraCash = Math.max(0, v.cashCount - FREE_COUNT) * v.cashAmount;
          const overLimit = Math.max(0, Math.min(v.cashCount, FREE_COUNT) * v.cashAmount - FREE_LIMIT);
          const cash = (extraCash + overLimit) * CASH_RATE * 12;
          const yearly = account + v.cardFee + transfers + cash;
          return {
            big: ft(yearly),
            bigLabel: "éves bankköltség",
            caption:
              yearly > 0
                ? "Ennyit fizetsz ma azért, hogy a saját pénzedet kezeljék. Ebből a legtöbb tétel kiváltható díjmentes konstrukcióval."
                : "Ez már gyakorlatilag díjmentes bankolás — ilyenkor nincs mit javítani, és ezt is megmondom.",
            rows: [
              ["Számlavezetés", ft(account)],
              ["Kártyadíj", ft(v.cardFee)],
              [`Utalások (${v.transfers} db / hó)`, ft(transfers)],
              ["Készpénzfelvétel a díjmentes kereten felül", ft(cash)],
              ["10 év alatt", ft(yearly * 10)],
            ],
            total: ["Évente elhagyható költség", ft(yearly)],
            note:
              "A készpénzfelvétel díját kb. 0,6%-kal becsüljük a jogszabályi díjmentes kereten (havi 2 alkalom, összesen 150 000 Ft) felüli összegre. A tényleges díjakat a bank kondíciós listája tartalmazza; a számítás tájékoztató jellegű.",
          };
        },
      },
    },
    faq: [
      { q: "Tényleg van teljesen ingyenes bankszámla?", a: "Van feltétel nélküli 0 Ft-os számlavezetés, de a „teljesen ingyenes” attól függ, hogyan használod. Ezért a te szokásaidra vetítve hasonlítjuk össze a csomagokat, nem hirdetés alapján." },
      { q: "Nehéz számlát váltani?", a: "Ma már nem. Az utalások és beszedések átvihetők, a folyamat pár nap. A legnagyobb munka a munkáltatónak és a szolgáltatóknak bejelenteni az új számlaszámot." },
      { q: "Miért foglalkozol bankszámlával, ha ez a legkisebb tétel?", a: "Mert ez a legegyszerűbb pont, ahol azonnal pénzt lehet nyerni, és mert innen látszik, hol tart a pénzügyi rendszered. A nagy döntések ugyanezen a logikán működnek." },
    ],
    legal:
      "A számlacsomagok díjait és feltételeit a bank kondíciós listája tartalmazza. Az összehasonlítás tájékoztató jellegű.",
  },
];

/* --- Segéd-hozzáférés -------------------------------------------------- */

const bySlug = (slug) => SERVICES.find((s) => s.slug === slug);
const byCat = (cat) => SERVICES.filter((s) => s.cat === cat);

Object.assign(window.EP, { MINWAGE_2026, MAX_PENSION_INS, MAX_PENSION_FUND, MAX_NYESZ, MAX_PENSION_TOTAL, MAX_HEALTH_FUND, HOUSING_MONTHLY_CAP, OTTHON_START_RATE, OTTHON_START_MAX, PROGRAM_YIELDS, fmt, ft, pct, annuity, futureValue, programValue, programMonthlyFor, programNetRate, programNetYield, CATEGORIES, SERVICES, bySlug, byCat });
