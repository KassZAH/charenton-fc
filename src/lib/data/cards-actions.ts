"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth/current-user";
import { supabaseAdmin } from "@/lib/supabase/server";
import { checkAndAwardBadges } from "./badges";

export async function addCard(matchId: string, formData: FormData) {
  await requireAdmin();

  const playerId = String(formData.get("player_id") ?? "") || null;
  const cardType = String(formData.get("card_type") ?? "");
  const minuteRaw = String(formData.get("minute") ?? "").trim();
  const comment = String(formData.get("comment") ?? "").trim() || null;

  if (!playerId) {
    throw new Error("Sélectionne un joueur.");
  }
  if (cardType !== "yellow" && cardType !== "red") {
    throw new Error("Type de carton invalide.");
  }

  const { error } = await supabaseAdmin.from("cards").insert({
    match_id: matchId,
    player_id: playerId,
    card_type: cardType,
    minute: minuteRaw ? Number(minuteRaw) : null,
    comment,
  });
  if (error) throw new Error(error.message);

  try {
    await checkAndAwardBadges(playerId);
  } catch {
    // les badges sont secondaires — une erreur ici ne doit pas faire échouer l'ajout du carton
  }

  revalidatePath(`/matches/${matchId}`);
  revalidatePath("/stats");
}

export async function deleteCard(matchId: string, cardId: string) {
  await requireAdmin();

  const { error } = await supabaseAdmin
    .from("cards")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", cardId);
  if (error) throw new Error(error.message);

  revalidatePath(`/matches/${matchId}`);
  revalidatePath("/stats");
}
