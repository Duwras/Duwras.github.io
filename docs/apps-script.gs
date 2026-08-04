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
 */

const NOTIFY_EMAIL = "timar.richard2@ovb.hu";

const HEADERS = [
  "Időpont", "Típus", "Téma", "Slug", "Név", "Telefon",
  "E-mail", "Megjegyzés", "Válaszok", "Kalkulátor", "Oldal"
];

/** A telefon MINDIG szöveg: különben a vezető 0 vagy + elveszik. */
function phone_(v) {
  const s = String(v == null ? "" : v).trim();
  return s ? "'" + s : "";
}

/**
 * Szabad szöveg védése: ha `=`, `+`, `-` vagy `@` karakterrel kezdődik,
 * a Sheets formulának venné. Ez egyben formula-injektálás elleni védelem is:
 * egy látogató nem tud a megjegyzésbe olyan cellát írni, ami végrehajtódik.
 */
function safe_(v) {
  const s = String(v == null ? "" : v);
  return /^[=+\-@\t\r]/.test(s) ? "'" + s : s;
}

function doPost(e) {
  try {
    const data = JSON.parse(e.postData.contents);
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheets()[0];

    // fejléc pótlása, ha valaki törölte
    if (sheet.getLastRow() === 0) {
      sheet.appendRow(HEADERS);
      sheet.getRange(1, 1, 1, HEADERS.length).setFontWeight("bold");
      sheet.setFrozenRows(1);
    }
    // a Telefon oszlop formátuma sima szöveg — kézi szerkesztésnél is véd
    sheet.getRange("F:F").setNumberFormat("@");

    sheet.appendRow([
      new Date(),
      safe_(data.tipus),
      safe_(data.tema),
      safe_(data.slug),
      safe_(data.nev),
      phone_(data.telefon),
      safe_(data.email),
      safe_(data.megjegyzes),
      safe_(data.valaszok),
      safe_(data.kalkulator),
      safe_(data.oldal)
    ]);

    notify_(data);

    return ContentService
      .createTextOutput(JSON.stringify({ ok: true }))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    console.error(err);
    return ContentService
      .createTextOutput(JSON.stringify({ ok: false, error: String(err) }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

/** Az e-mail a NYERS adatot használja, ezért a telefon itt mindig helyes. */
function notify_(data) {
  if (!NOTIFY_EMAIL || NOTIFY_EMAIL.indexOf("@") < 1) return;

  const subject = "Új jelentkezés — " + (data.tema || data.tipus || "weboldal");
  const body = [
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
    "Oldal:      " + (data.oldal || "-"),
    "",
    "Hívd vissza 24 órán belül — minél hamarabb, annál nagyobb az esély, hogy ügyfél lesz belőle."
  ].join("\n");

  MailApp.sendEmail({ to: NOTIFY_EMAIL, subject: subject, body: body });
}

/** Böngészőből meghívva jelzi, hogy él a végpont. */
function doGet() {
  return ContentService.createTextOutput("Érték Pont lead endpoint aktív.");
}

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
