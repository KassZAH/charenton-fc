import "server-only";
import { supabaseAdmin } from "@/lib/supabase/server";
import { getActivePlayers } from "./players";
import { todayDateString } from "@/lib/clock";

export function currentMvpMonth(): { year: number; month: number } {
  const [y, m] = todayDateString().split("-").map(Number);
  return { year: y, month: m };
}

export type MvpCandidate = { playerId: string; name: string; score: number };

/**
 * Trois candidats calculés à la volée pour le mois donné, à partir d'un score
 * composite : présence, victoires en étant présent, buts, passes déc., récompenses
 * de match gagnées, moins les cartons. Jamais stocké.
 */
export async function getMonthlyMvpCandidates(year: number, month: number): Promise<MvpCandidate[]> {
  const monthPrefix = `${year}-${String(month).padStart(2, "0")}`;
  const { data: matches, error } = await supabaseAdmin
    .from("matches")
    .select("id, team_score, opponent_score")
    .eq("status", "completed")
    .is("deleted_at", null)
    .gte("match_date", `${monthPrefix}-01`)
    .lt("match_date", nextMonthPrefix(year, month));
  if (error) throw new Error(error.message);

  const matchIds = (matches ?? []).map((m) => m.id);
  if (matchIds.length === 0) return [];

  const winningMatchIds = new Set(
    (matches ?? []).filter((m) => (m.team_score ?? 0) > (m.opponent_score ?? 0)).map((m) => m.id)
  );

  const [players, presenceRes, goalsRes, cardsRes, votesRes] = await Promise.all([
    getActivePlayers(),
    supabaseAdmin.from("match_players").select("match_id, player_id").eq("was_present", true).in("match_id", matchIds),
    supabaseAdmin
      .from("goals")
      .select("match_id, scorer_player_id, assist_player_id")
      .eq("credited_to", "charenton")
      .is("deleted_at", null)
      .in("match_id", matchIds),
    supabaseAdmin.from("cards").select("player_id").is("deleted_at", null).in("match_id", matchIds),
    supabaseAdmin.from("votes").select("match_id, award_id, voted_player_id").in("match_id", matchIds),
  ]);
  if (presenceRes.error) throw new Error(presenceRes.error.message);
  if (goalsRes.error) throw new Error(goalsRes.error.message);
  if (cardsRes.error) throw new Error(cardsRes.error.message);
  if (votesRes.error) throw new Error(votesRes.error.message);

  const nameById = new Map(players.map((p) => [p.id, p.nickname || p.first_name]));
  const scores = new Map<string, number>();
  const bump = (playerId: string | null, amount: number) => {
    if (!playerId) return;
    scores.set(playerId, (scores.get(playerId) ?? 0) + amount);
  };

  for (const p of presenceRes.data ?? []) {
    bump(p.player_id, 1);
    if (winningMatchIds.has(p.match_id)) bump(p.player_id, 2);
  }
  for (const g of goalsRes.data ?? []) {
    bump(g.scorer_player_id, 3);
    bump(g.assist_player_id, 2);
  }
  for (const c of cardsRes.data ?? []) {
    bump(c.player_id, -1);
  }

  const voteGroups = new Map<string, Map<string, number>>();
  for (const v of votesRes.data ?? []) {
    if (!v.voted_player_id) continue;
    const key = `${v.match_id}::${v.award_id}`;
    const counts = voteGroups.get(key) ?? new Map<string, number>();
    counts.set(v.voted_player_id, (counts.get(v.voted_player_id) ?? 0) + 1);
    voteGroups.set(key, counts);
  }
  for (const counts of voteGroups.values()) {
    const max = Math.max(...counts.values());
    for (const [playerId, count] of counts) {
      if (count === max && max > 0) bump(playerId, 3);
    }
  }

  return [...scores.entries()]
    .map(([playerId, score]) => ({ playerId, name: nameById.get(playerId) ?? "Joueur", score }))
    .sort((a, b) => b.score - a.score)
    .slice(0, 3);
}

function nextMonthPrefix(year: number, month: number): string {
  const nextMonth = month === 12 ? 1 : month + 1;
  const nextYear = month === 12 ? year + 1 : year;
  return `${nextYear}-${String(nextMonth).padStart(2, "0")}-01`;
}

export type MvpTally = { playerId: string; name: string; votes: number };

export async function getMonthlyMvpTally(year: number, month: number): Promise<MvpTally[]> {
  const [players, { data, error }] = await Promise.all([
    getActivePlayers(),
    supabaseAdmin.from("monthly_mvp_votes").select("voted_player_id").eq("year", year).eq("month", month),
  ]);
  if (error) throw new Error(error.message);
  const nameById = new Map(players.map((p) => [p.id, p.nickname || p.first_name]));
  const counts = new Map<string, number>();
  for (const v of data ?? []) {
    counts.set(v.voted_player_id, (counts.get(v.voted_player_id) ?? 0) + 1);
  }
  return [...counts.entries()]
    .map(([playerId, votes]) => ({ playerId, name: nameById.get(playerId) ?? "Joueur", votes }))
    .sort((a, b) => b.votes - a.votes);
}

export async function getMyMonthlyMvpVote(year: number, month: number, voterPlayerId: string): Promise<string | null> {
  const { data, error } = await supabaseAdmin
    .from("monthly_mvp_votes")
    .select("voted_player_id")
    .eq("year", year)
    .eq("month", month)
    .eq("voter_player_id", voterPlayerId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data?.voted_player_id ?? null;
}
