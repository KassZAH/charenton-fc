"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth/current-user";
import { supabaseAdmin } from "@/lib/supabase/server";
import type { SeasonTrophyCategory } from "@/types/models";

const SEASON_TROPHY_CATEGORIES: SeasonTrophyCategory[] = [
  "joueur_de_la_saison",
  "meilleur_buteur",
  "meilleur_passeur",
  "mur_de_la_saison",
  "revelation",
  "plus_grande_vendange",
  "meilleure_ambiance",
  "action_la_plus_improbable",
  "plus_grande_disparition_whatsapp",
  "meilleur_moment_de_la_saison",
  "autre",
];

/** Une seule intronisation par catégorie et par saison (contrainte unique en base) — remplace si déjà attribuée. */
export async function upsertSeasonTrophy(seasonId: string, formData: FormData) {
  await requireAdmin();

  const playerId = String(formData.get("player_id") ?? "").trim() || null;
  const displayName = String(formData.get("display_name") ?? "").trim() || null;
  const category = String(formData.get("category") ?? "");
  const description = String(formData.get("description") ?? "").trim() || null;

  if (!playerId && !displayName) {
    throw new Error("Choisis un joueur ou renseigne un nom.");
  }
  if (!SEASON_TROPHY_CATEGORIES.includes(category as SeasonTrophyCategory)) {
    throw new Error("Catégorie invalide.");
  }

  const { error } = await supabaseAdmin.from("season_trophies").upsert(
    {
      season_id: seasonId,
      category,
      player_id: playerId,
      display_name: playerId ? null : displayName,
      description,
    },
    { onConflict: "season_id,category" }
  );
  if (error) throw new Error(error.message);

  revalidatePath("/trophees/saison");
}

export async function deleteSeasonTrophy(trophyId: string) {
  await requireAdmin();

  const { error } = await supabaseAdmin.from("season_trophies").delete().eq("id", trophyId);
  if (error) throw new Error(error.message);

  revalidatePath("/trophees/saison");
}
