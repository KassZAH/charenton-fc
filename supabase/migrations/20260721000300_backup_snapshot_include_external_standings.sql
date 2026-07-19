-- Roadmap V3, Lot 11.5 — correctif de couverture des sauvegardes, découvert
-- par le test d'intégrité du Lot 6 (backup-coverage.test.ts) lors de la
-- vérification pré-déploiement production : les trois tables créées par ce
-- lot (external_competitions, external_standings, opponent_external_mappings)
-- n'étaient présentes ni dans BACKUP_TABLES ni dans BACKUP_EXCLUDED_TABLES,
-- donc absentes du registre — un vrai backup créé avant ce correctif aurait
-- silencieusement omis ces données. opponent_external_mappings en particulier
-- représente des décisions réelles du Propriétaire (confirmations/désactivations
-- manuelles) non reconstructibles automatiquement, d'où le choix de les
-- sauvegarder plutôt que de les exclure.
--
-- Recrée export_backup_snapshot() à l'identique (même garantie de cohérence,
-- même tri stable par clé primaire, mêmes révocations) en ajoutant
-- uniquement les trois nouvelles tables.

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
    'player_goals', coalesce((select jsonb_agg(to_jsonb(t) order by t.id) from public.player_goals t), '[]'::jsonb),
    'external_competitions', coalesce((select jsonb_agg(to_jsonb(t) order by t.id) from public.external_competitions t), '[]'::jsonb),
    'external_standings', coalesce((select jsonb_agg(to_jsonb(t) order by t.id) from public.external_standings t), '[]'::jsonb),
    'opponent_external_mappings', coalesce((select jsonb_agg(to_jsonb(t) order by t.id) from public.opponent_external_mappings t), '[]'::jsonb)
  );
$$;

revoke execute on function public.export_backup_snapshot() from public;
revoke execute on function public.export_backup_snapshot() from anon;
revoke execute on function public.export_backup_snapshot() from authenticated;
