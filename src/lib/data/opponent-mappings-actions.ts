"use server";

import { revalidatePath } from "next/cache";
import type { SupabaseClient } from "@supabase/supabase-js";
import { requireOwner } from "@/lib/auth/current-user";
import { supabaseAdmin } from "@/lib/supabase/server";
import { getExternalStandings } from "./external-standings";
import { computeMappingCandidate } from "./opponent-mappings";

const untypedDb = supabaseAdmin as unknown as SupabaseClient;

/** Toute mutation d'association est réservée au Propriétaire (roadmap V3, Lot 11.5, §14) — Coach et Joueur restent en lecture seule. */
export async function confirmOpponentMapping(mappingId: string) {
  const user = await requireOwner();
  const { error } = await untypedDb
    .from("opponent_external_mappings")
    .update({ mapping_status: "confirmed", confirmed_by_player_id: user.playerId, confirmed_at: new Date().toISOString() })
    .eq("id", mappingId);
  if (error) throw new Error(error.message);
  revalidatePath("/admin/saisons");
  revalidatePath("/stats");
}

/** Sélection manuelle d'une autre équipe externe — vaut confirmation immédiate. */
export async function selectOpponentMapping(mappingId: string, externalTeamId: string | null, externalTeamName: string) {
  const user = await requireOwner();
  const { error } = await untypedDb
    .from("opponent_external_mappings")
    .update({
      external_team_id: externalTeamId,
      external_team_name: externalTeamName,
      mapping_status: "confirmed",
      confirmed_by_player_id: user.playerId,
      confirmed_at: new Date().toISOString(),
    })
    .eq("id", mappingId);
  if (error) throw new Error(error.message);
  revalidatePath("/admin/saisons");
  revalidatePath("/stats");
}

export async function disableOpponentMapping(mappingId: string) {
  const user = await requireOwner();
  const { error } = await untypedDb
    .from("opponent_external_mappings")
    .update({ mapping_status: "disabled", confirmed_by_player_id: user.playerId, confirmed_at: new Date().toISOString() })
    .eq("id", mappingId);
  if (error) throw new Error(error.message);
  revalidatePath("/admin/saisons");
  revalidatePath("/stats");
}

/** Remet l'association en attente : reclasse automatiquement (automatic/ambiguous/unmatched) contre le classement actuel, efface la confirmation du Propriétaire. */
export async function resetOpponentMapping(mappingId: string) {
  await requireOwner();

  const { data: mapping, error: mappingError } = await untypedDb
    .from("opponent_external_mappings")
    .select("*")
    .eq("id", mappingId)
    .single();
  if (mappingError) throw new Error(mappingError.message);

  const standings = await getExternalStandings(mapping.external_competition_id);
  const candidate = computeMappingCandidate(mapping.app_opponent_name, standings);

  const { error } = await untypedDb
    .from("opponent_external_mappings")
    .update({
      mapping_status: candidate.status,
      external_team_id: candidate.externalTeamId,
      external_team_name: candidate.externalTeamName,
      confirmed_by_player_id: null,
      confirmed_at: null,
    })
    .eq("id", mappingId);
  if (error) throw new Error(error.message);
  revalidatePath("/admin/saisons");
  revalidatePath("/stats");
}
