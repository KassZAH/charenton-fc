"use server";

import { revalidatePath } from "next/cache";
import type { SupabaseClient } from "@supabase/supabase-js";
import { requireAdmin } from "@/lib/auth/current-user";
import { supabaseAdmin } from "@/lib/supabase/server";
import { assertMatchSeasonUnlocked } from "./season-lock";
import { checkAndAwardBadges } from "./badges";

const untypedDb = supabaseAdmin as unknown as SupabaseClient;

export type BatchGoalEntry = { playerId: string | null; count: number };

export type BatchGoalPayload = {
  idempotencyKey: string;
  scorerEntries: { playerId: string | null; isUnknownScorer: boolean; count: number }[];
  cscAdverseCount: number;
  cscCharentonEntries: BatchGoalEntry[];
  assistEntries: BatchGoalEntry[];
  opponentScore: number;
};

/**
 * Saisie groupée transactionnelle (roadmap V3, Lot 18) — un seul appel RPC,
 * jamais de score resaisi séparément des buts. Idempotente : la même
 * idempotencyKey envoyée deux fois (double soumission) ne duplique rien.
 */
export async function insertGoalsBatch(matchId: string, payload: BatchGoalPayload) {
  const user = await requireAdmin();
  await assertMatchSeasonUnlocked(matchId);

  const { data, error } = await untypedDb.rpc("insert_goals_batch", {
    p_match_id: matchId,
    p_idempotency_key: payload.idempotencyKey,
    p_scorer_entries: payload.scorerEntries.map((e) => ({ player_id: e.playerId, is_unknown_scorer: e.isUnknownScorer, count: e.count })),
    p_csc_adverse_count: payload.cscAdverseCount,
    p_csc_charenton_entries: payload.cscCharentonEntries.map((e) => ({ player_id: e.playerId, count: e.count })),
    p_assist_entries: payload.assistEntries.map((e) => ({ player_id: e.playerId, count: e.count })),
    p_opponent_score: payload.opponentScore,
    p_changed_by_player_id: user.playerId,
    p_changed_by_name: user.name,
  });
  if (error) throw new Error(error.message);

  try {
    const scoredPlayerIds = [...payload.scorerEntries, ...payload.cscCharentonEntries, ...payload.assistEntries]
      .map((e) => e.playerId)
      .filter((id): id is string => !!id);
    await Promise.all([...new Set(scoredPlayerIds)].map((id) => checkAndAwardBadges(id)));
  } catch {
    // les badges sont secondaires — une erreur ici ne doit pas faire échouer la saisie
  }

  revalidatePath(`/matches/${matchId}`);
  revalidatePath("/stats");
  revalidatePath("/");

  const row = (data as { result_batch_id: string; result_inserted_count: number; result_team_score: number }[])[0];
  return { batchId: row.result_batch_id, insertedCount: row.result_inserted_count, teamScore: row.result_team_score };
}

/** Annule intégralement un lot de saisie groupée — restaure l'état précédent (match_scheduled, score vidé). */
export async function cancelGoalsBatch(matchId: string, batchId: string) {
  const user = await requireAdmin();
  await assertMatchSeasonUnlocked(matchId);

  const { error } = await untypedDb.rpc("cancel_goals_batch", {
    p_match_id: matchId,
    p_batch_id: batchId,
    p_changed_by_player_id: user.playerId,
    p_changed_by_name: user.name,
  });
  if (error) throw new Error(error.message);

  revalidatePath(`/matches/${matchId}`);
  revalidatePath("/stats");
  revalidatePath("/");
}
