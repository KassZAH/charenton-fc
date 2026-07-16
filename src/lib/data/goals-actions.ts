"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth/current-user";
import { supabaseAdmin } from "@/lib/supabase/server";
import { checkAndAwardBadges } from "./badges";
import { logChange } from "./audit";

export async function addGoal(matchId: string, formData: FormData) {
  const user = await requireAdmin();

  const scorerId = String(formData.get("scorer_player_id") ?? "") || null;
  const assistId = String(formData.get("assist_player_id") ?? "") || null;
  const minuteRaw = String(formData.get("minute") ?? "").trim();
  const unknownScorer = formData.get("unknown_scorer") === "on";

  if (!unknownScorer && !scorerId) {
    throw new Error("Sélectionne un buteur ou coche « Buteur inconnu ».");
  }

  const { data: goal, error } = await supabaseAdmin
    .from("goals")
    .insert({
      match_id: matchId,
      scorer_player_id: unknownScorer ? null : scorerId,
      assist_player_id: assistId,
      minute: minuteRaw ? Number(minuteRaw) : null,
      is_unknown_scorer: unknownScorer,
    })
    .select("*")
    .single();
  if (error) throw new Error(error.message);

  await logChange({
    tableName: "goals",
    recordId: goal.id,
    action: "insert",
    newData: goal,
    changedByPlayerId: user.playerId,
    changedByName: user.name,
  });

  try {
    if (!unknownScorer && scorerId) await checkAndAwardBadges(scorerId);
    if (assistId) await checkAndAwardBadges(assistId);
  } catch {
    // les badges sont secondaires — une erreur ici ne doit pas faire échouer l'ajout du but
  }

  revalidatePath(`/matches/${matchId}`);
  revalidatePath("/stats");
}

export async function deleteGoal(matchId: string, goalId: string) {
  const user = await requireAdmin();

  const { data: before } = await supabaseAdmin.from("goals").select("*").eq("id", goalId).maybeSingle();

  const { error } = await supabaseAdmin
    .from("goals")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", goalId);
  if (error) throw new Error(error.message);

  if (before) {
    await logChange({
      tableName: "goals",
      recordId: goalId,
      action: "delete",
      oldData: before,
      changedByPlayerId: user.playerId,
      changedByName: user.name,
    });
  }

  revalidatePath(`/matches/${matchId}`);
  revalidatePath("/stats");
}
