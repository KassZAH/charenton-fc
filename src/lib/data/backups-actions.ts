"use server";

import { revalidatePath } from "next/cache";
import { requireFreshCoach, requireOwner } from "@/lib/auth/current-user";
import { supabaseAdmin } from "@/lib/supabase/server";
import { createAuditLogArtifact, createBackupWithArtifacts, deleteBackupRow, getBackupSnapshotForOwner } from "./backups";
import { checksumStatus, type ChecksumStatus } from "./backup-integrity";

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

/**
 * Vérification à la demande (jamais automatique sur la liste, pour ne pas
 * charger `snapshot` à chaque affichage) — recalcule le checksum réel avant
 * un téléchargement, pour permettre une confirmation forte en cas de
 * divergence. Ne renvoie jamais le contenu du snapshot au client.
 */
export async function checkBackupIntegrityAction(backupId: string): Promise<ChecksumStatus> {
  await requireOwner();

  const backup = await getBackupSnapshotForOwner(backupId);
  if (!backup) throw new Error("Sauvegarde introuvable.");

  return checksumStatus(backup.checksum, backup.snapshot);
}
