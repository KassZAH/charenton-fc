-- Roadmap V3, Lot 8 — Transactions critiques restantes.
--
-- ⚠️ Cette migration n'est appliquée QUE sur le projet Supabase isolé
-- (charenton-fc-lot7-test, cimbymuifzooxrnenznd) pendant la macro-release
-- 8-11, jamais sur le projet partagé sans validation manuelle explicite.
--
-- Remplace la séquence multi-étapes non transactionnelle utilisée par
-- declareInjury/recoverFromInjury/cancelInjury/updateInjuryReturnDate
-- (injuries-actions.ts) : mise à jour de la blessure, purge complète de la
-- couverture de convocations liée, ré-application de la couverture si la
-- blessure reste active, entrée d'audit minimale — une seule transaction,
-- tout ou rien.
--
-- Portée volontairement limitée aux quatre actions ci-dessus (celles qui
-- "clôturent ou modifient une blessure" au sens du Lot 8). resolveInjuredPresence
-- et adminOverrideInjuredPresence restent multi-étapes : ce sont des upserts/
-- deletes déjà idempotents, sans risque de corruption ou de perte silencieuse
-- (au pire un état transitoire périmé, récupérable par un nouvel appel) —
-- décision de périmètre documentée, pas un oubli.

create or replace function public.upsert_injury_and_sync_availability(
  p_injury_id uuid,
  p_player_id uuid,
  p_new_status text,
  p_started_at date,
  p_estimated_return_date date,
  p_actual_return_date date,
  p_comment text,
  p_comment_visibility text,
  p_changed_by_player_id uuid,
  p_changed_by_name text
)
returns table (
  result_injury_id uuid,
  result_availability_synced integer
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_injury_id uuid;
  v_player_status text;
  v_old_status text;
  v_old_estimated_return_date date;
  v_synced integer := 0;
begin
  -- === 1. Validation stricte des paramètres ===
  if p_new_status not in ('active', 'closed', 'cancelled') then
    raise exception 'Statut de blessure invalide : %', p_new_status;
  end if;
  if p_comment_visibility is not null and p_comment_visibility not in ('team', 'private') then
    raise exception 'Visibilité du commentaire invalide : %', p_comment_visibility;
  end if;
  if p_player_id is null then
    raise exception 'Joueur obligatoire.';
  end if;

  -- === 2. Joueur verrouillé et vérifié actif ===
  select status into v_player_status from public.players where id = p_player_id for update;
  if v_player_status is null then
    raise exception 'Joueur introuvable.';
  end if;
  if v_player_status <> 'active' then
    raise exception 'Le joueur n''est pas actif.';
  end if;

  -- === 3. Création ou mise à jour de la blessure ===
  if p_injury_id is null then
    if p_new_status <> 'active' then
      raise exception 'Une nouvelle blessure doit être déclarée active.';
    end if;
    if p_started_at is null then
      raise exception 'Date de début obligatoire.';
    end if;

    -- injuries_one_active_per_player (index unique partiel, migration
    -- 20260718030000) protège nativement contre le double-clic ici : une
    -- seconde insertion concurrente échoue avec une violation de contrainte
    -- plutôt que de créer deux blessures actives pour le même joueur.
    insert into public.injuries (player_id, started_at, estimated_return_date, comment, comment_visibility, status)
    values (p_player_id, p_started_at, p_estimated_return_date, p_comment, coalesce(p_comment_visibility, 'team'), 'active')
    returning id into v_injury_id;
    v_old_status := null;
    v_old_estimated_return_date := null;
  else
    select id, status, estimated_return_date
      into v_injury_id, v_old_status, v_old_estimated_return_date
      from public.injuries where id = p_injury_id and player_id = p_player_id for update;
    if v_injury_id is null then
      raise exception 'Blessure introuvable pour ce joueur.';
    end if;

    update public.injuries
      set status = p_new_status,
          estimated_return_date = p_estimated_return_date,
          actual_return_date = p_actual_return_date,
          updated_at = now()
      where id = v_injury_id;
  end if;

  -- === 4. Couverture des convocations — purge puis ré-application, jamais un correctif partiel ===
  delete from public.availability where injury_id = v_injury_id;

  if p_new_status = 'active' then
    insert into public.availability (match_id, player_id, status, injury_id)
    select m.id, p_player_id, 'injured', v_injury_id
    from public.matches m
    where m.status = 'scheduled'
      and m.deleted_at is null
      and (p_estimated_return_date is null or m.match_date <= p_estimated_return_date)
    on conflict (match_id, player_id) do update set status = excluded.status, injury_id = excluded.injury_id;
    get diagnostics v_synced = row_count;
  end if;

  -- === 5. Audit minimal — transition de statut uniquement, jamais de donnée personnelle étendue ===
  insert into public.audit_log (table_name, record_id, action, old_data, new_data, changed_by_player_id, changed_by_name)
  values (
    'injuries', v_injury_id,
    case when p_injury_id is null then 'insert' else 'update' end,
    case when p_injury_id is null then null
      else jsonb_build_object('status', v_old_status, 'estimated_return_date', v_old_estimated_return_date) end,
    jsonb_build_object('status', p_new_status, 'estimated_return_date', p_estimated_return_date, 'actual_return_date', p_actual_return_date),
    p_changed_by_player_id, p_changed_by_name
  );

  return query select v_injury_id, v_synced;
end;
$$;

revoke execute on function public.upsert_injury_and_sync_availability(
  uuid, uuid, text, date, date, date, text, text, uuid, text
) from public;
revoke execute on function public.upsert_injury_and_sync_availability(
  uuid, uuid, text, date, date, date, text, text, uuid, text
) from anon;
revoke execute on function public.upsert_injury_and_sync_availability(
  uuid, uuid, text, date, date, date, text, text, uuid, text
) from authenticated;
