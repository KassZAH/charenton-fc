import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/current-user";
import { getBackupSnapshot } from "@/lib/data/backups";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  await requireAdmin();

  const { id } = await params;
  const backup = await getBackupSnapshot(id);
  if (!backup) return NextResponse.json({ error: "Sauvegarde introuvable." }, { status: 404 });

  return new NextResponse(JSON.stringify(backup.snapshot, null, 2), {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename="charenton-fc-sauvegarde-${backup.created_at.slice(0, 10)}.json"`,
    },
  });
}
