-- Charenton FC — Mode Démo (présentation aux coachs), amélioration post-Macro B.
--
-- ⚠️ Appliquée uniquement au projet Supabase isolé (charenton-fc-lot7-test,
-- cimbymuifzooxrnenznd) tant que la validation manuelle n'a pas eu lieu.
--
-- Principe : une saison marquée is_demo=true ne doit JAMAIS pouvoir devenir active (garanti par
-- une contrainte CHECK, pas seulement par la discipline applicative) et ne doit jamais contaminer
-- les agrégats "toutes saisons confondues" (rotation, statistiques, records, badges...) — ce
-- dernier point est traité côté application (src/lib/data/demo-scope.ts), pas en base.
--
-- player_restrictions/venues/match_templates/checklist_templates n'ont aucun concept de saison
-- (créées aux Lots 19/22/24) — chacune reçoit ici le marquage minimal nécessaire pour que les
-- données fictives du mode Démo ne se mélangent jamais aux données réelles dans les listes/écrans
-- normaux, sans changer le comportement des lignes réelles existantes (season_id reste NULL,
-- is_demo reste false pour tout ce qui existe déjà).

alter table public.seasons add column is_demo boolean not null default false;
alter table public.seasons add constraint seasons_demo_never_active check (not (is_demo and is_active));

alter table public.player_restrictions add column season_id uuid references public.seasons(id) on delete cascade;
create index player_restrictions_season_id_idx on public.player_restrictions (season_id);

alter table public.venues add column is_demo boolean not null default false;
alter table public.match_templates add column is_demo boolean not null default false;
alter table public.checklist_templates add column is_demo boolean not null default false;

-- Défense en profondeur : message d'erreur explicite si jamais une saison Démo était fournie ici
-- (déjà bloqué naturellement par le contrôle existant "is_active must be true" + la contrainte
-- ci-dessus, mais un message clair vaut mieux qu'un rejet générique).
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
  v_old_season_is_demo boolean;
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

  select id, name, is_active, is_locked, is_demo
    into v_old_season_id, v_old_season_name, v_old_season_is_active, v_old_season_is_locked, v_old_season_is_demo
    from public.seasons where id = p_old_season_id for update;

  if v_old_season_id is null then
    raise exception 'Saison introuvable.';
  end if;
  if v_old_season_is_demo then
    raise exception 'La saison Démo ne peut jamais être clôturée ni remplacer la saison officielle par cet assistant.';
  end if;
  if v_old_season_is_active is distinct from true or v_old_season_is_locked is distinct from false then
    raise exception 'Cette saison est déjà clôturée ou verrouillée.';
  end if;

  select count(*) into v_active_count from public.seasons where is_active = true;
  if v_active_count <> 1 then
    raise exception 'État incohérent : % saison(s) active(s) au lieu d''une.', v_active_count;
  end if;

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

  update public.seasons set is_active = false, is_locked = true, locked_at = now() where id = p_old_season_id;

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

    update public.players
      set status = 'archived', archived_at = now(), session_version = session_version + 1
      where id = v_player_id;
    v_archived_count := v_archived_count + 1;
  end loop;

  insert into public.seasons (name, start_date, end_date, is_active, is_locked, is_demo)
  values (trim(p_new_season_name), p_new_season_start_date, p_new_season_end_date, true, false, false)
  returning id into v_new_season_id;

  if p_new_season_due_amount is not null then
    insert into public.dues (player_id, season_id, amount_due, amount_paid)
    select id, v_new_season_id, p_new_season_due_amount, 0
    from public.players where status = 'active';
  end if;

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
