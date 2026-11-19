/* ==========================================================================
   MUNKATÁRSI PORTÁL — kliens
   A vault.json titkosított (AES-256-GCM, kulcs: PBKDF2-SHA256). Ez a script
   a jelszóból a Web Crypto API-val előállítja a kulcsot, visszafejti az
   adatot, és abból rajzolja ki a felületet. A fájlban nincs egyetlen link
   vagy kód sem — azok csak a titkosított adatban vannak.

   - sessionStorage: a LEVEZETETT kulcs (nem a jelszó), hogy a fülön belüli
     frissítésnél ne kelljen újra beírni. A „Kilépés” törli.
   - localStorage: csak az „Első hét” pipái.
   - Minden szöveg textContent-tel kerül a DOM-ba, linknek csak https:, tel:
     és mailto: cím mehet — a JSON szerkesztése nem nyithat XSS-rést.
   Forrás és build: build/portal.mjs, private/README.md.
   ========================================================================== */
(() => {
  "use strict";

  const SS_KEY = "ep-portal-key";
  const SS_TRIES = "ep-portal-tries";
  const LS_CHECK = "ep-portal-checklist";

  const $ = (s, r = document) => r.querySelector(s);
  const lockEl = $("#lock");
  const form = $("#lock-form");
  const pw = $("#lock-pw");
  const eye = $("#lock-eye");
  const msg = $("#lock-msg");
  const submit = $("#lock-submit");
  const submitLabel = submit.querySelector(".btn__label");
  const app = $("#app");
  const content = $("#content");
  const nav = $("#pnav");
  const foot = $("#pfoot");
  const q = $("#q");
  const qStatus = $("#q-status");

  /* --- Tárolás: privát módban vagy tiltott sütiknél dobhat, ezért mindig try */
  const store = {
    get: (area, k) => { try { return window[area].getItem(k); } catch { return null; } },
    set: (area, k, v) => { try { window[area].setItem(k, v); } catch { /* nincs tárolás */ } },
    del: (area, k) => { try { window[area].removeItem(k); } catch { /* nincs tárolás */ } },
  };
  const readJson = (area, k, fallback) => {
    try { return JSON.parse(store.get(area, k)) || fallback; } catch { return fallback; }
  };

  const b64d = (s) => Uint8Array.from(atob(s), (c) => c.charCodeAt(0));
  const b64e = (u8) => btoa(String.fromCharCode(...u8));

  /* Kereséshez: kisbetű, ékezet nélkül — a „probavizsga” is megtalálja. */
  const norm = (s) =>
    String(s || "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/\s+/g, " ").trim();

  if (store.get("sessionStorage", SS_KEY)) document.documentElement.classList.add("is-pending");

  /* ======================================================================
     Kripto
     ====================================================================== */
  let vault = null;

  async function loadVault() {
    const r = await fetch("vault.json", { cache: "no-cache", credentials: "omit" });
    if (!r.ok) throw new Error("HTTP " + r.status);
    const v = await r.json();
    const okIter = Number.isInteger(v.iter) && v.iter >= 100000 && v.iter <= 10000000;
    if (v.v !== 1 || v.alg !== "AES-256-GCM" || v.kdf !== "PBKDF2-SHA256" || !okIter) throw new Error("vault-formátum");
    return v;
  }

  async function deriveRaw(password) {
    const base = await crypto.subtle.importKey(
      "raw", new TextEncoder().encode(password.normalize("NFC")), "PBKDF2", false, ["deriveBits"]
    );
    const bits = await crypto.subtle.deriveBits(
      { name: "PBKDF2", hash: "SHA-256", salt: b64d(vault.salt), iterations: vault.iter }, base, 256
    );
    return new Uint8Array(bits);
  }

  async function decryptWith(raw) {
    const key = await crypto.subtle.importKey("raw", raw, { name: "AES-GCM" }, false, ["decrypt"]);
    const pt = await crypto.subtle.decrypt({ name: "AES-GCM", iv: b64d(vault.iv) }, key, b64d(vault.ct));
    return JSON.parse(new TextDecoder().decode(pt));
  }

  /* A mentett kulcs csak ugyanahhoz a vault-hoz jó: új build = új salt. */
  function savedKey() {
    const s = readJson("sessionStorage", SS_KEY, null);
    if (!s || s.s !== vault.salt || typeof s.k !== "string") return null;
    try { return b64d(s.k); } catch { return null; }
  }

  /* ======================================================================
     Belépés
     ====================================================================== */
  const setMsg = (t, kind = "") => { msg.textContent = t; msg.dataset.kind = kind; };
  const tries = () => readJson("sessionStorage", SS_TRIES, { n: 0, until: 0 });
  let timer = 0;

  function setBusy(on) {
    submit.disabled = on;
    form.setAttribute("aria-busy", on ? "true" : "false");
    submitLabel.textContent = on ? "Feloldás…" : "Belépés";
    if (!on && tries().until > Date.now()) startCountdown(tries().until, false);
  }

  /* Pár rossz próbálkozás után várakozás: 3, 6, 12, 24, majd 30 mp.
     (Kliensoldali fék a találgatás ellen — a valódi védelmet a lassú
     PBKDF2 és az erős titkosítás adja.) A visszaszámlálás a gombon fut,
     a felolvasó csak egyszer kapja meg az üzenetet. */
  function startCountdown(until, announce = true) {
    clearInterval(timer);
    const secs = () => Math.ceil((until - Date.now()) / 1000);
    if (announce) setMsg(`Hibás jelszó. Túl sok próbálkozás: várj ${secs()} másodpercet, aztán próbáld újra.`, "error");
    const tick = () => {
      const left = secs();
      if (left <= 0) {
        clearInterval(timer);
        submit.disabled = false;
        submitLabel.textContent = "Belépés";
        setMsg("Most újra próbálhatod.");
        return;
      }
      submit.disabled = true;
      submitLabel.textContent = `Várj ${left} mp`;
    };
    tick();
    timer = setInterval(tick, 1000);
  }

  function wrongPassword() {
    const t = tries();
    t.n += 1;
    if (t.n >= 3) t.until = Date.now() + Math.min(30, 3 * 2 ** (t.n - 3)) * 1000;
    store.set("sessionStorage", SS_TRIES, JSON.stringify(t));
    pw.select();
    if (t.until > Date.now()) startCountdown(t.until);
    else setMsg("Hibás jelszó. Ellenőrizd, és próbáld újra.", "error");
  }

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const t = tries();
    if (t.until > Date.now()) return startCountdown(t.until);
    const password = pw.value;
    if (!password) { setMsg("Írd be a jelszót.", "error"); pw.focus(); return; }

    setBusy(true);
    setMsg("Feloldás… (pár másodperc is lehet)");
    try {
      if (!vault) vault = await loadVault();
      const raw = await deriveRaw(password);
      let d = null;
      try { d = await decryptWith(raw); } catch { d = null; }
      if (!d) { setMsg(""); wrongPassword(); return; }
      store.set("sessionStorage", SS_KEY, JSON.stringify({ k: b64e(raw), s: vault.salt }));
      store.del("sessionStorage", SS_TRIES);
      pw.value = "";
      setMsg("");
      unlock(d);
    } catch {
      setMsg("Nem sikerült a feloldás. Ellenőrizd a netet, frissítsd az oldalt, és próbáld újra.", "error");
    } finally {
      setBusy(false);
    }
  });

  eye.addEventListener("click", () => {
    const show = pw.type === "password";
    pw.type = show ? "text" : "password";
    eye.setAttribute("aria-pressed", String(show));
    eye.setAttribute("aria-label", show ? "Jelszó elrejtése" : "Jelszó megjelenítése");
    pw.focus();
  });

  function logout() {
    store.del("sessionStorage", SS_KEY);
    teardown();
    app.hidden = true;
    lockEl.hidden = false;
    pw.type = "password";
    eye.setAttribute("aria-pressed", "false");
    window.scrollTo(0, 0);
    setMsg("Kiléptél. A belépéshez újra kell a jelszó.");
    pw.focus();
  }
  $("#logout").addEventListener("click", logout);

  /* ======================================================================
     DOM-segédek — csak textContent, soha innerHTML adatból
     ====================================================================== */
  function h(tag, attrs, ...kids) {
    const el = document.createElement(tag);
    for (const [k, v] of Object.entries(attrs || {})) {
      if (v == null || v === false) continue;
      if (k === "class") el.className = v;
      else if (k.startsWith("on")) el.addEventListener(k.slice(2), v);
      else el.setAttribute(k, v === true ? "" : String(v));
    }
    for (const c of kids.flat(Infinity)) if (c != null && c !== false) el.append(c);
    return el;
  }

  const SVG_NS = "http://www.w3.org/2000/svg";
  function icon(d, size = 14) {
    const s = document.createElementNS(SVG_NS, "svg");
    s.setAttribute("width", size);
    s.setAttribute("height", size);
    s.setAttribute("viewBox", "0 0 24 24");
    s.setAttribute("fill", "none");
    s.setAttribute("stroke", "currentColor");
    s.setAttribute("stroke-width", "2.2");
    s.setAttribute("stroke-linecap", "round");
    s.setAttribute("stroke-linejoin", "round");
    s.setAttribute("aria-hidden", "true");
    for (const one of [].concat(d)) {
      const p = document.createElementNS(SVG_NS, "path");
      p.setAttribute("d", one);
      s.append(p);
    }
    return s;
  }
  const ARROW = ["M7 17 17 7", "M8 7h9v9"];

  const safeUrl = (u) => {
    try {
      const x = new URL(u);
      return ["https:", "tel:", "mailto:"].includes(x.protocol) ? x.href : null;
    } catch { return null; }
  };

  /* **félkövér** a szövegben → <strong> (más jelölés nincs). */
  function rich(text) {
    return String(text || "").split(/\*\*(.+?)\*\*/g).map((part, i) => (i % 2 ? h("strong", null, part) : part));
  }

  function extLink(url, label, cls) {
    const href = safeUrl(url);
    if (!href) return h("span", { class: cls + " is-broken" }, label);
    return h(
      "a",
      { class: cls, href, target: "_blank", rel: "noopener noreferrer" },
      h("span", null, label),
      h("span", { class: "sr-only" }, " (új lapon nyílik)"),
      icon(ARROW)
    );
  }

  const pcrumb = (path) =>
    path && path.length ? h("ol", { class: "pcrumb", "aria-label": "Útvonal" }, path.map((p) => h("li", null, p))) : null;

  function badge(text) {
    const open = /nyilvános|nem kell/i.test(text);
    return h("span", { class: "badge" + (open ? " badge--open" : "") }, text);
  }

  let announcer = null;
  const announce = (t) => {
    if (!announcer) return;
    announcer.textContent = "";
    setTimeout(() => { announcer.textContent = t; }, 30);
  };

  async function copyText(t) {
    try { await navigator.clipboard.writeText(t); return true; } catch { /* régi böngésző */ }
    try {
      const ta = h("textarea", { class: "sr-only", readonly: true });
      ta.value = t;
      document.body.append(ta);
      ta.select();
      const ok = document.execCommand("copy");
      ta.remove();
      return ok;
    } catch { return false; }
  }

  function codeBox(code) {
    const btn = h("button", { type: "button", class: "code__copy", "aria-label": `Kód másolása: ${code}` }, "Másolás");
    btn.addEventListener("click", async (e) => {
      e.preventDefault();
      e.stopPropagation();
      const ok = await copyText(code);
      btn.textContent = ok ? "Másolva!" : "Nem sikerült";
      btn.classList.toggle("is-done", ok);
      announce(ok ? `A kód (${code}) a vágólapon van.` : "A másolás nem sikerült, írd be kézzel.");
      setTimeout(() => { btn.textContent = "Másolás"; btn.classList.remove("is-done"); }, 1800);
    });
    return h("div", { class: "code" }, h("span", { class: "code__label" }, "Kód"), h("code", null, code), btn);
  }

  /* ======================================================================
     Kereső-index: minden kártya / sor / pipa egy bejegyzés
     ====================================================================== */
  let index = [];      // { el, own, subs: [{ el, text }], sec }
  let sections = [];   // { el, id, entries: [] }
  let observer = null;
  let resizeObs = null;

  function register(sec, el, parts, subs = []) {
    const e = { el, own: norm([sec.title, ...parts].join(" ")), subs, sec };
    index.push(e);
    sec.entries.push(e);
    return e;
  }

  function sectionShell(id, num, title, intro) {
    const el = h(
      "section",
      { class: "psec", id: "s-" + id, "aria-labelledby": "h-" + id },
      h(
        "div",
        { class: "psec__head" },
        h("span", { class: "psec__num", "aria-hidden": "true" }, String(num).padStart(2, "0")),
        h("h2", { class: "psec__title", id: "h-" + id }, title)
      ),
      intro ? h("p", { class: "psec__intro" }, rich(intro)) : null
    );
    const sec = { el, id, title, entries: [] };
    sections.push(sec);
    return sec;
  }

  /* --- Gyors elérés: nagy csempék ------------------------------------- */
  function renderQuick(items, num) {
    const sec = sectionShell("gyors", num, "Gyors elérés", null);
    const grid = h("div", { class: "tiles" });
    for (const it of items) {
      const href = safeUrl(it.url);
      const tile = h(
        "article",
        { class: "tile" },
        h(
          "h3",
          { class: "tile__title" },
          href
            ? h("a", { class: "tile__link", href, target: "_blank", rel: "noopener noreferrer" },
                it.title, h("span", { class: "sr-only" }, " (új lapon nyílik)"))
            : it.title
        ),
        it.desc ? h("p", { class: "tile__desc" }, rich(it.desc)) : null,
        h("div", { class: "tile__foot" }, it.login ? badge(it.login) : null, it.code ? codeBox(it.code) : null),
        h("span", { class: "tile__arrow", "aria-hidden": "true" }, icon(ARROW, 18))
      );
      grid.append(tile);
      register(sec, tile, [it.title, it.desc, it.login, ...(it.tags || []), ...(it.path || [])]);
    }
    sec.el.append(grid);
    return sec;
  }

  /* --- Első hét: pipálható lista (localStorage) ------------------------ */
  function renderChecklist(list, num) {
    const sec = sectionShell(
      "elso-het", num, "Kezdd itt – első hét",
      "Haladj sorban, és pipáld ki, amivel megvagy. A pipák ezen az eszközön és böngészőben megmaradnak."
    );
    const state = readJson("localStorage", LS_CHECK, {});
    const bar = h("span", { class: "ckp__fill" });
    const meter = h("div", {
      class: "ckp__track", role: "progressbar", "aria-label": "Első hét haladás",
      "aria-valuemin": 0, "aria-valuemax": list.length,
    }, bar);
    const txt = h("span", { class: "ckp__txt" });
    const update = () => {
      const done = list.filter((c) => state[c.id]).length;
      meter.setAttribute("aria-valuenow", done);
      meter.setAttribute("aria-valuetext", `${done} / ${list.length} kész`);
      bar.style.transform = `scaleX(${list.length ? done / list.length : 0})`;
      txt.textContent = done === list.length ? `Mind a ${list.length} kész – szép munka!` : `${done} / ${list.length} kész`;
    };

    const ol = h("ol", { class: "checklist" });
    list.forEach((c, i) => {
      const id = "c-" + c.id;
      const box = h("input", { type: "checkbox", id, class: "check__box" });
      box.checked = !!state[c.id];
      box.addEventListener("change", () => {
        if (box.checked) state[c.id] = true; else delete state[c.id];
        store.set("localStorage", LS_CHECK, JSON.stringify(state));
        update();
      });
      const li = h(
        "li",
        { class: "check" },
        box,
        h("label", { for: id, class: "check__label" },
          h("span", { class: "check__num", "aria-hidden": "true" }, String(i + 1)),
          h("span", { class: "check__text" }, rich(c.text))),
        c.url ? extLink(c.url, c.linkLabel || "Megnyitás", "check__link") : null
      );
      ol.append(li);
      register(sec, li, [c.text, ...(c.tags || [])]);
    });

    const reset = h("button", { type: "button", class: "ckp__reset" }, "Pipák törlése");
    reset.addEventListener("click", () => {
      if (!window.confirm("Biztosan törlöd az összes pipát?")) return;
      for (const k of Object.keys(state)) delete state[k];
      store.del("localStorage", LS_CHECK);
      ol.querySelectorAll("input").forEach((b) => { b.checked = false; });
      update();
    });

    sec.el.append(h("div", { class: "ckp" }, meter, txt, reset), ol);
    update();
    return sec;
  }

  /* --- Kártyás szekció -------------------------------------------------- */
  function card(sec, it) {
    const subs = [];
    let links = null;
    if (it.links && it.links.length) {
      const ul = h("ul", { class: "sublinks" });
      for (const l of it.links) {
        const li = h("li", null, extLink(l.url, l.label, "sublink"));
        ul.append(li);
        subs.push({ el: li, text: norm(l.label) });
      }
      /* Hosszú listát lenyitható blokkba teszünk, hogy a kártya rövid maradjon. */
      links = it.links.length > 6
        ? h("details", { class: "more" }, h("summary", null, `${it.links.length} link megnyitása`), ul)
        : ul;
    }
    const el = h(
      "article",
      { class: "pcard" + (it.important ? " pcard--key" : "") },
      h("div", { class: "pcard__top" }, h("h3", { class: "pcard__title" }, it.title), it.login ? badge(it.login) : null),
      it.desc ? h("p", { class: "pcard__desc" }, rich(it.desc)) : null,
      pcrumb(it.path),
      it.note ? h("p", { class: "pcard__note" }, rich(it.note)) : null,
      links,
      it.code || it.url
        ? h("div", { class: "pcard__foot" },
            it.code ? codeBox(it.code) : null,
            it.url ? extLink(it.url, it.cta || "Megnyitás", "open") : null)
        : null
    );
    register(sec, el, [it.title, it.desc, it.note, it.login, ...(it.path || []), ...(it.tags || [])], subs);
    return el;
  }

  function renderSection(s, num) {
    const sec = sectionShell(s.id, num, s.title, s.intro);
    sec.nav = s.nav;
    const grid = h("div", { class: "cards" });
    for (const it of s.items) grid.append(card(sec, it));
    sec.el.append(grid);
    return sec;
  }

  /* --- „Hol találom?” – portáltérkép GYIK ------------------------------- */
  function renderFaq(faq, num) {
    const sec = sectionShell("hol-talalom", num, "Hol találom?", data.faqIntro);
    sec.nav = "Hol találom?";
    const groups = new Map();
    for (const f of faq) {
      if (!groups.has(f.portal)) groups.set(f.portal, []);
      groups.get(f.portal).push(f);
    }
    for (const [portal, rows] of groups) {
      const note = data.faqGroups && data.faqGroups[portal];
      const ul = h("ul", { class: "faq" });
      for (const f of rows) {
        const links = [];
        if (f.url) links.push(extLink(f.url, "Megnyitás", "open open--sm"));
        for (const l of f.links || []) links.push(extLink(l.url, l.label, "open open--sm"));
        const li = h(
          "li",
          { class: "faq__row" },
          h("p", { class: "faq__q" }, f.q),
          h("div", { class: "faq__meta" }, pcrumb(f.path), f.note ? h("span", { class: "faq__note" }, f.note) : null),
          links.length ? h("div", { class: "faq__links" }, links) : null
        );
        ul.append(li);
        register(sec, li, [f.q, f.portal, f.note, ...(f.path || []), ...(f.tags || []), ...(f.links || []).map((l) => l.label)]);
      }
      const group = h("div", { class: "faq-group" },
        h("h3", { class: "faq-group__title" }, portal),
        note ? h("p", { class: "faq-group__note" }, rich(note)) : null,
        ul);
      sec.el.append(group);
    }
    if (data.faqTip) {
      const tip = h("p", { class: "tip" }, h("strong", null, "Tipp: "), rich(data.faqTip));
      sec.el.append(tip);
      register(sec, tip, [data.faqTip]);
    }
    return sec;
  }

  /* --- Kapcsolat + lábléc ---------------------------------------------- */
  function renderContact(c, num) {
    const sec = sectionShell("kapcsolat", num, "Kapcsolat", null);
    const tel = "tel:" + c.phone.replace(/[^\d+]/g, "");
    const box = h(
      "div",
      { class: "contact" },
      h("p", { class: "contact__lead" }, c.text || "Elakadtál? Írj vagy hívj:"),
      h("p", { class: "contact__name" }, c.name),
      h("div", { class: "contact__actions" },
        h("a", { class: "btn", href: safeUrl(tel) }, h("span", { class: "btn__label" }, c.phone)),
        h("a", { class: "btn btn--ghost", href: safeUrl("mailto:" + c.email) }, h("span", { class: "btn__label" }, c.email)))
    );
    sec.el.append(box);
    register(sec, box, [c.name, c.phone, c.email, "kapcsolat kérdés segítség telefon email"]);
    return sec;
  }

  function renderFooter(d) {
    const c = d.contact;
    const [y, m, day] = d.updated.split("-");
    foot.replaceChildren(
      h("p", null, "Kérdésed van? ", h("strong", null, c.name), " – ",
        h("a", { href: safeUrl("tel:" + c.phone.replace(/[^\d+]/g, "")) }, c.phone), " – ",
        h("a", { href: safeUrl("mailto:" + c.email) }, c.email)),
      h("p", { class: "pfoot__meta" }, `Adatok frissítve: ${y}. ${m}. ${day}.`)
    );
  }

  /* ======================================================================
     Kirajzolás, navigáció, keresés
     ====================================================================== */
  let data = null;

  function render(d) {
    teardown();
    data = d;
    let n = 1;
    const secs = [];
    if (d.quick && d.quick.length) secs.push(renderQuick(d.quick, n++));
    if (d.checklist && d.checklist.length) secs.push(renderChecklist(d.checklist, n++));
    for (const s of d.sections) secs.push(renderSection(s, n++));
    if (d.faq && d.faq.length) secs.push(renderFaq(d.faq, n++));
    secs.push(renderContact(d.contact, n++));
    content.replaceChildren(...secs.map((s) => s.el));
    renderFooter(d);

    announcer = h("p", { class: "sr-only", role: "status", "aria-live": "polite" });
    foot.append(announcer);

    /* Ugrómenü */
    nav.replaceChildren(
      h("p", { class: "pnav__label", "aria-hidden": "true" }, "Tartalom"),
      h("ul", null, secs.map((s) => h("li", null,
        h("a", { href: "#s-" + s.id, "data-sec": s.id }, s.nav || (s.id === "elso-het" ? "Első hét" : s.title)))))
    );
    nav.addEventListener("click", onNavClick);

    /* Aktív szekció kijelölése görgetéskor */
    observer = new IntersectionObserver(onIntersect, { rootMargin: "-25% 0px -65% 0px" });
    secs.forEach((s) => observer.observe(s.el));

    /* A ragadós fejléc magassága → scroll-margin (CSS-változók) */
    const header = $(".ptop");
    const measure = () => {
      const root = document.documentElement.style;
      root.setProperty("--ptop-h", header.offsetHeight + "px");
      root.setProperty("--pnav-h", (getComputedStyle(nav).position === "sticky" && innerWidth < 960 ? nav.offsetHeight : 0) + "px");
    };
    resizeObs = new ResizeObserver(measure);
    resizeObs.observe(header);
    resizeObs.observe(nav);
    measure();
  }

  function teardown() {
    data = null;
    index = [];
    sections = [];
    if (observer) observer.disconnect();
    if (resizeObs) resizeObs.disconnect();
    observer = resizeObs = null;
    nav.removeEventListener("click", onNavClick);
    content.replaceChildren();
    nav.replaceChildren();
    foot.replaceChildren();
    announcer = null;
    q.value = "";
    qStatus.textContent = "";
    document.body.classList.remove("is-searching");
  }

  function setActive(id) {
    for (const a of nav.querySelectorAll("a")) {
      const on = a.dataset.sec === id;
      if (on) a.setAttribute("aria-current", "true"); else a.removeAttribute("aria-current");
      /* Mobilon a vízszintes menüt odagörgetjük az aktív elemhez */
      if (on && nav.scrollWidth > nav.clientWidth) {
        const ul = nav.querySelector("ul");
        const left = a.offsetLeft - 16;
        if (a.offsetLeft < ul.scrollLeft || a.offsetLeft + a.offsetWidth > ul.scrollLeft + ul.clientWidth)
          ul.scrollTo({ left, behavior: "smooth" });
      }
    }
  }

  function onIntersect(entries) {
    for (const e of entries) if (e.isIntersecting) setActive(e.target.id.slice(2));
  }

  function onNavClick(e) {
    const a = e.target.closest("a[data-sec]");
    if (!a) return;
    if (q.value) { q.value = ""; applySearch(""); }
    setActive(a.dataset.sec);
  }

  function applySearch(raw) {
    const toks = norm(raw).split(" ").filter(Boolean);
    const searching = toks.length > 0;
    document.body.classList.toggle("is-searching", searching);
    let hits = 0;
    for (const e of index) {
      if (!searching) {
        e.el.hidden = false;
        for (const s of e.subs) s.el.hidden = false;
        const det = e.el.querySelector("details");
        if (det) det.open = false;
        continue;
      }
      const ownHit = toks.every((t) => e.own.includes(t));
      /* Ha maga a kártya nem talál, de a benne lévő lecke-linkek igen,
         a kártya látszik, de csak a találó linkekkel, lenyitva. */
      let subHit = false;
      for (const s of e.subs) {
        const ok = ownHit || toks.every((t) => s.text.includes(t) || e.own.includes(t));
        s.el.hidden = !ok;
        if (ok) subHit = true;
      }
      const show = ownHit || subHit;
      e.el.hidden = !show;
      const det = e.el.querySelector("details");
      if (det) det.open = show && !ownHit;
      if (show) hits++;
    }
    for (const s of sections) s.el.hidden = searching && !s.entries.some((e) => !e.el.hidden);
    for (const a of nav.querySelectorAll("a")) {
      const s = sections.find((x) => x.id === a.dataset.sec);
      a.classList.toggle("is-empty", !!(s && s.el.hidden));
    }
    if (!searching) qStatus.textContent = "";
    else if (hits) qStatus.textContent = `${hits} találat erre: „${raw.trim()}”`;
    else qStatus.textContent = `Nincs találat erre: „${raw.trim()}”. Próbálj egy rövidebb szót (pl. „vizsga”, „excel”), vagy kérdezz a lap alján.`;
    qStatus.classList.toggle("is-empty", searching && !hits);
  }

  q.addEventListener("input", () => applySearch(q.value));
  q.addEventListener("keydown", (e) => {
    if (e.key === "Escape") { q.value = ""; applySearch(""); }
    if (e.key === "Enter") { e.preventDefault(); q.blur(); }
  });
  document.addEventListener("keydown", (e) => {
    if (app.hidden || e.key !== "/" || e.ctrlKey || e.metaKey || e.altKey) return;
    const t = e.target;
    if (t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.isContentEditable)) return;
    e.preventDefault();
    q.focus();
  });

  function unlock(d) {
    render(d);
    lockEl.hidden = true;
    app.hidden = false;
    document.documentElement.classList.remove("is-pending");
    $("#main").focus({ preventScroll: true });
  }

  /* ======================================================================
     Indulás
     ====================================================================== */
  async function init() {
    if (!(window.crypto && crypto.subtle)) {
      document.documentElement.classList.remove("is-pending");
      setMsg("Ez a böngésző nem tudja megnyitni a portált. Használj friss Chrome-ot, Safarit vagy Firefoxot.", "error");
      submit.disabled = true;
      return;
    }
    try {
      vault = await loadVault();
    } catch {
      document.documentElement.classList.remove("is-pending");
      setMsg("Nem sikerült betölteni a portált. Ellenőrizd a netet, és frissítsd az oldalt.", "error");
      return;
    }
    const raw = savedKey();
    if (raw) {
      try { unlock(await decryptWith(raw)); return; } catch { store.del("sessionStorage", SS_KEY); }
    }
    document.documentElement.classList.remove("is-pending");
    const t = tries();
    if (t.until > Date.now()) startCountdown(t.until);
    pw.focus();
  }

  init();
})();
