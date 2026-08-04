/* ==========================================================================
   HERO 3D — a logó nyíl Blenderből, saját mini WebGL rétegen (js/gl/mini3d.js).
   Klasszikus script: nincs import map, nincs CDN, file:// alól is működik.
   Ha nincs WebGL vagy nem tölt be a GLB, a statikus PNG marad látszó.
   ========================================================================== */
(function () {
  "use strict";
  const HOST = document.querySelector("[data-hero3d]");
  if (!HOST) return;

  const EP = window.EP;
  const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
  /* Kis kijelzőn nem indítjuk: ott a PNG ugyanazt mutatja fél akkuért. */
  if (reduced || matchMedia("(max-width: 860px)").matches) return;
  if (!EP || !EP.Mini3D || !EP.rt) return;

  const canvas = HOST.querySelector("canvas");
  const fallback = HOST.querySelector(".hero__fallback");
  const url = HOST.dataset.hero3d || "assets/3d/ep-arrow.glb";

  let R;
  try {
    R = EP.Mini3D.createRenderer(canvas, { antialias: true });
  } catch (err) {
    return;
  }
  if (!R) return;

  EP.Mini3D.loadGLB(url)
    .then((parts) => run(parts))
    .catch((err) => console.info("[Érték Pont] hero GLB kimaradt:", err.message));

  function run(parts) {
    const geo = R.upload(parts[0]);
    const fit = 3.7 / geo.size;
    const cx = -geo.center[0] * fit;
    const cy = -geo.center[1] * fit;
    const cz = -geo.center[2] * fit;

    R.fov = 38;
    R.cameraZ = 9;
    R.makeDust(220, [20, 13, 11]);

    /* --- méret ------------------------------------------------------- */
    function resize() {
      const r = HOST.getBoundingClientRect();
      if (r.width < 2) return;
      R.resize(r.width, r.height, 1.6);
    }
    new ResizeObserver(resize).observe(HOST);
    resize();

    /* --- interakció --------------------------------------------------- */
    const tgt = { x: 0, y: 0 };
    const cur = { x: 0, y: 0 };
    const fine = matchMedia("(hover: hover) and (pointer: fine)").matches;
    if (fine) {
      addEventListener(
        "pointermove",
        (e) => {
          tgt.x = (e.clientX / innerWidth - 0.5) * 0.55;
          tgt.y = (e.clientY / innerHeight - 0.5) * 0.4;
          handle.active = onScreen;
        },
        { passive: true }
      );
    }

    let sn = 0;
    EP.rt.onScroll((st) => {
      sn = Math.min(1, st.y / (innerHeight * 1.4));
    });

    /* --- láthatóság: offscreen ÉS háttérben lévő fül esetén állunk ---- */
    let onScreen = true;
    let fadeIn = 0;
    const handle = EP.rt.onFrame(frame, true);

    new IntersectionObserver(
      (es) => {
        onScreen = es[0].isIntersecting;
        handle.active = onScreen && !document.hidden;
      },
      { threshold: 0 }
    ).observe(HOST);

    /* Korábbi hiba: a visibilitychange csak kikapcsolt, visszatérésnél
       soha nem indult újra — a hero véglegesen befagyott fülváltás után. */
    document.addEventListener("visibilitychange", () => {
      handle.active = !document.hidden && onScreen;
    });

    function frame(time, dt) {
      cur.x += (tgt.x - cur.x) * Math.min(1, dt * 3.4);
      cur.y += (tgt.y - cur.y) * Math.min(1, dt * 3.4);
      if (fadeIn < 1) fadeIn = Math.min(1, fadeIn + dt * 1.6);

      R.begin();
      R.light({
        keyDir: [0.42, 0.62, 0.66],
        keyCol: [1, 1, 0.94],
        rimCol: [0.76, 1, 0.45],
        ambient: 0.16,
        spec: 0.55,
        fogNear: 8,
        fogFar: 34,
      });

      R.draw(
        geo,
        {
          x: cx,
          y: cy + Math.sin(time * 0.7) * 0.14 - sn * 1.1,
          z: cz,
          ry: cur.x * 1.5 + time * 0.16 + sn * 1.8,
          rx: cur.y * 0.9 + Math.sin(time * 0.5) * 0.07,
          rz: Math.sin(time * 0.32) * 0.06 - sn * 0.25,
          s: fit * (1 - sn * 0.18),
        },
        [0.54, 1, 0.17],
        fadeIn
      );

      R.drawDust(time * 0.05, -sn * 1.6, 1.6, [0.76, 1, 0.45]);

      if (canvas.style.opacity !== "1" && fadeIn > 0.15) {
        canvas.style.opacity = "1";
        if (fallback) fallback.style.opacity = "0";
        HOST.classList.add("is-3d");
      }
    }
  }
})();
