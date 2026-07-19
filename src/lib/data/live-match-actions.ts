"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { SupabaseClient } from "@supabase/supabase-js";
import { requireAdmin } from "@/lib/auth/current-user";
import { supabaseAdmin } from "@/lib/supabase/server";
import { logChange } from "./audit";
import { assertMatchSeasonUnlocked } from "./season-lock";
import { isTransitionAllowed } from "./match-lifecycle-rules";
import { getMatchGoals } from "./goals";
import { formatTime } from "@/lib/format";
import { currentTimeString } from "@/lib/clock";
import type { MatchStatus } from "@/types/models";

/** started_at/ended_at/completion_status (Lot 14) n'existent pas encore dans les types générés (projet isolé uniquement pour l'instant). */
const untypedDb = supabaseAdmin as unknown as SupabaseClient;

/** Démarre le match (scheduled/postponed -> live) puis ouvre directement l'écran Match en cours. */
export async function startMatch(matchId: string) {
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
  if (currentStatus !== "live") {
    if (!isTransitionAllowed(currentStatus, "live")) {
      throw new Error(`Transition refusée : ${currentStatus} → live.`);
    }
    const patch: { status: MatchStatus; started_at?: string } = { status: "live" };
    if (!match.started_at) patch.started_at = new Date().toISOString();

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
  }

  redirect(`/matches/${matchId}/live`);
}

/**
 * Termine le match : le score final est calculé depuis les buts déjà
 * enregistrés en direct (jamais resaisi manuellement) — jamais de
 * divergence possible entre la chronologie et le score affiché.
 */
export async function finishMatch(matchId: string) {
  const user = await requireAdmin();
  await assertMatchSeasonUnlocked(matchId);

  const { data: match, error: fetchError } = await untypedDb
    .from("matches")
    .select("status, ended_at")
    .eq("id", matchId)
    .maybeSingle();
  if (fetchError) throw new Error(fetchError.message);
  if (!match) throw new Error("Match introuvable.");

  const currentStatus = match.status as MatchStatus;
  if (currentStatus === "completed") {
    redirect(`/matches/${matchId}`);
  }
  if (!isTransitionAllowed(currentStatus, "completed")) {
    throw new Error(`Transition refusée : ${currentStatus} → completed.`);
  }

  const goals = await getMatchGoals(matchId);
  const teamScore = goals.filter((g) => g.credited_to === "charenton").length;
  const opponentScore = goals.filter((g) => g.credited_to === "opponent").length;

  const patch: Record<string, unknown> = {
    status: "completed",
    team_score: teamScore,
    opponent_score: opponentScore,
    completion_status: "incomplete",
  };
  if (!match.ended_at) patch.ended_at = new Date().toISOString();

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

  redirect(`/matches/${matchId}`);
}

/**
 * Note libre pendant le live (roadmap V3, Lot 15) — ajoutée en tête du champ
 * description existant (jamais un nouveau concept de table pour un besoin
 * aussi minimal), horodatée, jamais une suppression du texte déjà présent.
 */
export async function addLiveNote(matchId: string, formData: FormData) {
  const user = await requireAdmin();
  await assertMatchSeasonUnlocked(matchId);

  const note = String(formData.get("note") ?? "").trim();
  if (!note) return;

  const { data: match } = await untypedDb.from("matches").select("description").eq("id", matchId).maybeSingle();
  const timestamped = `[${formatTime(currentTimeString())}] ${note}`;
  const description = match?.description ? `${timestamped}\n${match.description}` : timestamped;

  const { error } = await untypedDb.from("matches").update({ description }).eq("id", matchId);
  if (error) throw new Error(error.message);

  await logChange({
    tableName: "matches",
    recordId: matchId,
    action: "update",
    oldData: { description: match?.description ?? null },
    newData: { description },
    changedByPlayerId: user.playerId,
    changedByName: user.name,
  });

  revalidatePath(`/matches/${matchId}/live`);
  revalidatePath(`/matches/${matchId}`);
}
