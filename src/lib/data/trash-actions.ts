"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth/current-user";
import { supabaseAdmin } from "@/lib/supabase/server";

export async function restoreTrashedMatch(matchId: string) {
  await requireAdmin();
  const { error } = await supabaseAdmin.from("matches").update({ deleted_at: null }).eq("id", matchId);
  if (error) throw new Error(error.message);
  revalidatePath("/admin/corbeille");
  revalidatePath("/matches");
  revalidatePath("/");
}

export async function restoreTrashedGoal(goalId: string, matchId: string) {
  await requireAdmin();
  const { error } = await supabaseAdmin.from("goals").update({ deleted_at: null }).eq("id", goalId);
  if (error) throw new Error(error.message);
  revalidatePath("/admin/corbeille");
  revalidatePath(`/matches/${matchId}`);
  revalidatePath("/stats");
}

export async function restoreTrashedCard(cardId: string, matchId: string) {
  await requireAdmin();
  const { error } = await supabaseAdmin.from("cards").update({ deleted_at: null }).eq("id", cardId);
  if (error) throw new Error(error.message);
  revalidatePath("/admin/corbeille");
  revalidatePath(`/matches/${matchId}`);
  revalidatePath("/stats");
}
