/* ==========================================================================
   VISSZAHÍVÁS-KÉRÉS — QuickLeadForm, modál, CTA-kötés, mobil konverziós sáv
   --------------------------------------------------------------------------
   A fő konverziós út: CTA → azonnal űrlap → siker. Nincs átnavigálás.

   - Minden [data-callback] gomb (hero, header, mobil sáv, szekció-CTA-k,
     záró CTA) ezt a modált nyitja. A gomb valódi link a kapcsolat oldal
     űrlapjára (…/kapcsolat/#visszahivas): ha a JS még nem töltött be vagy
     hibás, a látogató ott akkor is talál űrlapot és telefonszámot.
   - Ha az oldalon van beágyazott űrlap ([data-qlf-inline], a kapcsolat
     oldalon), a gomb nem modált nyit, hanem odagörget és fókuszál.
   - A modál natív <dialog>: showModal() → a háttér inert, a fókusz bent
     marad, Escape bezárja; bezáráskor a fókusz visszakerül a gombra.
   - Mezők: név*, telefon*, téma (gomb-csoport, nem kötelező, az oldal
     kontextusából előre kijelölve), megjegyzés (összecsukva), adatkezelési
     hozzájárulás* (ugyanaz a szöveg, mint a funnel-űrlapon).
   - Témák: CSAK a js/data/services.js valós szolgáltatásaiból.
   ========================================================================== */
(function () {
  "use strict";
  window.EP = window.EP || {};
  const { $, $$ } = window.EP;
  const CFG = window.EP.CONFIG || {};
  const C = CFG.contact || {};
  const root = document.documentElement;
  const track = (...a) => window.EP.track && window.EP.track(...a);

  const esc = (s) =>
    String(s == null ? "" : s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);

  const ICON_PHONE =
    '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a1 1 0 0 1-1 1A16 16 0 0 1 4 5a1 1 0 0 1 1-1z"/></svg>';
  const ICON_CHECK =
    '<svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" aria-hidden="true"><path d="M5 13l4 4L19 7"/></svg>';
  const ICON_CLOSE =
    '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18"/></svg>';

  const up = () => root.getAttribute("data-up") || "";
  const SERVICES = window.EP.SERVICES || [];
  const svc = (slug) => SERVICES.find((s) => s.slug === slug) || null;

  /* --- Témák -----------------------------------------------------------
     Hat csoport a 13 valós szolgáltatásból (a kategóriák a services.js
     szerint, a látogató nyelvén). Az "atnezes" a pénzügyi tervezés /
     teljes helyzetfelmérés (/penzugyi-tervezes/), ami szintén valós. */
  const TOPICS = [
    { key: "megtakaritas", label: "Nyugdíj, megtakarítás", slugs: ["nyugdij-megtakaritas", "gyerek-megtakaritas", "szabad-felhasznalasu-megtakaritas"] },
    { key: "adokedvezmeny", label: "20% adókedvezmény", slugs: ["adokedvezmeny-gyerek-no", "adokedvezmeny-lakashitel"] },
    { key: "biztositas", label: "Biztosítás", slugs: ["elet-biztositas", "baleset-biztositas", "egeszsegbiztositas", "kgfb-casco"] },
    { key: "hitel", label: "Lakáshitel, kölcsön", slugs: ["tamogatott-hitelek", "piaci-hitelek", "szemelyi-kolcson"] },
    { key: "bankszamla", label: "Bankszámla", slugs: ["dijmentes-bankszamla"] },
    { key: "atnezes", label: "Teljes pénzügyi átnézés", slugs: [] },
  ]
    .map((t) => Object.assign({}, t, { slugs: t.slugs.filter(svc) }))
    .filter((t) => t.key === "atnezes" || t.slugs.length);

  /* Az oldal (vagy a gomb) szolgáltatás-kontextusa → előre kijelölt téma. */
  function defaultTopic(serviceSlug) {
    if (serviceSlug && svc(serviceSlug)) return "svc:" + serviceSlug;
    if (root.dataset.pageType === "planning") return "atnezes";
    return "";
  }

  function topicInfo(value) {
    if (!value) return { label: "Nem jelölt témát", slug: "" };
    if (value.startsWith("svc:")) {
      const s = svc(value.slice(4));
      return s ? { label: s.title, slug: s.slug } : { label: value, slug: "" };
    }
    const t = TOPICS.find((x) => x.key === value);
    return t ? { label: t.label, slug: t.key } : { label: value, slug: "" };
  }

  let uid = 0;

  /* --- Az űrlap markupja ------------------------------------------------ */
  function formHtml(p, serviceSlug) {
    const pre = defaultTopic(serviceSlug);
    const s = pre.startsWith("svc:") ? svc(pre.slice(4)) : null;
    const chips = (s ? [{ value: pre, label: s.navTitle }] : [])
      .concat(TOPICS.map((t) => ({ value: t.key, label: t.label })))
      .map(
        (t) => `<label class="qlf-chip"><input type="radio" name="topic" value="${esc(t.value)}"${t.value === pre ? " checked" : ""}><span>${esc(t.label)}</span></label>`
      )
      .join("");
    const priv = `${up()}adatkezeles.html`;
    return `
      <form class="qlf__form" novalidate>
        <!-- A két kötelező mező elöl: kis kijelzőn is a képben van, amint a
             modál kinyílik. A téma utána jön, és nem kötelező. -->
        <div class="qlf__row">
          <div class="input-wrap">
            <input class="input" id="${p}-name" name="name" autocomplete="name" enterkeyhint="next" maxlength="80" required placeholder=" " aria-describedby="${p}-name-err">
            <label for="${p}-name">Neved *</label>
            <p class="field-error" id="${p}-name-err" aria-live="polite"></p>
          </div>
          <div class="input-wrap">
            <input class="input" id="${p}-phone" name="phone" type="tel" inputmode="tel" autocomplete="tel" enterkeyhint="send" maxlength="24" required placeholder=" " aria-describedby="${p}-phone-hint ${p}-phone-err">
            <label for="${p}-phone">Telefonszám *</label>
            <p class="field-hint" id="${p}-phone-hint">pl. 06 20 123 4567</p>
            <p class="field-error" id="${p}-phone-err" aria-live="polite"></p>
          </div>
        </div>
        <fieldset class="qlf-topics">
          <legend class="qlf-legend">Miben segíthetek? <span class="mute">(nem kötelező)</span></legend>
          <div class="qlf-chips">${chips}</div>
        </fieldset>
        <details class="qlf-more">
          <summary>Megjegyzés hozzáadása <span class="mute">(nem kötelező)</span></summary>
          <div class="input-wrap">
            <textarea class="input" id="${p}-msg" name="message" maxlength="2000" placeholder=" "></textarea>
            <label for="${p}-msg">Pl. mikor hívjalak, miről beszéljünk</label>
          </div>
        </details>
        <input class="honeypot" name="_hp" tabindex="-1" autocomplete="off" aria-hidden="true">
        <label class="consent">
          <input type="checkbox" name="consent" required aria-describedby="${p}-consent-err">
          <span>Hozzájárulok, hogy a megadott adataimat a megkeresés megválaszolása céljából kezeljék. Részletek az <a href="${priv}" target="_blank" rel="noopener">adatkezelési tájékoztatóban</a>. *</span>
        </label>
        <p class="field-error field-error--block" id="${p}-consent-err" data-consent-error hidden>Az adatkezelési hozzájárulás nélkül nem tudom elküldeni a kérést.</p>
        <div class="form-status" data-status role="status" aria-live="polite" tabindex="-1" hidden></div>
        <button class="btn btn--lg btn--block" type="submit">
          <span class="btn__label">Visszahívást kérek</span>
        </button>
        <p class="qlf-note tiny mute">Nem küldök hírlevelet, és nem adom át az adataidat harmadik félnek.
          Inkább most hívnál? <a href="tel:${esc(C.phoneHref)}" data-cta-location="form">${esc(C.phone)}</a></p>
      </form>`;
  }

  /* Időt csak akkor ígér, ha a config.contact.callbackPromise ki van töltve. */
  function successHtml(p) {
    const when = C.callbackPromise ? ` ${esc(C.callbackPromise)}` : "";
    return `
      <div class="qlf-done" data-cta-location="form_success">
        <div class="thanks__check">${ICON_CHECK}</div>
        <h2 class="qlf-done__title" id="${p}-done" tabindex="-1">Köszönöm, megkaptam a kérésed.</h2>
        <p class="soft">A megadott számon${when} visszahívlak — jellemzően ${esc(C.hoursShort || "hétköznap")} között.
          Ha közben eszedbe jut valami, a hívásnál elmondhatod.</p>
        <p class="qlf-done__alt">Inkább most beszélnél?</p>
        <a class="btn btn--ghost btn--block" href="tel:${esc(C.phoneHref)}">${ICON_PHONE}<span class="btn__label">Hívás most: ${esc(C.phone)}</span></a>
      </div>`;
  }

  /* --- QuickLeadForm: egy példány egy konténerben ----------------------- */
  function mountForm(host, { formType, ctx, onSuccess }) {
    const p = "qlf" + ++uid;
    const context = ctx || {};
    host.classList.add("qlf");
    host.innerHTML = formHtml(p, context.service || root.dataset.service || "");
    const form = $("form", host);

    window.EP.bindLeadForm(form, {
      formType,
      ctx: () => {
        const picked = form.querySelector('input[name="topic"]:checked');
        return {
          cta_location: context.cta_location || "",
          service: context.service || root.dataset.service || "",
          topic: picked ? topicInfo(picked.value).slug : "",
        };
      },
      payload: (fields, data, c) => {
        const t = topicInfo(String(data.get("topic") || ""));
        return {
          tipus: formType === "quick_inline" ? "Visszahívás-kérés (kapcsolat oldal)" : "Visszahívás-kérés",
          tema: t.label,
          slug: t.slug || root.dataset.service || "",
          /* Visszafelé kompatibilitás: a jelenleg telepített Apps Script (v3)
             még nem ismeri a `kontextus` mezőt, ezért itt a Válaszok oszlopba
             is beírjuk — a gyors űrlapnak amúgy sincs kérdés-válasza. */
          valaszok: window.EP.leadContext(c),
        };
      },
      onSuccess: () => {
        host.innerHTML = successHtml(p);
        const h = document.getElementById(p + "-done");
        /* Modálban nincs mit görgetni; beágyazott űrlapnál a fix fejléc
           magasságával görgetünk, különben a cím a fejléc alá kerülne. */
        if (h) h.focus({ preventScroll: true });
        if (!host.closest("dialog") && window.EP.scrollToEl && host.getBoundingClientRect().top < 0) {
          window.EP.scrollToEl(host);
        }
        if (onSuccess) onSuccess();
      },
    });
    return form;
  }

  /* --- Modál ------------------------------------------------------------ */
  let dlg = null;
  let opener = null;
  let done = false;
  /* A modál űrlapja ezt az objektumot olvassa a beküldés pillanatában —
     így a legutóbb megnyomott gomb helye kerül a leadbe, a félig kitöltött
     űrlap pedig megmarad, ha a látogató bezárja és újranyitja. */
  const modalCtx = {};

  function buildDialog() {
    dlg = document.createElement("dialog");
    dlg.className = "qlm";
    dlg.setAttribute("aria-labelledby", "qlm-title");
    dlg.innerHTML = `
      <div class="qlm__panel">
        <div class="qlm__head">
          <img class="qlm__avatar" src="${up()}assets/brand/avatar.webp" alt="" width="48" height="48" decoding="async">
          <div>
            <h2 class="qlm__title" id="qlm-title" tabindex="-1">Visszahívást kérek</h2>
            <p class="qlm__sub">${esc(CFG.advisor ? CFG.advisor.name : "")} — nem call center, én hívlak vissza.</p>
          </div>
          <button class="qlm__close" type="button" data-qlm-close aria-label="Bezárás">${ICON_CLOSE}</button>
        </div>
        <div class="qlm__body"></div>
      </div>`;
    document.body.appendChild(dlg);
    $("[data-qlm-close]", dlg).addEventListener("click", () => close());
    /* A panelen kívüli kattintás (a háttér) bezár. */
    dlg.addEventListener("click", (e) => {
      if (e.target === dlg) close();
    });
    dlg.addEventListener("close", onClosed);
  }

  function open(ctx) {
    if (!dlg) buildDialog();
    if (dlg.open) return;
    ctx = ctx || {};
    dlg.dataset.cta = ctx.cta_location || "";
    modalCtx.cta_location = ctx.cta_location || "";
    modalCtx.service = ctx.service || "";
    /* Siker után a következő nyitás friss űrlapot ad (új kérés). */
    const body = $(".qlm__body", dlg);
    if (done || !body.firstElementChild) {
      done = false;
      mountForm(body, { formType: "quick_modal", ctx: modalCtx, onSuccess: () => (done = true) });
    }
    opener = document.activeElement;
    window.EP.lockScroll && window.EP.lockScroll(true);
    document.body.classList.add("qlm-open");
    if (typeof dlg.showModal === "function") dlg.showModal();
    else dlg.setAttribute("open", "");
    watchViewport(true);
    /* Asztali gépen rögtön a névmezőbe: CTA → gépelés. Telefonon a címre,
       hogy a billentyűzet ne takarja el az egész űrlapot és a témákat. */
    const fine = window.matchMedia && window.matchMedia("(pointer: fine)").matches;
    const target = fine ? $('input[name="name"]', dlg) : $("#qlm-title", dlg);
    (target || $("#qlm-title", dlg)).focus();
    track("lead_form_view", { form_type: "quick_modal", cta_location: ctx.cta_location || "", service: ctx.service || root.dataset.service || "" });
  }

  /* Billentyűzet telefonon: a visualViewport mondja meg, mennyi hely maradt.
     Az alsó panel ennyivel feljebb kerül és ennyire zsugorodik (css/cro.css
     → --kb, --vvh), a fókuszban lévő mező pedig a látható részbe gördül. */
  const vv = window.visualViewport;
  function fitViewport() {
    if (!vv || !dlg) return;
    const kb = Math.max(0, window.innerHeight - vv.height - vv.offsetTop);
    dlg.style.setProperty("--kb", Math.round(kb) + "px");
    dlg.style.setProperty("--vvh", Math.round(vv.height) + "px");
  }
  function onFieldFocus(e) {
    const t = e.target;
    if (!t || !t.matches || !t.matches("input, textarea")) return;
    setTimeout(() => t.scrollIntoView({ block: "nearest" }), 320);
  }
  function watchViewport(on) {
    if (vv) {
      const m = on ? "addEventListener" : "removeEventListener";
      vv[m]("resize", fitViewport);
      vv[m]("scroll", fitViewport);
    }
    if (dlg) dlg[on ? "addEventListener" : "removeEventListener"]("focusin", onFieldFocus);
    if (on) fitViewport();
  }

  function close() {
    if (!dlg || !dlg.open) return;
    if (typeof dlg.close === "function") dlg.close();
    else { dlg.removeAttribute("open"); onClosed(); }
  }

  function onClosed() {
    /* Beküldés nélküli bezárás (×, háttér, Escape) — a lemorzsolódás mérése. */
    if (!done) track("lead_form_close", { form_type: "quick_modal", cta_location: dlg ? dlg.dataset.cta || "" : "" });
    watchViewport(false);
    document.body.classList.remove("qlm-open");
    window.EP.lockScroll && window.EP.lockScroll(false);
    if (opener && opener.focus && document.contains(opener)) opener.focus();
    opener = null;
  }

  /* --- CTA-kötés -------------------------------------------------------- */
  function inlineHost() {
    return $("[data-qlf-inline]");
  }

  document.addEventListener("click", (e) => {
    const el = e.target && e.target.closest ? e.target.closest("[data-callback]") : null;
    if (!el || e.defaultPrevented || e.button > 0 || e.metaKey || e.ctrlKey || e.shiftKey) return;
    e.preventDefault();
    const ctx = {
      cta_location: window.EP.ctaLocation ? window.EP.ctaLocation(el) : "",
      service: el.dataset.service || root.dataset.service || "",
    };
    track("cta_callback_click", ctx);
    const host = inlineHost();
    if (host) {
      window.EP.scrollToEl ? window.EP.scrollToEl(host.closest("section") || host) : host.scrollIntoView();
      const name = $('input[name="name"]', host);
      if (name) setTimeout(() => name.focus({ preventScroll: true }), 450);
      return;
    }
    open(ctx);
  });

  /* --- Beágyazott űrlap (kapcsolat oldal) ------------------------------- */
  function mountInline() {
    const host = inlineHost();
    if (!host || host.dataset.mounted === "1") return;
    host.dataset.mounted = "1";
    mountForm(host, { formType: "quick_inline", ctx: { cta_location: host.dataset.ctaLocation || "contact_form" } });
    const seen = () => track("lead_form_view", { form_type: "quick_inline", cta_location: host.dataset.ctaLocation || "contact_form" });
    if ("IntersectionObserver" in window) {
      const io = new IntersectionObserver((entries) => {
        if (entries.some((x) => x.isIntersecting)) {
          io.disconnect();
          seen();
        }
      }, { threshold: 0.3 });
      io.observe(host);
    } else seen();
    /* A /kapcsolat/#visszahivas címre érkezve (pl. JS nélküli CTA-ból
       vagy másik oldalról) a névmező kapja a fókuszt. */
    if (location.hash === "#visszahivas") {
      const name = $('input[name="name"]', host);
      if (name) setTimeout(() => name.focus({ preventScroll: true }), 300);
    }
  }

  /* --- Mobil konverziós sáv (.mbar) --------------------------------------
     Látszik, amikor a hero CTA-i nincsenek a képben (ha ott vannak, kétszer
     nem kell ugyanaz a két gomb). Eltűnik, ha
       - egy funnel vagy beágyazott űrlap van a képernyő alsó harmadában
         (különben a léptető / küldés gombra esne a koppintás),
       - a látogató egy mezőbe gépel (a billentyűzet fölé ne ugorjon be),
       - nyitva a modál vagy a menü (azokat a CSS takarja).
     A CSS csak 860 px alatt jeleníti meg. A sáv helyét a lábléc alja
     végig fenntartja (css/cro.css), így megjelenéskor nincs layout-ugrás. */
  function initBar() {
    const bar = $(".mbar");
    if (!bar) return;
    const state = { past: false, blocked: false, typing: false };
    const apply = () => {
      const on = state.past && !state.blocked && !state.typing;
      bar.classList.toggle("is-in", on);
      bar.setAttribute("aria-hidden", String(!on));
      $$("a", bar).forEach((a) => (on ? a.removeAttribute("tabindex") : a.setAttribute("tabindex", "-1")));
      document.body.classList.toggle("mbar-on", on);
    };
    const heroCta = $("[data-hero-cta]");
    if (heroCta && "IntersectionObserver" in window) {
      new IntersectionObserver((entries) => {
        /* Akkor kell a sáv, ha a hero gombjai NINCSENEK a képben: vagy már
           kigördültek fölül, vagy (kis kijelzőn, hosszú fejlécnél — pl. a
           Rólam oldal portréja alatt) még a hajtás alatt vannak. Így az
           első képernyőn is mindig van hívás / visszahívás gomb. */
        state.past = !entries[0].isIntersecting;
        apply();
        /* -64px alul: a képernyő aljáról épp csak kilógó gombfél nem számít
           látható CTA-nak. */
      }, { rootMargin: "0px 0px -64px 0px" }).observe(heroCta);
    } else {
      state.past = true;
    }
    /* Nem az egész funnelt figyeljük (a főoldalon másfél képernyő), csak a
       léptető sávját (.funnel__foot) — a küldés gomb közvetlenül fölötte
       van. Így a kvíz olvasása közben a sáv elérhető marad. */
    const blockers = $$("[data-funnel] .funnel__foot, [data-qlf-inline]");
    if (blockers.length && "IntersectionObserver" in window) {
      const vis = new Set();
      const io = new IntersectionObserver((entries) => {
        entries.forEach((e) => (e.isIntersecting ? vis.add(e.target) : vis.delete(e.target)));
        state.blocked = vis.size > 0;
        apply();
      });
      blockers.forEach((b) => io.observe(b));
    }
    const isField = (t) => t && t.matches && t.matches("input:not([type=checkbox]):not([type=radio]), textarea, select");
    document.addEventListener("focusin", (e) => {
      if (isField(e.target)) { state.typing = true; apply(); }
    });
    document.addEventListener("focusout", (e) => {
      if (isField(e.target)) {
        state.typing = false;
        /* Mezőről mezőre lépésnél ne villanjon fel közben. */
        setTimeout(() => { if (!isField(document.activeElement)) apply(); }, 120);
      }
    });
    apply();
  }

  function boot() {
    mountInline();
    /* A funnel (js/funnel.js) a csomagban később indul — a léptető sávja
       csak utána létezik, amit a mobil sáv figyel. */
    setTimeout(initBar, 0);
  }

  window.EP.QuickLead = { open, close, mount: mountForm, TOPICS };

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();
})();
