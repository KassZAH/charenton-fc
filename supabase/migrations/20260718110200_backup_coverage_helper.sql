-- Roadmap V3, Lot 6 — fonction de support pour le test de couverture
-- (BACKUP_TABLES vs schéma réel). information_schema n'est pas exposé par
-- PostgREST pour une requête directe depuis le client JS ; ce pont
-- SECURITY DEFINER dans `public` le rend accessible via le chemin serveur
-- normal. Mêmes révocations que les autres fonctions d'export du Lot 6.

create or replace function public.list_public_base_tables()
returns text[]
language sql
security definer
set search_path = public
as $$
  select coalesce(array_agg(table_name order by table_name), '{}'::text[])
  from information_schema.tables
  where table_schema = 'public' and table_type = 'BASE TABLE';
$$;

revoke execute on function public.list_public_base_tables() from public;
revoke execute on function public.list_public_base_tables() from anon;
revoke execute on function public.list_public_base_tables() from authenticated;
