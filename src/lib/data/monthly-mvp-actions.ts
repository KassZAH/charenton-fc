"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth/current-user";
import { supabaseAdmin } from "@/lib/supabase/server";
import { currentMvpMonth, getMonthlyMvpCandidates } from "./monthly-mvp";

export async function castMonthlyMvpVote(votedPlayerId: string) {
  const user = await requireUser();
  const { year, month } = currentMvpMonth();

  const candidates = await getMonthlyMvpCandidates(year, month);
  if (!candidates.some((c) => c.playerId === votedPlayerId)) {
    throw new Error("Ce joueur ne fait pas partie des candidats de ce mois-ci.");
  }

  const { data: existing, error: findError } = await supabaseAdmin
    .from("monthly_mvp_votes")
    .select("id")
    .eq("year", year)
    .eq("month", month)
    .eq("voter_player_id", user.playerId)
    .maybeSingle();
  if (findError) throw new Error(findError.message);

  if (existing) {
    const { error } = await supabaseAdmin
      .from("monthly_mvp_votes")
      .update({ voted_player_id: votedPlayerId })
      .eq("id", existing.id);
    if (error) throw new Error(error.message);
  } else {
    const { error } = await supabaseAdmin.from("monthly_mvp_votes").insert({
      year,
      month,
      voter_player_id: user.playerId,
      voted_player_id: votedPlayerId,
    });
    if (error) throw new Error(error.message);
  }

  revalidatePath("/trophees");
}
