"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/auth/current-user";
import { supabaseAdmin } from "@/lib/supabase/server";
import { createBackup } from "./backups";
import { getActiveSeason } from "./seasons";
import { SEASON_RESET_ENABLED } from "./reset-flags";

/**
 * Réservé aux admins/coachs (vérifié via le rôle en base, jamais via un nom
 * modifiable par le joueur lui-même). Supprime uniquement les matchs de la
 * SAISON ACTIVE — ce qui entraîne en cascade buts, cartons, présences,
 * votes pour ces matchs-là — jamais l'historique des saisons précédentes.
 * Confirmation explicite : le nom de la saison doit être retapé.
 */
export async function resetSeasonData(formData: FormData) {
  const user = await requireAdmin();

  if (!SEASON_RESET_ENABLED) {
    throw new Error(
      "La réinitialisation manuelle est désactivée — clôture la saison depuis Admin > Saisons, aucune donnée n'est supprimée."
    );
  }

  const season = await getActiveSeason();
  if (!season) {
    throw new Error("Aucune saison active à réinitialiser.");
  }

  const confirmation = String(formData.get("confirm_season_name") ?? "").trim();
  if (confirmation !== season.name) {
    throw new Error("Le nom de la saison ne correspond pas — réinitialisation annulée.");
  }

  await createBackup("before_reset", `Avant réinitialisation de "${season.name}"`, user.playerId);

  const { error: matchesError } = await supabaseAdmin.from("matches").delete().eq("season_id", season.id);
  if (matchesError) throw new Error(matchesError.message);

  revalidatePath("/", "layout");
  redirect("/matches");
}
