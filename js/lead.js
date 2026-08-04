/* ==========================================================================
   LEAD KÜLDÉS — Google Sheets (Apps Script webhook)
   Az Apps Script CORS miatt nem ad olvasható választ, ezért "fire and forget":
   ha a kérés hiba nélkül lefut, sikeresnek tekintjük.
   Beállítás: js/config.js -> leadEndpoint  (útmutató: docs/google-sheets-setup.md)
   ========================================================================== */
(function () {
  "use strict";
  window.EP = window.EP || {};

  const LOCAL_KEY = "ep-leads-local";

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
    const cfg = (window.EP.CONFIG || {});
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

    try {
      await fetch(url, {
        method: "POST",
        mode: "no-cors",
        headers: { "Content-Type": "text/plain;charset=utf-8" },
        body: JSON.stringify(payload),
      });
      return true;
    } catch (err) {
      console.error("[Érték Pont] Lead küldési hiba:", err);
      return false;
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

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", window.EP.leadHealthCheck);
  } else {
    window.EP.leadHealthCheck();
  }
})();
