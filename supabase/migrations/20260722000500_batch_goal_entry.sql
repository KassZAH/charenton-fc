-- Roadmap V3, Lot 18 — saisie groupée des buts pour un match non suivi en
-- live (résultat express détaillé en une fois).
--
-- ⚠️ Macro-release A : appliquée uniquement au projet Supabase isolé tant
-- que la macro-release n'est pas validée en production.
--
-- goals.batch_id identifie les lignes créées ensemble par une même saisie
-- groupée (NULL pour toute ligne ajoutée individuellement via addGoal) —
-- permet d'annuler le lot complet en une seule opération, jamais un
-- adversaire (opponent_score) qui n'a pas besoin de lignes détaillées : seul
-- le nombre est stocké, comme pour le résultat express existant.

alter table public.goals add column batch_id uuid;
create index goals_batch_id_idx on public.goals(batch_id) where batch_id is not null;

create or replace function public.insert_goals_batch(
  p_match_id uuid,
  p_idempotency_key uuid,
  p_scorer_entries jsonb,        -- [{player_id: uuid|null, is_unknown_scorer: boolean, count: integer}]
  p_csc_adverse_count integer,   -- CSC adverse (favorable à Charenton), aucun joueur crédité
  p_csc_charenton_entries jsonb, -- [{player_id: uuid|null, count: integer}]
  p_assist_entries jsonb,        -- [{player_id: uuid, count: integer}]
  p_opponent_score integer,
  p_changed_by_player_id uuid,
  p_changed_by_name text
)
returns table (batch_id uuid, inserted_count integer, team_score integer)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_existing_batch_id uuid;
  v_batch_id uuid;
  v_status text;
  v_inserted_count integer := 0;
  v_team_score integer;
  v_entry jsonb;
  v_i integer;
  v_goal_id uuid;
  v_assist_target_ids uuid[];
begin
  select id into v_existing_batch_id from public.goals where match_id = p_match_id and idempotency_key = p_idempotency_key limit 1;
  if v_existing_batch_id is not null then
    -- Double soumission (double-clic) : succès silencieux, jamais une deuxième insertion.
    select g.batch_id into v_batch_id from public.goals g where g.id = v_existing_batch_id;
    select count(*) into v_inserted_count from public.goals where batch_id = v_batch_id and deleted_at is null;
    select team_score into v_team_score from public.matches where id = p_match_id;
    return query select v_batch_id, v_inserted_count, v_team_score;
    return;
  end if;

  select status into v_status from public.matches where id = p_match_id for update;
  if v_status is null then
    raise exception 'Match introuvable.';
  end if;
  if v_status not in ('scheduled', 'draft', 'postponed') then
    raise exception 'La saisie groupée n''est disponible que pour un match pas encore terminé ni suivi en direct (statut actuel : %).', v_status;
  end if;

  v_batch_id := gen_random_uuid();

  -- Buteurs classiques (crédité Charenton).
  for v_entry in select * from jsonb_array_elements(coalesce(p_scorer_entries, '[]'::jsonb))
  loop
    for v_i in 1..greatest((v_entry->>'count')::integer, 0)
    loop
      insert into public.goals (match_id, scorer_player_id, is_unknown_scorer, goal_type, credited_to, batch_id, idempotency_key)
      values (
        p_match_id,
        nullif(v_entry->>'player_id', ''),
        coalesce((v_entry->>'is_unknown_scorer')::boolean, false),
        'classique', 'charenton', v_batch_id,
        case when v_inserted_count = 0 then p_idempotency_key else null end
      );
      v_inserted_count := v_inserted_count + 1;
    end loop;
  end loop;

  -- CSC adverse (favorable à Charenton, aucun joueur crédité).
  for v_i in 1..greatest(coalesce(p_csc_adverse_count, 0), 0)
  loop
    insert into public.goals (match_id, scorer_player_id, is_unknown_scorer, goal_type, credited_to, batch_id, idempotency_key)
    values (p_match_id, null, false, 'csc', 'charenton', v_batch_id, case when v_inserted_count = 0 then p_idempotency_key else null end);
    v_inserted_count := v_inserted_count + 1;
  end loop;

  -- CSC Charenton (favorable à l'adversaire, joueur concerné éventuellement identifié).
  for v_entry in select * from jsonb_array_elements(coalesce(p_csc_charenton_entries, '[]'::jsonb))
  loop
    for v_i in 1..greatest((v_entry->>'count')::integer, 0)
    loop
      insert into public.goals (match_id, scorer_player_id, is_unknown_scorer, goal_type, credited_to, batch_id, idempotency_key)
      values (p_match_id, nullif(v_entry->>'player_id', ''), false, 'csc', 'opponent', v_batch_id, case when v_inserted_count = 0 then p_idempotency_key else null end);
      v_inserted_count := v_inserted_count + 1;
    end loop;
  end loop;

  if v_inserted_count = 0 then
    raise exception 'Aucun but à enregistrer.';
  end if;

  -- Passes facultatives : comptage par joueur, attribuées à des buts crédités Charenton de ce lot
  -- (l'ordre exact n'a pas d'incidence — seules les statistiques agrégées en dépendent).
  select array_agg(id) into v_assist_target_ids
    from public.goals where batch_id = v_batch_id and credited_to = 'charenton';

  for v_entry in select * from jsonb_array_elements(coalesce(p_assist_entries, '[]'::jsonb))
  loop
    for v_i in 1..greatest((v_entry->>'count')::integer, 0)
    loop
      if array_length(v_assist_target_ids, 1) is null or array_length(v_assist_target_ids, 1) = 0 then
        exit;
      end if;
      v_goal_id := v_assist_target_ids[1];
      v_assist_target_ids := v_assist_target_ids[2:];
      update public.goals set assist_player_id = nullif(v_entry->>'player_id', '') where id = v_goal_id;
    end loop;
  end loop;

  select count(*) into v_team_score from public.goals where match_id = p_match_id and credited_to = 'charenton' and deleted_at is null;

  update public.matches
    set status = 'completed', team_score = v_team_score, opponent_score = p_opponent_score,
        completion_status = 'incomplete', ended_at = coalesce(ended_at, now())
    where id = p_match_id;

  insert into public.audit_log (table_name, record_id, action, old_data, new_data, changed_by_player_id, changed_by_name)
  values (
    'matches', p_match_id, 'update', null,
    jsonb_build_object('batch_goal_entry', true, 'batch_id', v_batch_id, 'inserted_count', v_inserted_count, 'team_score', v_team_score, 'opponent_score', p_opponent_score),
    p_changed_by_player_id, p_changed_by_name
  );

  return query select v_batch_id, v_inserted_count, v_team_score;
end;
$$;

revoke execute on function public.insert_goals_batch(uuid, uuid, jsonb, integer, jsonb, jsonb, integer, uuid, text) from public;
revoke execute on function public.insert_goals_batch(uuid, uuid, jsonb, integer, jsonb, jsonb, integer, uuid, text) from anon;
revoke execute on function public.insert_goals_batch(uuid, uuid, jsonb, integer, jsonb, jsonb, integer, uuid, text) from authenticated;

-- Annule le lot complet : soft-delete de toutes les lignes du batch, restaure team_score, remet le
-- match à 'scheduled' (jamais 'completed' avec un score orphelin d'aucun but détaillé).
create or replace function public.cancel_goals_batch(
  p_match_id uuid,
  p_batch_id uuid,
  p_changed_by_player_id uuid,
  p_changed_by_name text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_team_score integer;
begin
  update public.goals set deleted_at = now() where match_id = p_match_id and batch_id = p_batch_id and deleted_at is null;

  select count(*) into v_team_score from public.goals where match_id = p_match_id and credited_to = 'charenton' and deleted_at is null;

  update public.matches
    set status = 'scheduled', team_score = null, opponent_score = null, completion_status = 'not_started'
    where id = p_match_id;

  insert into public.audit_log (table_name, record_id, action, old_data, new_data, changed_by_player_id, changed_by_name)
  values ('matches', p_match_id, 'update', null, jsonb_build_object('batch_goal_entry_cancelled', true, 'batch_id', p_batch_id), p_changed_by_player_id, p_changed_by_name);
end;
$$;

revoke execute on function public.cancel_goals_batch(uuid, uuid, uuid, text) from public;
revoke execute on function public.cancel_goals_batch(uuid, uuid, uuid, text) from anon;
revoke execute on function public.cancel_goals_batch(uuid, uuid, uuid, text) from authenticated;
