import "server-only";
import { supabaseAdmin } from "@/lib/supabase/server";

export type SeasonTeamRecord = {
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

export async function getSeasonTeamRecord(seasonId: string | null): Promise<SeasonTeamRecord> {
  let matchQuery = supabaseAdmin
    .from("matches")
    .select("id, team_score, opponent_score")
    .eq("status", "completed")
    .is("deleted_at", null);
  if (seasonId) matchQuery = matchQuery.eq("season_id", seasonId);
  const { data: matches, error } = await matchQuery;
  if (error) throw new Error(error.message);

  const played = matches ?? [];
  const matchIds = played.map((m) => m.id);

  const { data: cards, error: cardsError } =
    matchIds.length > 0
      ? await supabaseAdmin.from("cards").select("card_type").in("match_id", matchIds).is("deleted_at", null)
      : { data: [] as { card_type: string }[], error: null };
  if (cardsError) throw new Error(cardsError.message);

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

  return {
    played: played.length,
    wins,
    draws,
    losses,
    goalsFor,
    goalsAgainst,
    goalDiff: goalsFor - goalsAgainst,
    yellowCards: (cards ?? []).filter((c) => c.card_type === "yellow").length,
    redCards: (cards ?? []).filter((c) => c.card_type === "red").length,
  };
}
