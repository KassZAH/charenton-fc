"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin, requireUser } from "@/lib/auth/current-user";
import { supabaseAdmin } from "@/lib/supabase/server";

export async function addEquipmentItem(matchId: string, formData: FormData) {
  await requireAdmin();
  const label = String(formData.get("label") ?? "").trim();
  if (!label) throw new Error("Indique ce qu'il faut apporter.");

  const { error } = await supabaseAdmin.from("match_equipment_items").insert({ match_id: matchId, label });
  if (error) throw new Error(error.message);

  revalidatePath(`/matches/${matchId}`);
}

export async function deleteEquipmentItem(matchId: string, itemId: string) {
  await requireAdmin();
  const { error } = await supabaseAdmin.from("match_equipment_items").delete().eq("id", itemId);
  if (error) throw new Error(error.message);

  revalidatePath(`/matches/${matchId}`);
}

export async function toggleEquipmentBrought(matchId: string, itemId: string, brought: boolean) {
  await requireUser();
  const { error } = await supabaseAdmin.from("match_equipment_items").update({ brought }).eq("id", itemId);
  if (error) throw new Error(error.message);

  revalidatePath(`/matches/${matchId}`);
}

/** Un joueur se propose pour un élément pas encore assigné. */
export async function claimEquipmentItem(matchId: string, itemId: string) {
  const user = await requireUser();
  const { error } = await supabaseAdmin
    .from("match_equipment_items")
    .update({ assigned_player_id: user.playerId })
    .eq("id", itemId)
    .is("assigned_player_id", null);
  if (error) throw new Error(error.message);

  revalidatePath(`/matches/${matchId}`);
}
