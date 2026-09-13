/* ==========================================================================
   TUDÁSTÁR — edukációs cikkek (/tudastar/<slug>/)
   --------------------------------------------------------------------------
   Minden cikk: valós szerző (a config tanácsadója), publikálás + frissítés
   dátuma, ellenőrizhető források, és link a kapcsolódó szolgáltatás- vagy
   pillar-oldalra. A `services` mező alapján a szolgáltatás-oldalak is
   visszalinkelnek a cikkre (hub-and-spoke).

   Új cikk: új objektum az ARTICLES tömbbe → node build/generate.mjs.
   Témaötletek és sorrend: SEO-CONTENT-ROADMAP.md.
   ========================================================================== */

import { SRC } from "./pages.mjs";

export const ARTICLES = [
  /* ------------------------------------------------------------------ */
  {
    slug: "penzugyi-tanacsado-ellenorzese",
    published: "2026-09-13",
    modified: "2026-09-13",
    title: "Pénzügyi tanácsadó ellenőrzése — alkusz, ügynök, független",
    desc:
      "Hogyan ellenőrizd a pénzügyi tanácsadót az MNB nyilvántartásában, mi a különbség ügynök, " +
      "többes ügynök és alkusz között, és mit jelent valójában a „független” szó.",
    h1: "Hogyan ellenőrizd a pénzügyi tanácsadót — és mit jelent a „független”?",
    lead:
      "Mielőtt bárkinek megadod a pénzügyi adataidat, két dolgot érdemes tudni: szerepel-e a " +
      "hatósági nyilvántartásban, és kinek a nevében jár el. Mindkettő percek alatt kideríthető.",
    answer: {
      label: "Röviden",
      html: `Egy pénzügyi közvetítő jogállása az <strong>MNB nyilvántartásában</strong> ellenőrizhető
      (intezmenykereso.mnb.hu). A legfontosabb kérdés: <strong>kinek a nevében jár el?</strong> Az
      <strong>ügynök</strong> egy vagy több szolgáltató nevében, az <strong>alkusz</strong> (független
      közvetítő) az ügyfél megbízásából. A „független pénzügyi tanácsadó” nem egy egységes, védett
      megnevezés — mindig kérdezz rá, milyen nyilvántartás és jogállás van mögötte.`,
    },
    sections: [
      {
        id: "miert-szamit",
        title: "Miért számít, kinek a nevében jár el a tanácsadód?",
        html: `
        <p>A pénzügyi közvetítő jogállása meghatározza, kinek tartozik elsősorban felelősséggel, hány
        szolgáltató termékét kínálhatja, és ki fizeti. Ez nem jelenti, hogy az egyik forma jó, a másik
        rossz — de más kérdéseket érdemes feltenni hozzá.</p>
        <p>Egy ügynöknél arra kérdezz rá, hány szolgáltató ajánlatát tudja megmutatni. Egy alkusznál
        arra, hogy kér-e tőled díjat, és ha igen, mennyit. Mindkettőnél arra, hogy a költségeket
        (THM, TKM) is összehasonlítja-e, nem csak a havi díjat.</p>`,
      },
      {
        id: "tipusok",
        title: "Ügynök, többes ügynök, alkusz — a különbség",
        html: `
        <p>A biztosításközvetítésnél a biztosítási törvény (Bit.) különbözteti meg a formákat;
        a hitelközvetítésnél a hitelintézeti törvény (Hpt.) hasonló logikát követ.</p>
        <div class="table-wrap"><table>
          <thead><tr><th>Forma</th><th>Kinek a nevében jár el?</th><th>Hány szolgáltató termékét kínálja?</th><th>Ki fizeti?</th></tr></thead>
          <tbody>
            <tr><td><strong>Ügynök</strong> (függő közvetítő)</td><td>Egy szolgáltató nevében</td><td>Jellemzően egyét</td><td>A szolgáltató (jutalék)</td></tr>
            <tr><td><strong>Többes ügynök</strong> (függő közvetítő)</td><td>Több szolgáltató nevében</td><td>Több szolgáltatóét, a szerződött partnerek körében</td><td>A szolgáltatók (jutalék)</td></tr>
            <tr><td><strong>Alkusz</strong> (független közvetítő)</td><td>Az ügyfél megbízásából</td><td>A piac szélesebb köréből</td><td>Jellemzően jutalék a szolgáltatótól; megállapodás szerint díj az ügyféltől</td></tr>
          </tbody>
          <caption>Egyszerűsített összefoglaló. A pontos szabályokat a Bit. és a Hpt. tartalmazza.</caption>
        </table></div>
        <p><strong>Átláthatóság kedvéért:</strong> én az OVB Vermögensberatung Kft. — az MNB
        nyilvántartásában többes ügynök — nevében és javára közvetítek. Tehát nem vagyok független
        közvetítő, és ezt az <a href="/impresszum.html">impresszumban</a> is így írom le.</p>`,
      },
      {
        id: "fuggetlen",
        title: "Mit jelent a „független pénzügyi tanácsadó”?",
        html: `
        <p>A köznyelvben a „független pénzügyi tanácsadó” gyakran csak annyit jelent: „nem egy bank
        alkalmazottja”. Jogi értelemben viszont a függetlenség a közvetítő jogállásához kötődik: a
        független biztosításközvetítő az alkusz, és a hitelközvetítésben is külön kategória a független
        közvetítő.</p>
        <p>Ezért ha valaki függetlennek mondja magát, kérdezz rá:</p>
        <ul>
          <li>Milyen nyilvántartási számon szerepel az MNB-nél, és milyen minőségben?</li>
          <li>A te megbízásodból jár el, vagy szolgáltatók nevében?</li>
          <li>Kér-e tőled díjat, és kap-e jutalékot a szolgáltatótól?</li>
        </ul>
        <p>Ha ezekre világos, írásos választ kapsz, a megnevezés már mellékes.</p>`,
      },
      {
        id: "befektetesi-tanacsadas",
        title: "A befektetési tanácsadás engedélyköteles",
        html: `
        <p>A személyre szóló befektetési tanácsadás — amikor valaki konkrét pénzügyi eszköz (például
        részvény, befektetési jegy) vételét vagy eladását javasolja neked — a befektetési szolgáltatási
        törvény (Bszt.) szerint befektetési szolgáltatás, amihez engedély kell.</p>
        <p>Ha valaki konkrét értékpapírt ajánl, kérdezd meg, milyen engedély alapján teszi, és ellenőrizd
        az <a href="${SRC.mnbKereso.url}" target="_blank" rel="noopener">MNB Intézménykeresőben</a>.
        A nyugdíjbiztosítás, önkéntes pénztár vagy NYESZ közötti általános eligazítás más kérdés —
        ott a formák szabályait és költségeit érdemes összevetni.</p>`,
      },
      {
        id: "lepesek",
        title: "Az ellenőrzés 4 lépésben",
        html: `
        <ol>
          <li><strong>Kérd el a teljes nevet és a társaságot</strong>, amelynek nevében eljár (vagy ha
          alkusz, a saját cégét).</li>
          <li><strong>Keresd meg az MNB-nél:</strong> a társaságot az
          <a href="${SRC.mnbKereso.url}" target="_blank" rel="noopener">Intézménykeresőben</a>, a természetes
          személy közvetítőt a <a href="${SRC.mnbRegiszter.url}" target="_blank" rel="noopener">közvetítői
          nyilvántartásban</a>. Az MNB listát is közöl az
          <a href="${SRC.mnbAlkusz.url}" target="_blank" rel="noopener">alkuszokról és többes ügynökökről</a>.</li>
          <li><strong>Nézd meg az impresszumot:</strong> van-e benne cégadat, nyilvántartási szám,
          panaszkezelési mód. Ha nincs, az figyelmeztető jel.</li>
          <li><strong>Kérj írásos tájékoztatást</strong> a szerződéskötés előtt: a feltételeket, a
          költségeket és azt, hogy a közvetítő miből él.</li>
        </ol>`,
      },
      {
        id: "figyelmezteto-jelek",
        title: "Figyelmeztető jelek",
        html: `
        <ul>
          <li>garantált, a piacinál feltűnően magasabb hozam,</li>
          <li>sürgetés („csak ma érvényes”, „mindjárt betelik”),</li>
          <li>utalás magánszemély vagy ismeretlen cég számlájára,</li>
          <li>nincs írásos tájékoztató, nincs impresszum, nincs nyilvántartási szám,</li>
          <li>a közvetítő nem mondja meg, miből él.</li>
        </ul>
        <p>Az MNB részletes, példákkal illusztrált összefoglalója:
        <a href="${SRC.mnbCsalas.url}" target="_blank" rel="noopener">hamis befektetési lehetőségek</a>.</p>`,
      },
      {
        id: "panasz",
        title: "Ha baj van: panasz és békéltetés",
        html: `
        <p>Először a szolgáltatónál vagy a közvetítőnél tegyél panaszt — szóban vagy írásban. Ha a
        válasszal nem vagy elégedett, a <a href="${SRC.mnbBekeltetes.url}" target="_blank" rel="noopener">Pénzügyi
        Békéltető Testülethez</a> fordulhatsz, fogyasztóvédelmi ügyben pedig az MNB-hez
        (<a href="${SRC.mnbPanasz.url}" target="_blank" rel="noopener">pénzügyi panasz</a>).</p>
        <p>Ha most választasz tanácsadót, a <a href="/penzugyi-tanacsadas/">pénzügyi tanácsadásról szóló
        összefoglalóban</a> azt is leírtam, hogyan dolgozom én, és mennyibe kerül.</p>`,
      },
    ],
    faq: [
      {
        q: "Kötelező, hogy egy pénzügyi tanácsadó szerepeljen az MNB nyilvántartásában?",
        a: "Aki biztosítást vagy hitelt közvetít, annak — illetve a társaságnak, amelynek nevében eljár — a jogszabályok szerint szerepelnie kell az MNB nyilvántartásában. Az általános, termék nélküli pénzügyi edukáció más kérdés; ha viszont valaki szerződést köttet veled, kérdezd meg a nyilvántartási számát.",
      },
      {
        q: "Rosszabb egy többes ügynök, mint egy alkusz?",
        a: "Nem feltétlenül. A különbség abban van, kinek a nevében jár el és hány szolgáltató termékét kínálhatja. Mindkettőnél az a lényeg, hogy átláthatóan mondja meg, miből él, és a költségeket is összehasonlítsa.",
      },
      {
        q: "Mit tegyek, ha nem találom a tanácsadót a nyilvántartásban?",
        a: "Kérdezz rá írásban, melyik társaság nevében jár el, és azt keresd meg. Ha erre sem kapsz egyértelmű választ, ne adj meg pénzügyi adatot, és ne utalj pénzt.",
      },
    ],
    sources: [SRC.mnbKereso, SRC.mnbRegiszter, SRC.mnbAlkusz, SRC.bit, SRC.hpt, SRC.bszt, SRC.mnbCsalas, SRC.mnbBekeltetes, SRC.mnbPanasz],
    related: [
      { href: "/penzugyi-tanacsadas/", t: "Pénzügyi tanácsadás", n: "hogyan működik, mennyibe kerül" },
      { href: "/rolam/", t: "Rólam", n: "jogállás, nyilvántartási számok" },
      { href: "/impresszum.html", t: "Impresszum", n: "cégadatok, panaszkezelés" },
    ],
    services: [],
  },

  /* ------------------------------------------------------------------ */
  {
    slug: "haztartasi-koltsegvetes-es-vesztartalek",
    published: "2026-09-13",
    modified: "2026-09-13",
    title: "Háztartási költségvetés és vésztartalék — 5 lépésben",
    desc:
      "Háztartási költségvetés készítése 5 lépésben, példával: fix, változó és éves kiadások, " +
      "automatikus megtakarítás, és mekkora vésztartalék kell — hol tartsd.",
    h1: "Háztartási költségvetés és vésztartalék: így kezdd el 5 lépésben",
    lead:
      "A pénzügyi tervezés minden további lépése — hitel, biztosítás, megtakarítás — erre a kettőre " +
      "épül: tudod-e, hová megy a pénzed, és van-e tartalékod, ha valami közbejön.",
    answer: {
      label: "Röviden",
      html: `A <strong>háztartási költségvetés</strong> a havi bevételek és kiadások áttekintése fix,
      változó és éves kiadásokra bontva. A <strong>vésztartalék</strong> általános ökölszabály szerint
      <strong>3–6 havi kiadás</strong>, gyorsan elérhető és alacsony kockázatú helyen; változó vagy
      szezonális jövedelemnél több. A megtakarítás akkor működik, ha fizetésnapon automatikusan
      indul — nem a hónap végén, a maradékból.`,
    },
    sections: [
      {
        id: "1-lepes",
        title: "1. lépés: nézd meg, mi történt eddig",
        html: `
        <p>Ne tervvel kezdd, hanem ténnyel. Töltsd le az elmúlt három hónap bankszámlakivonatát, és
        csoportosítsd a tételeket. Három hónap azért kell, mert egy hónapban mindig van valami
        rendkívüli — háromból már látszik a minta.</p>
        <p>A legtöbben itt lepődnek meg: a kis, rendszeres tételek (előfizetések, kártyadíjak,
        napi apróságok) együtt sokszor nagyobbak, mint gondolták.</p>`,
      },
      {
        id: "2-lepes",
        title: "2. lépés: bontsd három részre a kiadásokat",
        html: `
        <div class="table-wrap"><table>
          <thead><tr><th>Típus</th><th>Példák</th><th>Hogyan kezeld</th></tr></thead>
          <tbody>
            <tr><td><strong>Fix</strong></td><td>lakbér vagy törlesztő, rezsi, közlekedési bérlet, biztosítási díjak, előfizetések</td><td>Évente egyszer nézd át, hol lehet olcsóbb</td></tr>
            <tr><td><strong>Változó</strong></td><td>élelmiszer, háztartás, ruha, szabadidő</td><td>Havi keret — itt a legnagyobb a mozgástér</td></tr>
            <tr><td><strong>Éves / ritka</strong></td><td>KGFB, casco, iskolakezdés, ünnepek, nyaralás, autószerviz</td><td>Oszd el 12-vel, és havonta tedd félre külön</td></tr>
          </tbody>
        </table></div>
        <p>Az éves tételek a leggyakoribb „váratlan” kiadások — pedig pontosan tudjuk, mikor jönnek.
        Ha havonta félreteszed a 12-ed részüket, nem borítják a havi tervet.</p>`,
      },
      {
        id: "3-lepes",
        title: "3. lépés: először magadnak fizess",
        html: `
        <p>A megtakarítás akkor működik, ha fizetésnapon, automatikus átutalással indul, és nem a
        hónap végén, a maradékból. Állíts be két rendszeres utalást: egyet a tartalékra, egyet az éves
        tételekre. A többi pénzből gazdálkodsz.</p>
        <p>Ha a bankszámládon ez díjjal jár, vagy maga a számla drága, érdemes megnézni a
        <a href="/szolgaltatas/dijmentes-bankszamla.html">díjmentes bankszámla-lehetőségeket</a>.</p>`,
      },
      {
        id: "4-lepes",
        title: "4. lépés: vésztartalék — mekkora legyen, és hol?",
        html: `
        <p>Általános ökölszabály a <strong>3–6 havi kiadás</strong>. Nem a jövedelem, hanem a kiadás
        számít: az az összeg, amiből kiesés esetén élnél.</p>
        <ul>
          <li><strong>Inkább 3 hónap:</strong> két stabil jövedelem, kiszámítható kiadások, nincs hitel.</li>
          <li><strong>Inkább 6 hónap vagy több:</strong> egy kereső, gyerekek, lakáshitel, változó vagy
          szezonális jövedelem, vállalkozás.</li>
        </ul>
        <p><strong>Hol tartsd?</strong> Olyan helyen, ahonnan napokon belül, költség nélkül hozzáférsz,
        és ahol az értéke nem ingadozik nagyot: például elkülönített számlán vagy rövid távú,
        alacsony kockázatú megtakarításban. Ne olyan konstrukcióban, amelynek a felmondása
        költséggel vagy adóvisszafizetéssel jár.</p>
        <p>Ha a teljes összeg soknak tűnik, kezdd egy havi kiadással — már az is megvéd attól, hogy egy
        autójavítás hitelkártyára menjen. Hogy havonta mennyit kell félretenned egy adott
        célösszeghez, a <a href="/szolgaltatas/szabad-felhasznalasu-megtakaritas.html">célösszeg-kalkulátor</a>
        kiszámolja.</p>`,
      },
      {
        id: "pelda",
        title: "Példa-költségvetés",
        html: `
        <p>Kitalált, <strong>szemléltető</strong> számok egy egyedülálló, bérlakásban élő háztartásra,
        havi 450 000 Ft nettó jövedelemmel:</p>
        <div class="table-wrap"><table>
          <thead><tr><th>Tétel</th><th>Havonta</th></tr></thead>
          <tbody>
            <tr><td>Lakbér és rezsi</td><td>190 000 Ft</td></tr>
            <tr><td>Közlekedés, telefon, előfizetések</td><td>35 000 Ft</td></tr>
            <tr><td>Élelmiszer, háztartás</td><td>110 000 Ft</td></tr>
            <tr><td>Szabadidő, ruha, egyéb</td><td>45 000 Ft</td></tr>
            <tr><td>Éves tételek havi része</td><td>25 000 Ft</td></tr>
            <tr><td><strong>Vésztartalék (automatikus utalás)</strong></td><td><strong>45 000 Ft</strong></td></tr>
          </tbody>
          <caption>Havi kiadás tartalék nélkül: 405 000 Ft → 3 havi tartalék ≈ 1,2 millió Ft, ami havi 45 000 Ft-tal kb. 27 hónap alatt gyűlik össze.</caption>
        </table></div>`,
      },
      {
        id: "5-lepes",
        title: "5. lépés: havi 15 perc felülvizsgálat",
        html: `
        <p>Havonta egyszer nézd meg: tartottad-e a változó keretet, megérkezett-e a két automatikus
        utalás, és jön-e a következő hónapban éves tétel. Évente egyszer pedig nézd át a fix
        kiadásokat — biztosítás, bankszámla, előfizetések —, mert ott egyetlen döntés egész évre hat.</p>
        <p>Ha a költségvetés megvan és a tartalék épül, jöhet a következő lépés: védelem, hitelek,
        adókedvezményes megtakarítás. A teljes sorrendet a <a href="/penzugyi-tervezes/">pénzügyi
        tervezésről szóló oldalon</a> írtam le.</p>`,
      },
    ],
    faq: [
      {
        q: "Mit tegyek, ha a költségvetésből nem marad pénz a tartalékra?",
        a: "Először a fix kiadásokat nézd át (biztosítások, bankszámla, előfizetések, drága hitelek), mert ott egy döntés egész évre hat. Ha ott nincs mozgástér, akár havi 5–10 ezer forinttal is érdemes elindítani a tartalékot — a szokás fontosabb, mint az összeg.",
      },
      {
        q: "A vésztartalékot befektessem?",
        a: "Nem olyan formában, amelynek az értéke nagyot ingadozhat, vagy amelynek a felmondása költséggel jár. A tartalék célja, hogy akkor is meglegyen, amikor a piac éppen esik, és te éppen elvesztetted a munkádat.",
      },
      {
        q: "Költségvetés-app vagy táblázat?",
        a: "Amelyiket valóban használod. A lényeg a három kategória (fix, változó, éves) és a két automatikus utalás; ez papíron is működik.",
      },
    ],
    sources: [SRC.mnbTervezes, SRC.mnbNavigator, SRC.mnbBankszamla],
    related: [
      { href: "/penzugyi-tervezes/", t: "Pénzügyi tervezés", n: "a 6 lépés sorrendje" },
      { href: "/szolgaltatas/szabad-felhasznalasu-megtakaritas.html", t: "Célösszeg-kalkulátor", n: "havi mennyi kell a célodhoz?" },
      { href: "/szolgaltatas/dijmentes-bankszamla.html", t: "Díjmentes bankszámla", n: "mennyit fizetsz ma a bankolásért?" },
    ],
    services: ["szabad-felhasznalasu-megtakaritas", "dijmentes-bankszamla"],
  },
];
