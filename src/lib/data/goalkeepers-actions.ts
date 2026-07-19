"use server";

import { revalidatePath } from "next/cache";
import type { SupabaseClient } from "@supabase/supabase-js";
import { requireAdmin } from "@/lib/auth/current-user";
import { supabaseAdmin } from "@/lib/supabase/server";
import { assertMatchSeasonUnlocked } from "./season-lock";

/** set_match_goalkeepers (Lot 13) n'existe pas encore dans les types générés (projet isolé uniquement pour l'instant). */
const untypedDb = supabaseAdmin as unknown as SupabaseClient;

/**
 * Remplace intégralement la désignation des gardiens pour ce match (roadmap
 * V3, Lot 13) — un seul appel RPC atomique (set_match_goalkeepers), jamais
 * deux écritures séparées. La RPC refuse elle-même tout joueur absent de la
 * feuille de match.
 */
export async function setMatchGoalkeepers(matchId: string, formData: FormData) {
  await requireAdmin();
  await assertMatchSeasonUnlocked(matchId);

  const goalkeeperPlayerIds = [...new Set(formData.getAll("goalkeeper_player_id").map(String))];

  const { error } = await untypedDb.rpc("set_match_goalkeepers", {
    p_match_id: matchId,
    p_goalkeeper_player_ids: goalkeeperPlayerIds,
  });
  if (error) throw new Error(error.message);

  revalidatePath(`/matches/${matchId}`);
  revalidatePath("/");
}
