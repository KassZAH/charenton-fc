-- Roadmap V3, Lot 7 — Assistant complet de changement de saison.
--
-- ⚠️ Cette migration n'est appliquée QUE sur le projet Supabase isolé
-- (charenton-fc-lot7-test, cimbymuifzooxrnenznd) pendant D7-B, jamais sur le
-- projet partagé tant que la validation manuelle de D7-C n'a pas eu lieu.
--
-- Une seule transaction orchestre l'intégralité de la clôture de saison :
-- verrouillage explicite de la saison source (SELECT ... FOR UPDATE),
-- snapshot pris avant toute mutation, backup end_of_season format 2,
-- archivage sécurisé des seuls joueurs sélectionnés, création d'exactement
-- une nouvelle saison active, cotisation optionnelle, entrée d'audit
-- minimale. Toute erreur à n'importe quelle étape annule tout (rollback
-- Postgres automatique) — aucune compensation applicative nécessaire.

create or replace function public.close_season_and_start_new(
  p_old_season_id uuid,
  p_new_season_name text,
  p_new_season_start_date date,
  p_new_season_end_date date,
  p_player_ids_to_archive uuid[],
  p_new_season_due_amount numeric,
  p_owner_player_id uuid,
  p_application_commit text
)
returns table (
  backup_id uuid,
  backup_snapshot jsonb,
  new_season_id uuid,
  archived_count integer
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_declared_owner_id uuid;
  v_owner_first_name text;
  v_owner_nickname text;
  v_owner_role text;
  v_owner_status text;
  v_owner_name text;
  v_old_season_id uuid;
  v_old_season_name text;
  v_old_season_is_active boolean;
  v_old_season_is_locked boolean;
  v_active_count integer;
  v_snapshot jsonb;
  v_tables_included text[];
  v_table_counts jsonb;
  v_schema_version text;
  v_backup_id uuid;
  v_new_season_id uuid;
  v_archived_count integer := 0;
  v_player_id uuid;
  v_dedup_ids uuid[];
  v_player_role text;
  v_player_status text;
begin
  -- === 1. Validation stricte des paramètres, avant toute lecture verrouillante ===
  if p_new_season_name is null or length(trim(p_new_season_name)) = 0 then
    raise exception 'Le nom de la nouvelle saison est obligatoire.';
  end if;
  if length(trim(p_new_season_name)) > 100 then
    raise exception 'Le nom de la nouvelle saison est trop long (100 caractères maximum).';
  end if;
  if p_new_season_start_date is null then
    raise exception 'La date de début de la nouvelle saison est obligatoire.';
  end if;
  if p_new_season_end_date is not null and p_new_season_end_date < p_new_season_start_date then
    raise exception 'La date de fin ne peut pas être antérieure à la date de début.';
  end if;
  if p_new_season_due_amount is not null and p_new_season_due_amount < 0 then
    raise exception 'Le montant de cotisation ne peut pas être négatif.';
  end if;
  if p_player_ids_to_archive is null then
    raise exception 'La liste des joueurs à archiver ne peut pas être NULL (tableau vide accepté).';
  end if;
  v_dedup_ids := array(select distinct unnest(p_player_ids_to_archive));

  -- === 2. Propriétaire vérifié en base, jamais transmis en confiance ===
  select owner_player_id into v_declared_owner_id from public.team_settings where id = 1;
  if v_declared_owner_id is distinct from p_owner_player_id then
    raise exception 'Le joueur fourni n''est pas le propriétaire du club.';
  end if;

  select first_name, nickname, role, status
    into v_owner_first_name, v_owner_nickname, v_owner_role, v_owner_status
    from public.players where id = p_owner_player_id;

  if v_owner_status is distinct from 'active' then
    raise exception 'Le propriétaire n''est pas actif.';
  end if;
  if v_owner_role is distinct from 'coach' then
    raise exception 'Le propriétaire n''a pas le rôle coach.';
  end if;
  v_owner_name := coalesce(v_owner_nickname, v_owner_first_name);

  -- === 3. Verrou explicite sur la saison source + idempotence (double clic / concurrence) ===
  select id, name, is_active, is_locked
    into v_old_season_id, v_old_season_name, v_old_season_is_active, v_old_season_is_locked
    from public.seasons where id = p_old_season_id for update;

  if v_old_season_id is null then
    raise exception 'Saison introuvable.';
  end if;
  if v_old_season_is_active is distinct from true or v_old_season_is_locked is distinct from false then
    raise exception 'Cette saison est déjà clôturée ou verrouillée.';
  end if;

  select count(*) into v_active_count from public.seasons where is_active = true;
  if v_active_count <> 1 then
    raise exception 'État incohérent : % saison(s) active(s) au lieu d''une.', v_active_count;
  end if;

  -- === 4. Snapshot AVANT toute mutation ===
  v_snapshot := public.export_backup_snapshot();
  v_tables_included := array(select jsonb_object_keys(v_snapshot) order by 1);
  select jsonb_object_agg(key, jsonb_array_length(value)) into v_table_counts from jsonb_each(v_snapshot);

  begin
    v_schema_version := public.get_latest_applied_migration();
  exception when others then
    v_schema_version := null;
  end;

  insert into public.backups (
    label, trigger_reason, backup_type, protected, format_version,
    snapshot, table_counts, tables_included, tables_excluded, exclusion_reasons,
    created_by_player_id, application_commit, database_schema_version,
    active_season_id, active_season_name
  ) values (
    'Fin de saison — ' || v_old_season_name, 'end_of_season', 'end_of_season', true, 2,
    v_snapshot, v_table_counts, v_tables_included,
    array['audit_log', 'backups', 'backup_artifacts'],
    jsonb_build_object(
      'audit_log', 'journal append-only exporté séparément pour certains backups sensibles',
      'backups', 'évite la récursion des sauvegardes',
      'backup_artifacts', 'artefacts associés aux backups, exclus pour éviter la récursion'
    ),
    p_owner_player_id, p_application_commit, v_schema_version,
    p_old_season_id, v_old_season_name
  )
  returning id into v_backup_id;

  -- === 5. Clôture et verrouillage de l'ancienne saison ===
  update public.seasons set is_active = false, is_locked = true, locked_at = now() where id = p_old_season_id;

  -- === 6. Archivage sécurisé des seuls joueurs sélectionnés ===
  foreach v_player_id in array v_dedup_ids loop
    if v_player_id = p_owner_player_id then
      raise exception 'Le propriétaire ne peut pas être archivé.';
    end if;

    select role, status into v_player_role, v_player_status
      from public.players where id = v_player_id for update;

    if v_player_role is null then
      raise exception 'Joueur % introuvable.', v_player_id;
    end if;
    if v_player_status is distinct from 'active' then
      raise exception 'Joueur % n''est pas actif.', v_player_id;
    end if;

    -- Ne touche jamais pin_hash ni pin_length.
    update public.players
      set status = 'archived', archived_at = now(), session_version = session_version + 1
      where id = v_player_id;
    v_archived_count := v_archived_count + 1;
  end loop;

  -- === 7. Nouvelle saison, exactement une ===
  insert into public.seasons (name, start_date, end_date, is_active, is_locked)
  values (trim(p_new_season_name), p_new_season_start_date, p_new_season_end_date, true, false)
  returning id into v_new_season_id;

  -- === 8. Cotisation optionnelle, joueurs actifs restants uniquement (jamais l'ancienne saison) ===
  if p_new_season_due_amount is not null then
    insert into public.dues (player_id, season_id, amount_due, amount_paid)
    select id, v_new_season_id, p_new_season_due_amount, 0
    from public.players where status = 'active';
  end if;

  -- === 9. Audit minimal — jamais de snapshot, pin_hash ou donnée personnelle complète ===
  insert into public.audit_log (table_name, record_id, action, old_data, new_data, changed_by_player_id, changed_by_name)
  values (
    'seasons', v_new_season_id, 'insert',
    jsonb_build_object('old_season_id', p_old_season_id),
    jsonb_build_object(
      'new_season_id', v_new_season_id,
      'backup_id', v_backup_id,
      'archived_count', v_archived_count,
      'has_due_amount', p_new_season_due_amount is not null
    ),
    p_owner_player_id, v_owner_name
  );

  return query select v_backup_id, v_snapshot, v_new_season_id, v_archived_count;
end;
$$;

revoke execute on function public.close_season_and_start_new(
  uuid, text, date, date, uuid[], numeric, uuid, text
) from public;
revoke execute on function public.close_season_and_start_new(
  uuid, text, date, date, uuid[], numeric, uuid, text
) from anon;
revoke execute on function public.close_season_and_start_new(
  uuid, text, date, date, uuid[], numeric, uuid, text
) from authenticated;

-- Le scoping par saison des matchs à vérifier (getMatchesNeedingReviewForSeason)
-- est implémenté côté TypeScript par un simple filtre .eq("season_id", ...)
-- sur les fonctions déjà existantes (match-completeness.ts) — aucune fonction
-- SQL dédiée n'est nécessaire, la lecture ne présente aucun enjeu
-- d'atomicité ou de sécurité au-delà de ce que le client authentifié
-- côté serveur gère déjà.
