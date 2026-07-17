"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth/current-user";
import { supabaseAdmin } from "@/lib/supabase/server";
import { createBackup } from "./backups";
import { logChange } from "./audit";

/**
 * Déverrouiller crée toujours une sauvegarde + une trace, conformément à la
 * roadmap ("toute modification exceptionnelle doit créer une sauvegarde et
 * être journalisée"). Reverrouiller n'a pas besoin de ces garde-fous.
 */
export async function toggleSeasonLock(seasonId: string, locked: boolean) {
  const user = await requireAdmin();

  const { data: before } = await supabaseAdmin.from("seasons").select("*").eq("id", seasonId).maybeSingle();
  if (!before) throw new Error("Saison introuvable.");

  if (!locked) {
    await createBackup("manual", `Avant déverrouillage — ${before.name}`, user.playerId);
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

/**
 * Assistant de changement de saison : sauvegarde, clôture de l'ancienne
 * saison (verrouillée), création de la nouvelle. Les statistiques par saison
 * sont toujours recalculées à la volée (jamais stockées) donc la nouvelle
 * saison démarre à zéro sans rien à réinitialiser.
 */
export async function startNewSeason(formData: FormData) {
  const user = await requireAdmin();

  const name = String(formData.get("name") ?? "").trim();
  const startDate = String(formData.get("start_date") ?? "").trim();
  const endDate = String(formData.get("end_date") ?? "").trim() || null;

  if (!name || !startDate) {
    throw new Error("Le nom et la date de début sont obligatoires.");
  }

  await createBackup("end_of_season", `Fin de saison — avant création de "${name}"`, user.playerId);

  const { data: currentActive } = await supabaseAdmin.from("seasons").select("id").eq("is_active", true).maybeSingle();
  if (currentActive) {
    const { error: closeError } = await supabaseAdmin
      .from("seasons")
      .update({ is_active: false, is_locked: true, locked_at: new Date().toISOString() })
      .eq("id", currentActive.id);
    if (closeError) throw new Error(closeError.message);
  }

  const { error } = await supabaseAdmin.from("seasons").insert({
    name,
    start_date: startDate,
    end_date: endDate,
    is_active: true,
    is_locked: false,
  });
  if (error) throw new Error(error.message);

  revalidatePath("/admin/saisons");
  revalidatePath("/", "layout");
}
