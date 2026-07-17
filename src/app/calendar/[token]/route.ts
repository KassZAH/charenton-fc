import { NextResponse } from "next/server";
import { getPlayerByCalendarToken } from "@/lib/data/players";
import { getUpcomingMatches } from "@/lib/data/matches";
import { buildIcsCalendar } from "@/lib/ics";

/**
 * Flux abonnable (pas d'export ponctuel) : les applis calendrier viennent
 * chercher cette URL elles-mêmes, périodiquement, sans passer par le
 * navigateur de l'utilisateur — donc pas de cookie de session possible ici,
 * le token dans l'URL fait office d'authentification.
 */
export async function GET(_request: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const player = await getPlayerByCalendarToken(token);
  if (!player) {
    return NextResponse.json({ error: "Lien invalide." }, { status: 404 });
  }

  const matches = await getUpcomingMatches();
  const ics = buildIcsCalendar(matches);
  return new NextResponse(ics, {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Cache-Control": "no-cache",
    },
  });
}
