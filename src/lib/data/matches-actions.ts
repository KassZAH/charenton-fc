"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdmin, requireUser } from "@/lib/auth/current-user";
import { supabaseAdmin } from "@/lib/supabase/server";
import { logChange } from "./audit";
import { syncActiveInjuriesToUpcomingMatches } from "./injuries-actions";
import { getMatchRoster } from "./roster";
import { getMatchLineup } from "./lineup";
import { getMatchEquipment } from "./equipment";
import { getActiveInjuriesByPlayerId, injuryReturnLabelForDate } from "./injuries";
import { assertMatchSeasonUnlocked } from "./season-lock";
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
  const meetingTime = String(formData.get("meeting_time") ?? "") || null;
  const location = String(formData.get("location") ?? "") || null;
  const address = String(formData.get("address") ?? "").trim() || null;
  const mapsUrl = String(formData.get("maps_url") ?? "").trim() || null;
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
      meeting_time: meetingTime,
      location,
      address,
      maps_url: mapsUrl,
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
  await assertMatchSeasonUnlocked(matchId);

  const matchDate = String(formData.get("match_date") ?? "");
  const kickoffTime = String(formData.get("kickoff_time") ?? "") || null;
  const meetingTime = String(formData.get("meeting_time") ?? "") || null;
  const location = String(formData.get("location") ?? "") || null;
  const address = String(formData.get("address") ?? "").trim() || null;
  const mapsUrl = String(formData.get("maps_url") ?? "").trim() || null;
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
      meeting_time: meetingTime,
      location,
      address,
      maps_url: mapsUrl,
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
  await assertMatchSeasonUnlocked(matchId);

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
  await assertMatchSeasonUnlocked(matchId);

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

export async function setCaptain(matchId: string, formData: FormData) {
  await requireAdmin();
  await assertMatchSeasonUnlocked(matchId);
  const playerId = String(formData.get("captain_player_id") ?? "") || null;

  const { error } = await supabaseAdmin.from("matches").update({ captain_player_id: playerId }).eq("id", matchId);
  if (error) throw new Error(error.message);

  revalidatePath(`/matches/${matchId}`);
}

/**
 * "Rejouer contre cet adversaire" : crée un nouveau match avec le même adversaire, terrain,
 * horaires et type — seule la date change. Les présents/composition/matériel/capitaine du
 * match source peuvent être repris en option, jamais le covoiturage (propre à chaque match).
 */
export async function duplicateMatch(sourceMatchId: string, formData: FormData) {
  await requireAdmin();

  const matchDate = String(formData.get("match_date") ?? "");
  if (!matchDate) throw new Error("La date du nouveau match est obligatoire.");

  const reuseRoster = formData.get("reuse_roster") === "on";
  const reuseLineup = formData.get("reuse_lineup") === "on";
  const reuseEquipment = formData.get("reuse_equipment") === "on";
  const reuseCaptain = formData.get("reuse_captain") === "on";

  const { data: source, error: sourceError } = await supabaseAdmin
    .from("matches")
    .select("*")
    .eq("id", sourceMatchId)
    .maybeSingle();
  if (sourceError) throw new Error(sourceError.message);
  if (!source) throw new Error("Match introuvable.");

  const { data: activeSeason } = await supabaseAdmin
    .from("seasons")
    .select("id")
    .eq("is_active", true)
    .maybeSingle();

  const { data: newMatch, error } = await supabaseAdmin
    .from("matches")
    .insert({
      match_date: matchDate,
      kickoff_time: source.kickoff_time,
      meeting_time: source.meeting_time,
      location: source.location,
      address: source.address,
      maps_url: source.maps_url,
      home_or_away: source.home_or_away,
      match_type: source.match_type,
      opponent_id: source.opponent_id,
      season_id: activeSeason?.id ?? null,
      captain_player_id: reuseCaptain ? source.captain_player_id : null,
      status: "scheduled",
    })
    .select("id")
    .single();
  if (error) throw new Error(error.message);

  // La duplication touche plusieurs tables à la suite (disponibilités, composition, matériel) —
  // pas de vraie transaction possible ici (logique d'éligibilité calculée côté JS), donc en cas
  // d'échec d'une étape on supprime le match tout juste créé plutôt que de laisser un match
  // "fantôme" à moitié dupliqué.
  try {
    if (reuseRoster) {
      const [roster, activeInjuriesByPlayerId] = await Promise.all([
        getMatchRoster(sourceMatchId),
        getActiveInjuriesByPlayerId(),
      ]);
      // On ne marque pas présent un joueur actuellement blessé pour la période du nouveau match —
      // sa blessure prévaut, il sera de toute façon re-couvert par syncActiveInjuriesToUpcomingMatches.
      const eligible = roster.filter(
        (playerId) => injuryReturnLabelForDate(activeInjuriesByPlayerId.get(playerId), matchDate) === null
      );
      if (eligible.length > 0) {
        const { error: availError } = await supabaseAdmin.from("availability").upsert(
          eligible.map((playerId) => ({
            match_id: newMatch.id,
            player_id: playerId,
            status: "present" as const,
            injury_id: null,
          })),
          { onConflict: "match_id,player_id" }
        );
        if (availError) throw new Error(availError.message);
      }
    }

    if (reuseLineup) {
      const lineup = await getMatchLineup(sourceMatchId);
      if (lineup) {
        const { error: lineupError } = await supabaseAdmin
          .from("match_lineups")
          .insert({ match_id: newMatch.id, formation: lineup.formation, positions: lineup.positions });
        if (lineupError) throw new Error(lineupError.message);
      }
    }

    if (reuseEquipment) {
      const items = await getMatchEquipment(sourceMatchId);
      if (items.length > 0) {
        const { error: equipmentError } = await supabaseAdmin
          .from("match_equipment_items")
          .insert(items.map((item) => ({ match_id: newMatch.id, label: item.label })));
        if (equipmentError) throw new Error(equipmentError.message);
      }
    }
  } catch (err) {
    await supabaseAdmin.from("matches").delete().eq("id", newMatch.id);
    throw err;
  }

  await syncActiveInjuriesToUpcomingMatches();

  revalidatePath("/matches");
  redirect(`/matches/${newMatch.id}`);
}
