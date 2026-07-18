import "server-only";
import { supabaseAdmin } from "@/lib/supabase/server";
import type { Season } from "@/types/models";

export async function getActiveSeasonId(): Promise<string | null> {
  const { data, error } = await supabaseAdmin
    .from("seasons")
    .select("id")
    .eq("is_active", true)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data?.id ?? null;
}

export async function getActiveSeason(): Promise<{ id: string; name: string } | null> {
  const { data, error } = await supabaseAdmin
    .from("seasons")
    .select("id, name")
    .eq("is_active", true)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data ?? null;
}

export async function getSeasonById(seasonId: string): Promise<{ id: string; name: string } | null> {
  const { data, error } = await supabaseAdmin.from("seasons").select("id, name").eq("id", seasonId).maybeSingle();
  if (error) throw new Error(error.message);
  return data ?? null;
}

export async function getAllSeasons(): Promise<Season[]> {
  const { data, error } = await supabaseAdmin.from("seasons").select("*").order("start_date", { ascending: false });
  if (error) throw new Error(error.message);
  return data ?? [];
}

/** Matchs pas encore joués/clos dans la saison active — à vérifier avant de la clôturer. */
export async function getOpenMatchesInActiveSeason(): Promise<{ id: string; matchDate: string; status: string }[]> {
  const activeSeasonId = await getActiveSeasonId();
  if (!activeSeasonId) return [];

  const { data, error } = await supabaseAdmin
    .from("matches")
    .select("id, match_date, status")
    .eq("season_id", activeSeasonId)
    .in("status", ["scheduled", "draft"])
    .is("deleted_at", null)
    .order("match_date", { ascending: true });
  if (error) throw new Error(error.message);
  return (data ?? []).map((m) => ({ id: m.id, matchDate: m.match_date, status: m.status }));
}
