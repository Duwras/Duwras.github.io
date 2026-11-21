# Blog-ügynök napló

Az ütemezett blogfeladat minden futásról **egy sort** ír ide, a lista **tetejére** (legújabb elöl).
Formátum és szabályok: `BLOG_AGENT.md` → 10. pont.

- `PUBLIKÁLVA` — megjelent cikk (slug, hír vagy evergreen, források száma)
- `KIHAGYVA` — nem jelent meg cikk, és miért (web nem elérhető, nincs megbízható forrás, validátor-hiba…)
- `TEENDŐ` — a tulajdonosnak szóló jelzés (pl. az oldal egy meglévő, kézzel karbantartott része elavult)

---

- 2026-11-21 · PUBLIKÁLVA · `allami-adossagkezelesi-tanacsadas-kihez-fordulhatsz` · hír (állami adósságkezelési tanácsadás, nov. 20-tól) · 4 forrás (2 hivatalos: kormany.hu, Heves megyei kormányhivatal) · a rendelet számát (219/2026. (IX. 28.) Korm. r.) csak a Pénzcentrum említi, hivatalos szövegben nem sikerült ellenőrizni, ezért kimaradt
- 2026-11-17 · PUBLIKÁLVA · `kgfb-valtas-meddig-mondhatod-fel` · hír (év végi KGFB-kampány, december 1-i felmondási határidő) · 8 forrás (3 hivatalos: MABISZ, MNB ×2) · a Wekerle Plusz banki indulása (nov. 16.) kimaradt: a témát nov. 12-én már tárgyaltuk
- 2026-11-17 · TEENDŐ · `/szolgaltatas/kgfb-casco.html`: „az évfordulós értesítőben szereplő új díj szinte mindig magasabb” — forrás nélküli állítás, az MNB kgfb-indexe (2026 Q2: 55 521 Ft, −2,7% éves alapon) és a közvetítői kampányadatok idén csökkenő átlagdíjat mutatnak — ellenőrizendő
- 2026-11-15 · PUBLIKÁLVA · `adojovairas-nyugdijra-hogyan-kapod-vissza` · evergreen (backlog) · 4 forrás (4 hivatalos: 2 NAV, 2 MNB) · a 48 órás hírek (pénzcentrumos nyugdíjtémák, bankos Wekerle Plusz akciók) nem feleltek meg a hivatalos forrás / 2 független forrás feltételnek
- 2026-11-15 · TEENDŐ · `/szolgaltatas/nyugdij-megtakaritas.html`: a „120% visszafizetés” kivételnél mindhárom formát egyként kezeli, az MNB ezt a NYESZ-re (10 adóév előtti megszüntetés) írja; a „három forma plafonja külön él” mellett 280 000 Ft összesített határt is állít (130+150+100 = 380), az MNB szerint a három termék együtt 280 000 Ft — ellenőrizendő
- 2026-11-13 · PUBLIKÁLVA · `tbsz-mikor-adomentes-a-hozam` · evergreen (backlog) · 3 forrás (3 hivatalos) · a friss hírek (Wekerle Plusz lakástakarék: csak bejelentés, rendelet nélkül; októberi infláció: 3 napos) nem feleltek meg a 48 órás / 2 független forrás feltételnek
- 2026-11-12 · TEENDŐ · Az oldal több meglévő része még az Otthon Startot mutatja élő konstrukcióként (főoldali stat blokk „3% fix kamat az Otthon Start lakáshitelnél”, a „legtöbbet keresett témák” lista, `/szolgaltatas/tamogatott-hitelek.html`, `docs/forrasok.md`). Az Otthon Start igénylése 2026. november 15-én lezárul, a rendelete november 16-án hatályát veszti; a helyére a Wekerle Plusz lépett (298/2026. (X. 27.) Korm. rendelet). Érintett források (58 említés): `js/config.js` (1), `js/data/services.js` (11), `js/data/quiz.js` (9), `build/generate.mjs` (3), `build/content/cities.mjs` (21), `build/content/pages.mjs` (6), `build/content/about.mjs` (1), `docs/forrasok.md` (6) — a blogfeladat nem nyúl hozzájuk.
- 2026-11-12 · PUBLIKÁLVA · `wekerle-plusz-valtja-az-otthon-startot` · hír · 4 forrás (2 hivatalos) · kézi indítás, a blog első cikke
