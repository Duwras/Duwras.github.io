# Ingyenes hosting GitHub Pages-en

## ✅ AZ OLDAL ÉL A SAJÁT DOMAINEN

# <https://ertekpontpenzugyek.hu/>

HTTPS-sel, kikényszerítve. Minden más cím ide irányít át (301):
`http://ertekpontpenzugyek.hu`, `www.ertekpontpenzugyek.hu` (http és https),
és a régi `duwras.github.io` is.

Repó: <https://github.com/Duwras/Duwras.github.io> (publikus)
Tárhely: GitHub Pages, `main` branch, `/ (root)` — ingyenes
Domain: Rackhost, lejárat **2027-08-04**

### Ami készen van

| | |
|---|---|
| ✅ | Git-repó, 2 commit, feltöltve a GitHubra |
| ✅ | Pages bekapcsolva: `main` branch, `/ (root)` mappa |
| ✅ | `.gitignore`: a 6,4 MB-os `_source/` és a `.claude/` kimarad |
| ✅ | `.nojekyll`: a GitHub ne akarja Jekyll-lel feldolgozni az oldalt |
| ✅ | `404.html`: márkás hibaoldal, bármilyen mély rossz URL-en is jól jelenik meg |
| ✅ | `js/config.js`: cím `ertekpontpenzugyek.hu`, `noindex: false` (indexelhető) |
| ✅ | DNS a Rackhostnál: 4 db `A` rekord + `www` CNAME |
| ✅ | GitHub Custom domain + **Enforce HTTPS** |
| ✅ | `CNAME` fájl a repóban (ezt a GitHub hozta létre, ne töröld) |
| ✅ | A táblázat linkje kivéve a nyilvános `config.js`-ből |

### Amit leellenőriztem élesben

| Ellenőrzés | Eredmény |
|---|---|
| Főoldal, 13 aloldal, impresszum, adatkezelés | mind HTTP 200 |
| 3D nyíl, dust részecskék, hero-cím animáció | rendereltek, nulla konzolhiba |
| GLB modellek MIME-típusa | `model/gltf-binary` (helyes) |
| Rossz URL (`/szolgaltatas/nincs-ilyen.html`) | a saját 404-oldal, igazi 404-es státusszal |
| `_source/` elérhető-e | nem — 404, ahogy kell |
| `robots.txt` | `Allow: /` + sitemap az `ertekpontpenzugyek.hu`-ra |
| canonical URL minden oldalon | `https://ertekpontpenzugyek.hu/…` |
| `noindex` fejek | nincsenek — `index,follow` |
| LinkedIn-link | mind a 16 oldalon |
| HTTP → HTTPS, www → apex, github.io → apex | mind **301** a végleges címre |
| Mobil (320/360/375/414/768/1280 px × 17 oldal) | nulla levágott gomb, nulla kilógó cím |

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

## A `noindex` kapcsoló

`js/config.js → noindex`. `true` esetén a `robots.txt`-be `Disallow: /` kerül, és
minden oldal fejébe `noindex,nofollow` — vagyis a cím nem kerül be a Google-be.

**Most `false`**, mert megvan a saját domain, és a canonical URL is arra mutat.
Amíg csak a `duwras.github.io` cím élt, `true` volt: két címen ugyanaz a tartalom
összekavarja a keresőt, és néha a rosszabb címet tartja meg.

Ha valaha újra ideiglenes vagy próbacímen futna az oldal, állítsd vissza `true`-ra
és generálj újra.

---

## A saját domain bekötése — `ertekpontpenzugyek.hu` (Rackhost)

**A `js/config.js` és a generált fájlok már erre a domainre vannak állítva**
(`noindex: false`, canonical és sitemap az `ertekpontpenzugyek.hu`-ra mutat).
Ami hátra van: a DNS a Rackhostnál, utána a GitHub oldali beállítás.

### 1. lépés — DNS a Rackhostnál (te)

Rackhost ügyfélfiók → **DNS zónák** → válaszd ki az `ertekpontpenzugyek.hu`-t →
**Rekordok szerkesztése**.

**Négy `A` rekord kell.** Mindegyiknél a **Hosztnév mező marad ÜRESEN** (ez jelenti
magát a domaint), típus `A`, és az IP:

| Típus | Hosztnév | IP-cím |
|---|---|---|
| A | *(üres)* | `185.199.108.153` |
| A | *(üres)* | `185.199.109.153` |
| A | *(üres)* | `185.199.110.153` |
| A | *(üres)* | `185.199.111.153` |

**Plusz egy `CNAME` a www-hez:**

| Típus | Hosztnév | Érték |
|---|---|---|
| CNAME | `www` | `duwras.github.io` |

> Ez a GitHub által hivatalosan megadott négy IP-cím. Mind a négy kell — ezek több
> adatközpontot jelentenek, egy is elég lenne a működéshez, de négyel akkor is él az
> oldal, ha valamelyik kiesik.

> Ha van már `A` rekord üres hosztnévvel (a Rackhost parkoló oldalára mutat), azt
> **írd át** az elsőre a ceruza ikonnal, a maradék hármat pedig **Új rekord**dal add
> hozzá. Ha látsz `AAAA` rekordot, azt töröld — különben IPv6-on a régi helyre menne.

### 2. lépés — GitHub Custom domain (ezt én is meg tudom tenni)

**Csak akkor, ha a DNS már él**, különben az oldal átmenetileg elérhetetlenné válik
(a `duwras.github.io` ugyanis átirányít a saját domainre).

GitHub → repó → **Settings → Pages → Custom domain** → `ertekpontpenzugyek.hu` →
**Save**. Utána pipa az **Enforce HTTPS**-re (a tanúsítvány pár perc–1 óra alatt áll fel).

**Szólj, ha beállítottad a DNS-t, és a többit elvégzem:** ellenőrzöm a DNS-terjedést,
beállítom a Custom domaint, bekapcsolom a HTTPS-t, és végigmérem az éles oldalt.

### 3. lépés — utána

- A `sitemap.xml` beküldése a [Google Search Console](https://search.google.com/search-console)-ba
- A Facebook-oldalon és a LinkedIn-profilban a link átírása az új címre

> A GitHub a Custom domain mentésekor létrehoz egy `CNAME` fájlt a repóban. Ha
> parancssorból dolgozol, előtte `git pull`, különben ütközik a következő push.

> **A DNS terjedése** néhány perctől néhány óráig tart (a `.hu` zónánál jellemzően
> 15–60 perc). Addig előfordul, hogy neked már működik, másnak még nem — ez normális,
> nem hiba.

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
