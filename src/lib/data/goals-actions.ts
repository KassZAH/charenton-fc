"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth/current-user";
import { supabaseAdmin } from "@/lib/supabase/server";
import { checkAndAwardBadges } from "./badges";
import { logChange } from "./audit";
import { assertMatchSeasonUnlocked } from "./season-lock";

export async function addGoal(matchId: string, formData: FormData) {
  const user = await requireAdmin();
  await assertMatchSeasonUnlocked(matchId);

  const kind = String(formData.get("kind") ?? "classique");
  const minuteRaw = String(formData.get("minute") ?? "").trim();
  const minute = minuteRaw ? Number(minuteRaw) : null;

  let payload: {
    scorer_player_id: string | null;
    assist_player_id: string | null;
    is_unknown_scorer: boolean;
    goal_type: string;
    credited_to: "charenton" | "opponent";
  };

  if (kind === "csc_adverse") {
    // L'adversaire marque contre son camp : ça profite à Charenton, personne n'est crédité.
    payload = { scorer_player_id: null, assist_player_id: null, is_unknown_scorer: false, goal_type: "csc", credited_to: "charenton" };
  } else if (kind === "csc_charenton") {
    // Un joueur de Charenton marque contre son camp : ça profite à l'adversaire, jamais
    // compté comme un but personnel même si le joueur concerné est renseigné.
    const ownGoalPlayerId = String(formData.get("own_goal_player_id") ?? "") || null;
    payload = { scorer_player_id: ownGoalPlayerId, assist_player_id: null, is_unknown_scorer: false, goal_type: "csc", credited_to: "opponent" };
  } else {
    const scorerId = String(formData.get("scorer_player_id") ?? "") || null;
    const assistId = String(formData.get("assist_player_id") ?? "") || null;
    const unknownScorer = formData.get("unknown_scorer") === "on";
    if (!unknownScorer && !scorerId) {
      throw new Error("Sélectionne un buteur ou coche « Buteur inconnu ».");
    }
    payload = {
      scorer_player_id: unknownScorer ? null : scorerId,
      assist_player_id: assistId,
      is_unknown_scorer: unknownScorer,
      goal_type: "classique",
      credited_to: "charenton",
    };
  }

  const { data: goal, error } = await supabaseAdmin
    .from("goals")
    .insert({ match_id: matchId, minute, ...payload })
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
    if (payload.credited_to === "charenton" && payload.scorer_player_id) {
      await checkAndAwardBadges(payload.scorer_player_id);
    }
    if (payload.assist_player_id) await checkAndAwardBadges(payload.assist_player_id);
  } catch {
    // les badges sont secondaires — une erreur ici ne doit pas faire échouer l'ajout du but
  }

  revalidatePath(`/matches/${matchId}`);
  revalidatePath("/stats");
}

export async function deleteGoal(matchId: string, goalId: string) {
  const user = await requireAdmin();
  await assertMatchSeasonUnlocked(matchId);

  const { data: before } = await supabaseAdmin
    .from("goals")
    .select("*")
    .eq("id", goalId)
    .eq("match_id", matchId)
    .maybeSingle();
  if (!before) throw new Error("But introuvable pour ce match.");

  const { error } = await supabaseAdmin
    .from("goals")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", goalId)
    .eq("match_id", matchId);
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
