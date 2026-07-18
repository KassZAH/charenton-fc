"use server";

import { revalidatePath } from "next/cache";
import type { SupabaseClient } from "@supabase/supabase-js";
import { requireOwner } from "@/lib/auth/current-user";
import { supabaseAdmin } from "@/lib/supabase/server";
import { createBackupWithArtifacts } from "./backups";
import { computeChecksum, CHECKSUM_ALGORITHM } from "./backup-integrity";
import { logChange } from "./audit";

/**
 * Verrouiller/déverrouiller une saison est réservé au propriétaire (roadmap
 * V3, Lot 7) — les coachs gardent un accès en lecture seule à la page des
 * saisons. Déverrouiller crée toujours une sauvegarde + une trace.
 */
export async function toggleSeasonLock(seasonId: string, locked: boolean) {
  const user = await requireOwner();

  const { data: before } = await supabaseAdmin.from("seasons").select("*").eq("id", seasonId).maybeSingle();
  if (!before) throw new Error("Saison introuvable.");

  if (!locked) {
    await createBackupWithArtifacts({
      triggerReason: "before_unlock",
      label: `Avant déverrouillage — ${before.name}`,
      createdByPlayerId: user.playerId,
      protectedBackup: true,
    });
  }

  const { error } = await supabaseAdmin
    .from("seasons")
    .update({ is_locked: locked, locked_at: locked ? new Date().toISOString() : null })
    .eq("id", seasonId);
  if (error) throw new Error(error.message);

  await logChange({
    tableName: "seasons",
    recordId: seasonId,
    action: "update",
    oldData: before,
    newData: { ...before, is_locked: locked },
    changedByPlayerId: user.playerId,
    changedByName: user.name,
  });

  revalidatePath("/admin/saisons");
}

type CloseSeasonRpcRow = { backup_id: string; backup_snapshot: unknown; new_season_id: string; archived_count: number };

/**
 * Assistant de clôture de saison (roadmap V3, Lot 7) — réservé au
 * propriétaire. Toutes les mutations (backup, clôture, archivage, nouvelle
 * saison, cotisation, audit) ont lieu dans une seule transaction Postgres
 * (close_season_and_start_new) : soit tout réussit, soit rien n'est écrit.
 * Le checksum du backup est finalisé juste après (mécanisme du Lot 6) — un
 * échec de finalisation laisse le backup "À finaliser", réparable par le
 * propriétaire, sans jamais faire échouer la clôture elle-même (déjà actée
 * de façon atomique par la RPC à ce stade).
 */
export async function closeSeasonAction(formData: FormData) {
  const user = await requireOwner();

  const oldSeasonId = String(formData.get("old_season_id") ?? "").trim();
  const oldSeasonName = String(formData.get("old_season_name") ?? "").trim();
  const confirmName = String(formData.get("confirm_name") ?? "").trim();
  const name = String(formData.get("name") ?? "").trim();
  const startDate = String(formData.get("start_date") ?? "").trim();
  const endDate = String(formData.get("end_date") ?? "").trim() || null;
  const dueAmountRaw = String(formData.get("due_amount") ?? "").trim();
  const dueAmount = dueAmountRaw ? Number(dueAmountRaw) : null;
  const playerIdsToArchive = formData.getAll("archive_player_id").map(String);

  if (!oldSeasonId || !name || !startDate) {
    throw new Error("Saison source, nom et date de début sont obligatoires.");
  }
  // Confirmation forte — vérifiée côté serveur, pas seulement un bouton désactivé côté client.
  if (confirmName !== oldSeasonName) {
    throw new Error("Le nom saisi ne correspond pas exactement à la saison à clôturer.");
  }

  // Le générateur de types Supabase ne connaît pas encore cette fonction sur
  // tous les environnements (elle n'existe, à dessein, que sur le projet
  // isolé pendant D7-B) — cast vers le client non typé, même pattern que le
  // Lot 6 pour les paramètres RPC nullable.
  const { data, error } = await (supabaseAdmin as unknown as SupabaseClient).rpc("close_season_and_start_new", {
    p_old_season_id: oldSeasonId,
    p_new_season_name: name,
    p_new_season_start_date: startDate,
    p_new_season_end_date: endDate,
    p_player_ids_to_archive: playerIdsToArchive,
    p_new_season_due_amount: dueAmount,
    p_owner_player_id: user.playerId,
    p_application_commit: process.env.VERCEL_GIT_COMMIT_SHA ?? null,
  });
  if (error) throw new Error(error.message);

  const row = (data as CloseSeasonRpcRow[])[0];

  try {
    const checksum = computeChecksum(row.backup_snapshot);
    await supabaseAdmin.from("backups").update({ checksum, checksum_algorithm: CHECKSUM_ALGORITHM }).eq("id", row.backup_id);
  } catch {
    // Non bloquant — le backup reste "À finaliser", réparable par le propriétaire.
  }

  revalidatePath("/admin/saisons");
  revalidatePath("/", "layout");
}
