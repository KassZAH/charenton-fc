import "server-only";
import { supabaseAdmin } from "@/lib/supabase/server";

/**
 * team_settings est une table à une seule ligne (contrainte CHECK id = 1,
 * posée dans la migration baseline) — id = 1 n'est donc pas une supposition
 * silencieuse, c'est la seule ligne qui puisse jamais exister.
 */
export async function getOwnerPlayerId(): Promise<string | null> {
  const { data } = await supabaseAdmin.from("team_settings").select("owner_player_id").eq("id", 1).maybeSingle();
  return data?.owner_player_id ?? null;
}
