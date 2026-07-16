"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth/current-user";
import { supabaseAdmin } from "@/lib/supabase/server";

/** Mesures strictement personnelles : toujours rattachées au joueur connecté, jamais un autre. */
export async function addMeasurement(formData: FormData) {
  const user = await requireUser();

  const weightRaw = String(formData.get("weight_kg") ?? "").trim();
  const heightRaw = String(formData.get("height_cm") ?? "").trim();

  if (!weightRaw && !heightRaw) {
    throw new Error("Renseigne au moins un poids ou une taille.");
  }

  const weight_kg = weightRaw ? Number(weightRaw) : null;
  const height_cm = heightRaw ? Number(heightRaw) : null;

  if (weightRaw && (weight_kg === null || Number.isNaN(weight_kg) || weight_kg <= 0)) {
    throw new Error("Poids invalide.");
  }
  if (heightRaw && (height_cm === null || Number.isNaN(height_cm) || height_cm <= 0)) {
    throw new Error("Taille invalide.");
  }

  const { error } = await supabaseAdmin.from("player_measurements").insert({
    player_id: user.playerId,
    weight_kg,
    height_cm,
  });
  if (error) throw new Error(error.message);

  revalidatePath("/profile");
  revalidatePath(`/team/${user.playerId}`);
}

export async function deleteMeasurement(measurementId: string) {
  const user = await requireUser();

  const { error } = await supabaseAdmin
    .from("player_measurements")
    .delete()
    .eq("id", measurementId)
    .eq("player_id", user.playerId);
  if (error) throw new Error(error.message);

  revalidatePath("/profile");
  revalidatePath(`/team/${user.playerId}`);
}

export async function setShareMeasurements(share: boolean) {
  const user = await requireUser();

  const { error } = await supabaseAdmin
    .from("players")
    .update({ share_measurements: share })
    .eq("id", user.playerId);
  if (error) throw new Error(error.message);

  revalidatePath("/profile");
  revalidatePath(`/team/${user.playerId}`);
}
