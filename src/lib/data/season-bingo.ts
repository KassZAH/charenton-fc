import "server-only";
import { supabaseAdmin } from "@/lib/supabase/server";
import { getActivePlayers } from "./players";
import { formatMatchDate } from "@/lib/format";

export type BingoSquare = {
  key: string;
  label: string;
  achieved: boolean;
  detail: string | null;
  href: string | null;
};

/**
 * 5 cases sur les 6 du Lot 9 : "gardien homme du match" est écartée car rien
 * ne permet encore de savoir qui a joué gardien par match (voir ROADMAP_DEFERRED.md).
 * Calculé à la volée, jamais stocké.
 */
export async function getSeasonBingo(seasonId: string | null): Promise<BingoSquare[]> {
  let matchQuery = supabaseAdmin
    .from("matches")
    .select("id, match_date, opponent_id, team_score, opponent_score")
    .eq("status", "completed")
    .is("deleted_at", null);
  if (seasonId) matchQuery = matchQuery.eq("season_id", seasonId);
  const { data: matches, error } = await matchQuery.order("match_date", { ascending: true });
  if (error) throw new Error(error.message);

  const scopedMatches = matches ?? [];
  const matchIds = scopedMatches.map((m) => m.id);
  const matchById = new Map(scopedMatches.map((m) => [m.id, m]));

  if (matchIds.length === 0) {
    return [
      { key: "hat_trick", label: "Triplé", achieved: false, detail: null, href: null },
      { key: "csc_adverse", label: "CSC adverse", achieved: false, detail: null, href: null },
      { key: "win_5_0", label: "Victoire 5-0", achieved: false, detail: null, href: null },
      { key: "twelve_present", label: "Douze présents", achieved: false, detail: null, href: null },
      { key: "defender_goal", label: "But d'un défenseur", achieved: false, detail: null, href: null },
    ];
  }

  const opponentIds = [...new Set(scopedMatches.map((m) => m.opponent_id).filter((id): id is string => !!id))];

  const [goalsRes, presenceRes, players, opponentsRes] = await Promise.all([
    supabaseAdmin
      .from("goals")
      .select("match_id, scorer_player_id, goal_type, credited_to")
      .in("match_id", matchIds)
      .is("deleted_at", null),
    supabaseAdmin.from("match_players").select("match_id, player_id").eq("was_present", true).in("match_id", matchIds),
    getActivePlayers(),
    opponentIds.length > 0
      ? supabaseAdmin.from("opponents").select("id, name").in("id", opponentIds)
      : Promise.resolve({ data: [], error: null }),
  ]);
  if (goalsRes.error) throw new Error(goalsRes.error.message);
  if (presenceRes.error) throw new Error(presenceRes.error.message);
  if (opponentsRes.error) throw new Error(opponentsRes.error.message);

  const opponentNameById = new Map((opponentsRes.data ?? []).map((o) => [o.id, o.name]));
  const positionById = new Map(players.map((p) => [p.id, p.primary_position]));
  const matchLabel = (matchId: string) => {
    const m = matchById.get(matchId);
    if (!m) return null;
    const opp = m.opponent_id ? opponentNameById.get(m.opponent_id) ?? "Adversaire" : "Adversaire";
    return `vs ${opp} (${formatMatchDate(m.match_date)})`;
  };

  const goalsByMatchAndScorer = new Map<string, Map<string, number>>();
  for (const g of goalsRes.data ?? []) {
    if (g.credited_to !== "charenton" || !g.scorer_player_id) continue;
    const perMatch = goalsByMatchAndScorer.get(g.match_id) ?? new Map<string, number>();
    perMatch.set(g.scorer_player_id, (perMatch.get(g.scorer_player_id) ?? 0) + 1);
    goalsByMatchAndScorer.set(g.match_id, perMatch);
  }

  let hatTrick: { matchId: string } | null = null;
  for (const [matchId, perScorer] of goalsByMatchAndScorer) {
    for (const count of perScorer.values()) {
      if (count >= 3) {
        hatTrick = { matchId };
        break;
      }
    }
    if (hatTrick) break;
  }

  const cscAdverse = (goalsRes.data ?? []).find(
    (g) => g.credited_to === "charenton" && g.goal_type === "csc" && !g.scorer_player_id
  );

  const win5_0 = scopedMatches.find((m) => m.team_score === 5 && m.opponent_score === 0);

  const presenceCountByMatch = new Map<string, number>();
  for (const p of presenceRes.data ?? []) {
    presenceCountByMatch.set(p.match_id, (presenceCountByMatch.get(p.match_id) ?? 0) + 1);
  }
  const twelvePresentMatchId = [...presenceCountByMatch.entries()].find(([, count]) => count >= 12)?.[0] ?? null;

  let defenderGoal: { matchId: string } | null = null;
  for (const g of goalsRes.data ?? []) {
    if (g.credited_to !== "charenton" || !g.scorer_player_id) continue;
    if (positionById.get(g.scorer_player_id) === "Défenseur") {
      defenderGoal = { matchId: g.match_id };
      break;
    }
  }

  return [
    {
      key: "hat_trick",
      label: "Triplé",
      achieved: !!hatTrick,
      detail: hatTrick ? matchLabel(hatTrick.matchId) : null,
      href: hatTrick ? `/matches/${hatTrick.matchId}` : null,
    },
    {
      key: "csc_adverse",
      label: "CSC adverse",
      achieved: !!cscAdverse,
      detail: cscAdverse ? matchLabel(cscAdverse.match_id) : null,
      href: cscAdverse ? `/matches/${cscAdverse.match_id}` : null,
    },
    {
      key: "win_5_0",
      label: "Victoire 5-0",
      achieved: !!win5_0,
      detail: win5_0 ? matchLabel(win5_0.id) : null,
      href: win5_0 ? `/matches/${win5_0.id}` : null,
    },
    {
      key: "twelve_present",
      label: "Douze présents",
      achieved: !!twelvePresentMatchId,
      detail: twelvePresentMatchId ? matchLabel(twelvePresentMatchId) : null,
      href: twelvePresentMatchId ? `/matches/${twelvePresentMatchId}` : null,
    },
    {
      key: "defender_goal",
      label: "But d'un défenseur",
      achieved: !!defenderGoal,
      detail: defenderGoal ? matchLabel(defenderGoal.matchId) : null,
      href: defenderGoal ? `/matches/${defenderGoal.matchId}` : null,
    },
  ];
}
