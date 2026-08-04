# Ingyenes hosting GitHub Pages-en

## ✅ AZ OLDAL ÉL

**<https://duwras.github.io/>**

Ez ideiglenes cím. Ha megjön a saját domain, ugyanez a repó szolgálja ki azt is —
nem kell újra feltölteni semmit, csak egy beállítást átírni (lásd lent).

Repó: <https://github.com/Duwras/Duwras.github.io> (publikus)

### Ami készen van

| | |
|---|---|
| ✅ | Git-repó, 2 commit, feltöltve a GitHubra |
| ✅ | Pages bekapcsolva: `main` branch, `/ (root)` mappa |
| ✅ | `.gitignore`: a 6,4 MB-os `_source/` és a `.claude/` kimarad |
| ✅ | `.nojekyll`: a GitHub ne akarja Jekyll-lel feldolgozni az oldalt |
| ✅ | `404.html`: márkás hibaoldal, bármilyen mély rossz URL-en is jól jelenik meg |
| ✅ | `js/config.js`: cím `duwras.github.io`, `noindex: true` |
| ✅ | A táblázat linkje kivéve a nyilvános `config.js`-ből |

### Amit leellenőriztem élesben

| Ellenőrzés | Eredmény |
|---|---|
| Főoldal, 13 aloldal, impresszum, adatkezelés | mind HTTP 200 |
| 3D nyíl, dust részecskék, hero-cím animáció | rendereltek, nulla konzolhiba |
| GLB modellek MIME-típusa | `model/gltf-binary` (helyes) |
| Rossz URL (`/szolgaltatas/nincs-ilyen.html`) | a saját 404-oldal, igazi 404-es státusszal |
| `_source/` elérhető-e | nem — 404, ahogy kell |
| `robots.txt` | `Disallow: /` (ideiglenes cím, lásd lent) |

**Ami még nincs letesztelve élesben:** egy valódi jelentkezés beküldése. Ezt érdemes
az Apps Script telefon-javítása UTÁN megtenni (`docs/google-sheets-setup.md`),
különben most is elromlott telefonszámmal kerülne be a sor.

---

## Ha egyszer újra kell csinálni (más gépen, más fiókkal)

### 1. lépés — a repó létrehozása

1. Nyisd meg: <https://github.com/new>
2. **Repository name:** írd be pontosan, kis-nagybetűre figyelve:
   ```
   Duwras.github.io
   ```
   > Ez a név nem véletlen. Ha a repó neve `<fióknév>.github.io`, akkor az oldal a
   > `https://duwras.github.io/` **gyökerén** jelenik meg — rövid, szép cím.
   > Bármilyen más név esetén `https://duwras.github.io/repó-neve/` lenne, és akkor
   > egy beállítást is át kell írni (lásd „Ha más nevet adtál" lent).
3. **Description:** üresen hagyható, vagy: `Érték Pont Pénzügyek — weboldal`
4. **Public** ← ez kell. *(A Pages ingyenes csomagban csak publikus repóból működik.
   Lásd a „Mi lesz publikus" szakaszt lent.)*
5. **NE** pipálj be semmit: se „Add a README file", se `.gitignore`, se licenc.
   Minden fájl már készen van itt a gépen, és az üres repó a legegyszerűbb.
6. **Create repository**

Ennyi. A megjelenő oldalon lesznek git-parancsok — azokat hagyd, a következő pont jó.

> A Pages ilyenkor **nem** kapcsol be magától, még `<fióknév>.github.io` névnél sem.
> A 3. lépés muszáj.

### 2. lépés — feltöltés

```bash
git remote add origin https://github.com/Duwras/Duwras.github.io.git
git push -u origin main
```

### 3. lépés — a Pages bekapcsolása

1. A repóban fent: **Settings** (fogaskerék)
2. Bal oldali menü: **Pages**
3. *Build and deployment* → **Source:** `Deploy from a branch`
4. *Branch:* **main**, mappa: **/ (root)** → **Save**
5. Várj 30–60 másodpercet. A cím ilyenkor még 404-et ad, aztán megjelenik az oldal.

---

## Későbbi módosítások feltöltése

Ha bármit átírsz (`js/data/services.js`, `js/config.js`, CSS…), a folyamat mindig ez:

```bash
node build/generate.mjs
git add -A
git commit -m "mit változtattál"
git push
```

Kb. 30–60 másodperc múlva már az éles címen is látszik.

> Ha nem látod a változást a böngészőben, az a saját cache-ed: `Ctrl+Shift+R`.
> A CSS- és JS-fájlokra a generátor minden futásnál új `?v=` bélyeget tesz, ezért
> ez ritkán fordul elő.

---

## Mi lesz publikus, és mi nem

A Pages ingyenes csomagban **publikus repót** igényel. Ez a gyakorlatban azt jelenti:

**Bárki láthatja** — de ezek eddig is nyilvánosak voltak, mert az oldal maga
elküldi őket minden látogatónak:

- a HTML, CSS, JS forrás (minden weboldalnál így van, F12-vel bárki megnézheti)
- `js/config.js`: a telefonszámod, e-mail címed, MNB-számok, cégadatok
- `js/config.js → leadEndpoint`: a Google Apps Script webhook címe

**Amit szándékosan kivettem** a nyilvános `config.js`-ből: a jelentkezéseket gyűjtő
**táblázat linkje**. Most csak itt szerepel, a `docs/` alatt:
<https://docs.google.com/spreadsheets/d/1GFx9WNMdGw3rICZ55ioL_jbvMCbU-aQaK_cHuxtopX4/edit>
(A táblázatot a Google akkor is védi, ha valaki ismeri a linket — csak te látod.
Ettől függetlenül semmi haszna nem volt kiküldeni minden látogatónak.)

**Nem kerül fel a GitHubra:** `_source/` (6,4 MB nyers eredetik) és `.claude/`.
Ezekről tehát **nincs online mentés** — a `_source` csak ezen a gépen létezik.

**Amivel érdemes tisztában lenni:** a `leadEndpoint` publikus címre bárki tud
adatot küldeni, tehát elméletileg jöhet szemét-jelentkezés a táblázatba. Ez minden
űrlapos statikus oldalnál így van. Ha egyszer zavaró lesz, szólj — az Apps Scriptbe
tehető egy egyszerű szűrő.

---

## Miért `noindex` most, és mikor kapcsold ki

A `js/config.js`-ben `noindex: true` van. Ez két dolgot csinál: a `robots.txt`-be
`Disallow: /` kerül, és minden oldal fejébe `noindex,nofollow`.

Így a `duwras.github.io` cím **nem kerül be a Google-be**. Ez most jó, mert amikor
megjön a saját domain, ugyanaz a tartalom két címen lenne elérhető — és a Google
ilyenkor összemossa őket, néha a rosszabb címet tartja meg. Egy hetes ideiglenes
címmel nincs mit veszíteni, egy összekavart indexeléssel viszont van.

Megosztani, mutogatni, Facebookra kitenni **lehet** — a `noindex` csak a keresőt
tiltja, a linket bárki megnyithatja.

---

## Amikor megjön a saját domain

1. A domain szolgáltatójánál (pl. Rackhost, Cheap.hu) állítsd be a DNS-t:

   | Típus | Név | Érték |
   |---|---|---|
   | A | `@` | `185.199.108.153` |
   | A | `@` | `185.199.109.153` |
   | A | `@` | `185.199.110.153` |
   | A | `@` | `185.199.111.153` |
   | CNAME | `www` | `duwras.github.io` |

2. GitHub → repó → **Settings → Pages → Custom domain**: írd be a domaint, **Save**.
   Utána pipáld be az **Enforce HTTPS**-t (pár perc múlva lesz aktív a tanúsítvány).
3. A `js/config.js`-ben:
   ```js
   domain: "ertekpontpenzugyek.hu",
   basePath: "",
   noindex: false,
   ```
4. `node build/generate.mjs`, majd `git add -A && git commit -m "saját domain" && git push`
5. Küldd be a `sitemap.xml`-t a [Google Search Console](https://search.google.com/search-console)-ba.

> A GitHub a Custom domain mentésekor létrehoz egy `CNAME` fájlt a repóban. Ha
> parancssorból dolgozol, előtte `git pull`, különben ütközik a következő push.

---

## Ha más nevet adtál a repónak

Tegyük fel, `ertekpont-penzugyek` lett a neve. Akkor a cím
`https://duwras.github.io/ertekpont-penzugyek/`, és a `js/config.js`-ben:

```js
domain: "duwras.github.io",
basePath: "/ertekpont-penzugyek",
noindex: true,
```

Majd `node build/generate.mjs` és push. Az oldal belső linkjei relatívak, ezért
maguktól működnek; a `basePath` a canonical URL-t, az OG-képet, a sitemap-et és a
404-oldal útvonalait állítja helyre.

---

## Hibaelhárítás

| Jelenség | Megoldás |
|---|---|
| A cím 404-et ad 5 perc után is | Settings → Pages: a *Branch* `main` és a mappa `/ (root)`? A repó **Public**? |
| Betölt, de nincs stílus (csupasz szöveg) | Rossz `basePath`. Ha a cím tartalmaz `/repó-nevet`, be kell írni a `config.js`-be, és újragenerálni. |
| A 3D nyíl nem látszik, helyette kép | Nincs WebGL a böngészőben/gépen — ez szándékos tartalék, nem hiba. |
| `git push` jelszót kér | A jelszó helyére **nem** a GitHub-jelszó kell, hanem személyes hozzáférési kulcs. Egyszerűbb a GitHub Desktop (2/B pont). |
| `! [rejected] ... fetch first` | Valaki (te vagy a GitHub) módosított a weben. `git pull --rebase`, majd újra `git push`. |
| Feltöltöttem, de a régi verziót látom | Böngésző-cache: `Ctrl+Shift+R`. Vagy a GitHub még dolgozik: repó → **Actions** fül, ott látszik a futó deploy. |
