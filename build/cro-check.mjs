/* ==========================================================================
   CRO QA — a konverziós rendszer ellenőrzése, függőség nélkül.
   Futtatás:  node build/generate.mjs && node build/cro-check.mjs
   Kilépési kód: 1, ha HIBA van.

   Mit néz:
   1. Egységtesztek (a böngészős kód Node-ban, csonkolt window/document-tel):
      - telefonszám-validáció (js/lead.js → EP.validate.phone): magyar és
        külföldi formátumok, hibás bemenetek, egységes kimenet;
      - név- és e-mail-validáció;
      - mérés (js/core/track.js): PII-kulcs (név, telefon, e-mail, üzenet)
        SOHA nem kerül a dataLayer-be; a szabványos kulcsok mindig ott vannak.
   2. Generált oldalak (sitemap + 404):
      - minden tel: link a config telefonszámára mutat;
      - minden kereskedelmi oldalon van visszahívás-CTA (a kapcsolat oldal
        űrlapjára mutató valódi linkkel), header-telefon, mobil sáv;
      - záró CTA ott, ahol kell; oldal-kontextus (data-page-type/service/city);
      - a kapcsolat oldalon beágyazott űrlap (#visszahivas, data-qlf-inline);
      - nincs igazolatlan ígéret („24 órán belül”, „ingyenes konzultáció”,
        „kötelezettségmentes”, „percen belül”), ha a config nem engedi.
   ========================================================================== */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const read = (rel) => fs.readFileSync(path.join(ROOT, rel), "utf8");

const errors = [];
let passed = 0;
const ok = (cond, msg) => (cond ? passed++ : errors.push(msg));

/* --- Böngésző-csonk ------------------------------------------------------ */
function sandbox(extra = {}) {
  const listeners = {};
  const win = {
    EP: {},
    dataLayer: [],
    innerWidth: 375,
    console,
  };
  const doc = {
    readyState: "complete",
    documentElement: { dataset: { pageType: "service", service: "elet-biztositas" }, getAttribute: () => "" },
    referrer: "https://www.google.com/search?q=x",
    title: "Teszt oldal",
    querySelectorAll: () => [],
    querySelector: () => null,
    addEventListener: (ev, fn) => ((listeners[ev] = listeners[ev] || []).push(fn)),
    createElement: () => ({}),
    head: { appendChild: () => {} },
  };
  const store = () => {
    const m = new Map();
    return { getItem: (k) => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, String(v)), removeItem: (k) => m.delete(k) };
  };
  return Object.assign(
    {
      window: win,
      document: doc,
      location: { pathname: "/szolgaltatas/elet-biztositas.html", search: "?utm_source=google&utm_medium=cpc&utm_campaign=teszt", host: "ertekpontpenzugyek.hu", hostname: "ertekpontpenzugyek.hu", protocol: "https:", href: "https://ertekpontpenzugyek.hu/" },
      navigator: { onLine: true },
      sessionStorage: store(),
      localStorage: store(),
      URL,
      URLSearchParams,
      CustomEvent: class {},
    },
    extra
  );
}
function run(files, sb) {
  const names = Object.keys(sb);
  for (const f of files) new Function(...names, read(f))(...names.map((n) => sb[n]));
  return sb.window;
}

/* --- 1a. Telefonszám ------------------------------------------------------ */
{
  const w = run(["js/config.js", "js/lead.js"], sandbox());
  const phone = w.EP.validate.phone;
  const good = [
    ["+36 20 123 4567", "+36 20 123 4567"],
    ["+36201234567", "+36 20 123 4567"],
    ["06 30 123 4567", "+36 30 123 4567"],
    ["06-70-123-4567", "+36 70 123 4567"],
    ["0036 31 123 4567", "+36 31 123 4567"],
    ["36 50 123 4567", "+36 50 123 4567"],
    ["20 123 4567", "+36 20 123 4567"],
    ["(+36) 20 123 4567", "+36 20 123 4567"],
    ["06 1 234 5678", "+36 1 234 5678"],
    ["+36 1 234 5678", "+36 1 234 5678"],
    ["06 96 123 456", "+36 96 123 456"],
    ["+43 664 1234567", "+436641234567"],
    ["0043 664 1234567", "+436641234567"],
  ];
  for (const [inp, want] of good) {
    const r = phone(inp);
    ok(r.ok && r.value === want, `telefon: „${inp}” → várt ${want}, kapott ${JSON.stringify(r)}`);
  }
  const bad = ["", "   ", "123", "06 20 123 456", "06 20 123 45678", "+36 20 123", "06 20 abc 4567", "20+36 123 4567", "+1 23", "06 0 123 4567"];
  for (const inp of bad) {
    const r = phone(inp);
    ok(!r.ok && typeof r.message === "string" && r.message.length > 5, `telefon: „${inp}” hibásnak kellene lennie, kapott ${JSON.stringify(r)}`);
  }
  const name = w.EP.validate.name;
  ok(name("Kovács Anna").ok, "név: Kovács Anna elfogadandó");
  ok(name("Ő").ok === false, "név: 1 betű elutasítandó");
  ok(name("12345").ok === false, "név: csak szám elutasítandó");
  ok(name("x".repeat(81)).ok === false, "név: 81 karakter elutasítandó");
  const email = w.EP.validate.email;
  ok(email("").ok, "e-mail: üres elfogadandó (nem kötelező)");
  ok(email("anna@pelda.hu").ok, "e-mail: anna@pelda.hu elfogadandó");
  ok(!email("anna@pelda").ok, "e-mail: anna@pelda elutasítandó");
}

/* --- 1b. Mérés: PII-szűrés és kontextus ------------------------------------ */
{
  const sb = sandbox();
  const w = run(["js/config.js", "js/core/track.js", "js/lead.js"], sb);
  w.EP.track("lead_form_submit", { cta_location: "hero", nev: "Kovács Anna", telefon: "+36201234567", email: "a@b.hu", megjegyzes: "titok", name: "x", phone: "y", message: "z" });
  const ev = w.dataLayer[w.dataLayer.length - 1];
  ok(ev && ev.event === "lead_form_submit", "track: az esemény bekerül a dataLayer-be");
  const leaked = Object.keys(ev || {}).filter((k) => /^(nev|telefon|email|megjegyzes|name|phone|message)$/.test(k));
  ok(leaked.length === 0, `track: PII a dataLayer-ben: ${leaked.join(", ")}`);
  ok(ev && ev.cta_location === "hero" && ev.page_type === "service" && ev.service === "elet-biztositas", "track: cta_location / page_type / service átmegy");
  ok(ev && ev.utm_source === "google" && ev.utm_campaign === "teszt", "track: UTM átmegy");
  ok(ev && ev.referrer_host === "google.com", `track: a hivatkozóból csak a domain marad (kapott: ${ev && ev.referrer_host})`);
  ok(ev && "city" in ev && ev.city === undefined, "track: a szabványos kulcs üresen is jelen van (undefined)");
  const ctx = w.EP.leadContext({ form_type: "quick_modal", cta_location: "hero" });
  ok(/form_type=quick_modal/.test(ctx) && /utm_source=google/.test(ctx) && !/Kovács/.test(ctx), `leadContext: ${ctx}`);
}

/* --- 2. Generált oldalak --------------------------------------------------- */
const win = { EP: {} };
new Function("window", read("js/config.js"))(win);
const CFG = win.EP.CONFIG;
const TEL = `tel:${CFG.contact.phoneHref}`;
const PROMISE = String(CFG.contact.callbackPromise || "").trim();

const sitemap = read("sitemap.xml");
const files = [...sitemap.matchAll(/<loc>https:\/\/[^/]+\/?([^<]*)<\/loc>/g)].map((m) => {
  let p = m[1];
  if (p === "" || p.endsWith("/")) p += "index.html";
  return p;
});
files.push("404.html");

const NEEDS_FINAL = ["home", "service", "city", "pillar", "planning", "city_hub", "about", "article", "blog_hub"];
const BANNED = [
  [/ingyenes konzultáció/i, "„ingyenes konzultáció”"],
  [/kötelezettségmentes/i, "„kötelezettségmentes”"],
  [/percen belül/i, "„… percen belül” időígéret"],
];
if (!PROMISE) BANNED.push([/24 órán belül|24 órán<\/b> belül/i, "„24 órán belül” (config.contact.callbackPromise üres)"]);

const counts = {};
for (const f of files) {
  const html = read(f);
  const body = html.replace(/<script[\s\S]*?<\/script>/g, "");
  const type = html.match(/<html[^>]*data-page-type="([^"]+)"/)?.[1];
  ok(!!type, `${f}: nincs data-page-type`);
  counts[type] = (counts[type] || 0) + 1;

  const tels = [...body.matchAll(/href="(tel:[^"]*)"/g)].map((m) => m[1]);
  ok(tels.length > 0, `${f}: nincs tel: link`);
  for (const t of tels) ok(t === TEL, `${f}: eltérő tel: link (${t})`);

  ok(/class="nav__phone" href="tel:/.test(body), `${f}: nincs telefon a fejlécben`);
  ok(/class="btn nav__cta[^"]*" href="[^"]*kapcsolat\/#visszahivas" data-callback/.test(body), `${f}: nincs visszahívás-CTA a fejlécben`);

  if (type !== "legal" && type !== "404") {
    ok(/<div class="mbar"/.test(body), `${f}: nincs mobil konverziós sáv`);
    ok(/data-hero-cta/.test(body) || type === "blog_hub", `${f}: nincs hero CTA-csoport`);
  }
  if (NEEDS_FINAL.includes(type)) ok(/id="zaro-cta"/.test(body), `${f}: nincs záró CTA`);
  if (type === "service") ok(/data-service="[a-z-]+"/.test(html.slice(0, 300)), `${f}: nincs data-service`);
  if (type === "city") ok(/data-city="[a-z]+"/.test(html.slice(0, 300)), `${f}: nincs data-city`);
  if (type === "service") ok(/id="menet"/.test(body), `${f}: nincs „Mi történik” folyamat-blokk`);
  if (type === "contact") {
    ok(/id="visszahivas"/.test(body) && /data-qlf-inline/.test(body), `${f}: nincs beágyazott visszahívás-űrlap`);
  }
  const text = body.replace(/<[^>]+>/g, " ");
  for (const [re, label] of BANNED) ok(!re.test(text), `${f}: igazolatlan ígéret: ${label}`);
}

/* A JS-csomagban sincs igazolatlan időígéret (siker-képernyő, funnel). */
const app = read("js/app.js");
if (!PROMISE) ok(!/24 órán belül/.test(app), "js/app.js: „24 órán belül” szöveg a csomagban");
for (const ev of ["cta_call_click", "cta_callback_click", "lead_form_view", "lead_form_start", "lead_form_submit", "lead_form_success", "lead_form_error"]) {
  ok(app.includes(`"${ev}"`), `js/app.js: hiányzó mérési esemény: ${ev}`);
}
/* Titok nem kerülhet a kliens-csomagba (a lead-végpont nyilvános webhook,
   nem kulcs — de API-kulcs mintázat nem lehet benne). */
ok(!/AIza[0-9A-Za-z_-]{30,}|sk_live_|-----BEGIN [A-Z ]*PRIVATE KEY/.test(app + read("js/config.js")), "kliens-csomag: API-kulcs / privát kulcs mintázat");

/* --- Kimenet --------------------------------------------------------------- */
console.log(`\nCRO QA — ${files.length} oldal, ${passed} ellenőrzés rendben`);
console.log("Oldaltípusok:", Object.entries(counts).map(([k, v]) => `${k}: ${v}`).join(", "));
if (errors.length) {
  console.log(`\nHIBA (${errors.length}):\n  ` + errors.join("\n  "));
  process.exit(1);
}
console.log("OK — nincs hiba.\n");
