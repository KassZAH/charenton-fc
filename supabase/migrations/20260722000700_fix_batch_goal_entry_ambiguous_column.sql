-- Roadmap V3, Lot 18 — deuxième correctif découvert en testant
-- insert_goals_batch avant d'écrire le code applicatif : RETURNS TABLE
-- déclarait une colonne `batch_id`, qui devient un OUT-paramètre implicite
-- en PL/pgSQL et entre en collision avec la vraie colonne goals.batch_id
-- référencée sans alias dans le corps de la fonction (`where batch_id =
-- v_batch_id`) — exactement le même piège déjà rencontré et corrigé au
-- Lot 8 (injury_id/table_name). RETURNS TABLE change de colonnes : DROP
-- FUNCTION obligatoire avant de recréer (CREATE OR REPLACE le refuse).

drop function if exists public.insert_goals_batch(uuid, uuid, jsonb, integer, jsonb, jsonb, integer, uuid, text);

create or replace function public.insert_goals_batch(
  p_match_id uuid,
  p_idempotency_key uuid,
  p_scorer_entries jsonb,
  p_csc_adverse_count integer,
  p_csc_charenton_entries jsonb,
  p_assist_entries jsonb,
  p_opponent_score integer,
  p_changed_by_player_id uuid,
  p_changed_by_name text
)
returns table (result_batch_id uuid, result_inserted_count integer, result_team_score integer)
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
    select g.batch_id into v_batch_id from public.goals g where g.id = v_existing_batch_id;
    select count(*) into v_inserted_count from public.goals g where g.batch_id = v_batch_id and g.deleted_at is null;
    select m.team_score into v_team_score from public.matches m where m.id = p_match_id;
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

  for v_entry in select * from jsonb_array_elements(coalesce(p_scorer_entries, '[]'::jsonb))
  loop
    for v_i in 1..greatest((v_entry->>'count')::integer, 0)
    loop
      insert into public.goals (match_id, scorer_player_id, is_unknown_scorer, goal_type, credited_to, batch_id, idempotency_key)
      values (
        p_match_id,
        nullif(v_entry->>'player_id', '')::uuid,
        coalesce((v_entry->>'is_unknown_scorer')::boolean, false),
        'classique', 'charenton', v_batch_id,
        case when v_inserted_count = 0 then p_idempotency_key else null end
      );
      v_inserted_count := v_inserted_count + 1;
    end loop;
  end loop;

  for v_i in 1..greatest(coalesce(p_csc_adverse_count, 0), 0)
  loop
    insert into public.goals (match_id, scorer_player_id, is_unknown_scorer, goal_type, credited_to, batch_id, idempotency_key)
    values (p_match_id, null, false, 'csc', 'charenton', v_batch_id, case when v_inserted_count = 0 then p_idempotency_key else null end);
    v_inserted_count := v_inserted_count + 1;
  end loop;

  for v_entry in select * from jsonb_array_elements(coalesce(p_csc_charenton_entries, '[]'::jsonb))
  loop
    for v_i in 1..greatest((v_entry->>'count')::integer, 0)
    loop
      insert into public.goals (match_id, scorer_player_id, is_unknown_scorer, goal_type, credited_to, batch_id, idempotency_key)
      values (p_match_id, nullif(v_entry->>'player_id', '')::uuid, false, 'csc', 'opponent', v_batch_id, case when v_inserted_count = 0 then p_idempotency_key else null end);
      v_inserted_count := v_inserted_count + 1;
    end loop;
  end loop;

  if v_inserted_count = 0 then
    raise exception 'Aucun but à enregistrer.';
  end if;

  select array_agg(g.id) into v_assist_target_ids
    from public.goals g where g.batch_id = v_batch_id and g.credited_to = 'charenton';

  for v_entry in select * from jsonb_array_elements(coalesce(p_assist_entries, '[]'::jsonb))
  loop
    for v_i in 1..greatest((v_entry->>'count')::integer, 0)
    loop
      if array_length(v_assist_target_ids, 1) is null or array_length(v_assist_target_ids, 1) = 0 then
        exit;
      end if;
      v_goal_id := v_assist_target_ids[1];
      v_assist_target_ids := v_assist_target_ids[2:];
      update public.goals set assist_player_id = nullif(v_entry->>'player_id', '')::uuid where id = v_goal_id;
    end loop;
  end loop;

  select count(*) into v_team_score from public.goals g where g.match_id = p_match_id and g.credited_to = 'charenton' and g.deleted_at is null;

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
