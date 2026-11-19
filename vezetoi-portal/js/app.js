/* ==========================================================================
   VEZETŐI PORTÁL — indulás, belépés, útválasztás
   Útvonalak (hash, csak azonosítók, soha név):
     #/                 áttekintő
     #/m/<uuid>/<fül>   munkatárs adatlapja
     #/admin/<rész>     admin felület
   ========================================================================== */

import { createApi } from "./api.js";
import { h, put, $, safeUrl, toast, errMsg } from "./dom.js";
import { renderAttekinto } from "./attekinto.js";
import { renderAdatlap } from "./adatlap.js";
import { renderAdmin } from "./admin.js";

const cfg = window.VP_CONFIG || {};
const isLocal = ["localhost", "127.0.0.1", "[::1]"].includes(location.hostname);

const lock = $("#lock");
const app = $("#app");
const view = $("#view");
const msg = $("#lock-msg");
const forms = { login: $("#f-login"), reset: $("#f-reset"), setpw: $("#f-setpw") };

const setMsg = (t, kind = "") => { msg.textContent = t; msg.dataset.kind = kind; };
function showForm(name) {
  for (const [k, f] of Object.entries(forms)) f.hidden = k !== name;
  setMsg("");
  const first = forms[name].querySelector("input");
  if (first) first.focus();
}

/* A meghívó / jelszó-visszaállító link a hash-ben hozza a tokent. A típust
   azelőtt olvassuk ki, hogy a supabase-js feldolgozza és törli. */
const hashParams = new URLSearchParams(location.hash.startsWith("#/") ? "" : location.hash.slice(1));
let needPassword = ["invite", "recovery"].includes(hashParams.get("type"));
const hashError = hashParams.get("error_description");

/* ---------------------------------------------------------------------- */

async function makeClient() {
  /* Helyi felület-teszthez (csak localhoston): ál-kliens a valódi
     migrációval, böngészőben futó Postgresen. Élesben nincs ilyen beállítás. */
  if (cfg.devClient && isLocal) {
    const m = await import(cfg.devClient);
    return m.createClient();
  }
  if (!cfg.supabaseUrl || !cfg.supabaseAnonKey || !window.supabase) return null;
  return window.supabase.createClient(cfg.supabaseUrl, cfg.supabaseAnonKey, {
    auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true, flowType: "implicit" },
  });
}

const ctx = {
  api: null,
  me: null,
  isAdmin: false,
  sablon: [],
  kerdesek: [],
  szintek: [],
  beall: {},
  vezetok: [],
  async loadLists() {
    const [sablon, kerdesek, szintek, beall, vezetok] = await Promise.all([
      ctx.api.sablon(), ctx.api.kerdesek(), ctx.api.szintek(), ctx.api.beallitasok(), ctx.api.vezetok(),
    ]);
    Object.assign(ctx, { sablon, kerdesek, szintek, beall, vezetok });
  },
  vezetoNev(id) {
    return ctx.vezetok.find((v) => v.id === id)?.nev || (id === ctx.me?.id ? ctx.me.nev : "–");
  },
  go(hash) {
    if (location.hash === hash) route();
    else location.hash = hash;
  },
};

/* ---------------------------------------------------------------------- */

const lockInputs = (off) => Object.values(forms).forEach((f) => f.querySelectorAll("input, button").forEach((x) => { x.disabled = off; }));

async function boot() {
  let client;
  lockInputs(true);
  try {
    client = await makeClient();
  } catch (e) {
    setMsg("Nem sikerült elindítani a portált: " + errMsg(e), "error");
    return;
  }
  if (!client) {
    setMsg("A portál még nincs beállítva (Supabase URL és kulcs hiányzik a config.js-ből). Lásd: docs/vezetoi-portal-setup.md", "error");
    return;
  }
  ctx.api = createApi(client);
  lockInputs(false);

  if (hashError) setMsg(`A link nem érvényes vagy lejárt (${hashError}). Kérj újat az admintól, vagy a „jelszó-visszaállítás” gombbal.`, "error");

  ctx.api.onAuth((event, session) => {
    if (event === "PASSWORD_RECOVERY") needPassword = true;
    if (event === "SIGNED_OUT") return showLock();
    if (session && (event === "SIGNED_IN" || event === "INITIAL_SESSION" || event === "PASSWORD_RECOVERY")) {
      /* a callbackben nem szabad közvetlenül más supabase-hívást várni */
      setTimeout(() => enter(session), 0);
    } else if (event === "INITIAL_SESSION" && !session) {
      showLock();
    }
  });
}

let entering = false;
async function enter(session) {
  if (entering || (ctx.me && ctx.me.id === session.user.id && !app.hidden)) return;
  entering = true;
  try {
    if (needPassword) {
      lock.hidden = false;
      showForm("setpw");
      return;
    }
    const me = await ctx.api.me(session.user.id);
    if (!me || !me.aktiv) {
      await ctx.api.signOut();
      setMsg("Ez a fiók le van tiltva, vagy nincs hozzá vezetői profil. Szólj az adminnak.", "error");
      return;
    }
    ctx.me = me;
    ctx.isAdmin = me.szerep === "admin";
    await ctx.loadLists();
    renderChrome();
    lock.hidden = true;
    app.hidden = false;
    if (!location.hash.startsWith("#/")) history.replaceState(null, "", location.pathname + location.search + "#/");
    route();
  } catch (e) {
    setMsg("Nem sikerült betölteni: " + errMsg(e), "error");
  } finally {
    entering = false;
  }
}

function showLock() {
  ctx.me = null;
  app.hidden = true;
  lock.hidden = false;
  put(view);
  if (forms.login.hidden && forms.reset.hidden && forms.setpw.hidden) showForm("login");
  if (!forms.setpw.hidden && !needPassword) showForm("login");
}

/* --- Fejléc ------------------------------------------------------------- */
function renderChrome() {
  const nav = $("#vp-nav");
  put(nav, 
    h("a", { href: "#/", class: "vp-nav__a", dataset: { r: "" } }, "Munkatársak"),
    ctx.isAdmin ? h("a", { href: "#/admin", class: "vp-nav__a", dataset: { r: "admin" } }, "Admin") : null
  );
  const links = Array.isArray(ctx.beall.gyorslinkek) ? ctx.beall.gyorslinkek : [];
  put($("#vp-links-list"), 
    ...links.map((l) => {
      const href = safeUrl(l.url, location.href);
      return h("li", null, href
        ? h("a", { href, target: "_blank", rel: "noopener noreferrer", class: "vp-menu__a" }, l.label, h("span", { class: "sr-only" }, " (új lapon nyílik)"))
        : h("span", { class: "vp-menu__a is-off" }, l.label + " – hamarosan"));
    }),
    links.length ? null : h("li", null, h("span", { class: "vp-menu__a is-off" }, "Nincs még link (Admin → Beállítások)"))
  );
  $("#vp-links").hidden = !links.length && !ctx.isAdmin;
  put($("#vp-me"), 
    h("span", { class: "vp-me__name" }, ctx.me.nev || ctx.me.email),
    h("span", { class: "vp-me__role" }, ctx.isAdmin ? "admin" : "vezető")
  );
}
/* a ragadós fül-sáv a fejléc alá kerüljön, bármilyen magas is (mobilon 2 sor) */
const ptop = document.querySelector(".ptop");
if (ptop && "ResizeObserver" in window)
  new ResizeObserver(() => document.documentElement.style.setProperty("--ptop-h", ptop.offsetHeight + "px")).observe(ptop);

document.addEventListener("click", (e) => {
  const menu = $("#vp-links");
  if (menu && menu.open && !menu.contains(e.target)) menu.open = false;
});

/* --- Útválasztó --------------------------------------------------------- */
let routeSeq = 0;
async function route() {
  if (!ctx.me) return;
  const seq = ++routeSeq;
  const parts = location.hash.replace(/^#\/?/, "").split("/").filter(Boolean);
  for (const a of document.querySelectorAll(".vp-nav__a"))
    a.toggleAttribute("aria-current", a.dataset.r === (parts[0] === "admin" ? "admin" : parts[0] === "m" ? "" : ""));
  const alive = () => seq === routeSeq;
  try {
    if (parts[0] === "m" && /^[0-9a-f-]{36}$/i.test(parts[1] || "")) await renderAdatlap(ctx, view, parts[1], parts[2] || "alap", alive);
    else if (parts[0] === "admin" && ctx.isAdmin) await renderAdmin(ctx, view, parts[1] || "vezetok", alive);
    else await renderAttekinto(ctx, view, alive);
  } catch (e) {
    if (!alive()) return;
    put(view, h("div", { class: "vp-empty" }, h("h2", null, "Hiba történt"), h("p", null, errMsg(e)), h("a", { href: "#/", class: "btn" }, h("span", { class: "btn__label" }, "Vissza az áttekintőhöz"))));
  }
}
window.addEventListener("hashchange", () => {
  if (location.hash.startsWith("#/")) {
    route();
    view.focus({ preventScroll: true });
    window.scrollTo(0, 0);
  }
});

/* --- Űrlapok ------------------------------------------------------------ */
forms.login.addEventListener("submit", async (e) => {
  e.preventDefault();
  const email = $("#l-email").value;
  const pw = $("#l-pw").value;
  if (!email || !pw) return setMsg("Add meg az e-mail-címed és a jelszavad.", "error");
  const btn = forms.login.querySelector("button[type=submit]");
  btn.disabled = true;
  setMsg("Belépés…");
  try {
    await ctx.api.signIn(email, pw);
    $("#l-pw").value = "";
    setMsg("");
  } catch (err) {
    setMsg(errMsg(err), "error");
  } finally {
    btn.disabled = false;
  }
});
$("#l-eye").addEventListener("click", (e) => {
  const pw = $("#l-pw");
  const show = pw.type === "password";
  pw.type = show ? "text" : "password";
  e.currentTarget.setAttribute("aria-pressed", String(show));
  e.currentTarget.setAttribute("aria-label", show ? "Jelszó elrejtése" : "Jelszó megjelenítése");
});
$("#to-reset").addEventListener("click", () => { $("#r-email").value = $("#l-email").value; showForm("reset"); });
$("#to-login").addEventListener("click", () => showForm("login"));

forms.reset.addEventListener("submit", async (e) => {
  e.preventDefault();
  const email = $("#r-email").value;
  if (!email) return setMsg("Add meg az e-mail-címed.", "error");
  try {
    await ctx.api.resetPassword(email, location.origin + location.pathname);
  } catch { /* nem áruljuk el, létezik-e a fiók */ }
  setMsg("Ha van ilyen fiók, pár percen belül megjön a levél a linkkel. Nézd meg a spam mappát is.");
});

forms.setpw.addEventListener("submit", async (e) => {
  e.preventDefault();
  const a = $("#s-pw").value;
  const b = $("#s-pw2").value;
  if (a.length < 10) return setMsg("A jelszó legalább 10 karakter legyen.", "error");
  if (a !== b) return setMsg("A két jelszó nem egyezik.", "error");
  try {
    await ctx.api.setPassword(a);
    needPassword = false;
    $("#s-pw").value = $("#s-pw2").value = "";
    toast("Jelszó beállítva.");
    const s = await ctx.api.session();
    if (s) enter(s);
  } catch (err) {
    setMsg(errMsg(err), "error");
  }
});

$("#logout").addEventListener("click", async () => {
  await ctx.api.signOut();
  history.replaceState(null, "", location.pathname);
  showForm("login");
  setMsg("Kiléptél.");
});

boot();
