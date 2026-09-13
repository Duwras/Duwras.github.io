/* ==========================================================================
   SEO QA — a generált statikus kimenet ellenőrzése, függőség nélkül.
   Futtatás:  node build/generate.mjs && node build/seo-check.mjs
   Kilépési kód: 1, ha HIBA van (figyelmeztetés nem buktat).

   Mit néz:
   - sitemap ↔ fájlok: minden URL-hez van fájl, és fordítva;
   - oldalanként: pontosan egy <title>, meta description, H1; canonical =
     a sitemap URL-je; robots index; JSON-LD valid JSON;
   - egyediség: title és description nem ismétlődhet;
   - belső linkek és képek: a hivatkozott fájl létezik, az oldalon belüli
     #horgony létezik; nincs index.html-re mutató belső link;
   - képek: alt, width, height attribútum;
   - címsor-hierarchia: nincs szintugrás (pl. H2 → H4);
   - városi oldalak: a fő tartalom hasonlósága (doorway-szűrő) — ha két
     városi oldal szövege túl hasonló, az hiba;
   - 404: noindex; robots.txt: sitemap-hivatkozás.
   ========================================================================== */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const read = (rel) => fs.readFileSync(path.join(ROOT, rel), "utf8");
const exists = (rel) => fs.existsSync(path.join(ROOT, rel));

const errors = [];
const warns = [];
const err = (f, m) => errors.push(`${f}: ${m}`);
const warn = (f, m) => warns.push(`${f}: ${m}`);

const sitemap = read("sitemap.xml");
const SITE = "https://ertekpontpenzugyek.hu";
const locs = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
const locToFile = (loc) => {
  let p = loc.replace(SITE, "").replace(/^\//, "");
  if (p === "" || p.endsWith("/")) p += "index.html";
  return p;
};

const decode = (s) =>
  s.replace(/&amp;/g, "&").replace(/&quot;/g, '"').replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&#39;/g, "'");
const textOf = (html) =>
  decode(
    html
      .replace(/<script[\s\S]*?<\/script>/g, " ")
      .replace(/<style[\s\S]*?<\/style>/g, " ")
      .replace(/<[^>]+>/g, " ")
  )
    .replace(/\s+/g, " ")
    .trim();

const titles = new Map();
const descs = new Map();
const report = [];

for (const loc of locs) {
  const file = locToFile(loc);
  if (!exists(file)) {
    err(file, `a sitemap URL-hez (${loc}) nincs fájl`);
    continue;
  }
  const html = read(file);
  const dir = path.posix.dirname(file);

  const t = [...html.matchAll(/<title>([^<]*)<\/title>/g)];
  if (t.length !== 1) err(file, `${t.length} db <title>`);
  const title = decode(t[0]?.[1] || "");
  const d = html.match(/<meta name="description" content="([^"]*)"/);
  const desc = decode(d?.[1] || "");
  if (!desc) err(file, "nincs meta description");
  const h1 = [...html.matchAll(/<h1[\s>][\s\S]*?<\/h1>/g)];
  if (h1.length !== 1) err(file, `${h1.length} db H1`);
  const canon = html.match(/<link rel="canonical" href="([^"]+)"/)?.[1];
  if (canon !== loc) err(file, `canonical (${canon}) ≠ sitemap (${loc})`);
  const robots = html.match(/<meta name="robots" content="([^"]+)"/)?.[1] || "";
  if (!/^index,follow/.test(robots)) err(file, `robots: ${robots}`);
  if (!/<html lang="hu"/.test(html)) err(file, "hiányzik a lang=hu");

  if (title.length > 70) warn(file, `title ${title.length} karakter: „${title}”`);
  if (title.length < 30) warn(file, `title rövid (${title.length})`);
  if (desc.length > 170 || desc.length < 110) warn(file, `description ${desc.length} karakter`);
  titles.set(title, [...(titles.get(title) || []), file]);
  descs.set(desc, [...(descs.get(desc) || []), file]);

  /* JSON-LD */
  for (const m of html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)) {
    try {
      const j = JSON.parse(m[1]);
      const nodes = j["@graph"] || [j];
      for (const n of nodes) {
        if (!n["@type"]) err(file, "JSON-LD node @type nélkül");
        if (/LocalBusiness|FinancialService/.test(JSON.stringify(n["@type"])))
          err(file, `LocalBusiness-típus fizikai ügyfélhely nélkül: ${n["@type"]}`);
        if (n.aggregateRating || n.review) err(file, "rating/review a schemában — nincs valós forrása");
      }
    } catch (e) {
      err(file, `érvénytelen JSON-LD: ${e.message}`);
    }
  }

  /* Belső linkek és források */
  const ids = new Set([...html.matchAll(/\sid="([^"]+)"/g)].map((m) => m[1]));
  const body = html.replace(/<script[\s\S]*?<\/script>/g, "");
  for (const m of body.matchAll(/\s(href|src)="([^"]+)"/g)) {
    const [, attr, raw] = m;
    if (/^(https?:|mailto:|tel:|data:|#$|\/\/)/.test(raw)) continue;
    if (raw === "#") continue;
    if (raw.startsWith("#")) {
      if (!ids.has(raw.slice(1))) err(file, `nem létező horgony: ${raw}`);
      continue;
    }
    const [p, hash] = raw.split("#");
    const clean = p.split("?")[0];
    if (/(^|\/)index\.html$/.test(clean) && attr === "href") err(file, `index.html-re mutató belső link: ${raw}`);
    let target = clean.startsWith("/") ? clean.slice(1) : path.posix.normalize(path.posix.join(dir, clean));
    if (target === "." || target === "") target = "index.html";
    if (clean.endsWith("/") || clean === "" || /\/?\.\.?$/.test(clean)) target = path.posix.join(target, "index.html");
    if (!exists(target)) err(file, `törött link (${attr}): ${raw} → ${target}`);
    else if (hash && target.endsWith(".html")) {
      const th = read(target);
      if (!new RegExp(`\\sid="${hash}"`).test(th)) err(file, `a céloldalon nincs #${hash}: ${raw}`);
    }
  }

  /* Képek */
  for (const m of body.matchAll(/<img\s[^>]*>/g)) {
    const tag = m[0];
    if (!/\salt="/.test(tag)) err(file, `alt nélküli kép: ${tag.slice(0, 80)}`);
    if (!/\swidth="/.test(tag) || !/\sheight="/.test(tag)) warn(file, `width/height nélküli kép: ${tag.slice(0, 80)}`);
  }

  /* Címsor-szintek */
  let last = 0;
  for (const m of body.matchAll(/<h([1-6])[\s>]/g)) {
    const lvl = Number(m[1]);
    if (last && lvl > last + 1) warn(file, `címsor-ugrás: H${last} → H${lvl}`);
    last = lvl;
  }

  report.push({ file, title: title.length, desc: desc.length, words: textOf(body).split(" ").length });
}

/* Árva fájlok: indexelhető HTML, ami nincs a sitemapben */
const walk = (d) =>
  fs.readdirSync(path.join(ROOT, d), { withFileTypes: true }).flatMap((e) => {
    const rel = d ? `${d}/${e.name}` : e.name;
    if (e.isDirectory()) return /^(\.|_|node_modules|build|docs|assets|css|js)/.test(e.name) ? [] : walk(rel);
    return e.name.endsWith(".html") ? [rel] : [];
  });
const inMap = new Set(locs.map(locToFile));
for (const f of walk("")) if (f !== "404.html" && !inMap.has(f)) err(f, "HTML-fájl, ami nincs a sitemapben");

for (const [t, fs_] of titles) if (fs_.length > 1) err(fs_.join(", "), `ismétlődő title: „${t}”`);
for (const [d, fs_] of descs) if (fs_.length > 1) err(fs_.join(", "), `ismétlődő description`);

/* 404 + robots */
const nf = read("404.html");
if (!/<meta name="robots" content="noindex/.test(nf)) err("404.html", "a 404 nem noindex");
if (/rel="canonical"/.test(nf)) err("404.html", "a 404-nek van canonicalja");
if (!/Sitemap: https:\/\/ertekpontpenzugyek\.hu\/sitemap\.xml/.test(read("robots.txt"))) err("robots.txt", "nincs Sitemap sor");

/* Városi oldalak: doorway-szűrő. A <main> szövegét 5 szavas shingle-ökre
   bontjuk; két oldal Jaccard-hasonlósága a KÖZÖS sablonrész miatt sosem 0,
   de 0,5 fölött már a szöveg nagy része ugyanaz lenne. */
const cityFiles = inMap.size ? [...inMap].filter((f) => /^penzugyi-tanacsadas\/(?!varosok)[^/]+\/index\.html$/.test(f)) : [];
const shingles = (f) => {
  const main = read(f).match(/<main[\s\S]*?<\/main>/)?.[0] || "";
  const words = textOf(main.replace(/<div class="funnel-narrow"[\s\S]*?<\/div>/, "")).toLowerCase().split(" ");
  const set = new Set();
  for (let i = 0; i + 5 <= words.length; i++) set.add(words.slice(i, i + 5).join(" "));
  return set;
};
const sim = [];
const S = Object.fromEntries(cityFiles.map((f) => [f, shingles(f)]));
for (let i = 0; i < cityFiles.length; i++)
  for (let j = i + 1; j < cityFiles.length; j++) {
    const a = S[cityFiles[i]];
    const b = S[cityFiles[j]];
    let inter = 0;
    for (const x of a) if (b.has(x)) inter++;
    const jac = inter / (a.size + b.size - inter);
    sim.push([cityFiles[i].split("/")[1], cityFiles[j].split("/")[1], jac]);
    if (jac > 0.5) err(`${cityFiles[i]} ~ ${cityFiles[j]}`, `túl hasonló tartalom (${(jac * 100).toFixed(0)}%)`);
  }

/* Tiltott/kényes állítások a városi oldalakon */
for (const f of cityFiles) {
  const txt = textOf(read(f).match(/<main[\s\S]*?<\/main>/)?.[0] || "").toLowerCase();
  for (const bad of ["irodánk", "irodámban", "telephely", "szakértőink", "független pénzügyi tanácsadó vagyok", "ügyfelünk", "értékelés"])
    if (txt.includes(bad)) err(f, `kényes állítás: „${bad}”`);
}

/* --- Kimenet ----------------------------------------------------------- */
console.log(`\nSEO QA — ${locs.length} URL a sitemapben\n`);
console.log("fájl".padEnd(58), "title", "desc", "szó");
for (const r of report) console.log(r.file.padEnd(58), String(r.title).padStart(5), String(r.desc).padStart(4), String(r.words).padStart(5));
if (sim.length) {
  const max = sim.reduce((m, s) => (s[2] > m[2] ? s : m));
  const avg = sim.reduce((a, s) => a + s[2], 0) / sim.length;
  console.log(`\nVárosi oldalak hasonlósága (5-szavas shingle, Jaccard): átlag ${(avg * 100).toFixed(1)}%, max ${(max[2] * 100).toFixed(1)}% (${max[0]} ~ ${max[1]})`);
}
if (warns.length) console.log(`\nFIGYELMEZTETÉS (${warns.length}):\n  ` + warns.join("\n  "));
if (errors.length) {
  console.log(`\nHIBA (${errors.length}):\n  ` + errors.join("\n  "));
  process.exit(1);
}
console.log("\nOK — nincs hiba.\n");
