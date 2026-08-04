/* ==========================================================================
   RUNTIME — EGY rAF hurok és EGY scroll-busz az egész oldalra.
   Miért: korábban 5 külön scroll-listener olvasott layoutot (nav, parallax,
   marquee, hero3d, scene3d), és 3 külön rAF hurok futott. Ez layout-thrash-t
   és akadozást okozott. Itt egy helyen olvasunk, egy helyen rajzolunk.
   A hurok LEÁLL, ha nincs aktív feliratkozó — üresjáratban nem eszi az akkut.
   ========================================================================== */
(function () {
  "use strict";
  window.EP = window.EP || {};

  const frameSubs = new Set();
  const scrollSubs = new Set();

  let running = false;
  let lastT = 0;
  let lastY = window.scrollY;
  let vel = 0;
  let dirty = true;
  let maxY = 0;
  let navH = 72;

  function measure() {
    maxY = Math.max(0, document.documentElement.scrollHeight - window.innerHeight);
    const nav = document.querySelector(".nav");
    if (nav) navH = nav.offsetHeight;
    dirty = true;
    /* Kell a kick: ha a hurok épp áll (nincs aktív feliratkozó), egy
       akkordeon-nyitás vagy funnel-léptetés miatti magasságváltozás
       különben csak a következő scrollnál jutna el a scroll-bar-hoz. */
    kick();
  }

  function kick() {
    if (running) return;
    running = true;
    lastT = performance.now();
    requestAnimationFrame(loop);
  }

  function loop(t) {
    const dt = Math.min(0.05, (t - lastT) / 1000);
    lastT = t;

    const y = window.scrollY;
    const dy = y - lastY;
    lastY = y;
    vel += (Math.abs(dy) - vel) * 0.2;
    if (vel < 0.02) vel = 0;

    if (dirty || dy !== 0) {
      dirty = false;
      const st = { y, dy, vel, maxY, p: maxY > 0 ? y / maxY : 0 };
      scrollSubs.forEach((fn) => fn(st));
    }

    let active = false;
    frameSubs.forEach((s) => {
      if (!s.active) return;
      active = true;
      s.fn(t / 1000, dt);
    });

    if (active || dy !== 0 || vel > 0) requestAnimationFrame(loop);
    else running = false;
  }

  /* --- publikus API ---------------------------------------------------- */
  const rt = {
    /* Feliratkozás scroll-állapotra. fn({y, dy, vel, maxY, p}) */
    onScroll(fn) {
      scrollSubs.add(fn);
      dirty = true;
      kick();
      return () => scrollSubs.delete(fn);
    },

    /* Feliratkozás minden képkockára. A visszaadott handle .active
       flagjével kapcsolható — így a hurok üresjáratban leáll. */
    onFrame(fn, active) {
      const sub = { fn, active: active !== false };
      frameSubs.add(sub);
      const handle = {
        set active(v) {
          sub.active = !!v;
          if (v) kick();
        },
        get active() {
          return sub.active;
        },
        stop() {
          frameSubs.delete(sub);
        },
      };
      if (sub.active) kick();
      return handle;
    },

    /* Aktuális nav-magasság: az anchor-ugrások ehhez igazodnak, nem
       egy beégetett 90px-hez (a nav magassága scrollra változik). */
    get navHeight() {
      return navH;
    },
    get maxY() {
      return maxY;
    },
    remeasure: measure,
    kick,
  };

  window.addEventListener(
    "scroll",
    () => {
      dirty = true;
      kick();
    },
    { passive: true }
  );
  window.addEventListener("resize", measure, { passive: true });
  window.addEventListener("orientationchange", measure, { passive: true });

  /* A dokumentum magassága akkordeon nyitásra / funnel léptetésre változik */
  if ("ResizeObserver" in window) {
    new ResizeObserver(measure).observe(document.documentElement);
  }

  window.EP.rt = rt;
  measure();
})();
