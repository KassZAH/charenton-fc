import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { supabaseAdmin } from "@/lib/supabase/server";
import { getActivePlayers } from "./players";
import type { CarpoolAssignment } from "@/types/models";

/** carpool_assignments n'est pas dans les types générés (voir models.ts). */
const untypedDb = supabaseAdmin as unknown as SupabaseClient;

/** Places restantes chez un conducteur — jamais négatif (Lot 23, roadmap V3). Fonction pure. */
export function computeRemainingSeats(totalSeats: number, assignedCount: number): number {
  return Math.max(0, totalSeats - assignedCount);
}

/** Déficit = des joueurs cherchent une place sans qu'il reste assez de sièges libres au total. */
export function hasCarpoolDeficit(unassignedRidersCount: number, totalRemainingSeats: number): boolean {
  return unassignedRidersCount > totalRemainingSeats;
}

export type DriverCarpoolInfo = {
  playerId: string;
  name: string;
  seats: number;
  departurePoint: string | null;
  departureTime: string | null;
  assignedPassengers: { playerId: string; name: string }[];
  remainingSeats: number;
};

export type UnassignedRider = {
  playerId: string;
  name: string;
  comment: string | null;
};

export type CarpoolSummary = {
  drivers: DriverCarpoolInfo[];
  unassignedRiders: UnassignedRider[];
  totalSeats: number;
  totalRemainingSeats: number;
  hasDeficit: boolean;
};

export async function getMatchCarpoolSummary(matchId: string): Promise<CarpoolSummary> {
  const [players, { data: rows, error }, { data: assignments, error: assignError }] = await Promise.all([
    getActivePlayers(),
    supabaseAdmin
      .from("availability")
      .select("player_id, can_drive, needs_ride, available_seats, comment, departure_point, departure_time")
      .eq("match_id", matchId),
    untypedDb.from("carpool_assignments").select("*").eq("match_id", matchId),
  ]);
  if (error) throw new Error(error.message);
  if (assignError) throw new Error(assignError.message);

  const nameById = new Map(players.map((p) => [p.id, p.nickname || p.first_name]));
  const assignmentsByDriver = new Map<string, CarpoolAssignment[]>();
  const assignedPassengerIds = new Set<string>();
  for (const a of (assignments ?? []) as CarpoolAssignment[]) {
    const list = assignmentsByDriver.get(a.driver_player_id) ?? [];
    list.push(a);
    assignmentsByDriver.set(a.driver_player_id, list);
    assignedPassengerIds.add(a.passenger_player_id);
  }

  const drivers: DriverCarpoolInfo[] = (rows ?? [])
    .filter((r) => r.can_drive)
    .map((r) => {
      const assigned = assignmentsByDriver.get(r.player_id) ?? [];
      const seats = r.available_seats ?? 0;
      return {
        playerId: r.player_id,
        name: nameById.get(r.player_id) ?? "?",
        seats,
        departurePoint: r.departure_point,
        departureTime: r.departure_time,
        assignedPassengers: assigned.map((a) => ({
          playerId: a.passenger_player_id,
          name: nameById.get(a.passenger_player_id) ?? "?",
        })),
        remainingSeats: computeRemainingSeats(seats, assigned.length),
      };
    });

  const unassignedRiders: UnassignedRider[] = (rows ?? [])
    .filter((r) => r.needs_ride && !assignedPassengerIds.has(r.player_id))
    .map((r) => ({ playerId: r.player_id, name: nameById.get(r.player_id) ?? "?", comment: r.comment }));

  const totalSeats = drivers.reduce((sum, d) => sum + d.seats, 0);
  const totalRemainingSeats = drivers.reduce((sum, d) => sum + d.remainingSeats, 0);

  return {
    drivers,
    unassignedRiders,
    totalSeats,
    totalRemainingSeats,
    hasDeficit: hasCarpoolDeficit(unassignedRiders.length, totalRemainingSeats),
  };
}

export type MyCarpoolInfo = {
  canDrive: boolean;
  needsRide: boolean;
  availableSeats: number;
  comment: string | null;
  departurePoint: string | null;
  departureTime: string | null;
};

export async function getMyCarpoolInfo(matchId: string, playerId: string): Promise<MyCarpoolInfo | null> {
  const { data, error } = await supabaseAdmin
    .from("availability")
    .select("can_drive, needs_ride, available_seats, comment, departure_point, departure_time")
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
    departurePoint: data.departure_point,
    departureTime: data.departure_time,
  };
}
