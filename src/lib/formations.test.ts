import { describe, it, expect } from "vitest";
import { FORMATIONS, FORMATION_LABELS, type FormationKey } from "./formations";

const keys = Object.keys(FORMATIONS) as FormationKey[];

describe("formations", () => {
  it("defines a label for every formation", () => {
    for (const key of keys) {
      expect(FORMATION_LABELS[key]).toBeDefined();
    }
  });

  it.each(keys)("%s has exactly 11 slots with unique keys", (key) => {
    const slots = FORMATIONS[key];
    expect(slots).toHaveLength(11);
    expect(new Set(slots.map((s) => s.key)).size).toBe(11);
  });

  it.each(keys)("%s has exactly one goalkeeper", (key) => {
    expect(FORMATIONS[key].filter((s) => s.key === "GK")).toHaveLength(1);
  });

  it.each(keys)("%s keeps every slot within the pitch bounds", (key) => {
    for (const slot of FORMATIONS[key]) {
      expect(slot.x).toBeGreaterThanOrEqual(0);
      expect(slot.x).toBeLessThanOrEqual(100);
      expect(slot.y).toBeGreaterThanOrEqual(0);
      expect(slot.y).toBeLessThanOrEqual(100);
    }
  });
});
