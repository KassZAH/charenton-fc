import "server-only";
import { supabaseAdmin } from "@/lib/supabase/server";
import { attachOpponents, type MatchWithOpponent } from "./matches";
import { getActiveAwards } from "./awards";
import type { Award } from "@/types/models";

export type PlayerStats = {
  matchesPlayed: number;
  goals: number;
  assists: number;
  yellowCards: number;
  redCards: number;
};

/** Recalculé à la volée depuis goals, cards et match_players — jamais stocké. */
export async function getPlayerStats(playerId: string): Promise<PlayerStats> {
  const [goalsRes, assistsRes, presenceRes, yellowRes, redRes] = await Promise.all([
    supabaseAdmin
      .from("goals")
      .select("*", { count: "exact", head: true })
      .eq("scorer_player_id", playerId)
      .eq("credited_to", "charenton")
      .is("deleted_at", null),
    supabaseAdmin
      .from("goals")
      .select("*", { count: "exact", head: true })
      .eq("assist_player_id", playerId)
      .eq("credited_to", "charenton")
      .is("deleted_at", null),
    supabaseAdmin
      .from("match_players")
      .select("*", { count: "exact", head: true })
      .eq("player_id", playerId)
      .eq("was_present", true),
    supabaseAdmin
      .from("cards")
      .select("*", { count: "exact", head: true })
      .eq("player_id", playerId)
      .eq("card_type", "yellow")
      .is("deleted_at", null),
    supabaseAdmin
      .from("cards")
      .select("*", { count: "exact", head: true })
      .eq("player_id", playerId)
      .eq("card_type", "red")
      .is("deleted_at", null),
  ]);

  if (goalsRes.error) throw new Error(goalsRes.error.message);
  if (assistsRes.error) throw new Error(assistsRes.error.message);
  if (presenceRes.error) throw new Error(presenceRes.error.message);
  if (yellowRes.error) throw new Error(yellowRes.error.message);
  if (redRes.error) throw new Error(redRes.error.message);

  return {
    goals: goalsRes.count ?? 0,
    assists: assistsRes.count ?? 0,
    matchesPlayed: presenceRes.count ?? 0,
    yellowCards: yellowRes.count ?? 0,
    redCards: redRes.count ?? 0,
  };
}

export type PlayerAdvancedStats = {
  presenceRate: number;
  winRateWhenPresent: number;
  braces: number;
  hatTricks: number;
  goalAndAssistMatches: number;
  goalsPerMatch: number;
  assistsPerMatch: number;
};

const EMPTY_ADVANCED_STATS: PlayerAdvancedStats = {
  presenceRate: 0,
  winRateWhenPresent: 0,
  braces: 0,
  hatTricks: 0,
  goalAndAssistMatches: 0,
  goalsPerMatch: 0,
  assistsPerMatch: 0,
};

/** Recalculé à la volée depuis match_players et goals — jamais stocké. */
export async function getPlayerAdvancedStats(playerId: string): Promise<PlayerAdvancedStats> {
  const [{ data: playedRows, error: playedError }, totalCompletedRes] = await Promise.all([
    supabaseAdmin.from("match_players").select("match_id").eq("player_id", playerId).eq("was_present", true),
    supabaseAdmin.from("matches").select("*", { count: "exact", head: true }).eq("status", "completed").is("deleted_at", null),
  ]);
  if (playedError) throw new Error(playedError.message);
  if (totalCompletedRes.error) throw new Error(totalCompletedRes.error.message);

  const totalCompleted = totalCompletedRes.count ?? 0;
  const playedMatchIds = [...new Set((playedRows ?? []).map((r) => r.match_id))];
  const matchesPlayed = playedMatchIds.length;

  if (matchesPlayed === 0) {
    return EMPTY_ADVANCED_STATS;
  }

  const [matchesRes, goalsRes] = await Promise.all([
    supabaseAdmin
      .from("matches")
      .select("id, team_score, opponent_score")
      .in("id", playedMatchIds)
      .eq("status", "completed")
      .is("deleted_at", null),
    supabaseAdmin
      .from("goals")
      .select("match_id, scorer_player_id, assist_player_id")
      .in("match_id", playedMatchIds)
      .eq("credited_to", "charenton")
      .is("deleted_at", null),
  ]);
  if (matchesRes.error) throw new Error(matchesRes.error.message);
  if (goalsRes.error) throw new Error(goalsRes.error.message);

  const playedCompletedMatches = matchesRes.data ?? [];
  const wins = playedCompletedMatches.filter((m) => (m.team_score ?? 0) > (m.opponent_score ?? 0)).length;

  const goalsByMatch = new Map<string, number>();
  const assistsByMatch = new Map<string, number>();
  for (const g of goalsRes.data ?? []) {
    if (g.scorer_player_id === playerId) {
      goalsByMatch.set(g.match_id, (goalsByMatch.get(g.match_id) ?? 0) + 1);
    }
    if (g.assist_player_id === playerId) {
      assistsByMatch.set(g.match_id, (assistsByMatch.get(g.match_id) ?? 0) + 1);
    }
  }

  let braces = 0;
  let hatTricks = 0;
  let goalAndAssistMatches = 0;
  let totalGoals = 0;
  for (const [matchId, count] of goalsByMatch) {
    totalGoals += count;
    if (count === 2) braces++;
    if (count >= 3) hatTricks++;
    if ((assistsByMatch.get(matchId) ?? 0) > 0) goalAndAssistMatches++;
  }
  const totalAssists = [...assistsByMatch.values()].reduce((a, b) => a + b, 0);

  return {
    presenceRate: totalCompleted > 0 ? Math.round((matchesPlayed / totalCompleted) * 100) : 0,
    winRateWhenPresent:
      playedCompletedMatches.length > 0 ? Math.round((wins / playedCompletedMatches.length) * 100) : 0,
    braces,
    hatTricks,
    goalAndAssistMatches,
    goalsPerMatch: matchesPlayed > 0 ? Math.round((totalGoals / matchesPlayed) * 10) / 10 : 0,
    assistsPerMatch: matchesPlayed > 0 ? Math.round((totalAssists / matchesPlayed) * 10) / 10 : 0,
  };
}

export type PlayerAwardWin = { award: Award; wins: number };

/**
 * Pour chaque match, le gagnant d'une récompense est le joueur le plus voté
 * (égalité = plusieurs gagnants). On recompte ça pour tous les matchs et on
 * garde le nombre de fois où `playerId` en fait partie — jamais stocké.
 */
export async function getPlayerAwardWins(playerId: string): Promise<PlayerAwardWin[]> {
  const [awards, { data: votes, error }] = await Promise.all([
    getActiveAwards(),
    supabaseAdmin.from("votes").select("match_id, award_id, voted_player_id"),
  ]);
  if (error) throw new Error(error.message);

  const groups = new Map<string, Map<string, number>>();
  for (const v of votes ?? []) {
    if (!v.voted_player_id) continue;
    const key = `${v.match_id}::${v.award_id}`;
    const counts = groups.get(key) ?? new Map<string, number>();
    counts.set(v.voted_player_id, (counts.get(v.voted_player_id) ?? 0) + 1);
    groups.set(key, counts);
  }

  const winsByAward = new Map<string, number>();
  for (const [key, counts] of groups) {
    const awardId = key.split("::")[1];
    const max = Math.max(...counts.values());
    const isWinner = max > 0 && (counts.get(playerId) ?? 0) === max;
    if (isWinner) {
      winsByAward.set(awardId, (winsByAward.get(awardId) ?? 0) + 1);
    }
  }

  return awards
    .map((award) => ({ award, wins: winsByAward.get(award.id) ?? 0 }))
    .filter((entry) => entry.wins > 0);
}

export type PlayerMatchHistoryEntry = {
  match: MatchWithOpponent;
  goals: number;
  assists: number;
};

export async function getPlayerMatchHistory(playerId: string): Promise<PlayerMatchHistoryEntry[]> {
  const { data: matchPlayerRows, error } = await supabaseAdmin
    .from("match_players")
    .select("match_id")
    .eq("player_id", playerId)
    .eq("was_present", true);
  if (error) throw new Error(error.message);

  const matchIds = [...new Set((matchPlayerRows ?? []).map((r) => r.match_id))];
  if (matchIds.length === 0) return [];

  const { data: matches, error: matchesError } = await supabaseAdmin
    .from("matches")
    .select("*")
    .in("id", matchIds)
    .is("deleted_at", null)
    .order("match_date", { ascending: false });
  if (matchesError) throw new Error(matchesError.message);

  const { data: goalRows, error: goalsError } = await supabaseAdmin
    .from("goals")
    .select("match_id, scorer_player_id, assist_player_id")
    .in("match_id", matchIds)
    .eq("credited_to", "charenton")
    .is("deleted_at", null);
  if (goalsError) throw new Error(goalsError.message);

  const withOpponents = await attachOpponents(matches ?? []);

  return withOpponents.map((match) => ({
    match,
    goals: (goalRows ?? []).filter((g) => g.match_id === match.id && g.scorer_player_id === playerId).length,
    assists: (goalRows ?? []).filter((g) => g.match_id === match.id && g.assist_player_id === playerId).length,
  }));
}
