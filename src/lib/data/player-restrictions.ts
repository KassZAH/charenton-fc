import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { supabaseAdmin } from "@/lib/supabase/server";
import type { PlayerRestriction, RestrictionVisibility } from "@/types/models";

/** player_restrictions n'est pas dans les types générés (voir models.ts) — même cast que match-squad.ts. */
const untypedDb = supabaseAdmin as unknown as SupabaseClient;

/**
 * Mode Démo : player_restrictions.season_id est NULL pour toute restriction réelle (colonne
 * ajoutée après coup, jamais renseignée par le code réel) — seules les restrictions fictives
 * créées pour la saison Démo portent un season_id. `demoSeasonId` omis/undefined = mode réel
 * (season_id IS NULL, jamais une restriction fictive) ; fourni = mode Démo (cette saison
 * uniquement). Jamais les deux mélangés dans une même lecture.
 */
export async function getActiveRestriction(playerId: string, demoSeasonId?: string): Promise<PlayerRestriction | null> {
  let query = untypedDb.from("player_restrictions").select("*").eq("player_id", playerId).eq("status", "active");
  query = demoSeasonId ? query.eq("season_id", demoSeasonId) : query.is("season_id", null);

  const { data, error } = await query.maybeSingle();
  if (error) throw new Error(error.message);
  return data;
}

/** Toutes les restrictions actives, groupées par joueur — utile pour l'alerte de composition d'un match. */
export async function getActiveRestrictionsByPlayerId(demoSeasonId?: string): Promise<Map<string, PlayerRestriction>> {
  let query = untypedDb.from("player_restrictions").select("*").eq("status", "active");
  query = demoSeasonId ? query.eq("season_id", demoSeasonId) : query.is("season_id", null);

  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return new Map(((data ?? []) as PlayerRestriction[]).map((r) => [r.player_id, r]));
}

export async function getPlayerRestrictionHistory(playerId: string, demoSeasonId?: string): Promise<PlayerRestriction[]> {
  let query = untypedDb.from("player_restrictions").select("*").eq("player_id", playerId);
  query = demoSeasonId ? query.eq("season_id", demoSeasonId) : query.is("season_id", null);

  const { data, error } = await query.order("starts_at", { ascending: false });
  if (error) throw new Error(error.message);
  return data ?? [];
}

/**
 * Vrai si `viewerVisibility` autorise à voir une restriction déclarée avec `restrictionVisibility`.
 * "team" est vu par tout le monde, "coaches" seulement par les coachs (et le joueur concerné,
 * géré par l'appelant via isOwnRestriction), "private" seulement par le joueur concerné.
 */
export function canViewRestriction(
  restrictionVisibility: RestrictionVisibility,
  viewer: { isCoach: boolean; isOwnRestriction: boolean }
): boolean {
  if (viewer.isOwnRestriction) return true;
  if (restrictionVisibility === "team") return true;
  if (restrictionVisibility === "coaches") return viewer.isCoach;
  return false;
}
