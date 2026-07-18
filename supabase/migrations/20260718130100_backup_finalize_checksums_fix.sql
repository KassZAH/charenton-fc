-- Roadmap V3, Lot 6 — corrige une ambiguïté de colonne dans
-- finalize_sensitive_backup_checksums() (migration 20260718130000).
--
-- `returns table (backup_id uuid, artifact_id uuid, finalized boolean)`
-- crée implicitement des variables de sortie nommées `backup_id`/
-- `artifact_id` dans la portée de la fonction PL/pgSQL — la référence
-- `where backup_id = p_backup_id` dans la recherche de l'artefact devenait
-- ambiguë avec la colonne `backup_artifacts.backup_id`, provoquant l'erreur
-- "column reference \"backup_id\" is ambiguous" à l'exécution (détecté par
-- le test réel du cycle interrompu). Corrigé en qualifiant explicitement
-- la colonne de table.

create or replace function public.finalize_sensitive_backup_checksums(
  p_backup_id uuid,
  p_backup_checksum text,
  p_artifact_checksum text
)
returns table (backup_id uuid, artifact_id uuid, finalized boolean)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_backup_id uuid;
  v_backup_format_version integer;
  v_artifact_id uuid;
begin
  select b.id, b.format_version into v_backup_id, v_backup_format_version
    from public.backups b where b.id = p_backup_id;

  if v_backup_id is null then
    raise exception 'Backup % introuvable — aucune finalisation possible.', p_backup_id;
  end if;

  if v_backup_format_version is distinct from 2 then
    raise exception 'Backup % n''est pas au format 2 (format_version = %) — finalisation refusée.',
      p_backup_id, v_backup_format_version;
  end if;

  select a.id into v_artifact_id
    from public.backup_artifacts a
    where a.backup_id = p_backup_id and a.artifact_type = 'audit_log';

  if v_artifact_id is null then
    raise exception 'Aucun artefact audit_log associé au backup % — finalisation refusée.', p_backup_id;
  end if;

  update public.backups b
  set checksum = p_backup_checksum, checksum_algorithm = 'sha256-canonical-json-v1'
  where b.id = v_backup_id;

  update public.backup_artifacts a
  set checksum = p_artifact_checksum, checksum_algorithm = 'sha256-canonical-json-v1'
  where a.id = v_artifact_id;

  return query select v_backup_id, v_artifact_id, true;
end;
$$;

revoke execute on function public.finalize_sensitive_backup_checksums(uuid, text, text) from public;
revoke execute on function public.finalize_sensitive_backup_checksums(uuid, text, text) from anon;
revoke execute on function public.finalize_sensitive_backup_checksums(uuid, text, text) from authenticated;
