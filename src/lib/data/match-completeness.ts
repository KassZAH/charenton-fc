import "server-only";
import { supabaseAdmin } from "@/lib/supabase/server";
import { getMatchGoals } from "./goals";
import { getMatchRoster } from "./roster";
import { attachOpponents, getPastMatches, type MatchWithOpponent } from "./matches";

export type CompletenessStatus = "ok" | "warning" | "missing";

export type CompletenessItem = {
  label: string;
  status: CompletenessStatus;
  detail?: string;
};

export type MatchCompleteness = {
  percent: number;
  items: CompletenessItem[];
  creditedGoals: number;
  scoreConsistent: boolean;
};

/**
 * "Match complété à X %" — dérivé de ce qui existe déjà (score, feuille de match,
 * buts, votes), pas de nouvelle saisie dédiée à la complétude elle-même.
 */
export async function getMatchCompleteness(
  matchId: string,
  teamScore: number | null
): Promise<MatchCompleteness> {
  const [roster, goals, { count: voteCount, error }] = await Promise.all([
    getMatchRoster(matchId),
    getMatchGoals(matchId),
    supabaseAdmin.from("votes").select("id", { count: "exact", head: true }).eq("match_id", matchId),
  ]);
  if (error) throw new Error(error.message);

  const creditedGoals = goals.filter((g) => g.credited_to === "charenton").length;
  const scoreOk = teamScore != null;
  const rosterOk = roster.length > 0;
  const scoreConsistent = scoreOk && creditedGoals === teamScore;
  const votesOk = (voteCount ?? 0) > 0;

  const items: CompletenessItem[] = [
    { label: "Score", status: scoreOk ? "ok" : "missing" },
    { label: "Présents", status: rosterOk ? "ok" : "missing" },
    {
      label: "Buteurs",
      status: scoreConsistent ? "ok" : "warning",
      detail: scoreOk ? `${creditedGoals}/${teamScore} attribué${creditedGoals > 1 ? "s" : ""}` : undefined,
    },
    { label: "Récompenses", status: votesOk ? "ok" : "missing" },
  ];

  const percent = Math.round((items.filter((i) => i.status === "ok").length / items.length) * 100);

  return { percent, items, creditedGoals, scoreConsistent };
}

export type MatchNeedingReview = { match: MatchWithOpponent; completeness: MatchCompleteness };

/** Page admin "Matchs à vérifier" — matchs terminés dont la complétude n'est pas à 100 %. */
export async function getMatchesNeedingReview(): Promise<MatchNeedingReview[]> {
  const matches = await getPastMatches();
  const withCompleteness = await Promise.all(
    matches.map(async (match) => ({ match, completeness: await getMatchCompleteness(match.id, match.team_score) }))
  );
  return withCompleteness.filter((r) => r.completeness.percent < 100);
}

/**
 * Équivalent de getMatchesNeedingReview() scopé à une seule saison —
 * fonction dédiée, seasonId obligatoire (jamais un paramètre optionnel sur
 * la fonction existante, pour ne jamais retomber accidentellement sur tout
 * l'historique). Utilisée uniquement par l'assistant de clôture (Lot 7).
 */
export async function getMatchesNeedingReviewForSeason(seasonId: string): Promise<MatchNeedingReview[]> {
  const { data, error } = await supabaseAdmin
    .from("matches")
    .select("*")
    .eq("season_id", seasonId)
    .eq("status", "completed")
    .is("deleted_at", null)
    .order("match_date", { ascending: false });
  if (error) throw new Error(error.message);

  const matches = await attachOpponents(data ?? []);
  const withCompleteness = await Promise.all(
    matches.map(async (match) => ({ match, completeness: await getMatchCompleteness(match.id, match.team_score) }))
  );
  return withCompleteness.filter((r) => r.completeness.percent < 100);
}
