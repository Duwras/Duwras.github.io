/* ==========================================================================
   FUNNEL MOTOR
   Kétféle üzemmód:
     type: "map"     → globális Pénzügyi Térkép (7 kérdés + 1 feltételes → top 3)
     type: "service" → egy szolgáltatás funnelje (kérdések → kalkulátor → lead)
   Használat:  EP.Funnel.mount(el, { type: "service", slug: "nyugdij-..." })
   ========================================================================== */
(function () {
  "use strict";
  window.EP = window.EP || {};

  const { $, $$, on } = window.EP;
  const ICON_ARROW =
    '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M7 17 17 7M9 7h8v8"/></svg>';
  const ICON_BACK =
    '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M14 6l-6 6 6 6"/></svg>';

  const esc = (s) =>
    String(s == null ? "" : s).replace(/[&<>"']/g, (c) => ({
      "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
    })[c]);

  /* ==================================================================== */
  class Funnel {
    constructor(root, opts) {
      this.root = root;
      this.type = opts.type || "map";
      this.slug = opts.slug || null;
      this.svc = this.slug ? window.EP.SERVICES.find((s) => s.slug === this.slug) : null;
      this.answers = {};
      this.calcValues = {};
      this.index = 0;
      this.build();
    }

    /* --- lépéslista összeállítása -------------------------------------
       SZÁNDÉKOSAN nincs gyorsítótár: a Térkép egyes kérdései feltételesek
       (`when`), és a feltétel a korábbi válaszoktól függ. Ha egy válasz
       megváltozik, a lépéslistának is változnia kell — egy elmentett lista
       ilyenkor elavult kérdést mutatna, vagy kihagyna egyet. */
    get steps() {
      const list = [];
      if (this.type === "map") {
        window.EP.QUIZ.visibleSteps(this.answers).forEach((s) => list.push({ kind: "choice", data: s }));
      } else {
        (this.svc.funnel.steps || []).forEach((s) => list.push({ kind: "choice", data: s }));
        if (this.svc.funnel.calc) list.push({ kind: "calc", data: this.svc.funnel.calc });
      }
      list.push({ kind: "result" });
      list.push({ kind: "thanks" });
      return list;
    }

    /* --- váz ---------------------------------------------------------- */
    build() {
      const title =
        this.type === "map" ? window.EP.QUIZ.title : this.svc.title;
      const badge = this.type === "map" ? "1 perc" : this.svc.badge;

      this.root.innerHTML = `
        <div class="funnel">
          <div class="funnel__head">
            <div>
              <span class="label">${esc(badge)}</span>
              <div class="h4" style="margin-top:4px">${esc(title)}</div>
            </div>
            <div class="row" style="gap:.75rem;flex:0 0 auto">
              <div class="progress"><div class="progress__fill"></div></div>
              <span class="progress__text"></span>
            </div>
          </div>
          <div class="funnel__body"></div>
          <div class="funnel__foot">
            <button class="btn btn--ghost" data-back type="button">${ICON_BACK}<span>Vissza</span></button>
            <span class="tiny mute" data-hint>Válassz egy lehetőséget</span>
            <button class="btn" data-next type="button"><span class="btn__label">Tovább</span><span class="btn__arrow">${ICON_ARROW}</span></button>
          </div>
        </div>`;

      this.body = $(".funnel__body", this.root);
      this.fill = $(".progress__fill", this.root);
      this.ptext = $(".progress__text", this.root);
      this.btnBack = $("[data-back]", this.root);
      this.btnNext = $("[data-next]", this.root);
      this.hint = $("[data-hint]", this.root);

      on(this.btnBack, "click", () => this.go(-1));
      on(this.btnNext, "click", () => this.go(1));
      this.render();
    }

    go(dir) {
      if (this.steps[this.index].kind === "thanks") return; // beküldés után lezárva
      const next = this.index + dir;
      if (next < 0 || next >= this.steps.length) return;
      if (dir > 0 && !this.valid()) {
        this.hint.textContent = "Válassz egy lehetőséget a továbblépéshez";
        this.hint.style.color = "var(--danger)";
        return;
      }
      this.index = next;
      this.render();
      /* Csak akkor görgetünk, ha a funnel feje tényleg kicsúszott a képből.
         A korábbi verzió a scrollY-t egy fix 100px-es eltoláshoz mérte, és
         emiatt lépésenként oda-vissza ugrott az oldal. */
      const nav = (window.EP.rt ? window.EP.rt.navHeight : 72) + 24;
      const r = this.root.getBoundingClientRect();
      if (r.top < nav - 8 || r.top > window.innerHeight * 0.55) {
        window.scrollTo({
          top: Math.max(0, r.top + window.scrollY - nav),
          behavior: window.EP.reduced ? "auto" : "smooth",
        });
      }
    }

    valid() {
      const step = this.steps[this.index];
      if (step.kind !== "choice") return true;
      const v = this.answers[step.data.id];
      return step.data.multi ? Array.isArray(v) && v.length > 0 : v !== undefined;
    }

    progress() {
      const inputs = this.steps.filter((s) => s.kind === "choice" || s.kind === "calc").length;
      const step = this.steps[this.index];
      const p = step.kind === "choice" || step.kind === "calc"
        ? this.index / inputs
        : 1;
      this.fill.style.width = Math.min(1, p) * 100 + "%";
      this.ptext.textContent =
        step.kind === "thanks"
          ? "kész"
          : step.kind === "result"
          ? "eredmény"
          : `${this.index + 1} / ${inputs}`;
    }

    render() {
      const step = this.steps[this.index];
      this.progress();
      this.hint.style.color = "";
      /* A köszönő képernyőről nincs visszaút: onnan visszalépve újra
         megjelenne az űrlap, és ugyanaz a jelentkezés többször is bemenne. */
      this.btnBack.style.visibility =
        this.index === 0 || step.kind === "thanks" ? "hidden" : "visible";

      const isLastInput = step.kind === "result";
      this.btnNext.style.display =
        step.kind === "result" || step.kind === "thanks" ? "none" : "inline-flex";
      this.hint.style.display = step.kind === "choice" || step.kind === "calc" ? "" : "none";

      if (step.kind === "choice") this.renderChoice(step.data);
      else if (step.kind === "calc") this.renderCalc(step.data);
      else if (step.kind === "result") this.renderResult();
      else this.renderThanks();

      window.EP.initReveal(this.body);
    }

    /* --- kérdés ------------------------------------------------------- */
    renderChoice(q) {
      const picked = this.answers[q.id];
      const multi = !!q.multi;
      const keys = "ABCDEFG";
      this.hint.textContent = multi
        ? "Több választ is megjelölhetsz"
        : "Válassz egy lehetőséget";

      this.body.innerHTML = `
        <div class="fstep is-active">
          <span class="fstep__kicker">${esc(q.kicker || "")}</span>
          <h2 class="fstep__q">${esc(q.q)}</h2>
          ${q.help ? `<p class="fstep__help">${esc(q.help)}</p>` : ""}
          <div class="opts ${q.opts.length <= 3 && !multi ? "" : ""}">
            ${q.opts
              .map((o, i) => {
                const isOn = multi
                  ? Array.isArray(picked) && picked.includes(o.v)
                  : picked === o.v;
                return `<button type="button" class="opt${isOn ? " is-picked" : ""}" data-v="${esc(o.v)}">
                  <span class="opt__key">${keys[i] || i + 1}</span>
                  <span class="opt__label">${esc(o.label)}
                    ${o.note ? `<span class="opt__note">${esc(o.note)}</span>` : ""}
                  </span>
                </button>`;
              })
              .join("")}
          </div>
        </div>`;

      $$(".opt", this.body).forEach((btn) =>
        on(btn, "click", () => {
          const raw = btn.dataset.v;
          const opt = q.opts.find((o) => String(o.v) === raw);
          const val = opt ? opt.v : raw;
          if (multi) {
            let arr = Array.isArray(this.answers[q.id]) ? this.answers[q.id].slice() : [];
            const i = arr.indexOf(val);
            if (i >= 0) arr.splice(i, 1);
            else arr.push(val);
            /* Kizáró opció ("Nincs futó hitelem"): nem állhat együtt a
               többivel, mert az önmagának mondana ellent. Ha ezt választja,
               a többi kiürül; ha a többiből választ, ez esik ki. */
            if (opt && opt.exclusive && arr.includes(val)) arr = [val];
            else if (opt && !opt.exclusive) {
              const excl = q.opts.filter((o) => o.exclusive).map((o) => o.v);
              arr = arr.filter((x) => !excl.includes(x));
            }
            this.answers[q.id] = arr;
            $$(".opt", this.body).forEach((b) =>
              b.classList.toggle("is-picked", arr.map(String).includes(String(b.dataset.v)))
            );
            this.hint.textContent = arr.length
              ? arr.length + " kiválasztva"
              : "Több választ is megjelölhetsz";
          } else {
            this.answers[q.id] = val;
            $$(".opt", this.body).forEach((b) => b.classList.remove("is-picked"));
            btn.classList.add("is-picked");
            setTimeout(() => this.go(1), 220);
          }
        })
      );
    }

    /* --- kalkulátor --------------------------------------------------- */
    /* Beviteli típusok:
         slider  — folytonos szám (összeg, futamidő)
         chips   — 2–4 diszkrét szám
         select  — sok diszkrét érték (évjárat, bónusz fokozat, hónap):
                   ezekre a csúszka pontatlan, a legördülő pontos       */
    renderCalc(calc) {
      const hasSelect = calc.inputs.some((i) => i.type === "select");
      this.hint.textContent = hasSelect
        ? "Töltsd ki a saját adataiddal — az eredmény azonnal frissül"
        : "Húzd a csúszkákat, az eredmény azonnal frissül";

      calc.inputs.forEach((inp) => {
        if (this.calcValues[inp.key] === undefined) this.calcValues[inp.key] = inp.def;
      });

      this.body.innerHTML = `
        <div class="fstep is-active">
          <span class="fstep__kicker">${esc(calc.kicker || "Kalkulátor")}</span>
          <h2 class="fstep__q">${esc(calc.title)}</h2>
          ${calc.help ? `<p class="fstep__help">${esc(calc.help)}</p>` : ""}
          <div class="calc">
            <div class="calc__in" data-controls></div>
            <div class="calc__out" data-out></div>
          </div>
        </div>`;

      const controls = $("[data-controls]", this.body);
      controls.innerHTML = calc.inputs
        .map((inp) => {
          const head = `<div class="field__label"><span>${esc(inp.label)}</span>
              <span class="field__value" data-val="${inp.key}"></span></div>`;

          if (inp.type === "select") {
            return `<div class="field field--select">
              <div class="field__label"><span>${esc(inp.label)}</span></div>
              <div class="select-wrap">
                <select class="select" data-select="${inp.key}" aria-label="${esc(inp.label)}">
                  ${inp.options
                    .map(
                      (o) =>
                        `<option value="${esc(o.v)}"${String(o.v) === String(this.calcValues[inp.key]) ? " selected" : ""}>${esc(o.label)}</option>`
                    )
                    .join("")}
                </select>
              </div>
              ${inp.note ? `<p class="field__note">${esc(inp.note)}</p>` : ""}
            </div>`;
          }

          if (inp.type === "chips") {
            return `<div class="field">
              ${head}
              <div class="chips" data-chips="${inp.key}">
                ${inp.options
                  .map(
                    (o) =>
                      `<button type="button" class="chip" data-o="${o.v !== undefined ? esc(o.v) : o}">${esc(o.label !== undefined ? o.label : o + (inp.unit || ""))}</button>`
                  )
                  .join("")}
              </div>
              ${inp.note ? `<p class="field__note">${esc(inp.note)}</p>` : ""}
            </div>`;
          }

          return `<div class="field">
            ${head}
            <input class="slider" type="range" min="${inp.min}" max="${inp.max}" step="${inp.step}"
              value="${this.calcValues[inp.key]}" data-slider="${inp.key}"
              aria-label="${esc(inp.label)}">
            ${inp.note ? `<p class="field__note">${esc(inp.note)}</p>` : ""}
          </div>`;
        })
        .join("");

      const out = $("[data-out]", this.body);
      const update = () => {
        // értékkijelzők
        calc.inputs.forEach((inp) => {
          const el = $(`[data-val="${inp.key}"]`, this.body);
          const v = this.calcValues[inp.key];
          if (el) {
            const opt =
              inp.options && inp.options.length && inp.options[0] && inp.options[0].v !== undefined
                ? inp.options.find((o) => String(o.v) === String(v))
                : null;
            /* A "%" közvetlenül a szám után jön (5%), a szöveges mértékegység
               elé kerül szóköz (5 év) — kivéve, ha az már benne van. */
            const unit = inp.unit || "";
            el.textContent = opt
              ? opt.short || opt.label
              : unit === "Ft"
              ? window.EP.ft(v)
              : unit === "" || unit === "%" || /^\s/.test(unit)
              ? v + unit
              : v + " " + unit;
          }
          if (inp.type === "chips") {
            $$(`[data-chips="${inp.key}"] .chip`, this.body).forEach((c) =>
              c.classList.toggle("is-picked", String(c.dataset.o) === String(v))
            );
          } else if (inp.type !== "select") {
            const s = $(`[data-slider="${inp.key}"]`, this.body);
            if (s) {
              const pct = ((v - inp.min) / (inp.max - inp.min)) * 100;
              s.style.setProperty("--fill", pct + "%");
            }
          }
        });

        const r = calc.compute(this.calcValues);
        this.result = r;
        out.innerHTML = `
          <div class="result__hero result__hero--calc">
            <div class="result__big${r.bigSmall ? " result__big--sm" : ""}">${esc(r.big)}</div>
            <div class="result__cap"><strong>${esc(r.bigLabel)}</strong><br>${esc(r.caption)}</div>
          </div>
          <div class="breakdown">
            ${r.rows
              .filter(Boolean)
              .map(
                (row) =>
                  `<div class="breakdown__row"><span>${esc(row[0])}</span><b>${esc(row[1])}</b></div>`
              )
              .join("")}
            ${
              r.total
                ? `<div class="breakdown__row breakdown__row--total"><span>${esc(r.total[0])}</span><b>${esc(r.total[1])}</b></div>`
                : ""
            }
          </div>
          <p class="tiny mute calc__note">${esc(r.note || "")}</p>`;
      };

      /* A csúszka `input` eventje húzás közben sűrűn tüzel; a kiírást
         képkockához kötjük, hogy ne számoljunk újra feleslegesen. */
      let raf = 0;
      const schedule = () => {
        if (raf) return;
        raf = requestAnimationFrame(() => {
          raf = 0;
          update();
        });
      };

      $$("[data-slider]", this.body).forEach((s) =>
        on(s, "input", () => {
          this.calcValues[s.dataset.slider] = Number(s.value);
          schedule();
        })
      );
      $$("[data-chips] .chip", this.body).forEach((c) =>
        on(c, "click", () => {
          const key = c.closest("[data-chips]").dataset.chips;
          const raw = c.dataset.o;
          this.calcValues[key] = isNaN(Number(raw)) ? raw : Number(raw);
          update();
        })
      );
      $$("[data-select]", this.body).forEach((s) =>
        on(s, "change", () => {
          const raw = s.value;
          this.calcValues[s.dataset.select] = isNaN(Number(raw)) ? raw : Number(raw);
          update();
        })
      );
      update();
    }

    /* --- eredmény + lead form ---------------------------------------- */
    renderResult() {
      const isMap = this.type === "map";
      let recoHtml = "";
      let headline = "";
      let sub = "";

      if (isMap) {
        const ranked = window.EP.QUIZ.top(this.answers, 3);
        const notes = window.EP.QUIZ.notes(this.answers);
        this.reco = ranked.map((r) => r.slug);
        headline = "Ez a három téma hozza neked most a legtöbbet";
        sub =
          "A válaszaid alapján ezekkel érdemes kezdeni. Kattints bármelyikre a részletekért, vagy kérj visszahívást, és végigvesszük együtt.";
        recoHtml = `<div class="reco">
          ${ranked
            .map((r, i) => {
              const s = window.EP.SERVICES.find((x) => x.slug === r.slug);
              if (!s) return "";
              return `<a class="reco__item" href="${this.hrefTo(s.slug)}">
                <span class="reco__rank">0${i + 1}</span>
                <span class="reco__body">
                  <strong>${esc(s.title)}</strong>
                  <span>${esc(s.metric)} — ${esc(r.reason || s.hook)}</span>
                </span>
                ${ICON_ARROW}
              </a>`;
            })
            .join("")}
        </div>
        ${
          notes.length
            ? `<div class="map-notes">
                 <span class="label">Amit szándékosan kihagytam</span>
                 ${notes.map((t) => `<p>${esc(t)}</p>`).join("")}
               </div>`
            : ""
        }`;
      } else {
        headline = "Kész a helyzetkép";
        sub =
          "Ha szeretnéd konkrét ajánlatokkal, a saját számaidra szabva látni, hagyd itt az elérhetőségedet. 24 órán belül keresek — nem call center, hanem én.";
        if (this.result) {
          recoHtml = `<div class="result__hero">
            <div class="result__big${this.result.bigSmall ? " result__big--sm" : ""}">${esc(this.result.big)}</div>
            <div class="result__cap"><strong>${esc(this.result.bigLabel)}</strong><br>${esc(this.result.caption)}</div>
          </div>`;
        }
      }

      this.body.innerHTML = `
        <div class="fstep is-active">
          <span class="fstep__kicker">Eredmény</span>
          <h2 class="fstep__q">${esc(headline)}</h2>
          <p class="fstep__help">${esc(sub)}</p>
          <div class="result">${recoHtml}</div>
          <form class="lead-form" novalidate>
            <div class="lead-form__row">
              <div class="input-wrap">
                <input class="input" id="f-name" name="name" placeholder=" " autocomplete="name" required>
                <label for="f-name">Neved *</label>
                <div class="field-error">Add meg a nevedet</div>
              </div>
              <div class="input-wrap">
                <input class="input" id="f-phone" name="phone" type="tel" placeholder=" " autocomplete="tel" required>
                <label for="f-phone">Telefonszám *</label>
                <div class="field-error">Adj meg egy elérhető telefonszámot</div>
              </div>
            </div>
            <div class="input-wrap">
              <input class="input" id="f-email" name="email" type="email" placeholder=" " autocomplete="email">
              <label for="f-email">E-mail (nem kötelező)</label>
              <div class="field-error">Ez az e-mail cím nem tűnik érvényesnek</div>
            </div>
            <div class="input-wrap">
              <textarea class="input" id="f-msg" name="message" placeholder=" "></textarea>
              <label for="f-msg">Megjegyzés, kérdés (nem kötelező)</label>
            </div>
            <input class="honeypot" name="_hp" tabindex="-1" autocomplete="off" aria-hidden="true">
            <label class="consent">
              <input type="checkbox" name="consent" required>
              <span>Hozzájárulok, hogy a megadott adataimat a megkeresés megválaszolása céljából kezeljék. Részletek az <a href="${this.hrefTo("adatkezeles", true)}" target="_blank" rel="noopener">adatkezelési tájékoztatóban</a>. *</span>
            </label>
            <div class="field-error" data-consent-error>A hozzájárulás megadása kötelező</div>
            <button class="btn btn--lg btn--block" type="submit">
              <span class="btn__label">Kérek visszahívást</span><span class="btn__arrow">${ICON_ARROW}</span>
            </button>
            <p class="tiny mute">Nem küldünk hírlevelet, nem adjuk át az adataidat harmadik félnek. Egy hívás, konkrét számokkal.</p>
          </form>
        </div>`;

      const form = $("form", this.body);
      /* Időbélyeg a bot-szűréshez: ember nem tölt ki egy négymezős űrlapot
         két másodperc alatt, egy script viszont milliszekundum alatt kitölti. */
      this.formShownAt = Date.now();
      on(form, "submit", (e) => {
        e.preventDefault();
        this.submit(form);
      });
    }

    renderThanks() {
      this.body.innerHTML = `
        <div class="fstep is-active thanks">
          <div class="thanks__check">
            <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round"><path d="M5 13l4 4L19 7"/></svg>
          </div>
          <h2 class="fstep__q">Megérkezett. Köszönöm!</h2>
          <p class="fstep__help center" style="margin-inline:auto">
            24 órán belül keresni fogom a megadott számon. Addig sem kell tétlenül várni:
            nézz körül a többi témában, hátha van még pár tízezer forint az asztalon.
          </p>
          <div class="row center" style="justify-content:center;margin-top:2rem">
            <a class="btn btn--ghost" href="${this.hrefTo("", true)}#szolgaltatasok">Többi téma</a>
          </div>
        </div>`;
    }

    /* --- útvonalak (aloldal / főoldal kontextus) ---------------------- */
    /* A gyökérhez vezető relatív előtagot a generátor írja a <html data-up>
       attribútumba ("", "../", "../../" vagy a 404-en "/"). Így a funnel
       bármilyen mélységű oldalon — szolgáltatás, városi oldal, cikk — jó
       címre linkel, és nem az URL-ből kell kitalálni, hol vagyunk. */
    hrefTo(target, isRoot) {
      const up = document.documentElement.getAttribute("data-up") || "";
      if (isRoot) {
        if (target === "adatkezeles") return `${up}adatkezeles.html`;
        return up || "./";
      }
      return `${up}szolgaltatas/${target}.html`;
    }

    /* --- beküldés ----------------------------------------------------- */
    async submit(form) {
      const data = new FormData(form);
      const name = (data.get("name") || "").toString().trim();
      const phone = (data.get("phone") || "").toString().trim();
      const email = (data.get("email") || "").toString().trim();
      const consent = form.querySelector('[name="consent"]').checked;

      /* --- bot-szűrés: még a validáció ELŐTT, és csendben ---------------
         Aki idáig eljut, az script. Nem adunk neki visszajelzést arról,
         hogy min bukott el, mert abból tanulni lehet. A form csak nem
         csinál semmit. Ez a kliensoldali szűrő; a valódi védelem a
         szerveroldalon van (docs/apps-script.gs), mert a végpontra a
         böngésző kihagyásával is lehet POST-olni.                       */
      if ((data.get("_hp") || "").toString().length) return; // honeypot
      /* 1,5 s: a botok 100 ms alatt küldenek, egy ember viszont még
         automatikus kitöltéssel is legalább ennyit tölt a hozzájárulás
         bepipálásával és a gombra kattintással. */
      if (Date.now() - (this.formShownAt || 0) < 1500) return;

      let bad = false;
      const mark = (sel, cond) => {
        const el = form.querySelector(sel);
        if (!el) return;
        el.classList.toggle("is-bad", cond);
        if (cond) bad = true;
      };
      const digits = phone.replace(/\D/g, "");
      mark("#f-name", name.length < 2 || name.length > 80);
      /* 8 számjegy alatt nincs hívható szám, 15 fölött nincs érvényes
         nemzetközi szám sem (E.164 maximum). */
      mark("#f-phone", digits.length < 8 || digits.length > 15);
      mark("#f-email", email !== "" && !/^[^@\s]+@[^@\s]+\.[a-z]{2,}$/i.test(email));
      const ce = form.querySelector("[data-consent-error]");
      if (ce) ce.style.display = consent ? "none" : "block";
      if (!consent) bad = true;
      if (bad) {
        window.EP.toast("Nézd át a kiemelt mezőket");
        return;
      }

      const btn = form.querySelector('button[type="submit"]');
      btn.classList.add("is-loading");
      btn.querySelector(".btn__label").textContent = "Küldés";

      const payload = {
        tipus: this.type === "map" ? "Pénzügyi Térkép" : "Szolgáltatás-funnel",
        tema: this.type === "map" ? (this.reco || []).join(", ") : this.svc.title,
        slug: this.slug || "penzugyi-terkep",
        nev: name,
        telefon: phone,
        email: email,
        megjegyzes: (data.get("message") || "").toString().trim(),
        valaszok: JSON.stringify(this.answers),
        kalkulator: this.result
          ? `${this.result.bigLabel}: ${this.result.big}` +
            (Object.keys(this.calcValues).length ? " | " + JSON.stringify(this.calcValues) : "")
          : "",
        oldal: location.href,
        idopont: new Date().toISOString(),
      };

      const ok = await window.EP.sendLead(payload);
      btn.classList.remove("is-loading");
      if (ok) {
        this.index = this.steps.length - 1;
        this.render();
      } else {
        btn.querySelector(".btn__label").textContent = "Kérek visszahívást";
        window.EP.toast("Nem sikerült elküldeni — próbáld újra, vagy hívj közvetlenül");
      }
    }
  }

  /* --- publikus API ---------------------------------------------------- */
  window.EP.Funnel = {
    mount(el, opts) {
      if (!el) return null;
      return new Funnel(el, opts);
    },
    autoMount() {
      $$("[data-funnel]").forEach((el) => {
        const v = el.dataset.funnel;
        if (el.dataset.mounted === "1") return;
        el.dataset.mounted = "1";
        if (v === "map") this.mount(el, { type: "map" });
        else this.mount(el, { type: "service", slug: v });
      });
    },
  };

  const boot = () => window.EP.Funnel.autoMount();
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();
})();
