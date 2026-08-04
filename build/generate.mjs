/* ==========================================================================
   OLDALGENERÁTOR — statikus HTML-t ír a js/data/services.js tartalomból
   Futtatás:  node build/generate.mjs
   Kimenet:   index.html, szolgaltatas/<slug>.html (13 db), impresszum.html,
              adatkezeles.html, 404.html, sitemap.xml, robots.txt, .nojekyll
   A kimenet tiszta statikus HTML — nem kell futtatókörnyezet a hostingon.
   ========================================================================== */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

/* --- adat betöltése (klasszikus scriptek window-ra írnak) -------------- */
const win = { EP: {} };
for (const f of ["js/data/services.js", "js/data/quiz.js", "js/config.js"]) {
  const src = fs.readFileSync(path.join(ROOT, f), "utf8");
  new Function("window", src)(win);
}
const { SERVICES, CATEGORIES } = win.EP;
const CFG = win.EP.CONFIG;

const esc = (s) =>
  String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));

/* A basePath akkor kell, ha az oldal nem a domain gyökerében van
   (GitHub Pages projekt-repo esetén pl. /ertekpont-penzugyek).
   Csak az absztolút URL-eket érinti: canonical, og:url, og:image, sitemap. */
const BASE = String(CFG.basePath || "").replace(/\/+$/, "");
const SITE = `https://${CFG.domain}${BASE}`;
const BRAND = CFG.brand;
const NOINDEX = CFG.noindex === true;

/* Relatív útvonal-előtag a mélység szerint. A "root" külön eset: a 404 oldal
   BÁRMILYEN mélységű URL-en kiszolgálódhat (/szolgaltatas/nincs-ilyen.html),
   ezért ott gyökértől számított útvonal kell, különben törik a CSS és a JS. */
function upOf(depth) {
  if (depth === "root") return `${BASE}/`;
  return depth ? "../" : "";
}

const icon = (paths, size = 22, sw = 1.6) =>
  `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="${sw}" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths}</svg>`;

const V = Date.now().toString(36); // cache-busting bélyeg
const ARROW = icon('<path d="M7 17 17 7M9 7h8v8"/>', 16, 2.2);

/* ====================================================================== */
/*  Közös részek                                                          */
/* ====================================================================== */

function head({ title, desc, url, depth = 0, schema = "" }) {
  const up = upOf(depth);
  return `<!doctype html>
<html lang="hu">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(title)}</title>
<meta name="description" content="${esc(desc)}">
<link rel="canonical" href="${url}">
<meta name="theme-color" content="#0a0b09">
<meta name="robots" content="${NOINDEX ? "noindex,nofollow" : "index,follow"}">

<meta property="og:type" content="website">
<meta property="og:locale" content="hu_HU">
<meta property="og:site_name" content="${esc(BRAND)}">
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(desc)}">
<meta property="og:url" content="${url}">
<meta property="og:image" content="${SITE}/assets/img/arrow-hero.png">
<meta name="twitter:card" content="summary_large_image">

<link rel="icon" href="${up}assets/brand/logo-mark.svg" type="image/svg+xml">
<link rel="apple-touch-icon" href="${up}assets/img/arrow-hero.png">

<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Inter+Tight:wght@600;700;800&family=JetBrains+Mono:wght@400;500&display=swap">

<link rel="stylesheet" href="${up}css/tokens.css?v=${V}">
<link rel="stylesheet" href="${up}css/base.css?v=${V}">
<link rel="stylesheet" href="${up}css/components.css?v=${V}">
<link rel="stylesheet" href="${up}css/hero.css?v=${V}">
<link rel="stylesheet" href="${up}css/funnel.css?v=${V}">
<link rel="stylesheet" href="${up}css/motion.css?v=${V}">

${schema}
</head>
<body class="grain">
<a class="skip-link" href="#main">Ugrás a tartalomra</a>
<div class="scroll-bar" aria-hidden="true"></div>`;
}

function nav(depth = 0, current = "") {
  const up = upOf(depth);
  const link = (href, label, key) =>
    `<a class="nav__link" href="${href}"${current === key ? ' aria-current="page"' : ""}>${label}</a>`;
  return `
<header class="nav">
  <a class="brand" href="${up}index.html" aria-label="${esc(BRAND)} — főoldal">
    <img class="brand__mark" src="${up}assets/brand/logo-mark.svg" alt="" width="38" height="38">
    <span>
      <span class="brand__name">Érték Pont</span>
      <span class="brand__sub">Pénzügyek</span>
    </span>
  </a>
  <nav class="nav__links" aria-label="Fő navigáció">
    ${link(`${up}index.html#terkep`, "Pénzügyi Térkép", "terkep")}
    ${link(`${up}index.html#szolgaltatasok`, "Szolgáltatások", "szolg")}
    ${link(`${up}index.html#folyamat`, "Hogyan dolgozom", "folyamat")}
    ${link(`${up}index.html#rolam`, "Rólam", "rolam")}
    ${link(`${up}index.html#gyik`, "GYIK", "gyik")}
  </nav>
  <div class="nav__actions">
    <a class="btn hide-mobile" href="${up}index.html#terkep">
      <span class="btn__label">Indítsuk el</span><span class="btn__arrow">${ARROW}</span>
    </a>
    <button class="burger" aria-expanded="false" aria-label="Menü" aria-controls="menu"><span></span></button>
  </div>
</header>

<div class="menu" id="menu">
  <div class="menu__group">
    <p class="footer__title">Kezdd itt</p>
    <a class="menu__item" href="${up}index.html#terkep"><span>Pénzügyi Térkép</span><small>1 perc</small></a>
    <a class="menu__item" href="${up}index.html#rolam"><span>Rólam</span><small>bemutatkozás</small></a>
  </div>
  ${Object.values(CATEGORIES)
    .map(
      (c) => `
  <div class="menu__group">
    <p class="footer__title">${esc(c.label)}</p>
    ${SERVICES.filter((s) => s.cat === c.key)
      .map(
        (s) =>
          `<a class="menu__item" href="${up}szolgaltatas/${s.slug}.html"><span>${esc(s.navTitle)}</span><small>${esc(s.badge)}</small></a>`
      )
      .join("\n    ")}
  </div>`
    )
    .join("")}
</div>`;
}

function stickyCta(depth = 0) {
  const up = upOf(depth);
  return `
<div class="sticky-cta">
  <a class="btn btn--block" href="${up}index.html#terkep"><span class="btn__label">Pénzügyi Térkép</span></a>
  <a class="btn btn--ghost btn--icon" data-cfg-href="contact.phoneHref|tel:" href="#" aria-label="Telefonhívás">
    ${icon('<path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a1 1 0 0 1-1 1A16 16 0 0 1 4 5a1 1 0 0 1 1-1z"/>', 18, 1.8)}
  </a>
</div>`;
}

function footer(depth = 0) {
  const up = upOf(depth);
  const catBlock = (c) => `
    <div>
      <p class="footer__title">${esc(c.label)}</p>
      <ul class="footer__list">
        ${SERVICES.filter((s) => s.cat === c.key)
          .map((s) => `<li><a href="${up}szolgaltatas/${s.slug}.html">${esc(s.navTitle)}</a></li>`)
          .join("\n        ")}
      </ul>
    </div>`;

  return `
<footer class="footer">
  <div class="wrap">
    <div class="footer__grid">
      <div>
        <a class="brand" href="${up}index.html">
          <img class="brand__mark" src="${up}assets/brand/logo-mark.svg" alt="" width="38" height="38">
          <span><span class="brand__name">Érték Pont</span><span class="brand__sub">Pénzügyek</span></span>
        </a>
        <p class="tiny soft" style="margin-top:1rem;max-width:34ch">
          Teljes körű pénzügyi tanácsadás: adóoptimalizálás, megtakarítás, biztosítás, hitel és bankügyek — egy helyen, egy emberrel.
        </p>
        <ul class="footer__list" style="margin-top:1.25rem">
          <li><a data-cfg-href="contact.phoneHref|tel:" href="#"><span data-cfg="contact.phone">+36 — — —</span></a></li>
          <li><a data-cfg-href="contact.email|mailto:" href="#"><span data-cfg="contact.email">e-mail</span></a></li>
          <li><a data-cfg-href="contact.facebook|" href="#" target="_blank" rel="noopener">Facebook</a></li>
          ${
            /* Csak akkor kerül ki, ha ki van töltve — üres linket nem mutatunk. */
            CFG.contact.linkedin
              ? `<li><a href="${esc(CFG.contact.linkedin)}" target="_blank" rel="noopener">LinkedIn</a></li>`
              : ""
          }
        </ul>
      </div>
      ${Object.values(CATEGORIES).map(catBlock).join("")}
    </div>

    <div class="disclaimer">
      <strong>Fontos tájékoztatás.</strong> Ez az oldal általános tájékoztatást ad, nem minősül
      személyre szóló befektetési, adó- vagy jogi tanácsadásnak, és nem ajánlat. A számítások
      tájékoztató jellegűek, a tényleges díjakat, kamatokat és feltételeket a biztosítók, bankok és
      pénztárak határozzák meg, a hatályos jogszabályok keretei között. A megtakarítási és
      befektetési formák hozama nem garantált; a hitelfelvétel kockázattal járó pénzügyi döntés.
      Konkrét terméket vagy szolgáltatót az oldal nem népszerűsít.
      A közvetítés bejegyzett közvetítőként, többes ügynök nevében történik; a szerződés a
      biztosítóval, bankkal vagy pénztárral jön létre — részletek az
      <a href="${up}impresszum.html" style="color:var(--lime)">impresszumban</a>.
    </div>

    <div class="cfg-warning" data-config-warning hidden>
      <strong>Fejlesztői figyelmeztetés:</strong> a lead-fogadó végpont (<code>js/config.js → leadEndpoint</code>)
      nincs beállítva, ezért a jelentkezések csak a böngésző tárolójába kerülnek.
      Élesítés előtt lásd: <code>docs/google-sheets-setup.md</code>.
    </div>

    <div class="footer__bottom">
      <span>© <span data-year>2026</span> ${esc(BRAND)}. Minden jog fenntartva. <span class="powered">powered by OVB</span></span>
      <span class="row" style="gap:1.25rem">
        <a href="${up}impresszum.html">Impresszum</a>
        <a href="${up}adatkezeles.html">Adatkezelési tájékoztató</a>
      </span>
    </div>
  </div>
</footer>

<div class="cookie" role="dialog" aria-label="Süti beállítások">
  <p class="tiny"><strong>Sütik.</strong> Csak a működéshez szükséges sütiket használjuk.
  Mérési vagy marketing célú sütit nem helyezünk el a hozzájárulásod nélkül.
  <a href="${up}adatkezeles.html" style="color:var(--lime)">Részletek</a></p>
  <div class="cookie__actions">
    <button class="btn" data-cookie="all" type="button"><span class="btn__label">Rendben</span></button>
    <button class="btn btn--ghost" data-cookie="necessary" type="button"><span class="btn__label">Csak a szükséges</span></button>
  </div>
</div>`;
}

function scripts(depth = 0, hero3d = false) {
  const up = upOf(depth);
  return `
<script src="${up}js/config.js?v=${V}"></script>
<script src="${up}js/data/services.js?v=${V}"></script>
<script src="${up}js/data/quiz.js?v=${V}"></script>
<script src="${up}js/core/rt.js?v=${V}"></script>
<script src="${up}js/core/ui.js?v=${V}"></script>
<script src="${up}js/core/motion.js?v=${V}"></script>
<script src="${up}js/lead.js?v=${V}"></script>
<script src="${up}js/funnel.js?v=${V}"></script>
<script src="${up}js/site.js?v=${V}"></script>
${hero3d ? `<script src="${up}js/gl/mini3d.js?v=${V}" defer></script>
<script src="${up}js/hero3d.js?v=${V}" defer></script>
<script src="${up}js/scene3d.js?v=${V}" defer></script>` : ""}
</body>
</html>`;
}

/* --- kártya a bento gridhez -------------------------------------------- */
function svcCard(s, i, depth = 0) {
  const up = upOf(depth);
  const wide = [0, 6].includes(i) ? " bento__cell--wide" : "";
  return `
  <a class="card card--spot svc bento__cell${wide}" href="${up}szolgaltatas/${s.slug}.html"
     data-cat="${s.cat}" data-reveal style="--reveal-delay:${(i % 4) * 60}ms">
    <div class="svc__top">
      <span class="svc__icon"><img src="${up}assets/img/icons/${s.slug}.png" alt="" width="54" height="54" loading="lazy" decoding="async"></span>
      <span class="svc__badge">${esc(s.badge)}</span>
    </div>
    <div>
      <h3 class="h3 svc__title">${esc(s.title)}</h3>
      <p class="svc__hook">${esc(s.hook)}</p>
    </div>
    <div class="svc__foot">
      <span class="svc__metric">${esc(s.metric)}</span>
      <span class="link-arrow">Megnézem ${ARROW}</span>
    </div>
  </a>`;
}

/* ====================================================================== */
/*  Főoldal                                                               */
/* ====================================================================== */

const HOME_FAQ = [
  {
    q: "Mennyibe kerül nekem a tanácsadás?",
    a: "Semmibe. A közvetítői jutalékot a biztosítók, bankok és pénztárak fizetik a megkötött szerződések után — neked nincs tanácsadási díjad. Ezért is fontos, hogy több partner ajánlatát lásd egymás mellett, ne csak egyet.",
  },
  {
    q: "Konkrét terméket fogsz rám tolni?",
    a: "Nem. Először a helyzetet nézzük meg: mennyi adót fizetsz, mekkora a tartalékod, milyen hiteled és biztosításod van. Ebből jön ki, mi indokolt — és mi az, amire nincs szükséged. Van, amikor a válasz az, hogy most ne kössünk semmit.",
  },
  {
    q: "Mennyi időt vesz el?",
    a: "Az első beszélgetés 30–45 perc, online vagy személyesen. Ha van konkrét téma (például KGFB-évforduló vagy egészségpénztár), akkor gyakran 15 perc is elég az első körhöz.",
  },
  {
    q: "Miért 13 különböző terület? Nem túl sok ez egy embernek?",
    a: "Mert a pénzügyeid sem külön dobozokban vannak. A lakáshiteled kihat az életbiztosításodra, az adókedvezmény a megtakarításodra, a bankszámlád a tartalékodra. Egy helyen átnézve derül ki, hol veszítesz pénzt — és ez általában nem ott van, ahol számítasz rá.",
  },
  {
    q: "Mi történik az adataimmal?",
    a: "Csak a megkeresés megválaszolására használom őket, harmadik félnek nem adom át, hírlevelet nem küldök. A részleteket az adatkezelési tájékoztató tartalmazza, és bármikor kérheted a törlést.",
  },
  {
    q: "Online is működik, vagy személyesen kell találkozni?",
    a: "Mindkettő megy. A legtöbb ügy — összehasonlítás, számolás, ajánlatkérés — teljesen online intézhető, videóhívással és e-mailben. Ahol aláírás kell, egyeztetünk.",
  },
];

function homePage() {
  const schema = `<script type="application/ld+json">${JSON.stringify({
    "@context": "https://schema.org",
    "@type": "FinancialService",
    name: BRAND,
    url: SITE,
    areaServed: "HU",
    description:
      "Pénzügyi tanácsadás: nyugdíj- és gyerekmegtakarítás, 20% adókedvezmények, biztosítások, támogatott és piaci hitelek, díjmentes bankszámlák.",
    knowsAbout: SERVICES.map((s) => s.title),
    sameAs: [CFG.contact.facebook, CFG.contact.linkedin].filter(Boolean),
  })}</script>
<script type="application/ld+json">${JSON.stringify({
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: HOME_FAQ.map((f) => ({
      "@type": "Question",
      name: f.q,
      acceptedAnswer: { "@type": "Answer", text: f.a },
    })),
  })}</script>`;

  const marqueeItems = SERVICES.map(
    (s) => `<span class="marquee__item"><span class="dot"></span>${esc(s.navTitle)}</span>`
  ).join("\n        ");

  return `${head({
    title: `${BRAND} — 13 pénzügyi terület, egy helyen, egy emberrel`,
    desc:
      "Nyugdíj, gyerekmegtakarítás, 20% adókedvezmények, KGFB/casco, élet- és egészségbiztosítás, támogatott és piaci hitelek, díjmentes bankszámla. Töltsd ki a Pénzügyi Térképet, és megmutatom, hol hagysz pénzt az asztalon.",
    url: SITE + "/",
    depth: 0,
    schema,
  })}
${nav(0)}

<main id="main">

  <!-- ============ HERO ============ -->
  <section class="hero">
    <div class="glow-blob hero__glow" aria-hidden="true"></div>
    <div class="wrap hero__inner">
      <div>
        <span class="hero__kicker"><span class="dot"></span>Tímár Richárd · pénzügyi tanácsadó · Budapest</span>
        <h1 class="hero__title" data-lines>
          Az állam évente <em>több százezer forintot</em> ad vissza
        </h1>
        <p class="hero__lead">
          A legtöbb család ezt kihagyja. Nyugdíj, gyerekmegtakarítás, adókedvezmények,
          biztosítás, hitel, bankszámla — 13 terület, ahol pénz áll vagy vész el.
          Egy perc alatt megmutatom, nálad melyik három hozza a legtöbbet,
          és mennyi az a szám forintban.
        </p>
        <div class="hero__actions">
          <a class="btn btn--lg" href="#terkep">
            <span class="btn__label">Pénzügyi Térkép — 1 perc</span><span class="btn__arrow">${ARROW}</span>
          </a>
          <a class="btn btn--ghost btn--lg" href="#szolgaltatasok">
            <span class="btn__label">Mind a 13 téma</span>
          </a>
        </div>
        <div class="hero__meta">
          <span><b>0 Ft</b> tanácsadási díj</span>
          <span><b>24 órán</b> belül visszahívás</span>
          <span><b>Több partner</b> biztosító és bank ajánlata</span>
        </div>
      </div>

      <div class="hero__stage" data-hero3d="assets/3d/ep-arrow.glb">
        <canvas aria-hidden="true"></canvas>
        <img class="hero__fallback" src="assets/img/arrow-hero.png" alt="" width="900" height="900" loading="eager" fetchpriority="high">
      </div>
    </div>

    <div class="hero__scroll" aria-hidden="true"><span>Görgess</span><span class="line"></span></div>
  </section>

  <!-- ============ FUTÓSZALAG ============ -->
  <div class="marquee" aria-hidden="true">
    <div class="marquee__track">
      ${marqueeItems}
    </div>
  </div>

  <!-- ============ PÉNZÜGYI TÉRKÉP ============ -->
  <section class="section has-scene" id="terkep">
    <div class="scene3d" data-scene3d="assets/3d/ep-icons.glb" aria-hidden="true"><canvas></canvas></div>
    <div class="wrap">
      <div class="sec-head">
        <div>
          <span class="label">01 — Kezdd itt</span>
          <h2 class="h2 sec-head__title" data-reveal>Pénzügyi Térkép</h2>
        </div>
        <p class="lead" data-reveal>
          Hat kérdés, kb. egy perc. A végén megmutatom, melyik három téma hozza neked most a
          legtöbb pénzt vagy a legnagyobb biztonságot — és mindegyikhez ott lesz a konkrét szám.
        </p>
      </div>
      <div class="funnel-narrow" data-funnel="map" data-reveal="scale"></div>
    </div>
  </section>

  <!-- ============ SZÁMOK ============ -->
  <section class="section-sm">
    <div class="wrap">
      <div class="stats" data-render="stats"></div>
    </div>
  </section>

  <!-- ============ SZOLGÁLTATÁSOK ============ -->
  <section class="section" id="szolgaltatasok">
    <div class="wrap">
      <div class="sec-head">
        <div>
          <span class="label">02 — Területek</span>
          <h2 class="h2 sec-head__title" data-reveal>13 téma, amit egy helyen átnézhetsz</h2>
        </div>
        <p class="lead" data-reveal>
          Mindegyikhez tartozik egy rövid végigvezetés és egy kalkulátor. Nem kell tudnod,
          mit keresel — a kérdésekből kiderül.
        </p>
      </div>

      <div class="filter" data-filter>
        <button class="is-picked" data-cat="all" type="button">Mind (13)</button>
        ${Object.values(CATEGORIES)
          .map(
            (c) =>
              `<button data-cat="${c.key}" type="button">${esc(c.label)} (${SERVICES.filter((s) => s.cat === c.key).length})</button>`
          )
          .join("\n        ")}
      </div>

      <div class="bento" data-grid>
        ${SERVICES.map((s, i) => svcCard(s, i, 0)).join("")}
      </div>
    </div>
  </section>

  <!-- ============ FOLYAMAT ============ -->
  <section class="section" id="folyamat">
    <div class="wrap split split-sticky">
      <div>
        <span class="label">03 — Hogyan dolgozom</span>
        <h2 class="h2" style="margin-top:.75rem" data-reveal>Négy lépés, semmi meglepetés</h2>
        <p class="lead" style="margin-top:1.25rem" data-reveal>
          Nem termékkel kezdünk, hanem a te számaiddal. Ha a végén az jön ki, hogy semmit nem
          kell kötni, azt is megmondom — ez a különbség egy közvetítő és egy értékesítő között.
        </p>
        <div class="hero__actions">
          <a class="btn" href="#terkep"><span class="btn__label">Kezdjük a térképpel</span><span class="btn__arrow">${ARROW}</span></a>
        </div>
      </div>
      <div class="steps">
        <div class="step" data-reveal>
          <h3 class="h3">Helyzetkép</h3>
          <p class="soft">Egy 30–45 perces beszélgetés online vagy személyesen: mennyi adót fizetsz,
          mi van már meg, hol vannak lyukak. Ide nem kell felkészülni, csak a meglévő szerződéseid.</p>
        </div>
        <div class="step" data-reveal style="--reveal-delay:80ms">
          <h3 class="h3">Számok</h3>
          <p class="soft">Kiszámoljuk, mennyit hoz vagy visz az egyes döntés — forintban, évekre előre.
          Itt derül ki, mi az, ami tényleg fontos, és mi az, ami csak jól hangzik.</p>
        </div>
        <div class="step" data-reveal style="--reveal-delay:160ms">
          <h3 class="h3">Ajánlatok</h3>
          <p class="soft">Több partnerbiztosító, bank és pénztár ajánlatát kérem le és hasonlítom össze.
          Nem a legalacsonyabb havi díjat keressük, hanem a legjobb feltételt a te helyzetedre.</p>
        </div>
        <div class="step" data-reveal style="--reveal-delay:240ms">
          <h3 class="h3">Ügyintézés és utána is</h3>
          <p class="soft">Az adminisztrációt átveszem. Ami ennél fontosabb: kárügynél, évfordulónál,
          jogszabály-változásnál is elérhető vagyok — nem a szerződéskötéssel ér véget a munka.</p>
        </div>
      </div>
    </div>
  </section>

  <!-- ============ RÓLAM ============ -->
  <section class="section" id="rolam">
    <div class="wrap about">
      <div class="about__photo" data-photo-wrap data-reveal="left">
        <img data-cfg-src="advisor.photo" src="assets/brand/portre.jpg" alt="" loading="lazy" onerror="this.closest('[data-photo-wrap]').classList.add('no-photo')">
      </div>
      <div data-reveal="right">
        <span class="label">04 — Rólam</span>
        <h2 class="h2" style="margin-top:.75rem"><span data-cfg="advisor.name">Érték Pont Pénzügyek</span></h2>
        <p class="soft" style="margin-top:.5rem"><span data-cfg="advisor.role">pénzügyi tanácsadó</span> · <span data-cfg="contact.area">Budapest és online</span></p>
        <div class="prose" style="margin-top:1.5rem">
          <p data-cfg="advisor.bio">Ide kerül a bemutatkozás.</p>
          <p>Amit fontosnak tartok: érthető magyarázat apróbetű helyett, több szolgáltató ajánlata
          egy helyett, és hogy évek múlva is ugyanaz az ember vegye fel a telefont.</p>
        </div>
        <div class="fact-row">
          <div><div class="fact__v" style="font-size:clamp(1.1rem,4.4vw,1.45rem);white-space:nowrap" data-cfg="contact.phone">+36 — — —</div><div class="fact__l">Hívj bátran</div></div>
          <div><div class="fact__v" style="font-size:1.15rem;word-break:break-all" data-cfg="contact.email">e-mail</div><div class="fact__l">Vagy írj</div></div>
          <div><div class="fact__v" style="font-size:1.15rem" data-cfg="contact.hours">Hétfő–péntek</div><div class="fact__l">Elérhetőség</div></div>
        </div>
        <div class="hero__actions">
          <a class="btn" data-cfg-href="contact.phoneHref|tel:" href="#"><span class="btn__label">Telefonhívás</span></a>
          <a class="btn btn--ghost" data-cfg-href="contact.messenger|" href="#" target="_blank" rel="noopener"><span class="btn__label">Messenger</span></a>
        </div>
        <!-- Időpontfoglaló gomb szándékosan nincs: a visszahívást a
             telefonszám és az online űrlap viszi, harmadik fél nélkül. -->
      </div>
    </div>
  </section>

  ${
    /* Referencia-szekció CSAK akkor, ha van valódi, engedélyezett vélemény.
       Üres configgal a JS is eltávolítaná, de akkor a fejléc egy pillanatra
       felvillanna — build-időben kihagyva ez sem történik meg. */
    (CFG.testimonials || []).length
      ? `<!-- ============ REFERENCIÁK ============ -->
  <section class="section-sm">
    <div class="wrap">
      <div class="sec-head">
        <div>
          <span class="label">Referenciák</span>
          <h2 class="h2 sec-head__title">Amit az ügyfelek mondanak</h2>
        </div>
      </div>
      <div class="grid grid-3" data-render="testimonials"></div>
    </div>
  </section>`
      : ""
  }

  <!-- ============ GYIK ============ -->
  <section class="section" id="gyik">
    <div class="wrap split">
      <div>
        <span class="label">05 — Gyakori kérdések</span>
        <h2 class="h2" style="margin-top:.75rem" data-reveal>Amit a legtöbben megkérdeznek</h2>
        <p class="lead" style="margin-top:1.25rem">
          Ha valami nincs itt, írj rá egy sort — konkrét kérdésre konkrét választ kapsz,
          nem prospektust.
        </p>
      </div>
      <div class="acc">
        ${HOME_FAQ.map(
          (f, i) => `
        <div class="acc__item">
          <button class="acc__btn" aria-expanded="false" aria-controls="faq-${i}" type="button">
            <span>${esc(f.q)}</span><span class="acc__sign"></span>
          </button>
          <div class="acc__panel" id="faq-${i}"><div>${esc(f.a)}</div></div>
        </div>`
        ).join("")}
      </div>
    </div>
  </section>

  <!-- ============ CTA ============ -->
  <section class="section-sm">
    <div class="wrap">
      <div class="cta-band" data-reveal="scale">
        <img class="cta-band__glyph" src="assets/img/arrow-hero.png" alt="" aria-hidden="true">
        <span class="label" style="color:var(--lime-ink);opacity:.7">Kezdjük el</span>
        <h2 class="h2" style="margin-top:.75rem;max-width:24ch">Egy perc most, több százezer forint évente.</h2>
        <p style="margin-top:1rem;max-width:52ch;opacity:.8">
          Töltsd ki a Pénzügyi Térképet, és 24 órán belül keresek a konkrét számokkal.
          Nem call center, nem hírlevél — egy hívás, egy ember.
        </p>
        <div class="hero__actions">
          <a class="btn btn--dark btn--lg" href="#terkep"><span class="btn__label">Pénzügyi Térkép indítása</span><span class="btn__arrow">${ARROW}</span></a>
        </div>
      </div>
    </div>
  </section>

</main>
${footer(0)}
${stickyCta(0)}
${scripts(0, true)}`;
}

/* ====================================================================== */
/*  Szolgáltatás-aloldal                                                  */
/* ====================================================================== */

function servicePage(s) {
  const url = `${SITE}/szolgaltatas/${s.slug}.html`;
  const schema = `<script type="application/ld+json">${JSON.stringify({
    "@context": "https://schema.org",
    "@type": "Service",
    name: s.title,
    serviceType: CATEGORIES[s.cat].label,
    description: s.seo.desc,
    url,
    provider: { "@type": "FinancialService", name: BRAND, url: SITE },
    areaServed: "HU",
  })}</script>
<script type="application/ld+json">${JSON.stringify({
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: s.faq.map((f) => ({
      "@type": "Question",
      name: f.q,
      acceptedAnswer: { "@type": "Answer", text: f.a },
    })),
  })}</script>
<script type="application/ld+json">${JSON.stringify({
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Főoldal", item: SITE + "/" },
      { "@type": "ListItem", position: 2, name: CATEGORIES[s.cat].label, item: SITE + "/#szolgaltatasok" },
      { "@type": "ListItem", position: 3, name: s.title, item: url },
    ],
  })}</script>`;

  const related = SERVICES.filter((x) => x.slug !== s.slug)
    .sort((a, b) => (a.cat === s.cat ? -1 : 1) - (b.cat === s.cat ? -1 : 1))
    .slice(0, 3);

  return `${head({ title: s.seo.title, desc: s.seo.desc, url, depth: 1, schema })}
${nav(1)}

<main id="main">

  <section class="svc-hero">
    <div class="glow-blob" style="top:-10%;right:-10%;width:min(70vw,560px);aspect-ratio:1" aria-hidden="true"></div>
    <div class="wrap svc-hero__grid">
      <div>
        <nav class="crumb" aria-label="Morzsamenü">
          <a href="../index.html">Főoldal</a> <span>/</span>
          <a href="../index.html#szolgaltatasok">${esc(CATEGORIES[s.cat].label)}</a> <span>/</span>
          <span class="lime">${esc(s.navTitle)}</span>
        </nav>
        <div class="row" style="gap:1rem;align-items:center">
          <span class="icon-lg" data-reveal="scale"><img src="../assets/img/icons/${s.slug}.png" alt="" width="88" height="88" loading="eager" decoding="async"></span>
          <span class="svc__badge">${esc(s.badge)}</span>
        </div>
        <h1 class="h1" style="margin-top:1.25rem" data-lines>${esc(s.title)}</h1>
        <p class="lead" style="margin-top:1.25rem">${esc(s.hook)}</p>

        <div class="fact-row">
          ${s.facts
            .map(
              (f) => `<div data-reveal>
            <div class="fact__v">${esc(f.v)}</div>
            <div class="fact__l">${esc(f.l)}</div>
          </div>`
            )
            .join("\n          ")}
        </div>

        <div class="hero__actions">
          <a class="btn" href="#funnel"><span class="btn__label">Számoljuk ki nálam</span><span class="btn__arrow">${ARROW}</span></a>
          <a class="btn btn--ghost" data-cfg-href="contact.phoneHref|tel:" href="#"><span class="btn__label">Inkább hívnék</span></a>
        </div>
      </div>

      <div id="funnel" data-funnel="${s.slug}" data-reveal="scale"></div>
    </div>
  </section>

  <section class="section-sm">
    <div class="wrap split split-sticky">
      <div>
        <span class="label">Miről van szó</span>
        <h2 class="h2" style="margin-top:.75rem" data-reveal>Így működik</h2>
        <div class="prose" style="margin-top:1.5rem">
          <p>${esc(s.intro)}</p>
        </div>
        ${
          s.warn
            ? `<div class="warn-box" style="margin-top:1.5rem" data-reveal>
          <span class="label">Amit előre tudni kell</span>
          <p style="margin-top:.5rem" class="soft">${esc(s.warn)}</p>
        </div>`
            : ""
        }
      </div>
      <div class="how">
        ${s.how
          .map(
            (h, i) => `<div class="how__item" data-reveal style="--reveal-delay:${i * 70}ms">
          <h3 class="h4">${esc(h.h)}</h3>
          <p class="soft tiny" style="font-size:var(--fs-sm)">${esc(h.t)}</p>
        </div>`
          )
          .join("\n        ")}
      </div>
    </div>
  </section>

  <section class="section-sm">
    <div class="wrap split">
      <div>
        <span class="label">Kinek szól</span>
        <h2 class="h2" style="margin-top:.75rem" data-reveal>Akkor érdemes foglalkozni vele, ha…</h2>
        <p class="lead" style="margin-top:1.25rem">
          Ha legalább egy pont igaz rád, jó eséllyel van itt pénz vagy védelem, amit ma nem használsz ki.
        </p>
        <div class="hero__actions">
          <a class="btn" href="#funnel"><span class="btn__label">Megnézem a számokat</span><span class="btn__arrow">${ARROW}</span></a>
        </div>
      </div>
      <ul class="check-list" data-reveal>
        ${s.bullets.map((b) => `<li>${esc(b)}</li>`).join("\n        ")}
      </ul>
    </div>
  </section>

  <section class="section-sm">
    <div class="wrap split">
      <div>
        <span class="label">Gyakori kérdések</span>
        <h2 class="h2" style="margin-top:.75rem" data-reveal>${esc(s.navTitle)} — kérdés-válasz</h2>
      </div>
      <div class="acc">
        ${s.faq
          .map(
            (f, i) => `
        <div class="acc__item">
          <button class="acc__btn" aria-expanded="false" aria-controls="q-${i}" type="button">
            <span>${esc(f.q)}</span><span class="acc__sign"></span>
          </button>
          <div class="acc__panel" id="q-${i}"><div>${esc(f.a)}</div></div>
        </div>`
          )
          .join("")}
      </div>
    </div>
  </section>

  <section class="section-sm">
    <div class="wrap">
      <p class="tiny mute" style="max-width:80ch"><strong>Jogi megjegyzés.</strong> ${esc(s.legal)}</p>
    </div>
  </section>

  <section class="section">
    <div class="wrap">
      <div class="sec-head">
        <div>
          <span class="label">Kapcsolódó témák</span>
          <h2 class="h2 sec-head__title">Ez is összefügg ezzel</h2>
        </div>
        <p class="lead">A pénzügyeid nem külön dobozokban vannak — ezek a témák jellemzően együtt mozognak.</p>
      </div>
      <div class="related">
        ${related
          .map(
            (r, i) => `<a class="card card--spot svc" href="${r.slug}.html" data-reveal style="--reveal-delay:${i * 70}ms">
          <div class="svc__top">
            <span class="svc__icon"><img src="../assets/img/icons/${r.slug}.png" alt="" width="54" height="54" loading="lazy" decoding="async"></span>
            <span class="svc__badge">${esc(r.badge)}</span>
          </div>
          <div>
            <h3 class="h4">${esc(r.title)}</h3>
            <p class="svc__hook">${esc(r.hook.slice(0, 110))}…</p>
          </div>
          <div class="svc__foot">
            <span class="svc__metric">${esc(r.metric)}</span>
            <span class="link-arrow">${ARROW}</span>
          </div>
        </a>`
          )
          .join("\n        ")}
      </div>
    </div>
  </section>

  <section class="section-sm">
    <div class="wrap">
      <div class="cta-band" data-reveal="scale">
        <img class="cta-band__glyph" src="../assets/img/arrow-hero.png" alt="" aria-hidden="true">
        <span class="label" style="color:var(--lime-ink);opacity:.7">Nem vagy biztos, hogy ez a téma a tiéd?</span>
        <h2 class="h2" style="margin-top:.75rem;max-width:26ch">Töltsd ki a Pénzügyi Térképet — 1 perc.</h2>
        <p style="margin-top:1rem;max-width:52ch;opacity:.8">
          Hat kérdés alapján megmutatom, melyik három terület hozza neked most a legtöbbet.
        </p>
        <div class="hero__actions">
          <a class="btn btn--dark btn--lg" href="../index.html#terkep"><span class="btn__label">Pénzügyi Térkép</span><span class="btn__arrow">${ARROW}</span></a>
        </div>
      </div>
    </div>
  </section>

</main>
${footer(1)}
${stickyCta(1)}
${scripts(1, false)}`;
}

/* ====================================================================== */
/*  Jogi oldalak                                                          */
/* ====================================================================== */

function imprintPage() {
  const url = SITE + "/impresszum.html";
  return `${head({
    title: `Impresszum — ${BRAND}`,
    desc: "Az Érték Pont Pénzügyek üzemeltetői adatai, MNB nyilvántartási szám, elérhetőségek.",
    url,
    depth: 0,
  })}
${nav(0)}
<main id="main" class="doc section">
  <div class="wrap wrap-narrow">
    <span class="label">Jogi információk</span>
    <h1 class="h1" style="margin-top:.75rem">Impresszum</h1>

    <h2 class="h3">Az oldal szerzője, a tanácsadó</h2>
    <dl>
      <dt>Név</dt><dd data-cfg="advisor.name">—</dd>
      <dt>Tevékenység</dt><dd data-cfg="legal.role">—</dd>
      <dt>Iroda</dt><dd data-cfg="legal.office">—</dd>
      <dt>Telefon</dt><dd data-cfg="contact.phone">—</dd>
      <dt>E-mail</dt><dd data-cfg="contact.email">—</dd>
      <dt>Működési terület</dt><dd data-cfg="contact.area">—</dd>
    </dl>

    <h2 class="h3">A közvetítő társaság</h2>
    <p>
      A közvetítői tevékenységet az alábbi társaság nevében és javára végzem. Szerződés nem velem,
      hanem a társasággal, illetve az érintett biztosítóval, bankkal vagy pénztárral jön létre.
    </p>
    <dl>
      <dt>Cégnév</dt><dd data-cfg="legal.companyName">—</dd>
      <dt>Székhely</dt><dd data-cfg="legal.address">—</dd>
      <dt>Cégjegyzékszám</dt><dd data-cfg="legal.regNumber">—</dd>
      <dt>Adószám</dt><dd data-cfg="legal.taxNumber">—</dd>
      <dt>Minősítés</dt><dd>többes ügynök (nem alkusz) — több biztosító termékeit közvetíti</dd>
    </dl>

    <h2 class="h3">Nyilvántartás, felügyelet</h2>
    <dl>
      <dt>Biztosításközvetítői nyilvántartási szám</dt><dd data-cfg="legal.mnbNumber">—</dd>
      <dt>Hitelközvetítői nyilvántartási szám</dt><dd data-cfg="legal.mnbCreditNumber">—</dd>
      <dt>Felügyeleti szerv</dt><dd>Magyar Nemzeti Bank — Pénzügyi Fogyasztóvédelmi Központ (1013 Budapest, Krisztina krt. 55.)</dd>
    </dl>
    <p>
      A nyilvántartásba vétel az MNB közhiteles nyilvántartásában ellenőrizhető:
      <a href="https://intezmenykereso.mnb.hu/" target="_blank" rel="noopener" style="color:var(--lime)">intezmenykereso.mnb.hu</a>,
      illetve <a href="https://apps.mnb.hu/regiszter/" target="_blank" rel="noopener" style="color:var(--lime)">apps.mnb.hu/regiszter</a>.
    </p>

    <h2 class="h3">A tájékoztatás jellege</h2>
    <p>
      A weboldalon szereplő tartalom általános tájékoztatást szolgál. Nem minősül személyre szóló
      befektetési, adó- vagy jogi tanácsadásnak, nem ajánlat, és nem kötelezi a megjelenített
      összegek elérésére sem az üzemeltetőt, sem a szolgáltatókat. A kalkulátorok eredményei
      becslések, amelyek a megadott feltételezéseken alapulnak.
    </p>
    <p>
      Konkrét pénzügyi terméket vagy szolgáltatót az oldal nem népszerűsít. A szerződés mindig
      az érintett biztosítóval, bankkal vagy pénztárral jön létre, a díjakat, kamatokat és
      feltételeket ezen intézmények, valamint a hatályos jogszabályok határozzák meg.
    </p>

    <h2 class="h3">Panaszkezelés</h2>
    <p>
      Panaszt szóban (telefonon vagy személyesen) és írásban (e-mailben, postai úton) is
      előadhatsz a fenti elérhetőségeken, illetve közvetlenül a közvetítő társaság
      panaszkezelési csatornáin:
      <a href="https://www.ovb.hu/szerviz/panaszkezeles.html" target="_blank" rel="noopener" style="color:var(--lime)">ovb.hu/szerviz/panaszkezeles</a>.
      A panaszt a jogszabályban meghatározott határidőn belül
      kivizsgáljuk és írásban válaszolunk. Ha a válasszal nem vagy elégedett, a Magyar Nemzeti
      Bank Pénzügyi Fogyasztóvédelmi Központjához, illetve a Pénzügyi Békéltető Testülethez
      (1013 Budapest, Krisztina krt. 55.) fordulhatsz.
    </p>

    <h2 class="h3">Szerzői jog</h2>
    <p>
      Az oldalon található szövegek, ábrák és arculati elemek szerzői jogi védelem alatt állnak.
      Felhasználásuk csak az üzemeltető előzetes írásos engedélyével lehetséges.
    </p>

    <p class="tiny mute" style="margin-top:3rem">
      Utolsó módosítás: <span data-year>2026</span>. Ha hibát találsz az adatokban, jelezd a fenti e-mail címen.
    </p>
  </div>
</main>
${footer(0)}
${scripts(0, false)}`;
}

function privacyPage() {
  const url = SITE + "/adatkezeles.html";
  return `${head({
    title: `Adatkezelési tájékoztató — ${BRAND}`,
    desc: "Milyen adatokat kezelünk a jelentkezési űrlapokon, mennyi ideig, milyen jogalapon, és milyen jogaid vannak (GDPR).",
    url,
    depth: 0,
  })}
${nav(0)}
<main id="main" class="doc section">
  <div class="wrap wrap-narrow">
    <span class="label">GDPR</span>
    <h1 class="h1" style="margin-top:.75rem">Adatkezelési tájékoztató</h1>
    <p class="lead" style="margin-top:1.25rem">
      Röviden: csak azt kérdezzük meg, ami a visszahíváshoz kell, csak arra használjuk,
      és bármikor kérheted a törlést.
    </p>

    <h2 class="h3">1. Az adatkezelő</h2>
    <dl>
      <dt>Adatkezelő</dt><dd data-cfg="advisor.name">—</dd>
      <dt>Minőség</dt><dd data-cfg="legal.role">—</dd>
      <dt>E-mail</dt><dd data-cfg="contact.email">—</dd>
      <dt>Telefon</dt><dd data-cfg="contact.phone">—</dd>
    </dl>
    <p>
      A weboldalon beküldött megkeresések adatait a fenti tanácsadó kezeli, a kapcsolatfelvétel
      céljából. Ha a megkeresésből konkrét szerződéskötési folyamat indul, az abban részt vevő
      közvetítő társaság (<span data-cfg="legal.companyName">—</span>), illetve az érintett
      biztosító, bank vagy pénztár a saját adatkezelési tájékoztatója szerint, önálló
      adatkezelőként jár el — erről a folyamat elején külön tájékoztatást kapsz.
    </p>

    <h2 class="h3">2. Milyen adatokat kezelünk?</h2>
    <ul>
      <li><strong>Kapcsolattartási adatok:</strong> név, telefonszám, opcionálisan e-mail cím.</li>
      <li><strong>A kérdőív válaszai:</strong> az általad megjelölt élethelyzeti és érdeklődési válaszok
      (pl. van-e gyerek, van-e lakáshitel), valamint a kalkulátorban beállított értékek.</li>
      <li><strong>Szabad szöveges megjegyzés:</strong> amit te írsz be.</li>
      <li><strong>Technikai adat:</strong> a beküldés időpontja és annak az oldalnak a címe, ahonnan érkezett.</li>
    </ul>
    <p>
      Különös kategóriába tartozó (pl. egészségi) adatot az űrlap nem kér. Kérünk, hogy a
      megjegyzés rovatba se írj konkrét egészségügyi vagy más érzékeny információt — ezeket
      a személyes beszélgetés során, megfelelő jogalappal tudjuk kezelni.
    </p>

    <h2 class="h3">3. Miért és milyen jogalapon?</h2>
    <dl>
      <dt>Cél</dt>
      <dd>A megkeresésed megválaszolása, a visszahívás megszervezése, és a téged érdeklő
      témában tájékoztatás nyújtása.</dd>
      <dt>Jogalap</dt>
      <dd>A GDPR 6. cikk (1) bekezdés a) pontja szerinti <strong>hozzájárulás</strong>, amit az űrlap
      elküldése előtti jelölőnégyzet bejelölésével adsz meg. A hozzájárulás bármikor visszavonható.</dd>
    </dl>

    <h2 class="h3">4. Meddig tároljuk?</h2>
    <p>
      A kapcsolatfelvételi adatokat a megkeresés lezárásától számított legfeljebb 12 hónapig
      tároljuk, kivéve ha ezalatt szerződéses kapcsolat jön létre — ilyenkor a vonatkozó
      jogszabályi megőrzési idők érvényesek. Törlési kérelem esetén az adatokat haladéktalanul
      töröljük, kivéve amit jogszabály megőrizni ír elő.
    </p>

    <h2 class="h3">5. Kik látják az adatokat?</h2>
    <ul>
      <li><strong>Adatfeldolgozó — Google Ireland Ltd.:</strong> a beküldött űrlapadatok
      Google Sheets táblázatban tárolódnak (Google Workspace / Apps Script szolgáltatás).</li>
      <li><strong>Weboldal-szolgáltató:</strong> a hosting szolgáltatója technikai jelleggel
      hozzáférhet a kiszolgálói naplókhoz.</li>
      <li>Az adatokat harmadik félnek marketing célból nem adjuk át, nem adjuk el.</li>
      <li>Ha a te kérésedre ajánlatot kérünk biztosítótól, banktól vagy pénztártól, az ehhez
      szükséges adatokat kizárólag a te előzetes tudtával és külön megbízásod alapján adjuk át.</li>
    </ul>

    <h2 class="h3">6. Sütik</h2>
    <p>
      Az oldal alapesetben csak a működéshez szükséges tárolást használja (pl. a süti-banner
      döntésének megjegyzése, valamint a böngésződben tárolt biztonsági másolat a beküldött
      űrlapról). Marketing- vagy méréscélú sütiket a hozzájárulásod nélkül nem helyezünk el.
      A böngésződben tárolt adatok a böngésző beállításaiból bármikor törölhetők.
    </p>
    <p>
      Az oldal betűtípusokat a Google Fonts szolgáltatásból, a 3D megjelenítéshez szükséges
      programkönyvtárat pedig egy nyilvános tartalomszolgáltató hálózatból tölti be; ezek a
      kérések a technikai működéshez szükségesek, és az adott szolgáltató naplózhatja az
      IP-címet.
    </p>

    <h2 class="h3">7. Milyen jogaid vannak?</h2>
    <ul>
      <li>tájékoztatás kérése a kezelt adataidról,</li>
      <li>helyesbítés, ha valami pontatlan,</li>
      <li>törlés („elfeledtetés”),</li>
      <li>az adatkezelés korlátozása,</li>
      <li>adathordozhatóság,</li>
      <li>a hozzájárulás visszavonása, bármikor, indoklás nélkül.</li>
    </ul>
    <p>
      Kérésedet a fenti e-mail címen jelezheted; legkésőbb 30 napon belül válaszolunk.
    </p>

    <h2 class="h3">8. Jogorvoslat</h2>
    <p>
      Ha úgy érzed, sérült az adatkezeléshez fűződő jogod, panaszt tehetsz a Nemzeti Adatvédelmi
      és Információszabadság Hatóságnál (NAIH, 1055 Budapest, Falk Miksa utca 9-11.,
      ugyfelszolgalat@naih.hu), illetve bírósághoz fordulhatsz.
    </p>

    <p class="tiny mute" style="margin-top:3rem">
      Hatályos: <span data-year>2026</span>. A tájékoztató változásait ezen az oldalon közzétesszük.
      Ez a dokumentum minta jellegű kiindulás — élesítés előtt érdemes a saját cégadatokkal és
      szükség szerint jogi szakértővel véglegesíteni.
    </p>
  </div>
</main>
${footer(0)}
${scripts(0, false)}`;
}

/* ====================================================================== */
/*  404 — a hosting (GitHub Pages, Netlify, Cloudflare) magától kiszolgálja */
/* ====================================================================== */

function notFoundPage() {
  return `${head({
    title: `Ez az oldal nincs meg — ${BRAND}`,
    desc: "A keresett oldal nem található. Válassz a 13 pénzügyi téma közül, vagy indítsd el a Pénzügyi Térképet.",
    url: SITE + "/404.html",
    depth: "root",
  })}
${nav("root")}
<main id="main" class="doc section">
  <div class="wrap wrap-narrow center">
    <p class="label">404</p>
    <h1 class="h1" style="margin-top:0.75rem">Ez az oldal nincs meg</h1>
    <p class="lead" style="margin:1.25rem auto 0">
      Vagy elírás történt a címben, vagy azóta átkerült a tartalom. A lényeg viszont
      megvan: itt van mind a 13 téma, és egy perc alatt kiderül, melyik a tiéd.
    </p>
    <div class="hero__actions" style="justify-content:center;margin-top:2rem">
      <a class="btn btn--lg" href="${BASE}/index.html#terkep">
        <span class="btn__label">Pénzügyi Térkép — 1 perc</span><span class="btn__arrow">${ARROW}</span>
      </a>
      <a class="btn btn--ghost btn--lg" href="${BASE}/index.html#szolgaltatasok">
        <span class="btn__label">Mind a 13 téma</span>
      </a>
    </div>
  </div>
</main>
${footer("root")}
${scripts("root", false)}`;
}

/* ====================================================================== */
/*  Írás                                                                  */
/* ====================================================================== */

function write(rel, content) {
  const abs = path.join(ROOT, rel);
  fs.mkdirSync(path.dirname(abs), { recursive: true });
  fs.writeFileSync(abs, content, "utf8");
  const kb = (Buffer.byteLength(content, "utf8") / 1024).toFixed(1);
  console.log(`  ✓ ${rel.padEnd(52)} ${kb.padStart(6)} kB`);
}

console.log("\nÉrték Pont Pénzügyek — oldalgenerálás\n");

write("index.html", homePage());
SERVICES.forEach((s) => write(`szolgaltatas/${s.slug}.html`, servicePage(s)));
write("impresszum.html", imprintPage());
write("adatkezeles.html", privacyPage());
write("404.html", notFoundPage());

/* A GitHub Pages alapból Jekyll-en futtatja a repót, ami kihagyja az
   aláhúzással kezdődő fájlokat/mappákat. Ez a fájl kikapcsolja. */
write(".nojekyll", "");

/* sitemap + robots */
const urls = [
  SITE + "/",
  ...SERVICES.map((s) => `${SITE}/szolgaltatas/${s.slug}.html`),
  SITE + "/impresszum.html",
  SITE + "/adatkezeles.html",
];
write(
  "sitemap.xml",
  `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls
  .map(
    (u) =>
      `  <url><loc>${u}</loc><lastmod>${new Date().toISOString().slice(0, 10)}</lastmod><changefreq>monthly</changefreq><priority>${u.endsWith("/") ? "1.0" : "0.8"}</priority></url>`
  )
  .join("\n")}
</urlset>
`
);
/* Ideiglenes hostingon (noindex) a robots is tiltson: így a github.io cím
   nem kerül be a keresőbe, és később nem versenyez a saját domainnel. */
write(
  "robots.txt",
  NOINDEX
    ? `# Ideiglenes cím (${SITE}) — szándékosan nincs indexelve.\n` +
        `# A saját domain élesítésekor: js/config.js → noindex: false, majd node build/generate.mjs\n` +
        `User-agent: *\nDisallow: /\n`
    : `User-agent: *\nAllow: /\n\nSitemap: ${SITE}/sitemap.xml\n`
);

console.log(`\n${SERVICES.length + 7} fájl kész.`);
console.log(`Cím: ${SITE}/${NOINDEX ? "   (noindex — ideiglenes hosting)" : ""}\n`);
