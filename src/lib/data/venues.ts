import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { supabaseAdmin } from "@/lib/supabase/server";
import type { Venue } from "@/types/models";

/** venues n'est pas dans les types générés (voir models.ts) — même cast que match-squad.ts/player-restrictions.ts. */
const untypedDb = supabaseAdmin as unknown as SupabaseClient;

/** `includeDemo=true` réservé aux écrans du Mode Démo — jamais un terrain fictif dans la liste réelle par défaut. */
export async function getVenues(includeDemo = false): Promise<Venue[]> {
  let query = untypedDb.from("venues").select("*");
  if (!includeDemo) query = query.eq("is_demo", false);

  const { data, error } = await query.order("name", { ascending: true });
  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function getVenueById(id: string): Promise<Venue | null> {
  const { data, error } = await untypedDb.from("venues").select("*").eq("id", id).maybeSingle();
  if (error) throw new Error(error.message);
  return data;
}
