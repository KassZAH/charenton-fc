import "server-only";
import { supabaseAdmin } from "@/lib/supabase/server";
import { getActivePlayers } from "./players";
import type { AvailabilityStatus, Player } from "@/types/models";

export async function getMyAvailability(
  matchId: string,
  playerId: string
): Promise<AvailabilityStatus | null> {
  const { data, error } = await supabaseAdmin
    .from("availability")
    .select("status")
    .eq("match_id", matchId)
    .eq("player_id", playerId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return (data?.status as AvailabilityStatus | undefined) ?? null;
}

export type PlayerAvailability = {
  player: Player;
  status: AvailabilityStatus | null;
};

/** Réponse de chaque joueur actif pour un match — utilisé par la vue organisateur. */
export async function getMatchAvailabilitySummary(matchId: string): Promise<PlayerAvailability[]> {
  const [players, { data: rows, error }] = await Promise.all([
    getActivePlayers(),
    supabaseAdmin.from("availability").select("player_id, status").eq("match_id", matchId),
  ]);
  if (error) throw new Error(error.message);

  const statusByPlayerId = new Map(
    (rows ?? []).map((r) => [r.player_id, r.status as AvailabilityStatus])
  );

  return players.map((player) => ({
    player,
    status: statusByPlayerId.get(player.id) ?? null,
  }));
}
