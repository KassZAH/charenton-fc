"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth/current-user";
import { supabaseAdmin } from "@/lib/supabase/server";

const VALID_VISIBILITY = new Set(["private", "coach", "team"]);

export async function addPlayerGoal(formData: FormData) {
  const user = await requireUser();

  const title = String(formData.get("title") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim() || null;
  const targetDate = String(formData.get("target_date") ?? "").trim() || null;
  const visibility = String(formData.get("visibility") ?? "private");

  if (!title) throw new Error("Le titre est obligatoire.");
  if (!VALID_VISIBILITY.has(visibility)) throw new Error("Visibilité invalide.");

  const { error } = await supabaseAdmin.from("player_goals").insert({
    player_id: user.playerId,
    title,
    description,
    target_date: targetDate,
    visibility,
  });
  if (error) throw new Error(error.message);

  revalidatePath("/profile");
  revalidatePath(`/team/${user.playerId}`);
}

export async function toggleGoalAchieved(goalId: string, achieved: boolean) {
  const user = await requireUser();

  const { error } = await supabaseAdmin
    .from("player_goals")
    .update({ achieved, achieved_at: achieved ? new Date().toISOString() : null })
    .eq("id", goalId)
    .eq("player_id", user.playerId);
  if (error) throw new Error(error.message);

  revalidatePath("/profile");
  revalidatePath(`/team/${user.playerId}`);
}

export async function deletePlayerGoal(goalId: string) {
  const user = await requireUser();

  const { error } = await supabaseAdmin.from("player_goals").delete().eq("id", goalId).eq("player_id", user.playerId);
  if (error) throw new Error(error.message);

  revalidatePath("/profile");
  revalidatePath(`/team/${user.playerId}`);
}
