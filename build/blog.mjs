/* ==========================================================================
   BLOG — Markdown-cikkek betöltése, ellenőrzése és oldalsablonjai
   --------------------------------------------------------------------------
   Egy cikk = egy fájl:  content/blog/YYYY-MM-DD-slug.md  (frontmatter + Markdown)
   Ebből készül (a build/generate.mjs hívja, külön futtatni nem kell):
     /blog/                      lista, 12 cikk/oldal, lapozás (/blog/oldal/2/)
     /blog/<slug>/               cikkoldal + cover.svg (márkaszínű borító)
     /blog/kategoria/<slug>/     kategóriaoldal
     /blog/cimke/<slug>/         címkeoldal (noindex,follow — vékony tartalom)
     /blog/feed.xml              RSS
     a főoldali „Legfrissebb cikkek” szekció, és a sitemap bejegyzései

   Függőség nincs: a frontmatter- és a Markdown-értelmező saját, szándékosan
   szűk részhalmaz (lásd BLOG_AGENT.md → „Formátum”). Amit nem ismer, azt a
   validátor hibának jelzi, nem találgat.

   Ellenőrzés:  node build/blog-check.mjs   (npm run check:blog)
   A generátor is lefuttatja a validálást, és hibás cikkel NEM épít.
   ========================================================================== */

import fs from "node:fs";
import path from "node:path";

export const BLOG = {
  dir: "content/blog",
  perPage: 12,
  feedItems: 30,
  author: "Tímár Richárd – Érték Pont Pénzügyek",
  /* Zárt kategórialista: a kategóriaoldal indexelhető, ezért nem szaporodhat
     szabadon. Új kategória = új elem itt (leírással). A címke szabad. */
  categories: {
    "Hitel és lakás":
      "Lakáshitel, állami otthonteremtési támogatások, hitelkiváltás és személyi kölcsön: friss hírek és változások érthetően, forintra lefordítva.",
    "Megtakarítás és nyugdíj":
      "Nyugdíj-előtakarékosság, TBSZ, állampapír, lakástakarék és gyerekmegtakarítás: friss hírek, szabályváltozások és gyakorlati tanulságok.",
    "Biztosítás":
      "KGFB, casco, lakás-, élet- és egészségbiztosítás: díjváltozások, kampányok, határidők, és amit a szerződésedben érdemes ellenőrizni.",
    "Adó és támogatások":
      "Adókedvezmények, adó-visszatérítés, egészségpénztár és családtámogatások: mi változik, kinek jár, és mennyit jelent forintban.",
    "Gazdaság és kamatok":
      "MNB-kamatdöntések, infláció, árfolyam és betéti kamatok: mit jelentenek a friss gazdasági adatok a hiteledre és a megtakarításodra.",
  },
  words: { min: 500, max: 1200 },
  title: { min: 15, max: 70 },
  desc: { min: 70, max: 155 },
  tags: { min: 2, max: 6 },
  minSources: 2,
  /* Tiltott kifejezések (kisbetűs részszó-egyezés; a ragozott alakot is
     megfogja: „garantált hozamot”). Az első csoport hozamígéret, a második
     a CRO-ellenőrzés (build/cro-check.mjs) által is tiltott, igazolatlan
     ígéret — itt azért szerepel, hogy a hiba már a cikknél kiderüljön. */
  banned: [
    "garantált hozam",
    "garantált nyereség",
    "garantált megtérülés",
    "garantáltan megtérül",
    "biztos nyereség",
    "biztos hozam",
    "biztos befektetés",
    "kockázatmentes",
    "kockázat nélküli",
    "nulla kockázat",
    "100%-os biztonság",
    "ovb hivatalos közlemény",
    "ingyenes konzultáció",
    "kötelezettségmentes",
    "percen belül",
    "24 órán belül",
  ],
  reservedSlugs: ["oldal", "kategoria", "cimke", "feed", "feed-xml", "index"],
};

const esc = (s) =>
  String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));

/* Ékezet nélküli, kisbetűs, kötőjeles azonosító (ő → o, ű → u). */
export const slugify = (s) =>
  String(s)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

/* A mai nap budapesti idő szerint (az ütemezett feladat UTC-s gépen is futhat). */
export const todayBudapest = () =>
  new Intl.DateTimeFormat("sv-SE", { timeZone: "Europe/Budapest" }).format(new Date());

/* ====================================================================== */
/*  Frontmatter — szűk YAML-részhalmaz                                     */
/*    kulcs: érték | "idézett érték" | true/false | [a, b, c]              */
/*    kulcs:                 ← blokk-lista                                 */
/*      - elem                                                             */
/*      - name: Forrás neve  ← objektum-lista (sources)                    */
/*        url: https://…                                                   */
/* ====================================================================== */

function scalar(raw) {
  const v = raw.trim();
  if (/^".*"$/.test(v)) return v.slice(1, -1).replace(/\\(["\\])/g, "$1");
  if (/^'.*'$/.test(v)) return v.slice(1, -1).replace(/''/g, "'");
  if (/^\[.*\]$/.test(v)) {
    const out = [];
    let cur = "";
    let q = "";
    for (const ch of v.slice(1, -1)) {
      if (q) {
        if (ch === q) q = "";
        else cur += ch;
      } else if (ch === '"' || ch === "'") q = ch;
      else if (ch === ",") {
        out.push(cur.trim());
        cur = "";
      } else cur += ch;
    }
    if (cur.trim()) out.push(cur.trim());
    return out.filter(Boolean);
  }
  if (v === "true") return true;
  if (v === "false") return false;
  return v;
}

export function parseFrontMatter(src) {
  const text = src.replace(/^\uFEFF/, "").replace(/\r\n?/g, "\n");
  const m = text.match(/^---\n([\s\S]*?)\n---[ \t]*(?:\n|$)([\s\S]*)$/);
  if (!m) return { data: null, body: text, error: "hiányzik a frontmatter (a fájl első sora `---` legyen, és `---` zárja)" };
  const data = {};
  let key = null;
  let item = null;
  const lines = m[1].split("\n");
  for (let n = 0; n < lines.length; n++) {
    const line = lines[n];
    if (!line.trim() || /^\s*#/.test(line)) continue;
    let mm;
    if ((mm = line.match(/^([A-Za-z_][\w-]*):(?:\s+(.*))?$/))) {
      key = mm[1];
      item = null;
      const v = (mm[2] || "").trim();
      data[key] = v === "" ? [] : scalar(v);
    } else if (key && Array.isArray(data[key]) && (mm = line.match(/^\s+-\s+(.*)$/))) {
      const v = mm[1].trim();
      const kv = v.match(/^([A-Za-z_][\w-]*):\s+(.*)$/);
      if (kv) {
        item = { [kv[1]]: scalar(kv[2]) };
        data[key].push(item);
      } else {
        item = null;
        data[key].push(scalar(v));
      }
    } else if (item && (mm = line.match(/^\s+([A-Za-z_][\w-]*):\s+(.*)$/))) {
      item[mm[1]] = scalar(mm[2]);
    } else {
      return { data: null, body: m[2], error: `értelmezhetetlen frontmatter-sor (${n + 2}.): „${line.trim()}”` };
    }
  }
  return { data, body: m[2] };
}

/* ====================================================================== */
/*  Markdown — amit a cikkek használhatnak                                 */
/*    ## H2, ### H3, bekezdés, - lista, 1. lista, > idézet, --- vonal,     */
/*    | táblázat |, **félkövér**, *dőlt*, `kód`, [link](url), ![kép](/út)  */
/*  Nyers HTML nincs: minden escape-elve kerül ki.                         */
/* ====================================================================== */

const emph = (s) =>
  s
    .replace(/\*\*([^*\n]+?)\*\*/g, "<strong>$1</strong>")
    .replace(/(^|[^\p{L}\p{N}*])\*([^*\s][^*\n]*?)\*(?![\p{L}\p{N}*])/gu, "$1<em>$2</em>")
    .replace(/(^|[^\p{L}\p{N}_])_([^_\s][^_\n]*?)_(?![\p{L}\p{N}_])/gu, "$1<em>$2</em>");

const URL_RE = "((?:[^()\\s]|\\([^()\\s]*\\))+)";

function inlineMd(src, ctx) {
  const stash = [];
  const keep = (html) => `\u0000${stash.push(html) - 1}\u0000`;
  let s = src.replace(/`([^`\n]+)`/g, (_, c) => keep(`<code>${esc(c)}</code>`));
  s = s.replace(new RegExp(`!\\[([^\\]]*)\\]\\(${URL_RE}\\)`, "g"), (_, alt, url) => {
    ctx.images.push(url);
    return keep(`<img src="${esc(url)}" alt="${esc(alt)}" loading="lazy" decoding="async">`);
  });
  s = s.replace(new RegExp(`\\[([^\\]]+)\\]\\(${URL_RE}\\)`, "g"), (_, text, url) => {
    ctx.links.push({ url, text });
    const ext = /^https?:\/\//i.test(url);
    return keep(`<a href="${esc(url)}"${ext ? ' target="_blank" rel="noopener"' : ""}>${emph(esc(text))}</a>`);
  });
  return emph(esc(s)).replace(/\u0000(\d+)\u0000/g, (_, n) => stash[Number(n)]);
}

const isBlockStart = (line, next = "") =>
  /^#{1,6}\s/.test(line) ||
  /^(-{3,}|\*{3,})\s*$/.test(line) ||
  /^>/.test(line) ||
  /^\s*[-*]\s+\S/.test(line) ||
  /^\s*\d+[.)]\s+\S/.test(line) ||
  (/^\s*\|/.test(line) && /^\s*\|?\s*:?-{2,}/.test(next));

const cells = (row) =>
  row
    .trim()
    .replace(/^\||\|$/g, "")
    .split("|")
    .map((c) => c.trim());

export function renderMarkdown(md) {
  const ctx = { links: [], images: [], headings: [], quotes: [] };
  const lines = md.replace(/\r\n?/g, "\n").split("\n");
  const blocks = [];
  const usedIds = new Set();
  let i = 0;

  const listItems = (re) => {
    const items = [];
    while (i < lines.length) {
      const mm = lines[i].match(re);
      if (mm) items.push(mm[1]);
      else if (items.length && /^\s{2,}\S/.test(lines[i])) items[items.length - 1] += " " + lines[i].trim();
      else break;
      i++;
    }
    return items;
  };

  while (i < lines.length) {
    const line = lines[i];
    if (!line.trim()) {
      i++;
      continue;
    }
    let m;
    if ((m = line.match(/^(#{1,6})\s+(.+?)\s*#*\s*$/))) {
      const level = m[1].length;
      const text = m[2];
      let id = slugify(text) || `szakasz-${ctx.headings.length + 1}`;
      for (let k = 2; usedIds.has(id); k++) id = `${slugify(text)}-${k}`;
      usedIds.add(id);
      ctx.headings.push({ level, text, id });
      blocks.push({ type: "h", level, text, id });
      i++;
    } else if (/^(-{3,}|\*{3,})\s*$/.test(line)) {
      blocks.push({ type: "html", html: "<hr>" });
      i++;
    } else if (/^>/.test(line)) {
      const buf = [];
      while (i < lines.length && /^>/.test(lines[i])) buf.push(lines[i++].replace(/^>\s?/, ""));
      const text = buf.join(" ").trim();
      ctx.quotes.push(text);
      blocks.push({ type: "html", html: `<blockquote><p>${inlineMd(text, ctx)}</p></blockquote>` });
    } else if (/^\s*[-*]\s+\S/.test(line)) {
      const items = listItems(/^\s*[-*]\s+(.+)$/);
      blocks.push({ type: "html", html: `<ul>${items.map((t) => `<li>${inlineMd(t, ctx)}</li>`).join("")}</ul>` });
    } else if (/^\s*\d+[.)]\s+\S/.test(line)) {
      const items = listItems(/^\s*\d+[.)]\s+(.+)$/);
      blocks.push({ type: "html", html: `<ol>${items.map((t) => `<li>${inlineMd(t, ctx)}</li>`).join("")}</ol>` });
    } else if (/^\s*\|/.test(line) && /^\s*\|?\s*:?-{2,}/.test(lines[i + 1] || "")) {
      const head = cells(line);
      i += 2;
      const rows = [];
      while (i < lines.length && /^\s*\|/.test(lines[i])) rows.push(cells(lines[i++]));
      /* Üres bal felső cella = összehasonlító táblázat: az első oszlop a
         sorok fejléce (<th scope="row">), különben a képernyőolvasó nem
         tudja, melyik sorhoz tartozik az érték. */
      const rowHead = head[0] === "";
      blocks.push({
        type: "html",
        html:
          `<div class="table-wrap"><table><thead><tr>${head
            .map((c, k) => (rowHead && k === 0 ? "<td></td>" : `<th scope="col">${inlineMd(c, ctx)}</th>`))
            .join("")}</tr></thead>` +
          `<tbody>${rows
            .map(
              (r) =>
                `<tr>${r
                  .map((c, k) => (rowHead && k === 0 ? `<th scope="row">${inlineMd(c, ctx)}</th>` : `<td>${inlineMd(c, ctx)}</td>`))
                  .join("")}</tr>`
            )
            .join("")}</tbody></table></div>`,
      });
    } else {
      const buf = [line.trim()];
      i++;
      while (i < lines.length && lines[i].trim() && !isBlockStart(lines[i], lines[i + 1] || "")) buf.push(lines[i++].trim());
      blocks.push({ type: "html", html: `<p>${inlineMd(buf.join(" "), ctx)}</p>` });
    }
  }

  /* Szakaszokra bontás: ami az első H2 előtt van, az a bevezető; minden H2
     egy <section>-t nyit (a css/content.css `.content > section` ritmusa). */
  const intro = [];
  const sections = [];
  let cur = null;
  for (const b of blocks) {
    if (b.type === "h" && b.level === 2) {
      cur = { id: b.id, title: b.text, html: [] };
      sections.push(cur);
    } else {
      const html = b.type === "h" ? `<h${b.level} id="${b.id}">${inlineMd(b.text, ctx)}</h${b.level}>` : b.html;
      (cur ? cur.html : intro).push(html);
    }
  }

  const all = intro.join("\n") + sections.map((s) => ` ${s.title} ${s.html.join("\n")}`).join("\n");
  const text = all
    .replace(/<[^>]+>/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/\s+/g, " ")
    .trim();
  const words = text.split(" ").filter((w) => /[\p{L}\p{N}]/u.test(w)).length;

  return {
    intro: intro.join("\n"),
    sections: sections.map((s) => ({ ...s, html: s.html.join("\n") })),
    text,
    words,
    ...ctx,
  };
}

/* ====================================================================== */
/*  Betöltés + validálás                                                   */
/* ====================================================================== */

const ISO_DAY = /^\d{4}-\d{2}-\d{2}$/;
const ISO_FULL = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2})?(Z|[+-]\d{2}:\d{2})$/;
const validDay = (d) => ISO_DAY.test(d) && !Number.isNaN(Date.parse(`${d}T12:00:00Z`)) && new Date(`${d}T12:00:00Z`).toISOString().slice(0, 10) === d;
const isUrl = (u) => {
  try {
    return /^https?:$/.test(new URL(u).protocol);
  } catch {
    return false;
  }
};
const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export function loadPosts(root) {
  const errors = [];
  const warnings = [];
  const dir = path.join(root, BLOG.dir);
  const files = fs.existsSync(dir)
    ? fs.readdirSync(dir).filter((f) => f.endsWith(".md")).sort()
    : [];
  const all = [];
  const today = todayBudapest();

  for (const file of files) {
    const rel = `${BLOG.dir}/${file}`;
    const E = (m) => errors.push(`${rel}: ${m}`);
    const W = (m) => warnings.push(`${rel}: ${m}`);
    const { data, body, error } = parseFrontMatter(fs.readFileSync(path.join(dir, file), "utf8"));
    if (error) {
      E(error);
      continue;
    }
    const str = (k) => (typeof data[k] === "string" ? data[k].trim() : "");

    /* --- kötelező mezők, típusok --- */
    for (const k of ["title", "slug", "date", "description", "category", "author"])
      if (!str(k)) E(`hiányzó vagy üres frontmatter mező: ${k}`);
    for (const k of ["tags", "sources"]) if (!Array.isArray(data[k])) E(`a(z) ${k} mező lista legyen`);
    if (typeof data.draft !== "boolean") E("a draft mező true vagy false legyen (alapból false)");
    const known = ["title", "slug", "date", "updated", "description", "category", "tags", "sources", "draft", "author"];
    for (const k of Object.keys(data)) if (!known.includes(k)) E(`ismeretlen frontmatter mező: ${k}`);

    const title = str("title");
    const slug = str("slug");
    const description = str("description");
    const category = str("category");
    const date = str("date");
    const day = date.slice(0, 10);
    const updated = str("updated");

    if (title && (title.length < BLOG.title.min || title.length > BLOG.title.max))
      E(`a title ${title.length} karakter (megengedett: ${BLOG.title.min}–${BLOG.title.max})`);
    if (title.length > 60 && title.length <= BLOG.title.max) W(`a title ${title.length} karakter — a Google kb. 60-nál vág`);

    if (slug) {
      if (!SLUG_RE.test(slug)) E(`érvénytelen slug: „${slug}” (csak ékezet nélküli kisbetű, szám, kötőjel)`);
      if (slug.length > 80) E(`a slug ${slug.length} karakter (max. 80)`);
      if (BLOG.reservedSlugs.includes(slug)) E(`foglalt slug: ${slug}`);
    }

    if (date) {
      if (!(ISO_DAY.test(date) || ISO_FULL.test(date)) || !validDay(day)) E(`érvénytelen date: „${date}” (ISO: 2026-11-12 vagy 2026-11-12T08:00:00+01:00)`);
      else if (day > today) E(`jövőbeli dátum: ${day} (ma: ${today})`);
    }
    if (updated && (!(ISO_DAY.test(updated) || ISO_FULL.test(updated)) || !validDay(updated.slice(0, 10)) || updated.slice(0, 10) < day))
      E(`érvénytelen updated: „${updated}” (ISO-dátum, nem lehet korábbi a date-nél)`);

    const want = `${day}-${slug}.md`;
    if (date && slug && file !== want) E(`a fájlnév nem egyezik a dátummal és a sluggal (várt: ${want})`);

    if (description) {
      if (description.length > BLOG.desc.max) E(`a description ${description.length} karakter (max. ${BLOG.desc.max})`);
      if (description.length < BLOG.desc.min) E(`a description ${description.length} karakter (min. ${BLOG.desc.min})`);
      else if (description.length < 110) W(`a description ${description.length} karakter — 110–155 között használja ki a helyet`);
    }

    if (category && !(category in BLOG.categories))
      E(`ismeretlen category: „${category}” (választható: ${Object.keys(BLOG.categories).join(" | ")})`);

    if (str("author") && str("author") !== BLOG.author) E(`az author pontosan ez legyen: "${BLOG.author}"`);

    const tags = Array.isArray(data.tags) ? data.tags.map((t) => String(t).trim()).filter(Boolean) : [];
    if (Array.isArray(data.tags)) {
      if (tags.length < BLOG.tags.min || tags.length > BLOG.tags.max) E(`${tags.length} címke (megengedett: ${BLOG.tags.min}–${BLOG.tags.max})`);
      for (const t of tags) {
        if (t.length > 32) E(`túl hosszú címke: „${t}”`);
        if (!slugify(t)) E(`érvénytelen címke: „${t}”`);
      }
      if (new Set(tags.map(slugify)).size !== tags.length) E("ismétlődő címke");
    }

    const sources = [];
    if (Array.isArray(data.sources)) {
      for (const s of data.sources) {
        if (!s || typeof s !== "object" || !String(s.name || "").trim() || !isUrl(String(s.url || "")))
          E(`hibás forrás — minden elemnek kell name és érvényes http(s) url: ${JSON.stringify(s)}`);
        else sources.push({ name: String(s.name).trim(), url: String(s.url).trim() });
      }
      if (sources.length < BLOG.minSources) E(`${sources.length} érvényes forrás (min. ${BLOG.minSources})`);
      else if (new Set(sources.map((s) => new URL(s.url).hostname.replace(/^www\./, ""))).size < 2)
        W("minden forrás ugyanarról a domainről van — legalább két független forrás kell");
      if (new Set(sources.map((s) => s.url)).size !== sources.length) E("ismétlődő forrás-URL");
    }

    /* --- törzs --- */
    const md = renderMarkdown(body);
    if (md.words < BLOG.words.min || md.words > BLOG.words.max)
      E(`a szöveg ${md.words} szó (megengedett: ${BLOG.words.min}–${BLOG.words.max}; cél: 600–900)`);
    for (const h of md.headings) {
      if (h.level === 1) E(`H1 a törzsben („# ${h.text}”) — a cím a frontmatter title mezője, a törzs ## -vel kezdődjön`);
      if (h.level > 3) E(`H${h.level} címsor („${h.text}”) — csak ## és ### használható`);
    }
    if (md.sections.length < 2) E(`${md.sections.length} db H2 szakasz (legalább 2 kell; cél: 3–5)`);
    else if (md.sections.length < 3 || md.sections.length > 6) W(`${md.sections.length} db H2 szakasz (cél: 3–5)`);
    if (!md.intro.trim()) E("hiányzik a bevezető: az első ## előtt legyen legalább egy bekezdés");
    if (md.headings.length && !md.headings.some((h) => /mit jelent ez neked/i.test(h.text)))
      W("nincs „Mit jelent ez neked?” szakasz");
    let last = 1;
    for (const h of md.headings) {
      if (h.level > last + 1) E(`címsor-ugrás: H${last} → H${h.level} („${h.text}”)`);
      last = h.level;
    }
    if (/<\/?[a-z][^>]*>/i.test(body.replace(/`[^`\n]*`/g, ""))) W("nyers HTML a törzsben — escape-elve, szövegként jelenik meg");

    const hay = `${title} ${description} ${md.text}`.toLowerCase().replace(/\s+/g, " ");
    for (const bad of BLOG.banned) if (hay.includes(bad)) E(`tiltott kifejezés: „${bad}”`);

    /* Idézet: legfeljebb 15 szó (szerzői jog). */
    for (const q of [...md.text.matchAll(/[„"]([^„”"]{20,}?)[”"]/g)].map((x) => x[1]).concat(md.quotes)) {
      const n = q.split(/\s+/).filter(Boolean).length;
      if (n > 15) W(`${n} szavas idézet („${q.slice(0, 50)}…”) — legfeljebb 15 szó idézhető`);
    }

    all.push({
      file: rel,
      slug,
      title,
      description,
      category,
      categorySlug: slugify(category),
      date,
      day,
      updated: updated || date,
      updatedDay: (updated || date).slice(0, 10),
      tags: tags.map((name) => ({ name, slug: slugify(name) })),
      sources,
      draft: data.draft === true,
      md,
      readMin: Math.max(1, Math.round(md.words / 200)),
    });
  }

  /* --- egyediség --- */
  const dup = (key, label) => {
    const seen = new Map();
    for (const p of all) {
      const v = String(p[key] || "").toLowerCase();
      if (!v) continue;
      if (seen.has(v)) errors.push(`${p.file}: duplikált ${label} (már használja: ${seen.get(v)})`);
      else seen.set(v, p.file);
    }
  };
  dup("slug", "slug");
  dup("title", "title");
  dup("description", "description");

  const posts = all
    .filter((p) => !p.draft)
    .sort((a, b) => (a.date === b.date ? a.slug.localeCompare(b.slug) : a.date < b.date ? 1 : -1));

  /* --- linkek: belső cél létezik-e, külső érvényes-e --- */
  const routes = new Set(["/blog/", "/blog/feed.xml"]);
  for (const p of posts) {
    routes.add(`/blog/${p.slug}/`);
    routes.add(`/blog/kategoria/${p.categorySlug}/`);
    for (const t of p.tags) routes.add(`/blog/cimke/${t.slug}/`);
  }
  const onDisk = (pathname) => {
    let rel = pathname.replace(/^\//, "");
    if (rel === "" || rel.endsWith("/")) rel += "index.html";
    return fs.existsSync(path.join(root, rel));
  };
  for (const p of all) {
    const E = (m) => errors.push(`${p.file}: ${m}`);
    for (const { url } of p.md.links) {
      if (/^https?:\/\//i.test(url)) {
        if (!isUrl(url)) E(`érvénytelen külső link: ${url}`);
        else if (/^https?:\/\/(www\.)?ertekpontpenzugyek\.hu/i.test(url)) E(`saját oldalra mutató abszolút link — gyökértől írd: ${url.replace(/^https?:\/\/[^/]+/i, "") || "/"}`);
        else if (/^http:/i.test(url)) warnings.push(`${p.file}: nem https link: ${url}`);
      } else if (url.startsWith("/")) {
        const pathname = url.split("#")[0].split("?")[0];
        if (pathname.startsWith("/blog/") ? !routes.has(pathname) : !onDisk(pathname)) E(`törött belső link: ${url}`);
        if (/(^|\/)index\.html$/.test(pathname)) E(`index.html-re mutató belső link: ${url} (a mappára mutass: …/)`);
      } else if (url.startsWith("#")) {
        if (!p.md.headings.some((h) => h.id === url.slice(1))) E(`nem létező horgony: ${url}`);
      } else if (/^(mailto|tel):/i.test(url)) {
        E(`mailto:/tel: link a törzsben (${url}) — az elérhetőséget a cikk alatti CTA-blokk adja`);
      } else {
        E(`relatív vagy ismeretlen link: ${url} — belső linket gyökértől írj (pl. /kapcsolat/)`);
      }
    }
    if (!p.md.links.some((l) => l.url.startsWith("/"))) warnings.push(`${p.file}: nincs belső link — legalább egy kapcsolódó oldalra mutass (pl. /kapcsolat/, szolgáltatás-oldal)`);
    for (const src of p.md.images) {
      if (!src.startsWith("/") || /^\/\//.test(src)) E(`külső kép: ${src} — csak a repóban lévő, saját kép használható (/assets/…)`);
      else if (!onDisk(src)) E(`nem létező kép: ${src}`);
    }
  }

  return { posts, all, errors, warnings };
}

/* ====================================================================== */
/*  Borítókép — márkaszínű SVG a cikk címéből (külső, jogvédett kép nincs) */
/* ====================================================================== */

function wrapText(text, max) {
  const lines = [];
  let cur = "";
  for (const w of text.split(/\s+/)) {
    if (cur && (cur + " " + w).length > max) {
      lines.push(cur);
      cur = w;
    } else cur = cur ? `${cur} ${w}` : w;
  }
  if (cur) lines.push(cur);
  return lines;
}

export function coverSvg(p, dateLabel) {
  /* Betűméret a cím hosszához: 3 sorig nagy, utána lépcsőzetesen kisebb. */
  let size = 68;
  let lines = wrapText(p.title, 24);
  if (lines.length > 3) {
    size = 58;
    lines = wrapText(p.title, 29);
  }
  if (lines.length > 4) {
    size = 50;
    lines = wrapText(p.title, 34);
  }
  const lh = Math.round(size * 1.14);
  const top = 330 - ((lines.length - 1) * lh) / 2;
  const font = "'Inter Tight','Inter','Segoe UI',system-ui,-apple-system,'Helvetica Neue',Arial,sans-serif";
  const mono = "'JetBrains Mono',ui-monospace,'Cascadia Mono','SF Mono',Menlo,Consolas,monospace";
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 630" width="1200" height="630" role="img" aria-labelledby="t">
<title id="t">${esc(p.title)}</title>
<defs>
<radialGradient id="g" cx="88%" cy="6%" r="75%"><stop offset="0" stop-color="#c2ff72" stop-opacity=".26"/><stop offset=".55" stop-color="#c2ff72" stop-opacity=".05"/><stop offset="1" stop-color="#c2ff72" stop-opacity="0"/></radialGradient>
</defs>
<rect width="1200" height="630" fill="#0a0b09"/>
<rect width="1200" height="630" fill="url(#g)"/>
<g fill="none" stroke="#c2ff72" stroke-opacity=".13" stroke-width="58" transform="translate(770 150) scale(.92)"><path d="M138 374 366 146"/><path d="M172 132C232 178 300 172 366 146"/><path d="M392 344C348 288 356 210 366 146"/></g>
<g transform="translate(72 64)"><rect width="52" height="52" rx="12" fill="#c2ff72"/><g fill="none" stroke="#0a0b09" stroke-width="66" transform="scale(.1016)"><path d="M138 374 366 146"/><path d="M172 132C232 178 300 172 366 146"/><path d="M392 344C348 288 356 210 366 146"/></g>
<text x="70" y="23" font-family="${font}" font-size="21" font-weight="800" fill="#f2f5ec">Érték Pont</text>
<text x="70" y="45" font-family="${mono}" font-size="13" letter-spacing="2.6" fill="#7f8a75">PÉNZÜGYEK · BLOG</text></g>
<text x="72" y="${top - size - 18}" font-family="${mono}" font-size="19" letter-spacing="3.4" fill="#c2ff72">${esc(p.category.toUpperCase())}</text>
<text font-family="${font}" font-size="${size}" font-weight="800" letter-spacing="-1.6" fill="#f2f5ec">${lines
    .map((l, i) => `<tspan x="72" y="${top + i * lh}">${esc(l)}</tspan>`)
    .join("")}</text>
<rect x="72" y="548" width="1056" height="1" fill="#ffffff" fill-opacity=".1"/>
<text x="72" y="584" font-family="${mono}" font-size="17" letter-spacing="1.4" fill="#b9c2ad">ertekpontpenzugyek.hu/blog</text>
<text x="1128" y="584" text-anchor="end" font-family="${mono}" font-size="17" letter-spacing="1.4" fill="#7f8a75">${esc(dateLabel)}</text>
</svg>
`;
}

/* ====================================================================== */
/*  Oldalsablonok — a közös részeket (head, nav, footer, CTA) a generátor  */
/*  adja át a `kit`-ben, így a blog pontosan azt az arculatot kapja.       */
/* ====================================================================== */

const LEGAL_NOTE =
  "A cikk általános tájékoztatást nyújt, nem minősül személyre szabott pénzügyi, befektetési vagy biztosítási tanácsadásnak. Döntés előtt egyeztess szakemberrel.";

export function buildBlog(posts, kit) {
  const { SITE, BRAND, CFG, ARROW, ORG_ID, PERSON_ID, huDate } = kit;
  const BLOG_ID = `${SITE}/blog/#blog`;
  const pages = [];
  const files = [];
  const HOME = { name: "Főoldal", path: "" };
  const BLOG_CRUMB = { name: "Blog", path: "blog/" };

  const card = (p, up, tag = "h2", attrs = "") => `<article class="card post-card"${attrs}>
          <img class="post-card__img" src="${up}blog/${p.slug}/cover.svg" alt="" width="1200" height="630" loading="lazy" decoding="async">
          <div class="post-card__body">
            <p class="post-card__meta"><span class="post-card__cat">${esc(p.category)}</span><time datetime="${p.day}">${huDate(p.day)}</time><span>${p.readMin} perc olvasás</span></p>
            <${tag} class="h4 post-card__title"><a href="${up}blog/${p.slug}/">${esc(p.title)}</a></${tag}>
            <p class="post-card__desc">${esc(p.description)}</p>
            <span class="link-arrow" aria-hidden="true">Elolvasom ${ARROW}</span>
          </div>
        </article>`;

  const shell = ({ head, depth, main }) => `${kit.head(head)}
${kit.nav(depth, "blog")}

<main id="main">
${main}
</main>
${kit.footer(depth)}
${kit.stickyCta(depth)}
${kit.scripts(depth, false)}`;

  const cats = Object.keys(BLOG.categories).filter((c) => posts.some((p) => p.category === c));

  /* --- Listaoldalak (főlista, kategória, címke) — közös sablon ---------- */
  function listing({ base, items, title, desc, h1, lead, label, crumbs, current, robots = "", node }) {
    const pageCount = Math.max(1, Math.ceil(items.length / BLOG.perPage));
    for (let n = 1; n <= pageCount; n++) {
      const pth = n === 1 ? base : `${base}oldal/${n}/`;
      const depth = kit.depthOf(pth);
      const up = kit.upOf(depth);
      const url = `${SITE}/${pth}`;
      const slice = items.slice((n - 1) * BLOG.perPage, n * BLOG.perPage);
      const pageCrumbs = n === 1 ? crumbs : [...crumbs, { name: `${n}. oldal`, path: pth }];
      const href = (k) => `${up}${k === 1 ? base : `${base}oldal/${k}/`}`;
      const pager =
        pageCount > 1
          ? `<nav class="pager" aria-label="Lapozás">
        ${n > 1 ? `<a class="pager__step" href="${href(n - 1)}" rel="prev">← Újabb cikkek</a>` : `<span class="pager__step" aria-disabled="true">← Újabb cikkek</span>`}
        <ol class="pager__pages">
          ${Array.from({ length: pageCount }, (_, k) => k + 1)
            .map((k) => `<li><a href="${href(k)}"${k === n ? ' aria-current="page"' : ""} aria-label="${k}. oldal">${k}</a></li>`)
            .join("")}
        </ol>
        ${n < pageCount ? `<a class="pager__step" href="${href(n + 1)}" rel="next">Korábbi cikkek →</a>` : `<span class="pager__step" aria-disabled="true">Korábbi cikkek →</span>`}
      </nav>`
          : "";
      const chips = cats.length
        ? `<nav class="chips" aria-label="Kategóriák">
          <a class="chip" href="${up}blog/"${current === "all" ? ' aria-current="page"' : ""}>Minden cikk</a>
          ${cats.map((c) => `<a class="chip" href="${up}blog/kategoria/${slugify(c)}/"${current === c ? ' aria-current="page"' : ""}>${esc(c)}</a>`).join("\n          ")}
        </nav>`
        : "";
      const schema = kit.ldScript([
        node(url, slice),
        kit.businessSchema(),
        kit.personSchema(),
        kit.crumbSchema(pageCrumbs, url),
      ]);
      const html = shell({
        head: {
          title: n === 1 ? title : title.replace(/ — [^|]*\| /, ` — ${n}. oldal | `),
          desc: n === 1 ? desc : `${n}. oldal — ${desc}`.slice(0, 155),
          url,
          depth,
          schema,
          robots,
          pageType: "blog_hub",
        },
        depth,
        main: `  <section class="page-hero">
    <div class="wrap">
      ${kit.crumbsHtml(pageCrumbs, up)}
      <span class="label">${esc(label)}</span>
      <h1 class="h1" style="margin-top:.75rem">${esc(h1)}${n > 1 ? ` <span class="mute">— ${n}. oldal</span>` : ""}</h1>
      <p class="lead">${lead}</p>
      ${chips}
    </div>
  </section>

  <section class="section-sm" style="padding-top:0">
    <div class="wrap">
      ${
        slice.length
          ? `<div class="post-grid">
        ${slice.map((p) => card(p, up)).join("\n        ")}
      </div>
      ${pager}`
          : `<p class="lead">Hamarosan érkeznek az első cikkek. Addig nézd meg a <a href="${up}tudastar/" style="color:var(--lime-text)">Tudástár</a> útmutatóit.</p>`
      }
      <p class="tiny mute post-foot">Örökzöld útmutatók kalkulátorral: <a href="${up}tudastar/">Tudástár</a> ·
      Feliratkozás hírolvasóval: <a href="${up}blog/feed.xml">RSS-feed</a></p>
    </div>
  </section>
${kit.finalCta(up, {
  label: "Blog",
  h: "A hírek mindenkinek szólnak. A számaid csak neked.",
  p: "Kérj visszahívást, és megnézzük, mit jelent a friss változás a te hiteledre, megtakarításodra vagy biztosításodra. A tanácsadás díjmentes.",
  location: "blog",
})}`,
      });
      pages.push({ rel: `${pth}index.html`, loc: robots ? null : url, html });
    }
  }

  const postRefs = (slice) =>
    slice.map((p) => ({
      "@type": "BlogPosting",
      "@id": `${SITE}/blog/${p.slug}/#cikk`,
      headline: p.title,
      url: `${SITE}/blog/${p.slug}/`,
      datePublished: p.date,
      dateModified: p.updated,
      author: { "@id": PERSON_ID },
    }));

  listing({
    base: "blog/",
    items: posts,
    title: "Pénzügyi blog — friss hírek érthetően | Érték Pont",
    desc: "Friss magyar pénzügyi hírek érthetően: lakáshitel, állami támogatások, megtakarítás, biztosítás, adókedvezmények — forrásokkal, forintra lefordítva.",
    h1: "Pénzügyi hírek, érthetően",
    lead: `Mi változott, kit érint, és mennyit jelent forintban. Minden cikket ${esc(CFG.advisor.name)} ír, ellenőrizhető forrásokkal — a megjelenés napján aktuális adatokkal.`,
    label: "Blog",
    crumbs: [HOME, BLOG_CRUMB],
    current: "all",
    node: (url, slice) => ({
      "@type": "Blog",
      "@id": url === `${SITE}/blog/` ? BLOG_ID : `${url}#blog`,
      name: `${BRAND} — Blog`,
      description: "Friss magyar pénzügyi hírek érthetően, forrásokkal.",
      url,
      inLanguage: "hu-HU",
      isPartOf: { "@id": `${SITE}/#weboldal` },
      publisher: { "@id": ORG_ID },
      author: { "@id": PERSON_ID },
      blogPost: postRefs(slice),
    }),
  });

  const collectionNode = (name) => (url, slice) => ({
    "@type": "CollectionPage",
    "@id": `${url}#oldal`,
    name,
    url,
    inLanguage: "hu-HU",
    isPartOf: { "@id": BLOG_ID },
    breadcrumb: { "@id": `${url}#morzsa` },
    hasPart: postRefs(slice),
  });

  for (const c of cats) {
    const base = `blog/kategoria/${slugify(c)}/`;
    listing({
      base,
      items: posts.filter((p) => p.category === c),
      title: `${c} — blogcikkek | Érték Pont`,
      desc: BLOG.categories[c],
      h1: c,
      lead: esc(BLOG.categories[c]),
      label: "Blog · kategória",
      crumbs: [HOME, BLOG_CRUMB, { name: c, path: base }],
      current: c,
      node: collectionNode(`${c} — blogcikkek`),
    });
  }

  const tagMap = new Map();
  for (const p of posts) for (const t of p.tags) tagMap.set(t.slug, { name: (tagMap.get(t.slug) || t).name, items: [...(tagMap.get(t.slug)?.items || []), p] });
  for (const [slug, t] of tagMap) {
    const base = `blog/cimke/${slug}/`;
    listing({
      base,
      items: t.items,
      title: `${t.name} — címke | Érték Pont blog`,
      desc: `A(z) „${t.name}” címkéjű blogcikkek: friss pénzügyi hírek érthetően, forrásokkal — ${BRAND}.`,
      h1: `Címke: ${t.name}`,
      lead: `Minden cikk, ami ezt a témát érinti.`,
      label: "Blog · címke",
      crumbs: [HOME, BLOG_CRUMB, { name: t.name, path: base }],
      current: "",
      /* Címkeoldal: gyűjtő, önálló tartalom nélkül — a linkeket kövesse a
         kereső, de az oldal ne kerüljön az indexbe és a sitemapbe. */
      robots: "noindex,follow",
      node: collectionNode(`Címke: ${t.name}`),
    });
  }

  /* --- Cikkoldalak ------------------------------------------------------ */
  for (const p of posts) {
    const pth = `blog/${p.slug}/`;
    const depth = kit.depthOf(pth);
    const up = kit.upOf(depth);
    const url = `${SITE}/${pth}`;
    const catPath = `blog/kategoria/${p.categorySlug}/`;
    const crumbs = [HOME, BLOG_CRUMB, { name: p.category, path: catPath }, { name: p.title, path: pth }];
    /* A látható morzsában a cím helyett „Cikk”: a nagybetűs, ritkított
       morzsasor 60 karakteres címmel telefonon három sorba törne. A
       strukturált adatban a teljes cím szerepel. */
    const visibleCrumbs = [...crumbs.slice(0, 3), { name: "Cikk", path: pth }];
    const related = posts.filter((x) => x.category === p.category && x.slug !== p.slug).slice(0, 3);
    const toc =
      p.md.sections.length >= 4
        ? `<aside class="longform__aside" aria-label="Tartalomjegyzék">
          <nav class="toc">
            <span class="label">Tartalom</span>
            <ol>
              ${p.md.sections.map((s) => `<li><a href="#${s.id}">${esc(s.title)}</a></li>`).join("\n              ")}
              <li><a href="#forrasok">Források</a></li>
            </ol>
          </nav>
        </aside>`
        : "";

    const schema = kit.ldScript([
      {
        "@type": ["Article", "BlogPosting"],
        "@id": `${url}#cikk`,
        headline: p.title,
        description: p.description,
        url,
        mainEntityOfPage: url,
        inLanguage: "hu-HU",
        datePublished: p.date,
        dateModified: p.updated,
        author: { "@id": PERSON_ID },
        publisher: { "@id": ORG_ID },
        image: [`${SITE}/assets/img/og-cover.jpg`, `${url}cover.svg`],
        articleSection: p.category,
        keywords: p.tags.map((t) => t.name).join(", "),
        wordCount: p.md.words,
        isPartOf: { "@id": BLOG_ID },
        citation: p.sources.map((s) => s.url),
      },
      kit.businessSchema(),
      kit.personSchema(),
      kit.partnerSchema(),
      kit.crumbSchema(crumbs, url),
    ]);

    const body = kit
      .relLinks(
        `${p.md.intro}
        ${p.md.sections
          .map(
            (s) => `<section id="${s.id}" aria-labelledby="h-${s.id}">
          <h2 id="h-${s.id}">${esc(s.title)}</h2>
          ${s.html}
        </section>`
          )
          .join("\n        ")}`,
        up
      )
      .replace(/(<img src=")\/(?!\/)/g, `$1${up}`);

    const html = shell({
      head: {
        title: p.title.length <= 47 ? `${p.title} | Érték Pont` : p.title,
        desc: p.description,
        url,
        depth,
        schema,
        ogType: "article",
        article: { published: p.date, modified: p.updated },
        pageType: "article",
      },
      depth,
      main: `  <section class="page-hero post-hero">
    <div class="wrap post-hero__grid">
      <div>
        ${kit.crumbsHtml(visibleCrumbs, up)}
        <a class="label" href="${up}${catPath}">${esc(p.category)}</a>
        <h1 class="h1" style="margin-top:.75rem">${esc(p.title)}</h1>
        <p class="lead">${esc(p.description)}</p>
        <p class="byline post-meta">
          <span>Írta: <a href="${up}rolam/" rel="author">${esc(CFG.advisor.name)}</a>, ${esc(CFG.advisor.role)}</span>
          <span>Megjelent: <time datetime="${p.date}">${huDate(p.day)}</time></span>
          ${p.updatedDay !== p.day ? `<span>Frissítve: <time datetime="${p.updated}">${huDate(p.updatedDay)}</time></span>` : ""}
          <span>${p.readMin} perc olvasás</span>
        </p>
        ${kit.ctaGroup(up, { location: "hero", heroCta: true, lg: false })}
      </div>
      <img class="post-hero__cover" src="${up}${pth}cover.svg" alt="Borítókép: ${esc(p.title)}" width="1200" height="630" loading="lazy" decoding="async">
    </div>
  </section>

  <section class="section-sm" style="padding-top:0">
    <div class="wrap longform">
      ${toc}
      <article class="content post">
        ${body}

        <section id="forrasok" aria-labelledby="h-forrasok">
          <h2 id="h-forrasok">Források</h2>
          <ol class="sources">
            ${p.sources.map((s) => `<li><a href="${esc(s.url)}" target="_blank" rel="noopener">${esc(s.name)}</a></li>`).join("\n            ")}
          </ol>
          <p class="tiny mute">Az információ a megjelenés napján (${huDate(p.updatedDay)}) aktuális. A jogszabályok, a kamatok és a
          szolgáltatók feltételei azóta változhattak — döntés előtt ellenőrizd a hivatalos forrásban.</p>
        </section>

        <aside class="post-legal" aria-label="Jogi tájékoztató">
          <p><strong>Fontos tájékoztatás.</strong> ${LEGAL_NOTE}</p>
          <p><a href="${up}impresszum.html">Impresszum — ki áll az oldal mögött</a></p>
        </aside>

        <nav class="post-tags" aria-label="Címkék">
          ${p.tags.map((t) => `<a class="chip" href="${up}blog/cimke/${t.slug}/">${esc(t.name)}</a>`).join("\n          ")}
        </nav>
      </article>
    </div>
  </section>
${
  related.length
    ? `
  <section class="section-sm" aria-labelledby="kapcsolodo">
    <div class="wrap">
      <h2 class="h3" id="kapcsolodo" style="margin-bottom:1.25rem">Kapcsolódó cikkek</h2>
      <div class="post-grid">
        ${related.map((x) => card(x, up, "h3")).join("\n        ")}
      </div>
    </div>
  </section>`
    : ""
}
${kit.finalCta(up, {
  label: "Beszéljük át",
  h: "Megnézzük, mit jelent ez a te számaidra?",
  p: "Kérj visszahívást: egy rövid beszélgetésben átnézzük a helyzeted, és kiderül, van-e teendőd. A tanácsadás díjmentes, a döntés a tiéd.",
  location: "blog",
  bridge: `További friss cikkek a <a href="${up}blog/">blogon</a> · örökzöld útmutatók a <a href="${up}tudastar/">Tudástárban</a>.`,
})}`,
    });
    pages.push({ rel: `${pth}index.html`, loc: url, html, lastmod: p.updatedDay });
    files.push({ rel: `${pth}cover.svg`, content: coverSvg(p, huDate(p.day)) });
  }

  /* --- RSS -------------------------------------------------------------- */
  const stamp = (p) => new Date(ISO_DAY.test(p.date) ? `${p.date}T07:00:00Z` : p.date).toUTCString();
  files.push({
    rel: "blog/feed.xml",
    content: `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
<channel>
<title>${esc(BRAND)} — Blog</title>
<link>${SITE}/blog/</link>
<atom:link href="${SITE}/blog/feed.xml" rel="self" type="application/rss+xml"/>
<description>Friss magyar pénzügyi hírek érthetően, forrásokkal: lakáshitel, támogatások, megtakarítás, biztosítás, adókedvezmények.</description>
<language>hu</language>
${posts.length ? `<lastBuildDate>${stamp(posts[0])}</lastBuildDate>\n` : ""}${posts
      .slice(0, BLOG.feedItems)
      .map(
        (p) => `<item>
<title>${esc(p.title)}</title>
<link>${SITE}/blog/${p.slug}/</link>
<guid isPermaLink="true">${SITE}/blog/${p.slug}/</guid>
<pubDate>${stamp(p)}</pubDate>
<category>${esc(p.category)}</category>
<description>${esc(p.description)}</description>
</item>`
      )
      .join("\n")}
</channel>
</rss>
`,
  });

  /* --- Főoldali szekció: a 3 legújabb cikk ------------------------------ */
  const homeSection = posts.length
    ? `
  <!-- ============ BLOG: LEGFRISSEBB CIKKEK ============ -->
  <section class="section-sm" id="blog">
    <div class="wrap">
      <div class="sec-head">
        <div>
          <span class="label">Blog</span>
          <h2 class="h2 sec-head__title" data-reveal>Legfrissebb cikkek</h2>
        </div>
        <div data-reveal>
          <p class="lead">Friss pénzügyi hírek érthetően: mi változott, kit érint, és mennyit jelent forintban.</p>
          <a class="link-arrow" href="blog/" style="margin-top:1rem">Összes cikk ${ARROW}</a>
        </div>
      </div>
      <div class="post-grid">
        ${posts
          .slice(0, 3)
          .map((p, i) => card(p, "", "h3", ` data-reveal style="--reveal-delay:${i * 70}ms"`))
          .join("\n        ")}
      </div>
    </div>
  </section>
`
    : "";

  return { pages, files, homeSection };
}
