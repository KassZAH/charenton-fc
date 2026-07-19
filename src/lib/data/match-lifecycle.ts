"use server";

import { revalidatePath } from "next/cache";
import type { SupabaseClient } from "@supabase/supabase-js";
import { requireAdmin } from "@/lib/auth/current-user";
import { supabaseAdmin } from "@/lib/supabase/server";
import { logChange } from "./audit";
import { assertMatchSeasonUnlocked } from "./season-lock";
import { isTransitionAllowed } from "./match-lifecycle-rules";
import type { MatchStatus } from "@/types/models";

/** started_at/completion_status (Lot 14) n'existent pas encore dans les types générés (projet isolé uniquement pour l'instant). */
const untypedDb = supabaseAdmin as unknown as SupabaseClient;

/**
 * Transition générique de statut (hors 'completed', qui passe par
 * updateMatchResult avec un score — voir matches-actions.ts). Idempotente :
 * rejouer la même transition (double-clic, double soumission) ne fait rien
 * et ne lève jamais d'erreur.
 */
export async function transitionMatchStatus(matchId: string, newStatus: Exclude<MatchStatus, "completed">) {
  const user = await requireAdmin();
  await assertMatchSeasonUnlocked(matchId);

  const { data: match, error: fetchError } = await untypedDb
    .from("matches")
    .select("status, started_at")
    .eq("id", matchId)
    .maybeSingle();
  if (fetchError) throw new Error(fetchError.message);
  if (!match) throw new Error("Match introuvable.");

  const currentStatus = match.status as MatchStatus;
  if (currentStatus === newStatus) return;

  if (!isTransitionAllowed(currentStatus, newStatus)) {
    throw new Error(`Transition refusée : ${currentStatus} → ${newStatus}.`);
  }

  const patch: { status: MatchStatus; started_at?: string } = { status: newStatus };
  if (newStatus === "live" && !match.started_at) patch.started_at = new Date().toISOString();

  const { error } = await untypedDb.from("matches").update(patch).eq("id", matchId);
  if (error) throw new Error(error.message);

  await logChange({
    tableName: "matches",
    recordId: matchId,
    action: "update",
    oldData: { status: currentStatus },
    newData: patch,
    changedByPlayerId: user.playerId,
    changedByName: user.name,
  });

  revalidatePath(`/matches/${matchId}`);
  revalidatePath("/matches");
  revalidatePath("/");
}
