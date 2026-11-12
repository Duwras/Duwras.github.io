/* ==========================================================================
   BLOG QA — a content/blog/*.md cikkek ellenőrzése, függőség nélkül.
   Futtatás:  node build/blog-check.mjs        (npm run check:blog)
              node build/blog-check.mjs --source   ← csak a forrást nézi,
                                                     a generált kimenetet nem
   Kilépési kód: 1, ha HIBA van (a figyelmeztetés nem buktat).

   Hibával áll le, ha:
   - hiányzik vagy érvénytelen valamelyik frontmatter mező (title, slug, date,
     description, category, tags, sources, draft, author), vagy ismeretlen
     mező van; a fájlnév nem YYYY-MM-DD-slug.md; duplikált slug/title/description;
   - a description 155 karakternél hosszabb (vagy 70-nél rövidebb);
   - kevesebb mint 2 érvényes forrás (név + http(s) URL) van megadva;
   - a szöveg 500 szónál rövidebb vagy 1200-nál hosszabb;
   - tiltott kifejezés szerepel („garantált hozam”, „biztos nyereség”,
     „kockázatmentes” … — a teljes lista: build/blog.mjs → BLOG.banned);
   - törött belső link, nem létező horgony vagy kép, relatív link, külső kép;
   - H1 vagy H4+ címsor a törzsben, címsor-ugrás, hiányzó bevezető;
   - a generált kimenet nem friss (a cikknek nincs oldala, hiányzik a
     sitemapből vagy az RSS-ből) — ilyenkor: node build/generate.mjs.

   A szabályok egy helyen vannak: build/blog.mjs → loadPosts(). Ugyanezt a
   validálást a generátor is lefuttatja, és hibás cikkel nem épít.
   ========================================================================== */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { loadPosts, BLOG } from "./blog.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const SITE = "https://ertekpontpenzugyek.hu";
const sourceOnly = process.argv.includes("--source");
const read = (rel) => fs.readFileSync(path.join(ROOT, rel), "utf8");
const exists = (rel) => fs.existsSync(path.join(ROOT, rel));

const { posts, all, errors, warnings } = loadPosts(ROOT);

/* --- A generált kimenet friss-e ------------------------------------------ */
if (!sourceOnly && !errors.length) {
  const stale = (m) => errors.push(`${m} — futtasd: node build/generate.mjs`);
  const sitemap = exists("sitemap.xml") ? read("sitemap.xml") : "";
  const feed = exists("blog/feed.xml") ? read("blog/feed.xml") : "";
  if (!exists("blog/index.html")) stale("hiányzik a blog/index.html");
  if (!feed) stale("hiányzik a blog/feed.xml");
  for (const p of posts) {
    const rel = `blog/${p.slug}/index.html`;
    const url = `${SITE}/blog/${p.slug}/`;
    if (!exists(rel)) {
      stale(`${p.file}: nincs generált oldala (${rel})`);
      continue;
    }
    const html = read(rel);
    const esc = (s) => s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
    if (!html.includes(`<h1 class="h1" style="margin-top:.75rem">${esc(p.title)}</h1>`)) stale(`${p.file}: a generált oldal címe eltér a forrástól`);
    if (!html.includes(`<meta name="description" content="${esc(p.description)}">`)) stale(`${p.file}: a generált oldal leírása eltér a forrástól`);
    if (!exists(`blog/${p.slug}/cover.svg`)) stale(`${p.file}: hiányzik a borítókép (blog/${p.slug}/cover.svg)`);
    if (!sitemap.includes(`<loc>${url}</loc>`)) stale(`${p.file}: nincs a sitemap.xml-ben`);
    if (!feed.includes(`<link>${url}</link>`) && posts.indexOf(p) < BLOG.feedItems) stale(`${p.file}: nincs az RSS-feedben`);
  }
  /* Árva kimenet: generált cikkoldal, amihez már nincs publikált forrás. */
  if (exists("blog")) {
    const live = new Set(posts.map((p) => p.slug));
    for (const e of fs.readdirSync(path.join(ROOT, "blog"), { withFileTypes: true })) {
      if (e.isDirectory() && !["oldal", "kategoria", "cimke"].includes(e.name) && !live.has(e.name))
        stale(`blog/${e.name}/: generált oldal publikált cikk nélkül`);
    }
  }
}

/* --- Kimenet ------------------------------------------------------------- */
const drafts = all.filter((p) => p.draft);
console.log(`\nBLOG QA — ${all.length} cikkfájl (${posts.length} publikált, ${drafts.length} piszkozat)\n`);
if (all.length) {
  console.log("fájl".padEnd(64), " szó", "title", "desc", "H2", "forrás", "");
  for (const p of all)
    console.log(
      p.file.replace(`${BLOG.dir}/`, "").padEnd(64),
      String(p.md.words).padStart(4),
      String(p.title.length).padStart(5),
      String(p.description.length).padStart(4),
      String(p.md.sections.length).padStart(2),
      String(p.sources.length).padStart(6),
      p.draft ? " (piszkozat)" : ""
    );
}
if (warnings.length) console.log(`\nFIGYELMEZTETÉS (${warnings.length}):\n  ` + warnings.join("\n  "));
if (errors.length) {
  console.log(`\nHIBA (${errors.length}):\n  ` + errors.join("\n  ") + "\n");
  process.exit(1);
}
console.log("\nOK — nincs hiba.\n");
