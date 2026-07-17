"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth/current-user";
import { supabaseAdmin } from "@/lib/supabase/server";

export async function createReinforcementCall(matchId: string, formData: FormData) {
  const user = await requireAdmin();

  const positionNeeded = String(formData.get("position_needed") ?? "");
  if (!["gardien", "defenseur", "joueur_de_champ"].includes(positionNeeded)) {
    throw new Error("Choisis un poste.");
  }
  const message = String(formData.get("message") ?? "").trim() || null;
  const duration = String(formData.get("duration") ?? "permanent");

  let expiresAt: string | null = null;
  if (duration === "24h") {
    expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
  } else if (duration === "7d") {
    expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
  }

  const { error } = await supabaseAdmin.from("reinforcement_calls").insert({
    match_id: matchId,
    position_needed: positionNeeded,
    message,
    expires_at: expiresAt,
    created_by_player_id: user.playerId,
  });
  if (error) throw new Error(error.message);

  revalidatePath(`/matches/${matchId}`);
}

export async function revokeReinforcementCall(matchId: string, callId: string) {
  await requireAdmin();

  const { error } = await supabaseAdmin
    .from("reinforcement_calls")
    .update({ revoked_at: new Date().toISOString() })
    .eq("id", callId);
  if (error) throw new Error(error.message);

  revalidatePath(`/matches/${matchId}`);
}
