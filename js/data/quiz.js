window.EP = window.EP || {};
/* ==========================================================================
   PÉNZÜGYI TÉRKÉP — globális kérdőív
   7 kérdés (+1 feltételes) → a 13 szolgáltatásból kiválasztja a 3 legrelevánsabbat.

   Három rétegben dolgozik, és ez a sorrend fontos:

     1. PONTOZÁS   — minden válasz megnövel bizonyos slug-okat (súlyok).
     2. JOGOSULTSÁG— kemény kizárás. Ami a valóságban nem áll rendelkezésre
                     az adott embernek, azt a pontszám sem hozhatja vissza.
                     Ez a réteg azért van, mert egy magas pontszám korábban
                     olyan terméket is a lista élére tett, amit az illető
                     jogilag nem tud igénybe venni (pl. 20%-os adójóváírás
                     annak, aki nem fizet szja-t; Otthon Start annak, akinek
                     már van lakása; KGFB annak, akinek nincs autója).
     3. INDOKLÁS   — minden javaslathoz a saját válaszaiból vezetett mondat,
                     plusz a `notes()`, ami KIMONDJA, mit hagytunk ki és miért.

   A kihagyás kimondása nem apróbetű: ha valaki azt látja, hogy nem kapott
   adókedvezményt, tudnia kell, hogy ez nem tévedés, hanem a szabály.
   ========================================================================== */

/* --- válasz-segédek ---------------------------------------------------- */

/** A `debt` többválaszos (tömb), a többi kérdés egyértékű. */
const asList = (v) => (Array.isArray(v) ? v : v == null ? [] : [v]);

/** A válaszokból levezetett tények — ezekre hivatkozik a jogosultság és az
    indoklás is, hogy a szabály egy helyen legyen definiálva. */
function facts(a) {
  const debt = asList(a.debt).filter((d) => d && d !== "none");
  const consumer = debt.length > 0;
  return {
    debt,
    /* gyerek: az élethelyzet mondja meg. Az szja-mentesség is gyereket
       nevelő anyát jelent, ezért az is gyerekes helyzetnek számít. */
    kids: a.life === "smallkids" || a.life === "schoolkids" || a.tax === "exempt",
    household: a.life === "couple" || a.life === "smallkids" || a.life === "schoolkids",
    mortgage: a.home === "loan",
    buying: a.home === "plan",
    /* első lakás: az Otthon Start alapfeltétele. Akinek már van ingatlana
       (akár hitellel), az erre nem jogosult. */
    firstHome: a.home === "rent" || a.home === "plan" || a.home === "withparents",
    property: a.home === "own" || a.home === "loan",
    consumerDebt: consumer,
    expensiveDebt: debt.includes("card") || debt.includes("other"),
    anyDebt: consumer || a.home === "loan",
    /* szja: a 20%-os állami jóváírások egyetlen közös feltétele. */
    taxpayer: a.tax !== "exempt",
    hasCar: a.car && a.car !== "none",
  };
}

/* --- JOGOSULTSÁG -------------------------------------------------------
   Igaz = a szolgáltatás egyáltalán szóba jöhet nála. Ami hiányzik innen,
   az mindenkinek elérhető (bankszámla, szabad megtakarítás, baleset- és
   egészségbiztosítás) — ezek egyben a feltöltő tartalék is. */
const ELIGIBLE = {
  /* Kötelező gépjármű-felelősségbiztosítás autó nélkül értelmezhetetlen. */
  "kgfb-casco": (a, f) => f.hasCar,

  /* Otthon Start: elsősorban ELSŐ lakás szerzésére. Akinek van ingatlana
     (227/2025. Korm. rendelet szerinti kivételeken túl), az nem cél. */
  "tamogatott-hitelek": (a, f) => f.firstHome,

  /* Piaci jelzáloghitel: kell hozzá ingatlan — vagy fedezetnek (kiváltás,
     szabad felhasználás), vagy megvásárlandó célnak. Albérlőnek, akinek
     nincs ingatlanvásárlási terve, ez nem eszköz: neki személyi kölcsön van. */
  "piaci-hitelek": (a, f) => f.property || f.buying,

  /* Személyi kölcsön: vagy van kiváltandó tartozás, vagy konkrét,
     egyszeri finanszírozási igény. Önmagában "jó ötletként" nem ajánljuk. */
  "szemelyi-kolcson": (a, f) => f.consumerDebt || a.pain === "money" || a.car === "buy",

  /* A pénztári lakáshitel-törlesztéshez kell élő (vagy most induló)
     lakáshitel ÉS szja — a 20% jóváírás enélkül nem érvényesíthető. */
  "adokedvezmeny-lakashitel": (a, f) => (f.mortgage || f.buying) && f.taxpayer,

  /* A nyugdíjcélú formák egész ígérete a 20% adójóváírás. Szja nélkül ez
     nem jár, ezért ilyenkor a szabad megtakarítás felé tereljük. */
  "nyugdij-megtakaritas": (a, f) => f.taxpayer,

  /* Egészség- és önsegélyező pénztár: szja kell hozzá. Gyerek nem kell —
     gyógyszer, szemüveg, fogászat, magánorvosi számla enélkül is
     elszámolható —, de ha se gyerek, se említésre méltó egészségkiadás
     nincs, akkor nincs mit visszaigényelni. */
  "adokedvezmeny-gyerek-no": (a, f) => f.taxpayer && (f.kids || a.health !== "rare"),

  /* Gyerek-megtakarítás gyerek nélkül nem termék, hanem félreértés. */
  "gyerek-megtakaritas": (a, f) => f.kids,

  /* Életbiztosítás azoknak szól, akiket anyagilag hátrahagynál: eltartott
     vagy közös háztartás, illetve hitel, ami a halálod után is fizetendő.
     Egyedülállónak, tartozás nélkül a baleset- és egészségbiztosítás a
     valós fedezet — ezért itt kizárjuk. */
  "elet-biztositas": (a, f) => f.household || f.mortgage || f.buying || f.anyDebt,
};

/* Ha a jogosultság kevesebb mint 3 témát hagy meg (ritka, de lehetséges),
   ezekkel töltjük fel — mindegyik feltétel nélkül elérhető bárkinek. */
const FALLBACK = [
  "dijmentes-bankszamla",
  "szabad-felhasznalasu-megtakaritas",
  "baleset-biztositas",
  "egeszsegbiztositas",
];

/* Pontegyenlőségnél ez a sorrend dönt — különben az azonos pontszámú
   témák sorrendje a beszúrás véletlenjén múlna (a korábbi verzióban a
   kombinációk közel 40%-ánál volt döntetlen a 3. helyen).
   A rendezőelv: mennyire konkrét és mennyire gyorsan realizálható a pénz. */
const TIEBREAK = [
  "adokedvezmeny-lakashitel",      // évi 116–232 e Ft, azonnal induló
  "adokedvezmeny-gyerek-no",       // évi max. 150 e Ft, meglévő kiadásokból
  "szemelyi-kolcson",              // kiváltás: a havi törlesztőn azonnal látszik
  "kgfb-casco",                    // határidős: az évfordulót nem lehet pótolni
  "nyugdij-megtakaritas",          // évi max. 280 e Ft, de hosszú táv
  "piaci-hitelek",
  "tamogatott-hitelek",
  "elet-biztositas",
  "egeszsegbiztositas",
  "baleset-biztositas",
  "gyerek-megtakaritas",
  "szabad-felhasznalasu-megtakaritas",
  "dijmentes-bankszamla",
];

/* --- INDOKLÁS ----------------------------------------------------------
   Egy mondat arról, miért EZ került a listájára. A generikus terméktext
   helyett a saját válaszaira hivatkozik, mert a térkép értéke pont ez. */
const REASON = {
  "adokedvezmeny-lakashitel": (a, f) =>
    f.buying
      ? "Most induló lakáshitelnél ezt egyből be lehet állítani: a törlesztés egy részét a pénztár fizeti, és arra 20% állami jóváírás jár."
      : "Van élő lakáshiteled, és fizetsz szja-t — ez a kombináció adóstársanként évi 116 ezer forint körüli visszatérítést jelent ugyanarra a törlesztőre.",

  "adokedvezmeny-gyerek-no": (a, f) =>
    f.kids
      ? "Tanszer, szemüveg, gyógyszer, fogszabályzó: ezeket a család úgyis kifizeti. Pénztáron keresztül a NAV visszaad belőle 20%-ot, évi 150 ezer forintig."
      : "Nem csak gyerekre szól: gyógyszer, szemüveg, fogászat és magánorvosi számla is elszámolható — a befizetésed 20%-át visszakapod az adódból.",

  "nyugdij-megtakaritas": (a, f) =>
    a.life === "mature"
      ? "50 felett a kamatos kamat már kevesebbet hoz, az évi akár 280 ezer forint adójóváírás viszont ugyanúgy jár — itt ez a főszereplő."
      : a.pain === "notax"
      ? "Ha sok az adód, ez a legjobban fizető legális szabály: minden befizetés 20%-át visszakapod, évi 280 ezer forintig."
      : "Van előtted elég idő ahhoz, hogy a 20% állami jóváírás és a kamatos kamat együtt dolgozzon — ez a kettő adja a hozam nagyobbik részét.",

  "szemelyi-kolcson": (a, f) => {
    /* Autóvásárlásnál az autó a téma, még ha fut is mellette valami —
       kivéve, ha a hitelekre konkrét célt jelölt meg. */
    if (a.car === "buy" && (!a.debtgoal || a.debtgoal === "fine"))
      return "Autóvásárláshoz fedezet nélkül is van megoldás — de a THM-ek között két-háromszoros a szórás ugyanarra az összegre.";
    if (f.consumerDebt) {
      const drága = f.expensiveDebt
        ? "A hitelkártya és az áruhitel THM-je gyakran a duplája-triplája egy jó személyi kölcsönnek. "
        : "";
      if (a.debtgoal === "lower")
        return drága + "Kiváltással a havi törlesztő csökkenthető — akár hosszabb futamidővel, ha most a mozgástér a fontosabb.";
      if (a.debtgoal === "faster")
        return drága + "Kiváltással ugyanekkora törlesztő mellett rövidülhet a futamidő: hamarabb lesz vége, és összesen kevesebb kamatot fizetsz.";
      if (a.debtgoal === "cheaper")
        return drága + "A mérce a teljes visszafizetés, nem a havi törlesztő. Alacsonyabb THM-en ugyanaz a tartozás milliókkal kevesebbe kerülhet.";
      return drága + "Fut egy tartozásod — érdemes megnézni, mennyivel olcsóbb ma ugyanez. A kiváltás lehet kisebb törlesztő, rövidebb futamidő vagy kevesebb teljes költség.";
    }
    return a.car === "buy"
      ? "Autóvásárláshoz fedezet nélkül is van megoldás — de a THM-ek között két-háromszoros a szórás ugyanarra az összegre."
      : "Egyszeri, tervezett kiadásra ez a leggyorsabb út. A döntés nem a havi törlesztőn, hanem a THM-en és a teljes visszafizetésen múlik.";
  },

  "piaci-hitelek": (a, f) =>
    f.mortgage
      ? a.debtgoal === "lower"
        ? "A lakáshitel kiváltása a havi törlesztőn látszik meg először — akár hosszabb futamidővel. A kiváltás költségeit (végtörlesztés, értékbecslés, közjegyző) előre beleszámoljuk."
        : a.debtgoal === "faster"
        ? "Alacsonyabb kamaton ugyanekkora törlesztővel rövidebb futamidő is kijön. A kiváltás egyszeri költségét előre kiszámoljuk, hogy lásd, mennyi idő alatt térül meg."
        : a.debtgoal === "cheaper"
        ? "20 éven és 30 millión már 1% kamatkülönbség is milliós tétel a teljes visszafizetésben. Ezt konkrét számokkal nézzük meg — ha nem jön ki, azt mondom meg."
        : "Egy néhány éve felvett lakáshitel gyakran cserélhető kedvezőbbre. A kiváltás költségeit (végtörlesztés, értékbecslés, közjegyző) előre kiszámoljuk — ha nem jön ki, azt mondom meg."
      : f.buying
      ? "Ha nem férsz bele az Otthon Start feltételeibe vagy nagyobb összeg kell, itt a bankok közti szórás milliós tétel a futamidő végére."
      : "Saját ingatlan fedezetként felújításra vagy nagyobb célra jóval olcsóbb pénzt jelent, mint a fedezetlen hitel.",

  "tamogatott-hitelek": (a, f) =>
    "Az Otthon Start fix 3%-a nem akció, hanem jogszabály — és első lakás szerzésére szól, ami rád illik. A kérdés csak a jogosultság: TB-jogviszony, ingatlanárak, saját erő.",

  "kgfb-casco": (a, f) =>
    a.car === "buy"
      ? "Új autónál a KGFB és a casco egyszerre dől el — most lehet a legolcsóbban jól választani, később csak évfordulón."
      : "Az évfordulós értesítőben szereplő új díj szinte mindig magasabb, mint amit ma új szerződésként kapnál. A felmondásnak az évforduló előtti 30. napig be kell érkeznie.",

  "elet-biztositas": (a, f) =>
    f.mortgage || f.buying
      ? "A lakáshitel akkor is fizetendő, ha te nem vagy. Ez a szerződés pontosan ezt a lyukat fedi le — a fedezet a hitel és a hátralévő évek alapján számolható."
      : "Van, aki anyagilag rád van utalva. A kérdés nem az, hogy szükség van-e rá, hanem hogy mekkora összegre és meddig.",

  "egeszsegbiztositas": (a, f) =>
    a.health === "waited"
      ? "Azt írtad, hónapokat vártál. Az előfizetéses forma pont ezt váltja ki: napok a hónapok helyett, a TB mellett, nem helyette."
      : a.health === "private"
      ? "Ha amúgy is zsebből fizeted a magánellátást, az előfizetés jellemzően olcsóbb ugyanazért — és a pénztári elszámolással adóelőnyt is hoz."
      : "Nem a betegség a kérdés, hanem hogy mikor kerülsz sorra. Ez az a terület, ahol a legnagyobb az életszínvonal-nyereség forintra vetítve.",

  "baleset-biztositas": (a, f) =>
    "Egy csonttörés nem tragédia — a kieső jövedelem viszont az. A táppénz nem a teljes béred, és ezt a rést olcsón be lehet zárni.",

  "gyerek-megtakaritas": (a, f) =>
    "18 év alatt a havi húszezerből is komoly induló vagyon lesz. A kérdés nem az, hogy megéri-e, hanem hogy mikor kezded — a korai évek hozzák a legtöbbet.",

  "szabad-felhasznalasu-megtakaritas": (a, f) =>
    a.pain === "nosave"
      ? "Először azt nézzük meg, honnan szabadul fel a havi keret — utána jöhet a rendszeres félretétel. Kis összeggel is működik, a folytonosság hozza."
      : f.consumerDebt
      ? "A tartozás rendezése mellett is kell egy vésztartalék, különben a következő váratlan kiadás megint hitellel végződik."
      : "Nem minden cél a nyugdíj. Ehhez olyan megtakarítás kell, amihez hozzáférsz, amikor tényleg kell — a táv dönti el, milyen eszközzel.",

  "dijmentes-bankszamla": (a, f) =>
    "A bankköltség az a kiadás, amiért semmit nem kapsz. Van olyan számla, ahol feltétel nélkül 0 Ft a vezetés — ez a leggyorsabban meghozható döntés a listán.",
};

/* --- MEGJEGYZÉSEK ------------------------------------------------------
   Amit kihagytunk és miért, illetve az ellentmondó válaszok. Ez teszi a
   listát ellenőrizhetővé: a felhasználó látja, hogy a hiány szándékos. */
function buildNotes(a, f) {
  const out = [];

  if (!f.taxpayer)
    out.push(
      "Mivel most nem fizetsz szja-t, a 20%-os állami jóváírásokat (nyugdíj, egészségpénztár, lakáshitel-törlesztés) kihagytam a listáról — ezek szja nélkül nem érvényesíthetők. Ha a párod fizet szja-t, nála viszont működhetnek: ezt átnézzük."
    );

  if (a.pain === "notax" && !f.taxpayer)
    out.push(
      "Azt jelölted, hogy sok az adód, de azt is, hogy nem fizetsz szja-t. Ez a kettő kizárja egymást — beszéljük meg, pontosan melyik a helyzet, mert ettől függ a fél lista."
    );

  /* Csak annak mondjuk el, aki tényleg finanszírozást keres — akinek már
     fut a lakáshitele, az nem várta az Otthon Startot, ott ez csak zaj. */
  if (f.property && !f.firstHome && a.pain === "money")
    out.push(
      "Az Otthon Start első lakás szerzésére szól, ezért nálad nem szerepel. Piaci hitelnél viszont a bankok közti különbség milliós tétel — ott van mit nézni."
    );

  if (a.pain === "nosave" && f.anyDebt)
    out.push(
      "Azt írtad, nem marad félretenni való, és hitel is fut. Ilyenkor a sorrend számít: előbb a legdrágább tartozás és a fix költségek, csak utána a megtakarítás — fordítva nem működik."
    );

  if (f.expensiveDebt && a.debtgoal === "lower")
    out.push(
      "A hosszabb futamidő kisebb törlesztőt ad, de összesen többet fizetsz. Ez legitim döntés, ha most a havi mozgástér a fontos — csak tudni kell, mi az ára. A kalkulátorban mindkét irány kijön."
    );

  /* A leghalványabb megjegyzés, ezért a végén: csak visszaigazolja, hogy
     figyeltünk a válaszra. Ha van fontosabb mondanivaló, kiszorul. */
  if (a.car === "none")
    out.push("Autó nélkül a KGFB és a casco téma kimarad — ezt a kérdést emiatt nem is számoltam bele.");

  return out.slice(0, 3);
}

/* ====================================================================== */

const QUIZ = {
  title: "Pénzügyi Térkép",
  lead:
    "Hét gyors kérdés, kb. egy perc. A végén megmutatom, melyik három téma hozza neked most a legtöbb pénzt vagy a legnagyobb biztonságot — és azt is, mit miért hagytam ki.",
  steps: [
    {
      id: "life",
      kicker: "Élethelyzet",
      q: "Melyik írja le a leginkább a mostani helyzetedet?",
      opts: [
        {
          v: "single",
          label: "Egyedül, még építem",
          note: "Karrier kezdet, első komolyabb megtakarítások",
          w: { "nyugdij-megtakaritas": 3, "szabad-felhasznalasu-megtakaritas": 3, "dijmentes-bankszamla": 2, "baleset-biztositas": 2 },
        },
        {
          v: "couple",
          label: "Párban, gyerek még nincs",
          note: "Közös célok, lakás, tartalék",
          w: { "tamogatott-hitelek": 3, "szabad-felhasznalasu-megtakaritas": 2, "nyugdij-megtakaritas": 2, "elet-biztositas": 1, "egeszsegbiztositas": 1 },
        },
        {
          v: "smallkids",
          label: "Kisgyerekes család",
          note: "Sok kiadás, kevés idő",
          w: { "adokedvezmeny-gyerek-no": 4, "gyerek-megtakaritas": 3, "elet-biztositas": 3, "egeszsegbiztositas": 2 },
        },
        {
          v: "schoolkids",
          label: "Iskolás vagy nagyobb gyerekek",
          note: "Tanszer, sport, jövőtervezés",
          w: { "adokedvezmeny-gyerek-no": 4, "gyerek-megtakaritas": 3, "baleset-biztositas": 2, "nyugdij-megtakaritas": 2 },
        },
        {
          v: "mature",
          label: "50 felett, a nyugdíj a téma",
          note: "Utolsó nagy szakasz a felkészülésre",
          w: { "nyugdij-megtakaritas": 4, "egeszsegbiztositas": 3, "adokedvezmeny-gyerek-no": 2 },
        },
      ],
    },
    {
      id: "home",
      kicker: "Lakhatás",
      q: "Hogy állsz a lakhatással?",
      opts: [
        {
          v: "withparents",
          label: "Családnál lakom",
          note: "Nincs lakhatási költség — most lehet a legtöbbet félretenni",
          w: { "szabad-felhasznalasu-megtakaritas": 4, "tamogatott-hitelek": 3, "nyugdij-megtakaritas": 2 },
        },
        {
          v: "rent",
          label: "Bérlek",
          note: "A saját lakás a cél",
          w: { "tamogatott-hitelek": 4, "szabad-felhasznalasu-megtakaritas": 3, "dijmentes-bankszamla": 1 },
        },
        {
          v: "plan",
          label: "Most vásárolnék elsőként",
          note: "Otthon Start-terület",
          w: { "tamogatott-hitelek": 5, "piaci-hitelek": 2, "szabad-felhasznalasu-megtakaritas": 2, "elet-biztositas": 1 },
        },
        {
          v: "loan",
          label: "Van lakáshitelem",
          note: "Van mit optimalizálni",
          w: { "adokedvezmeny-lakashitel": 5, "elet-biztositas": 3, "piaci-hitelek": 3 },
        },
        {
          v: "own",
          label: "Saját lakás, hitel nélkül",
          note: "Szabad kapacitás megtakarításra",
          w: { "nyugdij-megtakaritas": 3, "szabad-felhasznalasu-megtakaritas": 3, "egeszsegbiztositas": 2 },
        },
      ],
    },
    {
      id: "car",
      kicker: "Autó",
      q: "Autó?",
      opts: [
        { v: "none", label: "Nincs", note: "Ez a téma kimarad", w: {} },
        {
          v: "kgfb",
          label: "Van, csak kötelezővel",
          note: "Évfordulós váltás lehetőség",
          w: { "kgfb-casco": 4 },
        },
        {
          v: "casco",
          label: "Van, cascóval is",
          note: "Két szerződés, két optimalizálási pont",
          w: { "kgfb-casco": 3, "baleset-biztositas": 1 },
        },
        {
          v: "buy",
          label: "Most veszek autót",
          note: "Hitel + biztosítás egyszerre",
          w: { "kgfb-casco": 4, "szemelyi-kolcson": 3 },
        },
      ],
    },
    {
      /* Ez a kérdés hiányzott korábban, és emiatt a térkép vak volt a
         legdrágább pénzre: aki csak személyi kölcsönt vagy hitelkártyát
         fizetett, arról a rendszer nem tudott, így a kiváltás — a
         leggyorsabban realizálható megtakarítás — sosem került elő. */
      id: "debt",
      kicker: "Hitelek",
      q: "A lakhatáson kívül van futó hiteled?",
      help: "Több választ is megjelölhetsz. A kiváltás itt szokta hozni a legtöbbet.",
      multi: true,
      opts: [
        {
          v: "none",
          label: "Nincs futó hitelem",
          note: "A szabad kapacitás mehet megtakarításra",
          exclusive: true,
          w: { "szabad-felhasznalasu-megtakaritas": 2, "nyugdij-megtakaritas": 1 },
        },
        {
          v: "personal",
          label: "Személyi kölcsön",
          note: "Kiváltással gyakran csökkenthető a THM",
          w: { "szemelyi-kolcson": 5 },
        },
        {
          v: "card",
          label: "Hitelkártya, áruhitel, folyószámlahitel",
          note: "Itt a legmagasabb a THM — ez a legdrágább pénz",
          w: { "szemelyi-kolcson": 5, "dijmentes-bankszamla": 2 },
        },
        {
          v: "carloan",
          label: "Autóhitel vagy lízing",
          note: "A biztosítással együtt érdemes nézni",
          w: { "szemelyi-kolcson": 3, "kgfb-casco": 1 },
        },
        {
          v: "other",
          label: "Egyéb tartozás, részletfizetés",
          note: "Több kis részlet együtt is sokat visz el",
          w: { "szemelyi-kolcson": 3, "dijmentes-bankszamla": 1 },
        },
      ],
    },
    {
      /* Csak azoknak jelenik meg, akiknek tényleg van mit kiváltani.
         A három irány nem ízlés kérdése: ugyanaz a tartozás máshogy jön ki
         kisebb törlesztővel, rövidebb futamidővel és a teljes visszafizetésre
         optimalizálva — a szolgáltatás-kalkulátor mindhármat megmutatja. */
      id: "debtgoal",
      kicker: "Cél a hitelekkel",
      q: "Mi lenne most a legjobb megoldás a futó hiteleidre?",
      help: "A lakáshitelre és a fedezetlen hitelekre egyaránt vonatkozik. Kiváltásnál mindhárom irány létezik — csak nem ugyanaz az áruk.",
      /* Lakáshitelesnek is feltesszük: a jelzálog-kiváltás ugyanennek a
         kérdésnek a másik fele, és a bankok közti szórás ott a legnagyobb. */
      when: (a) => facts(a).anyDebt,
      opts: [
        {
          v: "lower",
          label: "Legyen kisebb a havi törlesztő",
          note: "Akár hosszabb futamidővel — most a mozgástér a fontos",
          w: { "szemelyi-kolcson": 4, "piaci-hitelek": 3, "dijmentes-bankszamla": 1 },
        },
        {
          v: "faster",
          label: "Legyen hamarabb vége",
          note: "Ugyanennyi törlesztő, rövidebb futamidő, kevesebb kamat",
          w: { "szemelyi-kolcson": 4, "piaci-hitelek": 3, "szabad-felhasznalasu-megtakaritas": 1 },
        },
        {
          v: "cheaper",
          label: "Összesen fizessek kevesebbet",
          note: "A teljes visszafizetés a mérce, nem a törlesztő",
          w: { "szemelyi-kolcson": 5, "piaci-hitelek": 4 },
        },
        {
          v: "fine",
          label: "Elbírom, nem ez a fő gondom",
          note: "Akkor másra koncentrálunk",
          w: {},
        },
      ],
    },
    {
      id: "pain",
      kicker: "Fókusz",
      q: "Mi zavar most a legjobban a pénzügyeidben?",
      opts: [
        {
          v: "notax",
          label: "Túl sok adót fizetek",
          note: "Van rá három legális eszköz",
          w: { "nyugdij-megtakaritas": 4, "adokedvezmeny-gyerek-no": 4, "adokedvezmeny-lakashitel": 3 },
        },
        {
          v: "nosave",
          label: "Nem marad félretenni való",
          note: "Először a kiadási oldalt nézzük",
          w: { "dijmentes-bankszamla": 4, "kgfb-casco": 3, "szabad-felhasznalasu-megtakaritas": 2 },
        },
        {
          v: "risk",
          label: "Kiszolgáltatottnak érzem magunkat",
          note: "Ha valami történik, összeomlik a kassza",
          w: { "elet-biztositas": 4, "baleset-biztositas": 4, "egeszsegbiztositas": 2 },
        },
        {
          v: "money",
          label: "Most kell pénz egy célra",
          note: "Finanszírozás",
          /* Az Otthon Start SZÁNDÉKOSAN nincs itt: az nem „kell most pénz”
             típusú igény, hanem lakásszerzés. Korábban innen kapott pontot,
             és emiatt eladósodott albérlőknek is a lakásvásárlás került a
             listájára — ez a valóságban rossz tanács. */
          w: { "szemelyi-kolcson": 4, "piaci-hitelek": 3 },
        },
        {
          v: "future",
          label: "Nem látom, mi lesz 10–20 év múlva",
          note: "Terv kell, nem termék",
          w: { "nyugdij-megtakaritas": 4, "gyerek-megtakaritas": 2, "szabad-felhasznalasu-megtakaritas": 2 },
        },
      ],
    },
    {
      id: "health",
      kicker: "Egészség",
      q: "Mikor jártál utoljára szakorvosnál várólista nélkül?",
      opts: [
        {
          v: "private",
          label: "Privátban járok, zsebből fizetem",
          note: "Ez tipikusan kiváltható előfizetéssel",
          w: { "egeszsegbiztositas": 4, "adokedvezmeny-gyerek-no": 3 },
        },
        {
          v: "waited",
          label: "Hónapokat vártam",
          note: "Itt van a legnagyobb életszínvonal-nyereség",
          w: { "egeszsegbiztositas": 4, "adokedvezmeny-gyerek-no": 1 },
        },
        {
          v: "rare",
          label: "Ritkán fordulok orvoshoz",
          note: "Prevenció és baleseti fedezet a fókusz",
          w: { "baleset-biztositas": 2, "egeszsegbiztositas": 1 },
        },
        {
          v: "kids",
          label: "A gyerekekkel járunk gyakran",
          note: "Gyermek-szakrendelés + pénztári elszámolás",
          w: { "egeszsegbiztositas": 3, "adokedvezmeny-gyerek-no": 4 },
        },
      ],
    },
    {
      id: "tax",
      kicker: "Adózás",
      q: "Fizetsz személyi jövedelemadót?",
      help: "A 20%-os állami jóváírásokhoz ez a feltétel. Ha nem, más eszközökre koncentrálunk.",
      opts: [
        {
          v: "yes",
          label: "Igen",
          note: "Minden adókedvezmény nyitva áll",
          w: { "nyugdij-megtakaritas": 3, "adokedvezmeny-gyerek-no": 3, "adokedvezmeny-lakashitel": 2 },
        },
        {
          v: "exempt",
          label: "Nem, kedvezmény miatt nem fizetek",
          note: "Pl. gyermeket nevelő anyák szja-mentessége",
          w: { "gyerek-megtakaritas": 3, "szabad-felhasznalasu-megtakaritas": 3, "elet-biztositas": 2, "dijmentes-bankszamla": 2 },
        },
        {
          v: "dunno",
          label: "Nem tudom pontosan",
          note: "Átnézzük együtt",
          w: { "nyugdij-megtakaritas": 1, "adokedvezmeny-gyerek-no": 1, "dijmentes-bankszamla": 1 },
        },
      ],
    },
  ],

  /** A ténylegesen feltett kérdések — a `when` nélküli lépések mindig,
      a feltételesek csak akkor, ha az eddigi válaszokra illeszkednek. */
  visibleSteps(answers) {
    return this.steps.filter((s) => typeof s.when !== "function" || s.when(answers || {}));
  },

  /** Válaszok → rangsorolt slug-lista. Csak a jogosult témák kerülnek bele,
      döntetlennél a TIEBREAK sorrend dönt. */
  score(answers) {
    const a = answers || {};
    const f = facts(a);
    const totals = {};

    this.visibleSteps(a).forEach((step) => {
      const picked = a[step.id];
      asList(picked).forEach((v) => {
        const opt = step.opts.find((o) => String(o.v) === String(v));
        if (!opt) return;
        Object.entries(opt.w || {}).forEach(([slug, w]) => {
          totals[slug] = (totals[slug] || 0) + w;
        });
      });
    });

    const rank = (slug) => {
      const i = TIEBREAK.indexOf(slug);
      return i < 0 ? TIEBREAK.length : i;
    };

    return Object.entries(totals)
      .filter(([slug]) => {
        const gate = ELIGIBLE[slug];
        return typeof gate !== "function" || gate(a, f);
      })
      .map(([slug, score]) => ({ slug, score }))
      .sort((x, y) => y.score - x.score || rank(x.slug) - rank(y.slug));
  },

  /** A megjelenítendő top-N: rangsor + indoklás, garantáltan N elemmel. */
  top(answers, n) {
    const a = answers || {};
    const f = facts(a);
    const list = this.score(a).slice(0, n || 3);

    /* Feltöltés, ha a kizárások után kevés maradt. A tartalék elemek
       feltétel nélkül elérhetők, tehát nem hazudunk velük. */
    for (const slug of FALLBACK) {
      if (list.length >= (n || 3)) break;
      if (!list.some((r) => r.slug === slug)) list.push({ slug, score: 0 });
    }

    return list.map((r) => ({
      ...r,
      reason: typeof REASON[r.slug] === "function" ? REASON[r.slug](a, f) : "",
    }));
  },

  /** Amit kihagytunk és miért, illetve az ellentmondó válaszok. */
  notes(answers) {
    const a = answers || {};
    return buildNotes(a, facts(a));
  },
};


Object.assign(window.EP, { QUIZ });
