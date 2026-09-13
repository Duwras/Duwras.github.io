/* ==========================================================================
   RÓLAM (szerzői profil) és KAPCSOLAT
   --------------------------------------------------------------------------
   Csak a config.js-ben és az impresszumban már közzétett adat szerepel.
   Képesítést, vizsgát, szakmai évek számát, egyéni MNB-számot NEM írunk,
   amíg a tulajdonos nem adja meg (lásd SEO-AUDIT-AFTER.md → hiányzó adatok).
   ========================================================================== */

import { SRC } from "./pages.mjs";

export function aboutPage({ CFG, BRAND, esc }) {
  return {
    path: "rolam/",
    nav: "rolam",
    title: `${CFG.advisor.name} pénzügyi tanácsadó — bemutatkozás | Érték Pont`,
    desc:
      `${CFG.advisor.name} pénzügyi tanácsadó: ki vagyok, mivel foglalkozom, miből élek, hogyan ` +
      "ellenőrizheted a jogállásomat az MNB-nél. Online és Budapesten személyesen.",
    label: "Rólam",
    h1: `${CFG.advisor.name} — pénzügyi tanácsadó`,
    lead:
      `Az „${BRAND}” a saját márkanevem. ${CFG.business.shortName}-ként dolgozom, a pénzügyi ` +
      `közvetítést az ${CFG.legal.companyName} nevében és javára végzem. Ezen az oldalon ` +
      "minden megtalálható, ami alapján eldöntheted, megbízol-e bennem.",
    profile: true,
    sections: [
      {
        id: "bemutatkozas",
        title: "Bemutatkozás",
        html: `
        <p>${esc(CFG.advisor.bio)}</p>
        <p>Amit fontosnak tartok: érthető magyarázat apróbetű helyett, több szolgáltató ajánlata egy
        helyett, és hogy évek múlva is ugyanaz az ember vegye fel a telefont.</p>`,
      },
      {
        id: "mivel-foglalkozom",
        title: "Mivel foglalkozom — és mivel nem",
        html: `
        <p>Pénzügyi tanácsadással és közvetítéssel, 13 területen: nyugdíj- és gyerekcélú megtakarítás,
        20%-os adókedvezmények, élet-, baleset- és egészségbiztosítás, KGFB és casco, Otthon Start és
        piaci lakáshitel, személyi kölcsön, díjmentes bankszámla. Az első lépés mindig egy
        <a href="/penzugyi-tervezes/">pénzügyi tervezés</a> jellegű helyzetfelmérés.</p>
        <ul>
          <li><strong>Nem</strong> adok személyre szóló befektetési tanácsot konkrét értékpapírokról — ez
          engedélyköteles befektetési szolgáltatás.</li>
          <li><strong>Nem</strong> vagyok független közvetítő (alkusz): többes ügynök nevében járok el.</li>
          <li><strong>Nem</strong> ígérek hozamot, és nem nevezek meg konkrét terméket az oldalon.</li>
        </ul>`,
      },
      {
        id: "dijazas",
        title: "Miből élek?",
        html: `
        <p>A tanácsadás neked díjmentes. Ha a te döntésed alapján szerződés jön létre, a biztosító, bank
        vagy pénztár közvetítői jutalékot fizet. Ezt azért írom le ennyire nyíltan, mert tudnod kell,
        milyen ösztönzés van a tanácsadód mögött — és ezért számolok mindig a döntés előtt. Ha az jön ki,
        hogy nincs szükséged semmire, azt megmondom.</p>`,
      },
      {
        id: "jogi-hatter",
        title: "Jogi háttér — három szint, külön",
        html: `
        <div class="table-wrap"><table>
          <thead><tr><th>Szint</th><th>Ki</th><th>Szerepe</th></tr></thead>
          <tbody>
            <tr><td>Márkanév</td><td>${esc(BRAND)}</td><td>Fantázianév, nem cég, nincs cégjegyzékszáma</td></tr>
            <tr><td>Üzemeltető, adatkezelő</td><td>${esc(CFG.business.legalName)}<br><span class="tiny">nyilvántartási szám: ${esc(CFG.business.regNumber)}, adószám: ${esc(CFG.business.taxNumber)}</span></td><td>Az oldalt üzemelteti, a tanácsadást személyesen végzi</td></tr>
            <tr><td>Közvetítő társaság</td><td>${esc(CFG.legal.companyName)}<br><span class="tiny">${esc(CFG.legal.regNumber)}</span></td><td>Többes ügynök; a közvetítés az ő nevében és javára történik</td></tr>
          </tbody>
        </table></div>
        <p>A szerződésed sosem a márkanévvel, hanem a közvetítő társasággal, illetve a biztosítóval,
        bankkal vagy pénztárral jön létre. Minden részlet az <a href="/impresszum.html">impresszumban</a>.</p>`,
      },
      {
        id: "ellenorzes",
        title: "Hogyan ellenőrizhetsz?",
        html: `
        <ol>
          <li>A közvetítő társaság az <a href="${SRC.mnbKereso.url}" target="_blank" rel="noopener">MNB
          Intézménykeresőben</a> ellenőrizhető. Biztosításközvetítői nyilvántartási szám:
          <strong>${esc(CFG.legal.mnbNumber)}</strong>, hitelközvetítői nyilvántartási szám:
          <strong>${esc(CFG.legal.mnbCreditNumber)}</strong>.</li>
          <li>A társaság nevében eljáró természetes személy közvetítők a
          <a href="${SRC.mnbRegiszter.url}" target="_blank" rel="noopener">közvetítői nyilvántartásban</a>
          névre is kereshetők.</li>
          <li>Az egyéni vállalkozásom adatai a <a href="${esc(CFG.business.registerUrl)}" target="_blank" rel="noopener">közhiteles
          egyéni vállalkozói nyilvántartásban</a> ellenőrizhetők.</li>
        </ol>
        <p>Általános útmutató: <a href="/tudastar/penzugyi-tanacsado-ellenorzese/">hogyan ellenőrizd
        bármelyik pénzügyi tanácsadót</a>.</p>`,
      },
      {
        id: "elerhetoseg",
        title: "Hol és mikor érsz el?",
        html: `
        <ul>
          <li><strong>Működési terület:</strong> ${esc(CFG.contact.area)} — részletek
          <a href="/penzugyi-tanacsadas/varosok/">városonként</a>.</li>
          <li><strong>Elérhetőség:</strong> ${esc(CFG.contact.hours)}.</li>
          <li><strong>Telefon:</strong> <a href="tel:${esc(CFG.contact.phoneHref)}">${esc(CFG.contact.phone)}</a>,
          <strong>e-mail:</strong> <a href="mailto:${esc(CFG.contact.email)}">${esc(CFG.contact.email)}</a>.</li>
          ${CFG.contact.linkedin ? `<li><strong>LinkedIn:</strong> <a href="${esc(CFG.contact.linkedin)}" target="_blank" rel="noopener">profil</a></li>` : ""}
        </ul>`,
      },
      {
        id: "tartalmaim",
        title: "Tartalmaim",
        html: `
        <p>Az oldalon található útmutatókat és kalkulátorokat én írtam és tartom karban. A 2026-os
        jogszabályi számokat évente januárban frissítem.</p>
        <ul>
          <li><a href="/penzugyi-tanacsadas/">Pénzügyi tanácsadás: hogyan működik, és kinek éri meg?</a></li>
          <li><a href="/penzugyi-tervezes/">Pénzügyi tervezés lépésről lépésre</a></li>
          <li><a href="/tudastar/penzugyi-tanacsado-ellenorzese/">Hogyan ellenőrizd a pénzügyi tanácsadót?</a></li>
          <li><a href="/tudastar/haztartasi-koltsegvetes-es-vesztartalek/">Háztartási költségvetés és vésztartalék</a></li>
        </ul>`,
      },
    ],
    faq: [],
    sources: [],
    map: null,
    related: [
      { href: "/kapcsolat/", t: "Kapcsolat", n: "telefon, e-mail, Messenger" },
      { href: "/penzugyi-tanacsadas/", t: "Pénzügyi tanácsadás", n: "hogyan dolgozom" },
      { href: "/impresszum.html", t: "Impresszum", n: "cégadatok, nyilvántartási számok, panaszkezelés" },
    ],
  };
}

export function contactPage({ CFG, esc }) {
  const card = (label, value, href, note) => `
          <div class="card contact-card">
            <span class="label">${label}</span>
            <div class="fact__v">${href ? `<a href="${esc(href)}"${/^https?:/.test(href) ? ' target="_blank" rel="noopener"' : ""}>${esc(value)}</a>` : esc(value)}</div>
            ${note ? `<p class="tiny mute" style="margin-top:.4rem">${note}</p>` : ""}
          </div>`;
  return {
    path: "kapcsolat/",
    nav: "kapcsolat",
    title: `Kapcsolat — ${CFG.advisor.name} pénzügyi tanácsadó | Érték Pont`,
    desc:
      `Kapcsolat: ${CFG.contact.phone}, ${CFG.contact.email}, Messenger. Díjmentes pénzügyi ` +
      "konzultáció online az egész országban, Budapesten személyesen. Visszahívás 24 órán belül.",
    label: "Kapcsolat",
    h1: "Kapcsolat",
    lead:
      "Hívj, írj, vagy töltsd ki a Pénzügyi Térképet — 24 órán belül keresem a megadott számot. " +
      "Az első beszélgetés díjmentes, és nem jár semmilyen kötelezettséggel.",
    contactPage: true,
    sections: [
      {
        id: "elerhetosegek",
        title: "Elérhetőségek",
        html: `
        <div class="contact-grid">
          ${card("Telefon", CFG.contact.phone, `tel:${CFG.contact.phoneHref}`, esc(CFG.contact.hours))}
          ${card("E-mail", CFG.contact.email, `mailto:${CFG.contact.email}`, "Írásban is kérdezhetsz — konkrét kérdésre konkrét választ kapsz.")}
          ${CFG.contact.messenger ? card("Messenger", "Üzenet küldése", CFG.contact.messenger, "Facebook Messengeren is elérhető vagyok.") : ""}
          ${card("Működési terület", "Online, országosan", "", "Budapesten személyesen is — a helyet és az időpontot egyeztetjük.")}
        </div>
        <p class="tiny mute" style="margin-top:1rem">Jogi adatok: ${esc(CFG.business.legalName)},
        székhely: ${esc(CFG.business.address)}. A közvetítés az ${esc(CFG.legal.companyName)} nevében
        történik — részletek az <a href="/impresszum.html">impresszumban</a>.</p>`,
      },
      {
        id: "mi-tortenik",
        title: "Mi történik, miután jelentkezel?",
        html: `
        <ol>
          <li><strong>24 órán belül hívlak</strong> a megadott számon, jellemzően hétköznap 9 és 19 óra
          között. Ha más időpont jobb, írd a megjegyzésbe.</li>
          <li><strong>Egyeztetünk:</strong> online (videóhívás, telefon) vagy Budapesten személyesen.</li>
          <li><strong>Első beszélgetés, 30–45 perc:</strong> helyzetkép és a lehetséges lépések. Egyetlen
          konkrét témánál (például KGFB-évforduló) gyakran 15 perc is elég.</li>
          <li><strong>Utána te döntesz:</strong> ha kéred, összehasonlítom a szolgáltatók ajánlatait.
          Ha nincs teendő, azt is megmondom.</li>
        </ol>`,
      },
      {
        id: "mit-keszits-elo",
        title: "Mit érdemes előkészíteni?",
        html: `
        <ul>
          <li>a meglévő szerződéseidet (hitel, biztosítás, pénztár, bankszámla-csomag),</li>
          <li>a havi nettó jövedelmedet és a nagyobb fix kiadásaidat (nagyságrendben is elég),</li>
          <li>a következő 3–5 év terveit (lakás, gyerek, autó, munkahelyváltás).</li>
        </ul>
        <p>Egyik sem kötelező — az első beszélgetéshez semmit nem kell hozni.</p>`,
      },
      {
        id: "panasz",
        title: "Panasz, észrevétel",
        html: `
        <p>Panaszt szóban és írásban is előadhatsz a fenti elérhetőségeken, illetve a közvetítő társaság
        panaszkezelési csatornáin. Ha a válasszal nem vagy elégedett, a
        <a href="${SRC.mnbBekeltetes.url}" target="_blank" rel="noopener">Pénzügyi Békéltető Testülethez</a>
        fordulhatsz. A részletes panaszkezelési tájékoztató az <a href="/impresszum.html">impresszumban</a> van.</p>`,
      },
    ],
    faq: [],
    sources: [],
    map: {
      h: "Vagy kezdd a Pénzügyi Térképpel",
      p: "Hét kérdés, egy perc. A végén kérhetsz visszahívást — a válaszaid alapján már konkrét számokkal hívlak.",
    },
    related: [
      { href: "/rolam/", t: "Rólam", n: "ki vagyok, hogyan ellenőrizhetsz" },
      { href: "/penzugyi-tanacsadas/", t: "Pénzügyi tanácsadás", n: "hogyan zajlik, mennyibe kerül" },
      { href: "/penzugyi-tanacsadas/varosok/", t: "Tanácsadás városonként", n: "online az egész országban" },
    ],
  };
}
