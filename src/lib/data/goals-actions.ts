"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth/current-user";
import { supabaseAdmin } from "@/lib/supabase/server";

export async function addGoal(matchId: string, formData: FormData) {
  await requireAdmin();

  const scorerId = String(formData.get("scorer_player_id") ?? "") || null;
  const assistId = String(formData.get("assist_player_id") ?? "") || null;
  const minuteRaw = String(formData.get("minute") ?? "").trim();
  const unknownScorer = formData.get("unknown_scorer") === "on";

  if (!unknownScorer && !scorerId) {
    throw new Error("Sélectionne un buteur ou coche « Buteur inconnu ».");
  }

  const { error } = await supabaseAdmin.from("goals").insert({
    match_id: matchId,
    scorer_player_id: unknownScorer ? null : scorerId,
    assist_player_id: assistId,
    minute: minuteRaw ? Number(minuteRaw) : null,
    is_unknown_scorer: unknownScorer,
  });
  if (error) throw new Error(error.message);

  revalidatePath(`/matches/${matchId}`);
  revalidatePath("/stats");
}

export async function deleteGoal(matchId: string, goalId: string) {
  await requireAdmin();

  const { error } = await supabaseAdmin
    .from("goals")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", goalId);
  if (error) throw new Error(error.message);

  revalidatePath(`/matches/${matchId}`);
  revalidatePath("/stats");
}
