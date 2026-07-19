import { describe, it, expect } from "vitest";
import { canViewRestriction } from "./player-restrictions";

describe("canViewRestriction", () => {
  it("le joueur concerné voit toujours sa propre restriction, quelle que soit la visibilité", () => {
    expect(canViewRestriction("private", { isCoach: false, isOwnRestriction: true })).toBe(true);
    expect(canViewRestriction("coaches", { isCoach: false, isOwnRestriction: true })).toBe(true);
  });

  it("visibilité 'team' : vue par tout le monde", () => {
    expect(canViewRestriction("team", { isCoach: false, isOwnRestriction: false })).toBe(true);
  });

  it("visibilité 'coaches' : refusée à un joueur non concerné, autorisée à un coach", () => {
    expect(canViewRestriction("coaches", { isCoach: false, isOwnRestriction: false })).toBe(false);
    expect(canViewRestriction("coaches", { isCoach: true, isOwnRestriction: false })).toBe(true);
  });

  it("visibilité 'private' : refusée à tout le monde sauf le joueur concerné, même un coach", () => {
    expect(canViewRestriction("private", { isCoach: true, isOwnRestriction: false })).toBe(false);
  });
});
