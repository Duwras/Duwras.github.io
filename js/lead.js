/* ==========================================================================
   LEAD — validáció, beküldés (Google Sheets / Apps Script) és a közös
   űrlap-viselkedés, amit MINDEN lead-űrlap használ: a visszahívás-modál,
   a kapcsolat oldal űrlapja és a funnelek eredmény-űrlapja (js/funnel.js).

   Az Apps Script CORS miatt nem ad olvasható választ, ezért "fire and forget":
   ha a kérés hiba nélkül kiment, sikeresnek tekintjük. Hálózati hiba, CSP-
   blokk vagy 15 mp-es időtúllépés → hibaállapot (a beírt adat megmarad).
   Beállítás: js/config.js -> leadEndpoint  (útmutató: docs/google-sheets-setup.md)
   ========================================================================== */
(function () {
  "use strict";
  window.EP = window.EP || {};

  const LOCAL_KEY = "ep-leads-local";
  const TIMEOUT_MS = 15000;

  function storeLocal(payload) {
    try {
      const arr = JSON.parse(localStorage.getItem(LOCAL_KEY) || "[]");
      arr.push(payload);
      localStorage.setItem(LOCAL_KEY, JSON.stringify(arr.slice(-50)));
    } catch (e) {
      /* tele van a tároló, nem gond */
    }
  }

  window.EP.sendLead = async function sendLead(payload) {
    const cfg = window.EP.CONFIG || {};
    const url = cfg.leadEndpoint;

    storeLocal(payload); // biztonsági másolat a böngészőben, mindig

    if (!url) {
      console.warn(
        "[Érték Pont] A leadEndpoint nincs beállítva (js/config.js). " +
          "A jelentkezés csak lokálisan mentődött. Élesítés előtt kötelező beállítani! " +
          "Útmutató: docs/google-sheets-setup.md"
      );
      console.info("[Érték Pont] Beérkezett jelentkezés:", payload);
      await new Promise((r) => setTimeout(r, 650)); // hogy a UI valósághű legyen
      return true;
    }

    if (navigator.onLine === false) return false;

    /* Időkorlát: a lógó kérés korábban örökké pörgette a gombot. */
    const ctrl = "AbortController" in window ? new AbortController() : null;
    const timer = ctrl ? setTimeout(() => ctrl.abort(), TIMEOUT_MS) : 0;
    try {
      await fetch(url, {
        method: "POST",
        mode: "no-cors",
        headers: { "Content-Type": "text/plain;charset=utf-8" },
        body: JSON.stringify(payload),
        signal: ctrl ? ctrl.signal : undefined,
      });
      return true;
    } catch (err) {
      /* A leggyakoribb ok nem hálózati hiba, hanem CSP: az Apps Script /exec
         302-vel a script.googleusercontent.com-ra irányít, és a házirend az
         átirányítás célját is ellenőrzi. Ha ez hiányzik a connect-src-ből,
         itt "Failed to fetch" jön — a konzol előző sora mondja meg. */
      console.error(
        "[Érték Pont] Lead küldési hiba:",
        err,
        "\nEllenőrizd a CSP connect-src listáját (generate.mjs → cspMeta): " +
          "https://script.google.com ÉS https://script.googleusercontent.com is kell."
      );
      return false;
    } finally {
      clearTimeout(timer);
    }
  };

  /** Fejlesztői figyelmeztetés, ha nincs beállítva az endpoint */
  window.EP.leadHealthCheck = function () {
    const cfg = window.EP.CONFIG || {};
    const local =
      location.protocol === "file:" ||
      /^(localhost|127\.0\.0\.1)$/.test(location.hostname);
    if (!cfg.leadEndpoint && local) {
      document.querySelectorAll("[data-config-warning]").forEach((el) => {
        el.hidden = false;
      });
    }
  };

  /* ======================================================================
     VALIDÁCIÓ
     ====================================================================== */

  /* Telefonszám. Elfogadott alakok (szóköz, kötőjel, pont, zárójel mindegy):
       +36 20 123 4567 · 0036 20 123 4567 · 06 20 123 4567 · 36 20 123 4567
       20 123 4567 (előhívó nélkül) · +36 1 234 5678 · 06 96 123 456
     Magyar szám: az előtag utáni belföldi rész 9 jegy mobilnál (20, 30, 31,
     50, 70), 8 jegy vezetékesnél (1 + 7, illetve 2 jegyű körzet + 6).
     Külföldi szám (+ vagy 00 és NEM 36): 8–15 jegy (E.164) — a győri oldal
     például Ausztriában dolgozóknak is szól.
     Visszaad: { ok, value (egységes alak), message (hiba esetén) }.     */
  const MOBILE = /^(20|30|31|50|70)/;
  const PHONE_EXAMPLE = "Pl. 06 20 123 4567";

  function formatHu(nsn) {
    if (MOBILE.test(nsn)) return `+36 ${nsn.slice(0, 2)} ${nsn.slice(2, 5)} ${nsn.slice(5)}`;
    if (nsn[0] === "1") return `+36 1 ${nsn.slice(1, 4)} ${nsn.slice(4)}`;
    return `+36 ${nsn.slice(0, 2)} ${nsn.slice(2, 5)} ${nsn.slice(5)}`;
  }

  function checkPhone(raw) {
    const s = String(raw == null ? "" : raw).trim().replace(/^\(\s*(?=\+)/, "");
    if (!s) return { ok: false, message: "Add meg a telefonszámodat — ezen hívlak vissza." };
    if (/[^\d\s+()\-./]/.test(s) || /\+/.test(s.slice(1))) {
      return { ok: false, message: "Csak számjegy, szóköz és az elején + jel lehet. " + PHONE_EXAMPLE };
    }
    const intl = /^(\+|00)/.test(s);
    let d = s.replace(/\D/g, "");
    if (/^00/.test(s)) d = d.slice(2);

    let nsn = null;
    if (/^36/.test(d) && (intl || d.length >= 10)) nsn = d.slice(2);
    else if (!intl && /^06/.test(d)) nsn = d.slice(2);
    else if (!intl && (/^(20|30|31|50|70)\d{7}$/.test(d) || /^1\d{7}$/.test(d))) nsn = d;

    if (nsn !== null) {
      const okHu = MOBILE.test(nsn) ? /^\d{9}$/.test(nsn) : /^[1-9]\d{7}$/.test(nsn);
      if (okHu) return { ok: true, value: formatHu(nsn) };
      return {
        ok: false,
        message: MOBILE.test(nsn)
          ? "Hiányzik vagy fölösleges egy számjegy. " + PHONE_EXAMPLE
          : "Ez nem teljes magyar telefonszám. " + PHONE_EXAMPLE,
      };
    }
    if (intl && d.length >= 8 && d.length <= 15) return { ok: true, value: "+" + d };
    return { ok: false, message: "Ez nem tűnik érvényes telefonszámnak. " + PHONE_EXAMPLE };
  }

  function checkName(raw) {
    const s = String(raw == null ? "" : raw).trim();
    if (!s) return { ok: false, message: "Add meg a nevedet, hogy tudjam, kit keresek." };
    if (s.length < 2 || !/\p{L}/u.test(s)) return { ok: false, message: "A név legalább 2 betű legyen." };
    if (s.length > 80) return { ok: false, message: "A név legfeljebb 80 karakter lehet." };
    return { ok: true, value: s };
  }

  function checkEmail(raw) {
    const s = String(raw == null ? "" : raw).trim();
    if (!s) return { ok: true, value: "" }; // nem kötelező
    return /^[^@\s]+@[^@\s]+\.[a-z]{2,}$/i.test(s)
      ? { ok: true, value: s }
      : { ok: false, message: "Ez az e-mail cím nem tűnik érvényesnek (vagy hagyd üresen)." };
  }

  window.EP.validate = { phone: checkPhone, name: checkName, email: checkEmail };

  /* ======================================================================
     KONTEXTUS A LEADHEZ
     Egy sorban, a táblázatban olvasható formában. A kulcsok ugyanazok, mint
     a mérési eseményeké (js/core/track.js), így a lead és a GA4-riport
     összeköthető. Név, telefon, üzenet nincs benne — az külön oszlop.
     ====================================================================== */
  window.EP.leadContext = function (extra) {
    const c = window.EP.context ? window.EP.context(extra) : Object.assign({}, extra);
    const keys = [
      "form_type", "cta_location", "page_type", "service", "city", "topic",
      "landing_page", "referrer_host", "device_context",
      "utm_source", "utm_medium", "utm_campaign", "utm_content", "utm_term",
    ];
    return keys
      .filter((k) => c[k] !== undefined && c[k] !== null && c[k] !== "")
      .map((k) => `${k}=${String(c[k]).replace(/[|\n\r]/g, " ").slice(0, 120)}`)
      .join(" | ");
  };

  /* ======================================================================
     KÖZÖS ŰRLAP-VISELKEDÉS
     EP.bindLeadForm(form, opts)
       opts.formType   "quick_modal" | "quick_inline" | "funnel_service" | "funnel_map"
       opts.ctx()      → { cta_location, service, topic } — a beküldés pillanatában
       opts.payload(fields, data) → a lead-specifikus mezők (tipus, tema, slug…)
       opts.onSuccess(fields)     → a siker-állapot megjelenítése
     Konvenció: name="name" | "phone" | "email" | "message" | "consent" | "_hp";
     a hibaszöveg eleme az input `aria-describedby` listájának "-err" végű id-je;
     a hozzájárulás hibája [data-consent-error]; az állapotsor [data-status].
     ====================================================================== */
  const esc = (s) =>
    String(s == null ? "" : s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);

  function errEl(input) {
    const ids = (input.getAttribute("aria-describedby") || "").split(/\s+/);
    const id = ids.find((x) => /-err$/.test(x));
    return id ? document.getElementById(id) : null;
  }

  function setFieldError(input, message) {
    if (!input) return;
    const box = errEl(input);
    input.classList.toggle("is-bad", !!message);
    if (message) input.setAttribute("aria-invalid", "true");
    else input.removeAttribute("aria-invalid");
    if (box) box.textContent = message || "";
  }

  const CHECKS = { name: checkName, phone: checkPhone, email: checkEmail };

  window.EP.bindLeadForm = function bindLeadForm(form, opts) {
    const track = window.EP.track || function () {};
    const CFG = window.EP.CONFIG || {};
    const status = form.querySelector("[data-status]");
    const btn = form.querySelector('button[type="submit"]');
    const label = btn && btn.querySelector(".btn__label");
    const idleLabel = label ? label.textContent : "";
    const shownAt = Date.now();
    let touched = false;   // volt-e valódi felhasználói interakció
    let started = false;   // lead_form_start egyszer
    let sending = false;   // dupla beküldés elleni zár

    const base = () => Object.assign({ form_type: opts.formType }, opts.ctx ? opts.ctx() : {});

    const onTouch = (e) => {
      if (e && e.isTrusted === false) return;
      touched = true;
      if (!started && e && e.target && e.target.matches && e.target.matches("input:not([type=hidden]), textarea")) {
        started = true;
        track("lead_form_start", base());
      }
    };
    ["pointerdown", "keydown", "input", "change"].forEach((ev) => form.addEventListener(ev, onTouch));

    /* Mezőnkénti ellenőrzés elhagyáskor — de csak ha már írt bele valamit;
       az üres mezőt nem pirosítjuk pusztán azért, mert átlépett rajta.
       Javítás közben (input) a hiba azonnal eltűnik, amint rendben van.

       Ha a mezőt egy KATTINTÁS hagyja el (pl. a Küldés gombra vagy a
       hozzájárulásra), az ellenőrzés a kattintás UTÁN fut: a megjelenő
       hibaszöveg különben lejjebb tolná a gombot a lenyomás és a felengedés
       között, és a kattintás a semmibe menne. */
    const pending = new Set();
    const validateField = (key, input) => {
      if (!input.value.trim()) return;
      const r = CHECKS[key](input.value);
      setFieldError(input, r.ok ? "" : r.message);
    };
    const flush = () => {
      pointerIsDown = false;
      pending.forEach(([key, input]) => validateField(key, input));
      pending.clear();
    };
    let pointerIsDown = false;
    document.addEventListener("pointerdown", () => (pointerIsDown = true), true);
    /* setTimeout 0: a click esemény a pointerup után, ugyanabban a körben
       fut le — utána ellenőrzünk. */
    document.addEventListener("pointerup", () => setTimeout(flush, 0), true);
    document.addEventListener("pointercancel", () => setTimeout(flush, 0), true);

    Object.keys(CHECKS).forEach((key) => {
      const input = form.elements[key];
      if (!input) return;
      input.addEventListener("blur", () => {
        if (pointerIsDown) pending.add([key, input]);
        else validateField(key, input);
      });
      input.addEventListener("input", () => {
        if (!input.classList.contains("is-bad")) return;
        const r = CHECKS[key](input.value);
        if (r.ok) setFieldError(input, "");
      });
    });

    const consent = form.elements.consent;
    const consentErr = form.querySelector("[data-consent-error]");
    if (consent && consentErr) {
      consent.addEventListener("change", () => {
        if (consent.checked) {
          consentErr.hidden = true;
          consent.removeAttribute("aria-invalid");
        }
      });
    }

    function setStatus(html, kind) {
      if (!status) return;
      status.className = "form-status" + (kind ? " form-status--" + kind : "");
      status.innerHTML = html || "";
      status.hidden = !html;
    }

    function setBusy(on) {
      sending = on;
      if (!btn) return;
      btn.disabled = on;
      btn.setAttribute("aria-busy", String(on));
      btn.classList.toggle("is-loading", on);
      if (label) label.textContent = on ? "Küldés folyamatban…" : idleLabel;
    }

    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      if (sending) return; // Enter / dupla kattintás a folyamatban lévő kérés alatt

      const data = new FormData(form);
      /* --- bot-szűrés: a validáció ELŐTT, csendben ----------------------
         Honeypot: a látható űrlapon nincs ilyen mező, csak egy script tölti
         ki. Interakció nélküli vagy 1 mp-en belüli beküldés: ember legalább
         egyszer belekattint vagy gépel. A valódi védelem a szerveroldalon
         van (docs/apps-script.gs), mert a végpont a böngésző nélkül is
         hívható. Nem jelzünk vissza, min bukott el. */
      if (String(data.get("_hp") || "").length) return;
      if (!touched) return;

      const fields = {};
      const bad = [];
      Object.keys(CHECKS).forEach((key) => {
        const input = form.elements[key];
        if (!input) return;
        const r = CHECKS[key](input.value);
        setFieldError(input, r.ok ? "" : r.message);
        if (r.ok) fields[key] = r.value;
        else bad.push(key);
      });
      fields.message = String(data.get("message") || "").trim().slice(0, 2000);
      if (consent && !consent.checked) {
        bad.push("consent");
        consent.setAttribute("aria-invalid", "true");
        if (consentErr) consentErr.hidden = false;
      }

      if (bad.length) {
        track("lead_form_error", Object.assign(base(), { error_type: "validation", error_fields: bad.join(",") }));
        /* Csak a hozzájárulás hiányzik: a jelölőnégyzet alatti szöveg elég
           (a fókusz oda kerül, a képernyőolvasó az aria-describedby-t
           felolvassa) — ugyanazt kétszer kiírni csak zaj. */
        const fieldBad = bad.filter((k) => k !== "consent");
        setStatus(
          fieldBad.length ? "Nézd át a pirossal jelölt " + (fieldBad.length > 1 ? "mezőket" : "mezőt") + "." : "",
          "warn"
        );
        const first = bad[0] === "consent" ? consent : form.elements[bad[0]];
        if (first) first.focus();
        return;
      }

      setStatus("Küldés folyamatban…", "");
      setBusy(true);
      /* Nagyon gyors (pl. automatikus kitöltéssel) valódi kitöltésnél nem
         dobjuk el a kérést, csak kivárjuk az 1 mp-et — a botot a
         `touched` (valódi felhasználói esemény) már kiszűrte. A gomb
         közben már zárolva van, így a várakozás alatt sem lehet újra küldeni. */
      const wait = 1000 - (Date.now() - shownAt);
      if (wait > 0) await new Promise((r) => setTimeout(r, wait));
      const ctx = base();
      track("lead_form_submit", ctx);

      const payload = Object.assign(
        {
          tipus: "Weboldal",
          tema: "",
          slug: "",
          nev: fields.name || "",
          telefon: fields.phone || "",
          email: fields.email || "",
          megjegyzes: fields.message || "",
          valaszok: "",
          kalkulator: "",
          oldal: location.href.slice(0, 300),
          idopont: new Date().toISOString(),
          kontextus: window.EP.leadContext(ctx),
        },
        opts.payload ? opts.payload(fields, data, ctx) : {}
      );

      const ok = await window.EP.sendLead(payload);
      setBusy(false);
      if (ok) {
        setStatus("", "");
        track("lead_form_success", ctx);
        if (opts.onSuccess) opts.onSuccess(fields);
      } else {
        track("lead_form_error", Object.assign({}, ctx, { error_type: navigator.onLine === false ? "offline" : "network" }));
        const c = CFG.contact || {};
        setStatus(
          `<strong>Nem sikerült elküldeni az űrlapot.</strong> A beírt adatok megmaradtak — próbáld újra,
           vagy hívj most: <a href="tel:${esc(c.phoneHref)}" data-cta-location="form_error">${esc(c.phone)}</a>`,
          "error"
        );
        if (label) label.textContent = "Újraküldés";
        if (status) status.focus();
      }
    });

    return { setStatus };
  };

  window.EP.setFieldError = setFieldError;

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", window.EP.leadHealthCheck);
  } else {
    window.EP.leadHealthCheck();
  }
})();
