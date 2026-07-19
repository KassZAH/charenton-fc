-- Roadmap V3, Lot 13 — désignation réelle du/des gardien(s) par match.
--
-- ⚠️ Macro-release A (protocole macro-releases) : appliquée uniquement au
-- projet Supabase isolé tant que la macro-release n'est pas validée en
-- production.
--
-- match_players.goalkeeper existe depuis la toute première migration mais
-- n'était alimenté par aucune interface (confirmé par grep exhaustif avant
-- ce lot). Remplace intégralement, en un seul UPDATE atomique, la
-- désignation des gardiens pour un match donné — jamais deux requêtes
-- séparées qui pourraient laisser un état transitoire incohérent. Refuse
-- explicitement tout joueur qui n'est pas déjà sur la feuille de match
-- (jamais un gardien "non convoqué").

create or replace function public.set_match_goalkeepers(p_match_id uuid, p_goalkeeper_player_ids uuid[])
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_goalkeeper_player_ids is not null and array_length(p_goalkeeper_player_ids, 1) > 0 then
    if exists (
      select 1
      from unnest(p_goalkeeper_player_ids) as pid
      where not exists (
        select 1 from public.match_players where match_id = p_match_id and player_id = pid
      )
    ) then
      raise exception 'Un gardien désigné doit déjà être sur la feuille de match.';
    end if;
  end if;

  update public.match_players
  set goalkeeper = (
    p_goalkeeper_player_ids is not null and player_id = any(p_goalkeeper_player_ids)
  )
  where match_id = p_match_id;
end;
$$;

revoke execute on function public.set_match_goalkeepers(uuid, uuid[]) from public;
revoke execute on function public.set_match_goalkeepers(uuid, uuid[]) from anon;
revoke execute on function public.set_match_goalkeepers(uuid, uuid[]) from authenticated;
