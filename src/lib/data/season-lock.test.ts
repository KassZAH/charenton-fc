import { describe, it, expect } from "vitest";
import { isMatchScopedTable, matchIdFromDeletedRowSnapshot } from "./season-lock";

describe("isMatchScopedTable", () => {
  it("flags matches, goals and cards as match-scoped", () => {
    expect(isMatchScopedTable("matches")).toBe(true);
    expect(isMatchScopedTable("goals")).toBe(true);
    expect(isMatchScopedTable("cards")).toBe(true);
  });

  it("does not flag tables unrelated to a specific match", () => {
    expect(isMatchScopedTable("players")).toBe(false);
    expect(isMatchScopedTable("dues")).toBe(false);
    expect(isMatchScopedTable("injuries")).toBe(false);
    expect(isMatchScopedTable("seasons")).toBe(false);
  });
});

describe("matchIdFromDeletedRowSnapshot", () => {
  it("extracts match_id from a pre-deletion snapshot", () => {
    expect(matchIdFromDeletedRowSnapshot({ id: "g1", match_id: "m1" })).toBe("m1");
  });

  it("returns null when the snapshot has no match_id", () => {
    expect(matchIdFromDeletedRowSnapshot({ id: "p1" })).toBeNull();
  });

  it("returns null when match_id is not a string", () => {
    expect(matchIdFromDeletedRowSnapshot({ match_id: 42 })).toBeNull();
  });

  it("returns null for a missing snapshot", () => {
    expect(matchIdFromDeletedRowSnapshot(null)).toBeNull();
    expect(matchIdFromDeletedRowSnapshot(undefined)).toBeNull();
  });
});
