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
  /** Lot 20, roadmap V3 — vrai si la première réponse du joueur est arrivée après response_deadline. */
  lateResponse: boolean;
};

/** Réponse de chaque joueur actif pour un match — utilisé par la vue organisateur. */
export async function getMatchAvailabilitySummary(matchId: string): Promise<PlayerAvailability[]> {
  const [players, { data: rows, error }] = await Promise.all([
    getActivePlayers(),
    supabaseAdmin.from("availability").select("player_id, status, late_response").eq("match_id", matchId),
  ]);
  if (error) throw new Error(error.message);

  const rowByPlayerId = new Map((rows ?? []).map((r) => [r.player_id, r]));

  return players.map((player) => {
    const row = rowByPlayerId.get(player.id);
    return {
      player,
      status: (row?.status as AvailabilityStatus | undefined) ?? null,
      lateResponse: row?.late_response ?? false,
    };
  });
}
