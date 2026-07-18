"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth/current-user";
import { supabaseAdmin } from "@/lib/supabase/server";
import { assertMatchSeasonUnlocked } from "./season-lock";

export async function restoreTrashedMatch(matchId: string) {
  await requireAdmin();
  await assertMatchSeasonUnlocked(matchId);

  const { error } = await supabaseAdmin.from("matches").update({ deleted_at: null }).eq("id", matchId);
  if (error) throw new Error(error.message);
  revalidatePath("/admin/corbeille");
  revalidatePath("/matches");
  revalidatePath("/");
}

/**
 * Le deuxième paramètre est fourni par l'appelant (page corbeille) mais n'est
 * jamais utilisé pour la vérification de verrouillage — le vrai match_id est
 * toujours relu depuis l'enregistrement lui-même, jamais fait confiance à une
 * valeur transmise par le client.
 */
export async function restoreTrashedGoal(goalId: string, _matchId: string) {
  void _matchId;
  await requireAdmin();

  const { data: goal, error: findError } = await supabaseAdmin
    .from("goals")
    .select("match_id")
    .eq("id", goalId)
    .maybeSingle();
  if (findError) throw new Error(findError.message);
  if (!goal) throw new Error("But introuvable.");
  await assertMatchSeasonUnlocked(goal.match_id);

  const { error } = await supabaseAdmin.from("goals").update({ deleted_at: null }).eq("id", goalId);
  if (error) throw new Error(error.message);
  revalidatePath("/admin/corbeille");
  revalidatePath(`/matches/${goal.match_id}`);
  revalidatePath("/stats");
}

/** Voir le commentaire de restoreTrashedGoal — même principe pour les cartons. */
export async function restoreTrashedCard(cardId: string, _matchId: string) {
  void _matchId;
  await requireAdmin();

  const { data: card, error: findError } = await supabaseAdmin
    .from("cards")
    .select("match_id")
    .eq("id", cardId)
    .maybeSingle();
  if (findError) throw new Error(findError.message);
  if (!card) throw new Error("Carton introuvable.");
  await assertMatchSeasonUnlocked(card.match_id);

  const { error } = await supabaseAdmin.from("cards").update({ deleted_at: null }).eq("id", cardId);
  if (error) throw new Error(error.message);
  revalidatePath("/admin/corbeille");
  revalidatePath(`/matches/${card.match_id}`);
  revalidatePath("/stats");
}
