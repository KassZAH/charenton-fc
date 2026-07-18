"use server";

import { revalidatePath } from "next/cache";
import { requireFreshCoach, requireOwner } from "@/lib/auth/current-user";
import { supabaseAdmin } from "@/lib/supabase/server";
import {
  createAuditLogArtifact,
  createBackupWithArtifacts,
  deleteBackupRow,
  getBackupArtifactForIntegrityCheck,
  getBackupSnapshotForIntegrityCheck,
} from "./backups";
import {
  detectCountMismatches,
  detectMissingTables,
  verifyChecksum,
  type ChecksumStatus,
} from "./backup-integrity";

/**
 * Un coach peut créer un backup manuel, jamais protégé (voir §10 du plan
 * Lot 6) — seul le propriétaire peut cocher "Protéger cette sauvegarde".
 * La valeur du formulaire n'est jamais prise pour argent comptant si
 * l'auteur n'est pas le propriétaire : recalculée côté serveur.
 */
export async function createManualBackup(formData: FormData) {
  const user = await requireFreshCoach();

  const label = String(formData.get("label") ?? "").trim() || "Sauvegarde manuelle";
  const protectedBackup = user.isOwner && formData.get("protected") === "on";

  await createBackupWithArtifacts({
    triggerReason: "manual",
    label,
    createdByPlayerId: user.playerId,
    protectedBackup,
  });

  revalidatePath("/admin/sauvegardes");
}

/**
 * Export à la demande de l'artefact audit_log pour un backup déjà existant
 * (au-delà de la génération automatique sur les backups sensibles).
 */
export async function exportAuditLogArtifactAction(backupId: string) {
  const user = await requireOwner();

  const { data: backup, error } = await supabaseAdmin
    .from("backups")
    .select("id, created_at")
    .eq("id", backupId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!backup) throw new Error("Sauvegarde introuvable.");

  await createAuditLogArtifact(backup.id, backup.created_at, user.playerId);

  revalidatePath("/admin/sauvegardes");
}

/**
 * Un backup protected=true ou protected=null (legacy) ne peut jamais être
 * supprimé depuis l'interface. Confirmation par saisie exacte du libellé —
 * même pattern que resetSeasonData()/transfert de propriété.
 */
export async function deleteBackupAction(backupId: string, confirmLabel: string) {
  await requireOwner();

  const { data: backup, error } = await supabaseAdmin
    .from("backups")
    .select("id, label, protected")
    .eq("id", backupId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!backup) throw new Error("Sauvegarde introuvable.");

  if (backup.protected !== false) {
    throw new Error("Cette sauvegarde est protégée — elle ne peut pas être supprimée depuis l'interface.");
  }
  if (confirmLabel !== backup.label) {
    throw new Error("Le libellé saisi ne correspond pas exactement.");
  }

  await deleteBackupRow(backupId);

  revalidatePath("/admin/sauvegardes");
}

export type IntegrityCheckResult = {
  checksumStatus: ChecksumStatus;
  missingTables: string[];
  countMismatches: { table: string; declared: number; actual: number }[];
};

/**
 * Vérification à la demande (jamais automatique sur la liste, pour ne pas
 * charger `snapshot` à chaque affichage) — accessible à tout coach, pas
 * seulement au propriétaire : ne renvoie jamais `snapshot`, `pin_hash` ni
 * aucune donnée de joueur au client, uniquement un statut et des anomalies
 * structurelles. Le chargement du contenu complet reste interne au serveur
 * (getBackupSnapshotForIntegrityCheck), jamais transmis tel quel.
 */
export async function checkBackupIntegrityAction(backupId: string): Promise<IntegrityCheckResult> {
  await requireFreshCoach();

  const backup = await getBackupSnapshotForIntegrityCheck(backupId);
  if (!backup) throw new Error("Sauvegarde introuvable.");

  const snapshot = (backup.snapshot ?? {}) as Record<string, unknown>;
  return {
    checksumStatus: verifyChecksum(backup.checksum, backup.snapshot),
    missingTables: backup.tables_included ? detectMissingTables(backup.tables_included, snapshot) : [],
    countMismatches: detectCountMismatches((backup.table_counts as Record<string, number>) ?? {}, snapshot),
  };
}

/** Même principe que checkBackupIntegrityAction, pour un artefact (accessible à tout coach). */
export async function checkArtifactIntegrityAction(artifactId: string): Promise<ChecksumStatus> {
  await requireFreshCoach();

  const artifact = await getBackupArtifactForIntegrityCheck(artifactId);
  if (!artifact) throw new Error("Artefact introuvable.");

  return verifyChecksum(artifact.checksum, artifact.payload);
}
