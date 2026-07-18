import "server-only";
import { supabaseAdmin } from "@/lib/supabase/server";
import { getAllPlayers } from "./players";
import { formatMatchDate } from "@/lib/format";
import { HALL_OF_FAME_CATEGORY_LABELS, type HallOfFameEntry, type ClubQuote, type JerseyHistoryEntry } from "@/types/models";

export type TimelineEntry = {
  date: string; // ISO date, pour le tri
  label: string;
  detail: string;
  href?: string;
};

type MatchMemoryRow = {
  id: string;
  match_date: string;
  opponent_id: string | null;
  team_score: number | null;
  opponent_score: number | null;
  home_or_away: string;
  description: string | null;
};

async function getCompletedMatchesWithScorers() {
  const { data: matches, error } = await supabaseAdmin
    .from("matches")
    .select("id, match_date, opponent_id, team_score, opponent_score, home_or_away, description")
    .eq("status", "completed")
    .is("deleted_at", null)
    .order("match_date", { ascending: true });
  if (error) throw new Error(error.message);

  const scopedMatches = (matches ?? []) as MatchMemoryRow[];
  const matchIds = scopedMatches.map((m) => m.id);
  const opponentIds = [...new Set(scopedMatches.map((m) => m.opponent_id).filter((id): id is string => !!id))];

  const [goalsRes, opponentsRes, playersRes] = await Promise.all([
    matchIds.length > 0
      ? supabaseAdmin
          .from("goals")
          .select("match_id, scorer_player_id, minute")
          .in("match_id", matchIds)
          .eq("credited_to", "charenton")
          .is("deleted_at", null)
      : Promise.resolve({ data: [], error: null }),
    opponentIds.length > 0
      ? supabaseAdmin.from("opponents").select("id, name").in("id", opponentIds)
      : Promise.resolve({ data: [], error: null }),
    getAllPlayers(),
  ]);
  if (goalsRes.error) throw new Error(goalsRes.error.message);
  if (opponentsRes.error) throw new Error(opponentsRes.error.message);

  const opponentNameById = new Map((opponentsRes.data ?? []).map((o) => [o.id, o.name]));
  const nameById = new Map(playersRes.map((p) => [p.id, p.nickname || p.first_name]));

  const scorersByMatch = new Map<string, string[]>();
  for (const g of goalsRes.data ?? []) {
    if (!g.scorer_player_id) continue;
    const list = scorersByMatch.get(g.match_id) ?? [];
    list.push(nameById.get(g.scorer_player_id) ?? "Joueur");
    scorersByMatch.set(g.match_id, list);
  }

  return { scopedMatches, opponentNameById, scorersByMatch, goals: goalsRes.data ?? [] };
}

/**
 * Frise historique : calculée à la volée, jamais stockée (même logique que records.ts).
 * Combine création du club, première victoire, premier triplé, plus grosse victoire,
 * fins de saison et intronisations au Hall of Fame.
 */
export async function getClubTimeline(): Promise<TimelineEntry[]> {
  const [{ scopedMatches, opponentNameById, goals }, teamSettingsRes, seasonsRes, hallOfFameRes] = await Promise.all([
    getCompletedMatchesWithScorers(),
    supabaseAdmin.from("team_settings").select("founded_date, founding_note").maybeSingle(),
    supabaseAdmin.from("seasons").select("id, name, end_date, is_active").order("end_date", { ascending: true }),
    supabaseAdmin
      .from("hall_of_fame_entries")
      .select("id, display_name, player_id, category, inducted_at")
      .order("inducted_at", { ascending: true }),
  ]);
  if (teamSettingsRes.error) throw new Error(teamSettingsRes.error.message);
  if (seasonsRes.error) throw new Error(seasonsRes.error.message);
  if (hallOfFameRes.error) throw new Error(hallOfFameRes.error.message);

  const entries: TimelineEntry[] = [];

  const founding = teamSettingsRes.data;
  if (founding?.founded_date) {
    entries.push({
      date: founding.founded_date,
      label: "Création du club",
      detail: founding.founding_note || "Charenton FC voit le jour.",
    });
  }

  const goalsByMatchAndScorer = new Map<string, Map<string, number>>();
  for (const g of goals) {
    if (!g.scorer_player_id) continue;
    const perMatch = goalsByMatchAndScorer.get(g.match_id) ?? new Map<string, number>();
    perMatch.set(g.scorer_player_id, (perMatch.get(g.scorer_player_id) ?? 0) + 1);
    goalsByMatchAndScorer.set(g.match_id, perMatch);
  }

  const opponentLabel = (m: MatchMemoryRow) => (m.opponent_id ? opponentNameById.get(m.opponent_id) ?? "Adversaire" : "Adversaire");

  const firstWin = scopedMatches.find((m) => (m.team_score ?? 0) > (m.opponent_score ?? 0));
  if (firstWin) {
    entries.push({
      date: firstWin.match_date,
      label: "Première victoire",
      detail: `${firstWin.team_score}–${firstWin.opponent_score} vs ${opponentLabel(firstWin)}`,
      href: `/matches/${firstWin.id}`,
    });
  }

  let firstHatTrick: { match: MatchMemoryRow; count: number } | null = null;
  for (const m of scopedMatches) {
    const perScorer = goalsByMatchAndScorer.get(m.id);
    if (!perScorer) continue;
    for (const count of perScorer.values()) {
      if (count >= 3) {
        firstHatTrick = { match: m, count };
        break;
      }
    }
    if (firstHatTrick) break;
  }
  if (firstHatTrick) {
    entries.push({
      date: firstHatTrick.match.match_date,
      label: "Premier triplé",
      detail: `vs ${opponentLabel(firstHatTrick.match)} (${formatMatchDate(firstHatTrick.match.match_date)})`,
      href: `/matches/${firstHatTrick.match.id}`,
    });
  }

  let biggestWin: MatchMemoryRow | null = null;
  let biggestDiff = 0;
  for (const m of scopedMatches) {
    const diff = (m.team_score ?? 0) - (m.opponent_score ?? 0);
    if (diff > biggestDiff) {
      biggestDiff = diff;
      biggestWin = m;
    }
  }
  if (biggestWin) {
    entries.push({
      date: biggestWin.match_date,
      label: "Plus grosse victoire",
      detail: `${biggestWin.team_score}–${biggestWin.opponent_score} vs ${opponentLabel(biggestWin)}`,
      href: `/matches/${biggestWin.id}`,
    });
  }

  for (const s of seasonsRes.data ?? []) {
    if (s.is_active || !s.end_date) continue;
    entries.push({
      date: s.end_date,
      label: "Fin de saison",
      detail: s.name,
    });
  }

  const allPlayers = await getAllPlayers();
  const playerNameById = new Map(allPlayers.map((p) => [p.id, p.nickname || p.first_name]));
  for (const h of hallOfFameRes.data ?? []) {
    const name = h.display_name || (h.player_id ? playerNameById.get(h.player_id) : null) || "Un membre du club";
    entries.push({
      date: h.inducted_at,
      label: "Entrée au Hall of Fame",
      detail: `${name} — ${HALL_OF_FAME_CATEGORY_LABELS[h.category as keyof typeof HALL_OF_FAME_CATEGORY_LABELS] ?? h.category}`,
      href: "/memoire/hall-of-fame",
    });
  }

  return entries.sort((a, b) => a.date.localeCompare(b.date));
}

export type MatchMemory = {
  matchId: string;
  matchDate: string;
  opponentName: string;
  homeOrAway: string;
  teamScore: number | null;
  opponentScore: number | null;
  scorers: string[];
  anecdote: string | null;
};

function toMemory(m: MatchMemoryRow, opponentNameById: Map<string, string>, scorersByMatch: Map<string, string[]>): MatchMemory {
  return {
    matchId: m.id,
    matchDate: m.match_date,
    opponentName: m.opponent_id ? opponentNameById.get(m.opponent_id) ?? "Adversaire" : "Adversaire",
    homeOrAway: m.home_or_away,
    teamScore: m.team_score,
    opponentScore: m.opponent_score,
    scorers: scorersByMatch.get(m.id) ?? [],
    anecdote: m.description,
  };
}

/** Un ancien match ayant eu lieu au même jour/mois qu'aujourd'hui, une année différente. */
export async function getThisDayInHistory(): Promise<MatchMemory | null> {
  const { scopedMatches, opponentNameById, scorersByMatch } = await getCompletedMatchesWithScorers();
  const today = new Date();
  const todayMonth = today.getMonth();
  const todayDay = today.getDate();

  const candidates = scopedMatches.filter((m) => {
    const d = new Date(m.match_date + "T00:00:00");
    return d.getMonth() === todayMonth && d.getDate() === todayDay && d.getFullYear() !== today.getFullYear();
  });
  if (candidates.length === 0) return null;
  const pick = candidates[candidates.length - 1];
  return toMemory(pick, opponentNameById, scorersByMatch);
}

/** Souvenir aléatoire parmi tous les matchs terminés. */
export async function getRandomMemory(): Promise<MatchMemory | null> {
  const { scopedMatches, opponentNameById, scorersByMatch } = await getCompletedMatchesWithScorers();
  if (scopedMatches.length === 0) return null;
  const pick = scopedMatches[Math.floor(Math.random() * scopedMatches.length)];
  return toMemory(pick, opponentNameById, scorersByMatch);
}

export async function getHallOfFameEntries(): Promise<(HallOfFameEntry & { playerName: string | null })[]> {
  const [{ data, error }, players] = await Promise.all([
    supabaseAdmin.from("hall_of_fame_entries").select("*").order("inducted_at", { ascending: false }),
    getAllPlayers(),
  ]);
  if (error) throw new Error(error.message);
  const nameById = new Map(players.map((p) => [p.id, p.nickname || p.first_name]));
  return (data ?? []).map((e) => ({ ...e, playerName: e.player_id ? nameById.get(e.player_id) ?? null : null }));
}

export async function getClubQuotes(): Promise<(ClubQuote & { playerName: string | null })[]> {
  const [{ data, error }, players] = await Promise.all([
    supabaseAdmin.from("club_quotes").select("*").order("created_at", { ascending: false }),
    getAllPlayers(),
  ]);
  if (error) throw new Error(error.message);
  const nameById = new Map(players.map((p) => [p.id, p.nickname || p.first_name]));
  return (data ?? []).map((q) => ({ ...q, playerName: q.player_id ? nameById.get(q.player_id) ?? null : null }));
}

export async function getJerseyHistoryEntries(): Promise<JerseyHistoryEntry[]> {
  const { data, error } = await supabaseAdmin
    .from("jersey_history_entries")
    .select("*")
    .order("season_label", { ascending: false });
  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function getClubFounding(): Promise<{ founded_date: string | null; founding_note: string | null }> {
  const { data, error } = await supabaseAdmin
    .from("team_settings")
    .select("founded_date, founding_note")
    .maybeSingle();
  if (error) throw new Error(error.message);
  return { founded_date: data?.founded_date ?? null, founding_note: data?.founding_note ?? null };
}
