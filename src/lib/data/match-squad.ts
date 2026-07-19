import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { supabaseAdmin } from "@/lib/supabase/server";

/** match_squad_entries/squad_published_at/squad_locked_at (Lot 17) n'existent pas encore dans les types générés. */
const untypedDb = supabaseAdmin as unknown as SupabaseClient;

export type MatchSquad = {
  calledUpPlayerIds: string[];
  waitlistPlayerIds: string[];
  plannedGoalkeeperPlayerId: string | null;
  publishedAt: string | null;
  lockedAt: string | null;
};

/**
 * Groupe convoqué prévu (roadmap V3, Lot 17) — jamais confondu avec
 * availability (réponse du joueur) ni match_players (présence réelle,
 * Lot 13). Lecture ouverte à tous les rôles.
 */
export async function getMatchSquad(matchId: string): Promise<MatchSquad> {
  const [{ data: entries, error }, { data: match, error: matchError }] = await Promise.all([
    untypedDb.from("match_squad_entries").select("player_id, squad_status, is_planned_goalkeeper").eq("match_id", matchId),
    untypedDb.from("matches").select("squad_published_at, squad_locked_at").eq("id", matchId).maybeSingle(),
  ]);
  if (error) throw new Error(error.message);
  if (matchError) throw new Error(matchError.message);

  const rows = (entries ?? []) as { player_id: string; squad_status: "called_up" | "waitlist"; is_planned_goalkeeper: boolean }[];

  return {
    calledUpPlayerIds: rows.filter((r) => r.squad_status === "called_up").map((r) => r.player_id),
    waitlistPlayerIds: rows.filter((r) => r.squad_status === "waitlist").map((r) => r.player_id),
    plannedGoalkeeperPlayerId: rows.find((r) => r.is_planned_goalkeeper)?.player_id ?? null,
    publishedAt: match?.squad_published_at ?? null,
    lockedAt: match?.squad_locked_at ?? null,
  };
}
