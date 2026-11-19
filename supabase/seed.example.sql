-- =============================================================================
--  VEZETŐI PORTÁL — KAMU ADATOS minta seed (nyilvános).
--  Az éles tartalom (53 bedolgozási pont, 18 interjúkérdés, gyorslinkek) a
--  gitignore-olt private/vezetoi-seed.sql-ben van. Ez csak a formát mutatja.
-- =============================================================================

insert into public.bedolgozas_sablon (szakasz, szakasz_sorrend, sorrend, pont) values
  ('Felvételi', 1, 1, 'Példa pont 1'),
  ('Felvételi', 1, 2, 'Példa pont 2'),
  ('SZB 1',     2, 1, 'Példa pont 3');

insert into public.interju_kerdesek (kategoria, kerdes, sorrend) values
  ('Bemutatkozás', 'Példa kérdés?', 1);

insert into public.karrierszintek (nev, sorrend) values ('Jelölt', 1), ('Kezdő munkatárs', 2)
  on conflict (nev) do nothing;

insert into public.beallitasok (kulcs, ertek) values
  ('megorzes_honap', '6'::jsonb),
  ('kompetenciateszt_url', '"TODO"'::jsonb),
  ('gyorslinkek', '[{"label": "Példa", "url": "https://example.com/"}]'::jsonb),
  ('adatkezelesi_tajekoztato', '"TODO: Ricsi/OVB jóváhagyás – minta szöveg."'::jsonb)
on conflict (kulcs) do nothing;
