/* ==========================================================================
   TARTALMI OLDALAK — pillar, tervezés, városi hub, rólam, kapcsolat
   --------------------------------------------------------------------------
   Minden állítás a már közzétett tényekre épül (config.js, impresszum,
   főoldali GYIK): díjmentes tanácsadás (jutalék a szolgáltatótól), 30–45
   perces első beszélgetés, 24 órán belüli visszahívás, Budapesten
   személyesen, máshol online, közvetítés az OVB (többes ügynök) nevében.
   Új képesítést, díjat, ügyfélszámot, irodát NEM állítunk.

   A „független”, „alkusz”, „befektetési tanácsadás”, „hiteltanácsadás”
   szó csak magyarázó (edukációs) szövegben szerepel — szolgáltatási
   állításként soha. Lásd SEO-AUDIT-AFTER.md → jogi ellenőrzőlista.

   Belső link: gyökértől (href="/..."), a generátor alakítja relatívvá.
   ========================================================================== */

export const UPDATED = "2026-09-13";

/* Hivatalos, élőben ellenőrzött források (2026-09-13). */
export const SRC = {
  mnbKereso: { label: "MNB Intézménykereső", url: "https://intezmenykereso.mnb.hu/" },
  mnbRegiszter: { label: "MNB — közvetítői nyilvántartás (ERA)", url: "https://apps.mnb.hu/regiszter/" },
  mnbAlkusz: {
    label: "MNB — Alkuszok és többes ügynökök",
    url: "https://www.mnb.hu/felugyelet/adatszolgaltatas/alkuszok-es-tobbes-ugynokok",
  },
  mnbFogyved: { label: "MNB Pénzügyi Fogyasztóvédelem", url: "https://www.mnb.hu/fogyasztovedelem" },
  mnbBekeltetes: { label: "Pénzügyi Békéltető Testület", url: "https://www.mnb.hu/bekeltetes" },
  mnbPanasz: { label: "MNB — Pénzügyi panasz", url: "https://www.mnb.hu/fogyasztovedelem/penzugyi-panasz" },
  mnbHitel: { label: "MNB — Hitel, lízing (fogyasztóvédelem)", url: "https://www.mnb.hu/fogyasztovedelem/hitel-lizing" },
  mnbBiztositas: { label: "MNB — Biztosítások (fogyasztóvédelem)", url: "https://www.mnb.hu/fogyasztovedelem/biztositasok" },
  mnbNyugdij: {
    label: "MNB — Nyugdíjcélú öngondoskodás",
    url: "https://www.mnb.hu/fogyasztovedelem/nyugdij-celu-ongondoskodas",
  },
  mnbPenztar: { label: "MNB — Pénztárak", url: "https://www.mnb.hu/fogyasztovedelem/penztarak" },
  mnbBankszamla: { label: "MNB — Bankszámlák", url: "https://www.mnb.hu/fogyasztovedelem/bankszamlak" },
  mnbNavigator: { label: "MNB Pénzügyi Navigátor", url: "https://www.mnb.hu/fogyasztovedelem/penzugyi-navigator" },
  mnbTervezes: {
    label: "MNB — Pénzügyi tervezés (Családi zöld pénzügyek)",
    url: "https://www.mnb.hu/fogyasztovedelem/csaladi-zold-penzugyek/zold-gazdalkodas-otthon/penzugyi-tervezes",
  },
  mnbCsalas: {
    label: "MNB — Hamis befektetési lehetőségek",
    url: "https://www.mnb.hu/fogyasztovedelem/digitalis-biztonsag/az-adathalasz-csalasok-legjellemzobb-tipusai/hamis-befektetesi-lehetosegek",
  },
  bit: {
    label: "2014. évi LXXXVIII. törvény a biztosítási tevékenységről (Bit.)",
    url: "https://net.jogtar.hu/jogszabaly?docid=a1400088.tv",
  },
  hpt: {
    label: "2013. évi CCXXXVII. törvény a hitelintézetekről és a pénzügyi vállalkozásokról (Hpt.)",
    url: "https://net.jogtar.hu/jogszabaly?docid=a1300237.tv",
  },
  bszt: {
    label: "2007. évi CXXXVIII. törvény a befektetési vállalkozásokról (Bszt.)",
    url: "https://net.jogtar.hu/jogszabaly?docid=a0700138.tv",
  },
};

/* ====================================================================== */
/*  /penzugyi-tanacsadas/ — országos pillar                               */
/* ====================================================================== */

export function pillarPage({ CFG, BRAND, CITIES }) {
  return {
    path: "penzugyi-tanacsadas/",
    nav: "tanacsadas",
    title: "Pénzügyi tanácsadás — költség, folyamat, jó tanácsadó | Érték Pont",
    desc:
      "Mit ad a pénzügyi tanácsadás, mennyibe kerül, hogyan ellenőrizd a pénzügyi tanácsadót az " +
      "MNB-nél, és mire figyelj a választásnál. Díjmentes konzultáció, online is.",
    label: "Pénzügyi tanácsadás",
    h1: "Pénzügyi tanácsadás: hogyan működik, és kinek éri meg?",
    lead:
      "A pénzügyi tanácsadás arról szól, hogy a pénzügyi döntéseidet — megtakarítás, biztosítás, " +
      "hitel, adókedvezmények — egymással összefüggésben, a saját számaid alapján hozd meg, ne " +
      "egy-egy termékajánlat alapján. Ez az oldal elmondja, mit kapsz, mennyibe kerül, és hogyan " +
      "ismered fel a jó tanácsadót.",
    answer: {
      label: "Röviden",
      html: `A <strong>pénzügyi tanácsadás</strong> során egy szakember felméri a jövedelmedet,
      kiadásaidat, meglévő szerződéseidet és céljaidat, majd megmutatja, milyen sorrendben és
      milyen megoldásokkal érdemes haladni. A <strong>pénzügyi tanácsadó</strong> lehet díjas
      (te fizetsz neki) vagy jutalékos (a szolgáltató fizet neki, ha szerződés jön létre) — nálam
      a tanácsadás díjmentes, a közvetítés az ${CFG.legal.companyName.split(" ")[0]} nevében
      történik. Mielőtt bárkivel szerződést kötsz, nézd meg az MNB nyilvántartásában.`,
    },
    sections: [
      {
        id: "mit-jelent",
        title: "Mit jelent a pénzügyi tanácsadás?",
        html: `
        <p>A pénzügyi tanácsadás egy helyzetfelmérésből és egy döntési sorrendből áll. A helyzetfelmérés
        megmutatja, hol tartasz: mennyi a havi szabad pénzed, van-e tartalékod, milyen hiteleid és
        biztosításaid vannak, és kihasználod-e az állami támogatásokat (például a 20%-os
        adójóváírásokat). A döntési sorrend pedig azt, hogy mit érdemes először rendbe tenni, és mi
        várhat.</p>
        <p>Egy jó tanácsadás eredménye nem feltétlenül egy új szerződés. Sokszor az derül ki, hogy egy
        meglévő biztosítás drága vagy felesleges, egy hitel kiváltható, vagy egy adókedvezmény
        eddig kimaradt. Van, amikor a helyes válasz az, hogy most ne köss semmit.</p>
        <h3>Mi NEM a pénzügyi tanácsadás része?</h3>
        <ul>
          <li><strong>Személyre szóló befektetési tanácsadás</strong> konkrét értékpapírokról: ez a
          befektetési szolgáltatási törvény (Bszt.) szerint engedélyköteles tevékenység. Nálam ilyen
          nincs — a megtakarítási formák (nyugdíjpénztár, nyugdíjbiztosítás, NYESZ) közötti
          eligazodásban segítek.</li>
          <li><strong>Adótanácsadás</strong> és <strong>jogi tanácsadás</strong>: az adókedvezmények
          szabályait elmagyarázom és kiszámolom, de egy összetett adóügyet (például külföldi
          jövedelem) adószakértő tud véglegesen megítélni.</li>
          <li><strong>Garancia</strong>: a hozamokat, kamatokat és díjakat a bankok, biztosítók és
          pénztárak határozzák meg. A kalkulátoraim becslést adnak, nem ajánlatot.</li>
        </ul>`,
      },
      {
        id: "kinek",
        title: "Kinek hasznos, és milyen élethelyzetekben?",
        html: `
        <p>Leginkább akkor, ha egy döntés több évre előre meghatározza a pénzügyeidet, vagy ha egyszerre
        több dolog változik. A leggyakoribb helyzetek:</p>
        <div class="table-wrap"><table>
          <thead><tr><th>Élethelyzet</th><th>Tipikus kérdés</th><th>Hol kezdd</th></tr></thead>
          <tbody>
            <tr><td>Első munkahely, első fizetés</td><td>Milyen bankszámla, mennyi tartalék, mikor kezdjem a nyugdíjcélt?</td><td><a href="/penzugyi-tervezes/">Pénzügyi tervezés</a></td></tr>
            <tr><td>Első lakás</td><td>Jogosult vagyok az Otthon Startra? Mekkora hitel fér bele?</td><td><a href="/szolgaltatas/tamogatott-hitelek.html">Otthon Start</a></td></tr>
            <tr><td>Gyerek születése</td><td>Mekkora életbiztosítás kell? Érdemes gyerekcélra félretenni?</td><td><a href="/szolgaltatas/elet-biztositas.html">Életbiztosítás</a>, <a href="/szolgaltatas/gyerek-megtakaritas.html">gyerek-megtakarítás</a></td></tr>
            <tr><td>Több hitel egyszerre</td><td>Kiváltható olcsóbban? Mennyi a teljes visszafizetés?</td><td><a href="/szolgaltatas/szemelyi-kolcson.html">Hitelkiváltás</a></td></tr>
            <tr><td>45–55 év között</td><td>Elég lesz a nyugdíj? Hogyan szerezzem vissza az adóm 20%-át?</td><td><a href="/szolgaltatas/nyugdij-megtakaritas.html">Nyugdíj-megtakarítás</a></td></tr>
            <tr><td>Autóvásárlás, KGFB-évforduló</td><td>Jó áron vagyok biztosítva? Mikor mondhatom fel?</td><td><a href="/szolgaltatas/kgfb-casco.html">KGFB és casco</a></td></tr>
          </tbody>
        </table></div>`,
      },
      {
        id: "kerdesek",
        title: "Milyen kérdésekkel érdemes pénzügyi tanácsadóhoz fordulni?",
        html: `
        <p>Konkrét kérdéssel a leghatékonyabb. Ha ezek közül legalább egyre nem tudod a választ, érdemes
        leülni valakivel, aki kiszámolja:</p>
        <ul class="check-list">
          <li>Mennyi pénzt hagyok az asztalon adókedvezményben évente?</li>
          <li>Hány hónapig tudnám fizetni a kiadásaimat, ha holnap kiesne a jövedelmem?</li>
          <li>Mennyi a hiteleim teljes visszafizetése, és kiváltható-e olcsóbban?</li>
          <li>Mennyit ér a családom, ha velem történik valami — és ez fedezve van?</li>
          <li>Mennyibe kerül valójában a meglévő megtakarításom (költség, díj, hozam)?</li>
          <li>Milyen lakás fér bele a keretembe, és jogosult vagyok-e támogatott hitelre?</li>
        </ul>`,
      },
      {
        id: "folyamat",
        title: "Hogyan zajlik nálam a pénzügyi tanácsadás?",
        html: `
        <ol>
          <li><strong>Helyzetkép (30–45 perc).</strong> Online vagy — Budapesten — személyesen.
          Nem kell felkészülni, elég, ha kéznél vannak a meglévő szerződéseid. Megnézzük, mennyi adót
          fizetsz, mi van már meg, és hol vannak hiányok.</li>
          <li><strong>Számok.</strong> Kiszámoljuk, mennyit hoz vagy visz az egyes döntés, forintban,
          évekre előre. Itt derül ki, mi az, ami tényleg fontos, és mi az, ami csak jól hangzik.</li>
          <li><strong>Ajánlatok.</strong> Több partnerbiztosító, bank és pénztár ajánlatát kérem le és
          hasonlítom össze. Nem a legalacsonyabb havi díjat keressük, hanem a helyzetedhez illő
          feltételt.</li>
          <li><strong>Ügyintézés és utána.</strong> Az adminisztrációt átveszem, és kárügynél,
          évfordulónál, jogszabály-változásnál is elérhető vagyok.</li>
        </ol>
        <p>Jelentkezés után <strong>24 órán belül</strong> hívlak a megadott számon. Ha a folyamat
        bármelyik pontján úgy döntesz, hogy nem kérsz semmit, az is rendben van.</p>`,
      },
      {
        id: "koltsegek",
        title: "Mennyibe kerül a pénzügyi tanácsadás?",
        html: `
        <p>Két fő díjazási modell van, és érdemes tudni, melyikkel állsz szemben — mert ez határozza
        meg, miből él a tanácsadód.</p>
        <div class="table-wrap"><table>
          <thead><tr><th>Modell</th><th>Ki fizet?</th><th>Előny</th><th>Mire figyelj</th></tr></thead>
          <tbody>
            <tr><td><strong>Díjas tanácsadás</strong></td><td>Te, óradíjban vagy fix díjban</td><td>A tanácsadó bevétele nem függ attól, kötsz-e szerződést</td><td>A díjat akkor is fizeted, ha nem kötsz semmit; kérdezd meg előre az összeget</td></tr>
            <tr><td><strong>Jutalékos közvetítés</strong></td><td>A bank, biztosító vagy pénztár, ha szerződés jön létre</td><td>Neked a tanácsadás díjmentes</td><td>Van ösztönzés a szerződéskötésre — kérdezd meg, kinek a nevében jár el és hány szolgáltató ajánlatát hasonlítja össze</td></tr>
          </tbody>
        </table></div>
        <p><strong>Nálam a jutalékos modell működik:</strong> a tanácsadásért nem fizetsz, a jutalékot a
        szolgáltató fizeti a megkötött szerződés után. Ezt azért mondom ki ilyen nyíltan, mert tudnod
        kell, miből él a tanácsadód. Az ösztönzést úgy ellensúlyozom, hogy a számolás mindig a döntés
        előtt van, és ha az jön ki, hogy nincs szükséged semmire, azt megmondom.</p>
        <h3>A termékek saját költségei</h3>
        <p>A tanácsadás díjától függetlenül minden pénzügyi terméknek van költsége. Ezeket a mutatókat
        érdemes összehasonlítani:</p>
        <ul>
          <li><strong>THM</strong> (teljes hiteldíj mutató) — hiteleknél az egyetlen jól összevethető szám.</li>
          <li><strong>TKM</strong> (teljes költség mutató) — befektetési célú életbiztosításoknál, például
          nyugdíjbiztosításnál.</li>
          <li><strong>Működési és vagyonkezelési költség</strong> — önkéntes pénztáraknál.</li>
          <li><strong>Számlavezetési, kártya- és tranzakciós díjak</strong> — bankszámláknál.</li>
        </ul>`,
      },
      {
        id: "valasztas",
        title: "Mire figyelj a pénzügyi tanácsadó választásakor?",
        html: `
        <ul class="check-list">
          <li><strong>Nyilvántartás:</strong> szerepel az MNB közhiteles nyilvántartásában (ő maga vagy
          a társaság, amelynek nevében eljár)?</li>
          <li><strong>Jogállás:</strong> kinek a nevében jár el — egy vagy több szolgáltató ügynökeként,
          vagy alkuszként a te megbízásodból? Ez nem jó vagy rossz, de tudnod kell.</li>
          <li><strong>Díjazás:</strong> miből él? Díjat kér tőled, vagy jutalékot kap a szolgáltatótól?</li>
          <li><strong>Összehasonlítás:</strong> hány szolgáltató ajánlatát mutatja meg, és a költségeket
          (THM, TKM) is?</li>
          <li><strong>Írásos tájékoztatás:</strong> a döntés előtt írásban kapod a feltételeket?</li>
          <li><strong>Nincs sürgetés:</strong> van időd átgondolni, és nem kér pénzt a saját számlájára.</li>
        </ul>
        <div class="warn-box">
          <span class="label">Figyelmeztető jel</span>
          <p style="margin-top:.5rem">Garantált magas hozam, „csak ma érvényes” ajánlat, vagy utalás
          magánszemély számlájára: ezek a befektetési csalások tipikus jelei. Az MNB részletes
          összefoglalót ad a <a href="${SRC.mnbCsalas.url}" rel="noopener" target="_blank">hamis
          befektetési lehetőségekről</a>.</p>
        </div>`,
      },
      {
        id: "ellenorzes",
        title: "Hogyan ellenőrizhető egy pénzügyi szolgáltató vagy tanácsadó?",
        html: `
        <ol>
          <li>Kérd el a tanácsadó teljes nevét, és hogy melyik társaság nevében jár el.</li>
          <li>Keress rá az <a href="${SRC.mnbKereso.url}" rel="noopener" target="_blank">MNB
          Intézménykeresőben</a> (társaságok) és a <a href="${SRC.mnbRegiszter.url}" rel="noopener" target="_blank">közvetítői
          nyilvántartásban</a> (a természetes személy közvetítők névre is kereshetők).</li>
          <li>Nézd meg a weboldal impresszumát: szerepel-e benne a nyilvántartási szám, a cégadatok és a
          panaszkezelés módja.</li>
          <li>Ha bizonytalan vagy, kérdezz rá írásban — egy szabályosan működő közvetítő ezt szívesen
          megválaszolja.</li>
        </ol>
        <p><strong>Az én adataim:</strong> a közvetítést az ${CFG.legal.companyName} (többes ügynök)
        nevében és javára végzem. A társaság biztosításközvetítői nyilvántartási száma
        ${CFG.legal.mnbNumber}, hitelközvetítői nyilvántartási száma ${CFG.legal.mnbCreditNumber}. Minden
        adat az <a href="/impresszum.html">impresszumban</a> és a <a href="/rolam/">bemutatkozásomban</a>
        szerepel. Részletesen: <a href="/tudastar/penzugyi-tanacsado-ellenorzese/">hogyan ellenőrizd a
        pénzügyi tanácsadót</a>.</p>`,
      },
      {
        id: "dokumentumok",
        title: "Milyen dokumentumokra lehet szükség?",
        html: `
        <p>Az első beszélgetéshez semmi nem kötelező. Ha konkrét ügy indul, jellemzően ezek kellenek
        (a pontos listát az adott bank, biztosító vagy pénztár határozza meg):</p>
        <div class="table-wrap"><table>
          <thead><tr><th>Téma</th><th>Jellemzően szükséges</th></tr></thead>
          <tbody>
            <tr><td>Első beszélgetés</td><td>Meglévő szerződések (hitel, biztosítás, pénztár) — ha kéznél vannak</td></tr>
            <tr><td>Lakáshitel, Otthon Start</td><td>Személyi okmányok, jövedelemigazolás, bankszámlakivonatok, adásvételi szerződés vagy előszerződés, a TB-jogviszony igazolása</td></tr>
            <tr><td>Hitelkiváltás</td><td>A kiváltandó hitelek szerződése és aktuális tartozásigazolása</td></tr>
            <tr><td>KGFB, casco</td><td>Forgalmi engedély, a jelenlegi kötvény és az évforduló dátuma, bónuszfokozat</td></tr>
            <tr><td>Nyugdíj- és egészségpénztár</td><td>Meglévő pénztári tagság adatai; a jóváíráshoz az szja-bevallásban tett rendelkező nyilatkozat</td></tr>
            <tr><td>Élet- és egészségbiztosítás</td><td>Meglévő kötvények; a biztosító egészségi kérdőívet kérhet</td></tr>
          </tbody>
        </table></div>`,
      },
      {
        id: "kockazatok",
        title: "Milyen kockázatokra figyelj?",
        html: `
        <ul>
          <li><strong>Korai megszüntetés:</strong> a rendszeres díjas megtakarítási biztosítások első
          éveiben a költségek magasak; ha korán felmondod, a visszavásárlási érték jóval kevesebb lehet
          a befizetésnél.</li>
          <li><strong>Az adójóváírás visszafizetése:</strong> ha a nyugdíjcélú megtakarításból a
          jogosultság előtt veszel ki pénzt, a korábban kapott jóváírást 20%-kal növelten vissza kell
          fizetni.</li>
          <li><strong>Kamatkockázat:</strong> rövid kamatperiódusú hitelnél a törlesztő a futamidő alatt
          nőhet. A hosszabb kamatfixálás drágább lehet, de kiszámíthatóbb.</li>
          <li><strong>Alul- vagy túlbiztosítás:</strong> túl kis fedezet nem véd, túl nagy feleslegesen
          viszi a pénzt. A biztosítási összeg kiszámolható.</li>
          <li><strong>Nem értett termék:</strong> ha nem tudod két mondatban elmondani, mire fizetsz,
          ne írd alá.</li>
        </ul>`,
      },
      {
        id: "varosok",
        title: "Pénzügyi tanácsadás a nagyvárosokban",
        html: `
        <p>A tanácsadás online az egész országban működik; Budapesten személyesen is találkozhatunk.
        A nagyvárosi oldalakon azokat a helyzeteket gyűjtöttem össze, amelyek az adott város
        adottságai miatt különösen fontosak lehetnek — a győri osztrák bértől a budapesti
        négyzetméterárakig.</p>
        <ul class="seo-links" style="margin-top:1.25rem">
          ${CITIES.map(
            (c) => `<li><a href="/penzugyi-tanacsadas/${c.slug}/"><span class="seo-links__t">${c.name}</span><span class="seo-links__n">${c.inPerson ? "személyesen és online" : "online konzultáció"}</span></a></li>`
          ).join("\n          ")}
        </ul>
        <p style="margin-top:1rem"><a href="/penzugyi-tanacsadas/varosok/">Hogyan működik a tanácsadás, ha nem Budapesten élsz?</a></p>`,
      },
    ],
    faq: [
      {
        q: "Mi a különbség a pénzügyi tanácsadó és a független pénzügyi tanácsadó között?",
        a: "A jogi értelemben vett függetlenség a közvetítő jogállásáról szól: az alkusz (független közvetítő) az ügyfél megbízásából jár el, az ügynök egy vagy több szolgáltató nevében. A „pénzügyi tanácsadó” megnevezés önmagában nem mondja meg, melyikről van szó — ezért mindig kérdezd meg, kinek a nevében jár el. Én többes ügynök nevében közvetítek, tehát nem vagyok független közvetítő.",
      },
      {
        q: "Van értelme tanácsadóhoz fordulni, ha kevés a megtakarításom?",
        a: "Igen, sokszor éppen ilyenkor a legnagyobb a haszon: egy díjmentes bankszámla, egy kiváltott drága hitel vagy egy kihagyott adókedvezmény havi szinten is érezhető. A tanácsadás nem a vagyon nagyságától függ, hanem attól, hogy van-e döntés, amit érdemes jól meghozni.",
      },
      {
        q: "Kötelező szerződést kötni az első beszélgetés után?",
        a: "Nem. Az első beszélgetés helyzetfelmérés. Ha az jön ki belőle, hogy most nincs teendő, azt megmondom — és ha van, akkor is te döntöd el, mikor és mivel folytatjuk.",
      },
      {
        q: "Online is ugyanolyan a tanácsadás, mint személyesen?",
        a: "A tartalma igen: ugyanazt a helyzetfelmérést, számolást és összehasonlítást kapod videóhíváson, telefonon és e-mailben. Ahol egy szerződéshez aláírás kell, annak módját egyeztetjük.",
      },
      {
        q: "Mennyi idő, amíg kiderül, van-e teendőm?",
        a: "Az első beszélgetés 30–45 perc; konkrét, egyetlen témánál (például KGFB-évforduló) gyakran 15 perc is elég. Az összehasonlítás és a számolás utána jellemzően néhány napon belül elkészül.",
      },
    ],
    sources: [SRC.mnbKereso, SRC.mnbRegiszter, SRC.mnbAlkusz, SRC.bit, SRC.hpt, SRC.bszt, SRC.mnbFogyved, SRC.mnbBekeltetes],
    map: {
      h: "Kezdjük a helyzetképpel — egy perc",
      p: "A Pénzügyi Térkép hét kérdésből megmutatja, nálad melyik három téma hozza most a legtöbbet. A végén kérhetsz visszahívást — 24 órán belül keresek.",
    },
    related: [
      { href: "/penzugyi-tervezes/", t: "Pénzügyi tervezés lépésről lépésre", n: "a 6 lépés sorrendje, szemléltető példával" },
      { href: "/tudastar/penzugyi-tanacsado-ellenorzese/", t: "Hogyan ellenőrizd a pénzügyi tanácsadót?", n: "ügynök, alkusz, független — mit jelent" },
      { href: "/rolam/", t: `${CFG.advisor.name} — bemutatkozás`, n: "ki vagyok, miből élek, hogyan ellenőrizhetsz" },
    ],
  };
}

/* ====================================================================== */
/*  /penzugyi-tervezes/                                                   */
/* ====================================================================== */

export function planningPage({ CFG }) {
  return {
    path: "penzugyi-tervezes/",
    nav: "tervezes",
    title: "Pénzügyi tervezés lépésről lépésre — 6 lépés, példával | Érték Pont",
    desc:
      "Pénzügyi tervezés 6 lépésben: költségvetés, vésztartalék, védelem, hitelek, adókedvezményes " +
      "megtakarítás, célok — szemléltető példával és díjmentes segítséggel.",
    label: "Pénzügyi tervezés",
    h1: "Pénzügyi tervezés: így építsd fel lépésről lépésre",
    lead:
      "A pénzügyi tervezés nem táblázatokról szól, hanem sorrendről: mit tegyél rendbe először, " +
      "hogy a következő lépés ne dőljön össze az első váratlan kiadásnál. Itt a hat lépés, amit " +
      "én is követek — magyarázattal, példával és a hozzá tartozó kalkulátorokkal.",
    answer: {
      label: "Röviden",
      html: `A <strong>pénzügyi tervezés</strong> a jövedelmed, kiadásaid, tartalékaid, kockázataid és
      céljaid összehangolása egy sorrendbe. A bevált sorrend: <strong>1.</strong> költségvetés,
      <strong>2.</strong> vésztartalék, <strong>3.</strong> kockázatvédelem, <strong>4.</strong> drága
      hitelek rendezése, <strong>5.</strong> adókedvezményes megtakarítás, <strong>6.</strong> hosszú
      távú célok. Aki a 6. lépéssel kezd, az általában az első váratlan kiadásnál felmondja.`,
    },
    sections: [
      {
        id: "mi-az",
        title: "Mi a pénzügyi tervezés, és miben más, mint a tanácsadás?",
        html: `
        <p>A pénzügyi tervezés egy folyamat, amit magad is elvégezhetsz: összeírod, mi jön be és mi megy
        ki, mekkora a tartalékod, mi véd, ha baj van, és mit szeretnél elérni. A
        <a href="/penzugyi-tanacsadas/">pénzügyi tanácsadás</a> ebben segít: valaki, aki látta már a
        tipikus hibákat, kiszámolja a lehetőségeket és összehasonlítja az ajánlatokat.</p>
        <p>A kettő nem helyettesíti egymást. Egy jó terv nélkül a tanácsadás termékválasztássá
        szűkül; tanácsadás nélkül pedig a terv sokszor elakad ott, ahol konkrét számok, jogszabályi
        feltételek vagy ajánlatok kellenének.</p>`,
      },
      {
        id: "hat-lepes",
        title: "A pénzügyi tervezés 6 lépése",
        html: `
        <div class="topic-grid">
          <div class="card topic"><h3 class="h4">1. Költségvetés</h3><p>Három hónap bankszámlakivonatából kiderül, mennyi a fix, a változó és az éves kiadásod. Enélkül minden további lépés becslés.</p><a class="link-arrow" href="/tudastar/haztartasi-koltsegvetes-es-vesztartalek/">Költségvetés 5 lépésben →</a></div>
          <div class="card topic"><h3 class="h4">2. Vésztartalék</h3><p>Általános ökölszabály: 3–6 havi kiadás, gyorsan elérhető, alacsony kockázatú helyen. Változó jövedelemnél több.</p><a class="link-arrow" href="/szolgaltatas/szabad-felhasznalasu-megtakaritas.html">Célösszeg-kalkulátor →</a></div>
          <div class="card topic"><h3 class="h4">3. Kockázatvédelem</h3><p>Ha a családod a te jövedelmedből él, vagy hitel fut, előbb a jövedelmet és a hitelt kell védeni — csak utána építeni.</p><a class="link-arrow" href="/szolgaltatas/elet-biztositas.html">Életbiztosítási összeg →</a></div>
          <div class="card topic"><h3 class="h4">4. Drága hitelek</h3><p>Hitelkártya, áruhitel, magas THM-ű kölcsön: ezek kamata szinte mindig több, mint amit bármilyen megtakarítás hoz.</p><a class="link-arrow" href="/szolgaltatas/szemelyi-kolcson.html">Hitelkiváltás kalkulátor →</a></div>
          <div class="card topic"><h3 class="h4">5. Adókedvezmények</h3><p>Nyugdíjcélra évente akár 280 000 Ft, egészségpénztárra 150 000 Ft adójóváírás — ha fizetsz szja-t. Ez a legbiztosabb „hozam”.</p><a class="link-arrow" href="/szolgaltatas/nyugdij-megtakaritas.html">Adójóváírás-kalkulátor →</a></div>
          <div class="card topic"><h3 class="h4">6. Hosszú távú célok</h3><p>Lakás, gyerek jövője, nyugdíj. Itt számít a legtöbbet az idő — és itt fáj a legjobban, ha az első öt lépés hiányzik.</p><a class="link-arrow" href="/szolgaltatas/gyerek-megtakaritas.html">Gyerek-megtakarítás →</a></div>
        </div>
        <h3>Miért ez a sorrend?</h3>
        <p>Mert minden lépés az előzőt védi. Tartalék nélkül egy autójavítás hitelkártyára megy; védelem
        nélkül egy betegség a megtakarítást viszi el; drága hitel mellett a megtakarítás hozama
        kevesebb, mint a hitel kamata. A sorrend nem merev — egy 20%-os adójóváírás például akkor is
        megéri, ha a tartalék még épül —, de jó kiindulópont.</p>`,
      },
      {
        id: "pelda",
        title: "Szemléltető példa: így néz ki egy terv számokban",
        html: `
        <p>Az alábbi számok <strong>kitalált, szemléltető példa</strong> — nem ügyfélhistória és nem
        ajánlás. Egy kétkeresős, gyermektelen háztartás, havi 700 000 Ft együttes nettó jövedelemmel:</p>
        <div class="table-wrap"><table>
          <thead><tr><th>Tétel</th><th>Havonta</th><th>Megjegyzés</th></tr></thead>
          <tbody>
            <tr><td>Fix kiadások (lakhatás, rezsi, közlekedés, biztosítások)</td><td>340 000 Ft</td><td>A jövedelem kb. fele</td></tr>
            <tr><td>Változó kiadások (élelmiszer, háztartás, szabadidő)</td><td>220 000 Ft</td><td>Ez a legrugalmasabb rész</td></tr>
            <tr><td>Éves tételek havi része (KGFB, nyaralás, ajándékok)</td><td>40 000 Ft</td><td>Külön számlán gyűjtve</td></tr>
            <tr><td>Vésztartalék építése</td><td>60 000 Ft</td><td>Cél: ~1,8 millió Ft (3 havi kiadás) kb. 2,5 év alatt</td></tr>
            <tr><td>Nyugdíjcélú megtakarítás</td><td>40 000 Ft</td><td>Évi 480 000 Ft → 96 000 Ft adójóváírás, ha van ennyi szja</td></tr>
          </tbody>
          <caption>Szemléltető számok. A saját tervedhez a <a href="/#terkep">Pénzügyi Térkép</a> és a kalkulátorok adnak kiindulópontot.</caption>
        </table></div>
        <p>A példa lényege nem az összegek, hanem a szerkezet: minden forintnak van helye, a tartalék és
        az éves tételek külön vannak, és a nyugdíjcél ott indul el, ahol az állam 20%-kal beszáll.</p>`,
      },
      {
        id: "eletszakaszok",
        title: "Pénzügyi tervezés életszakaszonként",
        html: `
        <div class="table-wrap"><table>
          <thead><tr><th>Életszakasz</th><th>Fő kérdés</th><th>Tipikus első lépés</th></tr></thead>
          <tbody>
            <tr><td>20–30 év</td><td>Hogyan kezdjem jól?</td><td>Díjmentes bankszámla, első tartalék, korai nyugdíjcél (ha fizetsz szja-t)</td></tr>
            <tr><td>30–45 év</td><td>Lakás, család, hitel</td><td>Otthon Start vagy piaci hitel, életbiztosítás a hitel mellé, gyerekcélú megtakarítás</td></tr>
            <tr><td>45–60 év</td><td>Elég lesz a nyugdíj?</td><td>Az adójóváírási keretek kihasználása, meglévő szerződések költségeinek átnézése</td></tr>
            <tr><td>60 év felett</td><td>Biztonság és hozzáférhetőség</td><td>Alacsony kockázat, elérhető tartalék, egészségkiadások tervezése</td></tr>
          </tbody>
        </table></div>`,
      },
      {
        id: "hibak",
        title: "Gyakori hibák a pénzügyi tervezésben",
        html: `
        <ul>
          <li><strong>A hosszú távú céllal kezdeni</strong>, tartalék nélkül — az első váratlan kiadásnál
          felmondott szerződés jellemzően pénzbe kerül.</li>
          <li><strong>Az éves tételekről megfeledkezni</strong> (KGFB, iskolakezdés, ünnepek) — ezek
          „váratlan” kiadásként törik meg a havi tervet.</li>
          <li><strong>A havi díjat nézni a teljes költség helyett</strong> — hitelnél a THM, megtakarításnál
          a költségmutató és a futamidő a lényeg.</li>
          <li><strong>Az adójóváírást kihagyni</strong>, pedig az szja-fizetőknek évente akár több
          százezer forint.</li>
          <li><strong>Egyszer megtervezni és elfelejteni</strong> — munkahelyváltás, gyerek, hitel után a
          tervet újra kell nézni.</li>
        </ul>`,
      },
      {
        id: "segitseg",
        title: "Hogyan segítek a pénzügyi tervezésben?",
        html: `
        <p>Az első, díjmentes beszélgetés (30–45 perc, online vagy Budapesten személyesen) lényegében egy
        közös tervezés: végigmegyünk a hat lépésen a te számaiddal. A végén látod, nálad mi a sorrend,
        és mi mennyit hoz vagy visz — forintban.</p>
        <p>Ahol konkrét megoldás kell (biztosítás, hitel, pénztár), több partner ajánlatát hasonlítom
        össze; a közvetítés az ${CFG.legal.companyName} nevében történik. Nem vidéki városban élsz?
        <a href="/penzugyi-tanacsadas/varosok/">Így működik a tanácsadás online, a nagyvárosokban</a>.</p>`,
      },
    ],
    faq: [
      {
        q: "Mekkora legyen a vésztartalék?",
        a: "Általános ökölszabály a 3–6 havi kiadás; változó vagy szezonális jövedelemnél, egykeresős családnál inkább a felső érték vagy több. A lényeg, hogy gyorsan elérhető és alacsony kockázatú helyen legyen — ne olyan megtakarításban, amelynek a felmondása költséggel jár.",
      },
      {
        q: "Előbb a hitelt törlesszem, vagy megtakarítsak?",
        a: "Drága hitelnél (hitelkártya, magas THM-ű kölcsön) általában előbb a hitel, mert a kamata többe kerül, mint amit egy megtakarítás hoz. Olcsó, fix kamatú lakáshitelnél (például Otthon Start) már más a kép: ott a tartalék és az adójóváírásos megtakarítás többet érhet, mint az előtörlesztés.",
      },
      {
        q: "Mennyit kell havonta félretenni?",
        a: "Nincs általános szám; a céltól, az időtávtól és a mostani kiadásaidtól függ. A szabad felhasználású megtakarítás oldalán lévő kalkulátor kiszámolja, havi mennyi kell egy adott célösszeghez.",
      },
      {
        q: "Kell-e pénzügyi tervet írásban készíteni?",
        a: "Nem kötelező, de segít: egy egyoldalas összefoglaló (bevétel, kiadás, tartalék, védelem, célok) évente átnézve sokkal többet ér, mint egy részletes táblázat, amit senki nem frissít.",
      },
    ],
    sources: [SRC.mnbTervezes, SRC.mnbNavigator, SRC.mnbNyugdij, SRC.mnbPenztar, SRC.mnbHitel],
    map: {
      h: "A tervezés első lépése: a Pénzügyi Térkép",
      p: "Hét kérdés az élethelyzetedről, egy perc. A végén három téma, a konkrét számokkal — és ha kéred, 24 órán belül hívlak, hogy együtt folytassuk.",
    },
    related: [
      { href: "/tudastar/haztartasi-koltsegvetes-es-vesztartalek/", t: "Háztartási költségvetés és vésztartalék", n: "5 lépés, példa-költségvetéssel" },
      { href: "/penzugyi-tanacsadas/", t: "Pénzügyi tanácsadás", n: "hogyan működik, mennyibe kerül" },
      { href: "/szolgaltatas/nyugdij-megtakaritas.html", t: "Nyugdíj-megtakarítás", n: "évi akár 280 000 Ft adójóváírás" },
    ],
  };
}

/* ====================================================================== */
/*  /penzugyi-tanacsadas/varosok/ — városi hub                            */
/* ====================================================================== */

export function hubPage({ CITIES }) {
  const focus = {
    budapest: "Otthon Start a budapesti négyzetméterárakkal, bérlés vagy vásárlás",
    debrecen: "első fizetés, első lakás, nyugdíjcél 25 év alatt",
    szeged: "fix bér melletti megtakarítás, egészségpénztár, gyerek egyetemi évei",
    miskolc: "drága hitelek kiváltása, felújítás, jövedelemvédelem",
    pecs: "régi ingatlan felújítása, egészségkiadások, nagyszülők és unokák",
    gyor: "pótlékos fizetés, Ausztriában adózó bér, munkáltatói pénztár",
    nyiregyhaza: "anyai szja-mentesség, házépítés, szezonális bevétel",
    kecskemet: "új lakás, adóstárs és 20% a törlesztésből, ingázás Budapestre",
  };
  return {
    path: "penzugyi-tanacsadas/varosok/",
    nav: "tanacsadas",
    title: "Pénzügyi tanácsadás városonként — 8 nagyváros | Érték Pont",
    desc:
      "Pénzügyi tanácsadás Budapesten személyesen, Debrecenben, Szegeden, Miskolcon, Pécsett, " +
      "Győrben, Nyíregyházán és Kecskeméten online. Városonként a helyi pénzügyi kérdések.",
    label: "Tanácsadás városonként",
    h1: "Pénzügyi tanácsadás a nagyvárosokban",
    lead:
      "A pénzügyi kérdések nagy része mindenhol ugyanaz — de hogy mi kerül előre, az városonként " +
      "más. Budapesten a négyzetméterár, Győrben az osztrák bér, Nyíregyházán a szezonális bevétel " +
      "írhatja át a számolást. Válaszd ki a városodat.",
    answer: {
      label: "Röviden",
      html: `A tanácsadás <strong>online az egész országban</strong> működik (videóhívás, telefon,
      e-mail), <strong>Budapesten személyesen is</strong>. Az első beszélgetés díjmentes, 30–45 perc,
      és jelentkezés után 24 órán belül keresem. Irodát vagy telephelyet a lenti városokban nem
      állítok — a városi oldalak a helyi pénzügyi helyzetekről szólnak.`,
    },
    sections: [
      {
        id: "varosok",
        title: "Válaszd ki a városodat",
        html: `
        <div class="table-wrap"><table>
          <thead><tr><th>Város</th><th>Konzultáció</th><th>Fő helyi kérdések</th></tr></thead>
          <tbody>
            ${CITIES.map(
              (c) =>
                `<tr><td><a href="/penzugyi-tanacsadas/${c.slug}/">${c.name}</a></td><td>${c.inPerson ? "személyesen és online" : "online"}</td><td>${focus[c.slug] || ""}</td></tr>`
            ).join("\n            ")}
          </tbody>
        </table></div>`,
      },
      {
        id: "online",
        title: "Hogyan működik a tanácsadás, ha nem Budapesten élsz?",
        html: `
        <ol>
          <li><strong>Jelentkezés:</strong> kitöltöd a Pénzügyi Térképet vagy felhívsz. 24 órán belül
          keresem a megadott számot.</li>
          <li><strong>Első beszélgetés:</strong> 30–45 perc videóhíváson vagy telefonon. Elég, ha kéznél
          vannak a meglévő szerződéseid.</li>
          <li><strong>Összehasonlítás:</strong> az ajánlatokat e-mailben küldöm, és képernyőn együtt
          nézzük át.</li>
          <li><strong>Aláírás:</strong> ha egy szerződéshez személyes aláírás vagy azonosítás kell
          (lakáshitelnél a bank ezt jellemzően kéri), annak módját előre egyeztetjük.</li>
        </ol>
        <p>Az összehasonlítás, a számolás és az ajánlatkérés teljesen online intézhető. A lakcím a
        legtöbb pénzügyi kérdésnél nem számít: az adókedvezmények és az Otthon Start az egész országban
        ugyanúgy működnek.</p>`,
      },
    ],
    faq: [
      {
        q: "Van irodád a vidéki nagyvárosokban?",
        a: "A városi oldalak nem irodákat jelölnek. A tanácsadás vidéken online zajlik; Budapesten személyesen is találkozhatunk, a helyet és az időpontot egyeztetjük.",
      },
      {
        q: "Más városból is kérhetek tanácsot, ami nincs a listán?",
        a: "Igen. A tanácsadás az egész országban online működik, a lista csak a nyolc legnagyobb várost emeli ki, mert ott gyűjtöttem össze helyi szempontokat.",
      },
    ],
    sources: [],
    map: {
      h: "Bárhonnan az országból — egy perccel kezdődik",
      p: "Töltsd ki a Pénzügyi Térképet, és 24 órán belül keresek a konkrét számokkal.",
    },
    related: [
      { href: "/penzugyi-tanacsadas/", t: "Pénzügyi tanácsadás", n: "hogyan működik, mennyibe kerül" },
      { href: "/penzugyi-tervezes/", t: "Pénzügyi tervezés", n: "6 lépés, példával" },
      { href: "/kapcsolat/", t: "Kapcsolat", n: "telefon, e-mail, Messenger" },
    ],
  };
}
