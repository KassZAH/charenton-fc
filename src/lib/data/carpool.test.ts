import { describe, it, expect } from "vitest";
import { computeRemainingSeats, hasCarpoolDeficit } from "./carpool";

describe("computeRemainingSeats", () => {
  it("soustrait les passagers déjà assignés", () => {
    expect(computeRemainingSeats(4, 2)).toBe(2);
  });

  it("jamais négatif même en cas de sur-affectation", () => {
    expect(computeRemainingSeats(2, 5)).toBe(0);
  });
});

describe("hasCarpoolDeficit", () => {
  it("pas de déficit si assez de places restantes", () => {
    expect(hasCarpoolDeficit(2, 3)).toBe(false);
    expect(hasCarpoolDeficit(2, 2)).toBe(false);
  });

  it("déficit si plus de joueurs sans place que de sièges restants", () => {
    expect(hasCarpoolDeficit(3, 2)).toBe(true);
  });
});
