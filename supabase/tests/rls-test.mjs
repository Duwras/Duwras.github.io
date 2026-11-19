/* ==========================================================================
   VEZETŐI PORTÁL — ÉLES RLS-teszt a valódi Supabase-projekten
   Két ideiglenes teszt-vezetőt hoz létre, ellenőrzi, hogy egymás adatait
   (sorok + CV-fájlok) NEM látják, majd mindent töröl maga után.

   A kulcsok CSAK a saját gépeden lévő környezeti változókból jönnek,
   sehol nem kerülnek fájlba:

     cd supabase/tests
     npm install
     $env:SUPABASE_URL = "https://<projekt>.supabase.co"
     $env:SUPABASE_ANON_KEY = "<anon key>"
     $env:SUPABASE_SERVICE_ROLE_KEY = "<service role key>"   # csak a teszt-fiókok létrehozásához/törléséhez
     npm run test:live
     Remove-Item Env:SUPABASE_SERVICE_ROLE_KEY

   Valódi adatot nem olvas és nem módosít: csak a saját teszt-fiókjai
   által létrehozott sorokat és fájlokat érinti.
   ========================================================================== */

import { createClient } from "@supabase/supabase-js";
import { createApi } from "../../vezetoi-portal/js/api.js";
import { randomBytes, randomUUID } from "node:crypto";

const URL_ = process.env.SUPABASE_URL;
const ANON = process.env.SUPABASE_ANON_KEY;
const SERVICE = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!URL_ || !ANON || !SERVICE) {
  console.error("Hiányzik: SUPABASE_URL, SUPABASE_ANON_KEY és SUPABASE_SERVICE_ROLE_KEY környezeti változó (lásd a fájl elejét).");
  process.exit(2);
}

let pass = 0;
const fails = [];
function check(name, cond, extra = "") {
  if (cond) { pass++; console.log("  ✓ " + name); }
  else { fails.push(name); console.log("  ✗ " + name + (extra ? "  → " + extra : "")); }
}
async function throws(fn) { try { await fn(); return false; } catch { return true; } }

const opts = { auth: { persistSession: false, autoRefreshToken: false } };
const admin = createClient(URL_, SERVICE, opts);
const tag = randomBytes(4).toString("hex");
const mk = () => ({ email: `vp-rls-${tag}-${randomBytes(3).toString("hex")}@example.com`, password: randomBytes(18).toString("base64url") });
const A = mk(), B = mk();
const created = [];
const apis = {};

async function cleanup() {
  console.log("\nTakarítás…");
  for (const [who, api] of Object.entries(apis)) {
    try {
      for (const r of await api.attekintes()) await api.torolMunkatars(r.id);
    } catch (e) { console.log(`  (${who} munkatársainak törlése: ${e.message})`); }
  }
  for (const id of created) {
    const { error } = await admin.auth.admin.deleteUser(id);
    console.log(error ? `  ! felhasználó törlése nem sikerült (${id}): ${error.message}` : `  teszt-fiók törölve (${id.slice(0, 8)})`);
  }
}

try {
  console.log(`Teszt-fiókok létrehozása (${tag})…`);
  for (const [k, u] of [["A", A], ["B", B]]) {
    const { data, error } = await admin.auth.admin.createUser({ email: u.email, password: u.password, email_confirm: true, user_metadata: { nev: "RLS teszt " + k } });
    if (error) throw new Error("createUser: " + error.message);
    created.push(data.user.id);
    u.id = data.user.id;
  }

  const login = async (u) => {
    const sb = createClient(URL_, ANON, opts);
    const api = createApi(sb);
    await api.signIn(u.email, u.password);
    return { sb, api };
  };
  const a = await login(A), b = await login(B);
  apis.A = a.api; apis.B = b.api;
  const anonSb = createClient(URL_, ANON, opts);
  const anonApi = createApi(anonSb);

  console.log("\nProfil és sablon");
  const meA = await a.api.me(A.id);
  check("a meghívott fiók profilt kapott, szerepe 'vezeto'", meA && meA.szerep === "vezeto" && meA.aktiv);
  const sablon = await a.api.sablon();
  check(`a bedolgozási sablonban ${sablon.filter((s) => s.aktiv).length} aktív pont van (elvárt: 53)`, sablon.filter((s) => s.aktiv).length === 53);

  console.log("\nSorok elkülönítése");
  const mA = await a.api.ujMunkatars({ nev: "RLS Teszt Alfa", statusz: "jelolt", vezeto_id: A.id, adatkezelesi_hozzajarulas: true });
  const mB = await b.api.ujMunkatars({ nev: "RLS Teszt Béta", statusz: "jelolt", vezeto_id: B.id });
  check("A létrehozott egy munkatársat, a bedolgozási pontok automatikusan bekerültek", (await a.api.haladas(mA.id)).length === sablon.filter((s) => s.aktiv).length);
  const listA = await a.api.attekintes();
  const listB = await b.api.attekintes();
  check("A csak a sajátját látja", listA.length === 1 && listA[0].id === mA.id);
  check("B csak a sajátját látja", listB.length === 1 && listB[0].id === mB.id);
  check("B nem tudja megnyitni A munkatársát azonosítóval sem", (await b.api.munkatars(mA.id).catch(() => null)) == null);
  check("B nem látja A bedolgozási pontjait", (await b.api.haladas(mA.id).catch(() => [])).length === 0);
  check("B nem tudja módosítani A munkatársát", await throws(() => b.api.mentMunkatars(mA.id, { megjegyzes: "betörés" })));
  check("B nem tud A nevére munkatársat felvenni", await throws(() => b.api.ujMunkatars({ nev: "Hamis", statusz: "jelolt", vezeto_id: A.id })));
  check("A kódot rögzíthet, B nem találja", (await a.api.ujKod(mA.id, { kod: "RLS-" + tag, kitoltes_datum: "2026-11-19" })) && !(await b.api.attekintes()).some((r) => (r.kodok || "").includes("RLS-" + tag)));
  const { data: anonRows } = await anonSb.from("munkatarsak").select("id");
  check("bejelentkezés nélkül semmi nem látszik", !anonRows || anonRows.length === 0);
  check("bejelentkezés nélkül a sablon sem látszik", (await anonApi.sablon().catch(() => [])).length === 0);

  console.log("\nCV-fájlok (privát bucket, 60 mp-es link)");
  const pdf = new Blob(["%PDF-1.4\n%%EOF"], { type: "application/pdf" });
  const file = new File([pdf], "rls-teszt.pdf", { type: "application/pdf" });
  const dok = await a.api.feltolt(mA.id, file, "oneletrajz");
  check("A feltöltött egy PDF-et; az útvonalban nincs név", dok && !/RLS|Alfa|rls-teszt/i.test(dok.storage_path));
  const link = await a.api.megnyitLink(dok.storage_path);
  check("A kap rövid lejáratú aláírt linket", typeof link === "string" && link.includes("token="));
  const res = await fetch(link);
  check("az aláírt link működik", res.ok);
  const pub = await fetch(`${URL_}/storage/v1/object/public/cv/${dok.storage_path}`);
  check("nyilvános URL-en NEM érhető el", !pub.ok);
  check("B nem kap linket A fájljához", await throws(() => b.api.megnyitLink(dok.storage_path)));
  const { data: anonSigned } = await anonSb.storage.from("cv").createSignedUrl(dok.storage_path, 60);
  check("bejelentkezés nélkül sincs link", !anonSigned);
  const { error: upErr } = await b.sb.storage.from("cv").upload(`${mA.id}/${randomUUID()}.pdf`, pdf, { contentType: "application/pdf" });
  check("B nem tud A mappájába feltölteni", !!upErr);
  const { data: rm } = await b.sb.storage.from("cv").remove([dok.storage_path]);
  check("B nem tudja törölni A fájlját", !rm || rm.length === 0);
  await a.api.torolDok(dok);
  check("A törölte a fájlt; utána link sem kérhető", await throws(() => a.api.megnyitLink(dok.storage_path)));

  console.log("\nNapló");
  const naplo = await a.api.naplo(mA.id);
  check("a módosítások naplózódnak (ki, mikor)", naplo.length > 0 && naplo.every((n) => n.ki_nev !== undefined));
  check("B nem látja A naplóját", (await b.api.naplo(mA.id).catch(() => [])).length === 0);
} catch (e) {
  fails.push("váratlan hiba: " + e.message);
  console.error("\nVáratlan hiba:", e);
} finally {
  await cleanup();
}

console.log(`\n${pass} rendben, ${fails.length} hiba.`);
if (fails.length) { for (const f of fails) console.log("  ✗ " + f); process.exit(1); }
