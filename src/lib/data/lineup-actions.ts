"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth/current-user";
import { supabaseAdmin } from "@/lib/supabase/server";
import { FORMATIONS, type FormationKey } from "@/lib/formations";
import { assertMatchSeasonUnlocked } from "./season-lock";

/** Réservé à admin + coach (requireAdmin couvre les deux). */
export async function saveLineup(matchId: string, formData: FormData) {
  await requireAdmin();
  await assertMatchSeasonUnlocked(matchId);

  const formation = String(formData.get("formation") ?? "") as FormationKey;
  if (!FORMATIONS[formation]) {
    throw new Error("Formation invalide.");
  }

  const positions: Record<string, string> = {};
  for (const slot of FORMATIONS[formation]) {
    const playerId = String(formData.get(`slot_${slot.key}`) ?? "").trim();
    if (playerId) positions[slot.key] = playerId;
  }

  const { error } = await supabaseAdmin
    .from("match_lineups")
    .upsert(
      { match_id: matchId, formation, positions, updated_at: new Date().toISOString() },
      { onConflict: "match_id" }
    );
  if (error) throw new Error(error.message);

  revalidatePath(`/matches/${matchId}`);
  revalidatePath(`/matches/${matchId}/lineup`);
}
