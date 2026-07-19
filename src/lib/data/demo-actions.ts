"use server";

import { revalidatePath } from "next/cache";
import { requireOwner } from "@/lib/auth/current-user";
import { createOrResetDemoDataset, deleteDemoDatasetEntirely } from "./demo-dataset";

const RESET_CONFIRMATION = "REINITIALISER DEMO";
const DELETE_CONFIRMATION = "SUPPRIMER DEMO";

/** Réservé au Propriétaire — confirmation forte obligatoire (phrase exacte tapée par l'utilisateur). */
export async function resetDemoDatasetAction(formData: FormData) {
  const user = await requireOwner();
  const confirmation = String(formData.get("confirmation") ?? "").trim();
  if (confirmation !== RESET_CONFIRMATION) {
    throw new Error(`Confirmation incorrecte — tape exactement « ${RESET_CONFIRMATION} » pour continuer.`);
  }

  await createOrResetDemoDataset(user.playerId, user.name);

  revalidatePath("/demo");
  revalidatePath("/");
}

/** Réservé au Propriétaire — supprime la saison Démo elle-même en plus de ses données. */
export async function deleteDemoDatasetAction(formData: FormData) {
  const user = await requireOwner();
  const confirmation = String(formData.get("confirmation") ?? "").trim();
  if (confirmation !== DELETE_CONFIRMATION) {
    throw new Error(`Confirmation incorrecte — tape exactement « ${DELETE_CONFIRMATION} » pour continuer.`);
  }

  await deleteDemoDatasetEntirely(user.playerId, user.name);

  revalidatePath("/demo");
  revalidatePath("/");
}
