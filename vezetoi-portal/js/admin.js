/* ==========================================================================
   VEZETŐI PORTÁL — admin felület
   Vezetők meghívása / letiltása, átrendelés, bedolgozási sablon,
   interjúkérdések, karrierszintek, beállítások, törlésre javasoltak.
   (A jogosultságot itt is az adatbázis dönti el: nem admin hívásra az RLS
   elutasít, akkor is, ha valaki megkerüli ezt a felületet.)
   ========================================================================== */

import { h, put, icon, I, toast, errMsg, confirmDialog, fmtDate, safeUrl } from "./dom.js";
import { STATUSZ, DEFAULT_TAJEKOZTATO } from "./konst.js";
import { field } from "./attekinto.js";

const PARTS = [
  ["vezetok", "Vezetők"],
  ["atrendeles", "Átrendelés"],
  ["sablon", "Bedolgozási sablon"],
  ["kerdesek", "Interjúkérdések"],
  ["szintek", "Karrierszintek"],
  ["beallitasok", "Beállítások"],
  ["torles", "Törlésre javasolt"],
];

export async function renderAdmin(ctx, view, part, alive) {
  if (!PARTS.some(([k]) => k === part)) part = "vezetok";
  await ctx.loadLists();
  if (!alive()) return;
  const panel = h("section", { class: "vp-panel", role: "tabpanel", "aria-labelledby": "atab-" + part });
  put(view, 
    h("div", { class: "vp-head" }, h("h1", { class: "vp-h1" }, "Admin")),
    h("nav", { class: "vp-tabs", "aria-label": "Admin részek" },
      h("div", { class: "vp-tabs__list", role: "tablist" },
        PARTS.map(([k, l]) => h("a", { href: "#/admin/" + k, id: "atab-" + k, role: "tab", class: "vp-tab", "aria-selected": String(k === part) }, l)))),
    panel);
  const F = { vezetok, atrendeles, sablon, kerdesek, szintek, beallitasok, torles };
  await F[part](ctx, panel, alive);
}

const rerender = (ctx, part) => ctx.go("#/admin/" + part);

/* --- Vezetők ------------------------------------------------------------- */
async function vezetok(ctx, panel, alive) {
  const rows = await ctx.api.attekintes();
  if (!alive()) return;
  const db = (id) => rows.filter((r) => r.vezeto_id === id).length;

  const email = h("input", { class: "vp-input", type: "email", required: true, autocomplete: "off" });
  const nev = h("input", { class: "vp-input", autocomplete: "off" });
  const msg = h("p", { class: "vp-form-err", role: "status" });
  const form = h("form", { class: "vp-inline-form", novalidate: true },
    field("E-mail-cím *", email), field("Név", nev),
    h("button", { type: "submit", class: "btn" }, icon(I.plus, 16), h("span", { class: "btn__label" }, "Meghívás")));
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    if (!email.value.includes("@")) return email.focus();
    msg.textContent = "Meghívó küldése…";
    try {
      await ctx.api.meghiv(email.value, nev.value, location.origin + location.pathname);
      toast("Meghívó elküldve. A vezető e-mailben kap linket a jelszó beállításához.");
      rerender(ctx, "vezetok");
    } catch (err) {
      msg.textContent = `${errMsg(err)} — Ha a szerverfüggvény még nincs telepítve: Supabase → Authentication → Users → „Invite user” (lásd a setup doksit).`;
    }
  });

  put(panel, 
    h("div", { class: "vp-callout" },
      h("p", null, "Regisztráció nincs: vezető csak meghívóval kerül be. A letiltott vezető azonnal semmit nem lát, és nem is tud belépni.")),
    form, msg,
    h("ul", { class: "vp-list" }, ctx.vezetok.map((v) => {
      const self = v.id === ctx.me.id;
      const szerep = h("select", { class: "vp-input vp-input--sm", "aria-label": `${v.nev} szerepe`, disabled: self },
        h("option", { value: "vezeto" }, "vezető"), h("option", { value: "admin" }, "admin"));
      szerep.value = v.szerep;
      szerep.addEventListener("change", async () => {
        try { await ctx.api.mentProfil(v.id, { szerep: szerep.value }); toast("Szerep módosítva."); } catch (e) { toast(errMsg(e), "err"); szerep.value = v.szerep; }
      });
      const nevIn = h("input", { class: "vp-input vp-input--sm", value: v.nev, "aria-label": "Név" });
      nevIn.addEventListener("change", async () => {
        try { await ctx.api.mentProfil(v.id, { nev: nevIn.value.trim() }); toast("Név mentve."); } catch (e) { toast(errMsg(e), "err"); }
      });
      const tilt = h("button", { type: "button", class: "vp-btn" + (v.aktiv ? " vp-btn--danger" : ""), disabled: self }, v.aktiv ? "Letiltás" : "Visszaengedés");
      tilt.addEventListener("click", async () => {
        if (v.aktiv && !(await confirmDialog({ title: "Vezető letiltása", text: `${v.nev || v.email} azonnal kizárásra kerül. A munkatársai megmaradnak; rendeld át őket egy másik vezetőhöz.`, ok: "Letiltás", danger: true }))) return;
        try {
          const r = await ctx.api.aktivitas(v.id, !v.aktiv);
          toast(r.ban ? "Kész." : "Kész. (A belépés tiltásához telepítsd a vezeto-admin függvényt; addig is semmit nem lát.)");
          rerender(ctx, "vezetok");
        } catch (e) { toast(errMsg(e), "err"); }
      });
      return h("li", { class: "vp-list__row vp-list__row--wrap" + (v.aktiv ? "" : " is-off") },
        h("div", { class: "vp-list__main" },
          nevIn,
          h("p", { class: "vp-list__meta" }, h("span", null, v.email), h("span", null, `${db(v.id)} munkatárs`), v.aktiv ? null : h("span", { class: "vp-warn" }, "letiltva"), self ? h("span", { class: "chip" }, "te") : null)),
        szerep, tilt);
    })));
}

/* --- Átrendelés ---------------------------------------------------------- */
async function atrendeles(ctx, panel, alive) {
  const rows = (await ctx.api.attekintes()).sort((a, b) => a.nev.localeCompare(b.nev, "hu"));
  if (!alive()) return;
  const mt = h("select", { class: "vp-input" }, rows.map((r) => h("option", { value: r.id }, `${r.nev} – ${ctx.vezetoNev(r.vezeto_id)}`)));
  const vez = h("select", { class: "vp-input" }, ctx.vezetok.filter((v) => v.aktiv).map((v) => h("option", { value: v.id }, v.nev || v.email)));
  const form = h("form", { class: "vp-inline-form", novalidate: true },
    field("Munkatárs", mt), field("Új vezető", vez),
    h("button", { type: "submit", class: "btn" }, h("span", { class: "btn__label" }, "Átrendelés")));
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    try { await ctx.api.atrendel(mt.value, vez.value); toast("Átrendelve."); rerender(ctx, "atrendeles"); } catch (err) { toast(errMsg(err), "err"); }
  });
  put(panel, 
    h("p", { class: "vp-lead" }, "Ha egy vezető kilép, a munkatársait itt rendeld át. (Az adatlapon, a fejlécben is átrendelheted.)"),
    rows.length ? form : h("p", { class: "vp-list__empty" }, "Még nincs munkatárs."));
}

/* --- Szerkeszthető, rendezhető lista (sablon, kérdések, szintek) --------- */
function editableList(ctx, { items, groupKey, groupLabel, textKey, onSave, onMove, onToggle }) {
  const groups = new Map();
  for (const it of items) {
    const g = groupKey ? it[groupKey] : "";
    if (!groups.has(g)) groups.set(g, []);
    groups.get(g).push(it);
  }
  return [...groups].map(([g, list]) => h("fieldset", { class: "vp-group" },
    groupKey ? h("legend", { class: "vp-group__title" }, groupLabel ? groupLabel(g, list) : g) : null,
    h("ol", { class: "vp-edit" }, list.map((it, i) => {
      const txt = h("input", { class: "vp-input vp-input--sm", value: it[textKey], "aria-label": "Szöveg" });
      txt.addEventListener("change", async () => {
        if (!txt.value.trim()) { txt.value = it[textKey]; return; }
        try { await onSave(it, { [textKey]: txt.value.trim() }); it[textKey] = txt.value.trim(); toast("Mentve."); } catch (e) { toast(errMsg(e), "err"); }
      });
      const up = h("button", { type: "button", class: "vp-icon-btn", "aria-label": "Feljebb", disabled: i === 0 }, icon(I.up));
      const down = h("button", { type: "button", class: "vp-icon-btn", "aria-label": "Lejjebb", disabled: i === list.length - 1 }, icon(I.down));
      up.addEventListener("click", () => onMove(list, i, i - 1));
      down.addEventListener("click", () => onMove(list, i, i + 1));
      const akt = h("label", { class: "vp-check vp-check--sm" }, h("input", { type: "checkbox", class: "vp-check__box", checked: it.aktiv }), h("span", null, "aktív"));
      akt.querySelector("input").addEventListener("change", (e) => onToggle(it, e.target.checked));
      return h("li", { class: "vp-edit__row" + (it.aktiv ? "" : " is-off") }, h("span", { class: "vp-edit__n" }, String(i + 1)), txt, up, down, akt);
    }))));
}

/* két elem sorrendjének cseréje */
async function swap(list, i, j, save, key = "sorrend") {
  const a = list[i], b = list[j];
  if (!a || !b) return;
  let ka = a[key], kb = b[key];
  if (ka === kb) { ka = i + 1; kb = j + 1; }
  await save(a, { [key]: kb });
  await save(b, { [key]: ka });
}

/* --- Bedolgozási sablon --------------------------------------------------- */
async function sablon(ctx, panel) {
  const items = ctx.sablon;
  const szakaszok = [...new Map(items.map((s) => [s.szakasz, s.szakasz_sorrend])).entries()].sort((a, b) => a[1] - b[1]);
  const szSel = h("select", { class: "vp-input" }, szakaszok.map(([n]) => h("option", { value: n }, n)), h("option", { value: "__uj" }, "+ új szakasz…"));
  const ujSz = h("input", { class: "vp-input", placeholder: "pl. SZB 8", hidden: true });
  szSel.addEventListener("change", () => { ujSz.hidden = szSel.value !== "__uj"; });
  const pont = h("input", { class: "vp-input", required: true, autocomplete: "off" });
  const form = h("form", { class: "vp-inline-form", novalidate: true },
    field("Szakasz", h("div", { class: "vp-stack" }, szSel, ujSz)), field("Új pont *", pont),
    h("button", { type: "submit", class: "btn" }, icon(I.plus, 16), h("span", { class: "btn__label" }, "Pont hozzáadása")));
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    if (!pont.value.trim()) return pont.focus();
    const isNew = szSel.value === "__uj";
    const sz = isNew ? ujSz.value.trim() : szSel.value;
    if (!sz) return ujSz.focus();
    const same = items.filter((s) => s.szakasz === sz);
    const szakasz_sorrend = isNew ? Math.max(0, ...items.map((s) => s.szakasz_sorrend)) + 1 : same[0].szakasz_sorrend;
    const sorrend = Math.max(0, ...same.map((s) => s.sorrend)) + 1;
    try {
      const row = await ctx.api.sablonUj({ szakasz: sz, szakasz_sorrend, sorrend, pont: pont.value.trim() });
      const n = (await ctx.api.attekintes()).filter((r) => ["jelolt", "bedolgozas", "aktiv"].includes(r.statusz)).length;
      if (n && (await confirmDialog({ title: "Hozzáadjam a meglévőkhöz is?", text: `Az új pont az új munkatársaknál automatikusan megjelenik. Hozzáadjam a meglévő ${n} (jelölt, bedolgozás alatt álló és aktív) munkatárshoz is, üresen?`, ok: "Igen, adjuk hozzá" }))) {
        const added = await ctx.api.sablonMeglevokhoz(row.id);
        toast(`Hozzáadva ${added} munkatárshoz.`);
      } else toast("Pont hozzáadva.");
      rerender(ctx, "sablon");
    } catch (err) { toast(errMsg(err), "err"); }
  });

  const save = (it, patch) => ctx.api.sablonMent(it.id, patch);
  const aktivN = items.filter((s) => s.aktiv).length;
  put(panel, 
    h("p", { class: "vp-lead" }, `${aktivN} aktív pont. Az inaktív pont az új munkatársaknál nem jelenik meg, és nem számít a haladásba (a korábbi pipák megmaradnak). Törlés helyett inaktiváld.`),
    form,
    ...editableList(ctx, {
      items, groupKey: "szakasz", textKey: "pont",
      groupLabel: (g, list) => `${g} · ${list.filter((s) => s.aktiv).length} aktív pont`,
      onSave: save,
      onMove: async (list, i, j) => { try { await swap(list, i, j, save); rerender(ctx, "sablon"); } catch (e) { toast(errMsg(e), "err"); } },
      onToggle: async (it, v) => { try { await save(it, { aktiv: v }); toast(v ? "Aktiválva." : "Inaktiválva."); rerender(ctx, "sablon"); } catch (e) { toast(errMsg(e), "err"); } },
    }));
}

/* --- Interjúkérdések ------------------------------------------------------ */
async function kerdesek(ctx, panel) {
  const items = ctx.kerdesek;
  const kats = [...new Set(items.map((k) => k.kategoria))];
  const kat = h("input", { class: "vp-input", list: "kat-list", required: true, autocomplete: "off" });
  const dl = h("datalist", { id: "kat-list" }, kats.map((k) => h("option", { value: k })));
  const kerdes = h("input", { class: "vp-input", required: true, autocomplete: "off" });
  const form = h("form", { class: "vp-inline-form", novalidate: true },
    field("Kategória *", h("div", null, kat, dl)), field("Kérdés *", kerdes),
    h("button", { type: "submit", class: "btn" }, icon(I.plus, 16), h("span", { class: "btn__label" }, "Kérdés hozzáadása")));
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    if (!kat.value.trim() || !kerdes.value.trim()) return;
    try {
      await ctx.api.kerdesUj({ kategoria: kat.value.trim(), kerdes: kerdes.value.trim(), sorrend: Math.max(0, ...items.map((k) => k.sorrend)) + 1 });
      toast("Kérdés hozzáadva.");
      rerender(ctx, "kerdesek");
    } catch (err) { toast(errMsg(err), "err"); }
  });
  const save = (it, patch) => ctx.api.kerdesMent(it.id, patch);
  put(panel, 
    h("p", { class: "vp-lead" }, "A kérdések teszt jelleggel kerültek be – nyugodtan írd át őket. Az inaktív kérdés új interjúnál nem jelenik meg, a régi válaszok megmaradnak."),
    form,
    ...editableList(ctx, {
      items, groupKey: "kategoria", textKey: "kerdes",
      onSave: save,
      onMove: async (list, i, j) => { try { await swap(list, i, j, save); rerender(ctx, "kerdesek"); } catch (e) { toast(errMsg(e), "err"); } },
      onToggle: async (it, v) => { try { await save(it, { aktiv: v }); rerender(ctx, "kerdesek"); } catch (e) { toast(errMsg(e), "err"); } },
    }));
}

/* --- Karrierszintek ------------------------------------------------------- */
async function szintek(ctx, panel) {
  const items = ctx.szintek;
  const nev = h("input", { class: "vp-input", required: true, autocomplete: "off" });
  const form = h("form", { class: "vp-inline-form", novalidate: true },
    field("Új szint *", nev),
    h("button", { type: "submit", class: "btn" }, icon(I.plus, 16), h("span", { class: "btn__label" }, "Hozzáadás")));
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    if (!nev.value.trim()) return nev.focus();
    try { await ctx.api.szintUj({ nev: nev.value.trim(), sorrend: Math.max(0, ...items.map((s) => s.sorrend)) + 1 }); rerender(ctx, "szintek"); } catch (err) { toast(errMsg(err), "err"); }
  });
  const save = (it, patch) => ctx.api.szintMent(it.id, patch);
  put(panel, 
    h("div", { class: "vp-callout vp-callout--warn" }, h("p", null, "TODO: a listát az OVB Karrierterv alapján kell kiegészíteni. A sorrend a legördülő menük sorrendje (alulról felfelé haladva).")),
    form,
    ...editableList(ctx, {
      items, textKey: "nev",
      onSave: save,
      onMove: async (list, i, j) => { try { await swap(list, i, j, save); rerender(ctx, "szintek"); } catch (e) { toast(errMsg(e), "err"); } },
      onToggle: async (it, v) => { try { await save(it, { aktiv: v }); rerender(ctx, "szintek"); } catch (e) { toast(errMsg(e), "err"); } },
    }));
}

/* --- Beállítások ---------------------------------------------------------- */
async function beallitasok(ctx, panel) {
  const b = ctx.beall;
  const honap = h("input", { class: "vp-input", type: "number", min: 1, max: 60, value: String(b.megorzes_honap ?? 6) });
  const kt = h("input", { class: "vp-input", type: "url", value: b.kompetenciateszt_url === "TODO" ? "" : b.kompetenciateszt_url || "", placeholder: "https://… (üresen: „Link hamarosan”)" });
  const taj = h("textarea", { class: "vp-input vp-textarea", rows: 12 });
  taj.value = typeof b.adatkezelesi_tajekoztato === "string" ? b.adatkezelesi_tajekoztato : DEFAULT_TAJEKOZTATO;
  const links = (Array.isArray(b.gyorslinkek) ? b.gyorslinkek : []).map((l) => ({ ...l }));
  const linkBox = h("div", { class: "vp-stack" });
  const drawLinks = () => put(linkBox, ...links.map((l, i) => {
    const lab = h("input", { class: "vp-input vp-input--sm", value: l.label, "aria-label": "Felirat" });
    const url = h("input", { class: "vp-input vp-input--sm", type: "url", value: l.url, "aria-label": "Cím" });
    lab.addEventListener("input", () => { l.label = lab.value; });
    url.addEventListener("input", () => { l.url = url.value; });
    const del = h("button", { type: "button", class: "vp-icon-btn", "aria-label": "Link törlése" }, icon(I.trash));
    del.addEventListener("click", () => { links.splice(i, 1); drawLinks(); });
    return h("div", { class: "vp-linkrow" }, lab, url, del);
  }), h("button", { type: "button", class: "vp-btn", onclick: () => { links.push({ label: "", url: "https://" }); drawLinks(); } }, icon(I.plus), "Link hozzáadása"));
  drawLinks();

  const save = h("button", { type: "submit", class: "btn" }, h("span", { class: "btn__label" }, "Beállítások mentése"));
  const form = h("form", { class: "vp-form vp-form--sheet", novalidate: true },
    h("fieldset", { class: "vp-group" }, h("legend", { class: "vp-group__title" }, "Adatmegőrzés"),
      field("Törlésre javasolt ennyi hónap után (elutasított / nem folytatja)", honap)),
    h("fieldset", { class: "vp-group" }, h("legend", { class: "vp-group__title" }, "Kompetenciateszt"),
      field("A teszt linkje", kt, "Üresen hagyva a portálon „Link hamarosan” jelenik meg.")),
    h("fieldset", { class: "vp-group" }, h("legend", { class: "vp-group__title" }, "Gyorslinkek a fejlécben"), linkBox),
    h("fieldset", { class: "vp-group" }, h("legend", { class: "vp-group__title" }, "Adatkezelési tájékoztató jelölteknek"),
      field("Szöveg (TODO: Ricsi/OVB jóváhagyás)", taj)),
    h("div", { class: "vp-dialog__actions" }, save));
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const bad = links.find((l) => !l.label.trim() || !safeUrl(l.url, location.href));
    if (bad) return toast("Minden linknek legyen felirata és érvényes https:// címe.", "err");
    if (kt.value && !safeUrl(kt.value)) return toast("A kompetenciateszt linkje https:// címmel kezdődjön.", "err");
    save.disabled = true;
    try {
      await ctx.api.beallitasMent("megorzes_honap", Math.max(1, Math.min(60, Number(honap.value) || 6)));
      await ctx.api.beallitasMent("kompetenciateszt_url", kt.value.trim() || "TODO");
      await ctx.api.beallitasMent("gyorslinkek", links.map((l) => ({ label: l.label.trim(), url: l.url.trim() })));
      await ctx.api.beallitasMent("adatkezelesi_tajekoztato", taj.value);
      await ctx.loadLists();
      toast("Beállítások mentve.");
    } catch (err) { toast(errMsg(err), "err"); } finally { save.disabled = false; }
  });
  put(panel, form);
}

/* --- Törlésre javasolt ---------------------------------------------------- */
async function torles(ctx, panel, alive) {
  const honap = Number(ctx.beall.megorzes_honap) || 6;
  const rows = await ctx.api.torlesreJavasolt(honap);
  if (!alive()) return;
  put(panel, 
    h("p", { class: "vp-lead" }, `Elutasított vagy „nem folytatja” státuszú személyek, akiknek a státusza ${honap} hónapnál régebben változott. Törlés előtt nézd meg, kell-e még valami; a törlés a fájlokat is viszi.`),
    rows.length
      ? h("ul", { class: "vp-list" }, rows.map((r) => {
          const del = h("button", { type: "button", class: "vp-btn vp-btn--danger" }, icon(I.trash), "Törlés");
          del.addEventListener("click", async () => {
            if (!(await confirmDialog({ title: "Végleges törlés", text: `${r.nev} összes adata és fájlja törlődik. Nem vonható vissza.`, ok: "Törlés", danger: true, typeToConfirm: r.nev }))) return;
            try { await ctx.api.torolMunkatars(r.id); toast("Törölve."); rerender(ctx, "torles"); } catch (e) { toast(errMsg(e), "err"); }
          });
          return h("li", { class: "vp-list__row" },
            h("div", { class: "vp-list__main" },
              h("a", { href: `#/m/${r.id}/alap`, class: "vp-list__title vp-a" }, r.nev),
              h("p", { class: "vp-list__meta" }, h("span", { class: "pill pill--" + r.statusz }, STATUSZ[r.statusz]), h("span", null, "Státusz óta: " + fmtDate(r.statusz_valtozott)), h("span", null, ctx.vezetoNev(r.vezeto_id)))),
            del);
        }))
      : h("p", { class: "vp-list__empty" }, "Nincs törlésre javasolt személy."));
}
