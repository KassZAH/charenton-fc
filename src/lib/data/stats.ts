import "server-only";
import { supabaseAdmin } from "@/lib/supabase/server";
import { getAllPlayers } from "./players";
import { formatMatchDate } from "@/lib/format";

/**
 * Toutes les stats sont recalculées à la volée depuis les événements
 * (goals, match_players, matches) — jamais stockées en dur.
 */

export type PlayerCount = { playerId: string; name: string; count: number };

function countBy(rows: { id: string | null }[], nameById: Map<string, string>): PlayerCount[] {
  const counts = new Map<string, number>();
  for (const row of rows) {
    if (!row.id) continue;
    counts.set(row.id, (counts.get(row.id) ?? 0) + 1);
  }
  return [...counts.entries()]
    .map(([playerId, count]) => ({ playerId, name: nameById.get(playerId) ?? "Joueur", count }))
    .sort((a, b) => b.count - a.count);
}

export async function getTopScorers(limit = 10): Promise<PlayerCount[]> {
  const [players, { data: goals, error }] = await Promise.all([
    getAllPlayers(),
    supabaseAdmin.from("goals").select("scorer_player_id").eq("credited_to", "charenton").is("deleted_at", null),
  ]);
  if (error) throw new Error(error.message);
  const nameById = new Map(players.map((p) => [p.id, p.nickname || p.first_name]));
  const rows = (goals ?? []).map((g) => ({ id: g.scorer_player_id }));
  return countBy(rows, nameById).slice(0, limit);
}

export async function getTopAssists(limit = 10): Promise<PlayerCount[]> {
  const [players, { data: goals, error }] = await Promise.all([
    getAllPlayers(),
    supabaseAdmin.from("goals").select("assist_player_id").eq("credited_to", "charenton").is("deleted_at", null),
  ]);
  if (error) throw new Error(error.message);
  const nameById = new Map(players.map((p) => [p.id, p.nickname || p.first_name]));
  const rows = (goals ?? []).map((g) => ({ id: g.assist_player_id }));
  return countBy(rows, nameById).slice(0, limit);
}

/** Buts + passes décisives cumulés (contribution directe aux buts). */
export async function getTopGoalContributions(limit = 10): Promise<PlayerCount[]> {
  const [players, { data: goals, error }] = await Promise.all([
    getAllPlayers(),
    supabaseAdmin
      .from("goals")
      .select("scorer_player_id, assist_player_id")
      .eq("credited_to", "charenton")
      .is("deleted_at", null),
  ]);
  if (error) throw new Error(error.message);
  const nameById = new Map(players.map((p) => [p.id, p.nickname || p.first_name]));
  const counts = new Map<string, number>();
  for (const g of goals ?? []) {
    if (g.scorer_player_id) counts.set(g.scorer_player_id, (counts.get(g.scorer_player_id) ?? 0) + 1);
    if (g.assist_player_id) counts.set(g.assist_player_id, (counts.get(g.assist_player_id) ?? 0) + 1);
  }
  return [...counts.entries()]
    .map(([playerId, count]) => ({ playerId, name: nameById.get(playerId) ?? "Joueur", count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, limit);
}

export async function getTopPresences(limit = 10): Promise<PlayerCount[]> {
  const [players, { data: rows, error }] = await Promise.all([
    getAllPlayers(),
    supabaseAdmin.from("match_players").select("player_id").eq("was_present", true),
  ]);
  if (error) throw new Error(error.message);
  const nameById = new Map(players.map((p) => [p.id, p.nickname || p.first_name]));
  const mapped = (rows ?? []).map((r) => ({ id: r.player_id }));
  return countBy(mapped, nameById).slice(0, limit);
}

export async function getMostCarded(limit = 10): Promise<PlayerCount[]> {
  const [players, { data: cards, error }] = await Promise.all([
    getAllPlayers(),
    supabaseAdmin.from("cards").select("player_id").is("deleted_at", null),
  ]);
  if (error) throw new Error(error.message);
  const nameById = new Map(players.map((p) => [p.id, p.nickname || p.first_name]));
  const rows = (cards ?? []).map((c) => ({ id: c.player_id }));
  return countBy(rows, nameById).slice(0, limit);
}

export type TeamStats = {
  played: number;
  wins: number;
  draws: number;
  losses: number;
  goalsFor: number;
  goalsAgainst: number;
  goalDiff: number;
  yellowCards: number;
  redCards: number;
};

export async function getTeamStats(): Promise<TeamStats> {
  const [{ data: matches, error }, { data: cards, error: cardsError }] = await Promise.all([
    supabaseAdmin
      .from("matches")
      .select("team_score, opponent_score")
      .eq("status", "completed")
      .is("deleted_at", null),
    supabaseAdmin.from("cards").select("card_type").is("deleted_at", null),
  ]);
  if (error) throw new Error(error.message);
  if (cardsError) throw new Error(cardsError.message);

  const played = matches ?? [];
  let wins = 0;
  let draws = 0;
  let losses = 0;
  let goalsFor = 0;
  let goalsAgainst = 0;

  for (const m of played) {
    const gf = m.team_score ?? 0;
    const ga = m.opponent_score ?? 0;
    goalsFor += gf;
    goalsAgainst += ga;
    if (gf > ga) wins++;
    else if (gf === ga) draws++;
    else losses++;
  }

  const yellowCards = (cards ?? []).filter((c) => c.card_type === "yellow").length;
  const redCards = (cards ?? []).filter((c) => c.card_type === "red").length;

  return {
    played: played.length,
    wins,
    draws,
    yellowCards,
    redCards,
    losses,
    goalsFor,
    goalsAgainst,
    goalDiff: goalsFor - goalsAgainst,
  };
}

export type MatchResult = {
  matchId: string;
  opponentName: string;
  dateLabel: string;
  teamScore: number;
  opponentScore: number;
};

export type TeamHighlights = {
  biggestWin: MatchResult | null;
  biggestLoss: MatchResult | null;
  currentStreak: { type: "wins" | "draws" | "losses"; count: number } | null;
  bestWinStreak: number;
};

function resultType(teamScore: number, opponentScore: number): "wins" | "draws" | "losses" {
  if (teamScore > opponentScore) return "wins";
  if (teamScore < opponentScore) return "losses";
  return "draws";
}

export async function getTeamHighlights(): Promise<TeamHighlights> {
  const { data: matches, error } = await supabaseAdmin
    .from("matches")
    .select("id, match_date, opponent_id, team_score, opponent_score")
    .eq("status", "completed")
    .is("deleted_at", null)
    .order("match_date", { ascending: true });
  if (error) throw new Error(error.message);

  const played = matches ?? [];
  if (played.length === 0) {
    return { biggestWin: null, biggestLoss: null, currentStreak: null, bestWinStreak: 0 };
  }

  const opponentIds = [...new Set(played.map((m) => m.opponent_id).filter((id): id is string => !!id))];
  const { data: opponents, error: opponentsError } =
    opponentIds.length > 0
      ? await supabaseAdmin.from("opponents").select("id, name").in("id", opponentIds)
      : { data: [], error: null };
  if (opponentsError) throw new Error(opponentsError.message);
  const opponentNameById = new Map((opponents ?? []).map((o) => [o.id, o.name]));

  function toResult(m: (typeof played)[number]): MatchResult {
    return {
      matchId: m.id,
      opponentName: m.opponent_id ? (opponentNameById.get(m.opponent_id) ?? "Adversaire") : "Adversaire",
      dateLabel: formatMatchDate(m.match_date),
      teamScore: m.team_score ?? 0,
      opponentScore: m.opponent_score ?? 0,
    };
  }

  let biggestWin: MatchResult | null = null;
  let biggestWinDiff = -Infinity;
  let biggestLoss: MatchResult | null = null;
  let biggestLossDiff = Infinity;

  for (const m of played) {
    const diff = (m.team_score ?? 0) - (m.opponent_score ?? 0);
    if (diff > 0 && diff > biggestWinDiff) {
      biggestWinDiff = diff;
      biggestWin = toResult(m);
    }
    if (diff < 0 && diff < biggestLossDiff) {
      biggestLossDiff = diff;
      biggestLoss = toResult(m);
    }
  }

  let bestWinStreak = 0;
  let runningWinStreak = 0;
  for (const m of played) {
    if (resultType(m.team_score ?? 0, m.opponent_score ?? 0) === "wins") {
      runningWinStreak++;
      bestWinStreak = Math.max(bestWinStreak, runningWinStreak);
    } else {
      runningWinStreak = 0;
    }
  }

  const lastMatch = played[played.length - 1];
  const currentStreakType = resultType(lastMatch.team_score ?? 0, lastMatch.opponent_score ?? 0);
  let currentStreakCount = 0;
  for (let i = played.length - 1; i >= 0; i--) {
    const m = played[i];
    if (resultType(m.team_score ?? 0, m.opponent_score ?? 0) === currentStreakType) {
      currentStreakCount++;
    } else {
      break;
    }
  }

  return {
    biggestWin,
    biggestLoss,
    currentStreak: { type: currentStreakType, count: currentStreakCount },
    bestWinStreak,
  };
}
