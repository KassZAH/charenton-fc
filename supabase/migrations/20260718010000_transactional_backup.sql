-- Audit du 2026-07-18, item #7 — les sauvegardes lisaient les tables une par
-- une depuis le client JS (25 requêtes séparées) : une écriture pendant
-- l'export pouvait mélanger des instants différents dans un même snapshot.
-- Cette fonction lit toutes les tables en un seul appel RPC — donc une seule
-- requête de haut niveau côté Postgres, qui partage un instant cohérent pour
-- toutes les sous-requêtes internes (comportement standard de PL/pgSQL sous
-- READ COMMITTED : impossible de forcer explicitement REPEATABLE READ ici,
-- SET TRANSACTION ISOLATION LEVEL devant être le tout premier ordre de la
-- transaction, ce qu'un appel RPC ne permet pas).

create or replace function public.export_backup_snapshot()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  result jsonb := '{}'::jsonb;
begin
  result := jsonb_set(result, '{players}', coalesce((select jsonb_agg(t) from public.players t), '[]'::jsonb));
  result := jsonb_set(result, '{opponents}', coalesce((select jsonb_agg(t) from public.opponents t), '[]'::jsonb));
  result := jsonb_set(result, '{seasons}', coalesce((select jsonb_agg(t) from public.seasons t), '[]'::jsonb));
  result := jsonb_set(result, '{team_settings}', coalesce((select jsonb_agg(t) from public.team_settings t), '[]'::jsonb));
  result := jsonb_set(result, '{matches}', coalesce((select jsonb_agg(t) from public.matches t), '[]'::jsonb));
  result := jsonb_set(result, '{match_players}', coalesce((select jsonb_agg(t) from public.match_players t), '[]'::jsonb));
  result := jsonb_set(result, '{match_lineups}', coalesce((select jsonb_agg(t) from public.match_lineups t), '[]'::jsonb));
  result := jsonb_set(result, '{match_equipment_items}', coalesce((select jsonb_agg(t) from public.match_equipment_items t), '[]'::jsonb));
  result := jsonb_set(result, '{goals}', coalesce((select jsonb_agg(t) from public.goals t), '[]'::jsonb));
  result := jsonb_set(result, '{cards}', coalesce((select jsonb_agg(t) from public.cards t), '[]'::jsonb));
  result := jsonb_set(result, '{awards}', coalesce((select jsonb_agg(t) from public.awards t), '[]'::jsonb));
  result := jsonb_set(result, '{votes}', coalesce((select jsonb_agg(t) from public.votes t), '[]'::jsonb));
  result := jsonb_set(result, '{match_awards}', coalesce((select jsonb_agg(t) from public.match_awards t), '[]'::jsonb));
  result := jsonb_set(result, '{availability}', coalesce((select jsonb_agg(t) from public.availability t), '[]'::jsonb));
  result := jsonb_set(result, '{injuries}', coalesce((select jsonb_agg(t) from public.injuries t), '[]'::jsonb));
  result := jsonb_set(result, '{dues}', coalesce((select jsonb_agg(t) from public.dues t), '[]'::jsonb));
  result := jsonb_set(result, '{player_measurements}', coalesce((select jsonb_agg(t) from public.player_measurements t), '[]'::jsonb));
  result := jsonb_set(result, '{player_badges}', coalesce((select jsonb_agg(t) from public.player_badges t), '[]'::jsonb));
  result := jsonb_set(result, '{reinforcement_calls}', coalesce((select jsonb_agg(t) from public.reinforcement_calls t), '[]'::jsonb));
  result := jsonb_set(result, '{hall_of_fame_entries}', coalesce((select jsonb_agg(t) from public.hall_of_fame_entries t), '[]'::jsonb));
  result := jsonb_set(result, '{club_quotes}', coalesce((select jsonb_agg(t) from public.club_quotes t), '[]'::jsonb));
  result := jsonb_set(result, '{jersey_history_entries}', coalesce((select jsonb_agg(t) from public.jersey_history_entries t), '[]'::jsonb));
  result := jsonb_set(result, '{monthly_mvp_votes}', coalesce((select jsonb_agg(t) from public.monthly_mvp_votes t), '[]'::jsonb));
  result := jsonb_set(result, '{season_trophies}', coalesce((select jsonb_agg(t) from public.season_trophies t), '[]'::jsonb));
  result := jsonb_set(result, '{player_goals}', coalesce((select jsonb_agg(t) from public.player_goals t), '[]'::jsonb));

  return result;
end;
$$;
