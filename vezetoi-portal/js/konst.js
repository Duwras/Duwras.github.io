/* VEZETŐI PORTÁL — címkék (az adatbázis kódjai → magyar szöveg) */

export const STATUSZ = {
  jelolt: "Jelölt",
  bedolgozas: "Bedolgozás",
  aktiv: "Aktív",
  nem_folytatja: "Nem folytatja",
  elutasitva: "Elutasítva",
};
export const STATUSZ_SOR = ["jelolt", "bedolgozas", "aktiv", "nem_folytatja", "elutasitva"];

export const FORRAS = { ajanlas: "Ajánlás", facebook: "Facebook", allashirdetes: "Álláshirdetés", egyeb: "Egyéb" };
export const MNB = {
  nincs: "Még nincs",
  jelentkezett: "Jelentkezett",
  idopont_fix: "Időpont fix",
  sikeres: "Sikeres",
  sikertelen: "Sikertelen",
};
export const DONTES = { felvesszuk: "Felvesszük", masodik_kor: "Második kör", nem: "Nem" };
export const DOK_TIPUS = { oneletrajz: "Önéletrajz", motivacios_level: "Motivációs levél", egyeb: "Egyéb" };

export const TABLA = {
  munkatarsak: "Adatlap",
  bedolgozas_haladas: "Bedolgozás",
  interju_valaszok: "Interjúválasz",
  interju_ertekeles: "Interjú-értékelés",
  kompetencia_tesztek: "Kompetenciateszt",
  dokumentumok: "Dokumentum",
  karrierszint_tortenet: "Karrierszint",
};

/* Az adatlap mezői: címke + típus (a napló is ezt használja) */
export const MEZO = {
  nev: "Név",
  telefon: "Telefon",
  email: "E-mail",
  szuletesi_ev: "Születési év",
  lakhely: "Lakhely (település)",
  honnan_szarmazik: "Honnan származik",
  iskola_tanulmanyok: "Iskola, tanulmányok",
  jelenlegi_munka: "Jelenlegi munka",
  erettsegi_van: "Érettségi",
  forras: "Honnan jött",
  ajanlo_nev: "Ajánló neve",
  interju_datum: "Interjú dátuma",
  felvetel_datum: "Felvétel dátuma",
  ovb_belepes_datum: "OVB-belépés dátuma",
  karrierszint: "Karrierszint",
  mnb_vizsga_statusz: "MNB-vizsga",
  adatkezelesi_hozzajarulas: "Adatkezelési hozzájárulás",
  adatkezelesi_hozzajarulas_datum: "Hozzájárulás dátuma",
  megjegyzes: "Megjegyzés",
  statusz: "Státusz",
  vezeto_id: "Vezető",
  megvolt: "Megvolt",
  datum: "Dátum",
  valasz: "Válasz",
  elso_benyomas: "Első benyomás",
  kommunikacio: "Kommunikáció",
  motivacio: "Motiváció",
  dontes: "Döntés",
  kod: "Kód",
  kitoltes_datum: "Kitöltés dátuma",
  fajlnev: "Fájl",
  tipus: "Típus",
  szint: "Szint",
};

export const DEFAULT_TAJEKOZTATO = "TODO: Ricsi/OVB jóváhagyás – az adatkezelési tájékoztató szövege még nincs beállítva (Admin → Beállítások).";
