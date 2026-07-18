import { describe, it, expect } from "vitest";
import { normalize } from "./text";

describe("normalize", () => {
  it("lowercases", () => {
    expect(normalize("Etienne")).toBe("etienne");
  });

  it("strips accents so 'etienne' matches 'Étienne'", () => {
    expect(normalize("Étienne")).toBe("etienne");
  });

  it("strips accents on multiple characters", () => {
    expect(normalize("Cédric Léa")).toBe("cedric lea");
  });

  it("leaves already-plain text unchanged (besides case)", () => {
    expect(normalize("Domenico")).toBe("domenico");
  });
});
