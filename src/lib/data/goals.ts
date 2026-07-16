import "server-only";
import { supabaseAdmin } from "@/lib/supabase/server";
import { getActivePlayers } from "./players";
import type { Goal } from "@/types/models";

export type GoalWithNames = Goal & {
  scorer_name: string | null;
  assist_name: string | null;
};

export async function getMatchGoals(matchId: string): Promise<GoalWithNames[]> {
  const [players, { data: goals, error }] = await Promise.all([
    getActivePlayers(),
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
    scorer_name: g.is_unknown_scorer
      ? "Buteur inconnu"
      : g.scorer_player_id
        ? (nameById.get(g.scorer_player_id) ?? "Joueur")
        : null,
    assist_name: g.assist_player_id ? (nameById.get(g.assist_player_id) ?? "Joueur") : null,
  }));
}
