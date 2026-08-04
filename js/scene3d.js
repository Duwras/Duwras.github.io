/* ==========================================================================
   SCROLL-VEZÉRELT 3D SZEKCIÓ — a 13 lowpoly téma-ikon lebegő gyűrűben,
   a Pénzügyi Térkép háttere. Saját mini WebGL réteg (js/gl/mini3d.js).
   Csak asztali gépen, mozgásra érzékeny beállítás nélkül indul; offscreen
   vagy háttérben lévő fül esetén nem rajzol egyetlen képkockát sem.
   ========================================================================== */
(function () {
  "use strict";
  const HOST = document.querySelector("[data-scene3d]");
  if (!HOST) return;

  const EP = window.EP;
  if (matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  if (matchMedia("(max-width: 1023px)").matches) return;
  if (!EP || !EP.Mini3D || !EP.rt) return;

  const canvas = HOST.querySelector("canvas");
  const url = HOST.dataset.scene3d || "assets/3d/ep-icons.glb";

  let R;
  try {
    R = EP.Mini3D.createRenderer(canvas, { antialias: true });
  } catch (err) {
    return;
  }
  if (!R) return;

  EP.Mini3D.loadGLB(url)
    .then(run)
    .catch((err) => console.info("[Érték Pont] ikon-GLB kimaradt:", err.message));

  function run(parts) {
    const icons = parts.filter((p) => /^ico-/.test(p.name));
    if (!icons.length) return;

    const n = icons.length;
    const RADIUS = 8.2;

    const items = icons.map((part, i) => {
      const geo = R.upload(part);
      /* A GLB-ben minden ikon már egységméretű (max. kiterjedés = 1.0) és az
         origóra van centrálva, ezért itt CSAK a szórás kell. Korábban 1.55-re
         "normalizáltuk", ami valójában 1,55-szörös nagyítás volt — az ikonok
         a címsorra lógtak. */
      const base = (0.85 / geo.size) * (0.9 + (i % 3) * 0.1);
      const a = (i / n) * Math.PI * 2;
      return {
        geo,
        base,
        ox: -geo.center[0] * base,
        oy: -geo.center[1] * base,
        oz: -geo.center[2] * base,
        /* lapított ellipszis: oldalra széles, mélységben szűk — így a közeli
           ikonok sem nőnek túl nagyra és nem kerülnek a kártya elé */
        a0: a,
        ay: Math.sin(i * 1.9) * 3.1,
        spin: 0.14 + (i % 5) * 0.06,
        bob: 0.5 + (i % 4) * 0.25,
        tilt: 0.5 + (i % 3) * 0.3,
        phase: i * 0.7,
      };
    });

    R.fov = 42;

    /* Fejlesztői betekintő: a konzolból ellenőrizhető a gyűrű geometriája.
       Nem befolyásol semmit, csak olvasható állapotot ad. */
    window.EP._scene3d = {
      items,
      radius: RADIUS,
      get cameraZ() { return R.cameraZ; },
      get canvas() { return { buf: [canvas.width, canvas.height], css: [canvas.clientWidth, canvas.clientHeight] }; },
    };

    function resize() {
      const r = HOST.getBoundingClientRect();
      if (r.width < 2) return;
      /* háttérelem: szándékosan alacsonyabb felbontáson rajzoljuk, a maszk
         és az elmosódott kontúr miatt ez ránézésre nem látszik */
      R.resize(r.width, r.height, 1.25);
    }
    new ResizeObserver(resize).observe(HOST);
    resize();

    /* --- interakció / scroll ------------------------------------------ */
    const tgt = { x: 0, y: 0 };
    const cur = { x: 0, y: 0 };
    const fine = matchMedia("(hover: hover) and (pointer: fine)").matches;
    if (fine) {
      addEventListener(
        "pointermove",
        (e) => {
          tgt.x = (e.clientX / innerWidth - 0.5) * 0.6;
          tgt.y = (e.clientY / innerHeight - 0.5) * 0.35;
        },
        { passive: true }
      );
    }

    let p = 0;
    function measure() {
      const r = HOST.getBoundingClientRect();
      const total = r.height + innerHeight;
      p = Math.min(1, Math.max(0, (innerHeight - r.top) / total));
    }
    EP.rt.onScroll(measure);
    measure();

    /* --- rajzolás ------------------------------------------------------ */
    let onScreen = false;
    let fade = 0;
    /* háttérdísz: 40 fps elég neki, így marad fejhely a scrollnak */
    const STEP = 1 / 40;
    let acc = 0;

    const handle = EP.rt.onFrame(frame, false);
    new IntersectionObserver(
      (es) => {
        onScreen = es[0].isIntersecting;
        handle.active = onScreen && !document.hidden;
      },
      { threshold: 0 }
    ).observe(HOST);
    document.addEventListener("visibilitychange", () => {
      handle.active = !document.hidden && onScreen;
    });

    function frame(time, dt) {
      acc += dt;
      if (acc < STEP) return;
      acc = 0;

      cur.x += (tgt.x - cur.x) * Math.min(1, dt * 2.2);
      cur.y += (tgt.y - cur.y) * Math.min(1, dt * 2.2);
      if (fade < 1) fade = Math.min(1, fade + dt * 1.2);

      /* a gyűrű scrollra fordul körbe, plusz lassú alapforgás */
      const ry = time * 0.055 + p * Math.PI * 1.15 + cur.x * 0.5;
      const rx = cur.y * 0.3 + Math.sin(time * 0.25) * 0.04;
      const lift = -p * 2.6;
      R.cameraZ = 14.5 - Math.sin(p * Math.PI) * 2.0;

      const cx = Math.cos(rx), sx = Math.sin(rx);

      R.begin();
      R.light({
        keyDir: [0.4, 0.7, 0.58],
        keyCol: [1, 1, 0.95],
        rimCol: [0.76, 1, 0.45],
        ambient: 0.2,
        spec: 0.3,
        fogNear: 9,
        fogFar: 33,
      });

      for (let i = 0; i < items.length; i++) {
        const it = items[i];
        const bob = Math.sin(time * it.bob + it.phase) * 0.55;

        /* A lapítást a FORGATÁS UTÁN kell alkalmazni: ha előbb lapítunk és
           utána forgatjuk a gyűrűt Y körül, a széles tengely mélységbe
           fordul, és egyes ikonok 2 unitra kerülnek a kamerához (óriásira
           nőnek). Így az ellipszis mindig oldalra széles, mélységben szűk. */
        const a = it.a0 + ry;
        const x = Math.cos(a) * RADIUS * 1.4;
        const z = Math.sin(a) * RADIUS * 0.45 - 3.4;
        const y = it.ay + bob + lift;

        /* finom billentés a kurzorra — a mélységet alig mozdítja */
        const y2 = y * cx - z * sx;
        const z2 = y * sx + z * cx;

        R.draw(
          it.geo,
          {
            x: x + it.ox,
            y: y2 + it.oy,
            z: z2 + it.oz,
            ry: time * it.spin + it.phase,
            rx: Math.sin(time * 0.4 + it.phase) * 0.18 * it.tilt,
            rz: Math.cos(time * 0.3 + it.phase) * 0.1,
            s: it.base,
          },
          [0.54, 1, 0.17],
          fade
        );
      }

      if (!HOST.classList.contains("is-on") && fade > 0.1) {
        canvas.style.opacity = "1";
        HOST.classList.add("is-on");
      }
    }
  }
})();
