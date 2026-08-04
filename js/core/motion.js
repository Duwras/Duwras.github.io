/* ==========================================================================
   MIKRO-ANIMÁCIÓK — kártya-tilt + fényfolt, magnetikus gombok, parallax,
   kurzor-glow, futószalag. Mind az EP.rt közös rAF hurkán fut: egy hurok,
   egy layout-olvasás képkockánként.
   ========================================================================== */
(function () {
  "use strict";
  window.EP = window.EP || {};
  const { $, $$, on, rt } = window.EP;
  const reduced = window.EP.reduced;
  const fine = matchMedia("(hover: hover) and (pointer: fine)").matches;

  /* --- 1. Kártya: tilt + fényfolt EGY handlerben ----------------------- */
  /* Korábban a tilt (motion.js) és a spotlight (ui.js) külön pointermove-ot
     kötött ugyanarra a kártyára, és mindkettő külön getBoundingClientRect-et
     hívott. Most egy mérés, egy írás, rAF-ba fogva. */
  function initCards() {
    if (!fine || reduced) return;
    $$(".card--spot").forEach((card) => {
      let raf = 0;
      let mx = 0, my = 0, px = 0, py = 0;
      const write = () => {
        raf = 0;
        card.style.setProperty("--mx", mx + "px");
        card.style.setProperty("--my", my + "px");
        card.style.transform =
          `perspective(900px) rotateY(${(px * 5).toFixed(2)}deg) rotateX(${(-py * 5).toFixed(2)}deg) translateY(-4px)`;
      };
      on(
        card,
        "pointermove",
        (e) => {
          const r = card.getBoundingClientRect();
          mx = Math.round(e.clientX - r.left);
          my = Math.round(e.clientY - r.top);
          px = mx / r.width - 0.5;
          py = my / r.height - 0.5;
          if (!raf) raf = requestAnimationFrame(write);
        },
        { passive: true }
      );
      on(card, "pointerleave", () => {
        if (raf) cancelAnimationFrame(raf);
        raf = 0;
        card.style.transform = "";
      });
    });
  }

  /* --- 2. Magnetikus gombok -------------------------------------------- */
  function initMagnetic() {
    if (!fine || reduced) return;
    $$(".btn--lg, .nav__actions .btn").forEach((btn) => {
      on(
        btn,
        "pointermove",
        (e) => {
          const r = btn.getBoundingClientRect();
          const dx = (e.clientX - (r.left + r.width / 2)) / r.width;
          const dy = (e.clientY - (r.top + r.height / 2)) / r.height;
          btn.style.setProperty("--mag-x", (dx * 7).toFixed(2) + "px");
          btn.style.setProperty("--mag-y", (dy * 7).toFixed(2) + "px");
        },
        { passive: true }
      );
      on(btn, "pointerleave", () => {
        btn.style.setProperty("--mag-x", "0px");
        btn.style.setProperty("--mag-y", "0px");
      });
    });
  }

  /* --- 3. Parallax rétegek --------------------------------------------- */
  /* A dokumentumhoz mért pozíciót CSAK átméretezéskor olvassuk ki. Korábban
     minden scroll-eventben minden rétegre getBoundingClientRect futott, ami
     kényszerített layoutot okozott — ez volt az akadozás egyik fő oka. */
  function initParallax() {
    if (reduced) return;
    const layers = $$("[data-parallax]");
    if (!layers.length) return;

    let cache = [];
    const measure = () => {
      const sy = window.scrollY;
      cache = layers.map((el) => {
        const r = el.getBoundingClientRect();
        return { el, mid: r.top + sy + r.height / 2, speed: parseFloat(el.dataset.parallax) || 0.15 };
      });
    };
    measure();
    on(window, "resize", measure, { passive: true });

    rt.onScroll(({ y }) => {
      const center = y + window.innerHeight / 2;
      for (let i = 0; i < cache.length; i++) {
        const c = cache[i];
        c.el.style.setProperty("--py", (-(c.mid - center) * c.speed).toFixed(1) + "px");
      }
    });
  }

  /* --- 4. Kurzort követő lime derengés --------------------------------- */
  /* Se filter:blur, se mix-blend-mode: mindkettő teljes képernyős újrafestést
     kényszerít minden képkockán. Elég egy lágy gradiens + transform. */
  function initCursorGlow() {
    if (!fine || reduced) return;
    const dot = document.createElement("div");
    dot.className = "cursor-glow";
    dot.setAttribute("aria-hidden", "true");
    document.body.appendChild(dot);

    let tx = innerWidth / 2, ty = innerHeight / 2, cx = tx, cy = ty;
    let idle = 0;
    const handle = rt.onFrame((t, dt) => {
      cx += (tx - cx) * Math.min(1, dt * 6);
      cy += (ty - cy) * Math.min(1, dt * 6);
      dot.style.transform = `translate3d(${(cx - 150).toFixed(1)}px, ${(cy - 150).toFixed(1)}px, 0)`;
      /* ha megállt a kurzor és beért a folt, kilépünk a hurokból */
      idle += dt;
      if (idle > 0.4 && Math.abs(tx - cx) < 0.5 && Math.abs(ty - cy) < 0.5) handle.active = false;
    }, false);

    on(
      window,
      "pointermove",
      (e) => {
        tx = e.clientX;
        ty = e.clientY;
        idle = 0;
        handle.active = true;
      },
      { passive: true }
    );
  }

  /* --- 5. Futószalag ---------------------------------------------------- */
  /* Korábban a scroll-tempó a CSS animation-duration átírásával gyorsított.
     Az animáció haladása a hosszúság ARÁNYA, ezért duration-váltásnál a sáv
     látványosan előre-hátra ugrott, a klónozott sáv pedig elcsúszott az
     eredetitől. Most a pozíciót magunk integráljuk: nincs ugrás, nincs rés. */
  function initMarquee() {
    const list = $$(".marquee");
    if (!list.length) return;

    list.forEach((m) => {
      const tracks = $$(".marquee__track", m);
      if (tracks.length < 2) return;

      m.classList.add("is-js");
      const gap = parseFloat(getComputedStyle(m).columnGap) || 0;
      let x = 0, span = 0, speed = 0, boost = 0, paused = false;

      const measure = () => {
        span = tracks[0].getBoundingClientRect().width + gap;
        speed = span / 38; // px/s — ugyanaz a tempó, mint a CSS változatnál
      };
      measure();
      on(window, "resize", measure, { passive: true });

      const handle = rt.onFrame((t, dt) => {
        if (!paused && span > 0) {
          x -= speed * (1 + boost) * dt;
          if (x <= -span) x += span;
        }
        boost += (0 - boost) * Math.min(1, dt * 3);
        const v = `translate3d(${x.toFixed(2)}px,0,0)`;
        tracks[0].style.transform = v;
        tracks[1].style.transform = v;
      }, false);

      if (!reduced) {
        rt.onScroll(({ vel }) => {
          boost = Math.min(2.6, vel / 16);
        });
      }
      on(m, "pointerenter", () => (paused = true));
      on(m, "pointerleave", () => (paused = false));

      new IntersectionObserver(
        (es) => (handle.active = es[0].isIntersecting && !document.hidden && !reduced),
        { threshold: 0 }
      ).observe(m);
      document.addEventListener("visibilitychange", () => {
        if (document.hidden) handle.active = false;
      });
    });
  }

  /* --- 6. Funnel opciók léptetett belépése ---------------------------- */
  function initOptStagger() {
    const io = new MutationObserver((muts) => {
      muts.forEach((mu) => {
        mu.addedNodes.forEach((node) => {
          if (node.nodeType !== 1 || !node.querySelectorAll) return;
          node.querySelectorAll(".opt").forEach((o, i) => o.style.setProperty("--opt-i", i));
        });
      });
    });
    $$("[data-funnel]").forEach((f) => io.observe(f, { childList: true, subtree: true }));
  }

  function boot() {
    initCards();
    initMagnetic();
    initParallax();
    initCursorGlow();
    initMarquee();
    initOptStagger();
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();
})();
