/* ==========================================================================
   MÉRÉS + LEAD-KONTEXTUS
   --------------------------------------------------------------------------
   EP.track(event, params)  → konverziós esemény a `window.dataLayer`-be
                              (GTM / GA4 innen olvassa). SOHA nem kerül bele
                              név, telefon, e-mail vagy üzenet — a PII-kulcsokat
                              a függvény akkor is kiszűri, ha valaki átadná.
   EP.context(extra)        → az oldal és a látogatás kontextusa: oldaltípus,
                              szolgáltatás, város, landing, hivatkozó, UTM.
                              Ugyanez megy a leadhez is (kontextus-sor).
   EP.ctaLocation(el)       → melyik gomb volt (hero, header, mobile_sticky…)

   Adatvédelem:
   - A látogatás forrását (UTM, hivatkozó DOMAIN, első oldal) sessionStorage-
     ban tartjuk — a böngészőfül bezárásával törlődik. Süti nincs.
   - Külső mérőkód (GTM) CSAK akkor töltődik, ha a config.analytics.gtmId ki
     van töltve ÉS a látogató a süti-bannerben a „Rendben”-t választotta.
     Addig a dataLayer egy sima tömb a memóriában, nem megy sehova.
   - A `tel:` kattintás MIKROKONVERZIÓ: azt méri, hogy valaki megnyomta a
     hívás gombot, nem azt, hogy a hívás létrejött.

   Hibakeresés: ?ep_debug=1 az URL-ben (vagy localStorage "ep-debug" = "1")
   → minden esemény a konzolba is kiíródik.
   ========================================================================== */
(function () {
  "use strict";
  window.EP = window.EP || {};
  const CFG = window.EP.CONFIG || {};
  const root = document.documentElement;
  const dl = (window.dataLayer = window.dataLayer || []);

  const UTM_KEYS = ["utm_source", "utm_medium", "utm_campaign", "utm_content", "utm_term"];
  const VISIT_KEY = "ep-visit";

  const store = {
    get(k) {
      try { return JSON.parse(sessionStorage.getItem(k) || "null"); } catch (e) { return null; }
    },
    set(k, v) {
      try { sessionStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* privát mód */ }
    },
  };

  /* --- 1. A látogatás forrása ----------------------------------------- */
  /* Az első oldal a munkamenetben adja a landinget és a hivatkozót. Ha a
     látogató később ÚJ kampánylinkkel érkezik (új UTM), az felülírja: a
     lead a legutóbbi kampányhoz tartozik. A hivatkozóból csak a domain
     marad meg (google.com, facebook.com) — a teljes URL-ben lehetne
     személyes adat (keresőkifejezés, azonosító). */
  function captureVisit() {
    const q = new URLSearchParams(location.search);
    const utm = {};
    UTM_KEYS.forEach((k) => {
      const v = q.get(k);
      if (v) utm[k] = v.slice(0, 100);
    });
    const hasUtm = Object.keys(utm).length > 0;
    let visit = store.get(VISIT_KEY);
    if (!visit || hasUtm) {
      let ref = "";
      try {
        const r = document.referrer ? new URL(document.referrer) : null;
        if (r && r.host && r.host !== location.host) ref = r.host.replace(/^www\./, "");
      } catch (e) { /* érvénytelen referrer */ }
      visit = {
        landing: location.pathname,
        referrer: ref || (visit && visit.referrer) || "",
        utm: hasUtm ? utm : (visit && visit.utm) || {},
      };
      store.set(VISIT_KEY, visit);
    }
    return visit;
  }
  const visit = captureVisit();

  /* --- 2. Kontextus ---------------------------------------------------- */
  /* A generátor az oldal típusát, a szolgáltatást és a várost a <html>
     data-attribútumaiba írja (data-page-type, data-service, data-city). */
  function deviceContext() {
    const w = window.innerWidth || 0;
    return w < 860 ? "mobile" : w < 1024 ? "tablet" : "desktop";
  }

  function context(extra) {
    return Object.assign(
      {
        page_path: location.pathname,
        page_title: document.title,
        page_type: root.dataset.pageType || "other",
        service: root.dataset.service || "",
        city: root.dataset.city || "",
        device_context: deviceContext(),
        landing_page: visit.landing || "",
        referrer_host: visit.referrer || "",
      },
      visit.utm,
      extra || {}
    );
  }

  /* --- 3. Esemény ------------------------------------------------------- */
  const PII = /^(name|nev|név|phone|telefon|tel|email|e-?mail|message|megjegyzes|megjegyzés|msg)$/i;
  /* Ezeket a kulcsokat MINDEN eseményben elküldjük (üresen undefined-ként),
     különben a GTM adatmodellje megtartaná az előző esemény értékét —
     pl. egy hero-kattintás cta_location-je rátapadna a következő eseményre. */
  const STD = [
    "page_path", "page_title", "page_type", "service", "city", "device_context",
    "landing_page", "referrer_host", "cta_location", "form_type", "topic",
    "error_type", "error_fields", ...UTM_KEYS,
  ];

  let debug = /[?&]ep_debug=1\b/.test(location.search);
  try { debug = debug || localStorage.getItem("ep-debug") === "1"; } catch (e) { /* nincs tároló */ }

  function track(event, params) {
    const p = context(params);
    const out = { event };
    STD.forEach((k) => (out[k] = undefined));
    Object.keys(p).forEach((k) => {
      if (PII.test(k)) return;
      const v = p[k];
      out[k] = v === "" || v == null ? undefined : v;
    });
    dl.push(out);
    if (typeof window.gtag === "function") {
      const g = Object.assign({}, out);
      delete g.event;
      window.gtag("event", event, g);
    }
    if (debug) console.info("[EP track]", event, out);
  }

  /* --- 4. Melyik gomb? -------------------------------------------------- */
  function ctaLocation(el) {
    if (!el || !el.closest) return "unknown";
    const tagged = el.closest("[data-cta-location]");
    if (tagged) return tagged.dataset.ctaLocation;
    if (el.closest(".nav")) return "header";
    if (el.closest(".menu")) return "menu";
    if (el.closest(".mbar")) return "mobile_sticky";
    if (el.closest(".footer")) return "footer";
    if (el.closest(".qlf")) return "form";
    if (el.closest(".funnel")) return "funnel";
    if (el.closest(".hero, .svc-hero, .page-hero")) return "hero";
    return "content";
  }

  /* Minden tel: link kattintása — a hívás MIKROKONVERZIÓ (lásd fent).
     Capture fázis: akkor is lefut, ha egy másik kezelő megállítja az
     eseményt. A navigációt nem akadályozza. */
  document.addEventListener(
    "click",
    (e) => {
      const a = e.target && e.target.closest ? e.target.closest('a[href^="tel:"]') : null;
      if (a) track("cta_call_click", { cta_location: ctaLocation(a) });
    },
    true
  );

  /* --- 5. Google Tag Manager — csak beállítva ÉS hozzájárulással -------- */
  const GTM_ID = String((CFG.analytics && CFG.analytics.gtmId) || "").trim();
  const consented = () => {
    try { return localStorage.getItem("ep-cookie-v1") === "all"; } catch (e) { return false; }
  };
  /* Consent Mode v2: a gtag() parancsokat a dataLayer-be kell tenni
     `arguments` objektumként — így értelmezi a GTM. */
  function gtagCmd() { dl.push(arguments); }
  let gtmLoaded = false;
  function loadGtm() {
    if (gtmLoaded || !/^GTM-[A-Z0-9]{4,}$/.test(GTM_ID)) return;
    gtmLoaded = true;
    gtagCmd("consent", "update", { analytics_storage: "granted" });
    dl.push({ "gtm.start": Date.now(), event: "gtm.js" });
    const s = document.createElement("script");
    s.async = true;
    s.src = "https://www.googletagmanager.com/gtm.js?id=" + encodeURIComponent(GTM_ID);
    document.head.appendChild(s);
  }
  if (GTM_ID) {
    gtagCmd("consent", "default", {
      ad_storage: "denied",
      ad_user_data: "denied",
      ad_personalization: "denied",
      analytics_storage: "denied",
    });
    if (consented()) loadGtm();
    /* A süti-banner (js/core/ui.js) küldi a döntés után. */
    document.addEventListener("ep:consent", (e) => {
      if (e.detail === "all") loadGtm();
    });
  }

  Object.assign(window.EP, { track, context, ctaLocation, visit });
})();
