import "server-only";
import { supabaseAdmin } from "@/lib/supabase/server";
import type { PlayerMeasurement } from "@/types/models";

export async function getPlayerMeasurements(playerId: string): Promise<PlayerMeasurement[]> {
  const { data, error } = await supabaseAdmin
    .from("player_measurements")
    .select("*")
    .eq("player_id", playerId)
    .order("recorded_at", { ascending: false });
  if (error) throw new Error(error.message);
  return data ?? [];
}
