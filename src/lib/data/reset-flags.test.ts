import { describe, it, expect } from "vitest";
import { SEASON_RESET_ENABLED } from "./reset-flags";

describe("SEASON_RESET_ENABLED", () => {
  it("stays disabled by default — re-enabling must be a deliberate code change", () => {
    expect(SEASON_RESET_ENABLED).toBe(false);
  });
});
