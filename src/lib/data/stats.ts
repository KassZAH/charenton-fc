import "server-only";
import { supabaseAdmin } from "@/lib/supabase/server";
import { getActivePlayers } from "./players";

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
    getActivePlayers(),
    supabaseAdmin.from("goals").select("scorer_player_id").is("deleted_at", null),
  ]);
  if (error) throw new Error(error.message);
  const nameById = new Map(players.map((p) => [p.id, p.nickname || p.first_name]));
  const rows = (goals ?? []).map((g) => ({ id: g.scorer_player_id }));
  return countBy(rows, nameById).slice(0, limit);
}

export async function getTopAssists(limit = 10): Promise<PlayerCount[]> {
  const [players, { data: goals, error }] = await Promise.all([
    getActivePlayers(),
    supabaseAdmin.from("goals").select("assist_player_id").is("deleted_at", null),
  ]);
  if (error) throw new Error(error.message);
  const nameById = new Map(players.map((p) => [p.id, p.nickname || p.first_name]));
  const rows = (goals ?? []).map((g) => ({ id: g.assist_player_id }));
  return countBy(rows, nameById).slice(0, limit);
}

export async function getTopPresences(limit = 10): Promise<PlayerCount[]> {
  const [players, { data: rows, error }] = await Promise.all([
    getActivePlayers(),
    supabaseAdmin.from("match_players").select("player_id").eq("was_present", true),
  ]);
  if (error) throw new Error(error.message);
  const nameById = new Map(players.map((p) => [p.id, p.nickname || p.first_name]));
  const mapped = (rows ?? []).map((r) => ({ id: r.player_id }));
  return countBy(mapped, nameById).slice(0, limit);
}

export async function getMostCarded(limit = 10): Promise<PlayerCount[]> {
  const [players, { data: cards, error }] = await Promise.all([
    getActivePlayers(),
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
};

export async function getTeamStats(): Promise<TeamStats> {
  const { data: matches, error } = await supabaseAdmin
    .from("matches")
    .select("team_score, opponent_score")
    .eq("status", "completed")
    .is("deleted_at", null);
  if (error) throw new Error(error.message);

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

  return { played: played.length, wins, draws, losses, goalsFor, goalsAgainst };
}
