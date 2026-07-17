import { describe, it, expect } from "vitest";
import { buildIcsCalendar } from "./ics";
import type { MatchWithOpponent } from "@/lib/data/matches";

function makeMatch(overrides: Partial<MatchWithOpponent> = {}): MatchWithOpponent {
  return {
    id: "match-1",
    season_id: null,
    opponent_id: null,
    captain_player_id: null,
    opponent_name: "FC Poteaux",
    match_date: "2026-07-25",
    kickoff_time: "15:00:00",
    meeting_time: null,
    location: "Stade des Marronniers",
    address: null,
    maps_url: null,
    match_type: "championnat",
    home_or_away: "home",
    team_score: null,
    opponent_score: null,
    status: "scheduled",
    description: null,
    shirt: null,
    created_at: "2026-01-01T00:00:00Z",
    updated_at: "2026-01-01T00:00:00Z",
    deleted_at: null,
    ...overrides,
  };
}

describe("buildIcsCalendar", () => {
  it("wraps events in a valid VCALENDAR envelope", () => {
    const ics = buildIcsCalendar([makeMatch()]);
    expect(ics).toMatch(/^BEGIN:VCALENDAR\r\n/);
    expect(ics).toContain("VERSION:2.0");
    expect(ics.trim()).toMatch(/END:VCALENDAR$/);
  });

  it("builds a timed event from match_date + kickoff_time, ending 2h later", () => {
    const ics = buildIcsCalendar([makeMatch()]);
    expect(ics).toContain("SUMMARY:Charenton FC vs FC Poteaux");
    expect(ics).toContain("DTSTART:20260725T150000");
    expect(ics).toContain("DTEND:20260725T170000");
    expect(ics).toContain("LOCATION:Stade des Marronniers");
    expect(ics).toContain("UID:match-match-1@charenton-fc.vercel.app");
  });

  it("flips the summary order for away matches", () => {
    const ics = buildIcsCalendar([makeMatch({ home_or_away: "away" })]);
    expect(ics).toContain("SUMMARY:FC Poteaux vs Charenton FC");
  });

  it("falls back to an all-day event when there is no kickoff time", () => {
    const ics = buildIcsCalendar([makeMatch({ kickoff_time: null })]);
    expect(ics).toContain("DTSTART;VALUE=DATE:20260725");
    expect(ics).toContain("DTEND;VALUE=DATE:20260726");
    expect(ics).not.toContain("DTSTART:2026");
  });

  it("adds a meeting-time description when set", () => {
    const ics = buildIcsCalendar([makeMatch({ meeting_time: "14:30:00" })]);
    expect(ics).toContain("DESCRIPTION:Rendez-vous à 14:30");
  });

  it("escapes commas and semicolons in free-text fields", () => {
    const ics = buildIcsCalendar([makeMatch({ location: "Terrain A, porte B; entrée nord" })]);
    expect(ics).toContain("LOCATION:Terrain A\\, porte B\\; entrée nord");
  });
});
