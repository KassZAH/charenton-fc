import "server-only";
import { supabaseAdmin } from "@/lib/supabase/server";
import { getActivePlayers } from "./players";
import { formatMatchDate } from "@/lib/format";
import { getDemoMatchIds } from "./demo-scope";

/** Voir player-stats.ts. Uniquement pour les vues "toutes saisons" — getMatchBreakdowns/getSeasonProjection restent utilisables tels quels en mode Démo via un seasonId explicite. */
async function demoMatchExclusionFilter(): Promise<string | null> {
  const demoMatchIds = await getDemoMatchIds();
  return demoMatchIds.length > 0 ? `(${demoMatchIds.join(",")})` : null;
}

export type RecordLine = {
  played: number;
  wins: number;
  draws: number;
  losses: number;
  goalsFor: number;
  goalsAgainst: number;
};

function emptyRecord(): RecordLine {
  return { played: 0, wins: 0, draws: 0, losses: 0, goalsFor: 0, goalsAgainst: 0 };
}

function addResult(r: RecordLine, teamScore: number, opponentScore: number) {
  r.played++;
  r.goalsFor += teamScore;
  r.goalsAgainst += opponentScore;
  if (teamScore > opponentScore) r.wins++;
  else if (teamScore < opponentScore) r.losses++;
  else r.draws++;
}

export type FormResult = {
  result: "W" | "D" | "L";
  opponentName: string;
  dateLabel: string;
  teamScore: number;
  opponentScore: number;
};

/** Forme sur les derniers matchs — le plus ancien en premier, prêt à afficher en séquence. */
export async function getRecentForm(limit = 5): Promise<FormResult[]> {
  const exclude = await demoMatchExclusionFilter();
  let query = supabaseAdmin
    .from("matches")
    .select("id, match_date, opponent_id, team_score, opponent_score")
    .eq("status", "completed")
    .is("deleted_at", null);
  if (exclude) query = query.not("id", "in", exclude);

  const { data: matches, error } = await query.order("match_date", { ascending: false }).limit(limit);
  if (error) throw new Error(error.message);

  const opponentIds = [...new Set((matches ?? []).map((m) => m.opponent_id).filter((id): id is string => !!id))];
  const { data: opponents } =
    opponentIds.length > 0
      ? await supabaseAdmin.from("opponents").select("id, name").in("id", opponentIds)
      : { data: [] as { id: string; name: string }[] };
  const nameById = new Map((opponents ?? []).map((o) => [o.id, o.name]));

  return (matches ?? [])
    .slice()
    .reverse()
    .map((m) => {
      const teamScore = m.team_score ?? 0;
      const opponentScore = m.opponent_score ?? 0;
      return {
        result: teamScore > opponentScore ? "W" : teamScore < opponentScore ? "L" : "D",
        opponentName: m.opponent_id ? (nameById.get(m.opponent_id) ?? "Adversaire") : "Adversaire",
        dateLabel: formatMatchDate(m.match_date),
        teamScore,
        opponentScore,
      } as FormResult;
    });
}

const WEEKDAYS = ["Dimanche", "Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi"];
const GOAL_TYPE_LABELS: Record<string, string> = {
  classique: "But classique",
  penalty: "Penalty",
  coup_franc: "Coup franc",
  csc: "CSC adverse",
};

function formatMonthLabel(key: string): string {
  const [y, m] = key.split("-").map(Number);
  return new Date(y, m - 1, 1).toLocaleDateString("fr-FR", { month: "long", year: "numeric" });
}

export type MatchBreakdowns = {
  homeAway: { home: RecordLine; away: RecordLine };
  byWeekday: { label: string; record: RecordLine }[];
  byMonth: { label: string; record: RecordLine }[];
  bestMonth: { label: string; record: RecordLine } | null;
  distinctScorers: number;
  goalTypeBreakdown: { type: string; label: string; count: number }[];
  byFormation: { formation: string; record: RecordLine }[];
};

/** Un seul passage sur les matchs terminés pour dériver plusieurs répartitions à la fois. */
export async function getMatchBreakdowns(seasonId: string | null): Promise<MatchBreakdowns> {
  let matchQuery = supabaseAdmin
    .from("matches")
    .select("id, match_date, home_or_away, team_score, opponent_score")
    .eq("status", "completed")
    .is("deleted_at", null);
  if (seasonId) {
    matchQuery = matchQuery.eq("season_id", seasonId);
  } else {
    const exclude = await demoMatchExclusionFilter();
    if (exclude) matchQuery = matchQuery.not("id", "in", exclude);
  }
  const { data: matches, error } = await matchQuery.order("match_date", { ascending: true });
  if (error) throw new Error(error.message);

  const scoped = matches ?? [];
  const matchIds = scoped.map((m) => m.id);

  const home = emptyRecord();
  const away = emptyRecord();
  const weekdayRecords = new Map<number, RecordLine>();
  const monthRecords = new Map<string, RecordLine>();

  for (const m of scoped) {
    const teamScore = m.team_score ?? 0;
    const opponentScore = m.opponent_score ?? 0;
    addResult(m.home_or_away === "away" ? away : home, teamScore, opponentScore);

    const weekday = new Date(`${m.match_date}T00:00:00`).getDay();
    const wr = weekdayRecords.get(weekday) ?? emptyRecord();
    addResult(wr, teamScore, opponentScore);
    weekdayRecords.set(weekday, wr);

    const monthKey = m.match_date.slice(0, 7);
    const mr = monthRecords.get(monthKey) ?? emptyRecord();
    addResult(mr, teamScore, opponentScore);
    monthRecords.set(monthKey, mr);
  }

  const byWeekday = [...weekdayRecords.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([wd, record]) => ({ label: WEEKDAYS[wd], record }));
  const byMonth = [...monthRecords.entries()]
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([key, record]) => ({ label: formatMonthLabel(key), record }));
  const bestMonth = byMonth.reduce<(typeof byMonth)[number] | null>(
    (best, cur) => (!best || cur.record.wins > best.record.wins ? cur : best),
    null
  );

  let distinctScorers = 0;
  let goalTypeBreakdown: MatchBreakdowns["goalTypeBreakdown"] = [];
  let byFormation: MatchBreakdowns["byFormation"] = [];

  if (matchIds.length > 0) {
    const [goalsRes, lineupsRes] = await Promise.all([
      supabaseAdmin
        .from("goals")
        .select("match_id, scorer_player_id, goal_type")
        .in("match_id", matchIds)
        .eq("credited_to", "charenton")
        .is("deleted_at", null),
      supabaseAdmin.from("match_lineups").select("match_id, formation").in("match_id", matchIds),
    ]);
    if (goalsRes.error) throw new Error(goalsRes.error.message);
    if (lineupsRes.error) throw new Error(lineupsRes.error.message);

    const scorers = new Set((goalsRes.data ?? []).map((g) => g.scorer_player_id).filter((id): id is string => !!id));
    distinctScorers = scorers.size;

    const typeCounts = new Map<string, number>();
    for (const g of goalsRes.data ?? []) {
      const type = g.goal_type ?? "classique";
      typeCounts.set(type, (typeCounts.get(type) ?? 0) + 1);
    }
    goalTypeBreakdown = [...typeCounts.entries()]
      .map(([type, count]) => ({ type, label: GOAL_TYPE_LABELS[type] ?? type, count }))
      .sort((a, b) => b.count - a.count);

    const matchById = new Map(scoped.map((m) => [m.id, m]));
    const formationRecords = new Map<string, RecordLine>();
    for (const l of lineupsRes.data ?? []) {
      const m = matchById.get(l.match_id);
      if (!m) continue;
      const r = formationRecords.get(l.formation) ?? emptyRecord();
      addResult(r, m.team_score ?? 0, m.opponent_score ?? 0);
      formationRecords.set(l.formation, r);
    }
    byFormation = [...formationRecords.entries()]
      .map(([formation, record]) => ({ formation, record }))
      .sort((a, b) => b.record.played - a.record.played);
  }

  return { homeAway: { home, away }, byWeekday, byMonth, bestMonth, distinctScorers, goalTypeBreakdown, byFormation };
}

const GOAL_MILESTONES = [10, 25, 50, 100];
const PRESENCE_MILESTONES = [10, 25, 50, 100];
const MILESTONE_WINDOW = 3;

export type UpcomingMilestone = {
  playerId: string;
  name: string;
  current: number;
  target: number;
  remaining: number;
  kind: "goals" | "presences";
};

/** Joueurs à quelques unités d'un cap rond (10/25/50/100 buts ou présences). */
export async function getUpcomingMilestones(): Promise<UpcomingMilestone[]> {
  const players = await getActivePlayers();
  const nameById = new Map(players.map((p) => [p.id, p.nickname || p.first_name]));

  const exclude = await demoMatchExclusionFilter();
  let goalsQuery = supabaseAdmin.from("goals").select("scorer_player_id").eq("credited_to", "charenton").is("deleted_at", null);
  let presQuery = supabaseAdmin.from("match_players").select("player_id").eq("was_present", true);
  if (exclude) {
    goalsQuery = goalsQuery.not("match_id", "in", exclude);
    presQuery = presQuery.not("match_id", "in", exclude);
  }

  const [goalsRes, presRes] = await Promise.all([goalsQuery, presQuery]);
  if (goalsRes.error) throw new Error(goalsRes.error.message);
  if (presRes.error) throw new Error(presRes.error.message);

  const goalCounts = new Map<string, number>();
  for (const g of goalsRes.data ?? []) {
    if (g.scorer_player_id) goalCounts.set(g.scorer_player_id, (goalCounts.get(g.scorer_player_id) ?? 0) + 1);
  }
  const presCounts = new Map<string, number>();
  for (const p of presRes.data ?? []) {
    if (p.player_id) presCounts.set(p.player_id, (presCounts.get(p.player_id) ?? 0) + 1);
  }

  const results: UpcomingMilestone[] = [];
  function checkMilestones(counts: Map<string, number>, milestones: number[], kind: "goals" | "presences") {
    for (const [playerId, current] of counts) {
      const next = milestones.find((m) => m > current);
      if (next && next - current <= MILESTONE_WINDOW) {
        results.push({ playerId, name: nameById.get(playerId) ?? "Joueur", current, target: next, remaining: next - current, kind });
      }
    }
  }
  checkMilestones(goalCounts, GOAL_MILESTONES, "goals");
  checkMilestones(presCounts, PRESENCE_MILESTONES, "presences");

  return results.sort((a, b) => a.remaining - b.remaining);
}

export type SeasonProjection = {
  played: number;
  scheduled: number;
  totalProjected: number;
  winRatePercent: number;
  projectedWins: number;
};

/** Projection au rythme actuel — toujours à présenter comme une estimation, pas une certitude. */
export async function getSeasonProjection(seasonId: string | null): Promise<SeasonProjection | null> {
  if (!seasonId) return null;

  const [playedRes, scheduledRes, matchesRes] = await Promise.all([
    supabaseAdmin
      .from("matches")
      .select("*", { count: "exact", head: true })
      .eq("season_id", seasonId)
      .eq("status", "completed")
      .is("deleted_at", null),
    supabaseAdmin
      .from("matches")
      .select("*", { count: "exact", head: true })
      .eq("season_id", seasonId)
      .eq("status", "scheduled")
      .is("deleted_at", null),
    supabaseAdmin
      .from("matches")
      .select("team_score, opponent_score")
      .eq("season_id", seasonId)
      .eq("status", "completed")
      .is("deleted_at", null),
  ]);
  if (playedRes.error) throw new Error(playedRes.error.message);
  if (scheduledRes.error) throw new Error(scheduledRes.error.message);
  if (matchesRes.error) throw new Error(matchesRes.error.message);

  const played = playedRes.count ?? 0;
  if (played === 0) return null;

  const wins = (matchesRes.data ?? []).filter((m) => (m.team_score ?? 0) > (m.opponent_score ?? 0)).length;
  const winRate = wins / played;
  const scheduled = scheduledRes.count ?? 0;
  const totalProjected = played + scheduled;

  return {
    played,
    scheduled,
    totalProjected,
    winRatePercent: Math.round(winRate * 100),
    projectedWins: Math.round(winRate * totalProjected),
  };
}

const MIN_SAMPLE_WITH_WITHOUT = 3;

export type WithWithoutRecord = { withPlayer: RecordLine; withoutPlayer: RecordLine; sufficientSample: boolean };

/** Bilan d'équipe avec/sans un joueur — jamais présenté sans indiquer que l'échantillon peut être limité. */
export async function getTeamRecordWithWithoutPlayer(playerId: string): Promise<WithWithoutRecord | null> {
  const exclude = await demoMatchExclusionFilter();
  let matchesQuery = supabaseAdmin.from("matches").select("id, team_score, opponent_score").eq("status", "completed").is("deleted_at", null);
  let presenceQuery = supabaseAdmin.from("match_players").select("match_id").eq("player_id", playerId).eq("was_present", true);
  if (exclude) {
    matchesQuery = matchesQuery.not("id", "in", exclude);
    presenceQuery = presenceQuery.not("match_id", "in", exclude);
  }

  const [{ data: matches, error: matchesError }, { data: presenceRows, error: presenceError }] = await Promise.all([matchesQuery, presenceQuery]);
  if (matchesError) throw new Error(matchesError.message);
  if (presenceError) throw new Error(presenceError.message);

  const presentMatchIds = new Set((presenceRows ?? []).map((r) => r.match_id));
  const withPlayer = emptyRecord();
  const withoutPlayer = emptyRecord();
  for (const m of matches ?? []) {
    addResult(presentMatchIds.has(m.id) ? withPlayer : withoutPlayer, m.team_score ?? 0, m.opponent_score ?? 0);
  }
  if (withPlayer.played === 0 && withoutPlayer.played === 0) return null;

  return {
    withPlayer,
    withoutPlayer,
    sufficientSample: withPlayer.played >= MIN_SAMPLE_WITH_WITHOUT && withoutPlayer.played >= MIN_SAMPLE_WITH_WITHOUT,
  };
}
