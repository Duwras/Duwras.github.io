// =============================================================================
//  VEZETŐI PORTÁL — admin szerverfüggvény (Supabase Edge Function, Deno)
//  - invite:  vezető meghívása e-mailben (Supabase Auth meghívó levél)
//  - disable: vezető kitiltása (profil inaktív + Auth ban → nem tud belépni)
//  - enable:  visszaengedés
//
//  Csak bejelentkezett, AKTÍV ADMIN hívhatja. A service role key csak itt, a
//  függvény környezeti változójában van (a Supabase automatikusan adja:
//  SUPABASE_SERVICE_ROLE_KEY). A böngészőbe és a repóba SOHA nem kerül.
//
//  Telepítés: docs/vezetoi-portal-setup.md → „Edge Function”.
// =============================================================================

import { createClient } from "jsr:@supabase/supabase-js@2.118.0";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
// Vesszővel elválasztva, pl. "https://ertekpontpenzugyek.hu,http://localhost:5173"
const ALLOWED_ORIGINS = (Deno.env.get("VP_ALLOWED_ORIGINS") ?? "https://ertekpontpenzugyek.hu")
  .split(",").map((s) => s.trim()).filter(Boolean);

function cors(origin: string | null) {
  const allow = origin && ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];
  return {
    "Access-Control-Allow-Origin": allow,
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Vary": "Origin",
  };
}

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

Deno.serve(async (req) => {
  const headers = { ...cors(req.headers.get("origin")), "Content-Type": "application/json" };
  const reply = (status: number, body: unknown) => new Response(JSON.stringify(body), { status, headers });

  if (req.method === "OPTIONS") return new Response("ok", { headers });
  if (req.method !== "POST") return reply(405, { error: "Csak POST." });

  // 1) Ki hív? A hívó saját tokenjével kérdezzük le (RLS érvényes rá).
  const authHeader = req.headers.get("Authorization") ?? "";
  if (!authHeader.startsWith("Bearer ")) return reply(401, { error: "Nincs bejelentkezve." });
  const asCaller = createClient(SUPABASE_URL, ANON_KEY, {
    global: { headers: { Authorization: authHeader } },
    auth: { persistSession: false },
  });
  const { data: userData, error: userErr } = await asCaller.auth.getUser();
  if (userErr || !userData?.user) return reply(401, { error: "Érvénytelen munkamenet." });

  const admin = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } });
  const { data: me } = await admin.from("profiles").select("szerep, aktiv").eq("id", userData.user.id).maybeSingle();
  if (!me || me.szerep !== "admin" || !me.aktiv) return reply(403, { error: "Csak admin teheti meg." });

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return reply(400, { error: "Hibás kérés." });
  }

  // 2) Művelet
  if (body.action === "invite") {
    const email = String(body.email ?? "").trim().toLowerCase();
    const nev = String(body.nev ?? "").trim().slice(0, 120);
    if (!EMAIL.test(email)) return reply(400, { error: "Érvénytelen e-mail-cím." });
    // A meghívó link csak a saját oldalunkra mutathat.
    const redirectTo = String(body.redirectTo ?? "");
    const okRedirect = ALLOWED_ORIGINS.some((o) => redirectTo.startsWith(o + "/"));
    const { data, error } = await admin.auth.admin.inviteUserByEmail(email, {
      data: { nev },
      redirectTo: okRedirect ? redirectTo : `${ALLOWED_ORIGINS[0]}/vezetoi-portal/`,
    });
    if (error) {
      const msg = /already been registered|already registered/i.test(error.message)
        ? "Ez az e-mail-cím már regisztrálva van."
        : error.message;
      return reply(400, { error: msg });
    }
    if (nev && data.user) await admin.from("profiles").update({ nev }).eq("id", data.user.id);
    return reply(200, { ok: true, user_id: data.user?.id });
  }

  if (body.action === "disable" || body.action === "enable") {
    const userId = String(body.user_id ?? "");
    if (!UUID.test(userId)) return reply(400, { error: "Hibás azonosító." });
    if (userId === userData.user.id && body.action === "disable") return reply(400, { error: "Saját magadat nem tilthatod ki." });
    const aktiv = body.action === "enable";
    const { error: pErr } = await admin.from("profiles").update({ aktiv }).eq("id", userId);
    if (pErr) return reply(400, { error: pErr.message });
    // ban: a már kiadott tokenek lejártáig (max. 1 óra) az RLS (aktiv=false) véd,
    // utána frissíteni sem tud.
    const { error } = await admin.auth.admin.updateUserById(userId, { ban_duration: aktiv ? "none" : "876000h" });
    if (error) return reply(400, { error: error.message });
    return reply(200, { ok: true });
  }

  return reply(400, { error: "Ismeretlen művelet." });
});
