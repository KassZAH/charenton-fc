"use server";

import { revalidatePath } from "next/cache";
import type { SupabaseClient } from "@supabase/supabase-js";
import { requireUser, requireFreshCoach } from "@/lib/auth/current-user";
import { supabaseAdmin } from "@/lib/supabase/server";

const untypedDb = supabaseAdmin as unknown as SupabaseClient;

export async function setCarpoolInfo(matchId: string, formData: FormData) {
  const user = await requireUser();

  const role = String(formData.get("carpool_role") ?? "none");
  const seatsRaw = Number(formData.get("available_seats") ?? 0);
  const comment = String(formData.get("ride_comment") ?? "").trim() || null;
  const departurePoint = String(formData.get("departure_point") ?? "").trim() || null;
  const departureTime = String(formData.get("departure_time") ?? "") || null;

  const canDrive = role === "driver";
  const needsRide = role === "rider";
  const availableSeats = canDrive && Number.isFinite(seatsRaw) && seatsRaw > 0 ? Math.floor(seatsRaw) : 0;

  const { data: existing } = await supabaseAdmin
    .from("availability")
    .select("id")
    .eq("match_id", matchId)
    .eq("player_id", user.playerId)
    .maybeSingle();
  if (!existing) {
    throw new Error("Réponds d'abord à ta présence pour ce match avant d'indiquer le covoiturage.");
  }

  const { error } = await supabaseAdmin
    .from("availability")
    .update({
      can_drive: canDrive,
      needs_ride: needsRide,
      available_seats: availableSeats,
      comment,
      departure_point: canDrive ? departurePoint : null,
      departure_time: canDrive ? departureTime : null,
    })
    .eq("id", existing.id);
  if (error) throw new Error(error.message);

  if (!canDrive) {
    // Un ex-conducteur qui redevient passager/aucun libère automatiquement ses affectations —
    // jamais un passager "assigné" à quelqu'un qui ne conduit plus.
    await untypedDb.from("carpool_assignments").delete().eq("match_id", matchId).eq("driver_player_id", user.playerId);
  }
  if (!needsRide) {
    await untypedDb.from("carpool_assignments").delete().eq("match_id", matchId).eq("passenger_player_id", user.playerId);
  }

  revalidatePath(`/matches/${matchId}`);
}

/**
 * Affectation d'un passager à un conducteur (Lot 23, roadmap V3) — réservée au coach
 * (dispatcher), qui reste décisionnaire. L'unicité (un passager, un seul conducteur par match)
 * est garantie par carpool_assignments_unique_passenger — un nouvel appel remplace l'ancienne
 * affectation plutôt que d'échouer, pour permettre de réassigner sans étape de retrait préalable.
 */
export async function assignCarpoolPassenger(matchId: string, driverPlayerId: string, passengerPlayerId: string) {
  await requireFreshCoach();
  if (driverPlayerId === passengerPlayerId) throw new Error("Un joueur ne peut pas être son propre passager.");

  const { error } = await untypedDb
    .from("carpool_assignments")
    .upsert(
      { match_id: matchId, driver_player_id: driverPlayerId, passenger_player_id: passengerPlayerId },
      { onConflict: "match_id,passenger_player_id" }
    );
  if (error) throw new Error(error.message);

  revalidatePath(`/matches/${matchId}`);
}

export async function unassignCarpoolPassenger(matchId: string, passengerPlayerId: string) {
  await requireFreshCoach();

  const { error } = await untypedDb
    .from("carpool_assignments")
    .delete()
    .eq("match_id", matchId)
    .eq("passenger_player_id", passengerPlayerId);
  if (error) throw new Error(error.message);

  revalidatePath(`/matches/${matchId}`);
}
