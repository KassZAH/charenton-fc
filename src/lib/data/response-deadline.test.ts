import { describe, it, expect } from "vitest";
import { computeLateResponse } from "./response-deadline";

describe("computeLateResponse", () => {
  it("jamais en retard sans date limite", () => {
    expect(computeLateResponse(new Date("2026-07-20T18:00:00Z"), null)).toBe(false);
  });

  it("réponse avant la date limite : pas en retard", () => {
    expect(computeLateResponse(new Date("2026-07-20T10:00:00Z"), "2026-07-20T18:00:00Z")).toBe(false);
  });

  it("réponse après la date limite : en retard", () => {
    expect(computeLateResponse(new Date("2026-07-20T19:00:00Z"), "2026-07-20T18:00:00Z")).toBe(true);
  });

  it("réponse exactement à la date limite : pas en retard (limite incluse)", () => {
    expect(computeLateResponse(new Date("2026-07-20T18:00:00Z"), "2026-07-20T18:00:00Z")).toBe(false);
  });
});
