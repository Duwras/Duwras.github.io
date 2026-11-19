# Vezetői Portál – beállítás (Supabase)

A Vezetői Portál (`/vezetoi-portal/`) a munkatársak felvételét, adatait és a
bedolgozás követését tartja nyilván. A weboldal statikus marad (GitHub Pages);
az adatok egy **Supabase** projektben (Postgres + bejelentkezés + fájltár)
vannak, **EU régióban**.

Kb. 30–40 perc, egyszer kell megcsinálni.

> **Kulcsok – a legfontosabb szabály**
>
> | Kulcs | Hova mehet |
> |---|---|
> | Project URL | `vezetoi-portal/config.js` (nyilvános, rendben van) |
> | `anon` / publishable key | `vezetoi-portal/config.js` (nyilvános, rendben van: a védelmet a Row Level Security adja) |
> | `service_role` / secret key | **SEHOVA** a repóban. Csak a Supabase Edge Function környezetében él (automatikusan), és – ha az éles RLS-tesztet futtatod – a saját gépeden egy ideiglenes környezeti változóban. |
>
> Ha a service role key valaha a repóba vagy a böngészőbe kerülne:
> Supabase → Project Settings → API Keys → **Roll/Revoke** azonnal.

---

## 1. Projekt létrehozása

1. <https://supabase.com> → **New project**
2. Név: pl. `ertekpont-vezetoi`
3. **Region: Central EU (Frankfurt)** – EU-ban kell lennie (GDPR).
4. Erős adatbázis-jelszó (jelszókezelőbe; a portálhoz nem kell).
5. Plan: Free elég az induláshoz (lásd a „Tudnivalók” részt).

## 2. Adatbázis: séma + tartalom

Supabase → **SQL Editor** → New query:

1. Másold be és futtasd a teljes
   `supabase/migrations/20261119120000_vezetoi_portal.sql` fájlt.
   Ez hozza létre a táblákat, a jogosultságokat (RLS), a naplózást és a
   privát `cv` fájltárat. Hiba nélkül kell lefutnia („Success. No rows returned”).
2. Új query: futtasd a **`private/vezetoi-seed.sql`** fájlt (ez a te gépeden
   van, a repóban nincs – a bedolgozási 53 pont, a 18 interjúkérdés, a
   karrierszintek és a gyorslinkek). A végén ellenőrzi, hogy pontosan 53 pont
   került be; ha nem, hibát dob.

   (Ha a `private/` mappa nincs meg, a `supabase/seed.example.sql` egy kamu
   adatos minta – éleshez nem jó.)

## 3. Bejelentkezés beállítása

Supabase → **Authentication**:

1. **Sign In / Providers → Email**: bekapcsolva. **„Allow new users to sign up”: KI.**
   (Regisztráció nincs: vezető csak meghívóval kerül be.)
   „Confirm email”: maradhat bekapcsolva.
2. **URL Configuration**
   - Site URL: `https://ertekpontpenzugyek.hu/vezetoi-portal/`
   - Redirect URLs: `https://ertekpontpenzugyek.hu/vezetoi-portal/`
     (helyi teszthez opcionálisan: `http://localhost:5173/vezetoi-portal/`)
3. **Emails / SMTP**: a beépített levélküldő óránként csak néhány levelet
   enged (meghívó, jelszó-visszaállítás). Ha több vezetőt hívsz meg egyszerre,
   állíts be saját SMTP-t (pl. a domain levelezője). A levélsablonok szövegét
   itt magyarosíthatod („Invite user”, „Reset password”).
4. Opcionális, ajánlott: **Attack Protection → Leaked password protection** be.

## 4. A frontend bekötése

Supabase → **Project Settings → API Keys** (vagy „Data API”):

`vezetoi-portal/config.js`:

```js
window.VP_CONFIG = {
  supabaseUrl: "https://<projekt-azonosító>.supabase.co",
  supabaseAnonKey: "<anon / publishable key>",
};
```

Commit + push → a GitHub Pages pár perc alatt kiteszi.

## 5. Az első admin

1. Supabase → **Authentication → Users → Invite user** → a saját e-mail-címed.
2. A levélben lévő linkkel a portálon beállítod a jelszavad (min. 10 karakter).
3. SQL Editor:

   ```sql
   update public.profiles set szerep = 'admin', nev = 'A Te Neved'
   where email = 'a-te-cimed@example.com';
   ```

4. Lépj be újra: megjelenik az **Admin** menü.

## 6. Edge Function (vezetők meghívása / letiltása a portálról)

Enélkül is működik a portál; ekkor a vezetőket a Supabase felületén hívod meg
(Authentication → Users → Invite user), a letiltást pedig az Admin felület
akkor is elvégzi az adatbázisban (a letiltott vezető semmit nem lát), csak a
bejelentkezést nem tiltja le.

A függvénnyel a portál Admin → Vezetők oldaláról megy minden:

```powershell
npx supabase@2 login
```

```powershell
npx supabase@2 link --project-ref <projekt-azonosító>
```

```powershell
npx supabase@2 secrets set VP_ALLOWED_ORIGINS=https://ertekpontpenzugyek.hu
```

```powershell
npx supabase@2 functions deploy vezeto-admin
```

(A `SUPABASE_URL`, `SUPABASE_ANON_KEY` és `SUPABASE_SERVICE_ROLE_KEY`
változókat a Supabase automatikusan adja a függvénynek – ezeket NEM kell és
nem szabad sehova beírni.)

A függvény csak bejelentkezett, aktív admin kérésére dolgozik, és a meghívó
linkje csak a portál címére mutathat.

## 7. Ellenőrzés – éles RLS-teszt (ajánlott, 1 perc)

Két ideiglenes teszt-vezetőt hoz létre, ellenőrzi, hogy egymás munkatársait
és fájljait nem látják, a bejelentkezés nélküli hozzáférés semmit nem ad,
majd mindent töröl:

```powershell
cd supabase/tests; npm install
```

```powershell
$env:SUPABASE_URL="https://<projekt>.supabase.co"; $env:SUPABASE_ANON_KEY="<anon key>"; $env:SUPABASE_SERVICE_ROLE_KEY="<service role key>"; npm run test:live; Remove-Item Env:SUPABASE_SERVICE_ROLE_KEY
```

A kulcs csak abban a PowerShell-ablakban él, fájlba nem kerül.

Helyi (Supabase nélküli) teszt ugyanerre a sémára: `npm run test:local`
(böngészőn kívül, beépített Postgresszel).

---

## Használat röviden

- **Új vezető:** Admin → Vezetők → e-mail + név → Meghívás. A vezető levelet
  kap, beállítja a jelszavát, és csak a saját munkatársait látja.
- **Vezető kilép:** Admin → Vezetők → Letiltás, majd Admin → Átrendelés.
- **Új bedolgozási pont:** Admin → Bedolgozási sablon. A portál megkérdezi,
  hogy a már folyamatban lévőkhöz is hozzáadja-e (üresen). Pontot törölni nem
  kell: az inaktív pont eltűnik az új munkatársaknál, a régi pipák megmaradnak.
- **Adatkérés (GDPR):** az adatlapon Export (JSON) és Export (PDF).
- **Törlés:** az adatlapon „Törlés” (a fájlokat is törli), illetve Admin →
  Törlésre javasolt: az elutasított / nem folytató személyek a beállított
  hónapszám után (alapból 6) itt jelennek meg.

## Tudnivalók

- **Ingyenes Supabase projekt 7 nap inaktivitás után szünetel.** Ilyenkor a
  Dashboardon egy kattintás visszaindítani (adat nem vész el). Ha ez zavar, a
  Pro csomag megszünteti, és napi mentést is ad.
- **Mentés:** az ingyenes csomagban nincs automatikus mentés. Havonta érdemes
  a Dashboard → Database → Backups, vagy `npx supabase@2 db dump` paranccsal
  menteni (a mentést titkosítva, ne a repóba).
- **Munkamenet:** a bejelentkezés a böngészőben marad (localStorage), amíg a
  vezető ki nem lép. Közös gépen mindig „Kilépés”.
- **Adatkezelés:** az OVB/Kétórás munkafüzet szerinti adatkezelési
  tájékoztatót és a megőrzési időt egyeztesd az OVB-vel; a tájékoztató szövege
  az Admin → Beállításokban szerkeszthető (most egy TODO-vázlat).
- **Nincs analitika** a portálon, nincs a sitemapben, `noindex`, a nyilvános
  oldal nem linkel rá. Személynév soha nem kerül URL-be, csak azonosító.
- **Mit NEM tárol a portál:** személyi igazolvány szám, pontos lakcím (csak
  település), egészségügyi adat. Ne is írd be a megjegyzésekbe.

## Fájlok

| Fájl | Mi ez |
|---|---|
| `vezetoi-portal/` | a portál (statikus HTML/CSS/JS, supabase-js vendorolva) |
| `vezetoi-portal/config.js` | Project URL + anon key (nyilvános) |
| `supabase/migrations/…sql` | séma, RLS, triggerek, Storage |
| `supabase/functions/vezeto-admin/` | meghívás / letiltás (Edge Function) |
| `supabase/seed.example.sql` | kamu adatos minta |
| `private/vezetoi-seed.sql` | a valódi tartalom (gitignore-olt, csak nálad) |
| `supabase/tests/` | helyi és éles tesztek |
