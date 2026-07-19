import { describe, it, expect } from "vitest";
import { computeMeetingTimeFromOffset } from "./match-templates";

describe("computeMeetingTimeFromOffset", () => {
  it("soustrait l'offset au coup d'envoi", () => {
    expect(computeMeetingTimeFromOffset("18:00", 30)).toBe("17:30");
  });

  it("passe minuit correctement", () => {
    expect(computeMeetingTimeFromOffset("00:15", 30)).toBe("23:45");
  });

  it("null si pas de coup d'envoi ou pas d'offset", () => {
    expect(computeMeetingTimeFromOffset(null, 30)).toBeNull();
    expect(computeMeetingTimeFromOffset("18:00", null)).toBeNull();
  });

  it("accepte un format avec secondes (colonne time Postgres)", () => {
    expect(computeMeetingTimeFromOffset("18:00:00", 45)).toBe("17:15");
  });
});
