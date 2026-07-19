import "server-only";
import { normalizeTeamName } from "@/lib/fla/normalize";
import type { ExternalStanding, OpponentExternalMapping } from "@/lib/fla/types";

export type OpponentStandingResult =
  | { kind: "matched"; standing: ExternalStanding }
  | { kind: "ambiguous" }
  | { kind: "no-data" };

/**
 * Construit une fonction de résolution adversaire -> classement, à partir
 * des associations et du classement déjà chargés une seule fois au niveau
 * de la page (roadmap V3, Lot 11.5, §13) — jamais un aller-retour base par
 * adversaire affiché.
 */
export function buildOpponentStandingLookup(
  mappings: OpponentExternalMapping[],
  standings: ExternalStanding[]
): (opponentName: string) => OpponentStandingResult {
  const standingByNormalizedName = new Map(standings.map((s) => [s.normalized_team_name, s] as const));
  const mappingByNormalizedOpponent = new Map(mappings.map((m) => [m.normalized_app_opponent_name, m] as const));

  return (opponentName: string): OpponentStandingResult => {
    const mapping = mappingByNormalizedOpponent.get(normalizeTeamName(opponentName));
    if (!mapping || mapping.mapping_status === "disabled" || mapping.mapping_status === "unmatched") {
      return { kind: "no-data" };
    }
    if (mapping.mapping_status === "ambiguous") {
      return { kind: "ambiguous" };
    }
    // automatic ou confirmed : le nom d'équipe externe associé doit avoir une ligne de classement correspondante.
    const targetName = mapping.external_team_name ? normalizeTeamName(mapping.external_team_name) : null;
    const standing = targetName ? standingByNormalizedName.get(targetName) : undefined;
    return standing ? { kind: "matched", standing } : { kind: "no-data" };
  };
}
