/* ==========================================================================
   OLDAL-LOGIKA — config-kötések, stat blokk, kategória-szűrő, referenciák
   A tartalom a HTML-be van égetve (SEO), a személyes adatok innen jönnek,
   hogy a config.js módosítása után ne kelljen újragenerálni az oldalakat.
   ========================================================================== */
(function () {
  "use strict";
  window.EP = window.EP || {};
  const { $, $$, on } = window.EP;
  const CFG = window.EP.CONFIG || {};

  const get = (path) =>
    path.split(".").reduce((o, k) => (o == null ? undefined : o[k]), CFG);

  const isTodo = (v) =>
    v === undefined || v === null || v === "" || /^TODO/i.test(String(v));

  /* --- 1. Config-kötések ---------------------------------------------- */
  function bindConfig() {
    $$("[data-cfg]").forEach((el) => {
      const v = get(el.dataset.cfg);
      if (!isTodo(v)) el.textContent = v;
      else el.classList.add("is-todo");
    });
    $$("[data-cfg-href]").forEach((el) => {
      const raw = el.dataset.cfgHref;
      const [path, prefix] = raw.split("|");
      const v = get(path);
      if (isTodo(v)) {
        el.setAttribute("aria-disabled", "true");
        el.classList.add("is-todo");
        return;
      }
      el.href = (prefix || "") + v;
    });
    $$("[data-cfg-src]").forEach((el) => {
      const v = get(el.dataset.cfgSrc);
      if (!isTodo(v)) {
        const inSub = /\/szolgaltatas\//.test(location.pathname);
        el.src = (inSub ? "../" : "") + v;
      } else {
        el.closest("[data-photo-wrap]")?.classList.add("no-photo");
      }
    });
    // teljes blokkok elrejtése, ha nincs hozzá adat
    $$("[data-cfg-if]").forEach((el) => {
      if (isTodo(get(el.dataset.cfgIf))) el.hidden = true;
    });
  }

  /* --- 2. Stat blokk --------------------------------------------------- */
  function renderStats() {
    const host = $("[data-render='stats']");
    if (!host) return;
    const items = (CFG.stats || []).filter((s) => Number(s.value) > 0);
    if (!items.length) {
      // valós adat nélkül a szakmai tartalomra váltunk, nem találunk ki számokat
      host.innerHTML = `
        <div class="stat" data-reveal>
          <div class="stat__value">280<span class="stat__unit"> e Ft</span></div>
          <p class="stat__label">maximális éves adójóváírás nyugdíjcélra, a három forma kombinálásával</p>
        </div>
        <div class="stat" data-reveal style="--reveal-delay:80ms">
          <div class="stat__value">150<span class="stat__unit"> e Ft</span></div>
          <p class="stat__label">éves adójóváírás egészség- és önsegélyező pénztári befizetésre</p>
        </div>
        <div class="stat" data-reveal style="--reveal-delay:160ms">
          <div class="stat__value">3<span class="stat__unit">%</span></div>
          <p class="stat__label">fix kamat az Otthon Start támogatott lakáshitelnél, 25 évre</p>
        </div>
        <div class="stat" data-reveal style="--reveal-delay:240ms">
          <div class="stat__value">13</div>
          <p class="stat__label">terület, amit egy helyen, egy emberrel átnézhetsz</p>
        </div>`;
      window.EP.initReveal(host);
      return;
    }
    host.innerHTML = items
      .map(
        (s, i) => `
      <div class="stat" data-reveal style="--reveal-delay:${i * 80}ms">
        <div class="stat__value"><span data-count="${s.value}" data-count-suffix="">0</span><span class="stat__unit">${s.suffix || ""}</span></div>
        <p class="stat__label">${s.label}</p>
      </div>`
      )
      .join("");
    window.EP.initReveal(host);
    window.EP.initCounters(host);
  }

  /* --- 3. Kategória-szűrő a bento gridhez ----------------------------- */
  function initFilter() {
    const bar = $("[data-filter]");
    const grid = $("[data-grid]");
    if (!bar || !grid) return;
    const cards = $$("[data-cat]", grid);
    $$("button", bar).forEach((btn) =>
      on(btn, "click", () => {
        const cat = btn.dataset.cat;
        $$("button", bar).forEach((b) => b.classList.toggle("is-picked", b === btn));
        cards.forEach((c) => {
          const show = cat === "all" || c.dataset.cat === cat;
          c.style.display = show ? "" : "none";
        });
      })
    );
  }

  /* --- 4. Referenciák -------------------------------------------------- */
  function renderTestimonials() {
    const host = $("[data-render='testimonials']");
    if (!host) return;
    const items = CFG.testimonials || [];
    if (!items.length) {
      host.closest("section")?.remove();
      return;
    }
    host.innerHTML = items
      .map(
        (t, i) => `
      <figure class="quote" data-reveal style="--reveal-delay:${i * 90}ms">
        <blockquote class="quote__text">„${t.text}”</blockquote>
        <figcaption class="quote__meta">${t.name}${t.meta ? " — " + t.meta : ""}</figcaption>
      </figure>`
      )
      .join("");
    window.EP.initReveal(host);
  }

  /* --- 5. Naptár-CTA csak akkor, ha van link -------------------------- */
  function initCalendar() {
    const v = get("contact.calendar");
    $$("[data-calendar]").forEach((el) => {
      if (isTodo(v)) el.remove();
      else el.href = v;
    });
  }

  function boot() {
    bindConfig();
    renderStats();
    initFilter();
    renderTestimonials();
    initCalendar();
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();
})();
