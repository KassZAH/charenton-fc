-- Audit du 2026-07-18, item #12 — confirmMatchRoster() supprimait toute la
-- feuille de match puis la réinsérait en deux requêtes séparées : un échec
-- entre les deux pouvait laisser un match sans aucun joueur enregistré.
-- Cette fonction fait les deux opérations dans un seul appel RPC — un corps
-- de fonction PL/pgSQL est intrinsèquement atomique (toute exception annule
-- l'ensemble de ses effets), donc soit la feuille est entièrement remplacée,
-- soit rien ne change.

create or replace function public.confirm_match_roster(p_match_id uuid, p_player_ids uuid[])
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  delete from public.match_players where match_id = p_match_id;

  if array_length(p_player_ids, 1) > 0 then
    insert into public.match_players (match_id, player_id, was_present)
    select p_match_id, pid, true
    from unnest(p_player_ids) as pid;
  end if;
end;
$$;
