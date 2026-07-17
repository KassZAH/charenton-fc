import "server-only";
import { supabaseAdmin } from "@/lib/supabase/server";
import { getActivePlayers } from "./players";
import type { SeasonTrophy } from "@/types/models";

export async function getSeasonTrophies(seasonId: string): Promise<(SeasonTrophy & { playerName: string | null })[]> {
  const [players, { data, error }] = await Promise.all([
    getActivePlayers(),
    supabaseAdmin.from("season_trophies").select("*").eq("season_id", seasonId).order("awarded_at", { ascending: false }),
  ]);
  if (error) throw new Error(error.message);
  const nameById = new Map(players.map((p) => [p.id, p.nickname || p.first_name]));
  return (data ?? []).map((t) => ({ ...t, playerName: t.player_id ? nameById.get(t.player_id) ?? null : null }));
}
