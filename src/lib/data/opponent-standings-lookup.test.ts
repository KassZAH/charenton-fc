import { describe, it, expect } from "vitest";
import { buildOpponentStandingLookup } from "./opponent-standings-lookup";
import type { ExternalStanding, OpponentExternalMapping } from "@/lib/fla/types";

function standing(teamName: string, normalizedTeamName: string): ExternalStanding {
  return {
    id: "s-" + normalizedTeamName,
    external_competition_id: "comp-1",
    external_team_id: "ext-" + normalizedTeamName,
    team_name: teamName,
    normalized_team_name: normalizedTeamName,
    position: 5,
    played: 6,
    wins: 3,
    draws: 2,
    losses: 1,
    goals_for: 14,
    goals_against: 9,
    goal_difference: 5,
    points: 11,
    fetched_at: new Date().toISOString(),
  };
}

function mapping(overrides: Partial<OpponentExternalMapping>): OpponentExternalMapping {
  return {
    id: "m-1",
    external_competition_id: "comp-1",
    app_opponent_name: "Adversaire Test",
    normalized_app_opponent_name: "adversaire test",
    external_team_id: null,
    external_team_name: null,
    mapping_status: "unmatched",
    confirmed_by_player_id: null,
    confirmed_at: null,
    ...overrides,
  };
}

describe("buildOpponentStandingLookup", () => {
  it("association automatic avec une ligne de classement correspondante -> matched", () => {
    const standings = [standing("AS Fictif Paris", "as fictif paris")];
    const mappings = [
      mapping({
        app_opponent_name: "AS Fictif Paris",
        normalized_app_opponent_name: "as fictif paris",
        external_team_name: "AS Fictif Paris",
        mapping_status: "automatic",
      }),
    ];
    const lookup = buildOpponentStandingLookup(mappings, standings);
    const result = lookup("AS Fictif Paris");
    expect(result.kind).toBe("matched");
    if (result.kind === "matched") {
      expect(result.standing.normalized_team_name).toBe("as fictif paris");
    }
  });

  it("association ambiguous -> ambiguous, jamais un classement affiché à tort", () => {
    const mappings = [mapping({ mapping_status: "ambiguous" })];
    const lookup = buildOpponentStandingLookup(mappings, []);
    expect(lookup("Adversaire Test").kind).toBe("ambiguous");
  });

  it("association unmatched ou disabled -> no-data", () => {
    const lookup = buildOpponentStandingLookup(
      [mapping({ mapping_status: "unmatched" }), mapping({ app_opponent_name: "Autre", normalized_app_opponent_name: "autre", mapping_status: "disabled" })],
      []
    );
    expect(lookup("Adversaire Test").kind).toBe("no-data");
    expect(lookup("Autre").kind).toBe("no-data");
  });

  it("aucune association connue pour ce nom -> no-data, jamais une exception", () => {
    const lookup = buildOpponentStandingLookup([], []);
    expect(lookup("Nom jamais vu").kind).toBe("no-data");
  });

  it("association confirmed mais ligne de classement disparue (cache incohérent) -> no-data, jamais une valeur fabriquée", () => {
    const mappings = [
      mapping({ mapping_status: "confirmed", external_team_name: "Équipe Disparue" }),
    ];
    const lookup = buildOpponentStandingLookup(mappings, []);
    expect(lookup("Adversaire Test").kind).toBe("no-data");
  });
});
