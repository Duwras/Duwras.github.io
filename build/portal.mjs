/* ==========================================================================
   MUNKATÁRSI PORTÁL — titkosító build
   Futtatás (PowerShell):  $env:PORTAL_PASSWORD='…'; npm run portal:build
   Futtatás (bash):        PORTAL_PASSWORD='…' npm run portal:build
   (vagy egy gitignore-olt .env fájlban: PORTAL_PASSWORD='…')

   Bemenet:  private/portal-data.json   (gitignore-olt, NYÍLT linkek és kódok)
   Kimenet:  munkatarsi-portal/vault.json (csak ciphertext + salt + IV + iteráció)
             munkatarsi-portal/index.html  (csak a ?v= verziók frissülnek)

   Miért így: a GitHub Pages-en nincs szerveroldali jelszóvédelem, és a repó
   public. Ezért a portál tartalma build-időben AES-256-GCM-mel titkosítva
   kerül ki, a kulcsot PBKDF2-SHA256 állítja elő a jelszóból (600 000 kör,
   véletlen salt és IV). A böngésző a Web Crypto API-val fejti vissza
   (munkatarsi-portal/portal.js). Jelszó nélkül a vault.json értelmetlen bájtsor.

   Biztonsági háló:
   - Ha nincs adatfájl VAGY nincs jelszó (pl. a blogposztoló, CI), a script
     NEM nyúl semmihez, és 0-val lép ki → a commitolt portál érintetlen marad.
   - Az `npm run build` (build/generate.mjs) ezt a scriptet nem hívja.
   - A végén ellenőrzi, hogy a kiadott fájlokban nincs-e nyílt link, kód vagy
     a jelszó; ha van, hibával leáll.
   Csak a Node beépített moduljait használja (nincs npm install).
   ========================================================================== */

import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const DATA_FILE = path.join(ROOT, "private", "portal-data.json");
const ENV_FILE = path.join(ROOT, ".env");
const OUT_DIR = path.join(ROOT, "munkatarsi-portal");
const VAULT_FILE = path.join(OUT_DIR, "vault.json");
const INDEX_FILE = path.join(OUT_DIR, "index.html");

/* Az OWASP 2023-as ajánlása PBKDF2-HMAC-SHA256-hoz: legalább 600 000 kör.
   Telefonon a feloldás így kb. 0,5–1,5 mp — egyszer kell kivárni. */
const ITERATIONS = 600_000;

const log = (s) => console.log("PORTÁL — " + s);

function skip(reason) {
  log(`kihagyva: ${reason}.`);
  log("A már commitolt titkosított portál (munkatarsi-portal/) érintetlen maradt.");
  process.exit(0);
}

/* --- Jelszó: környezeti változó, különben .env --------------------------
   A .env-ben a # NEM komment (a jelszóban lehet #), ezért itt saját, szigorú
   olvasás van: az első = utáni teljes sor, a külső idézőjelek nélkül. */
function readPassword() {
  if (process.env.PORTAL_PASSWORD) return process.env.PORTAL_PASSWORD;
  if (!fs.existsSync(ENV_FILE)) return "";
  for (const line of fs.readFileSync(ENV_FILE, "utf8").split(/\r?\n/)) {
    const m = line.match(/^\s*PORTAL_PASSWORD\s*=(.*)$/);
    if (!m) continue;
    let v = m[1].trim();
    if (/^(['"]).*\1$/.test(v)) v = v.slice(1, -1);
    return v;
  }
  return "";
}

if (!fs.existsSync(DATA_FILE)) skip("nincs private/portal-data.json (ez rendben van a blogposztolóban és CI-ban)");
const PASSWORD = readPassword();
if (!PASSWORD) skip("nincs PORTAL_PASSWORD (környezeti változó vagy .env)");
if (PASSWORD.length < 6) {
  console.error("PORTÁL — HIBA: a jelszó legalább 6 karakter legyen.");
  process.exit(1);
}

/* --- Adat beolvasása és ellenőrzése ------------------------------------ */
let data;
try {
  data = JSON.parse(fs.readFileSync(DATA_FILE, "utf8"));
} catch (e) {
  console.error("PORTÁL — HIBA: a private/portal-data.json nem érvényes JSON:\n  " + e.message);
  process.exit(1);
}

const errors = [];
const urls = [];
const secrets = new Set([PASSWORD]);
const isStr = (v) => typeof v === "string" && v.trim() !== "";
const strArr = (v) => Array.isArray(v) && v.every(isStr);

/* Szintaktikai linkellenőrzés: a bejelentkezős oldalakat nem lehet
   megnyitni, de az elgépelt, nem https-es vagy szóközös címet igen. */
function checkUrl(u, where) {
  if (!isStr(u)) return errors.push(`${where}: hiányzó url`);
  let parsed;
  try {
    parsed = new URL(u);
  } catch {
    return errors.push(`${where}: érvénytelen url: ${u}`);
  }
  if (parsed.protocol !== "https:") errors.push(`${where}: nem https: ${u}`);
  if (!parsed.hostname.includes(".")) errors.push(`${where}: furcsa domain: ${u}`);
  if (/\s/.test(u)) errors.push(`${where}: szóköz a címben: ${u}`);
  urls.push(u);
  secrets.add(u);
}

function checkLinks(links, where) {
  if (links == null) return;
  if (!Array.isArray(links)) return errors.push(`${where}.links: tömb kell`);
  links.forEach((l, i) => {
    if (!isStr(l?.label)) errors.push(`${where}.links[${i}]: hiányzó label`);
    checkUrl(l?.url, `${where}.links[${i}]`);
  });
}

function checkItem(it, where) {
  if (!isStr(it?.title)) errors.push(`${where}: hiányzó title`);
  if (it.desc != null && typeof it.desc !== "string") errors.push(`${where}: a desc szöveg legyen`);
  if (it.url != null) checkUrl(it.url, where);
  if (it.url == null && !it.links?.length && !it.note) errors.push(`${where}: se url, se links, se note`);
  if (it.path != null && !strArr(it.path)) errors.push(`${where}: a path szövegtömb legyen`);
  if (it.tags != null && !strArr(it.tags)) errors.push(`${where}: a tags szövegtömb legyen`);
  if (it.login != null && typeof it.login !== "string") errors.push(`${where}: a login szöveg legyen`);
  if (it.code != null) {
    if (!isStr(it.code)) errors.push(`${where}: a code szöveg vagy null legyen`);
    else secrets.add(it.code);
  }
  checkLinks(it.links, where);
}

if (!/^\d{4}-\d{2}-\d{2}$/.test(data.updated || "")) errors.push("updated: ÉÉÉÉ-HH-NN formátum kell");
if (!Array.isArray(data.quick)) errors.push("quick: tömb kell");
else data.quick.forEach((it, i) => checkItem(it, `quick[${i}]`));

if (!Array.isArray(data.checklist)) errors.push("checklist: tömb kell");
else {
  const ids = new Set();
  data.checklist.forEach((c, i) => {
    if (!/^[a-z0-9-]+$/.test(c?.id || "")) errors.push(`checklist[${i}]: az id kisbetű/szám/kötőjel`);
    if (ids.has(c.id)) errors.push(`checklist[${i}]: ismétlődő id: ${c.id}`);
    ids.add(c.id);
    if (!isStr(c?.text)) errors.push(`checklist[${i}]: hiányzó text`);
    if (c.url != null) checkUrl(c.url, `checklist[${i}]`);
  });
}

if (!Array.isArray(data.sections)) errors.push("sections: tömb kell");
else {
  const ids = new Set();
  data.sections.forEach((s, i) => {
    const w = `sections[${i}]`;
    if (!/^[a-z0-9-]+$/.test(s?.id || "")) errors.push(`${w}: az id kisbetű/szám/kötőjel`);
    if (ids.has(s.id)) errors.push(`${w}: ismétlődő id: ${s.id}`);
    ids.add(s.id);
    if (!isStr(s?.title)) errors.push(`${w}: hiányzó title`);
    if (!Array.isArray(s?.items) || !s.items.length) errors.push(`${w}: üres items`);
    else s.items.forEach((it, j) => checkItem(it, `${w}.items[${j}]`));
  });
}

if (!Array.isArray(data.faq)) errors.push("faq: tömb kell");
else
  data.faq.forEach((f, i) => {
    const w = `faq[${i}]`;
    if (!isStr(f?.q)) errors.push(`${w}: hiányzó q`);
    if (!isStr(f?.portal)) errors.push(`${w}: hiányzó portal`);
    if (f.path != null && !strArr(f.path)) errors.push(`${w}: a path szövegtömb legyen`);
    if (f.url != null) checkUrl(f.url, w);
    checkLinks(f.links, w);
  });

if (!isStr(data.contact?.name) || !isStr(data.contact?.phone) || !isStr(data.contact?.email))
  errors.push("contact: name, phone, email kell");

if (errors.length) {
  console.error(`PORTÁL — HIBA, ${errors.length} probléma az adatfájlban (semmi nem változott):\n  ` + errors.join("\n  "));
  process.exit(1);
}
log(`adat rendben: ${urls.length} link szintaktikailag ellenőrizve.`);

/* --- Titkosítás --------------------------------------------------------
   A Web Crypto AES-GCM visszafejtése a ciphertext VÉGÉN várja a 16 bájtos
   hitelesítő címkét, ezért ct = titkosított adat ‖ authTag. A jelszót
   mindkét oldalon NFC-re normalizáljuk (ékezetes jelszónál számít). */
const plaintext = Buffer.from(JSON.stringify(data), "utf8");
const pw = Buffer.from(PASSWORD.normalize("NFC"), "utf8");
const salt = crypto.randomBytes(16);
const iv = crypto.randomBytes(12);
const key = crypto.pbkdf2Sync(pw, salt, ITERATIONS, 32, "sha256");
const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);
const ct = Buffer.concat([cipher.update(plaintext), cipher.final(), cipher.getAuthTag()]);

/* Visszaellenőrzés: amit kiírunk, az tényleg visszafejthető-e. */
{
  const d = crypto.createDecipheriv("aes-256-gcm", key, iv);
  d.setAuthTag(ct.subarray(ct.length - 16));
  const back = Buffer.concat([d.update(ct.subarray(0, ct.length - 16)), d.final()]);
  if (!back.equals(plaintext)) {
    console.error("PORTÁL — HIBA: a visszafejtés nem egyezik, semmi nem íródott ki.");
    process.exit(1);
  }
}

const vault = {
  v: 1,
  alg: "AES-256-GCM",
  kdf: "PBKDF2-SHA256",
  iter: ITERATIONS,
  salt: salt.toString("base64"),
  iv: iv.toString("base64"),
  ct: ct.toString("base64"),
};
fs.mkdirSync(OUT_DIR, { recursive: true });
fs.writeFileSync(VAULT_FILE, JSON.stringify(vault) + "\n", "utf8");
log(`vault.json kiírva (${(ct.length / 1024).toFixed(1)} kB titkosított adat, ${ITERATIONS} PBKDF2-kör).`);

/* --- Verziózás: a CSS/JS ?v= lenyomata az index.html-ben ----------------
   A vault.json-t a portal.js `cache: "no-cache"`-sel kéri, az mindig friss. */
if (fs.existsSync(INDEX_FILE)) {
  const short = (f) =>
    crypto.createHash("sha256").update(fs.readFileSync(path.join(OUT_DIR, f))).digest("hex").slice(0, 10);
  let html = fs.readFileSync(INDEX_FILE, "utf8");
  for (const f of ["portal.css", "portal.js"]) {
    if (fs.existsSync(path.join(OUT_DIR, f)))
      html = html.replace(new RegExp(`${f.replace(".", "\\.")}\\?v=[^"]*`, "g"), `${f}?v=${short(f)}`);
  }
  fs.writeFileSync(INDEX_FILE, html, "utf8");
}

/* --- Szivárgás-ellenőrzés: a kiadott mappában nem lehet nyílt titok ---- */
const leaks = [];
for (const f of fs.readdirSync(OUT_DIR)) {
  const txt = fs.readFileSync(path.join(OUT_DIR, f), "utf8");
  for (const s of secrets) if (s && txt.includes(s)) leaks.push(`${f}: ${s === PASSWORD ? "[a jelszó]" : s}`);
}
if (leaks.length) {
  console.error("PORTÁL — HIBA: nyílt adat a kiadott fájlokban:\n  " + leaks.join("\n  "));
  process.exit(1);
}
log("szivárgás-ellenőrzés rendben: a munkatarsi-portal/ mappában nincs nyílt link, kód vagy jelszó.");
log("Kész. Commitold: git add munkatarsi-portal/ && git commit");
