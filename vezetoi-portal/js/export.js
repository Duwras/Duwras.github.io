/* ==========================================================================
   VEZETŐI PORTÁL — export egy személy összes adatáról (adatkérési kérelemhez)
   JSON: letölthető fájl. PDF: nyomtatható nézet → „Mentés PDF-ként”.
   Minden a böngészőben készül, nem megy ki külső szolgáltatásba.
   ========================================================================== */

import { h, put, downloadBlob, fmtDate, fmtSize, toast } from "./dom.js";
import { STATUSZ, FORRAS, MNB, DONTES, DOK_TIPUS, MEZO } from "./konst.js";

export async function exportJson(ctx, id) {
  const data = await ctx.api.export(id);
  downloadBlob(JSON.stringify(data, null, 2), `adatexport-${id.slice(0, 8)}-${new Date().toISOString().slice(0, 10)}.json`, "application/json");
  toast("A JSON-export letöltődött.");
}

export async function exportPdf(ctx, id) {
  const d = await ctx.api.export(id);
  const m = d.munkatars;
  const val = (k, v) => {
    if (v === null || v === undefined || v === "") return "–";
    if (typeof v === "boolean") return v ? "igen" : "nem";
    if (k === "statusz") return STATUSZ[v] || v;
    if (k === "forras") return FORRAS[v] || v;
    if (k === "mnb_vizsga_statusz") return MNB[v] || v;
    if (k === "vezeto_id") return ctx.vezetoNev(v);
    if (/^\d{4}-\d{2}-\d{2}/.test(String(v))) return fmtDate(v);
    return String(v);
  };
  const kv = (rows) => h("table", { class: "pr-kv" }, h("tbody", null, rows.map(([k, v]) => h("tr", null, h("th", null, k), h("td", null, v)))));
  const fields = ["nev", "statusz", "telefon", "email", "szuletesi_ev", "lakhely", "honnan_szarmazik", "iskola_tanulmanyok", "jelenlegi_munka", "erettsegi_van",
    "forras", "ajanlo_nev", "interju_datum", "felvetel_datum", "ovb_belepes_datum", "karrierszint", "mnb_vizsga_statusz",
    "adatkezelesi_hozzajarulas", "adatkezelesi_hozzajarulas_datum", "vezeto_id", "megjegyzes"];

  let szak = null;
  const print = document.getElementById("print");
  put(print, 
    h("header", { class: "pr-head" },
      h("p", { class: "pr-eyebrow" }, "Érték Pont · Vezetői Portál · adatexport"),
      h("h1", null, m.nev),
      h("p", null, `Készült: ${fmtDate(d.exportalva)} · Azonosító: ${m.id}`)),
    h("h2", null, "Alapadatok"),
    kv([...fields.map((k) => [MEZO[k] || k, val(k, m[k])]), ["Felvéve", fmtDate(m.created_at)], ["Utolsó módosítás", fmtDate(m.updated_at)]]),
    h("h2", null, "Interjú"),
    d.interju.valaszok.length
      ? h("ol", { class: "pr-qa" }, d.interju.valaszok.map((v) => h("li", null, h("strong", null, v.kerdes || "Kérdés"), h("p", null, v.valasz || "–"))))
      : h("p", null, "Nincs rögzített válasz."),
    d.interju.ertekeles
      ? kv([["Első benyomás", val("", d.interju.ertekeles.elso_benyomas)], ["Kommunikáció", val("", d.interju.ertekeles.kommunikacio)], ["Motiváció", val("", d.interju.ertekeles.motivacio)],
          ["Döntés", DONTES[d.interju.ertekeles.dontes] || "–"], ["Megjegyzés", val("", d.interju.ertekeles.megjegyzes)]])
      : null,
    h("h2", null, "Bedolgozás"),
    h("table", { class: "pr-tbl" },
      h("thead", null, h("tr", null, h("th", null, "Pont"), h("th", null, "Megvolt"), h("th", null, "Dátum"), h("th", null, "Megjegyzés"))),
      h("tbody", null, d.bedolgozas.flatMap((b) => {
        const rows = [];
        if (b.szakasz !== szak) { szak = b.szakasz; rows.push(h("tr", { class: "pr-sub" }, h("td", { colspan: "4" }, b.szakasz || "–"))); }
        rows.push(h("tr", null, h("td", null, b.pont || "–"), h("td", null, b.megvolt ? "✓" : ""), h("td", null, b.datum ? fmtDate(b.datum) : ""), h("td", null, b.megjegyzes || "")));
        return rows;
      }))),
    h("h2", null, "Kompetenciateszt-kódok"),
    d.kompetenciatesztek.length ? kv(d.kompetenciatesztek.map((k) => [k.kod, `${fmtDate(k.kitoltes_datum)}${k.megjegyzes ? " – " + k.megjegyzes : ""}`])) : h("p", null, "Nincs."),
    h("h2", null, "Dokumentumok"),
    d.dokumentumok.length ? kv(d.dokumentumok.map((x) => [x.fajlnev, `${DOK_TIPUS[x.tipus] || x.tipus} · ${fmtSize(x.meret)} · ${fmtDate(x.feltoltve)}`])) : h("p", null, "Nincs."),
    h("h2", null, "Karrierszint-előzmények"),
    kv(d.karrierszint_tortenet.map((k) => [fmtDate(k.datum), `${k.szint}${k.megjegyzes ? " – " + k.megjegyzes : ""}`])),
    h("h2", null, "Napló (utolsó módosítások)"),
    h("p", { class: "pr-note" }, `${d.naplo.length} bejegyzés; a teljes, gépi olvasható változat a JSON-exportban van.`),
    kv(d.naplo.slice(0, 60).map((n) => [fmtDate(n.mikor), `${n.ki || "–"} · ${n.tabla} · ${n.muvelet}`]))
  );
  print.hidden = false;
  document.body.classList.add("is-printing");
  const done = () => {
    document.body.classList.remove("is-printing");
    print.hidden = true;
    put(print);
    window.removeEventListener("afterprint", done);
  };
  window.addEventListener("afterprint", done);
  setTimeout(() => window.print(), 50);
}
