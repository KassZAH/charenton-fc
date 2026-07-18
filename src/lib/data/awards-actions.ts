"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth/current-user";
import { supabaseAdmin } from "@/lib/supabase/server";
import { assertMatchSeasonUnlocked } from "./season-lock";

/** Récompense ponctuelle : une catégorie unique, disponible uniquement sur ce match. */
export async function createOneOffAward(matchId: string, formData: FormData) {
  await requireAdmin();
  await assertMatchSeasonUnlocked(matchId);

  const name = String(formData.get("name") ?? "").trim();
  const emoji = String(formData.get("emoji") ?? "").trim() || null;

  if (!name) {
    throw new Error("Le nom de la récompense est obligatoire.");
  }

  const { error } = await supabaseAdmin.from("awards").insert({
    name,
    emoji,
    is_active: true,
    match_id: matchId,
  });
  if (error) throw new Error(error.message);

  revalidatePath(`/matches/${matchId}`);
}
