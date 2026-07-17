import "server-only";
import { supabaseAdmin } from "@/lib/supabase/server";
import { getAllPlayers } from "./players";
import { formatMatchDate } from "@/lib/format";

export type RecordHolder = { playerId: string; name: string; value: number; detail?: string };

export type BiggestWin = {
  teamScore: number;
  opponentScore: number;
  opponentName: string;
  dateLabel: string;
};

export type Records = {
  topScorer: RecordHolder | null;
  topAssist: RecordHolder | null;
  mostMatches: RecordHolder | null;
  mostBraces: RecordHolder | null;
  mostCards: RecordHolder | null;
  longestScoringStreak: RecordHolder | null;
  longestPresenceStreak: RecordHolder | null;
  longestAssistStreak: RecordHolder | null;
  longestNoCardStreak: RecordHolder | null;
  biggestWin: BiggestWin | null;
  bestPresenceRate: RecordHolder | null;
  mostGoalsInOneMatch: RecordHolder | null;
};

const MIN_MATCHES_FOR_PRESENCE_RECORD = 10;

const EMPTY_RECORDS: Records = {
  topScorer: null,
  topAssist: null,
  mostMatches: null,
  mostBraces: null,
  mostCards: null,
  longestScoringStreak: null,
  longestPresenceStreak: null,
  longestAssistStreak: null,
  longestNoCardStreak: null,
  biggestWin: null,
  bestPresenceRate: null,
  mostGoalsInOneMatch: null,
};

function topOf(counts: Map<string, number>, nameById: Map<string, string>): RecordHolder | null {
  let bestId: string | null = null;
  let bestValue = 0;
  for (const [id, value] of counts) {
    if (value > bestValue) {
      bestValue = value;
      bestId = id;
    }
  }
  return bestId ? { playerId: bestId, name: nameById.get(bestId) ?? "Joueur", value: bestValue } : null;
}

/**
 * Tous les records sont recalculés à la volée depuis goals/cards/match_players/matches
 * pour la portée demandée (une saison, ou tout l'historique) — jamais stockés.
 */
export async function getRecords(seasonId: string | null): Promise<Records> {
  let matchQuery = supabaseAdmin
    .from("matches")
    .select("id, match_date, opponent_id, team_score, opponent_score")
    .eq("status", "completed")
    .is("deleted_at", null);
  if (seasonId) matchQuery = matchQuery.eq("season_id", seasonId);
  const { data: matches, error: matchesError } = await matchQuery.order("match_date", { ascending: true });
  if (matchesError) throw new Error(matchesError.message);

  const scopedMatches = matches ?? [];
  const matchIds = scopedMatches.map((m) => m.id);
  if (matchIds.length === 0) return EMPTY_RECORDS;

  const opponentIds = [...new Set(scopedMatches.map((m) => m.opponent_id).filter((id): id is string => !!id))];

  const [players, goalsRes, cardsRes, matchPlayersRes, opponentsRes] = await Promise.all([
    getAllPlayers(),
    supabaseAdmin
      .from("goals")
      .select("match_id, scorer_player_id, assist_player_id")
      .in("match_id", matchIds)
      .eq("credited_to", "charenton")
      .is("deleted_at", null),
    supabaseAdmin.from("cards").select("match_id, player_id").in("match_id", matchIds).is("deleted_at", null),
    supabaseAdmin.from("match_players").select("match_id, player_id").in("match_id", matchIds).eq("was_present", true),
    opponentIds.length > 0
      ? supabaseAdmin.from("opponents").select("id, name").in("id", opponentIds)
      : Promise.resolve({ data: [], error: null }),
  ]);
  if (goalsRes.error) throw new Error(goalsRes.error.message);
  if (cardsRes.error) throw new Error(cardsRes.error.message);
  if (matchPlayersRes.error) throw new Error(matchPlayersRes.error.message);
  if (opponentsRes.error) throw new Error(opponentsRes.error.message);

  const nameById = new Map(players.map((p) => [p.id, p.nickname || p.first_name]));
  const opponentNameById = new Map((opponentsRes.data ?? []).map((o) => [o.id, o.name]));
  const matchById = new Map(scopedMatches.map((m) => [m.id, m]));

  const goals = goalsRes.data ?? [];
  const cards = cardsRes.data ?? [];
  const matchPlayers = matchPlayersRes.data ?? [];

  // Buteur / passeur, et le détail par match+buteur (réutilisé pour doublés et plus gros score en 1 match)
  const scorerCounts = new Map<string, number>();
  const assistCounts = new Map<string, number>();
  const goalsByMatchAndScorer = new Map<string, Map<string, number>>();
  const assistedMatchesByPlayer = new Map<string, Set<string>>();
  for (const g of goals) {
    if (g.scorer_player_id) {
      scorerCounts.set(g.scorer_player_id, (scorerCounts.get(g.scorer_player_id) ?? 0) + 1);
      const perMatch = goalsByMatchAndScorer.get(g.match_id) ?? new Map<string, number>();
      perMatch.set(g.scorer_player_id, (perMatch.get(g.scorer_player_id) ?? 0) + 1);
      goalsByMatchAndScorer.set(g.match_id, perMatch);
    }
    if (g.assist_player_id) {
      assistCounts.set(g.assist_player_id, (assistCounts.get(g.assist_player_id) ?? 0) + 1);
      const set = assistedMatchesByPlayer.get(g.assist_player_id) ?? new Set<string>();
      set.add(g.match_id);
      assistedMatchesByPlayer.set(g.assist_player_id, set);
    }
  }
  const topScorer = topOf(scorerCounts, nameById);
  const topAssist = topOf(assistCounts, nameById);

  // Présences
  const matchCounts = new Map<string, number>();
  for (const mp of matchPlayers) {
    if (!mp.player_id) continue;
    matchCounts.set(mp.player_id, (matchCounts.get(mp.player_id) ?? 0) + 1);
  }
  const mostMatches = topOf(matchCounts, nameById);

  // Doublés + plus gros score en un match
  const bracesCounts = new Map<string, number>();
  let mostGoalsInOneMatch: RecordHolder | null = null;
  for (const [matchId, perScorer] of goalsByMatchAndScorer) {
    for (const [playerId, count] of perScorer) {
      if (count === 2) {
        bracesCounts.set(playerId, (bracesCounts.get(playerId) ?? 0) + 1);
      }
      if (!mostGoalsInOneMatch || count > mostGoalsInOneMatch.value) {
        const match = matchById.get(matchId);
        mostGoalsInOneMatch = {
          playerId,
          name: nameById.get(playerId) ?? "Joueur",
          value: count,
          detail: match
            ? `vs ${match.opponent_id ? (opponentNameById.get(match.opponent_id) ?? "Adversaire") : "Adversaire"} (${formatMatchDate(match.match_date)})`
            : undefined,
        };
      }
    }
  }
  const mostBraces = topOf(bracesCounts, nameById);

  // Cartons
  const cardCounts = new Map<string, number>();
  const cardedMatchesByPlayer = new Map<string, Set<string>>();
  for (const c of cards) {
    if (!c.player_id) continue;
    cardCounts.set(c.player_id, (cardCounts.get(c.player_id) ?? 0) + 1);
    const set = cardedMatchesByPlayer.get(c.player_id) ?? new Set<string>();
    set.add(c.match_id);
    cardedMatchesByPlayer.set(c.player_id, set);
  }
  const mostCards = topOf(cardCounts, nameById);

  // Plus longue série de matchs consécutifs avec au moins un but
  const matchIdsByPlayer = new Map<string, string[]>();
  for (const mp of matchPlayers) {
    if (!mp.player_id) continue;
    const list = matchIdsByPlayer.get(mp.player_id) ?? [];
    list.push(mp.match_id);
    matchIdsByPlayer.set(mp.player_id, list);
  }
  const matchOrderIndex = new Map(scopedMatches.map((m, i) => [m.id, i]));

  let longestScoringStreak: RecordHolder | null = null;
  for (const [playerId, playerMatchIds] of matchIdsByPlayer) {
    const ordered = [...playerMatchIds].sort(
      (a, b) => (matchOrderIndex.get(a) ?? 0) - (matchOrderIndex.get(b) ?? 0)
    );
    let best = 0;
    let current = 0;
    for (const mid of ordered) {
      const scored = (goalsByMatchAndScorer.get(mid)?.get(playerId) ?? 0) > 0;
      if (scored) {
        current++;
        best = Math.max(best, current);
      } else {
        current = 0;
      }
    }
    if (best > 0 && (!longestScoringStreak || best > longestScoringStreak.value)) {
      longestScoringStreak = { playerId, name: nameById.get(playerId) ?? "Joueur", value: best };
    }
  }

  // Plus longue série de matchs consécutifs avec au moins une passe décisive
  let longestAssistStreak: RecordHolder | null = null;
  for (const [playerId, playerMatchIds] of matchIdsByPlayer) {
    const ordered = [...playerMatchIds].sort(
      (a, b) => (matchOrderIndex.get(a) ?? 0) - (matchOrderIndex.get(b) ?? 0)
    );
    let best = 0;
    let current = 0;
    for (const mid of ordered) {
      const assisted = assistedMatchesByPlayer.get(playerId)?.has(mid) ?? false;
      if (assisted) {
        current++;
        best = Math.max(best, current);
      } else {
        current = 0;
      }
    }
    if (best > 0 && (!longestAssistStreak || best > longestAssistStreak.value)) {
      longestAssistStreak = { playerId, name: nameById.get(playerId) ?? "Joueur", value: best };
    }
  }

  // Plus longue série de matchs joués sans carton
  let longestNoCardStreak: RecordHolder | null = null;
  for (const [playerId, playerMatchIds] of matchIdsByPlayer) {
    const ordered = [...playerMatchIds].sort(
      (a, b) => (matchOrderIndex.get(a) ?? 0) - (matchOrderIndex.get(b) ?? 0)
    );
    let best = 0;
    let current = 0;
    for (const mid of ordered) {
      const carded = cardedMatchesByPlayer.get(playerId)?.has(mid) ?? false;
      if (!carded) {
        current++;
        best = Math.max(best, current);
      } else {
        current = 0;
      }
    }
    if (best > 0 && (!longestNoCardStreak || best > longestNoCardStreak.value)) {
      longestNoCardStreak = { playerId, name: nameById.get(playerId) ?? "Joueur", value: best };
    }
  }

  // Plus longue série de matchs d'équipe consécutifs où le joueur était présent
  // (contrairement aux autres séries ci-dessus, on parcourt TOUS les matchs de l'équipe,
  // pas seulement ceux du joueur, sinon l'absence ne romprait jamais la série).
  const playedSetByPlayer = new Map<string, Set<string>>();
  for (const [playerId, ids] of matchIdsByPlayer) {
    playedSetByPlayer.set(playerId, new Set(ids));
  }
  let longestPresenceStreak: RecordHolder | null = null;
  for (const [playerId, playedSet] of playedSetByPlayer) {
    let best = 0;
    let current = 0;
    for (const m of scopedMatches) {
      if (playedSet.has(m.id)) {
        current++;
        best = Math.max(best, current);
      } else {
        current = 0;
      }
    }
    if (best > 0 && (!longestPresenceStreak || best > longestPresenceStreak.value)) {
      longestPresenceStreak = { playerId, name: nameById.get(playerId) ?? "Joueur", value: best };
    }
  }

  // Plus grosse victoire
  let biggestWin: BiggestWin | null = null;
  let biggestDiff = -Infinity;
  for (const m of scopedMatches) {
    const diff = (m.team_score ?? 0) - (m.opponent_score ?? 0);
    if (diff > 0 && diff > biggestDiff) {
      biggestDiff = diff;
      biggestWin = {
        teamScore: m.team_score ?? 0,
        opponentScore: m.opponent_score ?? 0,
        opponentName: m.opponent_id ? (opponentNameById.get(m.opponent_id) ?? "Adversaire") : "Adversaire",
        dateLabel: formatMatchDate(m.match_date),
      };
    }
  }

  // Meilleur taux de présence (seuil minimum de matchs pour être éligible)
  let bestPresenceRate: RecordHolder | null = null;
  for (const [playerId, count] of matchCounts) {
    if (count < MIN_MATCHES_FOR_PRESENCE_RECORD) continue;
    const rate = Math.round((count / scopedMatches.length) * 100);
    if (!bestPresenceRate || rate > bestPresenceRate.value) {
      bestPresenceRate = { playerId, name: nameById.get(playerId) ?? "Joueur", value: rate };
    }
  }

  return {
    topScorer,
    topAssist,
    mostMatches,
    mostBraces,
    mostCards,
    longestScoringStreak,
    longestPresenceStreak,
    longestAssistStreak,
    longestNoCardStreak,
    biggestWin,
    bestPresenceRate,
    mostGoalsInOneMatch,
  };
}
