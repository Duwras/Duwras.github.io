/* ==========================================================================
   VEZETŐI PORTÁL — munkatárs adatlapja („mappa”), 7 fül
   Minden mező automatikusan mentődik (debounce), a mentés állapota látszik.
   ========================================================================== */

import { h, put, icon, I, bar, monogram, fmtDate, fmtSize, today, debounce, toast, errMsg, confirmDialog, openDialog, saveState, safeUrl } from "./dom.js";
import { STATUSZ, STATUSZ_SOR, FORRAS, MNB, DONTES, DOK_TIPUS, TABLA, MEZO, DEFAULT_TAJEKOZTATO } from "./konst.js";
import { field } from "./attekinto.js";
import { fajlEllenorzes } from "./api.js";
import { exportJson, exportPdf } from "./export.js";

const TABS = [
  ["alap", "Alapadatok"],
  ["interju", "Interjú"],
  ["bedolgozas", "Bedolgozás"],
  ["kompetencia", "Kompetenciateszt"],
  ["dokumentumok", "Dokumentumok"],
  ["karrier", "Karrier"],
  ["naplo", "Napló"],
];

export async function renderAdatlap(ctx, view, id, tab, alive) {
  if (!TABS.some(([k]) => k === tab)) tab = "alap";
  put(view, h("p", { class: "vp-loading" }, "Betöltés…"));
  let m = await ctx.api.munkatars(id);
  if (!alive()) return;

  const saver = saveState();
  const panel = h("section", { class: "vp-panel", id: "vp-panel", role: "tabpanel", "aria-labelledby": "tab-" + tab, tabindex: "-1" });
  const setM = (row) => { m = row; head.refresh(); };

  /* --- Fejléc ----------------------------------------------------------- */
  const head = (() => {
    const avatar = h("span", { class: "avatar avatar--lg", "aria-hidden": "true" });
    const name = h("h1", { class: "vp-h1 vp-person__name" });
    const meta = h("p", { class: "vp-person__meta" });
    const statusz = h("select", { class: "vp-input vp-input--sm vp-person__status", "aria-label": "Státusz" },
      STATUSZ_SOR.map((s) => h("option", { value: s }, STATUSZ[s])));
    statusz.addEventListener("change", async () => {
      saver.busy();
      try { setM(await ctx.api.mentMunkatars(id, { statusz: statusz.value })); saver.done(); } catch (e) { saver.fail(e); statusz.value = m.statusz; }
    });
    const vez = ctx.isAdmin
      ? h("select", { class: "vp-input vp-input--sm", "aria-label": "Vezető (átrendelés)" },
          ctx.vezetok.map((v) => h("option", { value: v.id }, (v.nev || v.email) + (v.aktiv ? "" : " (letiltva)"))))
      : null;
    if (vez) vez.addEventListener("change", async () => {
      const uj = ctx.vezetok.find((v) => v.id === vez.value);
      if (!(await confirmDialog({ title: "Átrendelés", text: `${m.nev} átkerül ${uj?.nev || "a kiválasztott vezetőhöz"}. A korábbi vezető ezután nem látja.`, ok: "Átrendelés" }))) { vez.value = m.vezeto_id; return; }
      saver.busy();
      try { setM(await ctx.api.atrendel(id, vez.value)); saver.done(); toast("Átrendelve."); } catch (e) { saver.fail(e); vez.value = m.vezeto_id; }
    });

    const menu = h("div", { class: "vp-actions" },
      h("button", { type: "button", class: "vp-btn", onclick: () => tajekoztato(ctx) }, icon(I.shield), "Adatkezelési tájékoztató"),
      h("button", { type: "button", class: "vp-btn", onclick: () => exportJson(ctx, id).catch((e) => toast(errMsg(e), "err")) }, icon(I.download), "Export (JSON)"),
      h("button", { type: "button", class: "vp-btn", onclick: () => exportPdf(ctx, id).catch((e) => toast(errMsg(e), "err")) }, icon(I.print), "Export (PDF)"),
      h("button", { type: "button", class: "vp-btn vp-btn--danger", onclick: () => torles(ctx, m) }, icon(I.trash), "Törlés"));

    const el = h("header", { class: "vp-person" },
      h("a", { href: "#/", class: "vp-back" }, icon(I.back), "Áttekintő"),
      h("div", { class: "vp-person__row" },
        avatar,
        h("div", { class: "vp-person__who" }, name, meta),
        h("div", { class: "vp-person__ctrl" }, statusz, vez, saver.el)),
      menu);
    return {
      el,
      refresh() {
        avatar.textContent = monogram(m.nev);
        avatar.className = "avatar avatar--lg avatar--" + m.statusz;
        name.textContent = m.nev;
        put(meta, 
          m.karrierszint,
          ctx.isAdmin ? " · " + ctx.vezetoNev(m.vezeto_id) : "",
          m.adatkezelesi_hozzajarulas ? h("span", { class: "vp-ok" }, " · hozzájárulás ✓") : h("span", { class: "vp-warn" }, " · nincs adatkezelési hozzájárulás"));
        statusz.value = m.statusz;
        if (vez) vez.value = m.vezeto_id;
      },
    };
  })();
  head.refresh();

  const tabs = h("nav", { class: "vp-tabs", "aria-label": "Adatlap fülei" },
    h("div", { class: "vp-tabs__list", role: "tablist" },
      TABS.map(([k, label]) => h("a", {
        href: `#/m/${id}/${k}`, id: "tab-" + k, role: "tab", class: "vp-tab", "aria-selected": String(k === tab), "aria-controls": "vp-panel",
      }, label))));

  put(view, head.el, tabs, panel);
  const cur = tabs.querySelector("[aria-selected=true]");
  if (cur && cur.scrollIntoView) cur.scrollIntoView({ block: "nearest", inline: "center" });

  put(panel, h("p", { class: "vp-loading" }, "Betöltés…"));
  const T = { alap: tabAlap, interju: tabInterju, bedolgozas: tabBedolgozas, kompetencia: tabKompetencia, dokumentumok: tabDokumentumok, karrier: tabKarrier, naplo: tabNaplo };
  await T[tab]({ ctx, id, get m() { return m; }, setM, saver, panel, alive });
}

/* ======================================================================
   1) Alapadatok
   ====================================================================== */
async function tabAlap({ ctx, id, m, setM, saver, panel }) {
  let patch = {};
  const flush = async () => {
    const p = patch;
    patch = {};
    if (!Object.keys(p).length) return;
    saver.busy();
    try { setM(await ctx.api.mentMunkatars(id, p)); saver.done(); } catch (e) { saver.fail(e); }
  };
  const later = debounce(flush, 800);

  const inp = (key, attrs = {}) => {
    const el = h("input", { class: "vp-input", id: "f-" + key, autocomplete: "off", ...attrs });
    el.value = m[key] ?? "";
    el.addEventListener("input", () => {
      let v = el.value.trim();
      if (attrs.type === "number") v = v === "" ? null : Number(v);
      else if (attrs.type === "date") v = v || null;
      else v = v || null;
      if (key === "nev" && !v) { el.setCustomValidity("A név kötelező."); el.reportValidity(); return; }
      el.setCustomValidity("");
      patch[key] = v;
      attrs.type === "date" ? later.flush() : later();
    });
    el.addEventListener("blur", () => later.flush());
    return el;
  };
  const sel = (key, opts, empty = true) => {
    const el = h("select", { class: "vp-input", id: "f-" + key },
      empty ? h("option", { value: "" }, "–") : null,
      Object.entries(opts).map(([k, v]) => h("option", { value: k }, v)));
    el.value = m[key] ?? "";
    el.addEventListener("change", () => { patch[key] = el.value || null; later.flush(); });
    return el;
  };
  const chk = (key, label) => {
    const el = h("input", { type: "checkbox", class: "vp-check__box", id: "f-" + key, checked: !!m[key] });
    el.addEventListener("change", () => { patch[key] = el.checked; later.flush(); });
    return h("label", { class: "vp-check", for: "f-" + key }, el, h("span", null, label));
  };

  const ev = inp("szuletesi_ev", { type: "number", inputmode: "numeric", min: 1930, max: 2030, placeholder: "pl. 2003" });
  const kor = h("span", { class: "vp-hint" });
  const korUpd = () => {
    const y = Number(ev.value);
    kor.textContent = y > 1900 ? `≈ ${new Date().getFullYear() - y} éves` : "Az életkort ebből számoljuk.";
  };
  ev.addEventListener("input", korUpd);
  korUpd();

  const forras = sel("forras", FORRAS);
  const ajanlo = field("Ajánló neve", inp("ajanlo_nev"));
  const ajUpd = () => { ajanlo.hidden = forras.value !== "ajanlas"; };
  forras.addEventListener("change", ajUpd);
  ajUpd();

  const szintOpts = Object.fromEntries([...new Set([m.karrierszint, ...ctx.szintek.filter((s) => s.aktiv).map((s) => s.nev)])].map((s) => [s, s]));

  const hozz = h("input", { type: "checkbox", class: "vp-check__box", id: "f-hozz", checked: !!m.adatkezelesi_hozzajarulas });
  const hozzDatum = inp("adatkezelesi_hozzajarulas_datum", { type: "date" });
  hozz.addEventListener("change", () => {
    patch.adatkezelesi_hozzajarulas = hozz.checked;
    if (hozz.checked && !hozzDatum.value) { hozzDatum.value = today(); patch.adatkezelesi_hozzajarulas_datum = hozzDatum.value; }
    later.flush();
  });

  const megj = h("textarea", { class: "vp-input vp-textarea", id: "f-megjegyzes", rows: 4 });
  megj.value = m.megjegyzes ?? "";
  megj.addEventListener("input", () => { patch.megjegyzes = megj.value || null; later(); });
  megj.addEventListener("blur", () => later.flush());

  const karrierszintSel = sel("karrierszint", szintOpts, false);
  karrierszintSel.disabled = true;

  put(panel, 
    h("form", { class: "vp-form vp-form--sheet", novalidate: true, onsubmit: (e) => e.preventDefault() },
      group("Elérhetőség",
        field("Név *", inp("nev", { required: true, maxlength: 120 })),
        h("div", { class: "vp-form__2" },
          field("Telefon", inp("telefon", { type: "tel", inputmode: "tel" })),
          field("E-mail", inp("email", { type: "email", inputmode: "email" })))),
      group("Háttér",
        h("div", { class: "vp-form__2" },
          field("Születési év", ev, kor),
          field("Lakhely", inp("lakhely", { placeholder: "csak település" }), "Pontos lakcímet ne írj.")),
        h("div", { class: "vp-form__2" },
          field("Honnan származik", inp("honnan_szarmazik")),
          field("Jelenlegi munka", inp("jelenlegi_munka"))),
        field("Iskola, tanulmányok", inp("iskola_tanulmanyok", { placeholder: "hol tanul, milyen szakon" })),
        chk("erettsegi_van", "Van érettségije (az MNB-vizsgához kell)")),
      group("Felvétel",
        h("div", { class: "vp-form__2" }, field("Honnan jött", forras), ajanlo),
        h("div", { class: "vp-form__3" },
          field("Interjú dátuma", inp("interju_datum", { type: "date" })),
          field("Felvétel dátuma", inp("felvetel_datum", { type: "date" })),
          field("OVB-belépés", inp("ovb_belepes_datum", { type: "date" })))),
      group("Karrier és vizsga",
        h("div", { class: "vp-form__2" },
          field("Karrierszint", karrierszintSel, h("a", { href: `#/m/${id}/karrier`, class: "vp-a" }, "Szintlépés rögzítése a Karrier fülön →")),
          field("MNB-vizsga", sel("mnb_vizsga_statusz", MNB, false)))),
      group("Adatkezelés",
        h("div", { class: "vp-consent" + (m.adatkezelesi_hozzajarulas ? " is-ok" : "") },
          h("label", { class: "vp-check", for: "f-hozz" }, hozz, h("span", null, h("strong", null, "Adatkezelési hozzájárulás megvan"))),
          field("Dátuma", hozzDatum),
          h("p", { class: "vp-hint" }, "Hozzájárulás nélkül nem tölthető fel önéletrajz. ",
            h("button", { type: "button", class: "vp-a", onclick: () => tajekoztato(ctx) }, "Tájékoztató megmutatása")))),
      group("Megjegyzés", megj)));
}

const group = (title, ...kids) => h("fieldset", { class: "vp-group" }, h("legend", { class: "vp-group__title" }, title), kids);

/* ======================================================================
   2) Interjú
   ====================================================================== */
async function tabInterju({ ctx, id, panel, alive }) {
  const [valaszok, ert] = await Promise.all([ctx.api.valaszok(id), ctx.api.ertekeles(id)]);
  if (!alive()) return;
  const vMap = new Map(valaszok.map((v) => [v.kerdes_id, v]));
  const kerdesek = ctx.kerdesek.filter((k) => k.aktiv || vMap.has(k.id));
  const groups = new Map();
  for (const k of kerdesek) {
    if (!groups.has(k.kategoria)) groups.set(k.kategoria, []);
    groups.get(k.kategoria).push(k);
  }

  let n = 0;
  const blocks = [...groups].map(([kat, list]) => h("fieldset", { class: "vp-group" },
    h("legend", { class: "vp-group__title" }, kat),
    list.map((k) => {
      n++;
      const s = saveState();
      const ta = h("textarea", { class: "vp-input vp-textarea", id: "q-" + k.id, rows: 3 });
      ta.value = vMap.get(k.id)?.valasz ?? "";
      const grow = () => { ta.style.height = "auto"; ta.style.height = Math.min(ta.scrollHeight + 2, 600) + "px"; };
      let last = ta.value;
      const save = debounce(async () => {
        if (ta.value === last) return;
        const v = ta.value;
        s.busy();
        try { await ctx.api.mentValasz(id, k.id, v); last = v; s.done(); } catch (e) { s.fail(e); }
      }, 900);
      ta.addEventListener("input", () => { grow(); save(); });
      ta.addEventListener("blur", () => save.flush());
      requestAnimationFrame(grow);
      return h("div", { class: "vp-q" },
        h("label", { class: "vp-q__label", for: "q-" + k.id }, h("span", { class: "vp-q__n" }, String(n)), h("span", null, k.kerdes, k.aktiv ? null : h("em", { class: "vp-hint" }, " (inaktív kérdés)"))),
        ta,
        h("div", { class: "vp-q__foot" }, s.el));
    })));

  /* Értékelés */
  const s = saveState();
  const cur = { ...(ert || {}) };
  const save = async (patch) => {
    Object.assign(cur, patch);
    s.busy();
    try { await ctx.api.mentErtekeles(id, patch); s.done(); } catch (e) { s.fail(e); }
  };
  const rating = (key, label) => h("fieldset", { class: "vp-rate" },
    h("legend", { class: "vp-rate__label" }, label),
    h("div", { class: "vp-seg" }, [1, 2, 3, 4, 5].map((v) => {
      const r = h("input", { type: "radio", name: "r-" + key, id: `r-${key}-${v}`, value: String(v), class: "vp-seg__in", checked: cur[key] === v });
      r.addEventListener("change", () => save({ [key]: v }));
      return [r, h("label", { for: `r-${key}-${v}`, class: "vp-seg__lab" }, String(v))];
    })));
  const dontes = h("fieldset", { class: "vp-rate" },
    h("legend", { class: "vp-rate__label" }, "Döntés"),
    h("div", { class: "vp-seg vp-seg--wide" }, Object.entries(DONTES).map(([k, v]) => {
      const r = h("input", { type: "radio", name: "r-dontes", id: "r-d-" + k, value: k, class: "vp-seg__in", checked: cur.dontes === k });
      r.addEventListener("change", () => save({ dontes: k }));
      return [r, h("label", { for: "r-d-" + k, class: "vp-seg__lab vp-seg__lab--" + k }, v)];
    })));
  const megj = h("textarea", { class: "vp-input vp-textarea", id: "ert-megj", rows: 3 });
  megj.value = cur.megjegyzes ?? "";
  const mSave = debounce(() => save({ megjegyzes: megj.value || null }), 900);
  megj.addEventListener("input", mSave);
  megj.addEventListener("blur", () => mSave.flush());

  put(panel, 
    h("p", { class: "vp-lead" }, "Írd a válaszokat a kérdések alá – minden automatikusan mentődik."),
    ...blocks,
    h("fieldset", { class: "vp-group vp-group--accent" },
      h("legend", { class: "vp-group__title" }, "Interjú-értékelés"),
      h("div", { class: "vp-rates" }, rating("elso_benyomas", "Első benyomás"), rating("kommunikacio", "Kommunikáció"), rating("motivacio", "Motiváció")),
      dontes,
      field("Megjegyzés", megj),
      h("div", { class: "vp-q__foot" }, s.el)));
}

/* ======================================================================
   3) Bedolgozás
   ====================================================================== */
async function tabBedolgozas({ ctx, id, panel, alive }) {
  const rows = await ctx.api.haladas(id);
  if (!alive()) return;
  const hMap = new Map(rows.map((r) => [r.sablon_id, r]));
  const sablon = ctx.sablon.filter((s) => s.aktiv);
  const szakaszok = [];
  for (const s of sablon) {
    let g = szakaszok.find((x) => x.nev === s.szakasz);
    if (!g) szakaszok.push((g = { nev: s.szakasz, pontok: [] }));
    g.pontok.push(s);
  }
  const state = (s) => hMap.get(s.id) || { megvolt: false, datum: null, megjegyzes: null };

  const total = h("div", { class: "vp-prog" });
  const updTotal = () => {
    const kesz = sablon.filter((s) => state(s).megvolt).length;
    const pct = sablon.length ? Math.round((kesz / sablon.length) * 100) : 0;
    put(total, 
      h("div", { class: "vp-prog__row" }, h("strong", { class: "vp-prog__big" }, `${kesz}/${sablon.length}`), h("span", null, `${pct}% kész`)),
      bar(kesz, sablon.length, "Bedolgozás összesen"));
    for (const g of szakaszok) g.upd && g.upd();
  };

  const firstOpen = szakaszok.find((g) => g.pontok.some((s) => !state(s).megvolt));
  const list = szakaszok.map((g) => {
    const sum = h("span", { class: "vp-phase__sum" });
    const mini = h("span", { class: "vp-phase__mini" });
    g.upd = () => {
      const k = g.pontok.filter((s) => state(s).megvolt).length;
      const pct = Math.round((k / g.pontok.length) * 100);
      sum.textContent = `${k}/${g.pontok.length} · ${pct}%`;
      put(mini, bar(k, g.pontok.length, `${g.nev} haladás`));
      det.classList.toggle("is-done", k === g.pontok.length);
    };
    const det = h("details", { class: "vp-phase", open: g === firstOpen },
      h("summary", { class: "vp-phase__head" }, h("span", { class: "vp-phase__name" }, g.nev), mini, sum),
      h("ol", { class: "vp-points" }, g.pontok.map((s, i) => pointRow(ctx, id, s, i + 1, state(s), (row) => { hMap.set(s.id, row); updTotal(); }))));
    return det;
  });

  put(panel, 
    h("p", { class: "vp-lead" }, "Pipáld ki, ami már elhangzott. Pipáláskor a mai dátum kerül be (átírható), megjegyzést is írhatsz."),
    total,
    h("div", { class: "vp-phases" }, list));
  updTotal();
}

function pointRow(ctx, mid, s, n, st, onSaved) {
  const sv = saveState();
  const box = h("input", { type: "checkbox", class: "vp-pt__box", id: "pt-" + s.id, checked: !!st.megvolt });
  const date = h("input", { type: "date", class: "vp-input vp-input--sm", "aria-label": `${s.pont} – dátum`, value: st.datum || "" });
  const note = h("input", { type: "text", class: "vp-input vp-input--sm vp-pt__note", placeholder: "Megjegyzés", "aria-label": `${s.pont} – megjegyzés`, value: st.megjegyzes || "" });
  const extra = h("div", { class: "vp-pt__extra" }, date, note);
  const noteBtn = h("button", { type: "button", class: "vp-pt__add" }, "+ megjegyzés");
  const li = h("li", { class: "vp-pt" + (st.megvolt ? " is-done" : "") },
    h("label", { class: "vp-pt__main", for: "pt-" + s.id }, box, h("span", { class: "vp-pt__n", "aria-hidden": "true" }, String(n)), h("span", { class: "vp-pt__text" }, s.pont)),
    noteBtn, extra, h("span", { class: "vp-pt__save" }, sv.el));
  const vis = () => {
    /* a megjegyzésmező csak akkor látszik, ha van megjegyzés vagy most írnak:
       így a kipipált pontok telefonon is egy-két sorosak maradnak */
    const noting = !!note.value || li.classList.contains("is-noting");
    note.hidden = !noting;
    noteBtn.hidden = noting;
    date.hidden = !box.checked;
    extra.hidden = !box.checked && !noting;
  };
  const save = async (patch) => {
    sv.busy();
    try { onSaved(await ctx.api.mentHaladas(mid, s.id, patch)); sv.done(); } catch (e) { sv.fail(e); }
  };
  box.addEventListener("change", () => {
    li.classList.toggle("is-done", box.checked);
    if (box.checked && !date.value) date.value = today();
    if (!box.checked) date.value = "";
    vis();
    save({ megvolt: box.checked, datum: box.checked ? date.value || today() : null });
  });
  date.addEventListener("change", () => save({ datum: date.value || null }));
  const nSave = debounce(() => save({ megjegyzes: note.value.trim() || null }), 900);
  note.addEventListener("input", nSave);
  note.addEventListener("blur", () => nSave.flush());
  noteBtn.addEventListener("click", () => { li.classList.add("is-noting"); vis(); note.focus(); });
  vis();
  return li;
}

/* ======================================================================
   4) Kompetenciateszt
   ====================================================================== */
async function tabKompetencia({ ctx, id, panel, alive }) {
  const kodok = await ctx.api.kodok(id);
  if (!alive()) return;
  const url = ctx.beall.kompetenciateszt_url;
  const href = url && url !== "TODO" ? safeUrl(url) : null;

  const list = h("ul", { class: "vp-list" });
  const draw = () => {
    put(list, ...(kodok.length ? kodok.map((k) => {
      const copy = h("button", { type: "button", class: "code__copy", "aria-label": `Kód másolása: ${k.kod}` }, "Másolás");
      copy.addEventListener("click", async () => {
        try { await navigator.clipboard.writeText(k.kod); copy.textContent = "Másolva!"; } catch { copy.textContent = "Nem sikerült"; }
        setTimeout(() => { copy.textContent = "Másolás"; }, 1600);
      });
      const del = h("button", { type: "button", class: "vp-icon-btn", "aria-label": `Kód törlése: ${k.kod}` }, icon(I.trash));
      del.addEventListener("click", async () => {
        if (!(await confirmDialog({ title: "Kód törlése", text: `Biztosan törlöd: ${k.kod}?`, ok: "Törlés", danger: true }))) return;
        try { await ctx.api.torolKod(k.id); kodok.splice(kodok.indexOf(k), 1); draw(); toast("Kód törölve."); } catch (e) { toast(errMsg(e), "err"); }
      });
      return h("li", { class: "vp-list__row" },
        h("div", { class: "code" }, h("span", { class: "code__label" }, "Kód"), h("code", null, k.kod), copy),
        h("div", { class: "vp-list__meta" }, h("span", null, "Kitöltve: " + fmtDate(k.kitoltes_datum)), k.megjegyzes ? h("span", null, k.megjegyzes) : null),
        del);
    }) : [h("li", { class: "vp-list__empty" }, "Még nincs rögzített kód.")]));
  };

  const kod = h("input", { class: "vp-input", required: true, autocomplete: "off", spellcheck: "false", placeholder: "pl. KT-1234" });
  const datum = h("input", { class: "vp-input", type: "date", value: today() });
  const megj = h("input", { class: "vp-input", autocomplete: "off" });
  const form = h("form", { class: "vp-inline-form", novalidate: true },
    field("Új kód *", kod), field("Kitöltés dátuma", datum), field("Megjegyzés", megj),
    h("button", { type: "submit", class: "btn" }, icon(I.plus, 16), h("span", { class: "btn__label" }, "Hozzáadás")));
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    if (!kod.value.trim()) return kod.focus();
    try {
      kodok.unshift(await ctx.api.ujKod(id, { kod: kod.value.trim(), kitoltes_datum: datum.value || null, megjegyzes: megj.value.trim() || null }));
      kod.value = megj.value = "";
      draw();
      toast("Kód rögzítve.");
    } catch (err) { toast(errMsg(err), "err"); }
  });

  put(panel, 
    h("div", { class: "vp-callout" },
      h("p", null, "A tesztet a munkatárssal együtt töltitek ki, minden alkalommal. A kapott kódot rögzítsd itt – az áttekintőben a kódra is lehet keresni."),
      h("p", { class: "pcrumb" }, "Régi OVB portál → Munkatárs menedzsment → Kompetenciateszt"),
      href
        ? h("a", { class: "open open--inline", href, target: "_blank", rel: "noopener noreferrer" }, "Kompetenciateszt megnyitása", icon(I.arrow, 14))
        : h("span", { class: "soon" }, icon(I.clock, 13), "Link hamarosan")),
    form,
    list);
  draw();
}

/* ======================================================================
   5) Dokumentumok
   ====================================================================== */
async function tabDokumentumok({ ctx, id, m, panel, alive }) {
  const docs = await ctx.api.dokumentumok(id);
  if (!alive()) return;
  const list = h("ul", { class: "vp-list" });
  const draw = () => {
    put(list, ...(docs.length ? docs.map((d) => {
      const open = h("button", { type: "button", class: "vp-btn" }, icon(I.eye), "Megnyitás");
      open.addEventListener("click", async () => {
        try {
          const url = await ctx.api.megnyitLink(d.storage_path);
          const a = h("a", { href: url, target: "_blank", rel: "noopener noreferrer", hidden: true });
          document.body.append(a);
          a.click();
          a.remove();
        } catch (e) { toast(errMsg(e), "err"); }
      });
      const del = h("button", { type: "button", class: "vp-icon-btn", "aria-label": `Törlés: ${d.fajlnev}` }, icon(I.trash));
      del.addEventListener("click", async () => {
        if (!(await confirmDialog({ title: "Fájl törlése", text: `Biztosan törlöd: ${d.fajlnev}? Ez nem vonható vissza.`, ok: "Törlés", danger: true }))) return;
        try { await ctx.api.torolDok(d); docs.splice(docs.indexOf(d), 1); draw(); toast("Fájl törölve."); } catch (e) { toast(errMsg(e), "err"); }
      });
      return h("li", { class: "vp-list__row" },
        h("span", { class: "vp-file-ic" }, icon(I.file, 20)),
        h("div", { class: "vp-list__main" },
          h("p", { class: "vp-list__title" }, d.fajlnev),
          h("p", { class: "vp-list__meta" }, h("span", { class: "chip" }, DOK_TIPUS[d.tipus] || d.tipus), h("span", null, fmtSize(d.meret)), h("span", null, fmtDate(d.feltoltve)))),
        open, del);
    }) : [h("li", { class: "vp-list__empty" }, "Még nincs feltöltött dokumentum.")]));
  };

  if (!m.adatkezelesi_hozzajarulas) {
    put(panel, 
      h("div", { class: "vp-callout vp-callout--warn" },
        h("p", null, h("strong", null, "Előbb az adatkezelési hozzájárulás kell.")),
        h("p", null, "Önéletrajzot csak akkor tölthetsz fel, ha a jelölt hozzájárult az adatai kezeléséhez. Mutasd meg neki a tájékoztatót, majd pipáld be az Alapadatok fülön."),
        h("div", { class: "vp-actions" },
          h("button", { type: "button", class: "vp-btn", onclick: () => tajekoztato(ctx) }, icon(I.shield), "Tájékoztató"),
          h("a", { class: "vp-btn", href: `#/m/${id}/alap` }, "Alapadatok fül →"))),
      list);
    draw();
    return;
  }

  const tipus = h("select", { class: "vp-input", "aria-label": "Dokumentum típusa" }, Object.entries(DOK_TIPUS).map(([k, v]) => h("option", { value: k }, v)));
  const file = h("input", { type: "file", class: "sr-only", id: "dok-file", accept: ".pdf,.doc,.docx,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png" });
  const status = h("p", { class: "vp-drop__status", role: "status", "aria-live": "polite" });
  const zone = h("label", { class: "vp-drop", for: "dok-file" },
    icon(I.upload, 28),
    h("span", { class: "vp-drop__t" }, "Húzd ide a fájlt, vagy kattints a kiválasztáshoz"),
    h("span", { class: "vp-hint" }, "PDF, DOC, DOCX, JPG vagy PNG · legfeljebb 10 MB"),
    file, status);

  const upload = async (f) => {
    if (!f) return;
    const chk = fajlEllenorzes(f);
    if (chk.hiba) { status.textContent = chk.hiba; zone.dataset.s = "err"; return; }
    zone.dataset.s = "busy";
    status.textContent = `Feltöltés: ${f.name}…`;
    try {
      docs.unshift(await ctx.api.feltolt(id, f, tipus.value));
      draw();
      zone.dataset.s = "ok";
      status.textContent = `Feltöltve: ${f.name}`;
    } catch (e) {
      zone.dataset.s = "err";
      status.textContent = errMsg(e);
    } finally {
      file.value = "";
    }
  };
  file.addEventListener("change", () => upload(file.files[0]));
  for (const ev of ["dragenter", "dragover"]) zone.addEventListener(ev, (e) => { e.preventDefault(); zone.classList.add("is-over"); });
  for (const ev of ["dragleave", "drop"]) zone.addEventListener(ev, () => zone.classList.remove("is-over"));
  zone.addEventListener("drop", (e) => { e.preventDefault(); upload(e.dataTransfer.files[0]); });

  put(panel, 
    h("div", { class: "vp-upload" }, field("Típus", tipus), zone),
    h("p", { class: "vp-hint" }, "A fájlok privát tárhelyen vannak; megnyitáskor 60 másodpercig érvényes, egyszeri link készül."),
    list);
  draw();
}

/* ======================================================================
   6) Karrier
   ====================================================================== */
async function tabKarrier({ ctx, id, m, setM, panel, alive }) {
  const hist = await ctx.api.karrier(id);
  if (!alive()) return;
  const cur = h("p", { class: "vp-bigval" }, m.karrierszint);
  const list = h("ol", { class: "vp-timeline" });
  const draw = () => put(list, ...hist.map((k) => h("li", { class: "vp-timeline__it" },
    h("span", { class: "vp-timeline__date" }, fmtDate(k.datum)),
    h("strong", null, k.szint),
    k.megjegyzes ? h("span", { class: "vp-hint" }, k.megjegyzes) : null,
    h("span", { class: "vp-hint" }, "Rögzítette: " + (k.rogzitette_nev || "–")))));

  const szint = h("select", { class: "vp-input" }, ctx.szintek.filter((s) => s.aktiv).map((s) => h("option", { value: s.nev }, s.nev)));
  const next = ctx.szintek.filter((s) => s.aktiv);
  const idx = next.findIndex((s) => s.nev === m.karrierszint);
  if (next[idx + 1]) szint.value = next[idx + 1].nev;
  const datum = h("input", { class: "vp-input", type: "date", value: today() });
  const megj = h("input", { class: "vp-input", autocomplete: "off" });
  const form = h("form", { class: "vp-inline-form", novalidate: true },
    field("Új szint", szint), field("Dátum", datum), field("Megjegyzés", megj),
    h("button", { type: "submit", class: "btn" }, h("span", { class: "btn__label" }, "Szintlépés rögzítése")));
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    try {
      hist.unshift(await ctx.api.szintlepes(id, { szint: szint.value, datum: datum.value || today(), megjegyzes: megj.value.trim() || null }));
      hist.sort((a, b) => String(b.datum).localeCompare(String(a.datum)) || b.id - a.id);
      const fresh = await ctx.api.munkatars(id);
      setM(fresh);
      cur.textContent = fresh.karrierszint;
      megj.value = "";
      draw();
      toast("Szintlépés rögzítve.");
    } catch (err) { toast(errMsg(err), "err"); }
  });
  put(panel, 
    h("div", { class: "vp-callout" }, h("p", { class: "vp-label" }, "Jelenlegi karrierszint"), cur),
    form,
    h("h2", { class: "vp-h2" }, "Előzmények"),
    list);
  draw();
}

/* ======================================================================
   7) Napló
   ====================================================================== */
async function tabNaplo({ ctx, id, panel, alive }) {
  const rows = await ctx.api.naplo(id, 300);
  if (!alive()) return;
  const sMap = new Map(ctx.sablon.map((s) => [s.id, s]));
  const kMap = new Map(ctx.kerdesek.map((k) => [k.id, k]));
  put(panel, 
    h("p", { class: "vp-lead" }, "Ki, mikor, mit módosított. Az automatikus mentés 10 percen belüli módosításai egy sorba kerülnek."),
    rows.length
      ? h("ol", { class: "vp-log" }, rows.map((r) => h("li", { class: "vp-log__it" },
          h("div", { class: "vp-log__head" },
            h("span", { class: "chip" }, TABLA[r.tabla] || r.tabla),
            h("strong", null, r.ki_nev || "–"),
            h("time", { class: "vp-hint", datetime: r.mikor }, fmtDate(r.mikor))),
          h("ul", { class: "vp-log__lines" }, leiras(ctx, r, sMap, kMap).map((t) => h("li", null, t))))))
      : h("p", { class: "vp-list__empty" }, "Még nincs naplóbejegyzés."));
}

function ertek(ctx, k, v) {
  if (v === null || v === undefined || v === "") return "üres";
  if (typeof v === "boolean") return v ? "igen" : "nem";
  if (k === "statusz") return STATUSZ[v] || v;
  if (k === "forras") return FORRAS[v] || v;
  if (k === "mnb_vizsga_statusz") return MNB[v] || v;
  if (k === "dontes") return DONTES[v] || v;
  if (k === "tipus") return DOK_TIPUS[v] || v;
  if (k === "vezeto_id") return ctx.vezetoNev(v);
  const s = String(v);
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return fmtDate(s);
  return s.length > 90 ? s.slice(0, 90) + "…" : s;
}

function leiras(ctx, r, sMap, kMap) {
  const v = r.valtozas || {};
  const ign = new Set(["id", "munkatars_id", "sablon_id", "kerdes_id", "storage_path", "created_by", "feltoltotte", "rogzitette", "rogzitette_nev", "meret", "mime", "feltoltve", "vezeto_id_", "updated_at", "updated_by"]);
  if (r.tabla === "bedolgozas_haladas") {
    const sid = Number(String(r.rekord).split("/").pop());
    const pont = sMap.get(sid);
    const lines = [];
    const name = pont ? `${pont.szakasz} · „${pont.pont}”` : "Bedolgozási pont";
    if (v.megvolt) lines.push(`${name}: ${v.megvolt[1] ? "pipálva ✓" : "pipa levéve"}`);
    if (v.datum && !v.megvolt) lines.push(`${name}: dátum ${ertek(ctx, "datum", v.datum[0])} → ${ertek(ctx, "datum", v.datum[1])}`);
    if (v.megjegyzes) lines.push(`${name}: megjegyzés → ${ertek(ctx, "megjegyzes", v.megjegyzes[1])}`);
    return lines.length ? lines : [name + ": módosítva"];
  }
  if (r.tabla === "interju_valaszok") {
    const kid = Number(String(r.rekord).split("/").pop());
    const k = kMap.get(kid);
    const uj = r.muvelet === "INSERT" ? v.valasz : v.valasz?.[1];
    return [`„${k ? k.kerdes.slice(0, 70) + (k.kerdes.length > 70 ? "…" : "") : "Kérdés"}” → ${ertek(ctx, "valasz", uj)}`];
  }
  if (r.muvelet === "INSERT") {
    if (r.tabla === "munkatarsak") return ["Felvéve a portálra"];
    if (r.tabla === "dokumentumok") return [`Feltöltve: ${v.fajlnev || "fájl"} (${DOK_TIPUS[v.tipus] || ""})`];
    if (r.tabla === "kompetencia_tesztek") return [`Új kód: ${v.kod}`];
    if (r.tabla === "karrierszint_tortenet") return [`Karrierszint: ${v.szint}${v.datum ? " (" + fmtDate(v.datum) + ")" : ""}`];
    return Object.entries(v).filter(([k]) => !ign.has(k)).map(([k, x]) => `${MEZO[k] || k}: ${ertek(ctx, k, x)}`);
  }
  if (r.muvelet === "DELETE") {
    return [{ dokumentumok: "Fájl törölve", kompetencia_tesztek: "Kód törölve", karrierszint_tortenet: "Karrierszint-bejegyzés törölve" }[r.tabla] || "Törölve"];
  }
  const lines = Object.entries(v).filter(([k]) => !ign.has(k)).map(([k, [a, b]]) => `${MEZO[k] || k}: ${ertek(ctx, k, a)} → ${ertek(ctx, k, b)}`);
  return lines.length ? lines : ["Módosítva"];
}

/* ======================================================================
   Közös: tájékoztató, törlés
   ====================================================================== */
export function tajekoztato(ctx) {
  const text = typeof ctx.beall.adatkezelesi_tajekoztato === "string" && ctx.beall.adatkezelesi_tajekoztato.trim()
    ? ctx.beall.adatkezelesi_tajekoztato
    : DEFAULT_TAJEKOZTATO;
  const copy = h("button", { type: "button", class: "btn" }, icon(I.copy, 16), h("span", { class: "btn__label" }, "Szöveg másolása (elküldéshez)"));
  copy.addEventListener("click", async () => {
    try { await navigator.clipboard.writeText(text); toast("A tájékoztató a vágólapon – beillesztheted e-mailbe vagy Messengerbe."); } catch { toast("A másolás nem sikerült, jelöld ki kézzel.", "err"); }
  });
  openDialog("Adatkezelési tájékoztató jelöltnek", h("div", null,
    /TODO/.test(text) ? h("p", { class: "vp-callout vp-callout--warn" }, "TODO: Ricsi/OVB jóváhagyás – ez még minta szöveg.") : null,
    h("div", { class: "vp-tajek" }, text),
    h("div", { class: "vp-dialog__actions" }, copy)), { wide: true });
}

async function torles(ctx, m) {
  const ok = await confirmDialog({
    title: "Munkatárs végleges törlése",
    text: `${m.nev} összes adata törlődik: alapadatok, interjú, bedolgozás, kódok, napló és a feltöltött fájlok is. Ez nem vonható vissza. Ha adatkérési kérelem miatt törlöd, előbb exportáld.`,
    ok: "Végleges törlés",
    danger: true,
    typeToConfirm: m.nev,
  });
  if (!ok) return;
  try {
    await ctx.api.torolMunkatars(m.id);
    toast("Törölve, a fájlokkal együtt.");
    ctx.go("#/");
  } catch (e) { toast(errMsg(e), "err"); }
}
