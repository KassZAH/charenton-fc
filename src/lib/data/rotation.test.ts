import { describe, it, expect } from "vitest";
import { isOverlooked, buildRotationReason, computeRespondsOnTimeRate, computePresenceConsistency } from "./rotation";

describe("isOverlooked", () => {
  it("écart insuffisant : pas oublié", () => {
    expect(isOverlooked(3, 2)).toBe(false);
  });

  it("écart de 2 ou plus : oublié", () => {
    expect(isOverlooked(4, 1)).toBe(true);
    expect(isOverlooked(4, 2)).toBe(true);
  });

  it("jamais disponible : pas d'oubli à signaler", () => {
    expect(isOverlooked(0, 0)).toBe(false);
  });
});

describe("buildRotationReason", () => {
  it("formule la raison explicite attendue", () => {
    expect(buildRotationReason("Bilal", 4, 1)).toBe(
      "Bilal était disponible lors des 4 derniers matchs, mais n'a joué que 1 fois."
    );
  });
});

describe("computeRespondsOnTimeRate", () => {
  it("null sans aucune réponse — jamais 0 (pas de faux mauvais signal)", () => {
    expect(computeRespondsOnTimeRate([])).toBeNull();
  });

  it("calcule le pourcentage à temps", () => {
    expect(
      computeRespondsOnTimeRate([{ lateResponse: false }, { lateResponse: false }, { lateResponse: true }, { lateResponse: false }])
    ).toBe(75);
  });
});

describe("computePresenceConsistency", () => {
  it("null sans réponse 'présent'", () => {
    expect(computePresenceConsistency([])).toBeNull();
  });

  it("calcule le taux de suivi présent → réellement joué", () => {
    expect(computePresenceConsistency([{ playedMatch: true }, { playedMatch: true }, { playedMatch: false }])).toBe(67);
  });
});
