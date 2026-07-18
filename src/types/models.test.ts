import { describe, it, expect } from "vitest";
import { isElevatedRole, NEW_PIN_LENGTH, validateNewPin } from "./models";

describe("isElevatedRole", () => {
  it("treats coach as elevated", () => {
    expect(isElevatedRole("coach")).toBe(true);
  });

  it("no longer treats legacy admin as elevated (roadmap V3 Lot 5 Étape D — 0 ligne admin en base depuis l'Étape C)", () => {
    expect(isElevatedRole("admin")).toBe(false);
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

describe("validateNewPin", () => {
  it("rejects an empty PIN with a clear field message", () => {
    expect(validateNewPin("")).toBe("Le PIN doit contenir exactement 6 chiffres.");
  });

  it("rejects a 3-digit PIN", () => {
    expect(validateNewPin("123")).toBe("Le PIN doit contenir exactement 6 chiffres.");
  });

  it("rejects a 4-digit PIN (the reported bug — must return a field message, not throw)", () => {
    expect(() => validateNewPin("1234")).not.toThrow();
    expect(validateNewPin("1234")).toBe("Le PIN doit contenir exactement 6 chiffres.");
  });

  it("rejects a 5-digit PIN", () => {
    expect(validateNewPin("12345")).toBe("Le PIN doit contenir exactement 6 chiffres.");
  });

  it("accepts a 6-digit PIN", () => {
    expect(validateNewPin("123456")).toBeNull();
  });

  it("rejects a 7-digit PIN", () => {
    expect(validateNewPin("1234567")).toBe("Le PIN doit contenir exactement 6 chiffres.");
  });

  it("rejects a PIN containing letters", () => {
    expect(validateNewPin("12a456")).toBe("Le PIN doit contenir exactement 6 chiffres.");
  });

  it("rejects a PIN containing spaces", () => {
    expect(validateNewPin("123 45")).toBe("Le PIN doit contenir exactement 6 chiffres.");
    expect(validateNewPin(" 23456")).toBe("Le PIN doit contenir exactement 6 chiffres.");
  });
});
