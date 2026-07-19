-- Roadmap V3, Lot 17 — correctif découvert en testant set_match_squad avant
-- même d'écrire le code applicatif :
--
-- 1) `pid = p_planned_goalkeeper_player_id` vaut NULL (pas false) en SQL
--    quand p_planned_goalkeeper_player_id est NULL (comparaison à NULL),
--    ce qui violait le NOT NULL de is_planned_goalkeeper dès qu'aucun
--    gardien prévu n'était renseigné — le cas le plus courant. Corrigé par
--    coalesce(..., false).
-- 2) Si le même joueur apparaît à la fois dans p_called_up_player_ids et
--    p_waitlist_player_ids (erreur de saisie possible côté UI), l'insertion
--    liste d'attente violait la contrainte unique (match_id, player_id).
--    Corrigé : la liste d'attente exclut désormais explicitement quiconque
--    est déjà convoqué — convoqué prime toujours sur liste d'attente,
--    jamais un échec pour une saisie ambiguë.

create or replace function public.set_match_squad(
  p_match_id uuid,
  p_called_up_player_ids uuid[],
  p_waitlist_player_ids uuid[],
  p_planned_goalkeeper_player_id uuid,
  p_publish boolean,
  p_changed_by_player_id uuid,
  p_changed_by_name text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_locked_at timestamptz;
begin
  select squad_locked_at into v_locked_at from public.matches where id = p_match_id for update;
  if v_locked_at is not null then
    raise exception 'Le groupe convoqué est verrouillé — déverrouille-le avant de le modifier.';
  end if;

  if p_planned_goalkeeper_player_id is not null
     and not (p_planned_goalkeeper_player_id = any(coalesce(p_called_up_player_ids, array[]::uuid[]))) then
    raise exception 'Le gardien prévu doit faire partie des joueurs convoqués.';
  end if;

  delete from public.match_squad_entries where match_id = p_match_id;

  insert into public.match_squad_entries (match_id, player_id, squad_status, is_planned_goalkeeper)
  select p_match_id, pid, 'called_up', coalesce(pid = p_planned_goalkeeper_player_id, false)
  from unnest(coalesce(p_called_up_player_ids, array[]::uuid[])) as pid;

  -- Convoqué prime toujours sur liste d'attente : jamais d'échec pour une saisie ambiguë.
  insert into public.match_squad_entries (match_id, player_id, squad_status, is_planned_goalkeeper)
  select p_match_id, pid, 'waitlist', false
  from unnest(coalesce(p_waitlist_player_ids, array[]::uuid[])) as pid
  where pid <> all(coalesce(p_called_up_player_ids, array[]::uuid[]));

  update public.matches
    set squad_published_at = case when p_publish then now() else squad_published_at end,
        squad_locked_at = case when p_publish then now() else squad_locked_at end
    where id = p_match_id;

  insert into public.audit_log (table_name, record_id, action, old_data, new_data, changed_by_player_id, changed_by_name)
  values (
    'matches', p_match_id, 'update', null,
    jsonb_build_object(
      'squad_action', case when p_publish then 'published' else 'draft_saved' end,
      'called_up_count', coalesce(array_length(p_called_up_player_ids, 1), 0),
      'waitlist_count', coalesce(array_length(p_waitlist_player_ids, 1), 0)
    ),
    p_changed_by_player_id, p_changed_by_name
  );
end;
$$;

revoke execute on function public.set_match_squad(uuid, uuid[], uuid[], uuid, boolean, uuid, text) from public;
revoke execute on function public.set_match_squad(uuid, uuid[], uuid[], uuid, boolean, uuid, text) from anon;
revoke execute on function public.set_match_squad(uuid, uuid[], uuid[], uuid, boolean, uuid, text) from authenticated;
