import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth/current-user";
import { getMatchById } from "@/lib/data/matches";
import { buildIcsCalendar } from "@/lib/ics";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  await requireUser();
  const { id } = await params;

  const match = await getMatchById(id);
  if (!match) {
    return NextResponse.json({ error: "Match introuvable." }, { status: 404 });
  }

  const ics = buildIcsCalendar([match]);
  return new NextResponse(ics, {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": `attachment; filename="match-${match.match_date}.ics"`,
    },
  });
}
