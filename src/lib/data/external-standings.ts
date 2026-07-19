import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { supabaseAdmin } from "@/lib/supabase/server";
import type { ExternalCompetition, ExternalStanding } from "@/lib/fla/types";

/**
 * external_competitions/external_standings n'existent pas dans le schéma
 * généré (types/database.ts, régénéré depuis le projet partagé — ces
 * tables n'existent, à dessein, que sur le projet isolé pendant ce lot,
 * comme pour les RPC des Lots 6/7/8) — cast vers le client non typé, même
 * pattern déjà établi.
 */
const untypedDb = supabaseAdmin as unknown as SupabaseClient;

export async function getExternalCompetition(provider: string, championshipId: string, seasonId: string): Promise<ExternalCompetition | null> {
  const { data, error } = await untypedDb
    .from("external_competitions")
    .select("*")
    .eq("provider", provider)
    .eq("external_championship_id", championshipId)
    .eq("external_season_id", seasonId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data as ExternalCompetition | null;
}

export async function getExternalStandings(externalCompetitionId: string): Promise<ExternalStanding[]> {
  const { data, error } = await untypedDb
    .from("external_standings")
    .select("*")
    .eq("external_competition_id", externalCompetitionId)
    .order("position", { ascending: true, nullsFirst: false });
  if (error) throw new Error(error.message);
  return (data ?? []) as ExternalStanding[];
}

/** Une seule ligne (l'équipe interne, "internal_team_name") — utilisé pour la mise en évidence dans le tableau. */
export function findInternalTeamStanding(standings: ExternalStanding[], internalTeamName: string): ExternalStanding | null {
  const target = internalTeamName.trim().toLowerCase();
  return standings.find((s) => s.team_name.trim().toLowerCase() === target) ?? null;
}
