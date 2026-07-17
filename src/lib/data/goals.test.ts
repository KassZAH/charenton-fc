import { describe, it, expect } from "vitest";
import { computeScorerName } from "./goals";
import type { Goal } from "@/types/models";

const nameById = new Map([["p1", "Amine"]]);

function makeGoal(overrides: Partial<Goal> = {}): Goal {
  return {
    id: "g1",
    match_id: "m1",
    scorer_player_id: null,
    assist_player_id: null,
    goal_type: "classique",
    credited_to: "charenton",
    minute: null,
    is_unknown_scorer: false,
    created_at: null,
    deleted_at: null,
    ...overrides,
  };
}

describe("computeScorerName", () => {
  it("names the scorer for a normal goal", () => {
    expect(computeScorerName(makeGoal({ scorer_player_id: "p1" }), nameById)).toBe("Amine");
  });

  it("flags an unknown scorer", () => {
    expect(computeScorerName(makeGoal({ is_unknown_scorer: true }), nameById)).toBe("Buteur inconnu");
  });

  it("labels a CSC credited to Charenton as 'CSC adverse', crediting no one", () => {
    expect(computeScorerName(makeGoal({ goal_type: "csc", credited_to: "charenton" }), nameById)).toBe(
      "CSC adverse"
    );
  });

  it("labels a CSC credited to the opponent with the Charenton player noted, not as their goal", () => {
    const goal = makeGoal({ goal_type: "csc", credited_to: "opponent", scorer_player_id: "p1" });
    expect(computeScorerName(goal, nameById)).toBe("CSC — Amine");
  });

  it("labels an own-goal-against-us with no player noted", () => {
    const goal = makeGoal({ goal_type: "csc", credited_to: "opponent", scorer_player_id: null });
    expect(computeScorerName(goal, nameById)).toBe("CSC Charenton");
  });

  it("returns null when there is nothing to show", () => {
    expect(computeScorerName(makeGoal(), nameById)).toBeNull();
  });
});
