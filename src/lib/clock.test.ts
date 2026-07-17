import { describe, it, expect } from "vitest";
import { todayDateString, currentTimeString } from "./clock";

describe("todayDateString", () => {
  it("returns a YYYY-MM-DD date", () => {
    expect(todayDateString()).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});

describe("currentTimeString", () => {
  it("returns an HH:MM:SS time, comparable lexically to a kickoff_time value", () => {
    expect(currentTimeString()).toMatch(/^\d{2}:\d{2}:\d{2}$/);
  });
});
