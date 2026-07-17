import "server-only";
import { supabaseAdmin } from "@/lib/supabase/server";
import { canView, type Viewer } from "@/lib/visibility";
import type { PlayerGoal } from "@/types/models";

/** Toujours tout, pour le propriétaire ou dans son propre espace de gestion. */
export async function getPlayerGoals(playerId: string): Promise<PlayerGoal[]> {
  const { data, error } = await supabaseAdmin
    .from("player_goals")
    .select("*")
    .eq("player_id", playerId)
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return data ?? [];
}

/** Filtré selon la visibilité de chaque objectif — pour l'affichage sur la fiche d'un autre joueur. */
export async function getVisiblePlayerGoals(playerId: string, viewer: Viewer | null): Promise<PlayerGoal[]> {
  const goals = await getPlayerGoals(playerId);
  return goals.filter((g) => canView(g.visibility as "private" | "coach" | "team", playerId, viewer));
}
