/* ==========================================================================
   UI mag — reveal, nav, akkordeon, számlálók, marquee, banner, overlay
   Klasszikus script (nem modul), hogy file:// alól is működjön.
   Minden scroll-reakció az EP.rt közös buszán megy (js/core/rt.js).
   ========================================================================== */
(function () {
  "use strict";

  window.EP = window.EP || {};
  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const rt = window.EP.rt;

  /* --- kis segédek ---------------------------------------------------- */
  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));
  const on = (el, ev, fn, opt) => el && el.addEventListener(ev, fn, opt);

  /* --- 1. Reveal on scroll -------------------------------------------- */
  /* EGY megfigyelő az egész oldalra. Korábban minden funnel-léptetés új
     IntersectionObserver-t hozott létre, amit soha nem zártunk le. */
  let revealIO = null;
  function initReveal(root = document) {
    const items = $$("[data-reveal], .split-words", root);
    if (!items.length) return;
    if (reduced || !("IntersectionObserver" in window)) {
      items.forEach((el) => el.classList.add("is-in"));
      return;
    }
    if (!revealIO) {
      revealIO = new IntersectionObserver(
        (entries) => {
          entries.forEach((e) => {
            if (!e.isIntersecting) return;
            e.target.classList.add("is-in");
            revealIO.unobserve(e.target);
          });
        },
        { rootMargin: "0px 0px -12% 0px", threshold: 0.08 }
      );
    }
    items.forEach((el) => revealIO.observe(el));
  }

  /* --- 2. Címsor szavankénti bontása ---------------------------------- */
  /* A szövegcsomópontokat szavakra bontjuk, az inline elemeket (pl. <em>)
     érintetlenül hagyjuk, így a lime kiemelés megmarad.                  */
  function splitLines(root = document) {
    $$("[data-lines]", root).forEach((el) => {
      if (el.dataset.split === "1") return;
      el.dataset.split = "1";
      el.classList.add("split-words");

      let i = 0;
      const walk = (node) => {
        Array.from(node.childNodes).forEach((child) => {
          if (child.nodeType === 3) {
            const parts = child.textContent.split(/(\s+)/).filter((p) => p !== "");
            if (!parts.length) return;
            const frag = document.createDocumentFragment();
            parts.forEach((p) => {
              if (/^\s+$/.test(p)) {
                frag.appendChild(document.createTextNode(" "));
                return;
              }
              const w = document.createElement("span");
              w.className = "w";
              w.style.setProperty("--i", i++);
              w.textContent = p;
              frag.appendChild(w);
            });
            child.replaceWith(frag);
          } else if (child.nodeType === 1) {
            walk(child);
          }
        });
      };
      walk(el);
    });
  }

  /* --- 3. Navigáció ---------------------------------------------------- */
  function initNav() {
    const nav = $(".nav");
    if (!nav) return;
    const bar = $(".scroll-bar");
    const sticky = $(".sticky-cta");

    /* Hiszterézis: korábban 6px-es küszöb döntött az elrejtésről, ezért
       tapipadon / lendületes görgetésnél a sáv villogott. Most 64px
       összefüggő mozgás kell a váltáshoz, és a két irány külön sávban. */
    let acc = 0;
    let dirDown = true;
    let hidden = false;
    let stuck = false;
    let ctaOn = false;

    /* A lebegő alsó CTA-sáv telefonon pontosan a funnel léptető gombjaira
       (Vissza / Tovább / Kérek visszahívást) esett, és elfogta a koppintást.
       Amikor a funnel a képernyőn van, nincs is szükség rá: a funnel maga a
       cselekvésre hívás. IntersectionObserverrel figyeljük, hogy ne kelljen
       görgetésenként újabb layoutot olvasni. */
    let funnelSeen = false;
    const funnelEl = $("[data-funnel]");
    if (sticky && funnelEl && "IntersectionObserver" in window) {
      new IntersectionObserver(
        (entries) => {
          funnelSeen = entries.some((e) => e.isIntersecting);
          if (funnelSeen && ctaOn) {
            ctaOn = false;
            sticky.classList.remove("is-in");
          }
        },
        { threshold: 0 }
      ).observe(funnelEl);
    }

    rt.onScroll(({ y, dy, maxY }) => {
      if (dy !== 0) {
        const down = dy > 0;
        if (down !== dirDown) {
          dirDown = down;
          acc = 0;
        }
        acc += Math.abs(dy);
      }

      const wantStuck = y > 24;
      if (wantStuck !== stuck) {
        stuck = wantStuck;
        nav.classList.toggle("is-stuck", stuck);
      }

      const wantHidden = y > 480 && dirDown && acc > 64;
      const wantShown = !dirDown && acc > 24;
      if (wantHidden && !hidden) {
        hidden = true;
        nav.classList.add("is-hidden");
      } else if ((wantShown || y <= 480) && hidden) {
        hidden = false;
        nav.classList.remove("is-hidden");
      }

      if (bar) bar.style.setProperty("--p", maxY > 0 ? (y / maxY).toFixed(4) : 0);

      if (sticky) {
        /* külön be- és kikapcsolási pont, hogy a határon ne pumpáljon */
        const vh = window.innerHeight;
        if (!ctaOn && !funnelSeen && y > vh * 0.85) {
          ctaOn = true;
          sticky.classList.add("is-in");
        } else if (ctaOn && y < vh * 0.65) {
          ctaOn = false;
          sticky.classList.remove("is-in");
        }
      }
    });

    // mobil menü
    const burger = $(".burger");
    const menu = $(".menu");
    if (burger && menu) {
      const toggle = (open) => {
        burger.setAttribute("aria-expanded", String(open));
        menu.classList.toggle("is-open", open);
        lockScroll(open);
      };
      on(burger, "click", () =>
        toggle(burger.getAttribute("aria-expanded") !== "true")
      );
      $$("a", menu).forEach((a) => on(a, "click", () => toggle(false)));
      on(document, "keydown", (e) => {
        if (e.key === "Escape") toggle(false);
      });
    }
  }

  /* --- 3b. Scroll-zár pozíciótartással -------------------------------- */
  /* A sima `overflow:hidden` a mobil böngészők egy részében elveszíti a
     görgetési pozíciót, és a menü bezárása után a lap a tetejére ugrik. */
  let lockY = 0;
  let locked = false;
  function lockScroll(state) {
    if (state === locked) return;
    locked = state;
    const body = document.body;
    if (state) {
      lockY = window.scrollY;
      body.style.top = -lockY + "px";
      body.classList.add("no-scroll");
    } else {
      const y = lockY;
      body.classList.remove("no-scroll");
      body.style.top = "";
      /* Kényszerített layout: amíg a body fixed volt, a dokumentum magassága
         a viewportra omlott, így a scrollTo 0-ra csonkolt volna. */
      void body.offsetHeight;
      /* A html-en `scroll-behavior: smooth` van; a visszaállásnak azonnalinak
         kell lennie, különben látszik a visszapörgés. */
      const root = document.documentElement;
      const prev = root.style.scrollBehavior;
      root.style.scrollBehavior = "auto";
      window.scrollTo(0, y);
      root.style.scrollBehavior = prev;
    }
  }

  /* --- 4. Akkordeon ---------------------------------------------------- */
  /* Nyitás után height:auto-ra váltunk, különben az átméretezéskor (vagy
     betöltődő betűtípusnál) beragadt px-magasság levágja vagy kilógatja
     a szöveget. */
  function initAccordion(root = document) {
    $$(".acc__btn", root).forEach((btn) => {
      const panel = btn.nextElementSibling;
      if (!panel || panel.dataset.acc === "1") return;
      panel.dataset.acc = "1";

      const close = (b, pnl) => {
        b.setAttribute("aria-expanded", "false");
        pnl.style.height = pnl.scrollHeight + "px";
        requestAnimationFrame(() => (pnl.style.height = "0px"));
      };

      on(panel, "transitionend", (e) => {
        if (e.propertyName !== "height") return;
        if (btn.getAttribute("aria-expanded") === "true") panel.style.height = "auto";
      });

      on(btn, "click", () => {
        const open = btn.getAttribute("aria-expanded") === "true";
        const group = btn.closest(".acc");
        if (group && !open) {
          $$(".acc__btn[aria-expanded='true']", group).forEach((b) => {
            if (b.nextElementSibling) close(b, b.nextElementSibling);
          });
        }
        if (open) {
          close(btn, panel);
        } else {
          btn.setAttribute("aria-expanded", "true");
          panel.style.height = panel.scrollHeight + "px";
        }
      });
    });
  }

  /* --- 5. Számlálók ---------------------------------------------------- */
  function initCounters(root = document) {
    const els = $$("[data-count]", root);
    if (!els.length) return;
    const run = (el) => {
      const target = parseFloat(el.dataset.count);
      const dur = parseInt(el.dataset.countDur || "1400", 10);
      const suffix = el.dataset.countSuffix || "";
      const dec = parseInt(el.dataset.countDec || "0", 10);
      if (reduced) {
        el.textContent = target.toLocaleString("hu-HU", { minimumFractionDigits: dec }) + suffix;
        return;
      }
      const t0 = performance.now();
      const tick = (t) => {
        const p = Math.min(1, (t - t0) / dur);
        const eased = 1 - Math.pow(1 - p, 3);
        el.textContent =
          (target * eased).toLocaleString("hu-HU", {
            minimumFractionDigits: dec,
            maximumFractionDigits: dec,
          }) + suffix;
        if (p < 1) requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    };
    if (!("IntersectionObserver" in window)) return els.forEach(run);
    const io = new IntersectionObserver(
      (entries) =>
        entries.forEach((e) => {
          if (e.isIntersecting) {
            run(e.target);
            io.unobserve(e.target);
          }
        }),
      { threshold: 0.4 }
    );
    els.forEach((el) => io.observe(el));
  }

  /* --- 6. Marquee duplázás (a mozgatást a motion.js végzi) ------------ */
  function initMarquee(root = document) {
    $$(".marquee", root).forEach((m) => {
      const track = $(".marquee__track", m);
      if (!track || track.dataset.cloned === "1") return;
      const clone = track.cloneNode(true);
      clone.setAttribute("aria-hidden", "true");
      m.appendChild(clone);
      track.dataset.cloned = "1";
    });
  }

  /* --- 7. Süti banner -------------------------------------------------- */
  function initCookie() {
    const el = $(".cookie");
    if (!el) return;
    const KEY = "ep-cookie-v1";
    if (localStorage.getItem(KEY)) return el.remove();
    setTimeout(() => el.classList.add("is-in"), 1200);
    $$("[data-cookie]", el).forEach((btn) =>
      on(btn, "click", () => {
        localStorage.setItem(KEY, btn.dataset.cookie);
        el.classList.remove("is-in");
        setTimeout(() => el.remove(), 600);
      })
    );
  }

  /* --- 8. Toast -------------------------------------------------------- */
  function toast(msg, ms = 2600) {
    let el = $(".toast");
    if (!el) {
      el = document.createElement("div");
      el.className = "toast";
      el.setAttribute("role", "status");
      document.body.appendChild(el);
    }
    el.textContent = msg;
    requestAnimationFrame(() => el.classList.add("is-in"));
    clearTimeout(el._t);
    el._t = setTimeout(() => el.classList.remove("is-in"), ms);
  }

  /* --- 9. Overlay (funnel modal) ------------------------------------- */
  function initOverlay() {
    const overlay = $(".overlay");
    if (!overlay) return;
    const open = (id) => {
      overlay.classList.add("is-open");
      lockScroll(true);
      overlay.dispatchEvent(new CustomEvent("ep:open", { detail: { id } }));
    };
    const close = () => {
      overlay.classList.remove("is-open");
      lockScroll(false);
    };
    $$("[data-open-funnel]").forEach((btn) =>
      on(btn, "click", (e) => {
        e.preventDefault();
        open(btn.dataset.openFunnel);
      })
    );
    $$("[data-close-overlay]", overlay).forEach((b) => on(b, "click", close));
    on(overlay, "click", (e) => {
      if (e.target === overlay) close();
    });
    on(document, "keydown", (e) => {
      if (e.key === "Escape" && overlay.classList.contains("is-open")) close();
    });
    window.EP.openOverlay = open;
    window.EP.closeOverlay = close;
  }

  /* --- 10. Sima ugrás horgonyokra ------------------------------------- */
  /* Az eltolás a NAV TÉNYLEGES magasságából jön, nem beégetett 90px-ből:
     a nav magassága scrollra változik (is-stuck), a fix érték miatt a
     célszekció fejlécét hol levágta, hol alá ugrott. */
  function scrollToEl(el) {
    const y = el.getBoundingClientRect().top + window.scrollY - (rt.navHeight + 24);
    window.scrollTo({ top: Math.max(0, y), behavior: reduced ? "auto" : "smooth" });
  }
  function initAnchors() {
    $$('a[href^="#"]').forEach((a) => {
      on(a, "click", (e) => {
        const id = a.getAttribute("href");
        if (id.length < 2) return;
        const t = document.querySelector(id);
        if (!t) return;
        e.preventDefault();
        scrollToEl(t);
      });
    });
  }

  /* --- 11. Év a footerben --------------------------------------------- */
  function initYear() {
    $$("[data-year]").forEach((el) => (el.textContent = new Date().getFullYear()));
  }

  /* --- indítás --------------------------------------------------------- */
  function boot() {
    initNav();
    splitLines();
    initReveal();
    initAccordion();
    initCounters();
    initMarquee();
    initCookie();
    initOverlay();
    initAnchors();
    initYear();
    rt.remeasure();
  }

  Object.assign(window.EP, {
    $, $$, on, reduced, toast, lockScroll, scrollToEl,
    initReveal, initAccordion, initCounters, splitLines,
  });

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();
