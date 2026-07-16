"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth/current-user";
import { supabaseAdmin } from "@/lib/supabase/server";

/** Remplace intégralement la feuille de match (qui a vraiment joué) — sert de base aux stats de présence. */
export async function confirmMatchRoster(matchId: string, formData: FormData) {
  await requireAdmin();

  const playerIds = [...new Set(formData.getAll("player_id").map(String))];

  const { error: deleteError } = await supabaseAdmin.from("match_players").delete().eq("match_id", matchId);
  if (deleteError) throw new Error(deleteError.message);

  if (playerIds.length > 0) {
    const { error: insertError } = await supabaseAdmin
      .from("match_players")
      .insert(playerIds.map((playerId) => ({ match_id: matchId, player_id: playerId, was_present: true })));
    if (insertError) throw new Error(insertError.message);
  }

  revalidatePath(`/matches/${matchId}`);
  revalidatePath("/");
  revalidatePath("/stats");
  revalidatePath("/records");
  revalidatePath("/team");
}
