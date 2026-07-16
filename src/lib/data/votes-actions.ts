"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth/current-user";
import { supabaseAdmin } from "@/lib/supabase/server";

export async function castVote(matchId: string, awardId: string, votedPlayerId: string) {
  const user = await requireUser();

  if (votedPlayerId === user.playerId) {
    throw new Error("Tu ne peux pas voter pour toi-même.");
  }

  const { data: existing, error: findError } = await supabaseAdmin
    .from("votes")
    .select("id")
    .eq("match_id", matchId)
    .eq("award_id", awardId)
    .eq("voter_player_id", user.playerId)
    .maybeSingle();
  if (findError) throw new Error(findError.message);

  if (existing) {
    const { error } = await supabaseAdmin
      .from("votes")
      .update({ voted_player_id: votedPlayerId })
      .eq("id", existing.id);
    if (error) throw new Error(error.message);
  } else {
    const { error } = await supabaseAdmin.from("votes").insert({
      match_id: matchId,
      award_id: awardId,
      voter_player_id: user.playerId,
      voted_player_id: votedPlayerId,
    });
    if (error) throw new Error(error.message);
  }

  revalidatePath(`/matches/${matchId}`);
}
