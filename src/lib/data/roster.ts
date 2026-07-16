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
