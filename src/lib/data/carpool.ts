import "server-only";
import { supabaseAdmin } from "@/lib/supabase/server";
import { getActivePlayers } from "./players";

export type CarpoolSummary = {
  drivers: { name: string; seats: number }[];
  riders: { name: string; comment: string | null }[];
  totalSeats: number;
};

export async function getMatchCarpoolSummary(matchId: string): Promise<CarpoolSummary> {
  const [players, { data: rows, error }] = await Promise.all([
    getActivePlayers(),
    supabaseAdmin
      .from("availability")
      .select("player_id, can_drive, needs_ride, available_seats, comment")
      .eq("match_id", matchId),
  ]);
  if (error) throw new Error(error.message);

  const nameById = new Map(players.map((p) => [p.id, p.nickname || p.first_name]));

  const drivers = (rows ?? [])
    .filter((r) => r.can_drive)
    .map((r) => ({ name: nameById.get(r.player_id) ?? "?", seats: r.available_seats ?? 0 }));
  const riders = (rows ?? [])
    .filter((r) => r.needs_ride)
    .map((r) => ({ name: nameById.get(r.player_id) ?? "?", comment: r.comment }));

  return { drivers, riders, totalSeats: drivers.reduce((sum, d) => sum + d.seats, 0) };
}

export type MyCarpoolInfo = {
  canDrive: boolean;
  needsRide: boolean;
  availableSeats: number;
  comment: string | null;
};

export async function getMyCarpoolInfo(matchId: string, playerId: string): Promise<MyCarpoolInfo | null> {
  const { data, error } = await supabaseAdmin
    .from("availability")
    .select("can_drive, needs_ride, available_seats, comment")
    .eq("match_id", matchId)
    .eq("player_id", playerId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) return null;
  return {
    canDrive: data.can_drive ?? false,
    needsRide: data.needs_ride ?? false,
    availableSeats: data.available_seats ?? 0,
    comment: data.comment,
  };
}
