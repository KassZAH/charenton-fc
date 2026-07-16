"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth/current-user";
import { supabaseAdmin } from "@/lib/supabase/server";

const NIL_UUID = "00000000-0000-0000-0000-000000000000";

/**
 * Réservé à Amine (vérifié en base, pas via la session, pour rester valide
 * même si le nom a changé récemment). Supprime tous les matchs — ce qui
 * entraîne en cascade buts, cartons, présences, votes — ainsi que les
 * badges. Garde l'effectif, les adversaires, les saisons et les réglages.
 */
export async function resetSeasonData() {
  const user = await requireUser();

  const { data: player } = await supabaseAdmin
    .from("players")
    .select("first_name")
    .eq("id", user.playerId)
    .maybeSingle();

  if (!player || player.first_name !== "Amine") {
    throw new Error("Action réservée.");
  }

  const { error: matchesError } = await supabaseAdmin.from("matches").delete().neq("id", NIL_UUID);
  if (matchesError) throw new Error(matchesError.message);

  const { error: badgesError } = await supabaseAdmin.from("player_badges").delete().neq("id", NIL_UUID);
  if (badgesError) throw new Error(badgesError.message);

  revalidatePath("/", "layout");
  redirect("/matches");
}
