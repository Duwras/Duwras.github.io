-- =============================================================================
--  VEZETŐI PORTÁL — séma, jogosultságok (RLS), triggerek, Storage
--  Supabase (Postgres 15+), EU régió. Futtatás: docs/vezetoi-portal-setup.md
--
--  A TARTALMI SEED (bedolgozási pontok, interjúkérdések, karrierszintek,
--  gyorslinkek) NINCS ITT: a repó nyilvános, ezért az a gitignore-olt
--  private/vezetoi-seed.sql-ben van. Kamu adatos minta: supabase/seed.example.sql
--
--  Védelmi modell
--  - Minden tábla RLS-sel védett. Az anon szerepkör SEMMIT nem ér el.
--  - vezeto: csak a hozzá rendelt munkatársakat (vezeto_id = auth.uid()) és a
--    hozzájuk tartozó sorokat, fájlokat látja és írja.
--  - admin: mindent elér, ő szerkeszti a sablonokat és a beállításokat.
--  - A letiltott vezető (profiles.aktiv = false) azonnal semmit nem lát,
--    akkor is, ha a böngészőjében még érvényes a munkamenet.
--  - updated_by / naplo.ki mindig a szerveren, az auth.uid()-ból töltődik,
--    a kliens nem hamisíthatja.
-- =============================================================================

create schema if not exists app;
comment on schema app is 'Vezetői Portál: belső segédfüggvények (nem publikus API).';
revoke all on schema app from public;
grant usage on schema app to authenticated;

-- -----------------------------------------------------------------------------
--  Táblák
-- -----------------------------------------------------------------------------

-- Vezetők (egy sor = egy Supabase Auth felhasználó)
create table public.profiles (
  id          uuid primary key references auth.users (id) on delete cascade,
  nev         text not null default '',
  email       text not null default '',
  szerep      text not null default 'vezeto' check (szerep in ('admin', 'vezeto')),
  aktiv       boolean not null default true,
  created_at  timestamptz not null default now()
);

-- Admin által szerkeszthető listák és beállítások
create table public.karrierszintek (
  id        bigint generated always as identity primary key,
  nev       text not null unique check (length(btrim(nev)) > 0),
  sorrend   integer not null default 0,
  aktiv     boolean not null default true
);

create table public.beallitasok (
  kulcs       text primary key,
  ertek       jsonb not null,
  updated_at  timestamptz not null default now()
);

-- Jelöltek és munkatársak egy táblában (a „mappa”)
create table public.munkatarsak (
  id                    uuid primary key default gen_random_uuid(),
  vezeto_id             uuid not null default auth.uid() references public.profiles (id) on delete restrict,
  statusz               text not null default 'jelolt'
                          check (statusz in ('jelolt', 'bedolgozas', 'aktiv', 'nem_folytatja', 'elutasitva')),
  statusz_valtozott     timestamptz not null default now(),
  -- alapadatok
  nev                   text not null check (length(btrim(nev)) > 0),
  telefon               text,
  email                 text,
  szuletesi_ev          integer check (szuletesi_ev between 1930 and 2030),
  lakhely               text,       -- csak település, nem pontos lakcím
  honnan_szarmazik      text,
  iskola_tanulmanyok    text,
  jelenlegi_munka       text,
  erettsegi_van         boolean,
  -- felvételi infók
  forras                text check (forras in ('ajanlas', 'facebook', 'allashirdetes', 'egyeb')),
  ajanlo_nev            text,
  interju_datum         date,
  felvetel_datum        date,
  ovb_belepes_datum     date,
  -- karrier és vizsga
  karrierszint          text not null default 'Jelölt',
  mnb_vizsga_statusz    text not null default 'nincs'
                          check (mnb_vizsga_statusz in ('nincs', 'jelentkezett', 'idopont_fix', 'sikeres', 'sikertelen')),
  -- adatkezelés
  adatkezelesi_hozzajarulas        boolean not null default false,
  adatkezelesi_hozzajarulas_datum  date,
  -- egyéb
  megjegyzes            text,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now(),
  updated_by            uuid
);
create index munkatarsak_vezeto_idx on public.munkatarsak (vezeto_id);
create index munkatarsak_statusz_idx on public.munkatarsak (statusz, statusz_valtozott);

create table public.karrierszint_tortenet (
  id              bigint generated always as identity primary key,
  munkatars_id    uuid not null references public.munkatarsak (id) on delete cascade,
  szint           text not null,
  datum           date not null default current_date,
  megjegyzes      text,
  rogzitette      uuid default auth.uid(),
  rogzitette_nev  text,
  created_at      timestamptz not null default now()
);
create index karrierszint_tortenet_mt_idx on public.karrierszint_tortenet (munkatars_id, datum desc);

-- Bedolgozás: sablon (admin) + munkatársankénti haladás
create table public.bedolgozas_sablon (
  id               bigint generated always as identity primary key,
  szakasz          text not null,
  szakasz_sorrend  integer not null,
  sorrend          integer not null,
  pont             text not null check (length(btrim(pont)) > 0),
  aktiv            boolean not null default true,
  created_at       timestamptz not null default now()
);
create index bedolgozas_sablon_rend_idx on public.bedolgozas_sablon (szakasz_sorrend, sorrend);

create table public.bedolgozas_haladas (
  munkatars_id  uuid not null references public.munkatarsak (id) on delete cascade,
  sablon_id     bigint not null references public.bedolgozas_sablon (id) on delete restrict,
  megvolt       boolean not null default false,
  datum         date,
  megjegyzes    text,
  updated_by    uuid,
  updated_at    timestamptz not null default now(),
  primary key (munkatars_id, sablon_id)
);

-- Interjú
create table public.interju_kerdesek (
  id         bigint generated always as identity primary key,
  kategoria  text not null,
  kerdes     text not null check (length(btrim(kerdes)) > 0),
  sorrend    integer not null default 0,
  aktiv      boolean not null default true
);

create table public.interju_valaszok (
  munkatars_id  uuid not null references public.munkatarsak (id) on delete cascade,
  kerdes_id     bigint not null references public.interju_kerdesek (id) on delete restrict,
  valasz        text not null default '',
  updated_by    uuid,
  updated_at    timestamptz not null default now(),
  primary key (munkatars_id, kerdes_id)
);

create table public.interju_ertekeles (
  munkatars_id    uuid primary key references public.munkatarsak (id) on delete cascade,
  elso_benyomas   smallint check (elso_benyomas between 1 and 5),
  kommunikacio    smallint check (kommunikacio between 1 and 5),
  motivacio       smallint check (motivacio between 1 and 5),
  dontes          text check (dontes in ('felvesszuk', 'masodik_kor', 'nem')),
  megjegyzes      text,
  updated_by      uuid,
  updated_at      timestamptz not null default now()
);

-- Kompetenciateszt-kódok (egy munkatárshoz több is lehet)
create table public.kompetencia_tesztek (
  id              bigint generated always as identity primary key,
  munkatars_id    uuid not null references public.munkatarsak (id) on delete cascade,
  kod             text not null check (length(btrim(kod)) > 0),
  kitoltes_datum  date,
  megjegyzes      text,
  created_by      uuid default auth.uid(),
  created_at      timestamptz not null default now()
);
create index kompetencia_tesztek_mt_idx on public.kompetencia_tesztek (munkatars_id);
create index kompetencia_tesztek_kod_idx on public.kompetencia_tesztek (lower(kod));

-- Dokumentumok (a fájl a privát „cv” bucketben, útvonal: <munkatars_id>/<uuid>.<kiterjesztés>)
-- A fájlnév csak itt, az adatbázisban van: a signed URL-be nem kerül név.
create table public.dokumentumok (
  id            bigint generated always as identity primary key,
  munkatars_id  uuid not null references public.munkatarsak (id) on delete cascade,
  tipus         text not null check (tipus in ('oneletrajz', 'motivacios_level', 'egyeb')),
  storage_path  text not null unique,
  fajlnev       text not null,
  meret         integer not null check (meret > 0 and meret <= 10485760),
  mime          text not null check (mime in (
                  'application/pdf', 'application/msword',
                  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
                  'image/jpeg', 'image/png')),
  feltoltve     timestamptz not null default now(),
  feltoltotte   uuid default auth.uid(),
  check (storage_path like munkatars_id::text || '/%')
);
create index dokumentumok_mt_idx on public.dokumentumok (munkatars_id);

-- Napló (egyszerű audit, csak trigger írja)
create table public.naplo (
  id            bigint generated always as identity primary key,
  munkatars_id  uuid references public.munkatarsak (id) on delete cascade,
  ki            uuid references public.profiles (id) on delete set null,
  ki_nev        text,
  mikor         timestamptz not null default now(),
  tabla         text not null,
  muvelet       text not null check (muvelet in ('INSERT', 'UPDATE', 'DELETE')),
  rekord        text not null,
  valtozas      jsonb not null default '{}'::jsonb
);
create index naplo_mt_idx on public.naplo (munkatars_id, mikor desc);
create index naplo_rekord_idx on public.naplo (rekord, id desc);

-- -----------------------------------------------------------------------------
--  Jogosultság-segédfüggvények (security definer: az RLS-t nem futtatják körbe)
-- -----------------------------------------------------------------------------

create or replace function app.is_active() returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.profiles where id = auth.uid() and aktiv);
$$;

create or replace function app.is_admin() returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.profiles where id = auth.uid() and aktiv and szerep = 'admin');
$$;

-- Hozzáférhet-e a bejelentkezett felhasználó az adott munkatárshoz?
create or replace function app.can_access(mid uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1
    from public.munkatarsak m
    join public.profiles p on p.id = auth.uid() and p.aktiv
    where m.id = mid and (p.szerep = 'admin' or m.vezeto_id = p.id)
  );
$$;

-- Feltölthet-e fájlt: hozzáfér ÉS megvan az adatkezelési hozzájárulás.
create or replace function app.can_upload(mid uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select app.can_access(mid)
     and exists (select 1 from public.munkatarsak where id = mid and adatkezelesi_hozzajarulas);
$$;

-- Storage-útvonal első mappája → munkatárs-azonosító (hibás útvonalnál null).
create or replace function app.path_munkatars(p text) returns uuid
language plpgsql immutable set search_path = '' as $$
begin
  return split_part(p, '/', 1)::uuid;
exception when others then
  return null;
end;
$$;

-- -----------------------------------------------------------------------------
--  Triggerek
-- -----------------------------------------------------------------------------

-- Új Auth-felhasználó → profil (alapból vezeto). Az első admint kézzel kell
-- kinevezni (setup doksi), utána az admin a felületen kezeli a szerepeket.
create or replace function app.uj_felhasznalo() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles (id, email, nev)
  values (
    new.id,
    coalesce(new.email, ''),
    coalesce(nullif(btrim(new.raw_user_meta_data ->> 'nev'), ''), split_part(coalesce(new.email, ''), '@', 1))
  )
  on conflict (id) do nothing;
  return new;
end;
$$;
create trigger vp_uj_felhasznalo after insert on auth.users
  for each row execute function app.uj_felhasznalo();

-- Az utolsó aktív admint nem lehet letiltani vagy lefokozni (kizárná magát).
create or replace function app.profil_vedelem() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if old.szerep = 'admin' and old.aktiv and (new.szerep <> 'admin' or not new.aktiv)
     and not exists (select 1 from public.profiles where id <> old.id and szerep = 'admin' and aktiv) then
    raise exception 'Legalább egy aktív admin kell, ezt a fiókot nem lehet letiltani vagy lefokozni.';
  end if;
  new.id := old.id;   -- az azonosító nem változhat
  return new;
end;
$$;
create trigger vp_profil_vedelem before update on public.profiles
  for each row execute function app.profil_vedelem();

-- updated_at / updated_by: mindig a szerver tölti
create or replace function app.touch() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  new.updated_at := now();
  new.updated_by := auth.uid();
  return new;
end;
$$;
create trigger vp_touch before insert or update on public.bedolgozas_haladas for each row execute function app.touch();
create trigger vp_touch before insert or update on public.interju_valaszok   for each row execute function app.touch();
create trigger vp_touch before insert or update on public.interju_ertekeles  for each row execute function app.touch();

create or replace function app.beallitas_touch() returns trigger
language plpgsql set search_path = '' as $$
begin
  new.updated_at := now();
  return new;
end;
$$;
create trigger vp_touch before insert or update on public.beallitasok for each row execute function app.beallitas_touch();

-- Munkatárs: időbélyegek, státuszváltás ideje, hozzájárulás dátuma
create or replace function app.munkatars_elotte() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  new.updated_at := now();
  new.updated_by := auth.uid();
  if tg_op = 'INSERT' then
    new.created_at := now();
    new.statusz_valtozott := now();
  else
    new.created_at := old.created_at;
    if new.statusz is distinct from old.statusz then
      new.statusz_valtozott := now();
    else
      new.statusz_valtozott := old.statusz_valtozott;
    end if;
  end if;
  if new.adatkezelesi_hozzajarulas and new.adatkezelesi_hozzajarulas_datum is null then
    new.adatkezelesi_hozzajarulas_datum := current_date;
  end if;
  return new;
end;
$$;
create trigger vp_elotte before insert or update on public.munkatarsak
  for each row execute function app.munkatars_elotte();

-- Új munkatárs: az összes aktív bedolgozási pont üresen + kezdő karrierszint
create or replace function app.munkatars_letrejott() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  insert into public.bedolgozas_haladas (munkatars_id, sablon_id, megvolt)
  select new.id, s.id, false from public.bedolgozas_sablon s where s.aktiv
  on conflict do nothing;

  insert into public.karrierszint_tortenet (munkatars_id, szint, datum, megjegyzes)
  values (new.id, new.karrierszint, current_date, 'Kezdő szint (felvitelkor)');
  return null;
end;
$$;
create trigger vp_letrejott after insert on public.munkatarsak
  for each row execute function app.munkatars_letrejott();

-- Ki rögzítette / töltötte fel: mindig a bejelentkezett felhasználó (a kliens
-- által küldött érték felülíródik). Az oszlop nevét a trigger paramétere adja.
create or replace function app.rogzito() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  new := jsonb_populate_record(new, jsonb_build_object(tg_argv[0], auth.uid()));
  return new;
end;
$$;
create trigger vp_rogzito before insert on public.kompetencia_tesztek   for each row execute function app.rogzito('created_by');
create trigger vp_rogzito before insert on public.dokumentumok          for each row execute function app.rogzito('feltoltotte');
create trigger vp_rogzito before insert on public.karrierszint_tortenet for each row execute function app.rogzito('rogzitette');

create or replace function app.rogzito_nev() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  new.rogzitette_nev := (select nev from public.profiles where id = auth.uid());
  return new;
end;
$$;
create trigger vp_rogzito_nev before insert on public.karrierszint_tortenet for each row execute function app.rogzito_nev();

-- Szintlépés rögzítése → a munkatárs aktuális szintje is frissül
create or replace function app.szintlepes() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  -- csak akkor írja át, ha ez a legfrissebb bejegyzés
  if not exists (select 1 from public.karrierszint_tortenet
                  where munkatars_id = new.munkatars_id and id <> new.id
                    and (datum > new.datum or (datum = new.datum and id > new.id))) then
    update public.munkatarsak set karrierszint = new.szint
     where id = new.munkatars_id and karrierszint is distinct from new.szint;
  end if;
  return null;
end;
$$;
create trigger vp_szintlepes after insert on public.karrierszint_tortenet
  for each row execute function app.szintlepes();

-- Ha valaki közvetlenül írja át a karrierszintet (nem szintlépéssel),
-- az is bekerül az előzményekbe.
create or replace function app.szint_kozvetlen() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if pg_trigger_depth() = 1 and new.karrierszint is distinct from old.karrierszint then
    insert into public.karrierszint_tortenet (munkatars_id, szint, datum)
    values (new.id, new.karrierszint, current_date);
  end if;
  return null;
end;
$$;
create trigger vp_szint_kozvetlen after update of karrierszint on public.munkatarsak
  for each row execute function app.szint_kozvetlen();

-- Napló: ki, mikor, melyik munkatárson, mit módosított.
-- Ugyanaz a felhasználó ugyanazt a rekordot 10 percen belül → egy bejegyzés
-- (az automatikus mentés ne árassza el a naplót).
create or replace function app.naplozas() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  v_rec   jsonb;
  v_old   jsonb;
  v_diff  jsonb := '{}'::jsonb;
  v_mid   uuid;
  v_key   text;
  v_uid   uuid := auth.uid();
  v_nev   text;
  v_last  record;
  k       text;
begin
  v_rec := case when tg_op = 'DELETE' then to_jsonb(old) else to_jsonb(new) end;
  v_mid := case when tg_table_name = 'munkatarsak' then (v_rec ->> 'id')::uuid else (v_rec ->> 'munkatars_id')::uuid end;

  -- kaszkádtörlés közben a munkatárs már nincs meg: nincs mit naplózni
  if tg_op = 'DELETE' and tg_table_name <> 'munkatarsak'
     and not exists (select 1 from public.munkatarsak where id = v_mid) then
    return null;
  end if;

  v_key := tg_table_name || ':' || coalesce(
    v_rec ->> 'id',
    (v_rec ->> 'munkatars_id') || '/' || coalesce(v_rec ->> 'sablon_id', v_rec ->> 'kerdes_id', '-')
  );
  select nev into v_nev from public.profiles where id = v_uid;

  if tg_op = 'UPDATE' then
    v_old := to_jsonb(old);
    for k in select jsonb_object_keys(v_rec) loop
      continue when k in ('updated_at', 'updated_by', 'statusz_valtozott');
      if (v_rec -> k) is distinct from (v_old -> k) then
        v_diff := v_diff || jsonb_build_object(k, jsonb_build_array(v_old -> k, v_rec -> k));
      end if;
    end loop;
    if v_diff = '{}'::jsonb then
      return null;
    end if;

    select id, valtozas into v_last
      from public.naplo
     where rekord = v_key and ki is not distinct from v_uid and muvelet = 'UPDATE'
       and mikor > now() - interval '10 minutes'
     order by id desc limit 1;
    if found then
      update public.naplo
         set mikor = now(),
             valtozas = (v_last.valtozas - array(select jsonb_object_keys(v_diff)))
                        || (select jsonb_object_agg(d.key,
                                     case when v_last.valtozas ? d.key
                                          then jsonb_build_array(v_last.valtozas -> d.key -> 0, d.value -> 1)
                                          else d.value end)
                              from jsonb_each(v_diff) d)
       where id = v_last.id;
      return null;
    end if;
  elsif tg_op = 'INSERT' then
    v_diff := jsonb_strip_nulls(v_rec - 'updated_at' - 'updated_by' - 'created_at' - 'statusz_valtozott');
  end if;

  if tg_table_name = 'munkatarsak' and tg_op = 'DELETE' then
    -- a munkatárs naplója vele együtt törlődik; ez a sor (név nélkül) marad
    insert into public.naplo (munkatars_id, ki, ki_nev, tabla, muvelet, rekord, valtozas)
    values (null, v_uid, v_nev, tg_table_name, tg_op, v_key, jsonb_build_object('id', v_mid));
  else
    insert into public.naplo (munkatars_id, ki, ki_nev, tabla, muvelet, rekord, valtozas)
    values (v_mid, v_uid, v_nev, tg_table_name, tg_op, v_key, v_diff);
  end if;
  return null;
end;
$$;

create trigger vp_naplo after insert or update or delete on public.munkatarsak           for each row execute function app.naplozas();
create trigger vp_naplo after update                     on public.bedolgozas_haladas    for each row execute function app.naplozas();
create trigger vp_naplo after insert or update           on public.interju_valaszok      for each row execute function app.naplozas();
create trigger vp_naplo after insert or update           on public.interju_ertekeles     for each row execute function app.naplozas();
create trigger vp_naplo after insert or update or delete on public.kompetencia_tesztek   for each row execute function app.naplozas();
create trigger vp_naplo after insert or delete           on public.dokumentumok          for each row execute function app.naplozas();
create trigger vp_naplo after insert or delete           on public.karrierszint_tortenet for each row execute function app.naplozas();

-- -----------------------------------------------------------------------------
--  Áttekintő nézet (security_invoker: a hívó RLS-e érvényes rá)
-- -----------------------------------------------------------------------------

create view public.munkatars_attekintes with (security_invoker = true) as
select
  m.id,
  m.vezeto_id,
  p.nev                 as vezeto_nev,
  m.statusz,
  m.statusz_valtozott,
  m.nev,
  m.karrierszint,
  m.felvetel_datum,
  m.created_at,
  m.updated_at,
  coalesce(h.osszes, 0) as pont_osszes,
  coalesce(h.kesz, 0)   as pont_kesz,
  (select s.szakasz
     from public.bedolgozas_haladas h2
     join public.bedolgozas_sablon s on s.id = h2.sablon_id and s.aktiv
    where h2.munkatars_id = m.id and not h2.megvolt
    order by s.szakasz_sorrend, s.sorrend
    limit 1)            as aktualis_szakasz,
  greatest(m.updated_at, (select max(n.mikor) from public.naplo n where n.munkatars_id = m.id)) as utolso_aktivitas,
  (select string_agg(k.kod, ' ' order by k.id) from public.kompetencia_tesztek k where k.munkatars_id = m.id) as kodok
from public.munkatarsak m
left join public.profiles p on p.id = m.vezeto_id
left join lateral (
  select count(*) as osszes, count(*) filter (where hh.megvolt) as kesz
  from public.bedolgozas_haladas hh
  join public.bedolgozas_sablon s on s.id = hh.sablon_id and s.aktiv
  where hh.munkatars_id = m.id
) h on true;

-- -----------------------------------------------------------------------------
--  RPC: új sablonpont hozzáadása a meglévő munkatársakhoz (csak admin)
-- -----------------------------------------------------------------------------

create or replace function public.sablon_pont_meglevokhoz(p_sablon_id bigint) returns integer
language plpgsql security definer set search_path = '' as $$
declare
  n integer;
begin
  if not app.is_admin() then
    raise exception 'Csak admin teheti meg.' using errcode = '42501';
  end if;
  insert into public.bedolgozas_haladas (munkatars_id, sablon_id, megvolt)
  select m.id, p_sablon_id, false
    from public.munkatarsak m
   where m.statusz in ('jelolt', 'bedolgozas', 'aktiv')
  on conflict do nothing;
  get diagnostics n = row_count;
  return n;
end;
$$;

-- -----------------------------------------------------------------------------
--  Row Level Security
-- -----------------------------------------------------------------------------

alter table public.profiles              enable row level security;
alter table public.karrierszintek        enable row level security;
alter table public.beallitasok           enable row level security;
alter table public.munkatarsak           enable row level security;
alter table public.karrierszint_tortenet enable row level security;
alter table public.bedolgozas_sablon     enable row level security;
alter table public.bedolgozas_haladas    enable row level security;
alter table public.interju_kerdesek      enable row level security;
alter table public.interju_valaszok      enable row level security;
alter table public.interju_ertekeles     enable row level security;
alter table public.kompetencia_tesztek   enable row level security;
alter table public.dokumentumok          enable row level security;
alter table public.naplo                 enable row level security;

-- profiles: magát mindenki látja, a többieket csak az admin; írni csak az admin
create policy profiles_select on public.profiles for select to authenticated
  using (id = auth.uid() or app.is_admin());
create policy profiles_update on public.profiles for update to authenticated
  using (app.is_admin()) with check (app.is_admin());

-- sablonok, listák, beállítások: minden aktív felhasználó olvassa, admin írja
create policy sablon_select on public.bedolgozas_sablon for select to authenticated using (app.is_active());
create policy sablon_write  on public.bedolgozas_sablon for all    to authenticated using (app.is_admin()) with check (app.is_admin());
create policy kerdes_select on public.interju_kerdesek  for select to authenticated using (app.is_active());
create policy kerdes_write  on public.interju_kerdesek  for all    to authenticated using (app.is_admin()) with check (app.is_admin());
create policy szint_select  on public.karrierszintek    for select to authenticated using (app.is_active());
create policy szint_write   on public.karrierszintek    for all    to authenticated using (app.is_admin()) with check (app.is_admin());
create policy beall_select  on public.beallitasok       for select to authenticated using (app.is_active());
create policy beall_write   on public.beallitasok       for all    to authenticated using (app.is_admin()) with check (app.is_admin());

-- munkatarsak: vezető a sajátjait, admin mindet. Vezető nem rendelhet át.
create policy mt_select on public.munkatarsak for select to authenticated
  using (app.is_admin() or (vezeto_id = auth.uid() and app.is_active()));
create policy mt_insert on public.munkatarsak for insert to authenticated
  with check (app.is_admin() or (vezeto_id = auth.uid() and app.is_active()));
create policy mt_update on public.munkatarsak for update to authenticated
  using (app.is_admin() or (vezeto_id = auth.uid() and app.is_active()))
  with check (app.is_admin() or (vezeto_id = auth.uid() and app.is_active()));
create policy mt_delete on public.munkatarsak for delete to authenticated
  using (app.is_admin() or (vezeto_id = auth.uid() and app.is_active()));

-- a munkatárshoz kapcsolódó sorok: ugyanaz, mint a munkatársé
create policy halad_select on public.bedolgozas_haladas for select to authenticated using (app.can_access(munkatars_id));
create policy halad_insert on public.bedolgozas_haladas for insert to authenticated with check (app.can_access(munkatars_id));
create policy halad_update on public.bedolgozas_haladas for update to authenticated
  using (app.can_access(munkatars_id)) with check (app.can_access(munkatars_id));

create policy valasz_select on public.interju_valaszok for select to authenticated using (app.can_access(munkatars_id));
create policy valasz_insert on public.interju_valaszok for insert to authenticated with check (app.can_access(munkatars_id));
create policy valasz_update on public.interju_valaszok for update to authenticated
  using (app.can_access(munkatars_id)) with check (app.can_access(munkatars_id));

create policy ertek_select on public.interju_ertekeles for select to authenticated using (app.can_access(munkatars_id));
create policy ertek_insert on public.interju_ertekeles for insert to authenticated with check (app.can_access(munkatars_id));
create policy ertek_update on public.interju_ertekeles for update to authenticated
  using (app.can_access(munkatars_id)) with check (app.can_access(munkatars_id));

create policy komp_all on public.kompetencia_tesztek for all to authenticated
  using (app.can_access(munkatars_id)) with check (app.can_access(munkatars_id));

create policy kt_select on public.karrierszint_tortenet for select to authenticated using (app.can_access(munkatars_id));
create policy kt_insert on public.karrierszint_tortenet for insert to authenticated with check (app.can_access(munkatars_id));
create policy kt_delete on public.karrierszint_tortenet for delete to authenticated using (app.can_access(munkatars_id));

create policy dok_select on public.dokumentumok for select to authenticated using (app.can_access(munkatars_id));
create policy dok_insert on public.dokumentumok for insert to authenticated
  with check (app.can_upload(munkatars_id) and app.path_munkatars(storage_path) = munkatars_id);
create policy dok_delete on public.dokumentumok for delete to authenticated using (app.can_access(munkatars_id));

-- napló: csak olvasható (a trigger írja); a törölt munkatársak sorát csak az admin látja
create policy naplo_select on public.naplo for select to authenticated
  using (app.is_admin() or (munkatars_id is not null and app.can_access(munkatars_id)));

-- -----------------------------------------------------------------------------
--  Jogok: az anon semmit, az authenticated csak RLS-en keresztül
-- -----------------------------------------------------------------------------

revoke all on table
  public.profiles, public.karrierszintek, public.beallitasok, public.munkatarsak,
  public.karrierszint_tortenet, public.bedolgozas_sablon, public.bedolgozas_haladas,
  public.interju_kerdesek, public.interju_valaszok, public.interju_ertekeles,
  public.kompetencia_tesztek, public.dokumentumok, public.naplo, public.munkatars_attekintes
from anon, public;

grant select, insert, update, delete on table
  public.karrierszintek, public.beallitasok, public.munkatarsak,
  public.karrierszint_tortenet, public.bedolgozas_sablon, public.bedolgozas_haladas,
  public.interju_kerdesek, public.interju_valaszok, public.interju_ertekeles,
  public.kompetencia_tesztek, public.dokumentumok
to authenticated;
grant select, update on table public.profiles to authenticated;
grant select on table public.naplo, public.munkatars_attekintes to authenticated;
grant usage, select on all sequences in schema public to authenticated;

revoke all on all functions in schema app from public;
grant execute on all functions in schema app to authenticated;
revoke all on function public.sablon_pont_meglevokhoz(bigint) from public, anon;
grant execute on function public.sablon_pont_meglevokhoz(bigint) to authenticated;

-- Az Auth szolgáltatás a saját szerepkörével szúr be az auth.users-be;
-- a trigger-függvényhez kell neki a séma és a futtatási jog.
do $$
begin
  if exists (select 1 from pg_roles where rolname = 'supabase_auth_admin') then
    grant usage on schema app to supabase_auth_admin;
    grant execute on function app.uj_felhasznalo() to supabase_auth_admin;
  end if;
end;
$$;

-- -----------------------------------------------------------------------------
--  Storage: privát „cv” bucket, legfeljebb 10 MB, csak PDF/DOC/DOCX/JPG/PNG
-- -----------------------------------------------------------------------------

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('cv', 'cv', false, 10485760, array[
  'application/pdf', 'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'image/jpeg', 'image/png'])
on conflict (id) do update
  set public = false,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

-- Ugyanaz a szabály, mint a táblákon: a fájl útvonalának első mappája a
-- munkatárs azonosítója, ahhoz kell hozzáférés. Feltöltéshez hozzájárulás is.
-- Felülírás (update) nincs: új fájl = új útvonal.
create policy vp_cv_select on storage.objects for select to authenticated
  using (bucket_id = 'cv' and app.can_access(app.path_munkatars(name)));
create policy vp_cv_insert on storage.objects for insert to authenticated
  with check (bucket_id = 'cv' and app.can_upload(app.path_munkatars(name)));
create policy vp_cv_delete on storage.objects for delete to authenticated
  using (bucket_id = 'cv' and app.can_access(app.path_munkatars(name)));
