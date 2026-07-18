import { NextResponse } from "next/server";
import { requireOwner } from "@/lib/auth/current-user";
import { getBackupArtifactForOwner } from "@/lib/data/backups";
import { verifyChecksum } from "@/lib/data/backup-integrity";

/** Réservé au propriétaire — un artefact audit_log peut contenir des informations sensibles (ex. contexte d'un changement de PIN). */
export async function GET(_request: Request, { params }: { params: Promise<{ id: string; artifactId: string }> }) {
  await requireOwner();

  const { id, artifactId } = await params;
  const artifact = await getBackupArtifactForOwner(artifactId);
  if (!artifact || artifact.backup_id !== id) {
    return NextResponse.json({ error: "Artefact introuvable." }, { status: 404 });
  }

  const status = verifyChecksum(artifact.checksum, artifact.payload);

  const envelope = {
    format_version: artifact.format_version,
    artifact_id: artifact.id,
    backup_id: artifact.backup_id,
    artifact_type: artifact.artifact_type,
    row_count: artifact.row_count,
    source_cutoff_at: artifact.source_cutoff_at,
    created_at: artifact.created_at,
    created_by_player_id: artifact.created_by_player_id,
    checksum: artifact.checksum,
    checksum_algorithm: artifact.checksum_algorithm,
    integrity_status: status,
    payload: artifact.payload,
  };

  return new NextResponse(JSON.stringify(envelope, null, 2), {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename="charenton-fc-audit-log-${artifact.created_at.slice(0, 10)}.json"`,
      "X-Backup-Integrity": status,
    },
  });
}
