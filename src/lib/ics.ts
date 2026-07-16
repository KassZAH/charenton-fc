import "server-only";
import type { MatchWithOpponent } from "@/lib/data/matches";

const MATCH_DURATION_HOURS = 2;

function escapeIcsText(value: string): string {
  return value
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .replace(/\n/g, "\\n");
}

function formatLocalDateTime(date: string, time: string): string {
  return `${date.replace(/-/g, "")}T${time.replace(/:/g, "").slice(0, 6)}`;
}

function formatLocalDate(date: string): string {
  return date.replace(/-/g, "");
}

function addHoursToDate(date: string, time: string, hours: number): { date: string; time: string } {
  const start = new Date(`${date}T${time}`);
  start.setHours(start.getHours() + hours);
  const yyyy = start.getFullYear();
  const mm = String(start.getMonth() + 1).padStart(2, "0");
  const dd = String(start.getDate()).padStart(2, "0");
  const hh = String(start.getHours()).padStart(2, "0");
  const min = String(start.getMinutes()).padStart(2, "0");
  const ss = String(start.getSeconds()).padStart(2, "0");
  return { date: `${yyyy}-${mm}-${dd}`, time: `${hh}:${min}:${ss}` };
}

function matchSummary(match: MatchWithOpponent): string {
  const opponent = match.opponent_name ?? "adversaire à confirmer";
  return match.home_or_away === "away"
    ? `${opponent} vs Charenton FC`
    : `Charenton FC vs ${opponent}`;
}

function matchToVevent(match: MatchWithOpponent, now: string): string {
  const summary = escapeIcsText(matchSummary(match));
  const location = escapeIcsText(match.location ?? match.address ?? "");
  const lines: string[] = ["BEGIN:VEVENT", `UID:match-${match.id}@charenton-fc.vercel.app`, `DTSTAMP:${now}`];

  if (match.kickoff_time) {
    const end = addHoursToDate(match.match_date, match.kickoff_time, MATCH_DURATION_HOURS);
    lines.push(`DTSTART:${formatLocalDateTime(match.match_date, match.kickoff_time)}`);
    lines.push(`DTEND:${formatLocalDateTime(end.date, end.time)}`);
  } else {
    const [y, m, d] = match.match_date.split("-").map(Number);
    const next = new Date(y, m - 1, d + 1);
    const nextStr = `${next.getFullYear()}-${String(next.getMonth() + 1).padStart(2, "0")}-${String(next.getDate()).padStart(2, "0")}`;
    lines.push(`DTSTART;VALUE=DATE:${formatLocalDate(match.match_date)}`);
    lines.push(`DTEND;VALUE=DATE:${formatLocalDate(nextStr)}`);
  }

  lines.push(`SUMMARY:${summary}`);
  if (location) lines.push(`LOCATION:${location}`);
  if (match.meeting_time) {
    lines.push(`DESCRIPTION:${escapeIcsText(`Rendez-vous à ${match.meeting_time.slice(0, 5)}`)}`);
  }
  lines.push("END:VEVENT");
  return lines.join("\r\n");
}

export function buildIcsCalendar(matches: MatchWithOpponent[]): string {
  const now = new Date();
  const dtstamp = `${now.getUTCFullYear()}${String(now.getUTCMonth() + 1).padStart(2, "0")}${String(now.getUTCDate()).padStart(2, "0")}T${String(now.getUTCHours()).padStart(2, "0")}${String(now.getUTCMinutes()).padStart(2, "0")}${String(now.getUTCSeconds()).padStart(2, "0")}Z`;

  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Charenton FC//Calendrier des matchs//FR",
    "CALSCALE:GREGORIAN",
    ...matches.map((m) => matchToVevent(m, dtstamp)),
    "END:VCALENDAR",
  ];

  return lines.join("\r\n");
}
