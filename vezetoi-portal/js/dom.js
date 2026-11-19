/* ==========================================================================
   VEZETŐI PORTÁL — DOM-segédek
   Minden szöveg textContent-tel kerül a DOM-ba, soha innerHTML adatból:
   egy jelölt neve vagy válasza nem nyithat XSS-rést.
   ========================================================================== */

export function h(tag, attrs, ...kids) {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs || {})) {
    if (v == null || v === false) continue;
    if (k === "class") el.className = v;
    else if (k === "dataset") Object.assign(el.dataset, v);
    else if (k.startsWith("on") && typeof v === "function") el.addEventListener(k.slice(2), v);
    else if (k === "value") el.value = v;
    else if (k === "checked") el.checked = !!v;
    else el.setAttribute(k, v === true ? "" : String(v));
  }
  for (const c of kids.flat(Infinity)) if (c != null && c !== false) el.append(c);
  return el;
}

/* Tartalom cseréje; a null/false gyerekeket kihagyja (a natív replaceChildren "null"-t írna ki). */
export function put(el, ...kids) {
  el.replaceChildren(...kids.flat(Infinity).filter((c) => c != null && c !== false));
  return el;
}

const SVG_NS = "http://www.w3.org/2000/svg";
export function icon(d, size = 16) {
  const s = document.createElementNS(SVG_NS, "svg");
  for (const [k, v] of Object.entries({ width: size, height: size, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", "stroke-width": 2, "stroke-linecap": "round", "stroke-linejoin": "round", "aria-hidden": "true" }))
    s.setAttribute(k, v);
  for (const one of [].concat(d)) {
    const p = document.createElementNS(SVG_NS, "path");
    p.setAttribute("d", one);
    s.append(p);
  }
  return s;
}
export const I = {
  arrow: ["M7 17 17 7", "M8 7h9v9"],
  back: ["M15 18l-6-6 6-6"],
  plus: ["M12 5v14", "M5 12h14"],
  copy: ["M9 9h11v11H9z", "M5 15H4V4h11v1"],
  trash: ["M3 6h18", "M8 6V4h8v2", "M19 6l-1 14H6L5 6"],
  file: ["M14 3H6v18h12V7z", "M14 3v4h4"],
  upload: ["M12 16V4", "M7 9l5-5 5 5", "M4 20h16"],
  check: ["M5 12l5 5L20 7"],
  search: ["M11 18a7 7 0 1 0 0-14 7 7 0 0 0 0 14z", "M20 20l-3.5-3.5"],
  logout: ["M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4", "m10 17-5-5 5-5", "M5 12h12"],
  link: ["M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1", "M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1"],
  shield: ["M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z"],
  up: ["M12 19V5", "M5 12l7-7 7 7"],
  down: ["M12 5v14", "M19 12l-7 7-7-7"],
  download: ["M12 4v12", "M7 11l5 5 5-5", "M4 20h16"],
  print: ["M6 9V3h12v6", "M6 18H4v-7h16v7h-2", "M6 14h12v7H6z"],
  user: ["M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8z", "M4 21a8 8 0 0 1 16 0"],
  clock: ["M12 7v5l3 2", "M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z"],
  eye: ["M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12Z", "M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z"],
};

export const $ = (s, r = document) => r.querySelector(s);

/* Biztonságos külső link: csak https / mailto / tel */
export function safeUrl(u, base) {
  try {
    const x = new URL(u, base);
    return ["https:", "mailto:", "tel:"].includes(x.protocol) ? x.href : null;
  } catch { return null; }
}

export const store = {
  get: (k) => { try { return localStorage.getItem(k); } catch { return null; } },
  set: (k, v) => { try { localStorage.setItem(k, v); } catch { /* nincs tárolás */ } },
};

/* --- Formázás -------------------------------------------------------- */
export const today = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};
export function fmtDate(v) {
  if (!v) return "–";
  const s = String(v);
  const m = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!m) return s;
  if (s.length <= 10) return `${m[1]}. ${m[2]}. ${m[3]}.`;
  const d = new Date(s);
  if (isNaN(d)) return `${m[1]}. ${m[2]}. ${m[3]}.`;
  return d.toLocaleString("hu-HU", { year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" });
}
export function relDate(v) {
  if (!v) return "–";
  const d = new Date(v);
  if (isNaN(d)) return fmtDate(v);
  const days = Math.floor((Date.now() - d.getTime()) / 86400000);
  if (days <= 0) return "ma";
  if (days === 1) return "tegnap";
  if (days < 7) return `${days} napja`;
  if (days < 60) return `${Math.floor(days / 7)} hete`;
  return fmtDate(String(v).slice(0, 10));
}
export const fmtSize = (n) => (n >= 1048576 ? (n / 1048576).toFixed(1).replace(".", ",") + " MB" : Math.max(1, Math.round(n / 1024)) + " kB");
export function monogram(nev) {
  const p = String(nev || "?").trim().split(/\s+/).filter(Boolean);
  return ((p[0] || "?")[0] + (p.length > 1 ? p[p.length - 1][0] : "")).toUpperCase();
}
/* Kereséshez: kisbetű, ékezet nélkül */
export const norm = (s) => String(s || "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/\s+/g, " ").trim();

export function debounce(fn, ms) {
  let t = 0;
  const d = (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); };
  d.flush = (...a) => { clearTimeout(t); fn(...a); };
  return d;
}

/* --- Értesítés (toast) ---------------------------------------------- */
let toastBox = null;
export function toast(msg, kind = "ok") {
  if (!toastBox) {
    toastBox = h("div", { class: "toasts", role: "status", "aria-live": "polite" });
    document.body.append(toastBox);
  }
  const el = h("p", { class: "toast toast--" + kind }, msg);
  toastBox.append(el);
  setTimeout(() => el.classList.add("is-out"), kind === "err" ? 6000 : 3200);
  setTimeout(() => el.remove(), kind === "err" ? 6600 : 3800);
}
export const errMsg = (e) => (e && e.message) || String(e || "Hiba");

/* --- Megerősítő ablak (natív <dialog>) ------------------------------ */
export function confirmDialog({ title, text, ok = "Rendben", danger = false, typeToConfirm = null }) {
  return new Promise((resolve) => {
    const input = typeToConfirm ? h("input", { class: "vp-input", type: "text", autocomplete: "off", "aria-label": `Írd be: ${typeToConfirm}` }) : null;
    const okBtn = h("button", { type: "submit", class: "btn" + (danger ? " btn--danger" : ""), value: "ok" }, h("span", { class: "btn__label" }, ok));
    const dlg = h("dialog", { class: "vp-dialog" },
      h("form", { method: "dialog", class: "vp-dialog__body" },
        h("h2", { class: "vp-dialog__title" }, title),
        text ? h("p", { class: "vp-dialog__text" }, text) : null,
        typeToConfirm ? h("label", { class: "vp-field" }, h("span", { class: "vp-label" }, `Megerősítéshez írd be: „${typeToConfirm}”`), input) : null,
        h("div", { class: "vp-dialog__actions" },
          h("button", { type: "submit", class: "btn btn--ghost", value: "cancel" }, h("span", { class: "btn__label" }, "Mégse")),
          okBtn)));
    if (input) {
      okBtn.disabled = true;
      input.addEventListener("input", () => { okBtn.disabled = input.value.trim() !== typeToConfirm.trim(); });
    }
    dlg.addEventListener("close", () => { resolve(dlg.returnValue === "ok"); dlg.remove(); });
    document.body.append(dlg);
    dlg.showModal();
    (input || okBtn).focus();
  });
}

/* Tetszőleges tartalmú ablak; visszaadja a dialog elemet. */
export function openDialog(title, body, { wide = false } = {}) {
  const close = h("button", { type: "button", class: "vp-dialog__x", "aria-label": "Bezárás" }, "×");
  const dlg = h("dialog", { class: "vp-dialog" + (wide ? " vp-dialog--wide" : "") },
    h("div", { class: "vp-dialog__body" }, h("div", { class: "vp-dialog__head" }, h("h2", { class: "vp-dialog__title" }, title), close), body));
  close.addEventListener("click", () => dlg.close());
  dlg.addEventListener("close", () => dlg.remove());
  document.body.append(dlg);
  dlg.showModal();
  return dlg;
}

/* --- Mentés-jelző automatikus mentéshez ----------------------------- */
export function saveState() {
  const el = h("span", { class: "save", role: "status", "aria-live": "polite" });
  let n = 0;
  return {
    el,
    busy() { n++; el.dataset.s = "busy"; el.textContent = "Mentés…"; },
    done() {
      n = Math.max(0, n - 1);
      if (n) return;
      el.dataset.s = "ok";
      el.textContent = "Mentve " + new Date().toLocaleTimeString("hu-HU", { hour: "2-digit", minute: "2-digit" });
    },
    fail(e) { n = Math.max(0, n - 1); el.dataset.s = "err"; el.textContent = "Nem sikerült menteni"; toast(errMsg(e), "err"); },
  };
}

/* Haladás-sáv */
export function bar(kesz, osszes, label) {
  const pct = osszes ? Math.round((kesz / osszes) * 100) : 0;
  const fill = h("span", { class: "bar__fill" });
  fill.style.setProperty("--p", pct + "%");
  return h("div", { class: "bar", role: "progressbar", "aria-valuemin": 0, "aria-valuemax": osszes, "aria-valuenow": kesz, "aria-label": label || "Haladás", "aria-valuetext": `${kesz} / ${osszes} (${pct}%)` }, fill);
}

/* Fájl letöltése a böngészőben készült tartalomból */
export function downloadBlob(content, name, type) {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const a = h("a", { href: url, download: name, hidden: true });
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 4000);
}
