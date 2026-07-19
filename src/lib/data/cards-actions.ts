"use server";

import { revalidatePath } from "next/cache";
import type { SupabaseClient } from "@supabase/supabase-js";
import { requireAdmin } from "@/lib/auth/current-user";
import { supabaseAdmin } from "@/lib/supabase/server";
import { checkAndAwardBadges } from "./badges";
import { logChange } from "./audit";
import { assertMatchSeasonUnlocked } from "./season-lock";
import { isUniqueViolation } from "./idempotency";

/** idempotency_key (Lot 16) n'existe pas encore dans les types générés (projet isolé uniquement pour l'instant). */
const untypedDb = supabaseAdmin as unknown as SupabaseClient;

export async function addCard(matchId: string, formData: FormData) {
  const user = await requireAdmin();
  await assertMatchSeasonUnlocked(matchId);

  const playerId = String(formData.get("player_id") ?? "") || null;
  const cardType = String(formData.get("card_type") ?? "");
  const minuteRaw = String(formData.get("minute") ?? "").trim();
  const comment = String(formData.get("comment") ?? "").trim() || null;
  const idempotencyKey = String(formData.get("idempotency_key") ?? "") || null;

  if (!playerId) {
    throw new Error("Sélectionne un joueur.");
  }
  if (cardType !== "yellow" && cardType !== "red") {
    throw new Error("Type de carton invalide.");
  }

  const { data: card, error } = await untypedDb
    .from("cards")
    .insert({
      match_id: matchId,
      player_id: playerId,
      card_type: cardType,
      minute: minuteRaw ? Number(minuteRaw) : null,
      comment,
      idempotency_key: idempotencyKey,
    })
    .select("*")
    .single();
  if (error) {
    // Même clé déjà envoyée (double-clic/double soumission) : succès silencieux, jamais une erreur
    // visible pour un carton déjà réellement enregistré.
    if (isUniqueViolation(error)) return;
    throw new Error(error.message);
  }

  await logChange({
    tableName: "cards",
    recordId: card.id,
    action: "insert",
    newData: card,
    changedByPlayerId: user.playerId,
    changedByName: user.name,
  });

  try {
    await checkAndAwardBadges(playerId);
  } catch {
    // les badges sont secondaires — une erreur ici ne doit pas faire échouer l'ajout du carton
  }

  revalidatePath(`/matches/${matchId}`);
  revalidatePath("/stats");
}

export async function deleteCard(matchId: string, cardId: string) {
  const user = await requireAdmin();
  await assertMatchSeasonUnlocked(matchId);

  const { data: before } = await supabaseAdmin
    .from("cards")
    .select("*")
    .eq("id", cardId)
    .eq("match_id", matchId)
    .maybeSingle();
  if (!before) throw new Error("Carton introuvable pour ce match.");

  const { error } = await supabaseAdmin
    .from("cards")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", cardId)
    .eq("match_id", matchId);
  if (error) throw new Error(error.message);

  if (before) {
    await logChange({
      tableName: "cards",
      recordId: cardId,
      action: "delete",
      oldData: before,
      changedByPlayerId: user.playerId,
      changedByName: user.name,
    });
  }

  revalidatePath(`/matches/${matchId}`);
  revalidatePath("/stats");
}
