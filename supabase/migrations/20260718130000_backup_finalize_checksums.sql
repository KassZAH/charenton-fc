-- Roadmap V3, Lot 6 — finalisation atomique des checksums d'un backup
-- sensible et de son artefact audit_log.
--
-- create_sensitive_backup_with_audit_artifact() (migration 20260718120000)
-- garantit que les deux LIGNES existent ensemble ou n'existent pas. Mais le
-- calcul des checksums (en JS, canonicalisation à clés triées — jamais
-- dupliqué en SQL, voir le commentaire de la migration précédente) suivait
-- deux UPDATE PostgREST séparés après le retour de la RPC : un crash entre
-- les deux pouvait laisser un backup au format 2 avec un checksum renseigné
-- mais son artefact encore NULL (ou l'inverse) — état "à finaliser", jamais
-- confondu avec legacy ni avec "non vérifié", mais qui méritait une vraie
-- garantie transactionnelle pour sa propre écriture. Cette fonction
-- remplace les deux UPDATE séparés par une seule transaction.

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
  select id, format_version into v_backup_id, v_backup_format_version
    from public.backups where id = p_backup_id;

  if v_backup_id is null then
    raise exception 'Backup % introuvable — aucune finalisation possible.', p_backup_id;
  end if;

  if v_backup_format_version is distinct from 2 then
    raise exception 'Backup % n''est pas au format 2 (format_version = %) — finalisation refusée.',
      p_backup_id, v_backup_format_version;
  end if;

  select id into v_artifact_id
    from public.backup_artifacts
    where backup_id = p_backup_id and artifact_type = 'audit_log';

  if v_artifact_id is null then
    raise exception 'Aucun artefact audit_log associé au backup % — finalisation refusée.', p_backup_id;
  end if;

  -- Mises à jour ciblées par id exact — jamais par correspondance floue,
  -- jamais un backup ou artefact différent de celui explicitement demandé.
  update public.backups
  set checksum = p_backup_checksum, checksum_algorithm = 'sha256-canonical-json-v1'
  where id = v_backup_id;

  update public.backup_artifacts
  set checksum = p_artifact_checksum, checksum_algorithm = 'sha256-canonical-json-v1'
  where id = v_artifact_id;

  return query select v_backup_id, v_artifact_id, true;
end;
$$;

revoke execute on function public.finalize_sensitive_backup_checksums(uuid, text, text) from public;
revoke execute on function public.finalize_sensitive_backup_checksums(uuid, text, text) from anon;
revoke execute on function public.finalize_sensitive_backup_checksums(uuid, text, text) from authenticated;
