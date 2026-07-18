import "server-only";
import { supabaseAdmin } from "@/lib/supabase/server";
import { getAllPlayers } from "./players";
import type { Goal } from "@/types/models";

export type GoalWithNames = Goal & {
  scorer_name: string | null;
  assist_name: string | null;
};

export function computeScorerName(
  g: Goal,
  nameById: Map<string, string>
): string | null {
  if (g.goal_type === "csc" && g.credited_to === "charenton") return "CSC adverse";
  if (g.goal_type === "csc" && g.credited_to === "opponent") {
    return g.scorer_player_id ? `CSC — ${nameById.get(g.scorer_player_id) ?? "Joueur"}` : "CSC Charenton";
  }
  if (g.is_unknown_scorer) return "Buteur inconnu";
  if (g.scorer_player_id) return nameById.get(g.scorer_player_id) ?? "Joueur";
  return null;
}

export async function getMatchGoals(matchId: string): Promise<GoalWithNames[]> {
  const [players, { data: goals, error }] = await Promise.all([
    getAllPlayers(),
    supabaseAdmin
      .from("goals")
      .select("*")
      .eq("match_id", matchId)
      .is("deleted_at", null)
      .order("minute", { ascending: true, nullsFirst: false }),
  ]);
  if (error) throw new Error(error.message);

  const nameById = new Map(players.map((p) => [p.id, p.nickname || p.first_name]));

  return (goals ?? []).map((g) => ({
    ...g,
    scorer_name: computeScorerName(g, nameById),
    assist_name: g.assist_player_id ? (nameById.get(g.assist_player_id) ?? "Joueur") : null,
  }));
}
