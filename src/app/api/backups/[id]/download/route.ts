import { NextResponse } from "next/server";
import { requireOwner } from "@/lib/auth/current-user";
import { getBackupSnapshotForOwner } from "@/lib/data/backups";
import { verifyChecksum } from "@/lib/data/backup-integrity";

/**
 * Réservé au propriétaire (roadmap V3, Lot 6) — le snapshot contient
 * players.pin_hash et l'ensemble des données personnelles de l'effectif.
 * Format 2 : enveloppe avec toutes les métadonnées + checksum. Format 1
 * (legacy, les 4 premiers backups) : téléchargement brut inchangé, jamais
 * de changement silencieux de leur format historique.
 */
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  await requireOwner();

  const { id } = await params;
  const backup = await getBackupSnapshotForOwner(id);
  if (!backup) return NextResponse.json({ error: "Sauvegarde introuvable." }, { status: 404 });

  const filename = `charenton-fc-sauvegarde-${backup.created_at.slice(0, 10)}.json`;
  const headers: Record<string, string> = {
    "Content-Type": "application/json; charset=utf-8",
    "Content-Disposition": `attachment; filename="${filename}"`,
  };

  if (backup.format_version !== 2) {
    // Format 1 (legacy) : comportement historique inchangé, jamais de métadonnées ajoutées après coup.
    return new NextResponse(JSON.stringify(backup.snapshot, null, 2), { headers });
  }

  const status = verifyChecksum(backup.checksum, backup.snapshot);
  headers["X-Backup-Integrity"] = status;

  const envelope = {
    format_version: backup.format_version,
    backup_id: backup.id,
    backup_type: backup.backup_type,
    label: backup.label,
    trigger_reason: backup.trigger_reason,
    protected: backup.protected,
    created_at: backup.created_at,
    created_by_player_id: backup.created_by_player_id,
    created_by_context: backup.created_by_context,
    application_commit: backup.application_commit,
    database_schema_version: backup.database_schema_version,
    active_season_id: backup.active_season_id,
    active_season_name: backup.active_season_name,
    table_counts: backup.table_counts,
    tables_included: backup.tables_included,
    tables_excluded: backup.tables_excluded,
    exclusion_reasons: backup.exclusion_reasons,
    checksum: backup.checksum,
    checksum_algorithm: backup.checksum_algorithm,
    integrity_status: status,
    tables: backup.snapshot,
  };

  return new NextResponse(JSON.stringify(envelope, null, 2), { headers });
}
