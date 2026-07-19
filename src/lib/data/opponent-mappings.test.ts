import { describe, it, expect } from "vitest";
import { computeMappingCandidate } from "./opponent-mappings";
import type { ExternalStanding } from "@/lib/fla/types";

/**
 * Roadmap V3, Lot 11.5, §14+§17 — computeMappingCandidate est la seule
 * logique de décision d'association testable sans base de données (le reste
 * de opponent-mappings.ts ne fait que lire/écrire). Règle centrale vérifiée
 * ici : une correspondance approximative n'est jamais confirmée
 * automatiquement, même à un seul candidat.
 */

function standing(teamName: string, normalizedTeamName: string): ExternalStanding {
  return {
    id: "s-" + normalizedTeamName,
    external_competition_id: "comp-1",
    external_team_id: "ext-" + normalizedTeamName,
    team_name: teamName,
    normalized_team_name: normalizedTeamName,
    position: 1,
    played: 1,
    wins: 1,
    draws: 0,
    losses: 0,
    goals_for: 1,
    goals_against: 0,
    goal_difference: 1,
    points: 3,
    fetched_at: new Date().toISOString(),
  };
}

describe("computeMappingCandidate", () => {
  it("correspondance exacte normalisée unique -> automatic", () => {
    const standings = [standing("AS Fictif Paris", "as fictif paris")];
    const result = computeMappingCandidate("AS Fictif Paris", standings);
    expect(result.status).toBe("automatic");
    expect(result.externalTeamId).toBe("ext-as fictif paris");
  });

  it("aucune correspondance -> unmatched, jamais un candidat inventé", () => {
    const standings = [standing("AS Fictif Paris", "as fictif paris")];
    const result = computeMappingCandidate("Équipe totalement différente", standings);
    expect(result.status).toBe("unmatched");
    expect(result.externalTeamId).toBeNull();
  });

  it("correspondance faible/partielle à un seul candidat -> ambiguous, jamais confirmée automatiquement", () => {
    const standings = [standing("FC Fictif Nord", "fc fictif nord")];
    const result = computeMappingCandidate("Fictif Nord", standings);
    expect(result.status).toBe("ambiguous");
  });

  it("plusieurs candidats plausibles -> ambiguous", () => {
    const standings = [
      standing("Union Fictive Est", "union fictive est"),
      standing("Union Fictive Ouest", "union fictive ouest"),
    ];
    const result = computeMappingCandidate("Union Fictive", standings);
    expect(result.status).toBe("ambiguous");
    expect(result.externalTeamId).toBeNull();
  });

  it("classement vide -> unmatched pour tout adversaire", () => {
    const result = computeMappingCandidate("N'importe quelle équipe", []);
    expect(result.status).toBe("unmatched");
  });
});
