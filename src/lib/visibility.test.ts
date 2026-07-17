import { describe, it, expect } from "vitest";
import { canView, type Viewer } from "./visibility";

const owner = "player-1";
const ownerAsViewer: Viewer = { playerId: owner, role: "player" };
const teammate: Viewer = { playerId: "player-2", role: "player" };
const coach: Viewer = { playerId: "player-3", role: "coach" };
const admin: Viewer = { playerId: "player-4", role: "admin" };

describe("canView", () => {
  it("public is visible to anyone, even logged out", () => {
    expect(canView("public", owner, null)).toBe(true);
    expect(canView("public", owner, teammate)).toBe(true);
  });

  it("private is visible only to the owner and elevated roles", () => {
    expect(canView("private", owner, null)).toBe(false);
    expect(canView("private", owner, teammate)).toBe(false);
    expect(canView("private", owner, ownerAsViewer)).toBe(true);
    expect(canView("private", owner, coach)).toBe(true);
    expect(canView("private", owner, admin)).toBe(true);
  });

  it("coach is visible to the owner, coaches and admins, not teammates", () => {
    expect(canView("coach", owner, teammate)).toBe(false);
    expect(canView("coach", owner, coach)).toBe(true);
    expect(canView("coach", owner, admin)).toBe(true);
    expect(canView("coach", owner, ownerAsViewer)).toBe(true);
  });

  it("team is visible to any logged-in teammate but not logged-out visitors", () => {
    expect(canView("team", owner, teammate)).toBe(true);
    expect(canView("team", owner, null)).toBe(false);
  });
});
