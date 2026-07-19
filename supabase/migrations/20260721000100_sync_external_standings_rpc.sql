-- Roadmap V3, Lot 11.5 — synchronisation transactionnelle du classement externe.
--
-- ⚠️ Cette migration n'est appliquée QUE sur le projet Supabase isolé,
-- jamais sur le projet partagé sans validation manuelle explicite.
--
-- La récupération HTTP + le parsing ont déjà eu lieu côté TypeScript
-- (FlaStandingsProvider, jamais en SQL — Postgres ne fait aucun appel
-- réseau ici) au moment de l'appel : cette RPC ne fait que persister un
-- résultat déjà validé, de façon atomique. Remplace les lignes de
-- external_standings UNIQUEMENT si p_status = 'success' — pour 'empty',
-- 'unavailable' ou 'invalid_payload', le cache précédent est conservé tel
-- quel, seul le statut/l'horodatage/le message d'erreur de la compétition
-- sont mis à jour.

create or replace function public.sync_external_standings_transactional(
  p_external_competition_id uuid,
  p_status text,
  p_standings jsonb,
  p_error_message text,
  p_changed_by_player_id uuid,
  p_changed_by_name text
)
returns table (
  result_status text,
  result_synced_at timestamptz,
  result_rows_count integer
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_competition_id uuid;
  v_rows_count integer := 0;
  v_synced_at timestamptz := now();
begin
  -- === 1. Validation stricte des paramètres ===
  if p_status not in ('success', 'empty', 'unavailable', 'invalid_payload', 'disabled') then
    raise exception 'Statut de synchronisation invalide : %', p_status;
  end if;
  if p_status = 'success' and p_standings is null then
    raise exception 'Un statut success doit être accompagné d''un tableau de classement (même vide).';
  end if;

  -- === 2. Verrou explicite + idempotence (double-clic / concurrence) ===
  select id into v_competition_id from public.external_competitions where id = p_external_competition_id for update;
  if v_competition_id is null then
    raise exception 'Compétition externe introuvable.';
  end if;

  -- === 3. Remplacement du classement — uniquement sur succès réel ===
  if p_status = 'success' then
    delete from public.external_standings where external_competition_id = v_competition_id;

    insert into public.external_standings (
      external_competition_id, external_team_id, team_name, normalized_team_name,
      position, played, wins, draws, losses, goals_for, goals_against, goal_difference, points,
      fetched_at
    )
    select
      v_competition_id, t.external_team_id, t.team_name, t.normalized_team_name,
      t.position, t.played, t.wins, t.draws, t.losses, t.goals_for, t.goals_against, t.goal_difference, t.points,
      v_synced_at
    from jsonb_to_recordset(p_standings) as t(
      external_team_id text, team_name text, normalized_team_name text,
      position integer, played integer, wins integer, draws integer, losses integer,
      goals_for integer, goals_against integer, goal_difference integer, points integer
    );
    get diagnostics v_rows_count = row_count;
  end if;
  -- 'empty' / 'unavailable' / 'invalid_payload' / 'disabled' : external_standings n'est jamais touchée ici,
  -- le classement précédemment valide (s'il existe) reste tel quel — c'est le cache.

  -- === 4. Mise à jour du statut de la compétition ===
  update public.external_competitions
    set last_sync_status = p_status,
        last_synced_at = v_synced_at,
        last_error_message = case when p_status in ('unavailable', 'invalid_payload') then p_error_message else null end,
        updated_at = v_synced_at
    where id = v_competition_id;

  -- === 5. Audit minimal — jamais le contenu brut de la réponse externe ===
  insert into public.audit_log (table_name, record_id, action, old_data, new_data, changed_by_player_id, changed_by_name)
  values (
    'external_competitions', v_competition_id, 'update',
    null,
    jsonb_build_object('status', p_status, 'rows_count', v_rows_count),
    p_changed_by_player_id, p_changed_by_name
  );

  return query select p_status, v_synced_at, v_rows_count;
end;
$$;

revoke execute on function public.sync_external_standings_transactional(uuid, text, jsonb, text, uuid, text) from public;
revoke execute on function public.sync_external_standings_transactional(uuid, text, jsonb, text, uuid, text) from anon;
revoke execute on function public.sync_external_standings_transactional(uuid, text, jsonb, text, uuid, text) from authenticated;
