/* ==========================================================================
   VEZETŐI PORTÁL — áttekintő: munkatárs-kártyák, szűrők, új jelölt
   ========================================================================== */

import { h, put, icon, I, bar, monogram, norm, relDate, store, toast, errMsg, openDialog } from "./dom.js";
import { STATUSZ, STATUSZ_SOR, FORRAS } from "./konst.js";

const LS = "vp-attekinto";

export async function renderAttekinto(ctx, view, alive) {
  put(view, h("p", { class: "vp-loading" }, "Betöltés…"));
  const rows = await ctx.api.attekintes();
  if (!alive()) return;

  let st = { q: "", statusz: "", vezeto: "", rend: "aktivitas" };
  try { st = { ...st, ...JSON.parse(store.get(LS) || "{}") }; } catch { /* alap */ }
  const save = () => store.set(LS, JSON.stringify({ statusz: st.statusz, vezeto: st.vezeto, rend: st.rend }));

  /* --- Fejléc + szűrők -------------------------------------------------- */
  const count = h("span", { class: "vp-h1__count" });
  const q = h("input", {
    class: "vp-input vp-search__input", type: "search", placeholder: "Keresés névre vagy kompetenciateszt-kódra",
    "aria-label": "Keresés névre vagy kompetenciateszt-kódra", autocomplete: "off", spellcheck: "false", value: st.q,
  });
  const chips = h("div", { class: "vp-chips", role: "group", "aria-label": "Szűrés státusz szerint" });
  const vezSel = ctx.isAdmin
    ? h("select", { class: "vp-input vp-input--sm", "aria-label": "Szűrés vezető szerint" },
        h("option", { value: "" }, "Minden vezető"),
        ctx.vezetok.map((v) => h("option", { value: v.id }, v.nev || v.email)))
    : null;
  if (vezSel) vezSel.value = st.vezeto;
  const rendSel = h("select", { class: "vp-input vp-input--sm", "aria-label": "Rendezés" },
    h("option", { value: "aktivitas" }, "Utolsó aktivitás"),
    h("option", { value: "nev" }, "Név (A–Z)"),
    h("option", { value: "haladas" }, "Haladás (kevés → sok)"),
    h("option", { value: "uj" }, "Legújabb felvitel"));
  rendSel.value = st.rend;

  const grid = h("div", { class: "vp-grid" });
  const status = h("p", { class: "vp-status", role: "status", "aria-live": "polite" });

  const newBtn = h("button", { type: "button", class: "btn vp-new" }, icon(I.plus, 18), h("span", { class: "btn__label" }, "Új jelölt"));
  newBtn.addEventListener("click", () => ujJeloltDialog(ctx));

  put(view, 
    h("div", { class: "vp-head" },
      h("h1", { class: "vp-h1" }, "Munkatársak", count),
      newBtn),
    h("div", { class: "vp-filters" },
      h("div", { class: "vp-search" }, icon(I.search, 18), q),
      h("div", { class: "vp-filters__row" }, chips, h("div", { class: "vp-filters__sel" }, vezSel, rendSel))),
    status,
    grid
  );

  function draw() {
    const toks = norm(st.q).split(" ").filter(Boolean);
    const base = rows.filter((r) => !st.vezeto || r.vezeto_id === st.vezeto);
    const matchQ = (r) => !toks.length || toks.every((t) => norm(r.nev).includes(t) || norm(r.kodok).includes(t));
    const counts = Object.fromEntries(STATUSZ_SOR.map((s) => [s, base.filter((r) => r.statusz === s && matchQ(r)).length]));

    put(chips, 
      ...["", ...STATUSZ_SOR].map((s) => {
        const n = s ? counts[s] : base.filter(matchQ).length;
        const b = h("button", { type: "button", class: "vp-chip" + (s ? " vp-chip--" + s : ""), "aria-pressed": String(st.statusz === s) },
          s ? STATUSZ[s] : "Mind", h("span", { class: "vp-chip__n" }, String(n)));
        b.addEventListener("click", () => { st.statusz = s; save(); draw(); });
        return b;
      })
    );

    let list = base.filter((r) => matchQ(r) && (!st.statusz || r.statusz === st.statusz));
    const by = {
      aktivitas: (a, b) => String(b.utolso_aktivitas || "").localeCompare(String(a.utolso_aktivitas || "")),
      nev: (a, b) => a.nev.localeCompare(b.nev, "hu"),
      haladas: (a, b) => (a.pont_osszes ? a.pont_kesz / a.pont_osszes : 0) - (b.pont_osszes ? b.pont_kesz / b.pont_osszes : 0),
      uj: (a, b) => String(b.created_at).localeCompare(String(a.created_at)),
    }[st.rend] || (() => 0);
    list = list.sort(by);

    count.textContent = String(list.length);
    put(grid, ...list.map((r) => card(ctx, r, toks)));
    if (!rows.length) {
      put(grid, h("div", { class: "vp-empty" },
        h("h2", null, "Még nincs senki felvéve"),
        h("p", null, "Az „Új jelölt” gombbal vihetsz fel valakit. Minden jelölt saját mappát kap: alapadatok, interjú, bedolgozás, dokumentumok."),
        h("button", { type: "button", class: "btn", onclick: () => ujJeloltDialog(ctx) }, h("span", { class: "btn__label" }, "Új jelölt felvétele"))));
      status.textContent = "";
    } else {
      status.textContent = list.length ? "" : "Nincs találat a szűrésre.";
    }
  }

  q.addEventListener("input", () => { st.q = q.value; draw(); });
  rendSel.addEventListener("change", () => { st.rend = rendSel.value; save(); draw(); });
  if (vezSel) vezSel.addEventListener("change", () => { st.vezeto = vezSel.value; save(); draw(); });
  draw();
}

function card(ctx, r, toks) {
  const pct = r.pont_osszes ? Math.round((r.pont_kesz / r.pont_osszes) * 100) : 0;
  const kodHit = toks.length && r.kodok && toks.every((t) => norm(r.kodok).includes(t)) && !toks.every((t) => norm(r.nev).includes(t))
    ? r.kodok.split(" ").find((k) => toks.every((t) => norm(k).includes(t)))
    : null;
  return h("a", { class: "mcard", href: `#/m/${r.id}` },
    h("div", { class: "mcard__top" },
      h("span", { class: "avatar avatar--" + r.statusz, "aria-hidden": "true" }, monogram(r.nev)),
      h("div", { class: "mcard__who" },
        h("h2", { class: "mcard__name" }, r.nev),
        h("p", { class: "mcard__meta" }, r.karrierszint, ctx.isAdmin ? h("span", null, " · " + (r.vezeto_nev || ctx.vezetoNev(r.vezeto_id))) : null)),
      h("span", { class: "pill pill--" + r.statusz }, STATUSZ[r.statusz] || r.statusz)),
    kodHit ? h("p", { class: "mcard__kod" }, "Kód: ", h("code", null, kodHit)) : null,
    h("div", { class: "mcard__prog" },
      h("div", { class: "mcard__row" },
        h("span", null, "Bedolgozás"),
        h("strong", null, `${r.pont_kesz}/${r.pont_osszes}`, h("span", { class: "mcard__pct" }, ` · ${pct}%`))),
      bar(r.pont_kesz, r.pont_osszes, `${r.nev} bedolgozása`)),
    h("div", { class: "mcard__foot" },
      h("span", { class: "chip" }, r.pont_osszes && r.pont_kesz === r.pont_osszes ? "Kész ✓" : r.aktualis_szakasz || "–"),
      h("span", { class: "mcard__last" }, "Utolsó aktivitás: " + relDate(r.utolso_aktivitas))));
}

/* --- Új jelölt ----------------------------------------------------------- */
export function ujJeloltDialog(ctx) {
  const f = {
    nev: h("input", { class: "vp-input", required: true, autocomplete: "off", maxlength: 120 }),
    telefon: h("input", { class: "vp-input", type: "tel", autocomplete: "off" }),
    email: h("input", { class: "vp-input", type: "email", autocomplete: "off" }),
    forras: h("select", { class: "vp-input" }, h("option", { value: "" }, "–"), Object.entries(FORRAS).map(([k, v]) => h("option", { value: k }, v))),
    ajanlo_nev: h("input", { class: "vp-input", autocomplete: "off" }),
    statusz: h("select", { class: "vp-input" }, ["jelolt", "bedolgozas", "aktiv"].map((k) => h("option", { value: k }, STATUSZ[k]))),
    vezeto_id: ctx.isAdmin
      ? h("select", { class: "vp-input" }, ctx.vezetok.filter((v) => v.aktiv).map((v) => h("option", { value: v.id }, v.nev || v.email)))
      : null,
  };
  if (f.vezeto_id) f.vezeto_id.value = ctx.me.id;
  const ajanloRow = field("Ajánló neve", f.ajanlo_nev);
  ajanloRow.hidden = true;
  f.forras.addEventListener("change", () => { ajanloRow.hidden = f.forras.value !== "ajanlas"; });
  const err = h("p", { class: "vp-form-err", role: "alert" });
  const submit = h("button", { type: "submit", class: "btn" }, h("span", { class: "btn__label" }, "Felvétel és mappa megnyitása"));

  const form = h("form", { class: "vp-form", novalidate: true },
    field("Név *", f.nev),
    h("div", { class: "vp-form__2" }, field("Telefon", f.telefon), field("E-mail", f.email)),
    h("div", { class: "vp-form__2" }, field("Honnan jött", f.forras), field("Státusz", f.statusz)),
    ajanloRow,
    f.vezeto_id ? field("Vezető", f.vezeto_id) : null,
    h("p", { class: "vp-hint" }, `A bedolgozás mind a ${ctx.sablon.filter((s) => s.aktiv).length} pontja automatikusan, üresen bekerül. A többi adatot a mappában töltheted ki.`),
    err,
    h("div", { class: "vp-dialog__actions" }, submit));

  const dlg = openDialog("Új jelölt", form);
  f.nev.focus();
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    if (!f.nev.value.trim()) { err.textContent = "A név kötelező."; f.nev.focus(); return; }
    submit.disabled = true;
    try {
      const row = {
        nev: f.nev.value.trim(),
        telefon: f.telefon.value.trim() || null,
        email: f.email.value.trim() || null,
        forras: f.forras.value || null,
        ajanlo_nev: f.forras.value === "ajanlas" ? f.ajanlo_nev.value.trim() || null : null,
        statusz: f.statusz.value,
        vezeto_id: f.vezeto_id ? f.vezeto_id.value : ctx.me.id,
      };
      const m = await ctx.api.ujMunkatars(row);
      dlg.close();
      toast(`${m.nev} felvéve.`);
      ctx.go(`#/m/${m.id}/alap`);
    } catch (e2) {
      err.textContent = errMsg(e2);
      submit.disabled = false;
    }
  });
}

export function field(label, input, hint) {
  return h("label", { class: "vp-field" }, h("span", { class: "vp-label" }, label), input, hint ? h("span", { class: "vp-hint" }, hint) : null);
}
