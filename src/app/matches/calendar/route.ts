import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth/current-user";
import { getUpcomingMatches } from "@/lib/data/matches";
import { buildIcsCalendar } from "@/lib/ics";

export async function GET() {
  await requireUser();

  const matches = await getUpcomingMatches();
  const ics = buildIcsCalendar(matches);
  return new NextResponse(ics, {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": `attachment; filename="charenton-fc-matchs.ics"`,
    },
  });
}
