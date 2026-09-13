/* ==========================================================================
   VÁROSI OLDALAK — 8 nagyváros, /penzugyi-tanacsadas/<slug>/
   --------------------------------------------------------------------------
   SZABÁLYOK (YMYL + Google spam-irányelvek, lásd SEO-AUDIT-AFTER.md):

   1. Nincs kitalált iroda, cím, telefonszám, ügyfélszám, vélemény. Személyes
      találkozó CSAK ott szerepel, ahol az oldal máshol is állítja
      (`inPerson: true` — jelenleg csak Budapest, a főoldal „Hol érsz el”
      blokkja szerint). Minden más városban a tanácsadás online megy, az
      aláírás módját egyeztetjük (ez a főoldali GYIK szövege).
      → Ha a tulajdonos megerősíti, hogy pl. Győrben is fogad személyesen,
        elég az `inPerson` mezőt átírni, a sablon a szöveget is váltja.

   2. Nem városnév-csere. A bevezető, a helyi témák, a GYIK és a CTA minden
      városnál saját — a sablon csak a közös részt (folyamat, ki vagyok,
      jogi keret, Pénzügyi Térkép) adja hozzá.

   3. Helyi tény csak olyan, ami közismert és ellenőrizhető (megyeszékhely,
      egyetem, nagy munkáltató, földrajzi helyzet). Statisztikai számot
      (népesség, átlagár, átlagbér) forrás nélkül nem írunk.

   A belső linkek gyökértől íródnak (href="/..."), a generátor alakítja
   relatívvá (relLinks).
   ========================================================================== */

export const CITIES = [
  /* ------------------------------------------------------------------ */
  {
    slug: "budapest",
    name: "Budapest",
    loc: "Budapesten",
    from: "Budapestről",
    adj: "budapesti",
    county: "főváros",
    wikidata: "https://www.wikidata.org/wiki/Q1781",
    inPerson: true,
    seo: {
      title: "Pénzügyi tanácsadó Budapesten — személyesen is | Érték Pont",
      desc:
        "Pénzügyi tanácsadás Budapesten: lakáshitel és Otthon Start a budapesti árakhoz, tartalék, " +
        "nyugdíj-megtakarítás, biztosítás. Személyesen vagy online, díjmentesen.",
    },
    h1: "Pénzügyi tanácsadás Budapesten",
    lead:
      "Budapesten a legtöbb pénzügyi döntés a lakás körül forog: bérelj vagy vegyél, mekkora " +
      "hitel fér bele, és mi marad utána a tartalékra. Találkozhatunk személyesen, vagy mehet " +
      "az egész videóhíváson — a számolás mindkét esetben ugyanaz.",
    intro: [
      `A fővárosban ugyanaz a fizetés általában kevesebb mozgásteret hagy, mint vidéken, mert a
      lakhatás — akár bérleti díj, akár törlesztő — nagyobb részt visz el belőle. Ezért itt a
      <a href="/penzugyi-tervezes/">pénzügyi tervezés</a> első kérdése szinte mindig az, mennyi
      marad a hónap végén, és az mire elég: tartalékra, a lakás önerejére, vagy egy hosszú távú
      célra.`,
      `Az első beszélgetés nem egy termékkel kezdődik, hanem a te számaiddal: jövedelem, fix
      kiadások, meglévő hitelek és szerződések, és a következő 3–5 év tervei. Ebből derül ki,
      hogy nálad a lakáscél, a tartalék vagy valami egészen más a sürgős.`,
    ],
    topicsTitle: "Amire Budapesten különösen érdemes figyelni",
    topics: [
      {
        h: "Otthon Start budapesti négyzetméterárakkal",
        t: "A fix 3%-os Otthon Start hitelhez a lakásnak is meg kell felelnie: legfeljebb 100 millió forint vételár és legfeljebb 1,5 millió Ft/m². Budapesten — főleg új építésű lakásoknál — ez a korlát gyakran szűkebb, mint vidéken, ezért érdemes a keresés ELŐTT kiszámolni, milyen lakás fér bele egyáltalán.",
        href: "/szolgaltatas/tamogatott-hitelek.html",
        label: "Otthon Start feltételei és törlesztő",
      },
      {
        h: "Bérlés vagy vásárlás",
        t: "A bérleti díj és egy lehetséges törlesztő összevetése csak az első lépés. Bele kell számolni az önerőt, a vásárlás egyszeri költségeit (ügyvéd, értékbecslés, illeték) és azt, hogy a tartalékod ne a foglalóban tűnjön el.",
        href: "/szolgaltatas/piaci-hitelek.html",
        label: "Lakáshitel és THM-összehasonlítás",
      },
      {
        h: "Tartalék magas fix kiadások mellett",
        t: "Ha a lakhatás viszi a jövedelem nagyobb részét, egy váratlan kiadás (javítás, orvos, munkahelyváltás) gyorsan hitelkártyára tolódik. A vésztartalék itt nem luxus, hanem az első lépés — akkor is, ha kicsiben indul.",
        href: "/szolgaltatas/szabad-felhasznalasu-megtakaritas.html",
        label: "Célösszeg és havi megtakarítás kiszámítása",
      },
      {
        h: "Munkáltatói juttatások és pénztárak",
        t: "Ha a munkáltatód fizet önkéntes nyugdíj- vagy egészségpénztárba, az már egy működő számla, amire építeni lehet. A saját befizetésed után járó 20%-os adójóváírással együtt ez sokszor a legolcsóbb első lépés.",
        href: "/szolgaltatas/nyugdij-megtakaritas.html",
        label: "Nyugdíj-megtakarítás és adójóváírás",
      },
    ],
    faq: [
      {
        q: "Hol tudunk Budapesten személyesen találkozni?",
        a: "A helyet és az időpontot az első telefonbeszélgetésnél egyeztetjük, a te napirendedhez igazítva. Ha neked egyszerűbb, az egész folyamat — összehasonlítás, számolás, ajánlatkérés — online is végigmegy, videóhíváson és e-mailben.",
      },
      {
        q: "Mennyire szűk Budapesten az Otthon Start négyzetméterár-korlátja?",
        a: "A korlát 1,5 millió Ft/m², és a vételár sem haladhatja meg a 100 millió forintot. Hogy egy konkrét lakás belefér-e, a hirdetési árból és az alapterületből egy perc alatt kiszámolható. Ha nem fér bele, megnézzük, milyen piaci vagy kombinált finanszírozás jöhet szóba — és az mennyivel drágább.",
      },
      {
        q: "Agglomerációban lakom. Nekem is tudsz segíteni?",
        a: "Igen. Az online konzultáció lakóhelytől független, a személyes találkozó helyét pedig Budapesten egyeztetjük. A pénzügyi kérdések (hitel, megtakarítás, biztosítás) szempontjából a lakcím általában nem számít — az Otthon Start például az egész országban igénybe vehető.",
      },
      {
        q: "Most bérelek. Érdemes egyáltalán lakáshitelben gondolkodnom?",
        a: "Általánosan nem lehet eldönteni. Három számot nézünk meg: a tervezett törlesztő a nettó jövedelmed hányad része (a bank is ezt vizsgálja a JTM-szabály miatt), mennyi önerő áll rendelkezésre, és mekkora tartalék marad a vásárlás után. Ha a három együtt nem áll össze, azt is megmondom — és azt is, mi kellene hozzá.",
      },
    ],
    cta: {
      h: "Pénzügyi konzultáció Budapesten — személyesen vagy online",
      p: "Töltsd ki a Pénzügyi Térképet: hét kérdés, egy perc. 24 órán belül visszahívlak, és megbeszéljük, hogy személyesen vagy videóhíváson folytatjuk.",
    },
    services: ["tamogatott-hitelek", "piaci-hitelek", "szabad-felhasznalasu-megtakaritas", "nyugdij-megtakaritas"],
    articles: ["haztartasi-koltsegvetes-es-vesztartalek", "penzugyi-tanacsado-ellenorzese"],
  },

  /* ------------------------------------------------------------------ */
  {
    slug: "debrecen",
    name: "Debrecen",
    loc: "Debrecenben",
    from: "Debrecenből",
    adj: "debreceni",
    county: "Hajdú-Bihar vármegye",
    wikidata: "https://www.wikidata.org/wiki/Q79880",
    inPerson: false,
    seo: {
      title: "Pénzügyi tanácsadó Debrecen — online konzultáció | Érték Pont",
      desc:
        "Pénzügyi tanácsadás Debrecenből, online: első fizetés és első lakás, Otthon Start, " +
        "nyugdíj-megtakarítás 25 év alatt is, KGFB. Díjmentes, 24 órán belüli visszahívás.",
    },
    h1: "Pénzügyi tanácsadás Debrecenben, online",
    lead:
      "Debrecen az ország második legnagyobb városa: egyetemi központ, és az elmúlt évek nagy " +
      "ipari beruházásainak egyik helyszíne. Aki itt kezd dolgozni, családot alapít vagy első " +
      "lakást venne, ugyanazt kérdezi: mennyi marad, mire elég, és mit érdemes most elindítani.",
    intro: [
      `Debrecenből a tanácsadás online zajlik: videóhíváson, telefonon és e-mailben. Az
      ajánlatokat képernyőn együtt nézzük át, a dokumentumokat elektronikusan küldöd, és ha
      valamelyik szerződéshez személyes aláírás kell, annak módját előre egyeztetjük.`,
      `A leggyakoribb helyzet, amivel egy egyetemi és ipari városban érdemes foglalkozni, az
      <strong>első lépések sorrendje</strong>: első fizetés, első bankszámla, első megtakarítás,
      első lakás. Magam is egyetem mellett vállalkozom, ezért ezt a szakaszt belülről ismerem —
      és tudom, hogy itt a jó sorrend többet ér, mint bármelyik termék.`,
    ],
    topicsTitle: "Tipikus debreceni helyzetek — és hol kezdd",
    topics: [
      {
        h: "Első munkahely, első fizetés",
        t: "Egy új munkahelyen a legtöbb pénzügyi döntés az első hónapokban születik: bankszámla, cafeteria, önkéntes pénztár, csoportos biztosítás. Ha ezeket az elején jól állítod be, évekig nem kell hozzájuk nyúlni — és nem fizetsz feleslegesen számlavezetési díjat.",
        href: "/szolgaltatas/dijmentes-bankszamla.html",
        label: "Díjmentes bankszámla — mennyit fizetsz ma?",
      },
      {
        h: "Otthon Start az első lakáshoz",
        t: "A fix 3%-os Otthon Start elsősorban első lakás megszerzésére való, és a hitelösszegtől függően 1–2 év folyamatos TB-jogviszonyt kér. Munkahelyváltásnál érdemes előre megnézni, hogy a jogviszony folyamatos maradt-e — a megszakítás hossza számíthat.",
        href: "/szolgaltatas/tamogatott-hitelek.html",
        label: "Jogosult vagy? Otthon Start kalkulátor",
      },
      {
        h: "Nyugdíjcél 25 év alatt: nézd meg az szja-t",
        t: "Minél korábban indul a nyugdíjcélú megtakarítás, annál kisebb havi összeg elég. A 20%-os adójóváírás viszont csak a ténylegesen befizetett szja-ból jár — a 25 év alattiak kedvezménye miatt ez fiatalon kevesebb vagy nulla is lehet. Ilyenkor más a jó konstrukció.",
        href: "/szolgaltatas/nyugdij-megtakaritas.html",
        label: "Nyugdíj-megtakarítás és adójóváírás",
      },
      {
        h: "Autóval jársz dolgozni? KGFB-évforduló",
        t: "Ha az új munkahely autóval érhető el, a kötelező biztosítást és a casco-t érdemes évente átnézni. A KGFB az évforduló előtti 30. napig mondható fel — ha ez lecsúszik, egy évet vársz a következő lehetőségre.",
        href: "/szolgaltatas/kgfb-casco.html",
        label: "KGFB-váltás határideje és összehasonlítás",
      },
    ],
    faq: [
      {
        q: "Debrecenből hogyan zajlik a tanácsadás, ha nem találkozunk személyesen?",
        a: "Egy 30–45 perces videóhívással vagy telefonnal indulunk. Előtte elég, ha kéznél vannak a meglévő szerződéseid (hitel, biztosítás, pénztár). Az összehasonlítást és az ajánlatokat e-mailben küldöm, és képernyőn együtt nézzük át. Ha egy szerződéshez személyes aláírás vagy azonosítás kell, annak módját előre egyeztetjük.",
      },
      {
        q: "25 év alatti vagyok. Jár nekem a nyugdíj-megtakarítás 20%-os adójóváírása?",
        a: "Csak akkor és annyi, amennyi szja-t ténylegesen fizetsz. A 25 év alattiak kedvezménye miatt a jövedelem egy része szja-mentes; ha emiatt nincs befizetett szja, jóváírás sem jár. A korai kezdésnek ilyenkor is lehet értelme, de más a számolás — ezt a konkrét béred alapján nézzük meg.",
      },
      {
        q: "Új munkahelyem van. Mikor igényelhetek Otthon Start hitelt?",
        a: "A hitelösszegtől függően 1–2 év folyamatos TB-jogviszony kell; a pontos szabályt és a kivételeket a bank a kérelemkor vizsgálja. Munkahelyváltásnál a jogviszony nem feltétlenül szakad meg, de a megszakítás hossza számít — ezért érdemes a váltás előtt vagy közvetlenül utána megnézni.",
      },
      {
        q: "Egyetemistaként van értelme pénzügyi tanácsadással foglalkozni?",
        a: "Igen, csak más a fókusz: díjmentes bankszámla, egy kis tartalék, és ha már dolgozol, az első rendszeres megtakarítás. Termékkötés nélkül is hasznos lehet egy beszélgetés arról, milyen sorrendben érdemes elindulni.",
      },
    ],
    cta: {
      h: "Pénzügyi konzultáció Debrecenből, online",
      p: "Hét kérdés, egy perc: a Pénzügyi Térkép megmutatja, melyik három téma a legfontosabb nálad. 24 órán belül hívlak, és videóhíváson folytatjuk.",
    },
    services: ["dijmentes-bankszamla", "tamogatott-hitelek", "nyugdij-megtakaritas", "kgfb-casco"],
    articles: ["haztartasi-koltsegvetes-es-vesztartalek", "penzugyi-tanacsado-ellenorzese"],
  },

  /* ------------------------------------------------------------------ */
  {
    slug: "szeged",
    name: "Szeged",
    loc: "Szegeden",
    from: "Szegedről",
    adj: "szegedi",
    county: "Csongrád-Csanád vármegye",
    wikidata: "https://www.wikidata.org/wiki/Q81581",
    inPerson: false,
    seo: {
      title: "Pénzügyi tanácsadó Szeged — tervezés, hitel, pénztár | Érték Pont",
      desc:
        "Pénzügyi tanácsadás Szegedről, online: fix bér melletti megtakarítás, egészségpénztár " +
        "20% visszatérítéssel, gyerek egyetemi évei, életbiztosítás hitel mellé. Díjmentes.",
    },
    h1: "Pénzügyi tanácsadás Szegeden, online",
    lead:
      "Szeged egyetemi és egészségügyi központ: sokan dolgoznak itt oktatásban, kutatásban, " +
      "egészségügyben vagy a közszférában, kiszámítható havi fizetéssel. Ilyenkor a kérdés " +
      "ritkán az, hogy „mennyi”, sokkal inkább az, hogy „mire és milyen sorrendben”.",
    intro: [
      `Fix jövedelem mellett a pénzügyi tervezés nagy része automatizálható: ha a megtakarítás
      fizetésnapon, átutalással elindul, el sem jut a napi költésig. A kérdés az, hogy a tartalék,
      a rövid távú célok és a hosszú távú (nyugdíj- vagy gyerekcélú) megtakarítás hogyan osztozzon
      ugyanazon a havi összegen.`,
      `Szegedről a tanácsadás online megy: videóhívás, telefon, e-mail. Ha egy szerződéshez
      személyes aláírás vagy azonosítás kell (lakáshitelnél ez gyakori), annak módját időben
      jelzem és egyeztetjük, hogy ne a folyamat végén érjen meglepetés.`,
    ],
    topicsTitle: "Amit egy szegedi családi költségvetésben érdemes átnézni",
    topics: [
      {
        h: "Fix bér, tervezhető megtakarítás",
        t: "Kiszámítható jövedelemnél a vésztartalék és a rövid távú célok (autó, felújítás, nyaralás) külön kezelhetők a nyugdíjcéltól. Kiszámoljuk, havonta mennyi kell a célösszeghez, és milyen forma illik a hozzá tartozó időtávhoz.",
        href: "/szolgaltatas/szabad-felhasznalasu-megtakaritas.html",
        label: "Mennyit tegyél félre a célodhoz?",
      },
      {
        h: "Egészségkiadások: 20% vissza a pénztáron át",
        t: "Ha a családban rendszeres a gyógyszer, szemüveg, fogászat vagy magánorvosi vizsgálat, ezeket egészség- és önsegélyező pénztáron keresztül fizetve a befizetés 20%-a évente legfeljebb 150 000 Ft-ig adójóváírásként visszajön.",
        href: "/szolgaltatas/adokedvezmeny-gyerek-no.html",
        label: "Egészségpénztár — mennyit kapsz vissza?",
      },
      {
        h: "A gyerek egyetemi évei",
        t: "Egy egyetemi városban jól látszik, mennyibe kerül egy diák albérlete és megélhetése. Ha a gyermeked 10–15 év múlva indul, egy kisebb, de hosszú ideig tartó havi megtakarítás most még sokat számít.",
        href: "/szolgaltatas/gyerek-megtakaritas.html",
        label: "Gyerek-megtakarítás 18 éves korig",
      },
      {
        h: "Életbiztosítás, ha hitel van",
        t: "Ha a családi költségvetés egy vagy két fizetésre épül és lakáshitel is fut, a kérdés az, mi történik a törlesztővel, ha az egyik jövedelem kiesik. A szükséges biztosítási összeg kiszámolható — nem kell ráérzésből dönteni.",
        href: "/szolgaltatas/elet-biztositas.html",
        label: "Mekkora életbiztosítási összeg indokolt?",
      },
    ],
    faq: [
      {
        q: "Szegedről online is végig lehet vinni egy lakáshitel-ügyet?",
        a: "Az összehasonlítás, a számolás és az ajánlatkérés online megy. A bankok a hitelszerződéshez jellemzően személyes megjelenést vagy azonosítást kérnek; ennek módját a választott bank határozza meg. Ezt időben jelzem, hogy be tudd tervezni.",
      },
      {
        q: "Közszférában dolgozom, fix bérrel. Mire figyeljek a megtakarításnál?",
        a: "Arra, hogy a befizetés folyamatos legyen, és illeszkedjen a célhoz: a tartalék legyen gyorsan elérhető, a nyugdíjcélú rész pedig ott legyen, ahol az állam 20%-kal beszáll. Ha a munkáltatód fizet önkéntes pénztárba, azt a saját befizetéseddel együtt nézzük meg.",
      },
      {
        q: "Mennyi pénzt kapok vissza az egészségpénztári befizetés után?",
        a: "A befizetés 20%-át, évente legfeljebb 150 000 Ft-ot — feltéve, hogy van ennyi befizetett szja-d. A 150 000 Ft-os plafont 750 000 Ft éves befizetés éri el. A jóváírás a pénztári számládra érkezik, nem a folyószámládra.",
      },
      {
        q: "Mennyi idő után keresel, ha kitöltöm az űrlapot?",
        a: "A megadott telefonszámon 24 órán belül keresem, jellemzően hétköznap 9 és 19 óra között. Ha más időpont jobb neked, a megjegyzés rovatba írd be.",
      },
    ],
    cta: {
      h: "Pénzügyi tervezés Szegedről — egy perccel kezdődik",
      p: "A Pénzügyi Térkép hét kérdés alapján megmutatja, hol van nálad a legtöbb pénz vagy biztonság. Utána 24 órán belül keresek, és online folytatjuk.",
    },
    services: ["szabad-felhasznalasu-megtakaritas", "adokedvezmeny-gyerek-no", "gyerek-megtakaritas", "elet-biztositas"],
    articles: ["haztartasi-koltsegvetes-es-vesztartalek", "penzugyi-tanacsado-ellenorzese"],
  },

  /* ------------------------------------------------------------------ */
  {
    slug: "miskolc",
    name: "Miskolc",
    loc: "Miskolcon",
    from: "Miskolcról",
    adj: "miskolci",
    county: "Borsod-Abaúj-Zemplén vármegye",
    wikidata: "https://www.wikidata.org/wiki/Q102397",
    inPerson: false,
    seo: {
      title: "Pénzügyi tanácsadó Miskolc — hitel, lakás, védelem | Érték Pont",
      desc:
        "Pénzügyi tanácsadás Miskolcról, online: drága hitelek kiváltása, saját lakás Otthon " +
        "Starttal, felújítás finanszírozása, baleset- és jövedelemvédelem. Díjmentesen.",
    },
    h1: "Pénzügyi tanácsadás Miskolcon, online",
    lead:
      "Miskolcon a lakásárak jellemzően elmaradnak a fővárosiaktól — ez könnyebbé teheti a " +
      "saját otthont, de a bérek is alacsonyabbak a budapesti átlagnál. Ezért itt nem a hitel " +
      "nagysága a fő kérdés, hanem az, hogy a törlesztő mellett marad-e tartalék.",
    intro: [
      `A pénzügyi tanácsadás Miskolcról ugyanúgy működik, mint bárhonnan az országból: online,
      díjmentesen, egy 30–45 perces első beszélgetéssel. Nem kell hozzá semmit előkészíteni,
      csak kéznél lennie a meglévő hitel- és biztosítási szerződéseidnek.`,
      `Ahol több kisebb hitel fut egyszerre — személyi kölcsön, hitelkártya, áruhitel —, ott a
      legnagyobb megtakarítás gyakran nem egy új termékből, hanem a meglévők rendbetételéből jön.
      Ezt mindig kiszámoljuk, mielőtt bármit javaslok.`,
    ],
    topicsTitle: "Miskolci helyzetek, ahol a számolás sokat hoz",
    topics: [
      {
        h: "Drága hitelek kiváltása",
        t: "Ha egyszerre fut személyi kölcsön, hitelkártya-tartozás és áruhitel, a THM-ek összevetése gyakran megmutatja, hogy egy kiváltással kisebb lehet a teljes visszafizetés. Nem mindig — de mindig kiszámolható, a kiváltás költségeivel együtt.",
        href: "/szolgaltatas/szemelyi-kolcson.html",
        label: "Személyi kölcsön és hitelkiváltás",
      },
      {
        h: "Saját lakás vidéki árakon",
        t: "Ahol alacsonyabbak a négyzetméterárak, az Otthon Start korlátai (legfeljebb 100 millió Ft vételár és 1,5 millió Ft/m²) ritkábban szűkítik a választékot. A kérdés inkább az, mekkora az önerő, és mekkora törlesztő fér bele a JTM-korlátba.",
        href: "/szolgaltatas/tamogatott-hitelek.html",
        label: "Otthon Start — jogosultság és törlesztő",
      },
      {
        h: "Felújítás: megtakarítás, jelzálog vagy kölcsön?",
        t: "Régebbi házaknál és lakásoknál a vásárlás után sokszor a felújítás a nagyobb tétel. Megtakarításból, szabad felhasználású jelzáloghitelből vagy személyi kölcsönből is finanszírozható — a három teljes költsége nagyon eltér.",
        href: "/szolgaltatas/piaci-hitelek.html",
        label: "Jelzáloghitel és kiváltás összehasonlítása",
      },
      {
        h: "Baleset- és jövedelemvédelem",
        t: "Ha fizikai munkát végzel, a baleseti kockázat és a táppénz alatti jövedelemkiesés közvetlenül a családi költségvetést érinti. Egy jól méretezett baleset-biztosítás itt a törlesztőt és a napi kiadásokat védi.",
        href: "/szolgaltatas/baleset-biztositas.html",
        label: "Baleset-biztosítás — mekkora fedezet kell?",
      },
    ],
    faq: [
      {
        q: "Miskolcról is díjmentes a tanácsadás, vagy csak Budapesten?",
        a: "Ugyanúgy díjmentes, és ugyanúgy működik, online. A közvetítői jutalékot a biztosító, bank vagy pénztár fizeti, ha szerződés jön létre — ezt nyíltan elmondom, mert tudnod kell, miből él a tanácsadód.",
      },
      {
        q: "Érdemes kiváltani a személyi kölcsönömet?",
        a: "Akkor, ha az új hitel teljes visszafizetése a kiváltás költségeivel (előtörlesztési díj, az új hitel díjai) együtt is alacsonyabb, mint a mostanié. A személyi kölcsön oldalán lévő kalkulátor ezt ki is számolja; a pontos ajánlatot a bankok adják.",
      },
      {
        q: "Mekkora törlesztőt enged a bank a fizetésemhez?",
        a: "Az MNB jövedelemarányos törlesztőrészlet-mutatója (JTM) korlátozza: a nettó jövedelem egy meghatározott hányadánál nagyobb havi törlesztőt a bank nem engedhet. A pontos arány a jövedelem nagyságától és a kamatperiódustól függ, ezért a saját számaiddal nézzük meg.",
      },
      {
        q: "Van értelme biztosítást kötni, ha szűkös a költségvetés?",
        a: "Épp ilyenkor lehet a legfontosabb — de a sorrend számít: előbb egy kis tartalék, utána a jövedelmet védő fedezet, és csak utána a hosszú távú megtakarítás. Ha a költségvetésben most nincs rá hely, azt is megmondom.",
      },
    ],
    cta: {
      h: "Hitel, lakás, tartalék — nézzük meg Miskolcról, online",
      p: "Egy perc a Pénzügyi Térképpel, és kiderül, nálad melyik három téma hozza a legtöbbet. 24 órán belül visszahívlak.",
    },
    services: ["szemelyi-kolcson", "tamogatott-hitelek", "piaci-hitelek", "baleset-biztositas"],
    articles: ["haztartasi-koltsegvetes-es-vesztartalek", "penzugyi-tanacsado-ellenorzese"],
  },

  /* ------------------------------------------------------------------ */
  {
    slug: "pecs",
    name: "Pécs",
    loc: "Pécsett",
    from: "Pécsről",
    adj: "pécsi",
    county: "Baranya vármegye",
    wikidata: "https://www.wikidata.org/wiki/Q45779",
    inPerson: false,
    seo: {
      title: "Pénzügyi tanácsadó Pécs — online konzultáció | Érték Pont",
      desc:
        "Pénzügyi tanácsadás Pécsről, online: régi ingatlan felújításának finanszírozása, " +
        "egészségkiadások, nyugdíj előtti évek, unokáknak szóló megtakarítás. Díjmentes.",
    },
    h1: "Pénzügyi tanácsadás Pécsett, online",
    lead:
      "Pécs Magyarország első egyetemének városa és a Dél-Dunántúl központja. Aki itt vesz vagy " +
      "örököl ingatlant, gyakran nem a vásárlás, hanem a felújítás és a fenntartás " +
      "finanszírozásán gondolkodik — a családi költségvetésben pedig az egészség is komoly tétel.",
    intro: [
      `Pécsről a tanácsadás online megy: egy 30–45 perces első beszélgetés videóhíváson vagy
      telefonon, utána e-mailben az összehasonlítás. Ha egyetlen konkrét szerződést szeretnél
      átnézetni (például egy régi életbiztosítást vagy egy egészségpénztári tagságot), gyakran
      15 perc is elég az első körhöz.`,
      `A pécsi kérdések jellemzően több generációt érintenek: a szülők nyugdíj előtti évei, a
      gyerekek lakáscélja, és az unokáknak szánt megtakarítás. Ezeket érdemes együtt látni,
      mert ugyanabból a családi pénzből gazdálkodnak.`,
    ],
    topicsTitle: "Pécsi élethelyzetek és a hozzájuk tartozó döntések",
    topics: [
      {
        h: "Örökölt vagy régi ingatlan felújítása",
        t: "Egy régebbi ház vagy lakás korszerűsítése sokszor nagyobb tétel, mint gondolnánk. Szabad felhasználású jelzáloghitel, személyi kölcsön vagy megtakarítás — a teljes visszafizetés és a futamidő alapján dől el, melyik a jó.",
        href: "/szolgaltatas/piaci-hitelek.html",
        label: "Jelzáloghitel és THM-összehasonlítás",
      },
      {
        h: "Egészségkiadások tervezése",
        t: "Ha rendszeresen fizetsz magánrendelésért, laborért vagy diagnosztikáért, érdemes összevetni az éves költséget egy magán egészségbiztosítás díjával — és azt is megnézni, mit tud ebből egy egészségpénztár 20%-os jóváírással.",
        href: "/szolgaltatas/egeszsegbiztositas.html",
        label: "Egészségbiztosítás vagy zsebből?",
      },
      {
        h: "10–15 évvel a nyugdíj előtt",
        t: "Ha ötven körül vagy, a hátralévő időben az adójóváírás a legnagyobb húzóerő: a befizetés 20%-a, évente akár 280 000 Ft jön vissza a nyugdíjszámlára — ez rövid távon is kiszámítható, nem a hozamon múlik.",
        href: "/szolgaltatas/nyugdij-megtakaritas.html",
        label: "Nyugdíj-megtakarítás 50 felett",
      },
      {
        h: "Nagyszülők és unokák",
        t: "Sok családban a nagyszülők is félretennének az unokáknak. Ilyenkor előre végig kell gondolni, ki legyen a szerződő, ki a kedvezményezett, és ki rendelkezhet a pénz felett 18 éves kor után.",
        href: "/szolgaltatas/gyerek-megtakaritas.html",
        label: "Gyerek-megtakarítás — mennyi lesz 18 évesen?",
      },
    ],
    faq: [
      {
        q: "Pécsről is kérhetek tanácsot egyetlen szerződés átnézésére?",
        a: "Igen. Egy meglévő életbiztosítás, nyugdíjbiztosítás vagy pénztári tagság átnézése gyakran 15 perc az első körben. Megnézzük a költségeit, a feltételeit, és hogy illik-e még a mostani helyzetedhez — akkor is, ha a végén az jön ki, hogy semmit nem kell változtatni.",
      },
      {
        q: "Felújításhoz hitelt vegyek fel, vagy várjak, amíg összegyűlik?",
        a: "Attól függ, mennyibe kerül a várakozás (például magasabb rezsi egy szigeteletlen házban) és mennyibe a hitel. Kiszámoljuk mindkettőt: a hitel teljes visszafizetését és azt, hogy havi megtakarítással mennyi idő alatt jönne össze az összeg.",
      },
      {
        q: "Megéri a magán egészségbiztosítás?",
        a: "Akkor, ha rendszeresen fizetsz magánellátásért, vagy fontos, hogy vizsgálatra ne kelljen hónapokat várni. Az egészségbiztosítás oldalán lévő kalkulátor összeveti az éves díjat a zsebből fizetett költséggel — ebből látszik, nálad melyik jön ki jobban.",
      },
      {
        q: "Nagyszülőként köthetek megtakarítást az unokámnak?",
        a: "Igen, a szerződő lehet a nagyszülő, a kedvezményezett az unoka. A részleteket (ki a szerződő, ki a biztosított, ki a kedvezményezett) előre érdemes végiggondolni, mert ettől függ, ki rendelkezik a pénz felett, és mi történik a szerződéssel egy váratlan helyzetben.",
      },
    ],
    cta: {
      h: "Pénzügyi konzultáció Pécsről — kezdjük egy perccel",
      p: "Töltsd ki a Pénzügyi Térképet, vagy írd a megjegyzésbe, melyik szerződést néznéd át. 24 órán belül keresek.",
    },
    services: ["piaci-hitelek", "egeszsegbiztositas", "nyugdij-megtakaritas", "gyerek-megtakaritas"],
    articles: ["penzugyi-tanacsado-ellenorzese", "haztartasi-koltsegvetes-es-vesztartalek"],
  },

  /* ------------------------------------------------------------------ */
  {
    slug: "gyor",
    name: "Győr",
    loc: "Győrben",
    from: "Győrből",
    adj: "győri",
    county: "Győr-Moson-Sopron vármegye",
    wikidata: "https://www.wikidata.org/wiki/Q134494",
    /* A székhely (Abda) Győr szomszédságában van — ha a tulajdonos
       megerősíti, hogy Győrben személyesen is fogad, ez true lehet. */
    inPerson: false,
    seo: {
      title: "Pénzügyi tanácsadó Győr — műszakpótlék, osztrák bér | Érték Pont",
      desc:
        "Pénzügyi tanácsadás győrieknek: változó, pótlékos jövedelem tervezése, Ausztriában " +
        "adózó bér és a 20% adójóváírás, munkáltatói pénztár, KGFB. Online, díjmentesen.",
    },
    h1: "Pénzügyi tanácsadás Győrben, online",
    lead:
      "Győr az ország egyik legerősebb ipari városa: az autóipar és a beszállítók sok ezer " +
      "embernek adnak munkát, Bécs és Pozsony pedig ingázható távolságban van. Ebből két " +
      "jellegzetes pénzügyi helyzet adódik: a pótlékoktól hullámzó fizetés, és az Ausztriában " +
      "adózó bér.",
    intro: [
      `A vállalkozásom székhelye Abdán van, Győr szomszédságában, ezért a győri és a környékbeli
      helyzeteket közelről ismerem. A tanácsadás online zajlik — videóhívás, telefon, e-mail —,
      és ha valamelyik szerződéshez személyes aláírás kell, annak módját egyeztetjük.`,
      `Győrben gyakori, hogy a családi költségvetés két nagyon különböző jövedelemre épül:
      egy műszakos, pótlékos bérre és egy fixre, vagy egy magyar és egy osztrák fizetésre.
      Ilyenkor nem működnek az általános ökölszabályok — a számolást a te jövedelmi
      szerkezetedhez kell igazítani.`,
    ],
    topicsTitle: "Győri helyzetek, ahol az általános szabály nem elég",
    topics: [
      {
        h: "Ausztriában dolgozol? Az adójóváírás itt másképp megy",
        t: "A 20%-os adójóváírás (nyugdíjpénztár, nyugdíjbiztosítás, NYESZ, egészségpénztár) a Magyarországon befizetett szja-ból jár. Ha a béred Ausztriában adózik, és itthon kevés vagy nulla az szja-d, a jóváírás is ennyivel kisebb — ilyenkor más forma lehet logikusabb.",
        href: "/szolgaltatas/nyugdij-megtakaritas.html",
        label: "Nyugdíj-megtakarítás és adójóváírás",
      },
      {
        h: "Pótlékoktól hullámzó fizetés",
        t: "Ha a havi nettó a műszakpótlék, a túlóra vagy a bónusz miatt változik, a fix kiadásokat az alapbérhez, a megtakarítást a változó részhez érdemes igazítani. Így egy gyengébb hónap sem borítja a költségvetést.",
        href: "/szolgaltatas/szabad-felhasznalasu-megtakaritas.html",
        label: "Célösszeg és havi megtakarítás",
      },
      {
        h: "Munkáltatói pénztár — építs rá",
        t: "Ha a munkáltatód fizet önkéntes nyugdíj- vagy egészségpénztárba, az már egy működő számla. Gyakran nem kell új szerződés, csak a saját befizetés beállítása ahhoz, hogy a 20%-os jóváírás is elinduljon.",
        href: "/szolgaltatas/adokedvezmeny-gyerek-no.html",
        label: "Egészségpénztár és 20% adójóváírás",
      },
      {
        h: "Napi ingázás autóval",
        t: "Ingázásnál az autó az egyik legnagyobb rendszeres költség. A KGFB az évforduló előtti 30. napig mondható fel, a casco-nál pedig az önrész és a kizárások számítanak — évente egyszer érdemes átnézni.",
        href: "/szolgaltatas/kgfb-casco.html",
        label: "KGFB és casco évfordulós váltás",
      },
    ],
    faq: [
      {
        q: "A székhelyed Győr mellett van. Tudunk személyesen találkozni?",
        a: "A vállalkozásom székhelye Abdán van. A tanácsadás győri ügyfeleknek is online zajlik; ha egy szerződéshez személyes találkozó vagy aláírás kell, annak módját és helyét a hívásnál egyeztetjük.",
      },
      {
        q: "Ausztriában dolgozom. Kaphatok 20%-os adójóváírást?",
        a: "Csak a Magyarországon befizetett szja erejéig. Ha a béred Ausztriában adózik, és itthon nincs vagy kevés a befizetett szja-d, a jóváírás is ennyivel kisebb vagy nulla. Ha van magyar jövedelmed is (például a párodnak), érdemes az adójóváírásos megtakarítást annak a nevére tenni, akinél van befizetett szja. A konkrét adóügyi helyzetedet adószakértő tudja véglegesen megítélni.",
      },
      {
        q: "Műszakban dolgozom, havonta más a fizetésem. Hogyan tervezzek?",
        a: "Az alapbérből indulunk: a fix kiadások (lakhatás, törlesztő, rezsi, biztosítás) férjenek bele pótlék nélkül. A pótlékokból és a bónuszból épül a tartalék és a megtakarítás — így egy gyengébb hónap sem jelent hitelkártyát.",
      },
      {
        q: "Mennyi idő alatt derül ki, hol veszítek pénzt?",
        a: "Az első beszélgetés 30–45 perc. Utána általában néhány napon belül megvan az összehasonlítás és a számolás arról, mi indokolt és mi nem — és az is, ha jelenleg semmit nem kell változtatni.",
      },
    ],
    cta: {
      h: "Pénzügyi konzultáció Győrből és a környékről",
      p: "Pótlékos bér, osztrák fizetés, munkáltatói pénztár — egy perc a Pénzügyi Térképpel, és 24 órán belül keresek a konkrét számokkal.",
    },
    services: ["nyugdij-megtakaritas", "szabad-felhasznalasu-megtakaritas", "adokedvezmeny-gyerek-no", "kgfb-casco"],
    articles: ["haztartasi-koltsegvetes-es-vesztartalek", "penzugyi-tanacsado-ellenorzese"],
  },

  /* ------------------------------------------------------------------ */
  {
    slug: "nyiregyhaza",
    name: "Nyíregyháza",
    loc: "Nyíregyházán",
    from: "Nyíregyházáról",
    adj: "nyíregyházi",
    county: "Szabolcs-Szatmár-Bereg vármegye",
    wikidata: "https://www.wikidata.org/wiki/Q171223",
    inPerson: false,
    seo: {
      title: "Pénzügyi tanácsadó Nyíregyháza — online | Érték Pont",
      desc:
        "Pénzügyi tanácsadás Nyíregyházáról, online: családi költségvetés gyerekekkel, anyai " +
        "szja-mentesség és megtakarítás, házépítés Otthon Starttal, szezonális bevétel.",
    },
    h1: "Pénzügyi tanácsadás Nyíregyházán, online",
    lead:
      "Nyíregyháza Szabolcs-Szatmár-Bereg vármegye székhelye: ipari üzemek, egyetem, és a " +
      "környéken erős mezőgazdasági háttér. A családi pénzügyekben itt gyakran a saját ház, " +
      "a gyerekek és a kiszámíthatatlan bevétel kezelése kerül előre.",
    intro: [
      `Nyíregyházáról a tanácsadás online megy: telefonon, videóhíváson és e-mailben, díjmentesen.
      Az első beszélgetés 30–45 perc, és nem kell hozzá felkészülni — elég, ha kéznél vannak a
      meglévő szerződéseid, és tudod, mit szeretnél a következő években.`,
      `Két dolog gyakran átrendezi a nyíregyházi családok számítását: az anyai szja-kedvezmények
      (amelyek miatt az állami 20%-os jóváírás egy része nem is jár), és a szezonálisan
      ingadozó bevétel. Mindkettőnél más a helyes sorrend, mint egy fix fizetésnél.`,
    ],
    topicsTitle: "Nyíregyházi családoknál ezekkel érdemes kezdeni",
    topics: [
      {
        h: "Anyai szja-mentesség és a 20%-os jóváírás",
        t: "Ha a gyermekeket nevelő anyák kedvezménye miatt nem (vagy kevesebb) szja-t fizetsz, az adójóváírásos megtakarítás — nyugdíjpénztár, egészségpénztár — nálad nem hoz 20%-ot. Ilyenkor érdemes azt a párod nevére tenni, vagy más formát választani.",
        href: "/szolgaltatas/gyerek-megtakaritas.html",
        label: "Gyerek-megtakarítás szja-mentesen is",
      },
      {
        h: "Házépítés vagy -vásárlás",
        t: "Az Otthon Start lakóingatlan vásárlására és építésére is igénybe vehető, fix 3%-os kamattal. Építésnél a folyósítás ütemezése és az önerő időzítése legalább annyira fontos, mint a kamat.",
        href: "/szolgaltatas/tamogatott-hitelek.html",
        label: "Otthon Start építéshez is",
      },
      {
        h: "Szezonális bevétel, egyenetlen hónapok",
        t: "Ha a bevételed évszakhoz kötött (mezőgazdaság, vállalkozás, idénymunka), a tartalékot a gyenge hónapokra kell méretezni, nem az átlagra. Kiszámoljuk, mekkora puffer kell ahhoz, hogy a fix kiadások a leggyengébb hónapban is kijöjjenek.",
        href: "/szolgaltatas/szabad-felhasznalasu-megtakaritas.html",
        label: "Tartalék és célösszeg kiszámítása",
      },
      {
        h: "Bankolás rejtett díjak nélkül",
        t: "A számlavezetési díj, a kártyadíj és az utalások költsége együtt évente meglepően nagy tétel lehet. Van feltétel nélküli 0 Ft-os csomag is — azt kell megnézni, a te szokásaidnál melyik jön ki valóban olcsóbban.",
        href: "/szolgaltatas/dijmentes-bankszamla.html",
        label: "Díjmentes bankszámla-kalkulátor",
      },
    ],
    faq: [
      {
        q: "Nyíregyházáról hogyan tudok konzultációt kérni?",
        a: "Kitöltheted a Pénzügyi Térképet ezen az oldalon, vagy felhívhatsz közvetlenül. 24 órán belül keresem a megadott számot, és egy 30–45 perces telefonos vagy videós beszélgetéssel indulunk.",
      },
      {
        q: "Szja-mentes édesanya vagyok. Mit jelent ez a megtakarításainkra?",
        a: "Azt, hogy a 20%-os adójóváírás — nyugdíjpénztár, nyugdíjbiztosítás, egészségpénztár — nálad csak a ténylegesen befizetett szja erejéig jár, vagyis kevesebb vagy nulla lehet. Ha a párod fizet szja-t, az ilyen megtakarítást érdemes az ő nevére tenni; a gyerekcélú megtakarítás pedig jóváírás nélkül is működik.",
      },
      {
        q: "Házat építenénk. Használható erre az Otthon Start?",
        a: "Igen, lakóingatlan építésére is igénybe vehető, fix 3%-os kamattal, legfeljebb 50 millió forintig. A feltételeket (első ingatlan, TB-jogviszony, értékhatárok) és a kivételeket a bank vizsgálja; előre érdemes megnézni, a te helyzeted belefér-e.",
      },
      {
        q: "Mekkora vésztartalék kell, ha a bevételem szezonális?",
        a: "Nem az átlagos, hanem a leggyengébb hónapjaid alapján kell számolni: annyi, hogy a fix kiadások a bevétel nélküli időszakban is fedezve legyenek. Ez sokszor több, mint a fix fizetésnél szokásos 3–6 havi kiadás — a saját számaidból kiszámoljuk.",
      },
    ],
    cta: {
      h: "Családi pénzügyek Nyíregyházáról — kezdd egy perccel",
      p: "A Pénzügyi Térkép hét kérdésből kiválasztja a három legfontosabb témát, és azt is megmutatja, mit miért hagyott ki. 24 órán belül keresek.",
    },
    services: ["gyerek-megtakaritas", "tamogatott-hitelek", "szabad-felhasznalasu-megtakaritas", "dijmentes-bankszamla"],
    articles: ["haztartasi-koltsegvetes-es-vesztartalek", "penzugyi-tanacsado-ellenorzese"],
  },

  /* ------------------------------------------------------------------ */
  {
    slug: "kecskemet",
    name: "Kecskemét",
    loc: "Kecskeméten",
    from: "Kecskemétről",
    adj: "kecskeméti",
    county: "Bács-Kiskun vármegye",
    wikidata: "https://www.wikidata.org/wiki/Q171357",
    inPerson: false,
    seo: {
      title: "Pénzügyi tanácsadó Kecskemét — lakás, hitel, adóstárs | Érték Pont",
      desc:
        "Pénzügyi tanácsadás Kecskemétről: új lakás vagy ház Otthon Starttal, két jövedelem és " +
        "adóstárs, 20% vissza a lakáshitel-törlesztésből, ingázás Budapestre. Díjmentes.",
    },
    h1: "Pénzügyi tanácsadás Kecskeméten, online",
    lead:
      "Kecskemét Bács-Kiskun vármegye székhelye, autóipari nagyberuházással és egyetemmel, " +
      "nagyjából egy órára Budapesttől. Sokan itt dolgoznak, mások a fővárosba ingáznak — " +
      "és sokan itt vennének vagy építenének saját otthont.",
    intro: [
      `Kecskemétről a tanácsadás online zajlik. Ha viszont Budapesten dolgozol vagy rendszeresen
      ott jársz, a fővárosban személyesen is találkozhatunk — a helyet és az időpontot az első
      hívásnál egyeztetjük.`,
      `Egy lakásvásárlásnál itt tipikusan két jövedelem, egy hitel és sok nyitott kérdés van:
      ki legyen adós és ki adóstárs, hogyan lehet a törlesztő egy részét adójóváírással
      visszaszerezni, és mi történik, ha az egyik fizetés kiesik. Ezeket érdemes még a
      hitelkérelem előtt végiggondolni.`,
    ],
    topicsTitle: "Kecskeméti lakás- és családi döntések",
    topics: [
      {
        h: "Új építésű lakás vagy családi ház",
        t: "Az Otthon Start fix 3%-os kamattal, legfeljebb 50 millió forintig vehető igénybe vásárlásra és építésre is. Új lakásnál a folyósítás az építés készültségéhez igazodik, ezért az önerő időzítését előre meg kell tervezni.",
        href: "/szolgaltatas/tamogatott-hitelek.html",
        label: "Otthon Start — feltételek és törlesztő",
      },
      {
        h: "Két jövedelem, egy hitel: 20% vissza a törlesztésből",
        t: "Önsegélyező pénztáron keresztül a lakáshitel törlesztésére fordított befizetés után 20% adójóváírás jár, 2026-ban havi 48 420 Ft-ig. Ha az adóstárs is pénztártag, a kedvezmény megduplázható.",
        href: "/szolgaltatas/adokedvezmeny-lakashitel.html",
        label: "Lakáshitel-törlesztés 20% adókedvezménnyel",
      },
      {
        h: "Ingázás Budapestre",
        t: "A fővárosi fizetés és a kecskeméti lakhatás jó kombináció lehet — ha az ingázás teljes költségét (üzemanyag vagy bérlet, autófenntartás, idő) is beleszámolod a költségvetésbe, mielőtt a hitel nagyságáról döntesz.",
        href: "/szolgaltatas/kgfb-casco.html",
        label: "Autós költségek: KGFB és casco",
      },
      {
        h: "Hitelfedezeti életbiztosítás",
        t: "Ha a törlesztő két fizetésre épül, egy tartós jövedelemkiesés az egész konstrukciót veszélyezteti. A hitelfedezeti életbiztosítás összege a hitelhez és a családhoz méretezhető — nem kell a bank első ajánlatát elfogadni.",
        href: "/szolgaltatas/elet-biztositas.html",
        label: "Mekkora életbiztosítás kell a hitel mellé?",
      },
    ],
    faq: [
      {
        q: "Kecskeméten élek, de Budapesten dolgozom. Hol tudunk találkozni?",
        a: "Budapesten személyesen is találkozhatunk, vagy mehet az egész online. A helyet és az időpontot az első telefonnál egyeztetjük, a munkaidődhöz igazítva.",
      },
      {
        q: "Adóstársként is kaphatok adójóváírást a lakáshitel-törlesztés után?",
        a: "Igen, ha pénztártag vagy, fizetsz szja-t, és a pénztárból a közös lakáshitelt törlesztitek. Ha az adós és az adóstárs is igénybe veszi, a kedvezmény megduplázható. A pénztár szabályzatában rögzített várakozási időt és elszámolási módot a belépés előtt együtt nézzük át.",
      },
      {
        q: "Új építésű lakásnál mire figyeljek a hitelnél?",
        a: "Három dologra: a folyósítás ütemezésére (részletekben, az építés készültségéhez igazítva), az önerő időzítésére, és arra, hogy a lakás ára és négyzetméterára belefér-e az Otthon Start korlátaiba (100 millió Ft, illetve 1,5 millió Ft/m²).",
      },
      {
        q: "Mennyibe kerül nekem a tanácsadás?",
        a: "Semmibe. A közvetítői jutalékot a biztosító, bank vagy pénztár fizeti, ha a te döntésed alapján szerződés jön létre. Ha az jön ki, hogy nincs szükséged semmire, az is ingyenes — és azt is megmondom.",
      },
    ],
    cta: {
      h: "Lakás, hitel, család — kezdjük Kecskemétről",
      p: "Egy perc a Pénzügyi Térképpel. 24 órán belül visszahívlak, és eldöntjük, online vagy Budapesten személyesen folytatjuk.",
    },
    services: ["tamogatott-hitelek", "adokedvezmeny-lakashitel", "elet-biztositas", "kgfb-casco"],
    articles: ["haztartasi-koltsegvetes-es-vesztartalek", "penzugyi-tanacsado-ellenorzese"],
  },
];
