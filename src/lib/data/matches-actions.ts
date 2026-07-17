"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdmin, requireUser } from "@/lib/auth/current-user";
import { supabaseAdmin } from "@/lib/supabase/server";
import { logChange } from "./audit";
import { syncActiveInjuriesToUpcomingMatches } from "./injuries-actions";
import type { AvailabilityStatus } from "@/types/models";

async function resolveOpponentId(formData: FormData): Promise<string | null> {
  const existingOpponentId = String(formData.get("opponent_id") ?? "") || null;
  const newOpponentName = String(formData.get("new_opponent_name") ?? "").trim();

  if (existingOpponentId) return existingOpponentId;
  if (!newOpponentName) return null;

  const { data: newOpponent, error } = await supabaseAdmin
    .from("opponents")
    .insert({ name: newOpponentName })
    .select("id")
    .single();
  if (error) throw new Error(error.message);
  return newOpponent.id;
}

export type BulkMatchRow = { opponentId: string | null; newOpponentName: string; date: string };

/** Création rapide de plusieurs matchs (adversaire + date seulement) ; heure/lieu se complètent plus tard. */
export async function createMatchesBulk(rows: BulkMatchRow[]) {
  await requireAdmin();

  const valid = rows.filter((r) => r.date && (r.opponentId || r.newOpponentName.trim()));
  if (valid.length === 0) {
    throw new Error("Ajoute au moins un match avec une date et un adversaire.");
  }

  const { data: activeSeason } = await supabaseAdmin
    .from("seasons")
    .select("id")
    .eq("is_active", true)
    .maybeSingle();

  const newOpponentCache = new Map<string, string>();

  for (const row of valid) {
    let opponentId = row.opponentId;
    const name = row.newOpponentName.trim();

    if (!opponentId && name) {
      if (newOpponentCache.has(name)) {
        opponentId = newOpponentCache.get(name)!;
      } else {
        const { data: newOpponent, error } = await supabaseAdmin
          .from("opponents")
          .insert({ name })
          .select("id")
          .single();
        if (error) throw new Error(error.message);
        opponentId = newOpponent.id;
        newOpponentCache.set(name, opponentId);
      }
    }

    const { error } = await supabaseAdmin.from("matches").insert({
      match_date: row.date,
      opponent_id: opponentId,
      season_id: activeSeason?.id ?? null,
      status: "scheduled",
      match_type: "championnat",
      home_or_away: "home",
    });
    if (error) throw new Error(error.message);
  }

  await syncActiveInjuriesToUpcomingMatches();

  revalidatePath("/matches");
  revalidatePath("/");
  redirect("/matches");
}

export async function createMatch(formData: FormData) {
  await requireAdmin();

  const matchDate = String(formData.get("match_date") ?? "");
  const kickoffTime = String(formData.get("kickoff_time") ?? "") || null;
  const location = String(formData.get("location") ?? "") || null;
  const homeOrAway = String(formData.get("home_or_away") ?? "home");
  const matchType = String(formData.get("match_type") ?? "") || null;

  if (!matchDate) {
    throw new Error("La date du match est obligatoire.");
  }

  const opponentId = await resolveOpponentId(formData);

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

  await syncActiveInjuriesToUpcomingMatches();

  revalidatePath("/matches");
  revalidatePath("/");
  redirect(`/matches/${match.id}`);
}

export async function updateMatchDetails(matchId: string, formData: FormData) {
  await requireAdmin();

  const matchDate = String(formData.get("match_date") ?? "");
  const kickoffTime = String(formData.get("kickoff_time") ?? "") || null;
  const location = String(formData.get("location") ?? "") || null;
  const homeOrAway = String(formData.get("home_or_away") ?? "home");
  const matchType = String(formData.get("match_type") ?? "") || null;
  const description = String(formData.get("description") ?? "").trim() || null;

  if (!matchDate) {
    throw new Error("La date du match est obligatoire.");
  }

  const opponentId = await resolveOpponentId(formData);

  const { error } = await supabaseAdmin
    .from("matches")
    .update({
      match_date: matchDate,
      kickoff_time: kickoffTime,
      location,
      home_or_away: homeOrAway,
      match_type: matchType,
      opponent_id: opponentId,
      description,
    })
    .eq("id", matchId);
  if (error) throw new Error(error.message);

  revalidatePath(`/matches/${matchId}`);
  revalidatePath("/matches");
  revalidatePath("/");
  redirect(`/matches/${matchId}`);
}

export async function deleteMatch(matchId: string) {
  await requireAdmin();

  const { error } = await supabaseAdmin
    .from("matches")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", matchId);
  if (error) throw new Error(error.message);

  revalidatePath("/matches");
  revalidatePath("/");
  redirect("/matches");
}

export async function updateMatchResult(matchId: string, formData: FormData) {
  const user = await requireAdmin();

  const teamScore = Number(formData.get("team_score"));
  const opponentScore = Number(formData.get("opponent_score"));
  if (Number.isNaN(teamScore) || Number.isNaN(opponentScore)) {
    throw new Error("Scores invalides.");
  }

  const { data: before } = await supabaseAdmin
    .from("matches")
    .select("team_score, opponent_score, status")
    .eq("id", matchId)
    .maybeSingle();

  const { error } = await supabaseAdmin
    .from("matches")
    .update({ team_score: teamScore, opponent_score: opponentScore, status: "completed" })
    .eq("id", matchId);
  if (error) throw new Error(error.message);

  await logChange({
    tableName: "matches",
    recordId: matchId,
    action: "update",
    oldData: before,
    newData: { team_score: teamScore, opponent_score: opponentScore, status: "completed" },
    changedByPlayerId: user.playerId,
    changedByName: user.name,
  });

  revalidatePath(`/matches/${matchId}`);
  revalidatePath("/matches");
  revalidatePath("/");
}

const VALID_STATUSES: AvailabilityStatus[] = ["present", "uncertain", "absent", "injured"];

async function upsertAvailability(matchId: string, playerId: string, status: AvailabilityStatus) {
  if (!VALID_STATUSES.includes(status)) {
    throw new Error("Statut invalide.");
  }

  const { data: existing, error: findError } = await supabaseAdmin
    .from("availability")
    .select("id")
    .eq("match_id", matchId)
    .eq("player_id", playerId)
    .maybeSingle();
  if (findError) throw new Error(findError.message);

  if (existing) {
    // injury_id remis à zéro : un statut posé à la main n'est plus rattaché à la
    // blessure qui l'avait éventuellement pré-rempli (voir resolveInjuredPresence
    // pour le cas "je joue quand même malgré la blessure", qui repasse par ici).
    const { error } = await supabaseAdmin
      .from("availability")
      .update({ status, updated_at: new Date().toISOString(), injury_id: null })
      .eq("id", existing.id);
    if (error) throw new Error(error.message);
  } else {
    const { error } = await supabaseAdmin
      .from("availability")
      .insert({ match_id: matchId, player_id: playerId, status, injury_id: null });
    if (error) throw new Error(error.message);
  }

  revalidatePath(`/matches/${matchId}`);
  revalidatePath("/");
}

export async function setAvailability(matchId: string, status: AvailabilityStatus) {
  const user = await requireUser();
  await upsertAvailability(matchId, user.playerId, status);
}

/** Permet à l'admin de corriger la réponse d'un autre joueur (désistement, erreur, etc.). */
export async function setAvailabilityAsAdmin(
  matchId: string,
  playerId: string,
  status: AvailabilityStatus
) {
  await requireAdmin();
  await upsertAvailability(matchId, playerId, status);
}
