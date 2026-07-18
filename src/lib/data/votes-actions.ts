"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth/current-user";
import { supabaseAdmin } from "@/lib/supabase/server";
import { checkAndAwardBadges } from "./badges";
import { getMatchRoster } from "./roster";

/**
 * L'UI ne propose déjà que des récompenses/joueurs valides, mais un appel direct à la Server
 * Action pourrait contourner ces sélecteurs — on revérifie donc toutes les règles ici.
 */
export async function castVote(matchId: string, awardId: string, votedPlayerId: string) {
  const user = await requireUser();

  if (votedPlayerId === user.playerId) {
    throw new Error("Tu ne peux pas voter pour toi-même.");
  }

  const { data: match, error: matchError } = await supabaseAdmin
    .from("matches")
    .select("status")
    .eq("id", matchId)
    .maybeSingle();
  if (matchError) throw new Error(matchError.message);
  if (!match || match.status !== "completed") {
    throw new Error("Le vote n'est ouvert qu'une fois le match terminé.");
  }

  const { data: award, error: awardError } = await supabaseAdmin
    .from("awards")
    .select("id, match_id")
    .eq("id", awardId)
    .eq("is_active", true)
    .maybeSingle();
  if (awardError) throw new Error(awardError.message);
  if (!award || (award.match_id !== null && award.match_id !== matchId)) {
    throw new Error("Cette récompense n'est pas disponible pour ce match.");
  }

  const roster = await getMatchRoster(matchId);
  if (!roster.includes(votedPlayerId)) {
    throw new Error("Ce joueur n'a pas participé à ce match.");
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

  await checkAndAwardBadges(votedPlayerId);

  revalidatePath(`/matches/${matchId}`);
}
