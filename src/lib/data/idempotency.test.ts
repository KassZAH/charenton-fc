import { describe, it, expect } from "vitest";
import { isUniqueViolation } from "./idempotency";

describe("isUniqueViolation", () => {
  it("reconnaît le code Postgres 23505 (unique_violation)", () => {
    expect(isUniqueViolation({ code: "23505" })).toBe(true);
  });

  it("rejette tout autre code ou une absence d'erreur", () => {
    expect(isUniqueViolation({ code: "23503" })).toBe(false);
    expect(isUniqueViolation(null)).toBe(false);
    expect(isUniqueViolation(undefined)).toBe(false);
    expect(isUniqueViolation({})).toBe(false);
  });
});
