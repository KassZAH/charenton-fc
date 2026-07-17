import { describe, it, expect } from "vitest";
import { buildItineraryUrl } from "./maps";

describe("buildItineraryUrl", () => {
  it("prefers the explicit maps_url when present", () => {
    expect(buildItineraryUrl("12 rue du Stade", "https://maps.google.com/?q=x")).toBe(
      "https://maps.google.com/?q=x"
    );
  });

  it("falls back to a Maps search built from the address", () => {
    expect(buildItineraryUrl("12 rue du Stade, Charenton", null)).toBe(
      "https://www.google.com/maps/search/?api=1&query=12%20rue%20du%20Stade%2C%20Charenton"
    );
  });

  it("returns null when neither is available", () => {
    expect(buildItineraryUrl(null, null)).toBeNull();
  });
});
