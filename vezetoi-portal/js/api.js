/* ==========================================================================
   VEZETŐI PORTÁL — adatréteg
   Minden adatbázis- és Storage-hívás itt van, egy supabase-js klienst kap.
   Böngészőben és Node-ban (tesztek: supabase/tests/) is ugyanez fut.
   A jogosultságot NEM ez a fájl adja, hanem az adatbázis RLS-e: ha itt
   valami rossz lenne, a szerver akkor is elutasítja.
   ========================================================================== */

export const BUCKET = "cv";
export const MAX_MERET = 10 * 1024 * 1024;
export const MIME = {
  "application/pdf": "pdf",
  "application/msword": "doc",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "docx",
  "image/jpeg": "jpg",
  "image/png": "png",
};
const KIT_MIME = { pdf: "application/pdf", doc: "application/msword", docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document", jpg: "image/jpeg", jpeg: "image/jpeg", png: "image/png" };

export class ApiError extends Error {
  constructor(message, code, raw) {
    super(message);
    this.code = code || "";
    this.raw = raw;
  }
}

/* Magyar, emberi hibaüzenet a gyakori esetekre. */
function humanize(e) {
  const msg = String(e?.message || e || "Ismeretlen hiba");
  const code = e?.code || e?.statusCode || "";
  if (/row-level security|violates row-level|permission denied|42501/i.test(msg + code))
    return new ApiError("Ehhez nincs jogosultságod (vagy a fiókod le van tiltva).", "jog", e);
  if (/Invalid login credentials/i.test(msg)) return new ApiError("Hibás e-mail-cím vagy jelszó.", "login", e);
  if (/Email not confirmed/i.test(msg)) return new ApiError("Az e-mail-cím még nincs megerősítve. Nézd meg a meghívó levelet.", "login", e);
  if (/Failed to fetch|NetworkError|network/i.test(msg)) return new ApiError("Nincs kapcsolat a szerverrel. Ellenőrizd a netet.", "net", e);
  if (/PGRST116|JSON object requested|0 rows/i.test(msg + code)) return new ApiError("Nem található (vagy nincs hozzá jogosultságod).", "nincs", e);
  if (/Legalább egy aktív admin/i.test(msg)) return new ApiError(msg, "admin", e);
  if (/duplicate key|23505/i.test(msg + code)) return new ApiError("Ilyen már van.", "dupla", e);
  if (/check constraint|23514/i.test(msg + code)) return new ApiError("Érvénytelen érték: " + msg, "ertek", e);
  return new ApiError(msg, String(code), e);
}

const ok = (res) => {
  if (res.error) throw humanize(res.error);
  return res.data;
};

export function fajlEllenorzes(file) {
  const ext = String(file.name || "").split(".").pop().toLowerCase();
  const mime = MIME[file.type] ? file.type : KIT_MIME[ext];
  if (!mime) return { hiba: "Csak PDF, DOC, DOCX, JPG vagy PNG tölthető fel." };
  if (!file.size) return { hiba: "Üres fájl." };
  if (file.size > MAX_MERET) return { hiba: "A fájl legfeljebb 10 MB lehet." };
  return { mime, ext: MIME[mime] };
}

export function createApi(sb) {
  const t = (name) => sb.from(name);

  const api = {
    sb,

    /* ---------------- Auth ---------------- */
    async session() {
      return ok(await sb.auth.getSession()).session;
    },
    onAuth(cb) {
      return sb.auth.onAuthStateChange((event, session) => cb(event, session));
    },
    async signIn(email, password) {
      return ok(await sb.auth.signInWithPassword({ email: email.trim(), password }));
    },
    async signOut() {
      await sb.auth.signOut();
    },
    async resetPassword(email, redirectTo) {
      return ok(await sb.auth.resetPasswordForEmail(email.trim(), { redirectTo }));
    },
    async setPassword(password) {
      return ok(await sb.auth.updateUser({ password }));
    },

    /* ---------------- Saját profil, listák ---------------- */
    async me(uid) {
      return ok(await t("profiles").select("*").eq("id", uid).maybeSingle());
    },
    async vezetok() {
      return ok(await t("profiles").select("*").order("nev", { ascending: true }));
    },
    async sablon() {
      return ok(await t("bedolgozas_sablon").select("*").order("szakasz_sorrend", { ascending: true }).order("sorrend", { ascending: true }));
    },
    async kerdesek() {
      return ok(await t("interju_kerdesek").select("*").order("sorrend", { ascending: true }));
    },
    async szintek() {
      return ok(await t("karrierszintek").select("*").order("sorrend", { ascending: true }));
    },
    async beallitasok() {
      const rows = ok(await t("beallitasok").select("kulcs,ertek"));
      return Object.fromEntries(rows.map((r) => [r.kulcs, r.ertek]));
    },

    /* ---------------- Áttekintő ---------------- */
    async attekintes() {
      return ok(await t("munkatars_attekintes").select("*"));
    },

    /* ---------------- Munkatárs ---------------- */
    async munkatars(id) {
      return ok(await t("munkatarsak").select("*").eq("id", id).single());
    },
    async ujMunkatars(row) {
      return ok(await t("munkatarsak").insert(row).select("*").single());
    },
    async mentMunkatars(id, patch) {
      return ok(await t("munkatarsak").update(patch).eq("id", id).select("*").single());
    },
    /* Törlés: előbb a fájlok a Storage-ból, csak utána a sor (a kaszkád a
       többi táblát viszi). Ha a fájltörlés nem sikerül, a sor megmarad. */
    async torolMunkatars(id) {
      const docs = ok(await t("dokumentumok").select("storage_path").eq("munkatars_id", id));
      /* Hálózati / szerverhiba esetén az ok() dob, és a sor megmarad. Ha egy
         fájl már nincs meg, az nem hiba: a Storage és a tábla jogosultsága
         ugyanaz, így ha a sort törölhetjük, a fájlt is törölhettük. */
      if (docs.length) ok(await sb.storage.from(BUCKET).remove(docs.map((d) => d.storage_path)));
      const del = ok(await t("munkatarsak").delete().eq("id", id).select("id"));
      if (!del.length) throw new ApiError("Nem sikerült törölni (nincs jogosultság?).", "jog");
      return true;
    },

    /* ---------------- Bedolgozás ---------------- */
    async haladas(mid) {
      return ok(await t("bedolgozas_haladas").select("*").eq("munkatars_id", mid));
    },
    async mentHaladas(mid, sablonId, patch) {
      return ok(
        await t("bedolgozas_haladas")
          .upsert({ munkatars_id: mid, sablon_id: sablonId, ...patch }, { onConflict: "munkatars_id,sablon_id" })
          .select("*")
          .single()
      );
    },

    /* ---------------- Interjú ---------------- */
    async valaszok(mid) {
      return ok(await t("interju_valaszok").select("*").eq("munkatars_id", mid));
    },
    async mentValasz(mid, kerdesId, valasz) {
      return ok(
        await t("interju_valaszok")
          .upsert({ munkatars_id: mid, kerdes_id: kerdesId, valasz }, { onConflict: "munkatars_id,kerdes_id" })
          .select("*")
          .single()
      );
    },
    async ertekeles(mid) {
      return ok(await t("interju_ertekeles").select("*").eq("munkatars_id", mid).maybeSingle());
    },
    async mentErtekeles(mid, patch) {
      return ok(await t("interju_ertekeles").upsert({ munkatars_id: mid, ...patch }, { onConflict: "munkatars_id" }).select("*").single());
    },

    /* ---------------- Kompetenciateszt ---------------- */
    async kodok(mid) {
      return ok(await t("kompetencia_tesztek").select("*").eq("munkatars_id", mid).order("created_at", { ascending: false }));
    },
    async ujKod(mid, row) {
      return ok(await t("kompetencia_tesztek").insert({ munkatars_id: mid, ...row }).select("*").single());
    },
    async torolKod(id) {
      ok(await t("kompetencia_tesztek").delete().eq("id", id));
    },

    /* ---------------- Dokumentumok ---------------- */
    async dokumentumok(mid) {
      return ok(await t("dokumentumok").select("*").eq("munkatars_id", mid).order("feltoltve", { ascending: false }));
    },
    /* Útvonal: <munkatars_id>/<véletlen uuid>.<kiterjesztés> — név nincs benne,
       így a signed URL-ben sem lesz személyes adat. */
    async feltolt(mid, file, tipus) {
      const chk = fajlEllenorzes(file);
      if (chk.hiba) throw new ApiError(chk.hiba, "fajl");
      const path = `${mid}/${crypto.randomUUID()}.${chk.ext}`;
      ok(await sb.storage.from(BUCKET).upload(path, file, { contentType: chk.mime, upsert: false, cacheControl: "0" }));
      const res = await t("dokumentumok")
        .insert({ munkatars_id: mid, tipus, storage_path: path, fajlnev: String(file.name || "fajl").slice(0, 200), meret: file.size, mime: chk.mime })
        .select("*")
        .single();
      if (res.error) {
        await sb.storage.from(BUCKET).remove([path]);
        throw humanize(res.error);
      }
      return res.data;
    },
    /* 60 másodpercig érvényes, aláírt link */
    async megnyitLink(path) {
      return ok(await sb.storage.from(BUCKET).createSignedUrl(path, 60)).signedUrl;
    },
    async torolDok(doc) {
      ok(await sb.storage.from(BUCKET).remove([doc.storage_path]));
      const del = ok(await t("dokumentumok").delete().eq("id", doc.id).select("id"));
      if (!del.length) throw new ApiError("Nem sikerült törölni (nincs jogosultság?).", "jog");
    },

    /* ---------------- Karrier ---------------- */
    async karrier(mid) {
      return ok(await t("karrierszint_tortenet").select("*").eq("munkatars_id", mid).order("datum", { ascending: false }).order("id", { ascending: false }));
    },
    async szintlepes(mid, row) {
      return ok(await t("karrierszint_tortenet").insert({ munkatars_id: mid, ...row }).select("*").single());
    },

    /* ---------------- Napló ---------------- */
    async naplo(mid, limit = 200) {
      return ok(await t("naplo").select("*").eq("munkatars_id", mid).order("mikor", { ascending: false }).limit(limit));
    },

    /* ---------------- Admin ---------------- */
    async mentProfil(id, patch) {
      return ok(await t("profiles").update(patch).eq("id", id).select("*").single());
    },
    /* Meghívás és kitiltás az Edge Functionön át (ott van a service role key,
       a böngészőben soha). */
    async adminFunkcio(body) {
      const res = await sb.functions.invoke("vezeto-admin", { body });
      if (res.error) {
        let msg = res.error.message || "A szerverfüggvény nem érhető el.";
        try {
          const j = await res.error.context?.json?.();
          if (j?.error) msg = j.error;
        } catch { /* nincs részletes hiba */ }
        throw new ApiError(msg, "fn", res.error);
      }
      return res.data;
    },
    async meghiv(email, nev, redirectTo) {
      return api.adminFunkcio({ action: "invite", email: email.trim(), nev: nev.trim(), redirectTo });
    },
    /* Letiltás: az aktiv=false azonnal elzár mindent (RLS). A kitiltás
       (ban) a funkción át megy; ha az nincs telepítve, az aktiv kapcsoló
       akkor is véd. */
    async aktivitas(id, aktiv) {
      const row = await api.mentProfil(id, { aktiv });
      let ban = true;
      try {
        await api.adminFunkcio({ action: aktiv ? "enable" : "disable", user_id: id });
      } catch {
        ban = false;
      }
      return { row, ban };
    },
    async sablonUj(row) {
      return ok(await t("bedolgozas_sablon").insert(row).select("*").single());
    },
    async sablonMent(id, patch) {
      return ok(await t("bedolgozas_sablon").update(patch).eq("id", id).select("*").single());
    },
    async sablonMeglevokhoz(id) {
      return ok(await sb.rpc("sablon_pont_meglevokhoz", { p_sablon_id: id }));
    },
    async kerdesUj(row) {
      return ok(await t("interju_kerdesek").insert(row).select("*").single());
    },
    async kerdesMent(id, patch) {
      return ok(await t("interju_kerdesek").update(patch).eq("id", id).select("*").single());
    },
    async szintUj(row) {
      return ok(await t("karrierszintek").insert(row).select("*").single());
    },
    async szintMent(id, patch) {
      return ok(await t("karrierszintek").update(patch).eq("id", id).select("*").single());
    },
    async beallitasMent(kulcs, ertek) {
      return ok(await t("beallitasok").upsert({ kulcs, ertek }, { onConflict: "kulcs" }).select("*").single());
    },
    async atrendel(mid, vezetoId) {
      return api.mentMunkatars(mid, { vezeto_id: vezetoId });
    },
    async torlesreJavasolt(honap) {
      const cut = new Date();
      cut.setMonth(cut.getMonth() - Math.max(1, Number(honap) || 6));
      return ok(
        await t("munkatarsak")
          .select("id,nev,statusz,statusz_valtozott,vezeto_id")
          .in("statusz", ["elutasitva", "nem_folytatja"])
          .lt("statusz_valtozott", cut.toISOString())
          .order("statusz_valtozott", { ascending: true })
      );
    },

    /* ---------------- Export (adatkérési kérelemhez) ---------------- */
    async export(mid) {
      const [m, haladas, valaszok, ertekeles, kodok, docs, karrier, naplo, sablon, kerdesek] = await Promise.all([
        api.munkatars(mid), api.haladas(mid), api.valaszok(mid), api.ertekeles(mid), api.kodok(mid),
        api.dokumentumok(mid), api.karrier(mid), api.naplo(mid, 1000), api.sablon(), api.kerdesek(),
      ]);
      const sMap = new Map(sablon.map((s) => [s.id, s]));
      const kMap = new Map(kerdesek.map((k) => [k.id, k]));
      return {
        exportalva: new Date().toISOString(),
        munkatars: m,
        interju: {
          valaszok: valaszok.map((v) => ({ kategoria: kMap.get(v.kerdes_id)?.kategoria, kerdes: kMap.get(v.kerdes_id)?.kerdes, valasz: v.valasz, modositva: v.updated_at })),
          ertekeles,
        },
        bedolgozas: haladas
          .map((h) => ({ ...h, s: sMap.get(h.sablon_id) }))
          .sort((a, b) => (a.s?.szakasz_sorrend - b.s?.szakasz_sorrend) || (a.s?.sorrend - b.s?.sorrend))
          .map((h) => ({ szakasz: h.s?.szakasz, pont: h.s?.pont, megvolt: h.megvolt, datum: h.datum, megjegyzes: h.megjegyzes })),
        kompetenciatesztek: kodok.map(({ kod, kitoltes_datum, megjegyzes, created_at }) => ({ kod, kitoltes_datum, megjegyzes, rogzitve: created_at })),
        dokumentumok: docs.map(({ tipus, fajlnev, meret, mime, feltoltve }) => ({ tipus, fajlnev, meret, mime, feltoltve })),
        karrierszint_tortenet: karrier.map(({ szint, datum, megjegyzes, rogzitette_nev }) => ({ szint, datum, megjegyzes, rogzitette: rogzitette_nev })),
        naplo: naplo.map(({ mikor, ki_nev, tabla, muvelet, valtozas }) => ({ mikor, ki: ki_nev, tabla, muvelet, valtozas })),
      };
    },
  };
  return api;
}
