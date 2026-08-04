# Érték Pont Pénzügyek — weboldal

Statikus weboldal 13 pénzügyi szolgáltatás bemutatására, mindegyikhez saját funnellel és
kalkulátorral, plusz egy globális „Pénzügyi Térkép” kérdőívvel, ami a látogatót a neki
legrelevánsabb témákhoz vezeti.

**Nincs build-kényszer, nincs szerver, nincs adatbázis.** A kimenet tiszta HTML/CSS/JS —
feltölthető bármilyen hostingra (Netlify, Cloudflare Pages, GitHub Pages, cPanel, FTP).

Jelenlegi hosting: **GitHub Pages**, ideiglenes címen, saját domain nélkül, ingyen.
→ [`docs/github-pages.md`](docs/github-pages.md)

---

## Mit kell még kitöltened

A `js/config.js` ki van töltve: név, bio, portré, telefon, e-mail, MNB nyilvántartási számok,
OVB cégadatok, stat blokk. **A lead-fogadás is be van kötve és tesztelve** (a jelentkezés
megérkezik a táblázatba, és e-mail is jön róla).

**Egy dolog maradt:** az Apps Script frissítése, hogy a **telefonszám** ne romoljon el a
táblázatban (a Sheets a `+36…`-ot formulának veszi, és kiüríti a cellát). A javított kód
készen van, 4 kattintás a telepítése, az `/exec` URL nem változik:
→ [`docs/google-sheets-setup.md`](docs/google-sheets-setup.md) legfelső szakasza.

> Addig sem veszik el lead: **az e-mail értesítésben a telefonszám mindig helyes**, mert az a
> nyers adatból készül. Csak a táblázat Telefon oszlopa nem megbízható.

**Plusz a hostinghoz egy dolog:** a GitHub-repó létrehozása (1 perc, csak te tudod, mert
bejelentkezési kulcs kell hozzá) → [`docs/github-pages.md`](docs/github-pages.md) 1. lépés.

Opcionális: `contact.calendar` (Calendly link — üresen a gomb eltűnik), `testimonials`
(valós ügyfél-vélemények), `domain` (amikor megjön a saját domain).

> **Jogi megjegyzés:** az oldal az OVB Vermögensberatung Kft.-t **többes ügynökként** nevezi meg,
> és nem használja a „független” / „alkusz” szót, mert az MNB-nyilvántartásban más kategória.
> Igazodási pont: `config.js → legal.role`, valamint a `docs/forrasok.md` végén lévő megjegyzés.

---

## Fájlszerkezet

```
index.html                  ← generált főoldal
szolgaltatas/*.html         ← generált 13 szolgáltatás-oldal
impresszum.html             ← generált
adatkezeles.html            ← generált (GDPR)
404.html                    ← generált hibaoldal (a hosting szolgálja ki)
sitemap.xml, robots.txt     ← generált
.nojekyll                   ← generált (a GitHub Pages ne Jekyll-ezzen)
.gitignore                  ← mi NEM kerül fel a GitHubra (_source/, .claude/)

js/config.js                ← ITT állítod be a saját adataidat
js/data/services.js         ← A TARTALOM: 13 szolgáltatás szövege, számai, funnelje, kalkulátora
js/data/quiz.js             ← a Pénzügyi Térkép kérdései és pontozása
js/core/rt.js               ← EGY rAF hurok + EGY scroll-busz az egész oldalra
js/core/ui.js               ← reveal, nav, akkordeon, számlálók, süti banner
js/funnel.js                ← funnel motor (kérdés → kalkulátor → eredmény → lead)
js/lead.js                  ← lead küldés Google Sheets-be
js/site.js                  ← config-kötések, stat blokk, kategória-szűrő
js/core/motion.js           ← kártya-tilt, magnetikus gombok, parallax, kurzor-glow, futószalag
js/gl/mini3d.js             ← saját mini WebGL réteg + GLB olvasó (~8 kB, three.js helyett)
js/hero3d.js                ← hero: a 3D logó nyíl
js/scene3d.js               ← scroll-vezérelt 3D szekció a Pénzügyi Térkép mögött

css/tokens.css              ← színek, tipográfia, térkezelés (itt állítsd a márkaszíneket)
css/base.css                ← reset, tipó, layout, animációk
css/components.css          ← nav, gombok, kártyák, footer, banner
css/hero.css                ← hero és oldalspecifikus blokkok
css/funnel.css              ← funnel, kalkulátor, űrlap
css/motion.css              ← animációk, 3D szekció, 3D ikonok

assets/brand/               ← logók, portré (portre.jpg — 1400px, 98 kB)
_source/                    ← nyers eredetik (NEM kell feltölteni): portre-original.jpg
assets/3d/ep-arrow.glb      ← a logó nyíl 3D modellje (Blender, 119 kB)
assets/3d/ep-icons.glb      ← 13 lowpoly téma-ikon egy fájlban (Blender, 110 kB, 915 poly)
assets/img/arrow-hero.png   ← statikus hero-fallback + OG kép (Blender render)
assets/img/icons/*.png      ← 13 kirenderelt téma-ikon a kártyákhoz (256px, átlátszó)

build/generate.mjs          ← oldalgenerátor
docs/github-pages.md        ← ingyenes hosting: feltöltés, frissítés, saját domain
docs/google-sheets-setup.md ← lead-fogadás: mi kész, mi van hátra (4 perc)
docs/apps-script.gs         ← a Google Sheets webhook kódja (bemásolásra kész)
docs/forrasok.md            ← a 2026-os számok forrásai + évi frissítési lista
```

---

## Tartalom módosítása

A szolgáltatások szövege, számai, funnel-kérdései és kalkulátorai **egy helyen** vannak:
`js/data/services.js`. Módosítás után futtasd:

```bash
node build/generate.mjs
```

Ez újragenerálja a főoldalt, a 13 aloldalt, a jogi oldalakat és a sitemap-et.

Új szolgáltatás felvétele: adj egy új objektumot a `SERVICES` tömbhöz (a meglévők a minta),
és futtasd újra a generátort — a navigáció, a footer, a bento grid és a sitemap magától követi.

---

## Helyi megnyitás

```bash
python -m http.server 5173
```

Aztán: <http://localhost:5173>

> A 3D-hez **nincs CDN és nincs ES-modul**, ezért `file://` protokollon (dupla kattintás) is
> elindul. Ha nincs WebGL a gépen, automatikusan a statikus render látszik helyette.

---

## Teljesítmény — mire figyelj, ha hozzányúlsz

Az oldalon két szabály tartja alacsonyan a terhelést:

1. **Egy rAF hurok van, `js/core/rt.js`-ben.** Ha új scroll-reakciót írsz, ne tegyél
   `window.addEventListener("scroll", …)`-t: használd az `EP.rt.onScroll(fn)`-t, mert az
   képkockánként EGYSZER olvas layoutot. Animációhoz `EP.rt.onFrame(fn, false)`, és a
   visszaadott handle `.active` flagjével kapcsold be/ki — a hurok leáll, ha semmi nem aktív.
2. **A 3D saját, helyi WebGL réteg** (`js/gl/mini3d.js`, ~8 kB). Korábban a three.js volt,
   ami **1,3 MB-ot töltött le az unpkg CDN-ről minden oldalbetöltéskor**. Ha 3D-t bővítesz,
   maradj ebben a rétegben, vagy számolj a méret- és GDPR-következménnyel (a CDN-hívás
   kiszivárogtatja a látogató IP-jét egy harmadik félhez).

Amit szándékosan **nem** használunk, mert görgetés közben újrafestést kényszerít:
`filter: blur()` és `mix-blend-mode` mozgó elemen, továbbá CSS `animation-duration`
menet közbeni átírása (ettől ugrik az animáció).

---

## Élesítés

**Most (ingyenes, ideiglenes cím):** → [`docs/github-pages.md`](docs/github-pages.md)

1. Hozd létre a GitHub-repót (1 perc, `docs/github-pages.md` 1. lépés).
2. Feltöltés: `git push` — a commit már készen van.
3. Kapcsold be a Pages-t: Settings → Pages → branch `main`, mappa `/ (root)`.
4. Frissítsd az Apps Scriptet a telefon-javítással (`docs/google-sheets-setup.md`, 4 kattintás).
5. Ellenőrizd: küldj be egy próba-jelentkezést, és nézd meg, megjelenik-e a táblázatban.
6. Töröld a teszt sorokat a táblázatból (`TESZT…` kezdetűek).

**Amikor megjön a saját domain:** DNS-beállítás, majd a `js/config.js`-ben
`domain` / `basePath` / `noindex: false`, végül `node build/generate.mjs` és push.
A pontos lépések: `docs/github-pages.md` → „Amikor megjön a saját domain".

**Módosítás feltöltése bármikor:**

```bash
node build/generate.mjs
git add -A
git commit -m "mit változtattál"
git push
```

---

## Amire a tartalom miatt figyelni kell

- Az oldal **nem nevez meg konkrét terméket vagy szolgáltatót**, és a lábjegyzetben, valamint
  minden szolgáltatás-oldal alján szerepel a jogi kitétel (tájékoztatás, nem személyre szóló
  tanácsadás, a hozam nem garantált, a hitelfelvétel kockázattal jár).
- A **kalkulátorok becslést adnak**, minden eredmény alatt ott a magyarázó megjegyzés.
- A 2026-os számok **jogszabályhoz kötöttek** — évente januárban frissítendők,
  lásd `docs/forrasok.md` végén a checklistet.
- Az `adatkezeles.html` **minta jellegű kiindulás**: a saját cégadataiddal és szükség szerint
  jogi szakértővel véglegesítsd.
