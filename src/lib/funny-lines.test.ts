import { describe, it, expect, vi, afterEach } from "vitest";
import { getFunnyLine } from "./funny-lines";

afterEach(() => {
  vi.restoreAllMocks();
});

/** Rend pick() déterministe : toujours le premier élément du pool choisi. */
function withFirstPick<T>(fn: () => T): T {
  vi.spyOn(Math, "random").mockReturnValue(0);
  return fn();
}

describe("getFunnyLine", () => {
  it("prioritizes 'season not started' even with strong individual stats", () => {
    const line = withFirstPick(() =>
      getFunnyLine({ goals: 20, assists: 10, matchesPlayed: 5, yellowCards: 0, redCards: 0, teamMatchesPlayed: 0 })
    );
    expect(line).toBe("La saison n'a pas encore commencé — range le trash-talk pour plus tard, ou pas.");
  });

  it("flags zero appearances before looking at cards or goals", () => {
    const line = withFirstPick(() =>
      getFunnyLine({ goals: 0, assists: 0, matchesPlayed: 0, yellowCards: 5, redCards: 3, teamMatchesPlayed: 10 })
    );
    expect(line).toBe("0 match cette saison. Ton canapé a un meilleur taux de présence que toi.");
  });

  it("prioritizes red cards over a strong goal count", () => {
    const line = withFirstPick(() =>
      getFunnyLine({ goals: 15, assists: 0, matchesPlayed: 10, yellowCards: 0, redCards: 2, teamMatchesPlayed: 10 })
    );
    expect(line).toBe("2 cartons rouges cette saison. L'arbitre a ton portrait dans son portefeuille.");
  });

  it("interpolates the goal count in the top scoring tier", () => {
    const line = withFirstPick(() =>
      getFunnyLine({ goals: 12, assists: 0, matchesPlayed: 10, yellowCards: 0, redCards: 0, teamMatchesPlayed: 10 })
    );
    expect(line).toBe("12 buts cette saison. Prépare le discours pour le Ballon d'or de Charenton.");
  });

  it("falls back to a neutral line when stats are unremarkable", () => {
    const line = withFirstPick(() =>
      getFunnyLine({ goals: 0, assists: 2, matchesPlayed: 8, yellowCards: 1, redCards: 0, teamMatchesPlayed: 10 })
    );
    expect(line).toBe("Ni exceptionnel, ni ridicule. Le juste milieu, celui dont personne ne parle au bar.");
  });
});
