"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin, requireUser } from "@/lib/auth/current-user";
import { supabaseAdmin } from "@/lib/supabase/server";

export async function addEquipmentItem(matchId: string, formData: FormData) {
  await requireAdmin();
  const label = String(formData.get("label") ?? "").trim();
  if (!label) throw new Error("Indique ce qu'il faut apporter.");

  const { error } = await supabaseAdmin.from("match_equipment_items").insert({ match_id: matchId, label, status: "unassigned" });
  if (error) throw new Error(error.message);

  revalidatePath(`/matches/${matchId}`);
}

export async function deleteEquipmentItem(matchId: string, itemId: string) {
  await requireAdmin();
  const { error } = await supabaseAdmin
    .from("match_equipment_items")
    .delete()
    .eq("id", itemId)
    .eq("match_id", matchId);
  if (error) throw new Error(error.message);

  revalidatePath(`/matches/${matchId}`);
}

/** Un joueur se propose pour un élément pas encore assigné — statut 'assigné'. */
export async function claimEquipmentItem(matchId: string, itemId: string) {
  const user = await requireUser();
  const { error } = await supabaseAdmin
    .from("match_equipment_items")
    .update({ assigned_player_id: user.playerId, status: "assigned" })
    .eq("id", itemId)
    .eq("match_id", matchId)
    .is("assigned_player_id", null);
  if (error) throw new Error(error.message);

  revalidatePath(`/matches/${matchId}`);
}

/** L'admin assigne directement un joueur (ex. suite à une suggestion) — jamais silencieux, toujours un clic explicite. */
export async function assignEquipmentItem(matchId: string, itemId: string, playerId: string) {
  await requireAdmin();
  const { error } = await supabaseAdmin
    .from("match_equipment_items")
    .update({ assigned_player_id: playerId, status: "assigned" })
    .eq("id", itemId)
    .eq("match_id", matchId);
  if (error) throw new Error(error.message);

  revalidatePath(`/matches/${matchId}`);
}

/** Le joueur assigné confirme qu'il apportera l'élément. */
export async function confirmEquipmentItem(matchId: string, itemId: string) {
  await requireUser();
  const { error } = await supabaseAdmin
    .from("match_equipment_items")
    .update({ status: "confirmed" })
    .eq("id", itemId)
    .eq("match_id", matchId);
  if (error) throw new Error(error.message);

  revalidatePath(`/matches/${matchId}`);
}

export async function markEquipmentBrought(matchId: string, itemId: string) {
  await requireUser();
  const { error } = await supabaseAdmin
    .from("match_equipment_items")
    .update({ status: "brought", brought: true })
    .eq("id", itemId)
    .eq("match_id", matchId);
  if (error) throw new Error(error.message);

  revalidatePath(`/matches/${matchId}`);
}

/** L'admin marque explicitement un oubli après coup — jamais déduit automatiquement. */
export async function markEquipmentForgotten(matchId: string, itemId: string) {
  await requireAdmin();
  const { error } = await supabaseAdmin
    .from("match_equipment_items")
    .update({ status: "forgotten", brought: false })
    .eq("id", itemId)
    .eq("match_id", matchId);
  if (error) throw new Error(error.message);

  revalidatePath(`/matches/${matchId}`);
}

/**
 * "Reprendre le matériel du match précédent" (§7.3, roadmap V2) : ne recopie que les intitulés,
 * jamais l'assignation ni le statut — l'admin réassigne toujours explicitement pour le nouveau
 * match, jamais une reprise silencieuse d'un joueur.
 */
export async function copyEquipmentFromPreviousMatch(matchId: string) {
  await requireAdmin();

  const { data: currentMatch, error: currentError } = await supabaseAdmin
    .from("matches")
    .select("match_date")
    .eq("id", matchId)
    .maybeSingle();
  if (currentError) throw new Error(currentError.message);
  if (!currentMatch) throw new Error("Match introuvable.");

  const { data: previousMatch, error: previousError } = await supabaseAdmin
    .from("matches")
    .select("id")
    .lt("match_date", currentMatch.match_date)
    .is("deleted_at", null)
    .order("match_date", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (previousError) throw new Error(previousError.message);
  if (!previousMatch) throw new Error("Aucun match précédent trouvé.");

  const { data: previousItems, error: itemsError } = await supabaseAdmin
    .from("match_equipment_items")
    .select("label")
    .eq("match_id", previousMatch.id);
  if (itemsError) throw new Error(itemsError.message);
  if (!previousItems || previousItems.length === 0) {
    throw new Error("Le match précédent n'avait aucun élément de matériel enregistré.");
  }

  const { error: insertError } = await supabaseAdmin
    .from("match_equipment_items")
    .insert(previousItems.map((item) => ({ match_id: matchId, label: item.label, status: "unassigned" })));
  if (insertError) throw new Error(insertError.message);

  revalidatePath(`/matches/${matchId}`);
}
