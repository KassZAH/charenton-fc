import { describe, it, expect } from "vitest";
import { isTransitionAllowed, ALLOWED_TRANSITIONS } from "./match-lifecycle-rules";
import type { MatchStatus } from "@/types/models";

const ALL_STATUSES: MatchStatus[] = ["draft", "scheduled", "live", "completed", "cancelled", "postponed"];

describe("isTransitionAllowed — matrice explicite (roadmap V3, Lot 14)", () => {
  it("transitions attendues autorisées", () => {
    expect(isTransitionAllowed("draft", "scheduled")).toBe(true);
    expect(isTransitionAllowed("scheduled", "live")).toBe(true);
    expect(isTransitionAllowed("scheduled", "postponed")).toBe(true);
    expect(isTransitionAllowed("scheduled", "completed")).toBe(true);
    expect(isTransitionAllowed("postponed", "scheduled")).toBe(true);
    expect(isTransitionAllowed("live", "completed")).toBe(true);
    expect(isTransitionAllowed("draft", "cancelled")).toBe(true);
    expect(isTransitionAllowed("scheduled", "cancelled")).toBe(true);
    expect(isTransitionAllowed("postponed", "cancelled")).toBe(true);
    expect(isTransitionAllowed("live", "cancelled")).toBe(true);
  });

  it("les états terminaux n'autorisent aucune transition sortante", () => {
    for (const target of ALL_STATUSES) {
      expect(isTransitionAllowed("completed", target)).toBe(false);
      expect(isTransitionAllowed("cancelled", target)).toBe(false);
    }
  });

  it("transitions manifestement interdites refusées", () => {
    expect(isTransitionAllowed("draft", "live")).toBe(false);
    expect(isTransitionAllowed("draft", "completed")).toBe(false);
    expect(isTransitionAllowed("postponed", "live")).toBe(false);
    expect(isTransitionAllowed("completed", "scheduled")).toBe(false);
    expect(isTransitionAllowed("cancelled", "scheduled")).toBe(false);
  });

  it("chaque statut n'apparaît qu'une fois comme clé (matrice exhaustive)", () => {
    expect(Object.keys(ALLOWED_TRANSITIONS).sort()).toEqual([...ALL_STATUSES].sort());
  });
});
