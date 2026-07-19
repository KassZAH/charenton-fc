import "server-only";
import { supabaseAdmin } from "@/lib/supabase/server";
import { getDemoMatchIds } from "./demo-scope";

export type CollectiveChallenge = {
  key: string;
  title: string;
  target: number;
  current: number;
  achieved: boolean;
  unit?: string;
};

const PRESENCE_TARGET = 10;

/**
 * Défis collectifs fixes, calculés à la volée sur la saison donnée — jamais stockés,
 * pas de constructeur de défi personnalisé pour l'instant (voir ROADMAP_DEFERRED.md).
 */
export async function getCollectiveChallenges(seasonId: string | null): Promise<CollectiveChallenge[]> {
  let matchQuery = supabaseAdmin
    .from("matches")
    .select("id, team_score, opponent_score")
    .eq("status", "completed")
    .is("deleted_at", null);
  if (seasonId) {
    matchQuery = matchQuery.eq("season_id", seasonId);
  } else {
    const demoMatchIds = await getDemoMatchIds();
    if (demoMatchIds.length > 0) matchQuery = matchQuery.not("id", "in", `(${demoMatchIds.join(",")})`);
  }
  const { data: matches, error } = await matchQuery.order("match_date", { ascending: true });
  if (error) throw new Error(error.message);

  const scopedMatches = matches ?? [];
  const matchIds = scopedMatches.map((m) => m.id);
  if (matchIds.length === 0) {
    return [
      { key: "three_wins", title: "3 victoires consécutives", target: 3, current: 0, achieved: false },
      { key: "five_no_card", title: "5 matchs sans carton", target: 5, current: 0, achieved: false },
      { key: "ten_scorers", title: "10 buteurs différents", target: 10, current: 0, achieved: false },
      { key: "presence", title: "Présence collective moyenne", target: PRESENCE_TARGET, current: 0, achieved: false, unit: "présents/match" },
    ];
  }

  const [goalsRes, cardsRes, presenceRes] = await Promise.all([
    supabaseAdmin
      .from("goals")
      .select("match_id, scorer_player_id")
      .in("match_id", matchIds)
      .eq("credited_to", "charenton")
      .is("deleted_at", null),
    supabaseAdmin.from("cards").select("match_id").is("deleted_at", null).in("match_id", matchIds),
    supabaseAdmin.from("match_players").select("match_id, player_id").eq("was_present", true).in("match_id", matchIds),
  ]);
  if (goalsRes.error) throw new Error(goalsRes.error.message);
  if (cardsRes.error) throw new Error(cardsRes.error.message);
  if (presenceRes.error) throw new Error(presenceRes.error.message);

  let bestWinStreak = 0;
  let currentWinStreak = 0;
  for (const m of scopedMatches) {
    if ((m.team_score ?? 0) > (m.opponent_score ?? 0)) {
      currentWinStreak++;
      bestWinStreak = Math.max(bestWinStreak, currentWinStreak);
    } else {
      currentWinStreak = 0;
    }
  }

  const cardedMatchIds = new Set((cardsRes.data ?? []).map((c) => c.match_id));
  let bestNoCardStreak = 0;
  let currentNoCardStreak = 0;
  for (const m of scopedMatches) {
    if (!cardedMatchIds.has(m.id)) {
      currentNoCardStreak++;
      bestNoCardStreak = Math.max(bestNoCardStreak, currentNoCardStreak);
    } else {
      currentNoCardStreak = 0;
    }
  }

  const distinctScorers = new Set(
    (goalsRes.data ?? []).map((g) => g.scorer_player_id).filter((id): id is string => !!id)
  ).size;

  const presenceCountByMatch = new Map<string, number>();
  for (const p of presenceRes.data ?? []) {
    presenceCountByMatch.set(p.match_id, (presenceCountByMatch.get(p.match_id) ?? 0) + 1);
  }
  const totalPresence = [...presenceCountByMatch.values()].reduce((a, b) => a + b, 0);
  const avgPresence = scopedMatches.length > 0 ? Math.round((totalPresence / scopedMatches.length) * 10) / 10 : 0;

  return [
    { key: "three_wins", title: "3 victoires consécutives", target: 3, current: bestWinStreak, achieved: bestWinStreak >= 3 },
    { key: "five_no_card", title: "5 matchs sans carton (série)", target: 5, current: bestNoCardStreak, achieved: bestNoCardStreak >= 5 },
    { key: "ten_scorers", title: "10 buteurs différents", target: 10, current: distinctScorers, achieved: distinctScorers >= 10 },
    {
      key: "presence",
      title: "Présence collective moyenne",
      target: PRESENCE_TARGET,
      current: avgPresence,
      achieved: avgPresence >= PRESENCE_TARGET,
      unit: "présents/match",
    },
  ];
}
