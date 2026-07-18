-- Roadmap V3, Lot 6 — atomicité réelle des backups sensibles et de leur
-- artefact audit_log obligatoire (before_restore, before_migration,
-- before_fusion).
--
-- Le chemin précédent (createBackup() puis createAuditLogArtifact() en deux
-- allers-retours PostgREST distincts, avec suppression compensatoire du
-- backup si l'artefact échouait) n'était PAS transactionnel : un crash du
-- processus Node entre les deux appels pouvait laisser un backup orphelin
-- sans son artefact obligatoire. Cette migration ajoute une fonction unique
-- qui insère les deux lignes dans UNE SEULE transaction Postgres : soit les
-- deux existent, soit aucune des deux (rollback automatique sur toute
-- erreur, sans logique de compensation applicative).
--
-- checksum/checksum_algorithm ne peuvent pas être calculés à l'intérieur de
-- cette fonction : le checksum canonique (clés triées alphabétiquement,
-- calculé sur la forme exacte que le client JS reçoit) est délibérément
-- calculé côté Node, jamais dupliqué en SQL (la sérialisation texte d'un
-- jsonb par PostgreSQL n'est pas garantie identique à JSON.stringify d'un
-- objet JS équivalent — risque réel de divergence sur le formatage des
-- nombres decimal, pas seulement l'ordre des clés). Les deux colonnes sont
-- donc relâchées en nullable ici : la fonction insère les deux lignes avec
-- checksum NULL, l'appelant (backups.ts) les complète par une mise à jour
-- immédiate juste après — l'EXISTENCE des deux lignes reste garantie
-- atomique par la transaction, seul le remplissage du checksum a lieu dans
-- un second temps (et un backup/artefact sans checksum est un état valide
-- et déjà géré : "Non vérifié", jamais confondu avec "backup legacy").

alter table public.backup_artifacts
  alter column checksum drop not null,
  alter column checksum_algorithm drop not null;

alter table public.backup_artifacts drop constraint backup_artifacts_checksum_algorithm_check;
alter table public.backup_artifacts add constraint backup_artifacts_checksum_pair_check check (
  (checksum is null and checksum_algorithm is null)
  or (checksum is not null and checksum_algorithm = 'sha256-canonical-json-v1')
);

create or replace function public.create_sensitive_backup_with_audit_artifact(
  p_label text,
  p_trigger_reason text,
  p_backup_type text,
  p_protected boolean,
  p_created_by_player_id uuid,
  p_created_by_context text,
  p_application_commit text,
  p_database_schema_version text,
  p_active_season_id uuid,
  p_active_season_name text
)
returns table (
  backup_id uuid,
  backup_created_at timestamptz,
  backup_snapshot jsonb,
  artifact_id uuid,
  artifact_payload jsonb,
  artifact_row_count integer
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_snapshot jsonb;
  v_tables_included text[];
  v_table_counts jsonb;
  v_backup_id uuid;
  v_created_at timestamptz;
  v_artifact_id uuid;
  v_artifact_payload jsonb;
  v_row_count integer;
begin
  -- Réutilise export_backup_snapshot() (déjà une seule instruction, snapshot
  -- cohérent) plutôt que de dupliquer sa logique une troisième fois.
  v_snapshot := public.export_backup_snapshot();
  v_tables_included := array(select jsonb_object_keys(v_snapshot) order by 1);

  select jsonb_object_agg(key, jsonb_array_length(value))
    into v_table_counts
    from jsonb_each(v_snapshot);

  insert into public.backups (
    label, trigger_reason, backup_type, protected, format_version,
    snapshot, table_counts, tables_included, tables_excluded, exclusion_reasons,
    created_by_player_id, created_by_context, application_commit, database_schema_version,
    active_season_id, active_season_name
  ) values (
    p_label, p_trigger_reason, p_backup_type, p_protected, 2,
    v_snapshot, v_table_counts, v_tables_included,
    array['audit_log', 'backups', 'backup_artifacts'],
    jsonb_build_object(
      'audit_log', 'journal append-only exporté séparément pour certains backups sensibles',
      'backups', 'évite la récursion des sauvegardes',
      'backup_artifacts', 'artefacts associés aux backups, exclus pour éviter la récursion'
    ),
    p_created_by_player_id, p_created_by_context, p_application_commit, p_database_schema_version,
    p_active_season_id, p_active_season_name
  )
  returning id, created_at into v_backup_id, v_created_at;

  v_artifact_payload := public.export_audit_log_snapshot(v_created_at);
  v_row_count := coalesce(jsonb_array_length(v_artifact_payload), 0);

  insert into public.backup_artifacts (
    backup_id, artifact_type, format_version, row_count, checksum, checksum_algorithm,
    payload, source_cutoff_at, created_by_player_id
  ) values (
    v_backup_id, 'audit_log', 2, v_row_count, null, null,
    v_artifact_payload, v_created_at, p_created_by_player_id
  )
  returning id into v_artifact_id;

  return query select v_backup_id, v_created_at, v_snapshot, v_artifact_id, v_artifact_payload, v_row_count;
end;
$$;

revoke execute on function public.create_sensitive_backup_with_audit_artifact(
  text, text, text, boolean, uuid, text, text, text, uuid, text
) from public;
revoke execute on function public.create_sensitive_backup_with_audit_artifact(
  text, text, text, boolean, uuid, text, text, text, uuid, text
) from anon;
revoke execute on function public.create_sensitive_backup_with_audit_artifact(
  text, text, text, boolean, uuid, text, text, text, uuid, text
) from authenticated;
