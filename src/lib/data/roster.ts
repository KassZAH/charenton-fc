import "server-only";
import { supabaseAdmin } from "@/lib/supabase/server";

export async function getMatchRoster(matchId: string): Promise<string[]> {
  const { data, error } = await supabaseAdmin
    .from("match_players")
    .select("player_id")
    .eq("match_id", matchId)
    .eq("was_present", true);
  if (error) throw new Error(error.message);
  return (data ?? []).map((r) => r.player_id).filter((id): id is string => !!id);
}

/** Gardien(s) réellement désignés pour ce match (roadmap V3, Lot 13) — jamais déduit du poste habituel. */
export async function getMatchGoalkeepers(matchId: string): Promise<string[]> {
  const { data, error } = await supabaseAdmin
    .from("match_players")
    .select("player_id")
    .eq("match_id", matchId)
    .eq("goalkeeper", true);
  if (error) throw new Error(error.message);
  return (data ?? []).map((r) => r.player_id).filter((id): id is string => !!id);
}
