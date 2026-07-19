"use server";

import { revalidatePath } from "next/cache";
import type { SupabaseClient } from "@supabase/supabase-js";
import { requireOwner } from "@/lib/auth/current-user";
import { supabaseAdmin } from "@/lib/supabase/server";
import { FlaStandingsProvider } from "@/lib/fla/fla-provider";
import type { ExternalStanding, SyncStatus } from "@/lib/fla/types";
import { recomputeOpponentMappings } from "./opponent-mappings";
import { getExternalStandings } from "./external-standings";

const untypedDb = supabaseAdmin as unknown as SupabaseClient;

/** Pas plus d'une synchronisation manuelle toutes les 15 minutes (roadmap V3, Lot 11.5, §9). */
const MIN_SYNC_INTERVAL_MS = 15 * 60 * 1000;

type SyncResult = { status: SyncStatus; rowsCount: number };

/**
 * Server Action réservée au propriétaire (requireOwner()). Récupère le
 * classement FLA côté serveur (jamais depuis le navigateur), valide le
 * résultat, puis persiste via la RPC transactionnelle
 * sync_external_standings_transactional — qui ne remplace le cache que sur
 * un statut "success" réel, jamais sur empty/unavailable/invalid_payload.
 */
export async function syncExternalStandingsAction(externalCompetitionId: string): Promise<SyncResult> {
  const user = await requireOwner();

  const { data: competition, error: competitionError } = await untypedDb
    .from("external_competitions")
    .select("*")
    .eq("id", externalCompetitionId)
    .maybeSingle();
  if (competitionError) throw new Error(competitionError.message);
  if (!competition) throw new Error("Compétition externe introuvable.");
  if (!competition.sync_enabled) throw new Error("Synchronisation désactivée pour cette compétition.");

  if (competition.last_synced_at) {
    const elapsedMs = Date.now() - new Date(competition.last_synced_at).getTime();
    if (elapsedMs < MIN_SYNC_INTERVAL_MS) {
      const remainingMin = Math.ceil((MIN_SYNC_INTERVAL_MS - elapsedMs) / 60000);
      throw new Error(`Synchronisation trop récente — réessaie dans ${remainingMin} min.`);
    }
  }

  let rpcParams: {
    p_status: SyncStatus;
    p_standings: unknown;
    p_error_message: string | null;
  };

  if (competition.provider !== "fla") {
    throw new Error(`Fournisseur non pris en charge : ${competition.provider}`);
  }

  const result = await FlaStandingsProvider.fetchStandings(
    competition.external_championship_id,
    competition.external_season_id
  );

  if (result.status === "success") {
    rpcParams = {
      p_status: "success",
      p_standings: result.standings.map((s) => ({
        external_team_id: s.externalTeamId,
        team_name: s.teamName,
        normalized_team_name: s.normalizedTeamName,
        position: s.position,
        played: s.played,
        wins: s.wins,
        draws: s.draws,
        losses: s.losses,
        goals_for: s.goalsFor,
        goals_against: s.goalsAgainst,
        goal_difference: s.goalDifference,
        points: s.points,
      })),
      p_error_message: null,
    };
  } else if (result.status === "empty") {
    rpcParams = { p_status: "empty", p_standings: null, p_error_message: null };
  } else {
    // unavailable | invalid_payload — jamais le contenu brut, uniquement le message technique court déjà produit par le provider.
    rpcParams = { p_status: result.status, p_standings: null, p_error_message: result.errorMessage };
  }

  const { data, error } = await untypedDb.rpc("sync_external_standings_transactional", {
    p_external_competition_id: externalCompetitionId,
    p_status: rpcParams.p_status,
    p_standings: rpcParams.p_standings,
    p_error_message: rpcParams.p_error_message,
    p_changed_by_player_id: user.playerId,
    p_changed_by_name: user.name,
  });
  if (error) throw new Error(error.message);

  const row = (data as { result_status: SyncStatus; result_rows_count: number }[])[0];

  if (row.result_status === "success") {
    const standings: ExternalStanding[] = await getExternalStandings(externalCompetitionId);
    await recomputeOpponentMappings(externalCompetitionId, standings);
  }

  revalidatePath("/stats");
  revalidatePath("/matches");

  return { status: row.result_status, rowsCount: row.result_rows_count };
}
