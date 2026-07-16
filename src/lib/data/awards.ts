import "server-only";
import { supabaseAdmin } from "@/lib/supabase/server";
import { getActivePlayers } from "./players";
import type { Award } from "@/types/models";

export async function getActiveAwards(): Promise<Award[]> {
  const { data, error } = await supabaseAdmin
    .from("awards")
    .select("*")
    .eq("is_active", true)
    .order("created_at", { ascending: true });
  if (error) throw new Error(error.message);
  return data ?? [];
}

export type AwardResult = {
  award: Award;
  /** Plusieurs entrées = égalité entre plusieurs joueurs. */
  winners: { playerId: string; name: string; votes: number }[];
  totalVotes: number;
};

/**
 * Calculé à la volée depuis les votes — jamais stocké. Le gagnant de chaque
 * catégorie est simplement le joueur le plus voté pour ce match.
 */
export async function getMatchAwardResults(matchId: string): Promise<AwardResult[]> {
  const [awards, players, { data: votes, error }] = await Promise.all([
    getActiveAwards(),
    getActivePlayers(),
    supabaseAdmin.from("votes").select("award_id, voted_player_id").eq("match_id", matchId),
  ]);
  if (error) throw new Error(error.message);

  const nameById = new Map(players.map((p) => [p.id, p.nickname || p.first_name]));

  return awards.map((award) => {
    const relevantVotes = (votes ?? []).filter(
      (v) => v.award_id === award.id && v.voted_player_id
    );
    const counts = new Map<string, number>();
    for (const v of relevantVotes) {
      counts.set(v.voted_player_id!, (counts.get(v.voted_player_id!) ?? 0) + 1);
    }
    const max = counts.size > 0 ? Math.max(...counts.values()) : 0;
    const winners =
      max === 0
        ? []
        : [...counts.entries()]
            .filter(([, count]) => count === max)
            .map(([playerId, voteCount]) => ({
              playerId,
              name: nameById.get(playerId) ?? "Joueur",
              votes: voteCount,
            }));
    return { award, winners, totalVotes: relevantVotes.length };
  });
}

export type AwardLeaderboard = {
  award: Award;
  leaders: { playerId: string; name: string; count: number }[];
};

/**
 * Classement saison de chaque récompense : pour chaque match, le(s)
 * gagnant(s) (le plus voté, égalités comptées pour tous) marquent un point
 * dans le classement de leur catégorie. Calculé à la volée depuis les votes.
 */
export async function getAwardLeaderboards(limit = 5): Promise<AwardLeaderboard[]> {
  const [awards, players, { data: votes, error }] = await Promise.all([
    getActiveAwards(),
    getActivePlayers(),
    supabaseAdmin.from("votes").select("match_id, award_id, voted_player_id"),
  ]);
  if (error) throw new Error(error.message);

  const nameById = new Map(players.map((p) => [p.id, p.nickname || p.first_name]));

  const groups = new Map<string, Map<string, number>>();
  for (const v of votes ?? []) {
    if (!v.voted_player_id) continue;
    const key = `${v.match_id}::${v.award_id}`;
    const counts = groups.get(key) ?? new Map<string, number>();
    counts.set(v.voted_player_id, (counts.get(v.voted_player_id) ?? 0) + 1);
    groups.set(key, counts);
  }

  const winsByAward = new Map<string, Map<string, number>>();
  for (const [key, counts] of groups) {
    const awardId = key.split("::")[1];
    const max = Math.max(...counts.values());
    const winsForAward = winsByAward.get(awardId) ?? new Map<string, number>();
    for (const [playerId, count] of counts) {
      if (count === max) {
        winsForAward.set(playerId, (winsForAward.get(playerId) ?? 0) + 1);
      }
    }
    winsByAward.set(awardId, winsForAward);
  }

  return awards.map((award) => {
    const winsMap = winsByAward.get(award.id) ?? new Map<string, number>();
    const leaders = [...winsMap.entries()]
      .map(([playerId, count]) => ({ playerId, name: nameById.get(playerId) ?? "Joueur", count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, limit);
    return { award, leaders };
  });
}

/** award_id -> voted_player_id pour le joueur connecté, sur ce match. */
export async function getMyVotes(matchId: string, voterPlayerId: string): Promise<Map<string, string>> {
  const { data, error } = await supabaseAdmin
    .from("votes")
    .select("award_id, voted_player_id")
    .eq("match_id", matchId)
    .eq("voter_player_id", voterPlayerId);
  if (error) throw new Error(error.message);

  const map = new Map<string, string>();
  for (const v of data ?? []) {
    if (v.voted_player_id) map.set(v.award_id, v.voted_player_id);
  }
  return map;
}
