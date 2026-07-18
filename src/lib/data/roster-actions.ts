"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth/current-user";
import { supabaseAdmin } from "@/lib/supabase/server";
import { checkAndAwardBadges } from "./badges";
import { assertMatchSeasonUnlocked } from "./season-lock";

/**
 * Remplace intégralement la feuille de match (qui a vraiment joué) — sert de base aux stats
 * de présence. Suppression + réinsertion faites en un seul appel RPC (confirm_match_roster),
 * atomique côté Postgres : jamais de feuille vidée par un échec entre les deux étapes.
 */
export async function confirmMatchRoster(matchId: string, formData: FormData) {
  await requireAdmin();
  await assertMatchSeasonUnlocked(matchId);

  const playerIds = [...new Set(formData.getAll("player_id").map(String))];

  const { error } = await supabaseAdmin.rpc("confirm_match_roster", {
    p_match_id: matchId,
    p_player_ids: playerIds,
  });
  if (error) throw new Error(error.message);

  try {
    await Promise.all(playerIds.map((playerId) => checkAndAwardBadges(playerId)));
  } catch {
    // les badges sont secondaires — une erreur ici ne doit pas faire échouer la feuille de match
  }

  revalidatePath(`/matches/${matchId}`);
  revalidatePath("/");
  revalidatePath("/stats");
  revalidatePath("/records");
  revalidatePath("/team");
}
