"use server";

import { revalidatePath } from "next/cache";
import type { SupabaseClient } from "@supabase/supabase-js";
import { requireAdmin } from "@/lib/auth/current-user";
import { supabaseAdmin } from "@/lib/supabase/server";
import { assertMatchSeasonUnlocked } from "./season-lock";

const untypedDb = supabaseAdmin as unknown as SupabaseClient;

function readSquadForm(formData: FormData) {
  return {
    calledUp: [...new Set(formData.getAll("called_up_player_id").map(String))],
    waitlist: [...new Set(formData.getAll("waitlist_player_id").map(String))],
    plannedGoalkeeper: String(formData.get("planned_goalkeeper_player_id") ?? "") || null,
  };
}

async function callSetMatchSquad(matchId: string, formData: FormData, publish: boolean) {
  const user = await requireAdmin();
  await assertMatchSeasonUnlocked(matchId);

  const { calledUp, waitlist, plannedGoalkeeper } = readSquadForm(formData);

  const { error } = await untypedDb.rpc("set_match_squad", {
    p_match_id: matchId,
    p_called_up_player_ids: calledUp,
    p_waitlist_player_ids: waitlist,
    p_planned_goalkeeper_player_id: plannedGoalkeeper,
    p_publish: publish,
    p_changed_by_player_id: user.playerId,
    p_changed_by_name: user.name,
  });
  if (error) throw new Error(error.message);

  revalidatePath(`/matches/${matchId}`);
  revalidatePath("/");
}

/** Enregistre un brouillon — modifiable librement tant que non publié. */
export async function saveMatchSquadDraft(matchId: string, formData: FormData) {
  await callSetMatchSquad(matchId, formData, false);
}

/** Publie et verrouille le groupe convoqué en une seule action (roadmap V3, Lot 17). */
export async function publishMatchSquad(matchId: string, formData: FormData) {
  await callSetMatchSquad(matchId, formData, true);
}

export async function unlockMatchSquad(matchId: string) {
  const user = await requireAdmin();
  await assertMatchSeasonUnlocked(matchId);

  const { error } = await untypedDb.rpc("unlock_match_squad", {
    p_match_id: matchId,
    p_changed_by_player_id: user.playerId,
    p_changed_by_name: user.name,
  });
  if (error) throw new Error(error.message);

  revalidatePath(`/matches/${matchId}`);
}
