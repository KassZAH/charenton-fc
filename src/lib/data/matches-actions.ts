"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdmin, requireUser } from "@/lib/auth/current-user";
import { supabaseAdmin } from "@/lib/supabase/server";
import type { AvailabilityStatus } from "@/types/models";

export async function createMatch(formData: FormData) {
  await requireAdmin();

  const matchDate = String(formData.get("match_date") ?? "");
  const kickoffTime = String(formData.get("kickoff_time") ?? "") || null;
  const location = String(formData.get("location") ?? "") || null;
  const homeOrAway = String(formData.get("home_or_away") ?? "home");
  const matchType = String(formData.get("match_type") ?? "") || null;
  const existingOpponentId = String(formData.get("opponent_id") ?? "") || null;
  const newOpponentName = String(formData.get("new_opponent_name") ?? "").trim();

  if (!matchDate) {
    throw new Error("La date du match est obligatoire.");
  }

  let opponentId = existingOpponentId;

  if (!opponentId && newOpponentName) {
    const { data: newOpponent, error: opponentError } = await supabaseAdmin
      .from("opponents")
      .insert({ name: newOpponentName })
      .select("id")
      .single();
    if (opponentError) throw new Error(opponentError.message);
    opponentId = newOpponent.id;
  }

  const { data: activeSeason } = await supabaseAdmin
    .from("seasons")
    .select("id")
    .eq("is_active", true)
    .maybeSingle();

  const { data: match, error } = await supabaseAdmin
    .from("matches")
    .insert({
      match_date: matchDate,
      kickoff_time: kickoffTime,
      location,
      home_or_away: homeOrAway,
      match_type: matchType,
      opponent_id: opponentId,
      season_id: activeSeason?.id ?? null,
      status: "scheduled",
    })
    .select("id")
    .single();

  if (error) throw new Error(error.message);

  revalidatePath("/matches");
  revalidatePath("/");
  redirect(`/matches/${match.id}`);
}

export async function updateMatchResult(matchId: string, formData: FormData) {
  await requireAdmin();

  const teamScore = Number(formData.get("team_score"));
  const opponentScore = Number(formData.get("opponent_score"));
  if (Number.isNaN(teamScore) || Number.isNaN(opponentScore)) {
    throw new Error("Scores invalides.");
  }

  const { error } = await supabaseAdmin
    .from("matches")
    .update({ team_score: teamScore, opponent_score: opponentScore, status: "completed" })
    .eq("id", matchId);
  if (error) throw new Error(error.message);

  revalidatePath(`/matches/${matchId}`);
  revalidatePath("/matches");
  revalidatePath("/");
}

const VALID_STATUSES: AvailabilityStatus[] = ["present", "unsure", "absent", "injured"];

export async function setAvailability(matchId: string, status: AvailabilityStatus) {
  const user = await requireUser();

  if (!VALID_STATUSES.includes(status)) {
    throw new Error("Statut invalide.");
  }

  const { data: existing, error: findError } = await supabaseAdmin
    .from("availability")
    .select("id")
    .eq("match_id", matchId)
    .eq("player_id", user.playerId)
    .maybeSingle();
  if (findError) throw new Error(findError.message);

  if (existing) {
    const { error } = await supabaseAdmin
      .from("availability")
      .update({ status, updated_at: new Date().toISOString() })
      .eq("id", existing.id);
    if (error) throw new Error(error.message);
  } else {
    const { error } = await supabaseAdmin
      .from("availability")
      .insert({ match_id: matchId, player_id: user.playerId, status });
    if (error) throw new Error(error.message);
  }

  revalidatePath(`/matches/${matchId}`);
  revalidatePath("/");
}
