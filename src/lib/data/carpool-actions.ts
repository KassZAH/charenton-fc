"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth/current-user";
import { supabaseAdmin } from "@/lib/supabase/server";

export async function setCarpoolInfo(matchId: string, formData: FormData) {
  const user = await requireUser();

  const role = String(formData.get("carpool_role") ?? "none");
  const seatsRaw = Number(formData.get("available_seats") ?? 0);
  const comment = String(formData.get("ride_comment") ?? "").trim() || null;

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
    .update({ can_drive: canDrive, needs_ride: needsRide, available_seats: availableSeats, comment })
    .eq("id", existing.id);
  if (error) throw new Error(error.message);

  revalidatePath(`/matches/${matchId}`);
}
