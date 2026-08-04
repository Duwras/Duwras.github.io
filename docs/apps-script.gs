/**
 * Érték Pont Pénzügyek — lead fogadó webhook
 * Ez a kód a Google táblázathoz tartozó Apps Script projektbe kerül.
 * Táblázat: „Érték Pont — weboldal jelentkezések”
 * Telepítés: Kiterjesztések → Apps Script → kód bemásolása → Telepítés → Webalkalmazás
 *            (Végrehajtás: Én / Hozzáférés: Bárki) → a kapott /exec URL a js/config.js-be.
 *
 * FONTOS (v2): a telefonszámot SZÖVEGKÉNT írjuk a táblázatba.
 * A Google Sheets a `+` és `=` kezdetű értéket FORMULÁNAK, a `06…` kezdetűt
 * SZÁMNAK értelmezi, ezért a nyers `appendRow` elrontotta a számokat:
 *   +36000000000     →  36000000000        (eltűnt a +)
 *   06301112233      →  6301112233         (eltűnt a vezető 0)
 *   +36 20 369 5312  →  ÜRES CELLA         (érvénytelen formula → elcsúsztak az oszlopok)
 * A `safe_()` egy aposztrófot tesz az ilyen értékek elé — ez a Sheets
 * „ez szöveg” jelölése, a cellában nem látszik, és a másolt érték is helyes.
 *
 * ÚJ (v3): SPAM-SZŰRÉS. A weboldal címe nyilvános, tehát a végpontra bárki
 * tud közvetlenül POST-olni, a böngésző és a JavaScript kihagyásával. Ezért a
 * szűrés ITT van, nem (csak) a weboldalon:
 *   - gyanús jelekre pontot adunk (link, nem latin írás, hamis telefon…)
 *   - 3 ponttól a sor a „Spam” lapra kerül, és NEM megy róla e-mail
 *   - 1–2 pont: a sor a rendes helyére kerül, csak az e-mail tárgya kap „[?]”
 *   - ugyanaz a telefonszám 90 másodpercen belül újra, vagy óránként 30-nál
 *     több beküldés → automatikusan a „Spam” lapra
 * Így semmi nem veszik el (minden beküldés eltárolódik valahol), de a rendes
 * lista és a postafiók tiszta marad.
 */

const NOTIFY_EMAIL = "timar.richard2@ovb.hu";

const HEADERS = [
  "Időpont", "Típus", "Téma", "Slug", "Név", "Telefon",
  "E-mail", "Megjegyzés", "Válaszok", "Kalkulátor", "Oldal"
];

const SPAM_SHEET = "Spam";      // ide kerülnek a kiszűrt beküldések
const SPAM_LIMIT = 3;           // ettől a pontszámtól spam
const DUP_SECONDS = 90;         // ugyanaz a telefon ennyi időn belül = duplikátum
const HOURLY_LIMIT = 30;        // óránként ennyi beküldés fölött minden spam

/** A telefon MINDIG szöveg: különben a vezető 0 vagy + elveszik. */
function phone_(v) {
  const s = String(v == null ? "" : v).trim();
  return s ? "'" + s : "";
}

/**
 * Szabad szöveg védése: ha `=`, `+`, `-` vagy `@` karakterrel kezdődik,
 * a Sheets formulának venné. Ez egyben formula-injektálás elleni védelem is:
 * egy látogató nem tud a megjegyzésbe olyan cellát írni, ami végrehajtódik.
 * A hosszra is vágunk, hogy egy 200 kB-os szöveg ne törje meg a táblázatot.
 */
function safe_(v, max) {
  let s = String(v == null ? "" : v);
  if (s.length > (max || 5000)) s = s.slice(0, max || 5000) + " […levágva]";
  return /^[=+\-@\t\r]/.test(s) ? "'" + s : s;
}

/* ======================================================================== */
/*  Spam-szűrés                                                             */
/* ======================================================================== */

/**
 * Pontozás. Nem egyetlen szabály dönt, hanem több gyanús jel együtt —
 * így egy valódi ügyfél, aki véletlenül belinkel valamit, nem esik ki.
 * Visszaad: { score: szám, reasons: "…", drop: true|false }
 * A `drop` azt jelenti, hogy a beküldés annyira üres/értelmetlen, hogy
 * sehova nem érdemes leírni (jellemzően szondázó kérés, nem is lead).
 */
function classify_(data) {
  const reasons = [];
  let score = 0;

  const nev = String(data.nev || "").trim();
  const tel = String(data.telefon || "").trim();
  const email = String(data.email || "").trim();
  const msg = String(data.megjegyzes || "").trim();
  const digits = tel.replace(/\D/g, "");

  /* Ha nincs se név, se hívható szám, se e-mail: ez nem jelentkezés. */
  if (nev.length < 2 && digits.length < 8 && !email) {
    return { score: 99, reasons: "üres beküldés", drop: true };
  }

  /* A honeypot mezőt a weboldal soha nem küldi el. Ha mégis megjön
     kitöltve, az bizonyosan automata. */
  if (String(data._hp || "").length) { score += 5; reasons.push("honeypot"); }

  /* Hívható szám hiánya. A telefon a lead értékének a lényege. */
  if (digits.length < 8 || digits.length > 15) { score += 2; reasons.push("érvénytelen telefon"); }

  /* Gépi számsorok: 11111111111, 1234567890, 0000000000 */
  if (/^(\d)\1+$/.test(digits)) { score += 3; reasons.push("egyféle számjegy"); }
  if (digits.indexOf("123456789") >= 0) { score += 3; reasons.push("számsor"); }

  /* Link a szabad szöveges mezőkben. Önmagában csak 1 pont: egy valódi
     ügyfél is bemásolhat egy ajánlatot. Két link viszont már reklám. */
  const links = (msg + " " + nev).match(/https?:\/\/|www\.|\[url|<a\s/gi);
  if (links) { score += Math.min(2, links.length); reasons.push(links.length + " link"); }

  /* Nem latin írásjel (cirill, CJK, arab). Magyar oldal — de FIGYELEM:
     egy Magyarországon élő, nem latin nevű ügyfél valódi lead. Ezért ez
     önmagában nem elég a kiszűréshez: magyar telefonszámmal együtt csak
     jelölést kap (2 pont), magyar szám nélkül viszont spam (3 pont). */
  if (/[Ѐ-ӿ؀-ۿ一-鿿぀-ヿ]/.test(nev + msg)) {
    score += 3; reasons.push("nem latin írás");
  }

  /* A név nem e-mail cím és nem URL. */
  if (/@|\.(com|net|ru|xyz|top)\b/i.test(nev)) { score += 2; reasons.push("név gyanús"); }

  /* Klasszikus szemétszövegek. Szándékosan rövid a lista: kevés, de biztos
     találat jobb, mint sok téves. */
  if (/\b(seo|backlink|crypto|bitcoin|casino|viagra|loan offer|guest post|rank higher)\b/i.test(msg)) {
    score += 3; reasons.push("spam kifejezés");
  }

  /* Terjedelmes szöveg: az ügyfelek röviden írnak, a robotok nem. */
  if (msg.length > 1200) { score += 1; reasons.push("nagyon hosszú szöveg"); }

  /* Érvényes magyar szám ERŐS jele annak, hogy valódi. Levon a pontból,
     így egy linket beszúró igazi ügyfél sem esik ki. */
  if (/^(36|06|0036)/.test(digits) && digits.length >= 10 && digits.length <= 12) {
    score -= 1; reasons.push("magyar szám (-1)");
  }

  return { score: score, reasons: reasons.join(", "), drop: false };
}

/** Duplikátum és óránkénti torlódás. Mechanikus jelek, azonnal spam. */
function throttle_(digits) {
  const cache = CacheService.getScriptCache();

  if (digits.length >= 8) {
    const key = "tel-" + digits;
    if (cache.get(key)) return "duplikátum " + DUP_SECONDS + " másodpercen belül";
    cache.put(key, "1", DUP_SECONDS);
  }

  const hourKey = "cnt-" + Math.floor(Date.now() / 3600000);
  const n = Number(cache.get(hourKey) || 0) + 1;
  cache.put(hourKey, String(n), 3700);
  if (n > HOURLY_LIMIT) return "óránkénti limit (" + n + " > " + HOURLY_LIMIT + ")";

  return "";
}

/** A „Spam” lap létrehozása, ha még nincs. */
function spamSheet_(ss) {
  let sh = ss.getSheetByName(SPAM_SHEET);
  if (!sh) {
    sh = ss.insertSheet(SPAM_SHEET);
    sh.appendRow(HEADERS.concat(["Miért szűrtük", "Pont"]));
    sh.getRange(1, 1, 1, HEADERS.length + 2).setFontWeight("bold");
    sh.setFrozenRows(1);
  }
  sh.getRange("F:F").setNumberFormat("@");
  return sh;
}

/* ======================================================================== */
/*  Beérkező kérés                                                          */
/* ======================================================================== */

function doPost(e) {
  /* A zár nélkül két egyidejű beküldés összekeverheti a számlálót és a
     sorokat. 10 másodpercet várunk rá; ennyi alatt mindig felszabadul. */
  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(10000);
  } catch (err) {
    // ha nem kaptunk zárat, akkor is megpróbáljuk — a lead fontosabb
  }

  try {
    const data = JSON.parse(e.postData.contents);
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getSheets()[0];

    const verdict = classify_(data);
    if (verdict.drop) {
      return json_({ ok: true }); // szándékosan nem árulja el, hogy kiszűrtük
    }

    const limit = throttle_(String(data.telefon || "").replace(/\D/g, ""));
    if (limit) {
      verdict.score += 5;
      verdict.reasons = verdict.reasons ? verdict.reasons + ", " + limit : limit;
    }

    const row = [
      new Date(),
      safe_(data.tipus, 80),
      safe_(data.tema, 300),
      safe_(data.slug, 80),
      safe_(data.nev, 120),
      phone_(data.telefon),
      safe_(data.email, 160),
      safe_(data.megjegyzes, 2000),
      safe_(data.valaszok, 3000),
      safe_(data.kalkulator, 1000),
      safe_(data.oldal, 300)
    ];

    if (verdict.score >= SPAM_LIMIT) {
      /* Kiszűrve: eltároljuk, de nem szólunk róla e-mailben. */
      spamSheet_(ss).appendRow(row.concat([verdict.reasons, verdict.score]));
      return json_({ ok: true });
    }

    // fejléc pótlása, ha valaki törölte
    if (sheet.getLastRow() === 0) {
      sheet.appendRow(HEADERS);
      sheet.getRange(1, 1, 1, HEADERS.length).setFontWeight("bold");
      sheet.setFrozenRows(1);
    }
    // a Telefon oszlop formátuma sima szöveg — kézi szerkesztésnél is véd
    sheet.getRange("F:F").setNumberFormat("@");

    sheet.appendRow(row);
    notify_(data, verdict);

    return json_({ ok: true });
  } catch (err) {
    console.error(err);
    return json_({ ok: false, error: String(err) });
  } finally {
    try { lock.releaseLock(); } catch (err2) {}
  }
}

function json_(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

/** Az e-mail a NYERS adatot használja, ezért a telefon itt mindig helyes. */
function notify_(data, verdict) {
  if (!NOTIFY_EMAIL || NOTIFY_EMAIL.indexOf("@") < 1) return;

  /* 1–2 pontnál átjön a lead, de jelezzük, hogy volt rajta valami gyanús —
     így nem hívsz vissza gépiesen egy szemetet, de nem is veszíted el. */
  const flag = verdict && verdict.score > 0 ? "[?] " : "";
  const subject = flag + "Új jelentkezés — " + (data.tema || data.tipus || "weboldal");

  const lines = [
    "Név:        " + (data.nev || "-"),
    "Telefon:    " + (data.telefon || "-"),
    "E-mail:     " + (data.email || "-"),
    "",
    "Téma:       " + (data.tema || "-"),
    "Forrás:     " + (data.tipus || "-"),
    "Kalkulátor: " + (data.kalkulator || "-"),
    "",
    "Megjegyzés: " + (data.megjegyzes || "-"),
    "Válaszok:   " + (data.valaszok || "-"),
    "Oldal:      " + (data.oldal || "-")
  ];

  if (flag) {
    lines.push("", "FIGYELEM — a szűrő gyanúsnak találta: " + verdict.reasons,
      "(A sor bekerült a táblázatba. Ha valóban szemét, töröld.)");
  }

  lines.push("", "Hívd vissza 24 órán belül — minél hamarabb, annál nagyobb az esély, hogy ügyfél lesz belőle.");

  MailApp.sendEmail({ to: NOTIFY_EMAIL, subject: subject, body: lines.join("\n") });
}

/** Böngészőből meghívva jelzi, hogy él a végpont. */
function doGet() {
  return ContentService.createTextOutput("Érték Pont lead endpoint aktív.");
}

/* ======================================================================== */
/*  Tesztek — a szerkesztőből futtathatók                                   */
/* ======================================================================== */

/** Egyszeri teszt: futtasd az Apps Script szerkesztőből (Futtatás gomb). */
function tesztSor() {
  doPost({
    postData: {
      contents: JSON.stringify({
        tipus: "Teszt",
        tema: "Kézi teszt az Apps Scriptből",
        slug: "teszt",
        nev: "Teszt Tibor",
        telefon: "+36 20 369 5312",
        email: "teszt@pelda.hu",
        megjegyzes: "Ez egy teszt sor, törölhető.",
        valaszok: "{}",
        kalkulator: "-",
        oldal: "apps-script"
      })
    }
  });
}

/**
 * Ellenőrzés a javítás után: háromféle telefonformátumot ír be.
 * Futtasd a szerkesztőből, majd nézd meg a táblázat Telefon oszlopát —
 * mindhárom számnak pontosan úgy kell megjelennie, ahogy beírtuk.
 * (A 90 másodperces duplikátum-szűrő miatt három KÜLÖNBÖZŐ szám kell.)
 */
function telefonTeszt() {
  ["+36 20 369 5312", "06301112233", "+36000000000"].forEach(function (t) {
    doPost({
      postData: {
        contents: JSON.stringify({
          tipus: "TELEFON-TESZT",
          tema: "formátum ellenőrzés (törölhető)",
          slug: "teszt", nev: "Teszt", telefon: t,
          email: "teszt@pelda.hu", megjegyzes: "törölhető",
          valaszok: "{}", kalkulator: "-", oldal: "telefon-teszt"
        })
      }
    });
  });
}

/**
 * A spam-szűrő ellenőrzése. Nem ír a táblázatba, csak kilistázza a
 * pontszámokat a naplóba (Végrehajtási napló / View → Logs).
 * Elvárás: az első kettő 0 vagy negatív pont (átmegy), a többi 3 vagy több.
 */
function spamTeszt() {
  const esetek = [
    ["valódi ügyfél", { nev: "Kovács Anna", telefon: "+36 20 123 4567", megjegyzes: "Nyugdíj érdekelne." }],
    ["valódi, linkkel", { nev: "Nagy Péter", telefon: "06301234567", megjegyzes: "Láttam itt: https://ovb.hu, hívjatok." }],
    ["üres", { nev: "", telefon: "", email: "" }],
    ["hamis szám", { nev: "asdf", telefon: "11111111111", megjegyzes: "hello" }],
    ["cirill, magyar szám nélkül", { nev: "Привет", telefon: "+79001234567", megjegyzes: "Купить" }],
    ["cirill, magyar számmal (átmegy, jelölve)", { nev: "Привет Петров", telefon: "+36201234567", megjegyzes: "Nyugdíj érdekelne" }],
    ["SEO ajánlat", { nev: "John", telefon: "+15551234567", megjegyzes: "We offer backlink and SEO to rank higher: http://a.xyz http://b.xyz" }],
    ["honeypot", { nev: "Bot", telefon: "+36201234567", _hp: "x" }]
  ];
  esetek.forEach(function (p) {
    const v = classify_(p[1]);
    console.log(
      (v.score >= SPAM_LIMIT ? "SPAM " : "átmegy") +
      " | pont: " + v.score + " | " + p[0] + " | " + (v.reasons || "-")
    );
  });
}
