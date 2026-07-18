import { describe, it, expect } from "vitest";
import { isElevatedRole, NEW_PIN_LENGTH } from "./models";

describe("isElevatedRole", () => {
  it("treats coach as elevated", () => {
    expect(isElevatedRole("coach")).toBe(true);
  });

  it("treats legacy admin as elevated (roadmap V3 Lot 5 transition)", () => {
    expect(isElevatedRole("admin")).toBe(true);
  });

  it("does not treat player as elevated", () => {
    expect(isElevatedRole("player")).toBe(false);
  });

  it("does not treat an unknown value as elevated", () => {
    expect(isElevatedRole("owner")).toBe(false);
    expect(isElevatedRole("")).toBe(false);
  });
});

describe("NEW_PIN_LENGTH", () => {
  it("is 6 — every new or changed PIN requires 6 digits regardless of role", () => {
    expect(NEW_PIN_LENGTH).toBe(6);
  });
});
