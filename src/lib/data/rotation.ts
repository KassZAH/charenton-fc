import "server-only";
import { supabaseAdmin } from "@/lib/supabase/server";
import { requireFreshCoach } from "@/lib/auth/current-user";
import { getActivePlayers } from "./players";
import { getMatchAvailabilitySummary } from "./availability";

/**
 * Roadmap V3, Macro-release B (Lot 21) — rotation équitable et fiabilité positive. Jamais de
 * score de valeur stocké ou public : tout est recalculé à la demande, réservé au coach (suggestion
 * de rotation, tendances collectives) ou au joueur concerné + coachs (signaux de fiabilité).
 */

/** Vrai si l'écart disponibilité/sélection sur la période dépasse le seuil — fonction pure, testable sans base. */
export function isOverlooked(recentAvailableCount: number, recentPlayedCount: number, minGap = 2): boolean {
  return recentAvailableCount - recentPlayedCount >= minGap;
}

export function buildRotationReason(playerName: string, lookback: number, playedCount: number): string {
  return `${playerName} était disponible lors des ${lookback} derniers matchs, mais n'a joué que ${playedCount} fois.`;
}

/** % de réponses arrivées à temps sur l'échantillon fourni — null si aucune réponse (pas 0, pour ne jamais laisser croire à un mauvais signal sans donnée). */
export function computeRespondsOnTimeRate(responses: { lateResponse: boolean }[]): number | null {
  if (responses.length === 0) return null;
  const onTime = responses.filter((r) => !r.lateResponse).length;
  return Math.round((onTime / responses.length) * 100);
}

/** % de fois où une réponse "présent" a effectivement débouché sur une présence en feuille de match. */
export function computePresenceConsistency(presentResponses: { playedMatch: boolean }[]): number | null {
  if (presentResponses.length === 0) return null;
  const followed = presentResponses.filter((r) => r.playedMatch).length;
  return Math.round((followed / presentResponses.length) * 100);
}

async function getRecentCompletedMatchIds(lookback: number): Promise<string[]> {
  const { data, error } = await supabaseAdmin
    .from("matches")
    .select("id")
    .eq("status", "completed")
    .is("deleted_at", null)
    .order("match_date", { ascending: false })
    .limit(lookback);
  if (error) throw new Error(error.message);
  return (data ?? []).map((m) => m.id);
}

export type RotationSuggestion = {
  playerId: string;
  playerName: string;
  recentAvailableCount: number;
  recentPlayedCount: number;
  reason: string;
};

/**
 * Réservé au coach (jamais affiché aux joueurs, jamais un classement) — suggestion expliquée,
 * le coach reste décisionnaire (aucune sélection automatique). Exclut les joueurs non disponibles
 * pour CE match (répondu autre chose que "présent", ou pas encore répondu) : suggérer un joueur
 * qui n'est pas disponible n'a pas de sens.
 */
export async function getRotationSuggestions(matchId: string, lookback = 5): Promise<RotationSuggestion[]> {
  await requireFreshCoach();
  return computeRotationSuggestions(matchId, lookback);
}

/**
 * Cœur logique séparé de la garde requireFreshCoach() ci-dessus (indisponible hors requête
 * Next.js — même limite que requireAdmin() pour live-match/match-lifecycle, voir leurs tests
 * d'intégration) : exporté séparément pour être testable directement contre la base isolée.
 */
export async function computeRotationSuggestions(matchId: string, lookback = 5): Promise<RotationSuggestion[]> {
  const [players, recentMatchIds, currentSummary] = await Promise.all([
    getActivePlayers(),
    getRecentCompletedMatchIds(lookback),
    getMatchAvailabilitySummary(matchId),
  ]);
  if (recentMatchIds.length === 0) return [];

  const availableForThisMatch = new Set(
    currentSummary.filter((a) => a.status === "present").map((a) => a.player.id)
  );
  if (availableForThisMatch.size === 0) return [];

  const [{ data: availRows, error: availError }, { data: playedRows, error: playedError }] = await Promise.all([
    supabaseAdmin.from("availability").select("player_id").in("match_id", recentMatchIds).eq("status", "present"),
    supabaseAdmin.from("match_players").select("player_id").in("match_id", recentMatchIds),
  ]);
  if (availError) throw new Error(availError.message);
  if (playedError) throw new Error(playedError.message);

  const availableCountByPlayer = new Map<string, number>();
  for (const row of availRows ?? []) availableCountByPlayer.set(row.player_id, (availableCountByPlayer.get(row.player_id) ?? 0) + 1);
  const playedCountByPlayer = new Map<string, number>();
  for (const row of playedRows ?? []) {
    if (!row.player_id) continue;
    playedCountByPlayer.set(row.player_id, (playedCountByPlayer.get(row.player_id) ?? 0) + 1);
  }

  const suggestions: RotationSuggestion[] = [];
  for (const player of players) {
    if (!availableForThisMatch.has(player.id)) continue;
    const recentAvailableCount = availableCountByPlayer.get(player.id) ?? 0;
    const recentPlayedCount = playedCountByPlayer.get(player.id) ?? 0;
    if (isOverlooked(recentAvailableCount, recentPlayedCount)) {
      const playerName = player.nickname || player.first_name;
      suggestions.push({
        playerId: player.id,
        playerName,
        recentAvailableCount,
        recentPlayedCount,
        reason: buildRotationReason(playerName, recentMatchIds.length, recentPlayedCount),
      });
    }
  }

  return suggestions.sort(
    (a, b) => b.recentAvailableCount - b.recentPlayedCount - (a.recentAvailableCount - a.recentPlayedCount)
  );
}

export type ReliabilitySignals = {
  respondsOnTimeRate: number | null;
  presenceConsistencyRate: number | null;
};

/**
 * Signaux privés (Lot 19/21) : jamais une note publique. Visibilité à contrôler par l'appelant
 * (joueur concerné + coachs uniquement), même principe que les autres lectures ciblées par joueur
 * de ce dépôt (measurements, goals...).
 */
export async function getPlayerReliabilitySignals(playerId: string, lookback = 8): Promise<ReliabilitySignals> {
  const recentMatchIds = await getRecentCompletedMatchIds(lookback);
  if (recentMatchIds.length === 0) return { respondsOnTimeRate: null, presenceConsistencyRate: null };

  const { data: rows, error } = await supabaseAdmin
    .from("availability")
    .select("match_id, status, late_response, first_responded_at")
    .eq("player_id", playerId)
    .in("match_id", recentMatchIds);
  if (error) throw new Error(error.message);

  const responded = (rows ?? []).filter((r) => r.first_responded_at);
  const respondsOnTimeRate = computeRespondsOnTimeRate(responded.map((r) => ({ lateResponse: !!r.late_response })));

  const presentRows = (rows ?? []).filter((r) => r.status === "present");
  let presenceConsistencyRate: number | null = null;
  if (presentRows.length > 0) {
    const { data: playedRows, error: playedError } = await supabaseAdmin
      .from("match_players")
      .select("match_id")
      .eq("player_id", playerId)
      .in("match_id", presentRows.map((r) => r.match_id));
    if (playedError) throw new Error(playedError.message);
    const playedSet = new Set((playedRows ?? []).map((r) => r.match_id));
    presenceConsistencyRate = computePresenceConsistency(presentRows.map((r) => ({ playedMatch: playedSet.has(r.match_id) })));
  }

  return { respondsOnTimeRate, presenceConsistencyRate };
}

export type CaptainSuggestion = {
  playerId: string;
  playerName: string;
  reason: string;
};

/**
 * Suggestion facultative de rotation du capitanat (§7.3, roadmap V2 ; Lot 24) — parmi les
 * joueurs disponibles pour CE match, celui qui a été capitaine le moins souvent récemment.
 * Jamais assigné automatiquement : setCaptain() reste un geste explicite du coach.
 */
export async function getCaptainSuggestion(matchId: string, lookback = 5): Promise<CaptainSuggestion | null> {
  await requireFreshCoach();
  return computeCaptainSuggestion(matchId, lookback);
}

/** Cœur logique séparé de la garde requireFreshCoach() — voir computeRotationSuggestions ci-dessus. */
export async function computeCaptainSuggestion(matchId: string, lookback = 5): Promise<CaptainSuggestion | null> {
  const [recentMatchIds, currentSummary] = await Promise.all([
    getRecentCompletedMatchIds(lookback),
    getMatchAvailabilitySummary(matchId),
  ]);

  const availableForThisMatch = currentSummary.filter((a) => a.status === "present");
  if (availableForThisMatch.length === 0) return null;

  let captainCounts = new Map<string, number>();
  if (recentMatchIds.length > 0) {
    const { data: rows, error } = await supabaseAdmin
      .from("matches")
      .select("captain_player_id")
      .in("id", recentMatchIds)
      .not("captain_player_id", "is", null);
    if (error) throw new Error(error.message);
    captainCounts = new Map();
    for (const row of rows ?? []) {
      if (!row.captain_player_id) continue;
      captainCounts.set(row.captain_player_id, (captainCounts.get(row.captain_player_id) ?? 0) + 1);
    }
  }

  const sorted = [...availableForThisMatch].sort(
    (a, b) => (captainCounts.get(a.player.id) ?? 0) - (captainCounts.get(b.player.id) ?? 0)
  );
  const chosen = sorted[0];
  const chosenCount = captainCounts.get(chosen.player.id) ?? 0;
  const playerName = chosen.player.nickname || chosen.player.first_name;

  return {
    playerId: chosen.player.id,
    playerName,
    reason:
      chosenCount === 0
        ? `${playerName} n'a pas été capitaine lors des ${lookback} derniers matchs.`
        : `${playerName} a été capitaine ${chosenCount} fois sur les ${lookback} derniers matchs, moins souvent que les autres joueurs disponibles.`,
  };
}

export type CollectiveResponseTrend = {
  matchesConsidered: number;
  onTimeRate: number | null;
};

/** Tendance collective (jamais nominative) — réservée au coach. */
export async function getCollectiveResponseTrend(lookback = 8): Promise<CollectiveResponseTrend> {
  await requireFreshCoach();
  return computeCollectiveResponseTrend(lookback);
}

/** Cœur logique séparé de la garde requireFreshCoach() — voir computeRotationSuggestions ci-dessus. */
export async function computeCollectiveResponseTrend(lookback = 8): Promise<CollectiveResponseTrend> {
  const recentMatchIds = await getRecentCompletedMatchIds(lookback);
  if (recentMatchIds.length === 0) return { matchesConsidered: 0, onTimeRate: null };

  const { data: rows, error } = await supabaseAdmin
    .from("availability")
    .select("late_response")
    .in("match_id", recentMatchIds)
    .not("first_responded_at", "is", null);
  if (error) throw new Error(error.message);

  return {
    matchesConsidered: recentMatchIds.length,
    onTimeRate: computeRespondsOnTimeRate((rows ?? []).map((r) => ({ lateResponse: !!r.late_response }))),
  };
}
