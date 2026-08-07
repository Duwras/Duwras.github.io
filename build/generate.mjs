/* ==========================================================================
   OLDALGENERÁTOR — statikus HTML-t ír a js/data/services.js tartalomból
   Futtatás:  node build/generate.mjs
   Kimenet:   index.html, szolgaltatas/<slug>.html (13 db), impresszum.html,
              adatkezeles.html, 404.html, sitemap.xml, robots.txt, .nojekyll
   A kimenet tiszta statikus HTML — nem kell futtatókörnyezet a hostingon.
   ========================================================================== */

import fs from "node:fs";
import crypto from "node:crypto";
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

/* Config-érték pont-elválasztott útvonalon (ugyanaz, amit a js/site.js
   `data-cfg` kötése futásidőben csinál). */
const cfg = (p) => p.split(".").reduce((o, k) => (o == null ? undefined : o[k]), CFG);

/* Jogi adatsor: a `data-cfg` kötés futásidőben frissíti, de az érték már a
   generált HTML-ben is benne van. Így az impresszum és az adatkezelési
   tájékoztató JS nélkül, illetve kereső- és archívum-szemmel is teljes —
   a kötelező adatok nem függhetnek egy scripttől. */
const legalRow = (label, path) =>
  `<dt>${label}</dt><dd data-cfg="${path}">${esc(cfg(path) ?? "—")}</dd>`;

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

/* A betűk SAJÁT domainről jönnek (assets/fonts/, lásd css/fonts.css és
   build/subset-fonts.py). Korábban a Google Fonts CDN adta őket: 296 kB két
   idegen origóról, és a betűfájlok csak a CDN-stíluslap megérkezése UTÁN
   indultak — három egymásra épülő kérés a kritikus úton. Most ~58 kB, egy
   origó, és a két legfontosabb vágat előre töltődik. */
const PRELOAD_FONTS = ["assets/fonts/inter-latin.woff2", "assets/fonts/inter-tight-latin.woff2"];

/* --- Tartalombiztonsági házirend (CSP) ---------------------------------
   A GitHub Pages nem enged saját HTTP-fejlécet, ezért <meta>-ban adjuk meg.
   Amit véd: ha valaha idegen szöveg kerülne az oldalra (pl. egy jövőbeli
   beágyazás), a böngésző nem futtat idegen scriptet és nem tölt idegen
   forrást. A beágyazott 3D-betöltőt SHA-256 lenyomattal engedjük — nem
   'unsafe-inline'-nal —, így a házirend valódi védelmet ad.

   FIGYELEM, ha bővíted az oldalt:
   - új külső script/beágyazás (pl. Calendly iframe, Google Analytics) csak
     akkor fut, ha ide is felveszed (script-src / frame-src / connect-src);
   - a lead-küldés a script.google.com-ra megy, ezért az a connect-src-ben van.
     FONTOS: az Apps Script /exec végpont 302-vel átirányít a
     script.googleusercontent.com-ra, és a CSP az átirányítás CÉLJÁT is
     ellenőrzi. Ha az nincs engedve, a fetch elszáll ("Failed to fetch"),
     és a funnel „Nem sikerült elküldeni” hibát mutat — ezért kell
     mindkét origó. `no-cors` mellett a redirect:'manual' nem megoldás,
     azt a fetch szabvány tiltja;
   - a style-src-ben azért kell 'unsafe-inline', mert a generált HTML-ben
     vannak style="..." attribútumok (pl. --reveal-delay).
   A frame-ancestors / HSTS / COOP fejlécet <meta>-ban nem lehet megadni,
   azokhoz saját szerver vagy Cloudflare kellene. */
function cspMeta(inlineHashes = []) {
  const scriptSrc = ["'self'", ...inlineHashes.map((h) => `'${h}'`)].join(" ");
  const policy = [
    "default-src 'self'",
    "base-uri 'self'",
    "object-src 'none'",
    `script-src ${scriptSrc}`,
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data:",
    "font-src 'self'",
    "connect-src 'self' https://script.google.com https://script.googleusercontent.com",
    "form-action 'self'",
    "frame-src 'none'",
    "upgrade-insecure-requests",
  ].join("; ");
  return `<meta http-equiv="Content-Security-Policy" content="${policy}">`;
}

const sha256 = (s) => "sha256-" + crypto.createHash("sha256").update(s, "utf8").digest("base64");

function head({ title, desc, url, depth = 0, schema = "", preloadLcp = "", hero3d = false }) {
  const up = upOf(depth);
  /* Csak a főoldalon van beágyazott script (a 3D-betöltő) — a lenyomata
     pontosan azt a szöveget fedi, amit a scripts() kiír. */
  const inlineHashes = hero3d ? [sha256(loader3dSrc(up))] : [];
  /* A preloadLcp lehet sima útvonal, vagy objektum:
     { href, srcset, sizes, media } — a hero képnél csak asztali gépen kell
     előre tölteni, telefonon a szöveg az LCP, ott a kép csak sávot venne el. */
  const lcp = typeof preloadLcp === "string" ? (preloadLcp ? { href: preloadLcp } : null) : preloadLcp;
  const lcpTag = lcp
    ? `<link rel="preload" as="image" href="${up}${lcp.href}"` +
      (lcp.srcset ? ` imagesrcset="${lcp.srcset.replace(/(^|, )/g, `$1${up}`)}"` : "") +
      (lcp.sizes ? ` imagesizes="${lcp.sizes}"` : "") +
      (lcp.media ? ` media="${lcp.media}"` : "") +
      ` fetchpriority="high">\n`
    : "";
  return `<!doctype html>
<html lang="hu">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
${cspMeta(inlineHashes)}
<title>${esc(title)}</title>
<meta name="description" content="${esc(desc)}">
<link rel="canonical" href="${url}">
<meta name="theme-color" content="#0a0b09">
<meta name="robots" content="${NOINDEX ? "noindex,nofollow" : "index,follow,max-snippet:-1,max-image-preview:large,max-video-preview:-1"}">
<meta name="author" content="${esc(CFG.advisor.name)}">
<meta name="geo.region" content="HU">
<meta name="geo.placename" content="Budapest">

<meta property="og:type" content="website">
<meta property="og:locale" content="hu_HU">
<meta property="og:site_name" content="${esc(BRAND)}">
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(desc)}">
<meta property="og:url" content="${url}">
<meta property="og:image" content="${SITE}/assets/img/arrow-hero.png">
<meta property="og:image:width" content="900">
<meta property="og:image:height" content="900">
<meta property="og:image:alt" content="${esc(BRAND)} — pénzügyi tanácsadás">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${esc(title)}">
<meta name="twitter:description" content="${esc(desc)}">
<meta name="twitter:image" content="${SITE}/assets/img/arrow-hero.png">

<link rel="icon" href="${up}assets/brand/logo-mark.svg" type="image/svg+xml">
<link rel="apple-touch-icon" href="${up}assets/img/arrow-hero.png">

<!-- A betűk saját domainről, magyar karakterkészletre vágva (css/fonts.css).
     Nincs harmadik fél, nincs külön DNS/TLS, és nincs stíluslap-lánc. -->
${PRELOAD_FONTS.map((f) => `<link rel="preload" as="font" type="font/woff2" href="${up}${f}" crossorigin>`).join("\n")}

<!-- EGY stíluslap: a hét forrásfájlból a generátor fűzi össze (css/site.css).
     Hét blokkoló kérés helyett egy. Szerkeszteni továbbra is a css/*.css-t kell. -->
<link rel="stylesheet" href="${up}css/site.css?v=${V}">
${lcpTag}
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

/* Ki készítette az oldalt. A név a config-ból jön (`siteCredit`), hogy ne
   kelljen 17 HTML-t átírni, ha változik. URL nélkül sima szöveg marad.

   A saját domainre mutató cím RELATÍV belső linkké alakul: így nem nyit új
   lapot a saját oldalunkra, és aloldalról is jó helyre visz (a `up` előtag
   miatt), akkor is, ha a domain valaha változna. Idegen domain kap
   target="_blank" rel="noopener"-t. */
function siteCredit(up = "") {
  const name = cfg("siteCredit.name");
  if (!name) return "";
  const url = String(cfg("siteCredit.url") || "").trim();
  if (!url) return `<p class="footer__credit">Az oldalt készítette: <span>${esc(name)}</span></p>`;

  const own = new RegExp(`^https?://(www\\.)?${CFG.domain.replace(/\./g, "\\.")}(${BASE}|)/?`, "i");
  const internal = own.test(url);
  const href = internal
    ? up + (url.replace(own, "").replace(/^\/+/, "") || "index.html")
    : url;
  const attrs = internal ? "" : ' target="_blank" rel="noopener"';
  return `<p class="footer__credit">Az oldalt készítette: <a href="${esc(href)}"${attrs}>${esc(name)}</a></p>`;
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
      <strong>Ki áll a márkanév mögött.</strong> Az „${esc(BRAND)}” ${esc(cfg("business.legalName"))}
      (székhely: ${esc(cfg("business.address"))}, nyilvántartási szám: ${esc(cfg("business.regNumber"))},
      adószám: ${esc(cfg("business.taxNumber"))}) márkaneve — nem cég, és nem az OVB szervezeti egysége.
      A pénzügyi közvetítést az ${esc(cfg("legal.companyName"))} (többes ügynök) nevében és javára
      végzem; ezt az oldalt nem az OVB üzemelteti.
      <br><br>
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
      <span>© <span data-year>2026</span> ${esc(BRAND)} — ${esc(cfg("business.shortName"))} Minden jog fenntartva. <span class="powered">közvetítés az OVB nevében</span></span>
      <span class="row" style="gap:1.25rem">
        <a href="${up}impresszum.html">Impresszum</a>
        <a href="${up}adatkezeles.html">Adatkezelési tájékoztató</a>
      </span>
    </div>
    ${siteCredit(up)}
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

/* Kilenc külön script helyett egy csomag (a generátor fűzi össze, a sorrend
   ugyanaz). `defer`: a letöltés a HTML feldolgozásával párhuzamosan megy, a
   futtatás a DOM felépítése után — így semmi nem blokkolja a megjelenítést.

   A 3D csomag KÜLÖN, és csak akkor töltjük le, ha egyáltalán futni fog:
   a hero3d 860 px alatt, a scene3d 1024 px alatt magától kilép, mozgásra
   érzékeny beállításnál mindkettő. Statikus <script>-tel a telefon így is
   letöltötte és lefordította a 25 kB-ot, hogy aztán az első sorban kilépjen.
   A feltételes betöltés ezt teljesen megspórolja mobilon — ott a statikus
   nyíl-kép látszik, pontosan ugyanúgy, mint eddig. */
/* A 3D-betöltő beágyazott script FORRÁSA. Külön függvény, mert a CSP-hez
   pontosan ennek a szövegnek a SHA-256 lenyomata kell (lásd cspMeta). */
function loader3dSrc(up) {
  return `
(function(){var m=window.matchMedia;if(!m)return;
if(m("(prefers-reduced-motion: reduce)").matches)return;
if(!m("(min-width: 861px)").matches)return;
var go=function(){var s=document.createElement("script");s.src="${up}js/3d.js?v=${V}";document.head.appendChild(s);};
var idle=window.requestIdleCallback||function(f){setTimeout(f,200);};
addEventListener("load",function(){idle(go,{timeout:2000});},{once:true});})();
`;
}

function scripts(depth = 0, hero3d = false) {
  const up = upOf(depth);
  /* A betöltés a `load` esemény UTÁN, üresjáratban indul: a 3D díszítés,
     a statikus nyíl-kép addig is látszik, és van rá kereszttűnés. Így a
     WebGL-indítás (kontextus, GLB-olvasás, első méretlekérdezés) nem a
     kritikus úton fut. Az app.js-nek ekkor már biztosan lefutott — a 3D
     modulok az EP.rt közös hurkára építenek. */
  return `
<script src="${up}js/app.js?v=${V}" defer></script>
${hero3d ? `<script>${loader3dSrc(up)}</script>` : ""}
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
      <span class="svc__icon"><img src="${up}assets/img/icons/${s.slug}.webp" alt="" width="54" height="54" loading="lazy" decoding="async"></span>
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
    q: "Az Érték Pont Pénzügyek egy cég? Kivel kötök szerződést?",
    a:
      `Az „${BRAND}” a márkanevem, nem cég: ${cfg("business.legalName")}ként dolgozom ` +
      `(nyilvántartási szám: ${cfg("business.regNumber")}, adószám: ${cfg("business.taxNumber")}). ` +
      `A pénzügyi közvetítést az ${cfg("legal.companyName")} — az MNB nyilvántartásában többes ügynök — ` +
      `nevében és javára végzem, ezért a szerződésed nem a márkanévvel, hanem a közvetítő társasággal, ` +
      `illetve az adott biztosítóval, bankkal vagy pénztárral jön létre. Minden adat ott van az impresszumban.`,
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

/* A Google a @id-kkal összekötött gráfot érti a legjobban: egy üzletet
   (FinancialService), a mögötte álló embert (Person) és a weboldalt
   (WebSite) — így a márkanév, a tanácsadó neve és a témák egy entitáshoz
   tartoznak, nem három különálló szigethez. */
const ORG_ID = `${SITE}/#szervezet`;
const PERSON_ID = `${SITE}/#tanacsado`;
/* A közvetítő társaság KÜLÖN entitás a gráfban. Így a keresők számára sem
   mosódik össze a márkanév (Érték Pont Pénzügyek), az üzemeltető egyéni
   vállalkozás és az OVB — a `legalName` + `affiliation` mondja meg, melyik
   melyik. */
const PARTNER_ID = `${SITE}/#kozvetito-tarsasag`;

function businessSchema() {
  return {
    "@type": "FinancialService",
    "@id": ORG_ID,
    name: BRAND,
    /* A márkanév mögötti valódi jogalany. */
    legalName: CFG.business.legalName,
    taxID: CFG.business.taxNumber,
    disambiguatingDescription:
      `Az „${BRAND}” ${CFG.business.legalName} márkaneve, nem önálló cég. ` +
      `A pénzügyi közvetítés az ${CFG.legal.companyName} (többes ügynök) nevében és javára történik.`,
    url: SITE + "/",
    image: `${SITE}/assets/img/arrow-hero.png`,
    description:
      "Pénzügyi tanácsadás egy helyen: nyugdíj- és gyerekmegtakarítás, 20% adókedvezmények, " +
      "élet-, egészség- és vagyonbiztosítás, KGFB, Otthon Start és piaci lakáshitel, " +
      "személyi kölcsön, díjmentes bankszámla.",
    telephone: CFG.contact.phone,
    email: CFG.contact.email,
    priceRange: "0 Ft",
    currenciesAccepted: "HUF",
    address: {
      "@type": "PostalAddress",
      addressLocality: "Budapest",
      addressCountry: "HU",
    },
    areaServed: { "@type": "Country", name: "Magyarország" },
    /* A tanácsadás díjmentes és távolról is megy — ezt a keresők a
       serviceArea + availableChannel párosból olvassák ki. */
    availableChannel: {
      "@type": "ServiceChannel",
      serviceUrl: SITE + "/#terkep",
      availableLanguage: { "@type": "Language", name: "Hungarian", alternateName: "hu" },
    },
    knowsAbout: SERVICES.map((s) => s.title),
    hasOfferCatalog: {
      "@type": "OfferCatalog",
      name: "Pénzügyi szolgáltatások",
      itemListElement: SERVICES.map((s) => ({
        "@type": "Offer",
        itemOffered: {
          "@type": "Service",
          name: s.title,
          url: `${SITE}/szolgaltatas/${s.slug}.html`,
        },
      })),
    },
    founder: { "@id": PERSON_ID },
    sameAs: [CFG.contact.facebook, CFG.contact.linkedin].filter(Boolean),
  };
}

/* Az OVB — a társaság, amelynek nevében a közvetítés történik. Nem az oldal
   üzemeltetője, ezért NEM a publisher és nem a parentOrganization. */
function partnerSchema() {
  return {
    "@type": "Organization",
    "@id": PARTNER_ID,
    name: CFG.legal.companyName,
    url: "https://www.ovb.hu/",
    taxID: CFG.legal.taxNumber,
    address: {
      "@type": "PostalAddress",
      streetAddress: "Váci út 140.",
      postalCode: "1138",
      addressLocality: "Budapest",
      addressCountry: "HU",
    },
  };
}

function personSchema() {
  return {
    "@type": "Person",
    "@id": PERSON_ID,
    name: CFG.advisor.name,
    jobTitle: CFG.advisor.role,
    description: CFG.advisor.bio,
    image: `${SITE}/assets/brand/portre.webp`,
    telephone: CFG.contact.phone,
    email: CFG.contact.email,
    worksFor: { "@id": ORG_ID },
    /* A közvetítői jogviszony: az OVB nevében jár el, de nem az OVB
       alkalmazottja — ezt az affiliation fejezi ki, nem a worksFor. */
    affiliation: { "@id": PARTNER_ID },
    areaServed: { "@type": "Country", name: "Magyarország" },
    knowsLanguage: "hu",
    sameAs: [CFG.contact.facebook, CFG.contact.linkedin].filter(Boolean),
  };
}

function homePage() {
  const schema = `<script type="application/ld+json">${JSON.stringify({
    "@context": "https://schema.org",
    "@graph": [
      businessSchema(),
      personSchema(),
      partnerSchema(),
      {
        "@type": "WebSite",
        "@id": `${SITE}/#weboldal`,
        url: SITE + "/",
        name: BRAND,
        inLanguage: "hu-HU",
        publisher: { "@id": ORG_ID },
      },
      {
        "@type": "FAQPage",
        mainEntity: HOME_FAQ.map((f) => ({
          "@type": "Question",
          name: f.q,
          acceptedAnswer: { "@type": "Answer", text: f.a },
        })),
      },
    ],
  })}</script>`;

  const marqueeItems = SERVICES.map(
    (s) => `<span class="marquee__item"><span class="dot"></span>${esc(s.navTitle)}</span>`
  ).join("\n        ");

  /* A cím elején a KERESETT kifejezés áll, nem a márkanév: „pénzügyi
     tanácsadó” + a három legnagyobb keresési téma. A márka a végére kerül,
     mert arra amúgy is rangsorolunk. Hossza ~60 karakter, hogy a találati
     listában ne vágja el a Google. */
  return `${head({
    title: "Pénzügyi tanácsadó — nyugdíj, lakáshitel, biztosítás | Érték Pont",
    desc:
      "Díjmentes pénzügyi tanácsadás az egész országban, online is. Nyugdíj-megtakarítás 280 000 Ft " +
      "adójóváírásig, Otthon Start és piaci lakáshitel, KGFB, élet- és egészségbiztosítás, " +
      "gyerek-megtakarítás, díjmentes bankszámla. Töltsd ki a Pénzügyi Térképet — 1 perc.",
    url: SITE + "/",
    depth: 0,
    schema,
    /* A hero képet CSAK asztali gépen töltjük előre: ott a nyíl a legnagyobb
       festett elem. Telefonon a szöveg az LCP, és a kép (dekoráció) csak
       elvenné a sávot a betűk elől — ott a srcset amúgy is a 360-as vágatot
       kéri, nem a 900-ast. */
    preloadLcp: {
      href: "assets/img/arrow-hero.webp",
      media: "(min-width: 1024px)",
    },
    hero3d: true, // a CSP-hez kell: ezen az oldalon van beágyazott script
  })}
${nav(0)}

<main id="main">

  <!-- ============ HERO ============ -->
  <section class="hero">
    <div class="wrap hero__inner">
      <div>
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
        <!-- A kép 900px-es, mert telefonon is retina sűrűséggel (2,5-3x) jelenik
             meg 375 CSS px-en. 15,7 kB — kisebb vágat q80-nal NAGYOBB lett, itt
             nincs mit nyerni. A fetchpriority szándékosan nincs rajta: mobilon
             a szöveg az LCP, és a magas prioritás a betűk elől vitte a sávot. -->
        <img class="hero__fallback" src="assets/img/arrow-hero.webp" alt="" width="900" height="900" loading="eager" decoding="async">
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

  <!-- ============ SZÁMOK (világos sáv) ============ -->
  <section class="section-sm on-paper">
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

  <!-- ============ FOLYAMAT (világos sáv) ============ -->
  <section class="section on-paper" id="folyamat">
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
        <img data-cfg-src="advisor.photo" src="assets/brand/portre.webp" width="1400" height="781"
             alt="${esc(CFG.advisor.name)} ${esc(CFG.advisor.role)}" loading="lazy" decoding="async"
             onerror="this.closest('[data-photo-wrap]').classList.add('no-photo')">
      </div>
      <div data-reveal="right">
        <span class="label">04 — Rólam</span>
        <h2 class="h2" style="margin-top:.75rem"><span data-cfg="advisor.name">Érték Pont Pénzügyek</span></h2>
        <p class="soft" style="margin-top:.5rem"><span data-cfg="advisor.role">pénzügyi tanácsadó</span> · <span data-cfg="contact.area">Budapest és online</span></p>
        <!-- Egy mondatban, már a bemutatkozásnál: a márkanév az enyém, a
             közvetítés az OVB nevében megy. A részletes bontás az impresszumban. -->
        <p class="tiny mute" style="margin-top:.6rem">
          Az <strong>${esc(BRAND)}</strong> a saját márkanevem: ${esc(cfg("business.legalName"))}ként
          dolgozom, a közvetítést az ${esc(cfg("legal.companyName"))} nevében és javára végzem.
          <a href="impresszum.html" style="color:var(--lime)">Cégadatok az impresszumban</a>
        </p>
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

  <!-- ============ ORSZÁGOS LEFEDETTSÉG + A LEGKERESETTEBB TÉMÁK ============
       Ez a blokk két dolgot csinál: elmondja, hogy a tanácsadás országos és
       online is megy (a keresők ebből értik meg a szolgáltatási területet),
       és beszédes linkszöveggel mutat a legtöbbet keresett aloldalakra. -->
  <section class="section-sm" id="orszagos">
    <div class="wrap">
      <div class="sec-head">
        <div>
          <span class="label">05 — Hol érsz el</span>
          <h2 class="h2 sec-head__title" data-reveal>Pénzügyi tanácsadás online, az egész országban</h2>
        </div>
        <p class="lead" data-reveal>
          Budapesten személyesen, az ország bármely pontjáról videóhíváson és e-mailben.
          Az összehasonlítás, a számolás és az ajánlatkérés végig online megy — aláírásra
          jellemzően egyetlen alkalommal van szükség.
        </p>
      </div>

      <h3 class="h4" style="margin-bottom:1rem">A legtöbbet keresett témák 2026-ban</h3>
      <ul class="seo-links">
        ${[
          ["tamogatott-hitelek", "Otthon Start lakáshitel", "fix 3% kamat, max. 50 millió Ft, 25 év"],
          ["piaci-hitelek", "Lakáshitel és hitelkiváltás", "THM-összehasonlítás több banktól"],
          ["nyugdij-megtakaritas", "Nyugdíj-megtakarítás", "évi 280 000 Ft adójóváírásig"],
          ["gyerek-megtakaritas", "Gyerek-megtakarítás", "havi 20 e Ft-ból 18 év alatt ~7,9 M Ft"],
          ["kgfb-casco", "KGFB és casco", "évfordulós váltás, teljes piaci ár-összevetés"],
          ["szemelyi-kolcson", "Személyi kölcsön", "THM-összehasonlítás, hitelkiváltás"],
          ["dijmentes-bankszamla", "Díjmentes bankszámla", "0 Ft számlavezetés, rejtett díjak nélkül"],
          ["adokedvezmeny-gyerek-no", "20% adókedvezmény pénztári befizetésre", "évi 150 000 Ft-ig"],
        ]
          .map(
            ([slug, label, note]) => `<li>
          <a href="szolgaltatas/${slug}.html">
            <span class="seo-links__t">${esc(label)}</span>
            <span class="seo-links__n">${esc(note)}</span>
          </a>
        </li>`
          )
          .join("\n        ")}
      </ul>
      <p class="tiny mute" style="margin-top:1.25rem;max-width:80ch">
        Mind a 13 terület megtalálható a <a href="#szolgaltatasok" style="color:var(--lime-text)">szolgáltatások
        között</a>; ha nem tudod, melyik a tiéd, a <a href="#terkep" style="color:var(--lime-text)">Pénzügyi
        Térkép</a> egy perc alatt kiválasztja.
      </p>
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

  <!-- ============ GYIK (világos sáv) ============ -->
  <section class="section on-paper" id="gyik">
    <div class="wrap split">
      <div>
        <span class="label">06 — Gyakori kérdések</span>
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
        <img class="cta-band__glyph" src="assets/img/arrow-hero.webp" alt="" aria-hidden="true">
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
    "@graph": [
      {
        "@type": "Service",
        "@id": `${url}#szolgaltatas`,
        name: s.title,
        serviceType: CATEGORIES[s.cat].label,
        description: s.seo.desc,
        url,
        image: `${SITE}/assets/img/icons/${s.slug}.png`,
        /* Az ajánlat 0 Ft: a jutalékot a szolgáltató fizeti. Ezt ki is
           mondjuk a gráfban, mert a találatban megjelenhet mellette. */
        offers: {
          "@type": "Offer",
          price: "0",
          priceCurrency: "HUF",
          description: "A tanácsadás és az ajánlatkérés díjmentes.",
        },
        provider: { "@id": ORG_ID },
        areaServed: { "@type": "Country", name: "Magyarország" },
        availableChannel: {
          "@type": "ServiceChannel",
          serviceUrl: url + "#funnel",
          availableLanguage: { "@type": "Language", name: "Hungarian", alternateName: "hu" },
        },
      },
      businessSchema(),
      personSchema(),
      {
        "@type": "FAQPage",
        "@id": `${url}#gyik`,
        mainEntity: s.faq.map((f) => ({
          "@type": "Question",
          name: f.q,
          acceptedAnswer: { "@type": "Answer", text: f.a },
        })),
      },
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "Főoldal", item: SITE + "/" },
          { "@type": "ListItem", position: 2, name: CATEGORIES[s.cat].label, item: SITE + "/#szolgaltatasok" },
          { "@type": "ListItem", position: 3, name: s.title, item: url },
        ],
      },
    ],
  })}</script>`;

  const related = SERVICES.filter((x) => x.slug !== s.slug)
    .sort((a, b) => (a.cat === s.cat ? -1 : 1) - (b.cat === s.cat ? -1 : 1))
    .slice(0, 3);

  return `${head({
    title: s.seo.title,
    desc: s.seo.desc,
    url,
    depth: 1,
    schema,
    preloadLcp: `assets/img/icons/${s.slug}.webp`,
  })}
${nav(1)}

<main id="main">

  <section class="svc-hero">
    <div class="wrap svc-hero__grid">
      <div>
        <nav class="crumb" aria-label="Morzsamenü">
          <a href="../index.html">Főoldal</a> <span>/</span>
          <a href="../index.html#szolgaltatasok">${esc(CATEGORIES[s.cat].label)}</a> <span>/</span>
          <span class="lime">${esc(s.navTitle)}</span>
        </nav>
        <div class="row" style="gap:1rem;align-items:center">
          <span class="icon-lg" data-reveal="scale"><img src="../assets/img/icons/${s.slug}.webp" alt="${esc(s.navTitle)} — ikon" width="88" height="88" loading="eager" fetchpriority="high" decoding="async"></span>
          <span class="svc__badge">${esc(s.badge)}</span>
        </div>
        <!-- A H1 a keresett kifejezés (services.js → h1), ha van ilyen;
             a rövid title marad a kártyán, a menüben és a morzsamenüben. -->
        <h1 class="h1" style="margin-top:1.25rem" data-lines>${esc(s.h1 || s.title)}</h1>
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

  <section class="section-sm on-paper">
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

  <section class="section-sm on-paper">
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
            <span class="svc__icon"><img src="../assets/img/icons/${r.slug}.webp" alt="" width="54" height="54" loading="lazy" decoding="async"></span>
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
        <img class="cta-band__glyph" src="../assets/img/arrow-hero.webp" alt="" aria-hidden="true">
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
    desc:
      "Az Érték Pont Pénzügyek Tímár Richárd e.v. márkaneve. Üzemeltetői adatok, " +
      "a közvetítő társaság (OVB) cégadatai, MNB nyilvántartási szám, elérhetőségek.",
    url,
    depth: 0,
  })}
${nav(0)}
<main id="main" class="doc section">
  <div class="wrap wrap-narrow">
    <span class="label">Jogi információk</span>
    <h1 class="h1" style="margin-top:.75rem">Impresszum</h1>

    <p class="lead" style="margin-top:1.25rem">
      Röviden: az <strong>„Érték Pont Pénzügyek” egy márkanév</strong> — ez alatt hirdetek.
      Mögötte <strong>${esc(cfg("business.legalName"))}</strong> áll, aki a pénzügyi közvetítést
      az <strong>${esc(cfg("legal.companyName"))}</strong> nevében és javára végzi.
      Alább mindhárom szint adatai külön szerepelnek.
    </p>

    <h2 class="h3">1. A márkanév</h2>
    <dl>
      <dt>Márkanév</dt><dd>${esc(BRAND)}</dd>
      <dt>Jogi státusz</dt>
      <dd>Fantázianév (megjelölés), amelyet ${esc(cfg("business.shortName"))} használ a
      tevékenysége hirdetésére. Nem cég, nem önálló jogi személy, nem az OVB szervezeti
      egysége és nem az OVB márkaneve — cégjegyzékszáma ezért nincs.</dd>
      <dt>Weboldal</dt><dd>${esc(SITE)}/ — üzemeltetője a 2. pontban megnevezett egyéni vállalkozó</dd>
    </dl>

    <h2 class="h3">2. Az oldal üzemeltetője — az egyéni vállalkozás</h2>
    <p>
      A weboldalt üzemeltetem, a megkereséseidet fogadom, és a tanácsadást személyesen én végzem.
      Egyéni vállalkozóként a NAV egyéni vállalkozók nyilvántartásában (EVNY) szerepelek.
    </p>
    <dl>
      ${legalRow("Név", "business.legalName")}
      ${legalRow("Székhely", "business.address")}
      ${legalRow("Nyilvántartási szám", "business.regNumber")}
      ${legalRow("Adószám", "business.taxNumber")}
      ${legalRow("Főtevékenység", "business.mainActivity")}
      ${legalRow("További tevékenységek", "business.otherActivities")}
      ${legalRow("A tevékenység kezdete", "business.since")}
      ${legalRow("Telefon", "contact.phone")}
      ${legalRow("E-mail", "contact.email")}
      ${legalRow("Működési terület", "contact.area")}
    </dl>
    <p class="tiny mute">
      Az adatok a közhiteles egyéni vállalkozói nyilvántartásban ellenőrizhetők:
      <a href="${esc(cfg("business.registerUrl"))}" target="_blank" rel="noopener" style="color:var(--lime)">nyilvantarto.hu</a>.
    </p>

    <h2 class="h3">3. A közvetítő társaság</h2>
    <p>
      A pénzügyi és biztosítási közvetítést nem önállóan, hanem az alábbi társasággal fennálló
      szerződéses jogviszony alapján, <strong>a társaság nevében és javára</strong> végzem.
      A társaság az MNB nyilvántartásában <strong>többes ügynök</strong>, ezért a szerződés
      nem velem, hanem a társasággal, illetve az érintett biztosítóval, bankkal vagy
      pénztárral jön létre.
    </p>
    <dl>
      ${legalRow("Cégnév", "legal.companyName")}
      ${legalRow("Székhely", "legal.address")}
      ${legalRow("Cégjegyzékszám", "legal.regNumber")}
      ${legalRow("Adószám", "legal.taxNumber")}
      ${legalRow("Iroda", "legal.office")}
      <dt>Minősítés</dt><dd>többes ügynök (nem alkusz) — több biztosító termékeit közvetíti</dd>
      <dt>Kapcsolatom a társasággal</dt>
      <dd>szerződéses jogviszonyban álló közvetítő; nem vagyok a társaság munkavállalója,
      a társaság pedig nem üzemelteti ezt a weboldalt és nem felel a márkanév alatt közzétett
      tartalomért</dd>
    </dl>

    <h2 class="h3">4. Nyilvántartás, felügyelet</h2>
    <p>
      Az alábbi nyilvántartási számok a 3. pontban megnevezett <strong>közvetítő társaságé</strong>
      — nem a márkanévé és nem az egyéni vállalkozásé.
    </p>
    <dl>
      ${legalRow("A társaság biztosításközvetítői nyilvántartási száma", "legal.mnbNumber")}
      ${legalRow("A társaság hitelközvetítői nyilvántartási száma", "legal.mnbCreditNumber")}
      <dt>Felügyeleti szerv</dt><dd>Magyar Nemzeti Bank — Pénzügyi Fogyasztóvédelmi Központ (1013 Budapest, Krisztina krt. 55.)</dd>
    </dl>
    <p>
      A társaság és a nevében eljáró természetes személy közvetítők nyilvántartásba vétele
      egyaránt ellenőrizhető az MNB közhiteles nyilvántartásában — a kereső névre is ad találatot:
      <a href="https://intezmenykereso.mnb.hu/" target="_blank" rel="noopener" style="color:var(--lime)">intezmenykereso.mnb.hu</a>,
      illetve <a href="https://apps.mnb.hu/regiszter/" target="_blank" rel="noopener" style="color:var(--lime)">apps.mnb.hu/regiszter</a>.
    </p>

    <h2 class="h3">Ki mivel áll szemben — egy bekezdésben</h2>
    <ul>
      <li><strong>Az oldal és a márkanév</strong> ${esc(cfg("business.shortName"))} tulajdona.</li>
      <li><strong>A közvetítés</strong> az ${esc(cfg("legal.companyName"))} nevében és javára történik.</li>
      <li><strong>A szerződésed</strong> a biztosítóval, bankkal vagy pénztárral (illetve a
      közvetítő társasággal) jön létre — sosem a márkanévvel.</li>
      <li><strong>A díjakat, kamatokat és feltételeket</strong> ezek az intézmények határozzák meg.</li>
      <li><strong>Neked a tanácsadás díjmentes</strong>: a jutalékot a szolgáltatók fizetik a
      megkötött szerződések után.</li>
    </ul>

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
      előadhatsz a 2. pontban megadott elérhetőségeimen, illetve közvetlenül a közvetítő társaság
      panaszkezelési csatornáin:
      <a href="https://www.ovb.hu/szerviz/panaszkezeles.html" target="_blank" rel="noopener" style="color:var(--lime)">ovb.hu/szerviz/panaszkezeles</a>.
      A panaszt a jogszabályban meghatározott határidőn belül
      kivizsgáljuk és írásban válaszolunk. Ha a válasszal nem vagy elégedett, a Magyar Nemzeti
      Bank Pénzügyi Fogyasztóvédelmi Központjához, illetve a Pénzügyi Békéltető Testülethez
      (1013 Budapest, Krisztina krt. 55.) fordulhatsz.
    </p>

    <h2 class="h3">Szerzői jog</h2>
    <p>
      Az oldalon található szövegek, ábrák és arculati elemek — az „${esc(BRAND)}” megjelöléssel
      együtt — szerzői jogi védelem alatt állnak, és ${esc(cfg("business.shortName"))} tulajdonát
      képezik. Felhasználásuk csak előzetes írásos engedélyével lehetséges.
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
    <p>
      Az „${esc(BRAND)}” márkanév alatt működő weboldal adatkezelője az alábbi
      <strong>egyéni vállalkozó</strong> — nem a márkanév, és nem az alább említett
      közvetítő társaság (részletek az <a href="impresszum.html" style="color:var(--lime)">impresszumban</a>).
    </p>
    <dl>
      ${legalRow("Adatkezelő", "business.legalName")}
      ${legalRow("Székhely", "business.address")}
      ${legalRow("Nyilvántartási szám", "business.regNumber")}
      ${legalRow("Adószám", "business.taxNumber")}
      ${legalRow("Minőség", "legal.role")}
      ${legalRow("E-mail", "contact.email")}
      ${legalRow("Telefon", "contact.phone")}
    </dl>
    <p>
      A weboldalon beküldött megkeresések adatait a fenti adatkezelő kezeli, a kapcsolatfelvétel
      céljából. Ha a megkeresésből konkrét szerződéskötési folyamat indul, az abban részt vevő
      közvetítő társaság (<span data-cfg="legal.companyName">${esc(cfg("legal.companyName"))}</span>),
      illetve az érintett biztosító, bank vagy pénztár a saját adatkezelési tájékoztatója szerint,
      <strong>önálló adatkezelőként</strong> jár el — erről a folyamat elején külön tájékoztatást kapsz.
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
      <li><strong>Tárhelyszolgáltató — GitHub, Inc. (GitHub Pages):</strong> az oldal kiszolgálója,
      technikai jelleggel hozzáférhet a kiszolgálói naplókhoz (pl. IP-cím, lekért oldal).</li>
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
      Az oldal <strong>nem tölt be tartalmat harmadik fél kiszolgálójáról</strong>: a betűtípusok
      és a 3D megjelenítés kódja is erről a domainről érkezik, így böngészés közben az IP-címed
      nem jut el idegen szolgáltatóhoz. Egyetlen kimenő kérés van, és az is csak akkor, ha te
      küldesz be űrlapot: ilyenkor az adatok a Google Apps Script végpontjára mennek (lásd az
      5. pontot).
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
      Az adatkezelő adatai az impresszummal egyeznek — a dokumentum végleges jóváhagyását
      érdemes jogi szakértővel is megerősíteni.
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

/* --- CSS és JS csomagolás ---------------------------------------------
   A források maradnak külön fájlban (azokat szerkesztjük), a böngésző
   viszont egy CSS-t és egy-két JS-t kap. Mindkettőből kiesnek a kommentek
   és a behúzás — a forrásokban minden magyarázat megmarad, csak a letöltött
   csomagba nem kerül bele (a JS-forrás fele magyar nyelvű komment volt).
   Nevet, szerkezetet, sorvégeket NEM bántunk: nincs változó-átnevezés és
   nincs sorösszevonás, így minifier-hiba sem tud bekerülni, és a hibaüzenetek
   sorszáma is értelmezhető marad. */
const CSS_FILES = [
  "css/fonts.css",
  "css/tokens.css",
  "css/base.css",
  "css/components.css",
  "css/hero.css",
  "css/funnel.css",
  "css/motion.css",
];
const JS_FILES = [
  "js/config.js",
  "js/data/services.js",
  "js/data/quiz.js",
  "js/core/rt.js",
  "js/core/ui.js",
  "js/core/motion.js",
  "js/lead.js",
  "js/funnel.js",
  "js/site.js",
];
const JS_3D_FILES = ["js/gl/mini3d.js", "js/hero3d.js", "js/scene3d.js"];

const read = (rel) => fs.readFileSync(path.join(ROOT, rel), "utf8");

function minifyCss(src) {
  return src
    .replace(/\/\*[\s\S]*?\*\//g, "")   // kommentek
    .replace(/\s*\n\s*/g, "\n")          // sorvégi/sorelejei szóközök
    .replace(/\n{2,}/g, "\n")
    .replace(/\s*([{};:,>])\s*/g, "$1")  // elválasztók körüli szóköz
    .replace(/;}/g, "}")
    .trim();
}

/* JS-tömörítés kézzel, függőség nélkül (nincs npm a projektben).
   Amit csinál: kommentek ki, sor eleji behúzás ki, üres sorok ki.
   Amit NEM csinál: nem nevez át, nem von össze sorokat, nem nyúl a
   pontosvesszőkhöz — így ASI-hiba nem keletkezhet. A sztringeket, template
   literálokat és regex literálokat karakterre pontosan átmásolja. */
function minifyJs(src) {
  let out = "";
  let i = 0;
  const n = src.length;

  /* Az utolsó ÉRDEMI karakter dönti el, hogy a `/` osztás vagy regex kezdete. */
  const lastToken = () => {
    let j = out.length - 1;
    while (j >= 0 && /\s/.test(out[j])) j--;
    return j >= 0 ? out[j] : "";
  };
  const regexAllowed = () => {
    const c = lastToken();
    if (c === "") return true;
    if (/[)\]]/.test(c)) return false;
    if (/[A-Za-z0-9_$]/.test(c)) {
      /* `return /re/` és `typeof /re/` — kulcsszó után mégis regex jön. */
      const m = out.match(/([A-Za-z0-9_$]+)\s*$/);
      return m ? ["return", "typeof", "case", "in", "of", "new", "delete", "void", "instanceof", "do", "else", "yield", "await"].includes(m[1]) : true;
    }
    return true;
  };

  while (i < n) {
    const c = src[i];
    const c2 = src[i + 1];

    if (c === "/" && c2 === "/") {
      while (i < n && src[i] !== "\n") i++;
      continue;
    }
    if (c === "/" && c2 === "*") {
      i += 2;
      while (i < n && !(src[i] === "*" && src[i + 1] === "/")) i++;
      i += 2;
      out += " "; // nehogy két tokent összeragasszunk
      continue;
    }
    if (c === '"' || c === "'") {
      const q = c;
      out += c;
      i++;
      while (i < n) {
        out += src[i];
        if (src[i] === "\\") { out += src[i + 1] ?? ""; i += 2; continue; }
        if (src[i] === q) { i++; break; }
        i++;
      }
      continue;
    }
    if (c === "`") {
      /* Template literál: a szöveges részt KARAKTERRE PONTOSAN visszük át
         (a benne lévő sortörés és behúzás a kimenet része lehet), a `${…}`
         belsejét viszont sima kódként tömörítjük. */
      out += "`";
      i++;
      while (i < n) {
        if (src[i] === "\\") { out += src[i] + (src[i + 1] ?? ""); i += 2; continue; }
        if (src[i] === "`") { out += "`"; i++; break; }
        if (src[i] === "$" && src[i + 1] === "{") {
          out += "${";
          i += 2;
          const start = i;
          let depth = 1;
          while (i < n && depth > 0) {
            const d = src[i];
            if (d === "{") depth++;
            else if (d === "}") { depth--; if (!depth) break; }
            else if (d === "`") {
              i++;
              let tdepth = 0;
              while (i < n) {
                if (src[i] === "\\") { i += 2; continue; }
                if (src[i] === "$" && src[i + 1] === "{") { tdepth++; i += 2; continue; }
                if (src[i] === "}" && tdepth) { tdepth--; i++; continue; }
                if (src[i] === "`" && !tdepth) break;
                i++;
              }
            } else if (d === '"' || d === "'") {
              const q2 = d;
              i++;
              while (i < n && src[i] !== q2) { if (src[i] === "\\") i++; i++; }
            }
            i++;
          }
          out += minifyJs(src.slice(start, i)) + "}";
          i++;
          continue;
        }
        out += src[i];
        i++;
      }
      continue;
    }
    if (c === "/" && regexAllowed()) {
      /* regex literál */
      let j = i + 1;
      let inClass = false;
      let ok = false;
      while (j < n) {
        const d = src[j];
        if (d === "\\") { j += 2; continue; }
        if (d === "\n") break;
        if (d === "[") inClass = true;
        else if (d === "]") inClass = false;
        else if (d === "/" && !inClass) { ok = true; break; }
        j++;
      }
      if (ok) {
        j++;
        while (j < n && /[gimsuyd]/.test(src[j])) j++;
        out += src.slice(i, j);
        i = j;
        continue;
      }
    }
    if (c === "\n") {
      out += "\n";
      i++;
      while (i < n && (src[i] === " " || src[i] === "\t")) i++;
      continue;
    }
    out += c;
    i++;
  }

  return out
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{2,}/g, "\n")
    .trim();
}

const banner = (name) =>
  `/* ${name} — GENERÁLT FÁJL, ne szerkeszd. Forrás: a build/generate.mjs\n` +
  `   fűzi össze a css/*.css és js/**.js fájlokat. Újragenerálás:\n` +
  `   node build/generate.mjs */\n`;

console.log("\nÉrték Pont Pénzügyek — oldalgenerálás\n");

write("css/site.css", banner("css/site.css") + CSS_FILES.map((f) => minifyCss(read(f))).join("\n"));
write("js/app.js", banner("js/app.js") + JS_FILES.map((f) => minifyJs(read(f))).join("\n;\n"));
write("js/3d.js", banner("js/3d.js") + JS_3D_FILES.map((f) => minifyJs(read(f))).join("\n;\n"));

write("index.html", homePage());
SERVICES.forEach((s) => write(`szolgaltatas/${s.slug}.html`, servicePage(s)));
write("impresszum.html", imprintPage());
write("adatkezeles.html", privacyPage());
write("404.html", notFoundPage());

/* A GitHub Pages alapból Jekyll-en futtatja a repót, ami kihagyja az
   aláhúzással kezdődő fájlokat/mappákat. Ez a fájl kikapcsolja. */
write(".nojekyll", "");

/* sitemap + robots
   A prioritás nem rangsorol, de a bejáráshoz jelzés: elöl a legnagyobb
   keresési volumenű témák (támogatott és piaci hitel, nyugdíj, KGFB,
   gyerek-megtakarítás, személyi kölcsön, bankszámla), utánuk a többi. */
const TOP_SLUGS = [
  "tamogatott-hitelek",
  "piaci-hitelek",
  "nyugdij-megtakaritas",
  "kgfb-casco",
  "gyerek-megtakaritas",
  "szemelyi-kolcson",
  "dijmentes-bankszamla",
];
const TODAY = new Date().toISOString().slice(0, 10);

const urls = [
  { loc: SITE + "/", pri: "1.0", freq: "weekly" },
  ...SERVICES.map((s) => ({
    loc: `${SITE}/szolgaltatas/${s.slug}.html`,
    pri: TOP_SLUGS.includes(s.slug) ? "0.9" : "0.7",
    freq: "monthly",
  })),
  { loc: SITE + "/impresszum.html", pri: "0.3", freq: "yearly" },
  { loc: SITE + "/adatkezeles.html", pri: "0.3", freq: "yearly" },
];
write(
  "sitemap.xml",
  `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls
  .map(
    (u) =>
      `  <url><loc>${u.loc}</loc><lastmod>${TODAY}</lastmod><changefreq>${u.freq}</changefreq><priority>${u.pri}</priority></url>`
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
