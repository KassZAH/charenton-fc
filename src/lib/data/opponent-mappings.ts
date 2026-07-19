import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { supabaseAdmin } from "@/lib/supabase/server";
import { normalizeTeamName } from "@/lib/fla/normalize";
import type { ExternalStanding, MappingStatus, OpponentExternalMapping } from "@/lib/fla/types";

const untypedDb = supabaseAdmin as unknown as SupabaseClient;

export async function getOpponentMappings(externalCompetitionId: string): Promise<OpponentExternalMapping[]> {
  const { data, error } = await untypedDb
    .from("opponent_external_mappings")
    .select("*")
    .eq("external_competition_id", externalCompetitionId);
  if (error) throw new Error(error.message);
  return (data ?? []) as OpponentExternalMapping[];
}

/**
 * Détermine le statut d'association d'un nom d'adversaire face au
 * classement externe (roadmap V3, Lot 11.5, §14) — jamais de résolution de
 * synonymes/abréviations, uniquement une correspondance exacte normalisée
 * (automatic) ou une correspondance partielle prudente (ambiguous, jamais
 * validée automatiquement).
 */
export function computeMappingCandidate(
  appOpponentName: string,
  standings: ExternalStanding[]
): { status: MappingStatus; externalTeamId: string | null; externalTeamName: string | null } {
  const normalizedApp = normalizeTeamName(appOpponentName);

  const exactMatches = standings.filter((s) => s.normalized_team_name === normalizedApp);
  if (exactMatches.length === 1) {
    return { status: "automatic", externalTeamId: exactMatches[0].external_team_id, externalTeamName: exactMatches[0].team_name };
  }
  if (exactMatches.length > 1) {
    // Ne devrait jamais arriver (unique(external_competition_id, normalized_team_name) en base) — traité par prudence.
    return { status: "ambiguous", externalTeamId: null, externalTeamName: null };
  }

  const fuzzyMatches = standings.filter(
    (s) =>
      s.normalized_team_name.includes(normalizedApp) ||
      normalizedApp.includes(s.normalized_team_name)
  );
  if (fuzzyMatches.length === 1) {
    return { status: "ambiguous", externalTeamId: fuzzyMatches[0].external_team_id, externalTeamName: fuzzyMatches[0].team_name };
  }
  if (fuzzyMatches.length > 1) {
    return { status: "ambiguous", externalTeamId: null, externalTeamName: null };
  }

  return { status: "unmatched", externalTeamId: null, externalTeamName: null };
}

/**
 * Recalcule les associations automatiques après une synchronisation
 * réussie — n'écrase jamais une association "confirmed" ou "disabled"
 * (décisions du Propriétaire), recalcule uniquement automatic/ambiguous/unmatched.
 * Ne modifie jamais le nom historique d'un adversaire dans matches/opponents.
 */
export async function recomputeOpponentMappings(externalCompetitionId: string, standings: ExternalStanding[]): Promise<void> {
  const { data: opponents, error: opponentsError } = await supabaseAdmin.from("opponents").select("id, name");
  if (opponentsError) throw new Error(opponentsError.message);

  const { data: existingMappings, error: mappingsError } = await untypedDb
    .from("opponent_external_mappings")
    .select("app_opponent_name, mapping_status")
    .eq("external_competition_id", externalCompetitionId);
  if (mappingsError) throw new Error(mappingsError.message);

  const lockedNames = new Set(
    (existingMappings ?? [])
      .filter((m: { mapping_status: string }) => m.mapping_status === "confirmed" || m.mapping_status === "disabled")
      .map((m: { app_opponent_name: string }) => m.app_opponent_name)
  );

  for (const opponent of opponents ?? []) {
    if (lockedNames.has(opponent.name)) continue;

    const candidate = computeMappingCandidate(opponent.name, standings);
    const { error: upsertError } = await untypedDb.from("opponent_external_mappings").upsert(
      {
        external_competition_id: externalCompetitionId,
        app_opponent_name: opponent.name,
        normalized_app_opponent_name: normalizeTeamName(opponent.name),
        external_team_id: candidate.externalTeamId,
        external_team_name: candidate.externalTeamName,
        mapping_status: candidate.status,
      },
      { onConflict: "external_competition_id,normalized_app_opponent_name" }
    );
    if (upsertError) throw new Error(upsertError.message);
  }
}
