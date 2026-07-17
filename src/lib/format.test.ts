import { describe, it, expect } from "vitest";
import { formatMatchDate, formatTime, formatShortDate, formatShortDateOnly } from "./format";

describe("formatMatchDate", () => {
  it("formats a date in French with weekday, day and month", () => {
    expect(formatMatchDate("2026-07-25")).toMatch(/^\p{L}+ 25 juillet$/u);
  });
});

describe("formatTime", () => {
  it("returns HH:MM from a HH:MM:SS string", () => {
    expect(formatTime("15:30:00")).toBe("15:30");
  });

  it("returns null when given null", () => {
    expect(formatTime(null)).toBeNull();
  });
});

describe("formatShortDate", () => {
  it("formats an ISO timestamp as day + short month", () => {
    expect(formatShortDate("2026-03-05T10:00:00Z")).toMatch(/^\d{1,2} \p{L}+\.?$/u);
  });
});

describe("formatShortDateOnly", () => {
  it("formats a plain date without shifting a day via UTC parsing", () => {
    expect(formatShortDateOnly("2026-07-31")).toMatch(/^31 \p{L}+\.?$/u);
  });
});
