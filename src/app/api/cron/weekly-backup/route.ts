import { NextResponse } from "next/server";
import { createBackupWithArtifacts } from "@/lib/data/backups";
import { todayDateString } from "@/lib/clock";

/** Appelée par Vercel Cron (voir vercel.json) — authentifiée via l'en-tête Authorization standard de Vercel. */
export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  if (!process.env.CRON_SECRET || authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Non autorisé." }, { status: 401 });
  }

  await createBackupWithArtifacts({
    triggerReason: "weekly",
    label: `Sauvegarde hebdomadaire — ${todayDateString()}`,
    createdByPlayerId: null,
    createdByContext: "Cron hebdomadaire Vercel",
    protectedBackup: false,
  });

  return NextResponse.json({ ok: true });
}
