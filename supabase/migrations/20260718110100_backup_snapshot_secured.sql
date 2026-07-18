-- Roadmap V3, Lot 6 — Backups versionnés et rétention (fonctions sécurisées).
--
-- 1) export_backup_snapshot() reconstruite en UNE SEULE instruction SQL
--    (langage `sql`, pas `plpgsql` avec 25 affectations séquentielles).
--    Sous READ COMMITTED, l'unité de snapshot est la *commande*, pas la
--    ligne : toutes les sous-requêtes imbriquées dans une seule commande de
--    plus haut niveau s'exécutent contre le snapshot établi au tout début
--    de cette commande unique — garantie du modèle d'exécution PostgreSQL,
--    pas une astuce. L'ancienne version (25 commandes `result := jsonb_set(
--    result, ..., (select ...))`) n'offrait PAS cette garantie : chaque
--    affectation étant sa propre commande, une écriture concurrente validée
--    entre deux d'entre elles pouvait être visible dans les tables lues
--    après elle mais pas dans celles lues avant. Vérifié par un protocole à
--    deux sessions concurrentes (voir compte rendu du lot), pas seulement
--    affirmé.
--
-- 2) Chaque jsonb_agg trie explicitement par la clé primaire de la table
--    (toutes les tables sauvegardées n'ont qu'une clé primaire simple `id`,
--    vérifié table par table dans les migrations d'origine — aucune clé
--    composite, aucune table sans clé primaire) : deux exports sans
--    changement de données produisent donc le même JSON, la même chaîne
--    canonique, le même checksum.
--
-- 3) EXECUTE révoqué à public/anon/authenticated : seul le chemin serveur
--    (service_role) peut appeler ces fonctions, y compris pour l'export
--    audit_log (mêmes protections que le snapshot principal).

create or replace function public.export_backup_snapshot()
returns jsonb
language sql
security definer
set search_path = public
as $$
  select jsonb_build_object(
    'players', coalesce((select jsonb_agg(to_jsonb(t) order by t.id) from public.players t), '[]'::jsonb),
    'opponents', coalesce((select jsonb_agg(to_jsonb(t) order by t.id) from public.opponents t), '[]'::jsonb),
    'seasons', coalesce((select jsonb_agg(to_jsonb(t) order by t.id) from public.seasons t), '[]'::jsonb),
    'team_settings', coalesce((select jsonb_agg(to_jsonb(t) order by t.id) from public.team_settings t), '[]'::jsonb),
    'matches', coalesce((select jsonb_agg(to_jsonb(t) order by t.id) from public.matches t), '[]'::jsonb),
    'match_players', coalesce((select jsonb_agg(to_jsonb(t) order by t.id) from public.match_players t), '[]'::jsonb),
    'match_lineups', coalesce((select jsonb_agg(to_jsonb(t) order by t.id) from public.match_lineups t), '[]'::jsonb),
    'match_equipment_items', coalesce((select jsonb_agg(to_jsonb(t) order by t.id) from public.match_equipment_items t), '[]'::jsonb),
    'goals', coalesce((select jsonb_agg(to_jsonb(t) order by t.id) from public.goals t), '[]'::jsonb),
    'cards', coalesce((select jsonb_agg(to_jsonb(t) order by t.id) from public.cards t), '[]'::jsonb),
    'awards', coalesce((select jsonb_agg(to_jsonb(t) order by t.id) from public.awards t), '[]'::jsonb),
    'votes', coalesce((select jsonb_agg(to_jsonb(t) order by t.id) from public.votes t), '[]'::jsonb),
    'match_awards', coalesce((select jsonb_agg(to_jsonb(t) order by t.id) from public.match_awards t), '[]'::jsonb),
    'availability', coalesce((select jsonb_agg(to_jsonb(t) order by t.id) from public.availability t), '[]'::jsonb),
    'injuries', coalesce((select jsonb_agg(to_jsonb(t) order by t.id) from public.injuries t), '[]'::jsonb),
    'dues', coalesce((select jsonb_agg(to_jsonb(t) order by t.id) from public.dues t), '[]'::jsonb),
    'player_measurements', coalesce((select jsonb_agg(to_jsonb(t) order by t.id) from public.player_measurements t), '[]'::jsonb),
    'player_badges', coalesce((select jsonb_agg(to_jsonb(t) order by t.id) from public.player_badges t), '[]'::jsonb),
    'reinforcement_calls', coalesce((select jsonb_agg(to_jsonb(t) order by t.id) from public.reinforcement_calls t), '[]'::jsonb),
    'hall_of_fame_entries', coalesce((select jsonb_agg(to_jsonb(t) order by t.id) from public.hall_of_fame_entries t), '[]'::jsonb),
    'club_quotes', coalesce((select jsonb_agg(to_jsonb(t) order by t.id) from public.club_quotes t), '[]'::jsonb),
    'jersey_history_entries', coalesce((select jsonb_agg(to_jsonb(t) order by t.id) from public.jersey_history_entries t), '[]'::jsonb),
    'monthly_mvp_votes', coalesce((select jsonb_agg(to_jsonb(t) order by t.id) from public.monthly_mvp_votes t), '[]'::jsonb),
    'season_trophies', coalesce((select jsonb_agg(to_jsonb(t) order by t.id) from public.season_trophies t), '[]'::jsonb),
    'player_goals', coalesce((select jsonb_agg(to_jsonb(t) order by t.id) from public.player_goals t), '[]'::jsonb)
  );
$$;

revoke execute on function public.export_backup_snapshot() from public;
revoke execute on function public.export_backup_snapshot() from anon;
revoke execute on function public.export_backup_snapshot() from authenticated;

-- Export audit_log : même garantie de cohérence (instruction unique, tri
-- stable) et mêmes révocations. Cutoff explicite (audit_log.created_at <=
-- p_cutoff) plutôt qu'une transaction combinée avec l'insertion du backup —
-- voir backups-actions.ts pour la compensation si l'artefact échoue sur un
-- backup sensible.
create or replace function public.export_audit_log_snapshot(p_cutoff timestamptz)
returns jsonb
language sql
security definer
set search_path = public
as $$
  select coalesce(
    (select jsonb_agg(to_jsonb(t) order by t.created_at, t.id) from public.audit_log t where t.created_at <= p_cutoff),
    '[]'::jsonb
  );
$$;

revoke execute on function public.export_audit_log_snapshot(timestamptz) from public;
revoke execute on function public.export_audit_log_snapshot(timestamptz) from anon;
revoke execute on function public.export_audit_log_snapshot(timestamptz) from authenticated;

-- Version réelle du schéma appliqué (pas seulement le dernier fichier de
-- migration connu du dépôt) : lit supabase_migrations.schema_migrations,
-- un schéma non exposé par PostgREST — ce pont SECURITY DEFINER dans
-- `public` le rend accessible via le chemin serveur normal
-- (supabaseAdmin.rpc(...)), vérifié fonctionnel avant d'écrire cette
-- migration. Mêmes révocations que les fonctions d'export.
create or replace function public.get_latest_applied_migration()
returns text
language sql
security definer
set search_path = public, supabase_migrations
as $$
  select version from supabase_migrations.schema_migrations order by version desc limit 1;
$$;

revoke execute on function public.get_latest_applied_migration() from public;
revoke execute on function public.get_latest_applied_migration() from anon;
revoke execute on function public.get_latest_applied_migration() from authenticated;
