# Lead-fogadás beállítása — ami már kész, és ami rád vár

A jelentkezések automatikusan egy Google táblázat soraiba kerülnek, és e-mail értesítést is kapsz
róluk. Nincs szükség szerverre, adatbázisra vagy előfizetésre.

---

## ⚠️ EGY DOLOG VÁR RÁD: a script frissítése (kb. 1 perc)

**A bekötés él és működik** — a végpont be van írva a `js/config.js`-be, teszteltem, a sorok
megérkeznek és az e-mail is megy.

Az [`apps-script.gs`](apps-script.gs) **három dolgot** javít, ezért kell egyszer frissíteni:
**(1)** a telefonszám elromlását, **(2)** a spam-szűrést (lásd a „Spam-szűrés" szakaszt lent),
**(3)** v4 — a **Kontextus** oszlopot: melyik űrlapról és gombról jött a lead (visszahívás-modál,
kapcsolat oldal, funnel; hero, fejléc, mobil sáv…), melyik oldalról, városból, kampányból
(UTM). A táblázat 12. oszlopa és az e-mail „Honnan:” sora lesz. A régi táblázat fejlécét a
script magától kiegészíti.

> Amíg nem frissítesz: a **visszahívás-kéréseknél** a kontextus a *Válaszok* oszlopba is
> bekerül, tehát ott sem vész el. A funnelekből érkező leadeknél a kontextus csak a
> frissítés után látszik.

### 1. A telefonszám elromlása

**A táblázatban a telefonszám elromlik.** A Google Sheets a `+` kezdetű értéket
formulának, a `06…` kezdetűt számnak veszi:

| Beküldött telefon | Ami a táblázatba került |
|---|---|
| `+36000000000` | `36000000000` — eltűnt a `+` |
| `06301112233` | `6301112233` — eltűnt a vezető `0` |
| `+36 20 369 5312` | **üres cella**, és elcsúsztak az oszlopok |

Az [`apps-script.gs`](apps-script.gs) már javítva van (a `phone_()` és `safe_()`
függvényekkel). **Az e-mail értesítésben a telefonszám mindig helyes volt és marad** — az
nyers adatból készül, nem a táblázatból. Vagyis lead nem veszett el, csak a táblázat oszlopa
nem megbízható, amíg nem frissítesz.

### 2. Spam-szűrés

Az oldal címe nyilvános, ezért a lead-végpontra bárki tud közvetlenül adatot küldeni,
a weboldal és a JavaScript kihagyásával. A weboldalon van ugyan két csapda (rejtett
mező + időzár), de a **valódi védelem csak a szerveroldalon lehet** — vagyis ebben a
scriptben.

Hogyan működik: a beküldés gyanús jelekre pontot kap (hamis telefonszám, több link,
nem latin írás mellett külföldi szám, tipikus spam kifejezések, honeypot, 90 másodpercen
belüli ismétlés, óránként 30-nál több beküldés).

| Pontszám | Mi történik |
|---|---|
| 0 | Rendes sor + e-mail, ahogy eddig |
| 1–2 | **Rendes sor + e-mail**, de a tárgy elé `[?]` kerül és a levél végén ott van, mi volt gyanús |
| 3 vagy több | A sor egy új **„Spam"** lapra kerül, e-mail nem megy róla |

**Semmi nem veszik el** — minden beküldés eltárolódik valahol. Érdemes néha átfutni a
„Spam" lapot, hogy nem esett-e be valódi ügyfél. Ha igen, szólj, és lazítok a szűrőn.

> Szándékosan óvatosan van beállítva. Egy magyar telefonszám **levon** a pontból, ezért
> egy valódi ügyfél akkor is átjut, ha véletlenül belinkel valamit. Egy Magyarországon
> élő, nem latin nevű ügyfél is átjut — csak `[?]` jelölést kap.
>
> A szerkesztőben futtatható a **`spamTeszt`** függvény: nem ír a táblázatba, csak
> kilistázza a naplóba, melyik esetet hogyan pontozza.

---

### A frissítés (az URL NEM változik, a config.js-hez nem kell hozzányúlni)

1. Táblázat → **Kiterjesztések → Apps Script**
2. Jelöld ki az egész kódot (Ctrl+A) és illeszd be az [`apps-script.gs`](apps-script.gs)
   **teljes új tartalmát**. Mentés (Ctrl+S).
3. **Telepítés → Telepítések kezelése** → a meglévő telepítésnél ✏️ **szerkesztés**
4. *Verzió:* **Új verzió** → **Telepítés**

> Fontos: a **„Telepítések kezelése → szerkesztés → Új verzió"** utat használd, **ne**
> az „Új telepítés"-t — utóbbi új URL-t ad, amit be kellene írni a `config.js`-be.

5. Ellenőrzés: a szerkesztőben futtasd a **`telefonTeszt`** függvényt. Három sor kerül be,
   mindháromban pontosan úgy kell látszódnia a számnak, ahogy be van írva.
6. Futtasd a **`spamTeszt`** függvényt is. Ez nem ír a táblázatba, csak a naplóba
   (a szerkesztő alján, „Végrehajtási napló"). Elvárás: a valódi ügyfeleknél `átmegy`,
   a szemétnél `SPAM`.
7. Végül **töröld a teszt sorokat** a táblázatból (az én próbáim: `TESZT…` kezdetű sorok).

---

## ✅ Ami már elkészült

**A táblázat létrejött a Drive-odon** (timariccsi@gmail.com):

**„Érték Pont — weboldal jelentkezések”**
<https://docs.google.com/spreadsheets/d/1GFx9WNMdGw3rICZ55ioL_jbvMCbU-aQaK_cHuxtopX4/edit>

Fejlécek beállítva: `Időpont | Típus | Téma | Slug | Név | Telefon | E-mail | Megjegyzés | Válaszok | Kalkulátor | Oldal`

**A script kódja is kész:** [`docs/apps-script.gs`](apps-script.gs) — az e-mail címed már be van írva.

**A webalkalmazás telepítve, és a végpont be van kötve.** A `js/config.js → leadEndpoint`
értéke már a te `/exec` URL-ed. Ezt leteszteltem:

| Ellenőrzés | Eredmény |
|---|---|
| `GET /exec` (él-e, nyilvános-e) | HTTP 200, „Érték Pont lead endpoint aktív." |
| `POST /exec` próba-jelentkezéssel | HTTP 200, `{"ok":true}` |
| A sor megérkezett a táblázatba | igen, 4 teszt sor (törölhetők) |
| Hozzáférés: Bárki (nincs bejelentkezési fal) | igen — átirányít a `googleusercontent.com`-ra, nem loginra |

Vagyis a weboldalról beküldött jelentkezés **most is megérkezik** — csak a telefon-oszlop
javításához kell a fenti 1 perces frissítés.

## Ellenőrzés (a script frissítése után)

1. Az Apps Script szerkesztőben futtasd a `telefonTeszt` függvényt — három sor, mindháromban
   pontos telefonszámmal.
2. Aztán a weboldalon töltsd ki a Pénzügyi Térképet és küldj be egy próba-jelentkezést.
3. Ha megvan, töröld az összes teszt sort.

## Hibaelhárítás

| Jelenség | Ok / megoldás |
|---|---|
| Nem jelenik meg sor a táblázatban | A telepítésnél nem *Bárki* hozzáférés lett beállítva. Telepítés → kezelés → szerkesztés → hozzáférés: Bárki. |
| A böngésző konzol CORS hibát ír | Ez normális: a küldés `no-cors` módban megy, választ nem olvasunk. Ha a sor bekerül, minden rendben. |
| Módosítottad a scriptet, de nem változott semmi | Apps Scriptben minden módosítás után **új verziót** kell telepíteni (Telepítés → kezelés → szerkesztés → verzió: Új verzió). |
| Nem jön e-mail | Napi MailApp kvóta (ingyenes fióknál 100 levél/nap) elfogyott, vagy spam mappában van. |
| Elveszett egy jelentkezés | A böngésző `localStorage`-ában van biztonsági másolat az utolsó 50 beküldésről: konzolban `JSON.parse(localStorage.getItem("ep-leads-local"))`. Csak azon a gépen látszik, ahol beküldték. |

## Adatvédelmi megjegyzés

A Google Sheets használatával a Google Ireland Ltd. adatfeldolgozóvá válik — ez már benne van az
`adatkezeles.html` szövegében. Ha később CRM-re vagy saját szerverre váltasz, ott is át kell írni.
