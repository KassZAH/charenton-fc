-- Roadmap V3, Macro-release B (Lot 23) — enregistrer carpool_assignments dans
-- export_backup_snapshot(), même geste que pour venues/match_templates (Lot 22).
--
-- ⚠️ Appliquée uniquement au projet Supabase isolé tant que la macro-release n'est pas validée
-- en production.

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
    'opponent_external_mappings', coalesce((select jsonb_agg(to_jsonb(t) order by t.id) from public.opponent_external_mappings t), '[]'::jsonb),
    'match_squad_entries', coalesce((select jsonb_agg(to_jsonb(t) order by t.id) from public.match_squad_entries t), '[]'::jsonb),
    'player_restrictions', coalesce((select jsonb_agg(to_jsonb(t) order by t.id) from public.player_restrictions t), '[]'::jsonb),
    'venues', coalesce((select jsonb_agg(to_jsonb(t) order by t.id) from public.venues t), '[]'::jsonb),
    'match_templates', coalesce((select jsonb_agg(to_jsonb(t) order by t.id) from public.match_templates t), '[]'::jsonb),
    'carpool_assignments', coalesce((select jsonb_agg(to_jsonb(t) order by t.id) from public.carpool_assignments t), '[]'::jsonb)
  );
$$;

revoke execute on function public.export_backup_snapshot() from public;
revoke execute on function public.export_backup_snapshot() from anon;
revoke execute on function public.export_backup_snapshot() from authenticated;
