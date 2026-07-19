"use server";

import { revalidatePath } from "next/cache";
import type { SupabaseClient } from "@supabase/supabase-js";
import { requireUser, requireFreshCoach } from "@/lib/auth/current-user";
import { supabaseAdmin } from "@/lib/supabase/server";

const untypedDb = supabaseAdmin as unknown as SupabaseClient;

/** Strictement privé : un joueur ne peut cocher que ses propres items (vérifié par eq player_id, pas seulement par id). */
export async function toggleChecklistItem(matchId: string, itemId: string, checked: boolean) {
  const user = await requireUser();

  const { error } = await untypedDb
    .from("match_checklist_items")
    .update({ checked })
    .eq("id", itemId)
    .eq("match_id", matchId)
    .eq("player_id", user.playerId);
  if (error) throw new Error(error.message);

  revalidatePath(`/matches/${matchId}`);
}

export async function addChecklistPreference(formData: FormData) {
  const user = await requireUser();
  const label = String(formData.get("label") ?? "").trim();
  if (!label) throw new Error("Indique un intitulé.");

  const { error } = await untypedDb.from("player_checklist_preferences").insert({ player_id: user.playerId, label });
  if (error) throw new Error(error.message);

  revalidatePath("/profile");
}

export async function deleteChecklistPreference(preferenceId: string) {
  const user = await requireUser();
  const { error } = await untypedDb
    .from("player_checklist_preferences")
    .delete()
    .eq("id", preferenceId)
    .eq("player_id", user.playerId);
  if (error) throw new Error(error.message);

  revalidatePath("/profile");
}

export async function addChecklistTemplate(formData: FormData) {
  await requireFreshCoach();
  const label = String(formData.get("label") ?? "").trim();
  if (!label) throw new Error("Indique un intitulé.");

  const { error } = await untypedDb.from("checklist_templates").insert({ label });
  if (error) throw new Error(error.message);

  revalidatePath("/admin/checklist");
}

export async function deleteChecklistTemplate(templateId: string) {
  await requireFreshCoach();
  const { error } = await untypedDb.from("checklist_templates").delete().eq("id", templateId);
  if (error) throw new Error(error.message);

  revalidatePath("/admin/checklist");
}
