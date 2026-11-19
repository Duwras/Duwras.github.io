/* ==========================================================================
   VEZETŐI PORTÁL — HELYI teszt (nem kell hozzá Supabase-projekt)
   PGlite (WASM Postgres) + Supabase-csonkok + a VALÓDI migráció és seed,
   rajta a böngészőben is futó vezetoi-portal/js/api.js.

   Futtatás:  cd supabase/tests && npm install && npm run test:local
   Seed: ha van private/vezetoi-seed.sql, azt használja (53 pont), különben
   a supabase/seed.example.sql-t (akkor az 53-as ellenőrzés kimarad).
   ========================================================================== */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { PGlite } from "@electric-sql/pglite";
import { createFakeSupabase, PGLITE_PARSERS } from "./fake-supabase.mjs";
import { createApi } from "../../vezetoi-portal/js/api.js";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, "../..");
const read = (p) => fs.readFileSync(path.join(ROOT, p), "utf8");

let pass = 0;
const fails = [];
function check(name, cond, extra = "") {
  if (cond) { pass++; console.log("  ✓ " + name); }
  else { fails.push(name); console.log("  ✗ " + name + (extra ? "  → " + extra : "")); }
}
async function throws(fn) {
  try { await fn(); return false; } catch { return true; }
}
const section = (t) => console.log("\n" + t);

/* --- Adatbázis felépítése --------------------------------------------- */
const db = new PGlite({ parsers: PGLITE_PARSERS });
await db.exec(read("supabase/tests/supabase-stubs.sql"));
await db.exec(read(fs.readdirSync(path.join(ROOT, "supabase/migrations")).filter((f) => f.endsWith(".sql")).sort().map((f) => "supabase/migrations/" + f).pop()));
const privateSeed = fs.existsSync(path.join(ROOT, "private/vezetoi-seed.sql"));
await db.exec(read(privateSeed ? "private/vezetoi-seed.sql" : "supabase/seed.example.sql"));
console.log(`Migráció + ${privateSeed ? "PRIVÁT seed" : "minta seed"} betöltve (PGlite ${(await db.query("show server_version")).rows[0].server_version}).`);

/* --- Felhasználók: admin + két vezető --------------------------------- */
const users = [];
async function addUser(email, nev) {
  const r = await db.query("insert into auth.users (email, raw_user_meta_data) values ($1, $2) returning id", [email, JSON.stringify({ nev })]);
  users.push({ id: r.rows[0].id, email, password: "jelszo-" + nev });
  return r.rows[0].id;
}
const ADMIN = await addUser("admin@teszt.local", "Admin Anna");
const VA = await addUser("a@teszt.local", "A Vezető");
const VB = await addUser("b@teszt.local", "B Vezető");
await db.query("update public.profiles set szerep = 'admin' where id = $1", [ADMIN]);

const blobs = new Map();
async function as(email) {
  const sb = createFakeSupabase(db, { users, blobs });
  const api = createApi(sb);
  if (email) await api.signIn(email, users.find((u) => u.email === email).password);
  return api;
}
const anon = await as(null);
const A = await as("a@teszt.local");
const B = await as("b@teszt.local");
const ADM = await as("admin@teszt.local");

/* --- Profilok és trigger ---------------------------------------------- */
section("Profilok");
check("új Auth-felhasználó → profil (vezeto) a triggerrel", (await A.me(VA))?.szerep === "vezeto" && (await A.me(VA))?.nev === "A Vezető");
check("vezető csak a saját profilját látja", (await A.vezetok()).length === 1);
check("admin minden profilt lát", (await ADM.vezetok()).length === 3);
check("vezető nem nevezheti ki magát adminná", await throws(() => A.mentProfil(VA, { szerep: "admin" })));
check("…és tényleg nem lett admin", (await ADM.me(VA)).szerep === "vezeto");
check("az utolsó aktív admint nem lehet letiltani", await throws(() => ADM.mentProfil(ADMIN, { aktiv: false })));

/* --- Munkatárs létrehozása, 53 pont ----------------------------------- */
section("Új munkatárs és bedolgozási pontok");
const sablon = await A.sablon();
const aktivSablon = sablon.filter((s) => s.aktiv);
if (privateSeed) check("a sablonban 53 aktív pont van", aktivSablon.length === 53, String(aktivSablon.length));
const mA = await A.ujMunkatars({ nev: "Teszt Elek", telefon: "+36 30 000 0000", forras: "ajanlas", vezeto_id: VA });
const mB = await B.ujMunkatars({ nev: "Próba Panna", vezeto_id: VB });
const hA = await A.haladas(mA.id);
check(`új munkatársnál mind a ${aktivSablon.length} pont bekerül`, hA.length === aktivSablon.length, `${hA.length}`);
check("mind üres (megvolt=false, nincs dátum)", hA.every((h) => h.megvolt === false && h.datum === null));
const sById = new Map(sablon.map((s) => [s.id, s]));
const ordered = [...hA].sort((x, y) => sById.get(x.sablon_id).szakasz_sorrend - sById.get(y.sablon_id).szakasz_sorrend || sById.get(x.sablon_id).sorrend - sById.get(y.sablon_id).sorrend);
check("a pontok a sablon szakaszai és sorrendje szerint állnak", ordered.map((h) => h.sablon_id).join() === aktivSablon.map((s) => s.id).join());
if (privateSeed) {
  const perSzakasz = {};
  for (const s of aktivSablon) perSzakasz[s.szakasz] = (perSzakasz[s.szakasz] || 0) + 1;
  check("szakaszok: Felvételi 11, SZB1 10, SZB2 5, SZB3 7, SZB4 7, SZB5 5, SZB6 4, SZB7 4",
    JSON.stringify(perSzakasz) === JSON.stringify({ "Felvételi": 11, "SZB 1": 10, "SZB 2": 5, "SZB 3": 7, "SZB 4": 7, "SZB 5": 5, "SZB 6": 4, "SZB 7": 4 }), JSON.stringify(perSzakasz));
}
check("kezdő karrierszint bekerül az előzményekbe", (await A.karrier(mA.id)).length === 1);

/* --- RLS: A vs B ------------------------------------------------------ */
section("RLS: két vezető");
check("A az áttekintőben csak a sajátját látja", (await A.attekintes()).map((r) => r.id).join() === mA.id);
check("A nem olvassa B munkatársát", await throws(() => A.munkatars(mB.id)));
check("A nem látja B munkatársának pontjait", (await A.haladas(mB.id)).length === 0);
check("A nem módosíthatja B munkatársát", await throws(() => A.mentMunkatars(mB.id, { nev: "Feltört" })));
check("…B munkatársa érintetlen", (await B.munkatars(mB.id)).nev === "Próba Panna");
check("A nem pipálhat B munkatársánál", await throws(() => A.mentHaladas(mB.id, aktivSablon[0].id, { megvolt: true })));
check("A nem írhat interjúválaszt B munkatársához", await throws(async () => A.mentValasz(mB.id, (await A.kerdesek())[0].id, "x")));
check("A nem vehet fel kódot B munkatársához", await throws(() => A.ujKod(mB.id, { kod: "X1" })));
check("A nem hozhat létre munkatársat B nevére", await throws(() => A.ujMunkatars({ nev: "Csempész", vezeto_id: VB })));
check("A nem rendelheti át a sajátját B-hez", await throws(() => A.mentMunkatars(mA.id, { vezeto_id: VB })));
check("A nem törölheti B munkatársát", await throws(() => A.torolMunkatars(mB.id)));
check("A nem látja B munkatársának naplóját", (await A.naplo(mB.id)).length === 0);
check("A nem írhatja a bedolgozási sablont", await throws(() => A.sablonUj({ szakasz: "X", szakasz_sorrend: 9, sorrend: 1, pont: "Hack" })));
check("A nem futtathatja az admin RPC-t", await throws(() => A.sablonMeglevokhoz(aktivSablon[0].id)));
check("A nem írhatja a beállításokat", await throws(() => A.beallitasMent("megorzes_honap", 1)));

section("RLS: bejelentkezés nélkül");
for (const tbl of ["profiles", "munkatarsak", "bedolgozas_haladas", "bedolgozas_sablon", "interju_kerdesek", "interju_valaszok", "kompetencia_tesztek", "dokumentumok", "naplo", "beallitasok", "munkatars_attekintes"]) {
  const r = await anon.sb.from(tbl).select("*");
  check(`anon: ${tbl} nem olvasható`, !!r.error || (r.data || []).length === 0, r.error ? "" : `${r.data.length} sor`);
}
check("anon nem hozhat létre munkatársat", await throws(() => anon.ujMunkatars({ nev: "Anon", vezeto_id: VA })));

section("RLS: admin");
check("admin mindkét munkatársat látja", (await ADM.attekintes()).length === 2);
check("admin látja a vezető nevét az áttekintőben", (await ADM.attekintes()).every((r) => r.vezeto_nev));

/* --- Pipálás, dátum, megjegyzés, haladás % ----------------------------- */
section("Bedolgozás mentése");
const today = new Date().toISOString().slice(0, 10);
await A.mentHaladas(mA.id, aktivSablon[0].id, { megvolt: true, datum: today, megjegyzes: "Jól ment" });
await A.mentHaladas(mA.id, aktivSablon[1].id, { megvolt: true, datum: "2026-11-01" });
await A.mentHaladas(mA.id, aktivSablon[2].id, { megvolt: true, datum: today });
await A.mentHaladas(mA.id, aktivSablon[2].id, { megvolt: false, datum: null });
const A2 = await as("a@teszt.local"); // „újratöltés”: új kliens
const h2 = new Map((await A2.haladas(mA.id)).map((h) => [h.sablon_id, h]));
check("pipa + dátum + megjegyzés megmarad újratöltés után",
  h2.get(aktivSablon[0].id).megvolt && h2.get(aktivSablon[0].id).datum === today && h2.get(aktivSablon[0].id).megjegyzes === "Jól ment");
check("átírt dátum megmarad", h2.get(aktivSablon[1].id).datum === "2026-11-01");
check("visszavont pipa megmarad visszavontnak", h2.get(aktivSablon[2].id).megvolt === false);
check("updated_by a szerveren töltődik (A)", h2.get(aktivSablon[0].id).updated_by === VA);
const att = (await A2.attekintes())[0];
check(`haladás: ${att.pont_kesz}/${att.pont_osszes} (helyesen 2/${aktivSablon.length})`, att.pont_kesz === 2 && att.pont_osszes === aktivSablon.length);
check(`aktuális szakasz = az első nyitott ponté („${att.aktualis_szakasz}”)`, att.aktualis_szakasz === aktivSablon[2].szakasz);

/* --- Interjú autosave + napló összevonás ------------------------------ */
section("Interjú");
const k0 = (await A.kerdesek())[0];
await A.mentValasz(mA.id, k0.id, "Első");
await A.mentValasz(mA.id, k0.id, "Első válasz, bővebben");
await A.mentValasz(mA.id, k0.id, "Első válasz, bővebben, javítva");
check("interjúválasz megmarad", (await A2.valaszok(mA.id)).find((v) => v.kerdes_id === k0.id)?.valasz === "Első válasz, bővebben, javítva");
const naploValasz = (await A.naplo(mA.id)).filter((n) => n.tabla === "interju_valaszok");
check("autosave nem árasztja el a naplót (beszúrás + 1 összevont módosítás)", naploValasz.length === 2, `${naploValasz.length} sor`);
await A.mentErtekeles(mA.id, { elso_benyomas: 4, kommunikacio: 5, motivacio: 3, dontes: "felvesszuk" });
check("interjú-értékelés mentődik", (await A2.ertekeles(mA.id))?.dontes === "felvesszuk");
check("értékelés 1–5 határ (6 elutasítva)", await throws(() => A.mentErtekeles(mA.id, { motivacio: 6 })));

/* --- Kompetenciateszt-kód keresés ------------------------------------- */
section("Kompetenciateszt");
await A.ujKod(mA.id, { kod: "KT-7731-QX", kitoltes_datum: today });
await A.ujKod(mA.id, { kod: "KT-8800-AB" });
const talalt = (await A.attekintes()).filter((r) => (r.kodok || "").toLowerCase().includes("7731-qx"));
check("kódra keresve megtalálható a munkatárs", talalt.length === 1 && talalt[0].id === mA.id);
check("B nem találja A kódját", (await B.attekintes()).every((r) => !(r.kodok || "").includes("KT-7731")));

/* --- Karrier ----------------------------------------------------------- */
section("Karrier");
await A.szintlepes(mA.id, { szint: "Kezdő munkatárs", datum: today, megjegyzes: "Felvétel" });
check("szintlépés frissíti az aktuális szintet", (await A.munkatars(mA.id)).karrierszint === "Kezdő munkatárs");
check("a rögzítő neve a szerveren töltődik", (await A.karrier(mA.id))[0].rogzitette_nev === "A Vezető");

/* --- Dokumentumok + Storage ------------------------------------------- */
section("Dokumentumok és Storage");
const pdf = () => new File([new Uint8Array([37, 80, 68, 70, 45, 49, 46, 52])], "Teszt_Elek_CV.pdf", { type: "application/pdf" });
check("hozzájárulás nélkül nem tölthető fel CV", await throws(() => A.feltolt(mA.id, pdf(), "oneletrajz")));
check("…és nem maradt árva fájl", (await db.query("select count(*)::int n from storage.objects")).rows[0].n === 0);
await A.mentMunkatars(mA.id, { adatkezelesi_hozzajarulas: true });
check("hozzájárulás dátuma automatikusan kitöltődik", (await A.munkatars(mA.id)).adatkezelesi_hozzajarulas_datum === today);
const doc = await A.feltolt(mA.id, pdf(), "oneletrajz");
check("CV-feltöltés működik", !!doc?.id);
check("a Storage-útvonalban nincs név (csak azonosítók)", /^[0-9a-f-]{36}\/[0-9a-f-]{36}\.pdf$/.test(doc.storage_path) && !/elek/i.test(doc.storage_path));
check("a bucket privát", (await db.query("select public from storage.buckets where id = 'cv'")).rows[0].public === false);
check("A kap aláírt linket a saját fájljához", !!(await A.megnyitLink(doc.storage_path)));
check("B NEM kap aláírt linket A fájljához", await throws(() => B.megnyitLink(doc.storage_path)));
check("anon NEM kap aláírt linket", await throws(() => anon.megnyitLink(doc.storage_path)));
check("B nem látja A dokumentumlistáját", (await B.dokumentumok(mA.id)).length === 0);
await B.sb.storage.from("cv").remove([doc.storage_path]);
check("B nem törölheti A fájlját (megmaradt)", (await db.query("select count(*)::int n from storage.objects where name = $1", [doc.storage_path])).rows[0].n === 1);
const rossz = new File([new Uint8Array([1, 2, 3])], "virus.exe", { type: "application/x-msdownload" });
check("tiltott fájltípus elutasítva", await throws(() => A.feltolt(mA.id, rossz, "egyeb")));
const nagy = new File([new Uint8Array(10 * 1024 * 1024 + 1)], "nagy.pdf", { type: "application/pdf" });
check("10 MB fölötti fájl elutasítva", await throws(() => A.feltolt(mA.id, nagy, "egyeb")));
check("B nem tölthet fel A munkatársához (útvonal-csalás)",
  !!(await B.sb.storage.from("cv").upload(`${mA.id}/hack.pdf`, pdf(), { contentType: "application/pdf" })).error);

/* --- Admin: sablon bővítése, átrendelés, letiltás ---------------------- */
section("Admin");
const uj = await ADM.sablonUj({ szakasz: "SZB 7", szakasz_sorrend: 8, sorrend: 99, pont: "Teszt: új pont" });
check("új sablonpont nem kerül automatikusan a meglévőkhöz", (await A.haladas(mA.id)).length === aktivSablon.length);
const added = await ADM.sablonMeglevokhoz(uj.id);
check(`admin hozzáadja a meglévőkhöz (${added} munkatárs)`, added === 2 && (await A.haladas(mA.id)).length === aktivSablon.length + 1);
await ADM.sablonMent(uj.id, { aktiv: false });
check("inaktív pont nem számít a haladásba", (await A.attekintes())[0].pont_osszes === aktivSablon.length);
const mA3 = await A.ujMunkatars({ nev: "Harmadik Hugó", vezeto_id: VA });
check("új munkatársnál az inaktív pont nem jön létre", (await A.haladas(mA3.id)).length === aktivSablon.length);
await ADM.atrendel(mA3.id, VB);
check("admin átrendeli A munkatársát B-hez: A már nem látja", await throws(() => A.munkatars(mA3.id)));
check("…B látja", (await B.munkatars(mA3.id)).nev === "Harmadik Hugó");
await ADM.mentProfil(VB, { aktiv: false });
check("letiltott vezető semmit nem lát (érvényes munkamenettel sem)", (await B.attekintes()).length === 0 && (await B.sablon()).length === 0);
check("letiltott vezető nem hozhat létre munkatársat", await throws(() => B.ujMunkatars({ nev: "Tiltott", vezeto_id: VB })));
await ADM.mentProfil(VB, { aktiv: true });
check("visszaengedve újra látja a sajátjait", (await B.attekintes()).length === 2);
const inv = await ADM.meghiv("c@teszt.local", "C Vezető", "http://x/");
check("admin meghív egy vezetőt → profil létrejön", !!inv?.user_id && (await ADM.vezetok()).some((v) => v.email === "c@teszt.local" && v.szerep === "vezeto"));
check("vezető nem hívhat meg senkit", await throws(() => A.meghiv("d@teszt.local", "D", "http://x/")));

/* --- Megőrzés, export, törlés ------------------------------------------ */
section("GDPR: megőrzés, export, törlés");
await B.mentMunkatars(mB.id, { statusz: "elutasitva" });
// a trigger a kliens felől nem engedi átírni a státuszváltás idejét → szimuláció trigger nélkül
await db.transaction(async (tx) => {
  await tx.exec("set local session_replication_role = replica");
  await tx.query("update public.munkatarsak set statusz_valtozott = now() - interval '7 months' where id = $1", [mB.id]);
});
check("a kliens nem írhatja át a státuszváltás idejét", await (async () => { await B.mentMunkatars(mB.id, { statusz_valtozott: "2000-01-01T00:00:00Z" }); return !(await B.munkatars(mB.id)).statusz_valtozott.startsWith("2000"); })());
const jav = await ADM.torlesreJavasolt(6);
check("elutasított, 6 hónapnál régebbi → törlésre javasolt", jav.map((r) => r.id).join() === mB.id);
check("vezető a törlésre javasolt listában sem lát idegent", (await A.torlesreJavasolt(6)).length === 0);
const ex = await A.export(mA.id);
check("export: alapadatok, interjú, bedolgozás, kódok, dokumentumok, napló",
  ex.munkatars.nev === "Teszt Elek" && ex.interju.valaszok.length === 1 && ex.bedolgozas.length === aktivSablon.length + 1 &&
  ex.kompetenciatesztek.length === 2 && ex.dokumentumok.length === 1 && ex.naplo.length > 0);
check("B nem exportálhatja A munkatársát", await throws(() => B.export(mA.id)));

const objPath = doc.storage_path;
await A.torolMunkatars(mA.id);
check("munkatárs törölve", await throws(() => ADM.munkatars(mA.id)));
check("a törléssel a fájl is törlődött a Storage-ból", (await db.query("select count(*)::int n from storage.objects where name = $1", [objPath])).rows[0].n === 0 && !blobs.has("cv/" + objPath));
check("a kapcsolódó sorok is törlődtek (kaszkád)",
  (await db.query("select (select count(*) from bedolgozas_haladas where munkatars_id=$1) + (select count(*) from dokumentumok where munkatars_id=$1) + (select count(*) from kompetencia_tesztek where munkatars_id=$1) + (select count(*) from naplo where munkatars_id=$1) as n", [mA.id])).rows[0].n === 0);
const delLog = (await db.query("select * from naplo where munkatars_id is null and tabla = 'munkatarsak' and muvelet = 'DELETE'")).rows;
check("a törlésről név nélküli naplósor marad", delLog.length === 1 && !JSON.stringify(delLog[0].valtozas).includes("Teszt"));

/* --- Összegzés -------------------------------------------------------- */
console.log(`\n${pass} rendben, ${fails.length} hiba.`);
if (fails.length) {
  console.log("Hibás:\n  - " + fails.join("\n  - "));
  process.exit(1);
}
